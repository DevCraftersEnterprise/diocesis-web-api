import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cases } from './cases';
import { request } from './client';
import { compareResponses } from './compare';
import { config } from './config';
import type { ParityCase, ParityResponse } from './types';

interface Args {
  mode: 'record' | 'compare';
  live: boolean;
  only: string | undefined;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { mode: 'compare', live: false, only: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--record') args.mode = 'record';
    else if (flag === '--compare') args.mode = 'compare';
    else if (flag === '--live') args.live = true;
    else if (flag === '--only') args.only = argv[i + 1];
  }
  return args;
}

function baselinePath(id: string): string {
  return join(config.baselineDir, `${id}.json`);
}

async function record(list: readonly ParityCase[]): Promise<number> {
  await mkdir(config.baselineDir, { recursive: true });
  for (const testCase of list) {
    const res = await request(config.oracleBaseUrl, testCase);
    await writeFile(
      baselinePath(testCase.id),
      `${JSON.stringify(res, null, 2)}\n`,
      'utf8',
    );
    console.log(`  grabado  ${testCase.id}  (HTTP ${res.status})`);
  }
  console.log(`\n${list.length} baseline(s) en ${config.baselineDir}`);
  return 0;
}

async function loadOracle(
  testCase: ParityCase,
  live: boolean,
): Promise<ParityResponse> {
  if (live) return request(config.oracleBaseUrl, testCase);
  const raw = await readFile(baselinePath(testCase.id), 'utf8');
  return JSON.parse(raw) as ParityResponse;
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return typeof err === 'string' ? err : 'error desconocido';
}

function short(value: unknown, max = 240): string {
  const text = JSON.stringify(value);
  return text.length > max
    ? `${text.slice(0, max)}... (${text.length} chars)`
    : text;
}

async function loadCandidate(testCase: ParityCase): Promise<ParityResponse> {
  try {
    return await request(config.nestBaseUrl, testCase);
  } catch (err: unknown) {
    return { status: 0, body: `ERROR: ${errMessage(err)}`, isJson: false };
  }
}

type CaseResult = 'ok' | 'delta' | 'fail';

async function runCase(
  testCase: ParityCase,
  live: boolean,
): Promise<CaseResult> {
  let oracle: ParityResponse;
  try {
    oracle = await loadOracle(testCase, live);
  } catch {
    console.log(
      `  SIN-BASE ${testCase.id}  (ejecuta:  npm run parity -- --record)`,
    );
    return 'fail';
  }

  const candidate = await loadCandidate(testCase);
  const diffs = compareResponses(oracle, candidate, testCase.ignore ?? []);
  if (diffs.length === 0) {
    console.log(`  OK       ${testCase.id}`);
    return 'ok';
  }

  const isDelta = Boolean(testCase.expectedDelta);
  const label = isDelta ? 'DELTA   ' : 'FALLO   ';
  const suffix = testCase.expectedDelta ? `  (${testCase.expectedDelta})` : '';
  console.log(`  ${label} ${testCase.id}${suffix}`);
  for (const d of diffs.slice(0, 12)) {
    console.log(
      `      ${d.path}: oracle=${short(d.oracle)}  nest=${short(d.candidate)}`,
    );
  }
  if (diffs.length > 12) console.log(`      ... +${diffs.length - 12} diffs`);
  return isDelta ? 'delta' : 'fail';
}

async function compare(
  list: readonly ParityCase[],
  live: boolean,
): Promise<number> {
  const tally: Record<CaseResult, number> = { ok: 0, delta: 0, fail: 0 };
  for (const testCase of list) {
    tally[await runCase(testCase, live)] += 1;
  }
  console.log(
    `\n${tally.ok} OK - ${tally.delta} delta(s) esperado(s) - ${tally.fail} fallo(s)`,
  );
  return tally.fail === 0 ? 0 : 1;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { only } = args;
  const list =
    only === undefined ? cases : cases.filter((c) => c.id.includes(only));
  if (list.length === 0) {
    console.error('Sin casos que ejecutar.');
    process.exitCode = 1;
    return;
  }

  console.log(
    `parity: ${args.mode}${args.live ? ' (oraculo en vivo)' : ''} - ${list.length} caso(s)` +
      `\n  oraculo: ${config.oracleBaseUrl}\n  nest:    ${config.nestBaseUrl}\n`,
  );
  process.exitCode =
    args.mode === 'record'
      ? await record(list)
      : await compare(list, args.live);
}

void main();

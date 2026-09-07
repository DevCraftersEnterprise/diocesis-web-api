import { isRecord, normalize } from './normalize';
import type { DiffEntry, ParityResponse } from './types';

/** Diff estructural profundo de dos valores YA normalizados. */
export function diff(
  oracle: unknown,
  candidate: unknown,
  path = '$',
): DiffEntry[] {
  if (oracle === candidate) return [];

  if (Array.isArray(oracle) && Array.isArray(candidate)) {
    const a = oracle as unknown[];
    const b = candidate as unknown[];
    if (a.length !== b.length) {
      return [
        { path: `${path}.length`, oracle: a.length, candidate: b.length },
      ];
    }
    return a.flatMap((item, i) => diff(item, b[i], `${path}[${i}]`));
  }

  if (isRecord(oracle) && isRecord(candidate)) {
    const keys = new Set([...Object.keys(oracle), ...Object.keys(candidate)]);
    const out: DiffEntry[] = [];
    for (const key of keys) {
      out.push(...diff(oracle[key], candidate[key], `${path}.${key}`));
    }
    return out;
  }

  return [{ path, oracle, candidate }];
}

/** Compara dos respuestas completas: status + cuerpo normalizado con `ignore`. */
export function compareResponses(
  oracle: ParityResponse,
  candidate: ParityResponse,
  ignore: readonly string[],
): DiffEntry[] {
  const out: DiffEntry[] = [];
  if (oracle.status !== candidate.status) {
    out.push({
      path: '$status',
      oracle: oracle.status,
      candidate: candidate.status,
    });
  }
  out.push(
    ...diff(normalize(oracle.body, ignore), normalize(candidate.body, ignore)),
  );
  return out;
}

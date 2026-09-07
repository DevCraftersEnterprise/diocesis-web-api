import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from './config';
import { isRecord } from './normalize';
import type { ParityAuth, ParityCase, ParityResponse } from './types';

const tokenCache = new Map<string, string>();

async function getToken(
  baseUrl: string,
  auth: Exclude<ParityAuth, 'none'>,
): Promise<string> {
  const cacheKey = `${baseUrl}::${auth}`;
  const cached = tokenCache.get(cacheKey);
  if (cached) return cached;

  const creds = config.credentials[auth];
  if (!creds) {
    throw new Error(
      `No hay credenciales para el rol '${auth}'. Define PARITY_${auth.toUpperCase()}_USER / _PASS.`,
    );
  }

  const res = await fetch(`${baseUrl}${config.apiPrefix}/token/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  });
  if (!res.ok) {
    throw new Error(
      `Login fallo para '${auth}' en ${baseUrl}: HTTP ${res.status}`,
    );
  }
  const data = (await res.json()) as unknown;
  if (!isRecord(data) || typeof data.access !== 'string') {
    throw new Error(`Respuesta de login sin 'access' en ${baseUrl}`);
  }
  tokenCache.set(cacheKey, data.access);
  return data.access;
}

interface BuiltBody {
  body: FormData | string | undefined;
  headers: Record<string, string>;
}

async function buildBody(testCase: ParityCase): Promise<BuiltBody> {
  if (testCase.form) {
    const fd = new FormData();
    for (const [key, value] of Object.entries(testCase.form)) {
      if (typeof value === 'string') {
        fd.append(key, value);
      } else {
        const buf = await readFile(join(config.filesDir, value.file));
        fd.append(
          key,
          new Blob([new Uint8Array(buf)], { type: value.contentType }),
          value.filename,
        );
      }
    }
    return { body: fd, headers: {} }; // fetch pone el boundary multipart
  }
  if (testCase.body !== undefined) {
    return {
      body: JSON.stringify(testCase.body),
      headers: { 'Content-Type': 'application/json' },
    };
  }
  return { body: undefined, headers: {} };
}

export async function request(
  baseUrl: string,
  testCase: ParityCase,
): Promise<ParityResponse> {
  const headers: Record<string, string> = {};
  const auth = testCase.auth ?? 'none';
  if (auth !== 'none') {
    headers.Authorization = `Bearer ${await getToken(baseUrl, auth)}`;
  }

  const built = await buildBody(testCase);
  Object.assign(headers, built.headers);

  const res = await fetch(`${baseUrl}${config.apiPrefix}${testCase.path}`, {
    method: testCase.method,
    headers,
    body: built.body,
  });

  const text = await res.text();
  if (text.length === 0) {
    return { status: res.status, body: null, isJson: false };
  }
  try {
    return {
      status: res.status,
      body: JSON.parse(text) as unknown,
      isJson: true,
    };
  } catch {
    return { status: res.status, body: text, isJson: false };
  }
}

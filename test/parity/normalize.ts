import { config } from './config';

const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/;

export const MARK_DATETIME = '<ISO_DATETIME>';
export const MARK_IGNORED = '<IGNORED>';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return value as unknown[];
}

/**
 * Enmascara lo volatil: fechas-hora ISO -> marcador; URLs absolutas -> ruta desde
 * `apiPrefix` (asi `next`/`previous` de DRF dejan de depender de host/puerto).
 */
export function maskVolatile(value: unknown): unknown {
  if (typeof value === 'string') {
    if (ISO_DATETIME_RE.test(value)) return MARK_DATETIME;
    if (value.startsWith('http')) {
      const idx = value.indexOf(`${config.apiPrefix}/`);
      if (idx >= 0) return value.slice(idx);
    }
    return value;
  }
  if (Array.isArray(value)) return asArray(value).map(maskVolatile);
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value))
      out[key] = maskVolatile(item);
    return out;
  }
  return value;
}

/** Pone a `MARK_IGNORED` los valores que casan con rutas con puntos y comodin `*`. */
export function applyIgnores(
  value: unknown,
  paths: readonly string[],
): unknown {
  let out = value;
  for (const path of paths) out = setAtPath(out, path.split('.'), 0);
  return out;
}

function setAtPath(value: unknown, segments: string[], depth: number): unknown {
  if (depth === segments.length) return MARK_IGNORED;
  const seg = segments[depth];
  if (Array.isArray(value)) {
    return asArray(value).map((item, i) =>
      seg === '*' || seg === String(i)
        ? setAtPath(item, segments, depth + 1)
        : item,
    );
  }
  if (isRecord(value)) {
    const out: Record<string, unknown> = { ...value };
    for (const key of Object.keys(out)) {
      if (seg === '*' || seg === key)
        out[key] = setAtPath(out[key], segments, depth + 1);
    }
    return out;
  }
  return value;
}

/** Ordena recursivamente las claves para que el diff sea independiente del orden. */
export function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return asArray(value).map(canonical);
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort())
      out[key] = canonical(value[key]);
    return out;
  }
  return value;
}

export function normalize(value: unknown, ignores: readonly string[]): unknown {
  return canonical(applyIgnores(maskVolatile(value), ignores));
}

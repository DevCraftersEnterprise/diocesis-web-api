import { BadRequestException } from '@nestjs/common';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/**
 * Normaliza `tags` a `string[]`.
 * - array (body JSON de articulos) -> se valida que sean strings.
 * - string-JSON (multipart de noticias/documentos, `'["a","b"]'`) -> `JSON.parse`.
 * - `''` / `null` / `undefined` / `'null'` -> `[]` (como `DocumentoSerializer.validate_tags`).
 * Formato invalido -> 400 `{ tags: [...] }`.
 */
export function parseTags(value: unknown): string[] {
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    value === 'null'
  ) {
    return [];
  }

  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new BadRequestException({
        tags: ['El valor debe ser JSON valido.'],
      });
    }
  }

  if (
    !Array.isArray(parsed) ||
    !parsed.every((t): t is string => typeof t === 'string')
  ) {
    throw new BadRequestException({ tags: ['Debe ser una lista de strings.'] });
  }
  return parsed;
}

/**
 * Filtra por un tag dentro del array `jsonb` (`t.value ILIKE '%tag%'`). Sustituye el
 * `.extra()` deprecado de Django (BUG-DJANGO-011); parametrizado (sin inyeccion).
 * `alias` es un identificador interno controlado, no entrada del usuario.
 */
export function applyTagFilter<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  tag: string,
): void {
  qb.andWhere(
    `EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(${alias}.tags, '[]'::jsonb)) AS t(value) WHERE t.value ILIKE :tag)`,
    { tag: `%${tag.trim()}%` },
  );
}

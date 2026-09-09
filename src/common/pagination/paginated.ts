import { NotFoundException } from '@nestjs/common';
import type { PaginationQueryDto } from './pagination-query.dto';

/**
 * Sobre de lista estilo DRF `PageNumberPagination`. El frontend solo lee `count` y
 * `results`; `next`/`previous` van a `null` (delta intencional documentado en
 * `contract-matrix.md`: el FE nunca los usa).
 */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Construye el sobre a partir de la pagina ya materializada (`items`) y el total.
 *
 * Replica el 404 de DRF ante una pagina fuera de rango (`page > 1` con offset >= total);
 * `page = 1` sobre un resultado vacio devuelve `{ count: 0, results: [] }` (200), no 404.
 */
export function buildPage<T>(
  items: T[],
  total: number,
  query: Pick<PaginationQueryDto, 'page' | 'skip'>,
): Paginated<T> {
  if (query.page > 1 && query.skip >= total) {
    throw new NotFoundException({ detail: 'Pagina invalida.' });
  }

  return { count: total, next: null, previous: null, results: items };
}

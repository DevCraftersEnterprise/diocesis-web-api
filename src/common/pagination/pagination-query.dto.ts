import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/** Espejo del `CustomPageNumberPagination` de Django (`page_size=10`, `max_page_size=100`). */
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

function toInt(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

/**
 * Query params de paginacion tal como los envia el frontend: `page` (1-based) y
 * `page_size` (snake_case: excepcion consciente al camelCase, replica el nombre de DRF).
 * `page_size` se **recorta** a `MAX_PAGE_SIZE` en silencio, igual que DRF; no lo rechaza.
 */
export class PaginationQueryDto {
  @Transform(({ value }) => toInt(value, 1))
  @IsInt()
  @Min(1)
  page = 1;

  @Transform(({ value }) =>
    Math.min(MAX_PAGE_SIZE, toInt(value, DEFAULT_PAGE_SIZE)),
  )
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  page_size = DEFAULT_PAGE_SIZE;

  /** Filas a saltar para TypeORM (`.skip()` / `findAndCount`). */
  get skip(): number {
    return (this.page - 1) * this.page_size;
  }

  /** Filas a tomar para TypeORM (`.take()` / `findAndCount`). */
  get take(): number {
    return this.page_size;
  }
}

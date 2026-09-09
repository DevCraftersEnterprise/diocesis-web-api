import type { CatalogNameEntity, CatalogNameResponse } from './catalog.types';

const iso = (v: Date | string | null): string | null =>
  v === null
    ? null
    : v instanceof Date
      ? v.toISOString()
      : new Date(v).toISOString();

export function toCatalogNameResponse(
  e: CatalogNameEntity,
): CatalogNameResponse {
  return {
    id: e.id,
    name: e.name,
    isActive: e.isActive,
    createdAt: iso(e.createdAt)!,
    updatedAt: iso(e.updatedAt)!,
    deletedAt: iso(e.deletedAt),
    createdBy: e.createdById,
    updatedBy: e.updatedById,
    deletedBy: e.deletedById,
  };
}

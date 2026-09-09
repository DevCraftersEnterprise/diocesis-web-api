import type { Decanato } from './entities/decanato.entity';

/**
 * Forma de `DecanatoSerializer` (DRF `fields='__all__'`): las FK de auditoria se rinden
 * como **UUID string o null** (no `StringRelatedField`, eso es solo `usuarios`).
 */
export interface DecanatoResponse {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
}

const iso = (v: Date | string | null): string | null =>
  v === null
    ? null
    : v instanceof Date
      ? v.toISOString()
      : new Date(v).toISOString();

export function toDecanatoResponse(d: Decanato): DecanatoResponse {
  return {
    id: d.id,
    name: d.name,
    isActive: d.isActive,
    createdAt: iso(d.createdAt)!,
    updatedAt: iso(d.updatedAt)!,
    deletedAt: iso(d.deletedAt),
    createdBy: d.createdById,
    updatedBy: d.updatedById,
    deletedBy: d.deletedById,
  };
}

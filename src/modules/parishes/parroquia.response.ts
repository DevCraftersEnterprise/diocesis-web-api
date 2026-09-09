import type { Parroquia } from './entities/parroquia.entity';

/** Forma de `ParroquiaSerializer` (`fields='__all__'`): FKs como UUID string. */
export interface ParroquiaResponse {
  id: string;
  name: string;
  openingDate: string;
  address: string;
  zipCode: string;
  town: string;
  isActive: boolean;
  picture: string | null;
  decanatoId: string;
  coloniaId: string;
  padreId: string;
  createdAt: string;
  updatedAt: string | null;
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

export function toParroquiaResponse(p: Parroquia): ParroquiaResponse {
  return {
    id: p.id,
    name: p.name,
    openingDate: p.openingDate,
    address: p.address,
    zipCode: p.zipCode,
    town: p.town,
    isActive: p.isActive,
    picture: p.picture,
    decanatoId: p.decanatoId,
    coloniaId: p.coloniaId,
    padreId: p.padreId,
    createdAt: iso(p.createdAt)!,
    updatedAt: iso(p.updatedAt),
    deletedAt: iso(p.deletedAt),
    createdBy: p.createdById,
    updatedBy: p.updatedById,
    deletedBy: p.deletedById,
  };
}

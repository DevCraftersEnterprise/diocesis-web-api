import type { Padre, PadreRole } from './entities/padre.entity';

/** Forma de `PadreSerializer` (DRF `fields='__all__'`). Sin `createdBy`. */
export interface PadreResponse {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  isActive: boolean;
  picture: string | null;
  email: string | null;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  role: PadreRole;
  ordinationDate: string | null;
  phone: string | null;
  assignedCommunity: string | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
}

const iso = (v: Date | string | null): string | null =>
  v === null
    ? null
    : v instanceof Date
      ? v.toISOString()
      : new Date(v).toISOString();

export function toPadreResponse(p: Padre): PadreResponse {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    // Columna `date` -> TypeORM ya devuelve string 'YYYY-MM-DD'.
    birthDate: p.birthDate,
    isActive: p.isActive,
    picture: p.picture,
    email: p.email,
    facebook: p.facebook,
    instagram: p.instagram,
    twitter: p.twitter,
    role: p.role,
    ordinationDate: p.ordinationDate,
    phone: p.phone,
    assignedCommunity: p.assignedCommunity,
    createdAt: iso(p.createdAt)!,
    updatedAt: iso(p.updatedAt),
    deletedAt: iso(p.deletedAt),
    updatedBy: p.updatedById,
    deletedBy: p.deletedById,
  };
}

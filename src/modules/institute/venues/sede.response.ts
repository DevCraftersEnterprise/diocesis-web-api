import type { Sede } from './entities/sede.entity';

export interface SedeResponse {
  id: string;
  name: string;
  address: string;
  mapsUrl: string;
  picture: string | null;
  isActive: boolean;
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

export function toSedeResponse(s: Sede): SedeResponse {
  return {
    id: s.id,
    name: s.name,
    address: s.address,
    mapsUrl: s.mapsUrl,
    picture: s.picture,
    isActive: s.isActive,
    createdAt: iso(s.createdAt)!,
    updatedAt: iso(s.updatedAt),
    deletedAt: iso(s.deletedAt),
    createdBy: s.createdById,
    updatedBy: s.updatedById,
    deletedBy: s.deletedById,
  };
}

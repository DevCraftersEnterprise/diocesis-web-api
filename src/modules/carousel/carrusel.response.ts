import type { Carrusel } from './entities/carrusel.entity';

/**
 * Forma de `CarruselSerializer` (`fields='__all__'`). Tras DQ3-B gana 4 campos de
 * auditoria respecto a lo que devolvia prod (`updatedAt`/`deletedAt`/`updatedBy`/
 * `deletedBy`): **delta aditivo**; el `Carrusel` del frontend es una interfaz e ignora
 * las claves extra.
 */
export interface CarruselResponse {
  id: string;
  url: string;
  isImage: boolean;
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

export function toCarruselResponse(c: Carrusel): CarruselResponse {
  return {
    id: c.id,
    url: c.url,
    isImage: c.isImage,
    isActive: c.isActive,
    createdAt: iso(c.createdAt)!,
    updatedAt: iso(c.updatedAt)!,
    deletedAt: iso(c.deletedAt),
    createdBy: c.createdById,
    updatedBy: c.updatedById,
    deletedBy: c.deletedById,
  };
}

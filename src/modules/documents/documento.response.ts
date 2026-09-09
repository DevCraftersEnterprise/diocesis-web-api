import type { Documento } from './entities/documento.entity';

/** Forma de `DocumentoSerializer` (`fields='__all__'`). `tags` siempre array. */
export interface DocumentoResponse {
  id: string;
  title: string;
  document: string;
  type: string;
  tags: string[];
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

export function toDocumentoResponse(d: Documento): DocumentoResponse {
  return {
    id: d.id,
    title: d.title,
    document: d.document,
    type: d.type,
    tags: d.tags ?? [],
    isActive: d.isActive,
    createdAt: iso(d.createdAt)!,
    updatedAt: iso(d.updatedAt),
    deletedAt: iso(d.deletedAt),
    createdBy: d.createdById,
    updatedBy: d.updatedById,
    deletedBy: d.deletedById,
  };
}

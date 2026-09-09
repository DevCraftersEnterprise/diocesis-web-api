import type { Articulo } from './entities/articulo.entity';

/** Forma de `ArticuloSerializer` (`fields='__all__'`). `tags` siempre array. */
export interface ArticuloResponse {
  id: string;
  title: string;
  content: string;
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

export function toArticuloResponse(a: Articulo): ArticuloResponse {
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    tags: a.tags ?? [],
    isActive: a.isActive,
    createdAt: iso(a.createdAt)!,
    updatedAt: iso(a.updatedAt),
    deletedAt: iso(a.deletedAt),
    createdBy: a.createdById,
    updatedBy: a.updatedById,
    deletedBy: a.deletedById,
  };
}

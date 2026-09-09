import type { Noticia } from './entities/noticia.entity';

/** Forma de `NoticiaSerializer` (`fields='__all__'`). `tags` siempre array. */
export interface NoticiaResponse {
  id: string;
  title: string;
  picture: string | null;
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

export function toNoticiaResponse(n: Noticia): NoticiaResponse {
  return {
    id: n.id,
    title: n.title,
    picture: n.picture,
    content: n.content,
    tags: n.tags ?? [],
    isActive: n.isActive,
    createdAt: iso(n.createdAt)!,
    updatedAt: iso(n.updatedAt),
    deletedAt: iso(n.deletedAt),
    createdBy: n.createdById,
    updatedBy: n.updatedById,
    deletedBy: n.deletedById,
  };
}

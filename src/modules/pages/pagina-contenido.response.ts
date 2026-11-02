import type { PaginaContenido } from './entities/pagina-contenido.entity';
import type { PaginaImagen } from './entities/pagina-imagen.entity';

export interface PaginaImagenResponse {
  id: string;
  url: string;
  caption: string | null;
  order: number;
}

export interface PaginaContenidoResponse {
  id: string;
  slug: string;
  title: string;
  body: string;
  updatedAt: string;
  images: PaginaImagenResponse[];
}

export interface PaginaContenidoListItemResponse {
  id: string;
  slug: string;
  title: string;
  updatedAt: string;
}

function iso(value: Date): string {
  return value.toISOString();
}

export function toPaginaImagenResponse(
  row: PaginaImagen,
): PaginaImagenResponse {
  return { id: row.id, url: row.url, caption: row.caption, order: row.order };
}

export function toPaginaContenidoResponse(
  row: PaginaContenido,
  images: PaginaImagen[],
): PaginaContenidoResponse {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    body: row.body,
    updatedAt: iso(row.updatedAt),
    images: images.map(toPaginaImagenResponse),
  };
}

export function toPaginaContenidoListItemResponse(
  row: PaginaContenido,
): PaginaContenidoListItemResponse {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    updatedAt: iso(row.updatedAt),
  };
}

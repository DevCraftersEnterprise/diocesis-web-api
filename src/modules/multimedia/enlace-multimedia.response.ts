import type { EnlaceMultimedia } from './entities/enlace-multimedia.entity';

export interface EnlaceMultimediaResponse {
  id: string;
  title: string;
  description: string;
  url: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toEnlaceMultimediaResponse(
  e: EnlaceMultimedia,
): EnlaceMultimediaResponse {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    url: e.url,
    order: e.order,
    isActive: e.isActive,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

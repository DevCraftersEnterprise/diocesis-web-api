import type { Descarga } from './entities/descarga.entity';

export interface DescargaResponse {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  fileExtension: string;
  fileSizeBytes: number;
  publishedAt: string;
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

export function toDescargaResponse(d: Descarga): DescargaResponse {
  return {
    id: d.id,
    title: d.title,
    description: d.description,
    fileUrl: d.fileUrl,
    fileName: d.fileName,
    fileExtension: d.fileExtension,
    fileSizeBytes: d.fileSizeBytes,
    publishedAt: d.publishedAt,
    isActive: d.isActive,
    createdAt: iso(d.createdAt)!,
    updatedAt: iso(d.updatedAt)!,
    deletedAt: iso(d.deletedAt),
    createdBy: d.createdById,
    updatedBy: d.updatedById,
    deletedBy: d.deletedById,
  };
}

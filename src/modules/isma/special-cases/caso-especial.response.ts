import type { CasoEspecial } from './entities/caso-especial.entity';

export interface CasoEspecialResponse {
  id: string;
  title: string;
  order: number;
  requisitosAdicionales: string;
  documentosAdicionales: string | null;
  excepciones: string | null;
  contacto: string | null;
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

export function toCasoEspecialResponse(c: CasoEspecial): CasoEspecialResponse {
  return {
    id: c.id,
    title: c.title,
    order: c.order,
    requisitosAdicionales: c.requisitosAdicionales,
    documentosAdicionales: c.documentosAdicionales,
    excepciones: c.excepciones,
    contacto: c.contacto,
    isActive: c.isActive,
    createdAt: iso(c.createdAt)!,
    updatedAt: iso(c.updatedAt),
    deletedAt: iso(c.deletedAt),
    createdBy: c.createdById,
    updatedBy: c.updatedById,
    deletedBy: c.deletedById,
  };
}

import type { Capacitacion } from './entities/capacitacion.entity';
import type { InstituteModality } from './entities/capacitacion.entity';

export interface CapacitacionResponse {
  id: string;
  name: string;
  description: string;
  modality: InstituteModality;
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

export function toCapacitacionResponse(c: Capacitacion): CapacitacionResponse {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    modality: c.modality,
    isActive: c.isActive,
    createdAt: iso(c.createdAt)!,
    updatedAt: iso(c.updatedAt),
    deletedAt: iso(c.deletedAt),
    createdBy: c.createdById,
    updatedBy: c.updatedById,
    deletedBy: c.deletedById,
  };
}

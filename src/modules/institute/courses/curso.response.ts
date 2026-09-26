import type { Curso } from './entities/curso.entity';
import type { InstituteModality } from '../trainings/entities/capacitacion.entity';

export interface CursoResponse {
  id: string;
  title: string;
  description: string;
  modality: InstituteModality;
  capacitacionId: string | null;
  startDate: string | null;
  endDate: string | null;
  meetingLink: string | null;
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

export function toCursoResponse(c: Curso): CursoResponse {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    modality: c.modality,
    capacitacionId: c.capacitacionId,
    startDate: c.startDate,
    endDate: c.endDate,
    meetingLink: c.meetingLink,
    picture: c.picture,
    isActive: c.isActive,
    createdAt: iso(c.createdAt)!,
    updatedAt: iso(c.updatedAt),
    deletedAt: iso(c.deletedAt),
    createdBy: c.createdById,
    updatedBy: c.updatedById,
    deletedBy: c.deletedById,
  };
}

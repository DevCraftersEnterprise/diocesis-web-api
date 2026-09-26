import type { Evento, EventoType } from './entities/evento.entity';

export interface EventoResponse {
  id: string;
  title: string;
  description: string | null;
  type: EventoType;
  startDate: string;
  endDate: string | null;
  cursoId: string | null;
  sedeId: string | null;
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

export function toEventoResponse(e: Evento): EventoResponse {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    type: e.type,
    startDate: e.startDate,
    endDate: e.endDate,
    cursoId: e.cursoId,
    sedeId: e.sedeId,
    isActive: e.isActive,
    createdAt: iso(e.createdAt)!,
    updatedAt: iso(e.updatedAt),
    deletedAt: iso(e.deletedAt),
    createdBy: e.createdById,
    updatedBy: e.updatedById,
    deletedBy: e.deletedById,
  };
}

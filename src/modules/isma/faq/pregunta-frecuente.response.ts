import type { PreguntaFrecuente } from './entities/pregunta-frecuente.entity';

export interface PreguntaFrecuenteResponse {
  id: string;
  question: string;
  answer: string;
  order: number;
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

export function toPreguntaFrecuenteResponse(
  p: PreguntaFrecuente,
): PreguntaFrecuenteResponse {
  return {
    id: p.id,
    question: p.question,
    answer: p.answer,
    order: p.order,
    isActive: p.isActive,
    createdAt: iso(p.createdAt)!,
    updatedAt: iso(p.updatedAt),
    deletedAt: iso(p.deletedAt),
    createdBy: p.createdById,
    updatedBy: p.updatedById,
    deletedBy: p.deletedById,
  };
}

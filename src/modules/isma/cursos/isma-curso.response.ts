import type { IsmaCurso } from './entities/isma-curso.entity';

export interface IsmaCursoParroquiaResponse {
  id: string;
  name: string;
  address: string;
  town: string;
}

export interface IsmaCursoResponse {
  id: string;
  parroquia: IsmaCursoParroquiaResponse;
  startDate: string;
  endDate: string;
  /** true cuando `endDate` ya paso (hora de Sonora): el curso ya no admite inscripcion. */
  finalizado: boolean;
  diaSemana: number | null;
  horaInicio: string | null;
  horaFin: string | null;
  modalidad: string;
  telefonoInformes: string | null;
  notas: string | null;
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

export function toIsmaCursoResponse(
  c: IsmaCurso,
  hoy: string,
): IsmaCursoResponse {
  if (!c.parroquia) {
    throw new Error(`isma_curso ${c.id} sin parroquia cargada`);
  }
  return {
    id: c.id,
    parroquia: {
      id: c.parroquia.id,
      name: c.parroquia.name,
      address: c.parroquia.address,
      town: c.parroquia.town,
    },
    startDate: c.startDate,
    endDate: c.endDate,
    finalizado: c.endDate < hoy,
    diaSemana: c.diaSemana,
    horaInicio: c.horaInicio,
    horaFin: c.horaFin,
    modalidad: c.modalidad,
    telefonoInformes: c.telefonoInformes,
    notas: c.notas,
    isActive: c.isActive,
    createdAt: iso(c.createdAt)!,
    updatedAt: iso(c.updatedAt),
    deletedAt: iso(c.deletedAt),
    createdBy: c.createdById,
    updatedBy: c.updatedById,
    deletedBy: c.deletedById,
  };
}

import type { IsmaInformacion } from './entities/isma-informacion.entity';

export interface IsmaInformacionResponse {
  id: string;
  introduccion: string;
  documentacionNecesaria: string;
  parroquiaCorrespondiente: string;
  entrevistaParroco: string;
  programaIsma: string;
  tiemposAnticipacion: string;
  contactoTelefono1: string | null;
  contactoTelefono2: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

function iso(value: Date): string {
  return value.toISOString();
}

export function toIsmaInformacionResponse(
  row: IsmaInformacion,
): IsmaInformacionResponse {
  return {
    id: row.id,
    introduccion: row.introduccion,
    documentacionNecesaria: row.documentacionNecesaria,
    parroquiaCorrespondiente: row.parroquiaCorrespondiente,
    entrevistaParroco: row.entrevistaParroco,
    programaIsma: row.programaIsma,
    tiemposAnticipacion: row.tiemposAnticipacion,
    contactoTelefono1: row.contactoTelefono1,
    contactoTelefono2: row.contactoTelefono2,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    updatedBy: row.updatedById,
  };
}

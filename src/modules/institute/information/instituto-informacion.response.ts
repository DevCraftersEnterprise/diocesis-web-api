import type { InstitutoInformacion } from './entities/instituto-informacion.entity';

export interface InstitutoInformacionResponse {
  id: string;
  name: string;
  description: string;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

function iso(value: Date): string {
  return value.toISOString();
}

export function toInstitutoInformacionResponse(
  row: InstitutoInformacion,
): InstitutoInformacionResponse {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    updatedBy: row.updatedById,
  };
}

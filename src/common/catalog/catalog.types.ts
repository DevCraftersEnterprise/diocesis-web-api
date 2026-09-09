/**
 * Contrato minimo de una entidad "catalogo nombre-unico" (decanatos, colonias, ...):
 * `BaseModel` + `name` + `createdBy`. Es lo que `CatalogService` necesita leer/escribir.
 */
export interface CatalogNameEntity {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
  deletedById: string | null;
}

/** Forma de `<Modelo>Serializer` de DRF (`fields='__all__'`): FKs de auditoria como UUID/null. */
export interface CatalogNameResponse {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
}

export interface CatalogCsvResult {
  creados: string[];
  errores: Record<string, unknown>[];
}

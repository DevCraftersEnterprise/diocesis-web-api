import { Column, PrimaryColumn } from 'typeorm';

/**
 * Campos comunes del `BaseModel` de Django (ver `docs/db/notes.md`).
 *
 * - Sin `DEFAULT` de BD (ADR-004): la aplicacion aporta `id` (uuid v4) y timestamps.
 * - `@PrimaryColumn`, NO `@PrimaryGeneratedColumn`: el uuid lo genera el codigo, no Postgres.
 * - `@Column` planas para los timestamps, NO `@CreateDateColumn`/`@UpdateDateColumn`:
 *   esas anaden `DEFAULT now()` y triggers que el esquema en produccion no tiene.
 * - `updatedBy` / `deletedBy` se mapean como columnas escalares uuid (`*_id`); la relacion
 *   `@ManyToOne` a `Usuario` se anade cuando exista esa entidad (Fase 2).
 * - `Carrusel` NO extiende esta clase hasta la migracion aditiva DQ3-B (Fase 5).
 */
export abstract class BaseEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('boolean', { name: 'isActive' })
  isActive!: boolean;

  @Column('timestamptz', { name: 'createdAt' })
  createdAt!: Date;

  @Column('timestamptz', { name: 'updatedAt' })
  updatedAt!: Date;

  @Column('timestamptz', { name: 'deletedAt', nullable: true })
  deletedAt!: Date | null;

  @Column('uuid', { name: 'updatedBy_id', nullable: true })
  updatedById!: string | null;

  @Column('uuid', { name: 'deletedBy_id', nullable: true })
  deletedById!: string | null;
}

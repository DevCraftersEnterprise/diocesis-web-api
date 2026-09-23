import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Usuario } from '../../../users/entities/usuario.entity';

/**
 * Id fijo de la unica fila de `institutos_informacion` (sembrada por la migracion
 * `CreateInstitutoInformacion`). Patron "singleton" nuevo en el proyecto — ver
 * `docs/instituto-biblico-isma.md` §3.1: sin `isActive`/`deletedAt`/`habilitar` (no
 * tiene sentido "borrar" la unica fila), solo `GET` (publico) y `PUT` (admin o
 * `moduleAccess: ['instituto-biblico']`).
 */
export const INSTITUTO_INFORMACION_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Mapea `institutos_informacion`. Tabla nueva (sin contraparte en Django): el "Patron
 * 2.1" de nombres de constraint identicos a Django no aplica aqui — no hay nada que
 * igualar, TypeORM elige sus propios nombres y son la fuente de verdad.
 */
@Entity('institutos_informacion')
export class InstitutoInformacion {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('text')
  description!: string;

  @Column('varchar', { length: 255, nullable: true })
  contactEmail!: string | null;

  @Column('varchar', { length: 20, nullable: true })
  contactPhone!: string | null;

  @Column('timestamptz')
  createdAt!: Date;

  @Column('timestamptz')
  updatedAt!: Date;

  @Column({ name: 'updatedBy_id', type: 'uuid', nullable: true })
  updatedById!: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'updatedBy_id' })
  @Index()
  updatedBy?: Usuario | null;
}

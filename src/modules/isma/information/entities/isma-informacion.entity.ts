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
 * Id fijo de la unica fila de `isma_informacion` (sembrada por la migracion
 * `CreateIsmaInformacion`). Mismo patron "singleton" que `InstitutoInformacion` — ver
 * `docs/instituto-biblico-isma.md` §3.1: sin `isActive`/`deletedAt`/`habilitar`, solo
 * `GET` (publico) y `PUT` (admin o `moduleAccess: ['isma']`).
 */
export const ISMA_INFORMACION_ID = '00000000-0000-0000-0000-000000000002';

/**
 * Mapea `isma_informacion`. Tabla nueva (sin contraparte en Django): el "Patron 2.1" de
 * nombres de constraint identicos a Django no aplica aqui — no hay nada que igualar,
 * TypeORM elige sus propios nombres y son la fuente de verdad.
 */
@Entity('isma_informacion')
export class IsmaInformacion {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('text')
  introduccion!: string;

  @Column('text')
  documentacionNecesaria!: string;

  @Column('text')
  parroquiaCorrespondiente!: string;

  @Column('text')
  entrevistaParroco!: string;

  @Column('text')
  programaIsma!: string;

  @Column('text')
  tiemposAnticipacion!: string;

  @Column('varchar', { length: 20, nullable: true })
  contactoTelefono1!: string | null;

  @Column('varchar', { length: 20, nullable: true })
  contactoTelefono2!: string | null;

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

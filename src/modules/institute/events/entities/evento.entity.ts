import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';
import { Curso } from '../../courses/entities/curso.entity';
import { Sede } from '../../venues/entities/sede.entity';
import { Usuario } from '../../../users/entities/usuario.entity';

/** Tipos de evento del calendario del Instituto Biblico (`docs/instituto-biblico-isma.md` §3.2). */
export const EVENTO_TYPES = ['inscripcion', 'curso', 'actividad'] as const;
export type EventoType = (typeof EVENTO_TYPES)[number];

const TYPE_CHECK_EXPR = `"type" IN ('inscripcion','curso','actividad')`;

/**
 * Mapea `institutos_evento` (Tarea 5.1). Eventos del calendario visual; `endDate = null`
 * para eventos de un solo dia. `cursoId`/`sedeId` son FKs **opcionales** (un evento no
 * necesariamente pertenece a un curso o sede especifico). Tabla nueva sin contraparte en
 * Django: nombres de constraint/indice los elige TypeORM.
 */
@Entity('institutos_evento')
@Check('institutos_evento_type_check', TYPE_CHECK_EXPR)
export class Evento extends BaseEntity {
  @Column('varchar', { length: 255 })
  title!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('varchar', { length: 20 })
  type!: EventoType;

  @Column('date')
  startDate!: string;

  @Column('date', { nullable: true })
  endDate!: string | null;

  @Column({ name: 'cursoId_id', type: 'uuid', nullable: true })
  cursoId!: string | null;

  @Column({ name: 'sedeId_id', type: 'uuid', nullable: true })
  sedeId!: string | null;

  @Column({ name: 'createdBy_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @ManyToOne(() => Curso, { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'cursoId_id' })
  @Index()
  curso?: Curso | null;

  @ManyToOne(() => Sede, { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'sedeId_id' })
  @Index()
  sede?: Sede | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'createdBy_id' })
  @Index()
  createdBy?: Usuario | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'updatedBy_id' })
  @Index()
  updatedBy?: Usuario | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'deletedBy_id' })
  @Index()
  deletedBy?: Usuario | null;
}

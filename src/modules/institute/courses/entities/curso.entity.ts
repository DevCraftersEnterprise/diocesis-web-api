import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';
import {
  Capacitacion,
  type InstituteModality,
} from '../../trainings/entities/capacitacion.entity';
import { Usuario } from '../../../users/entities/usuario.entity';

const MODALITY_CHECK_EXPR = `"modality" IN ('presencial','en_linea','mixta')`;

/**
 * Mapea `institutos_curso` (Tarea 4.1). Instancia activa de una capacitacion, con
 * fechas y enlace de videoconferencia — distinto de `Capacitacion` (decision del
 * usuario en la Tarea 0.1). `capacitacionId` es **opcional**: un curso puede o no
 * pertenecer a una oferta general.
 */
@Entity('institutos_curso')
@Check('institutos_curso_modality_check', MODALITY_CHECK_EXPR)
export class Curso extends BaseEntity {
  @Column('varchar', { length: 255 })
  title!: string;

  @Column('text')
  description!: string;

  @Column('varchar', { length: 20 })
  modality!: InstituteModality;

  @Column({ name: 'capacitacionId_id', type: 'uuid', nullable: true })
  capacitacionId!: string | null;

  @Column('date', { nullable: true })
  startDate!: string | null;

  @Column('date', { nullable: true })
  endDate!: string | null;

  @Column('varchar', { length: 500, nullable: true })
  meetingLink!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  picture!: string | null;

  @Column({ name: 'createdBy_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @ManyToOne(() => Capacitacion, { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'capacitacionId_id' })
  @Index()
  capacitacion?: Capacitacion | null;

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

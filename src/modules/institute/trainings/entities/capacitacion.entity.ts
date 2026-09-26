import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';
import { Usuario } from '../../../users/entities/usuario.entity';

/**
 * Modalidades de capacitacion/curso del Instituto Biblico
 * (`docs/instituto-biblico-isma.md` §3.2). Compartido con `Curso`.
 */
export const INSTITUTE_MODALITIES = [
  'presencial',
  'en_linea',
  'mixta',
] as const;
export type InstituteModality = (typeof INSTITUTE_MODALITIES)[number];

const MODALITY_CHECK_EXPR = `"modality" IN ('presencial','en_linea','mixta')`;

/**
 * Mapea `institutos_capacitacion` (Tarea 4.1). Catalogo de oferta de capacitacion, sin
 * fechas (distinto de `Curso` — decision del usuario en la Tarea 0.1). Tabla nueva sin
 * contraparte en Django: nombres de constraint/indice los elige TypeORM.
 */
@Entity('institutos_capacitacion')
@Check('institutos_capacitacion_modality_check', MODALITY_CHECK_EXPR)
export class Capacitacion extends BaseEntity {
  @Column('varchar', { length: 255 })
  name!: string;

  @Column('text')
  description!: string;

  @Column('varchar', { length: 20 })
  modality!: InstituteModality;

  @Column({ name: 'createdBy_id', type: 'uuid', nullable: true })
  createdById!: string | null;

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

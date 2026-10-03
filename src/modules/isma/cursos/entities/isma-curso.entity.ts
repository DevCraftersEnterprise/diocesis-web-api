import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';
import { Parroquia } from '../../../parishes/entities/parroquia.entity';
import { Usuario } from '../../../users/entities/usuario.entity';

export const ISMA_MODALIDADES = ['presencial', 'en_linea'] as const;
export type IsmaModalidad = (typeof ISMA_MODALIDADES)[number];

const MODALIDAD_CHECK_EXPR = `"modalidad" IN ('presencial','en_linea')`;
const DIA_SEMANA_CHECK_EXPR = `"diaSemana" IS NULL OR ("diaSemana" BETWEEN 0 AND 6)`;
const FECHAS_CHECK_EXPR = `"endDate" >= "startDate"`;

/**
 * Oferta de un curso ISMA en una parroquia (calendarizacion, decision de planeacion).
 * Una sola entidad plana: la parroquia se reutiliza (`parroquias_parroquia`), no se
 * duplica. `diaSemana` (0 = domingo … 6 = sabado) junto con `horaInicio`/`horaFin`
 * alimentan las sesiones semanales del calendario; si no se capturan, el curso se muestra
 * solo como bloque de `startDate` a `endDate`. Tabla nueva sin contraparte en Django.
 */
@Entity('isma_curso')
@Check('isma_curso_modalidad_check', MODALIDAD_CHECK_EXPR)
@Check('isma_curso_dia_semana_check', DIA_SEMANA_CHECK_EXPR)
@Check('isma_curso_fechas_check', FECHAS_CHECK_EXPR)
export class IsmaCurso extends BaseEntity {
  @Column({ name: 'parroquiaId_id', type: 'uuid' })
  parroquiaId!: string;

  @Column('date')
  startDate!: string;

  @Column('date')
  endDate!: string;

  @Column('smallint', { nullable: true })
  diaSemana!: number | null;

  @Column('varchar', { length: 5, nullable: true })
  horaInicio!: string | null;

  @Column('varchar', { length: 5, nullable: true })
  horaFin!: string | null;

  @Column('varchar', { length: 20 })
  modalidad!: IsmaModalidad;

  @Column('text', { nullable: true })
  telefonoInformes!: string | null;

  @Column('text', { nullable: true })
  notas!: string | null;

  @Column({ name: 'createdBy_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @ManyToOne(() => Parroquia, { nullable: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'parroquiaId_id' })
  @Index()
  parroquia?: Parroquia;

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

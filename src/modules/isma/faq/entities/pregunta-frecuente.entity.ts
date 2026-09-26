import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';
import { Usuario } from '../../../users/entities/usuario.entity';

/**
 * Mapea `isma_pregunta_frecuente` (Tarea 7.1, `docs/instituto-biblico-isma.md` §3.3).
 * Las 8 preguntas frecuentes del documento fuente — coleccion real (decision Tarea 0.1
 * #5), no singleton. `order` refleja el orden de presentacion. Tabla nueva sin
 * contraparte en Django: nombres de constraint/indice los elige TypeORM.
 */
@Entity('isma_pregunta_frecuente')
export class PreguntaFrecuente extends BaseEntity {
  @Column('text')
  question!: string;

  @Column('text')
  answer!: string;

  @Column('int')
  order!: number;

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

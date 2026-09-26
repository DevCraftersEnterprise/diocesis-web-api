import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';
import { Usuario } from '../../../users/entities/usuario.entity';

/**
 * Mapea `isma_caso_especial` (Tarea 7.1, `docs/instituto-biblico-isma.md` §3.3). Los 10
 * casos especiales del documento fuente — coleccion real (decision Tarea 0.1 #5), no
 * singleton. `order` refleja la numeracion 1-10 ya establecida en el documento. Tabla
 * nueva sin contraparte en Django: nombres de constraint/indice los elige TypeORM.
 */
@Entity('isma_caso_especial')
export class CasoEspecial extends BaseEntity {
  @Column('varchar', { length: 255 })
  title!: string;

  @Column('int')
  order!: number;

  @Column('text')
  requisitosAdicionales!: string;

  @Column('text', { nullable: true })
  documentosAdicionales!: string | null;

  @Column('text', { nullable: true })
  excepciones!: string | null;

  @Column('text', { nullable: true })
  contacto!: string | null;

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

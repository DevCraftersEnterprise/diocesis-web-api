import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';
import { Usuario } from '../../../users/entities/usuario.entity';

/**
 * Mapea `institutos_sede` (Tarea 5.1, `docs/instituto-biblico-isma.md` §3.2). `mapsUrl`
 * es un **enlace** a un mapa externo, no un mapa embebido (decision del documento
 * fuente: "liga a mapas"). Tabla nueva sin contraparte en Django: nombres de
 * constraint/indice los elige TypeORM.
 */
@Entity('institutos_sede')
export class Sede extends BaseEntity {
  @Column('varchar', { length: 255 })
  name!: string;

  @Column('text')
  address!: string;

  @Column('varchar', { length: 500 })
  mapsUrl!: string;

  @Column('varchar', { length: 255, nullable: true })
  picture!: string | null;

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

import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Usuario } from '../../users/entities/usuario.entity';

/**
 * Mapea `enlace_multimedia` (seccion publica "Multimedia", ruta `multimedia/misas`).
 * Tabla nueva, sin contraparte en Django. Enlaces externos (YouTube, Facebook, Vimeo,
 * Spotify, sitios web, etc.) con orden manual — el frontend decide si incrusta el
 * video (YouTube/Vimeo) o solo muestra una tarjeta con el enlace.
 */
@Entity('enlace_multimedia')
export class EnlaceMultimedia extends BaseEntity {
  @Column('varchar', { length: 255 })
  title!: string;

  @Column('text')
  description!: string;

  @Column('varchar', { length: 500 })
  url!: string;

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

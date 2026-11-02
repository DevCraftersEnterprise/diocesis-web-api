import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { PaginaContenido } from './pagina-contenido.entity';

/**
 * Mapea `pagina_imagen`: galeria de fotos de una `PaginaContenido` (orden manual +
 * pie de foto opcional). `onDelete: 'NO ACTION'` como el resto del codigo — las
 * paginas nunca se borran, asi que no hace falta CASCADE.
 */
@Entity('pagina_imagen')
export class PaginaImagen {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'pagina_id', type: 'uuid' })
  paginaId!: string;

  @ManyToOne(() => PaginaContenido, { nullable: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'pagina_id' })
  @Index()
  pagina?: PaginaContenido;

  @Column('varchar', { length: 255 })
  url!: string;

  @Column('varchar', { length: 255, nullable: true })
  caption!: string | null;

  @Column('int')
  order!: number;

  @Column('timestamptz')
  createdAt!: Date;
}

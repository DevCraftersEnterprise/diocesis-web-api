import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Usuario } from '../../users/entities/usuario.entity';

/**
 * Mapea `descarga` (seccion publica "Descargas", tarea "activar menus en
 * construccion"). Tabla nueva, sin contraparte en Django. Acepta cualquier tipo de
 * archivo (ver `assertValidDownloadFile`), a diferencia de `Documento` que solo
 * acepta PDF/PPT/PPTX.
 */
@Entity('descarga')
export class Descarga extends BaseEntity {
  @Column('varchar', { length: 255 })
  title!: string;

  @Column('text')
  description!: string;

  /** URL de Cloudinary (`resource_type: raw`). */
  @Column('varchar', { length: 255 })
  fileUrl!: string;

  /** Nombre original del archivo tal como lo subio el admin, para mostrarlo en el
   * boton de descarga (Cloudinary no lo conserva en la URL). */
  @Column('varchar', { length: 255 })
  fileName!: string;

  /** Extension en minusculas sin punto (`pdf`, `docx`, ...), para mostrar el tipo
   * sin tener que parsear la URL/nombre en el frontend. */
  @Column('varchar', { length: 20 })
  fileExtension!: string;

  @Column('int')
  fileSizeBytes!: number;

  /** Fecha de publicacion que captura el admin — puede diferir de `createdAt`
   * (p. ej. un documento subido hoy pero fechado la semana pasada). */
  @Column('date')
  publishedAt!: string;

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

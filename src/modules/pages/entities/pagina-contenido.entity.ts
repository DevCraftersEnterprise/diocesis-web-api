import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Usuario } from '../../users/entities/usuario.entity';
import { PaginaImagen } from './pagina-imagen.entity';

/**
 * Slugs fijos (Tarea "activar menus en construccion"): una fila por cada opcion del
 * menu publico que no tenia modulo propio ni encajaba en Descargas/Multimedia/
 * Diaconos/Archivo>Documentos. Sembrados por la migracion `CreatePaginaContenido` con
 * los ids de abajo — nunca se crean ni se borran filas nuevas desde la app, solo se
 * edita el contenido (mismo patron "catalogo fijo" que `IsmaInformacion`, pero con
 * varias filas en vez de una).
 */
export const PAGINA_CONTENIDO_SLUGS = [
  'historia',
  'obispo',
  'planeacion-pastoral',
  'obituario',
  'curia',
  'gobierno-pastoral',
  'actividad-pastoral',
  'seminario',
  'nombramientos',
  'diezmo',
] as const;

export type PaginaContenidoSlug = (typeof PAGINA_CONTENIDO_SLUGS)[number];

export const PAGINA_CONTENIDO_IDS: Record<PaginaContenidoSlug, string> = {
  historia: '00000000-0000-0000-0000-000000000101',
  obispo: '00000000-0000-0000-0000-000000000102',
  'planeacion-pastoral': '00000000-0000-0000-0000-000000000103',
  obituario: '00000000-0000-0000-0000-000000000104',
  curia: '00000000-0000-0000-0000-000000000105',
  'gobierno-pastoral': '00000000-0000-0000-0000-000000000106',
  'actividad-pastoral': '00000000-0000-0000-0000-000000000107',
  seminario: '00000000-0000-0000-0000-000000000108',
  nombramientos: '00000000-0000-0000-0000-000000000109',
  diezmo: '00000000-0000-0000-0000-000000000110',
};

/** Expresion del CHECK de dominio para `slug`, igual que el patron de `DOCUMENT_TYPES`. */
const SLUG_CHECK_EXPR = `"slug" IN (${PAGINA_CONTENIDO_SLUGS.map((s) => "'" + s + "'").join(',')})`;

/**
 * Mapea `pagina_contenido`. Tabla nueva (sin contraparte en Django). `title`/`body`
 * arrancan vacios (sembrados por la migracion) — el contenido real lo captura un
 * admin desde el panel. `body` guarda HTML generado por el editor enriquecido del
 * frontend (ngx-quill); el frontend lo sanitiza antes de mostrarlo con `[innerHTML]`.
 */
@Entity('pagina_contenido')
export class PaginaContenido {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 40, unique: true })
  slug!: string;

  @Column('varchar', { length: 255 })
  title!: string;

  @Column('text')
  body!: string;

  @Column('timestamptz')
  createdAt!: Date;

  @Column('timestamptz')
  updatedAt!: Date;

  @Column({ name: 'updatedBy_id', type: 'uuid', nullable: true })
  updatedById!: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'updatedBy_id' })
  @Index()
  updatedBy?: Usuario | null;

  @OneToMany(() => PaginaImagen, (imagen) => imagen.pagina)
  images?: PaginaImagen[];
}

export { SLUG_CHECK_EXPR };

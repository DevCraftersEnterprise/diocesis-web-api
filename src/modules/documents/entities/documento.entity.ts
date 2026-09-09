import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Usuario } from '../../users/entities/usuario.entity';

/** Los 9 valores de `DOCUMENT_TYPE_CHOICES` (Django `documentos.models`). */
export const DOCUMENT_TYPES = [
  'carta',
  'circular',
  'comunicado',
  'prensa',
  'decreto',
  'instruccion',
  'mensaje',
  'dominical',
  'rescripto',
] as const;

export type DocumentoType = (typeof DOCUMENT_TYPES)[number];

/** Mapea `documentos_documento` (`BaseModel` + title/document/type/tags + createdBy). Patron 2.1. */
@Entity('documentos_documento')
export class Documento extends BaseEntity {
  @Column('varchar', { length: 255 })
  title!: string;

  @Column('varchar', { length: 255 })
  document!: string;

  @Column('varchar', { length: 20 })
  type!: string;

  @Column('jsonb')
  tags!: string[];

  @Column({ name: 'createdBy_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'createdBy_id',
    foreignKeyConstraintName:
      'documentos_documento_createdBy_id_55ffa2c6_fk_usuarios_',
  })
  @Index('documentos_documento_createdBy_id_55ffa2c6')
  createdBy?: Usuario | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'updatedBy_id',
    foreignKeyConstraintName:
      'documentos_documento_updatedBy_id_83e9e029_fk_usuarios_',
  })
  @Index('documentos_documento_updatedBy_id_83e9e029')
  updatedBy?: Usuario | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'deletedBy_id',
    foreignKeyConstraintName:
      'documentos_documento_deletedBy_id_8d0d8772_fk_usuarios_',
  })
  @Index('documentos_documento_deletedBy_id_8d0d8772')
  deletedBy?: Usuario | null;
}

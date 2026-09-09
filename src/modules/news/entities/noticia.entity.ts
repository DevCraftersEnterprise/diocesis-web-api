import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Usuario } from '../../users/entities/usuario.entity';

/** Mapea `noticias_noticia` (`BaseModel` + title/picture/content/tags + createdBy). Patron 2.1. */
@Entity('noticias_noticia')
export class Noticia extends BaseEntity {
  @Column('varchar', { length: 255 })
  title!: string;

  @Column('varchar', { length: 255, nullable: true })
  picture!: string | null;

  @Column('text')
  content!: string;

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
      'noticias_noticia_createdBy_id_d055de9d_fk_usuarios_usuario_id',
  })
  @Index('noticias_noticia_createdBy_id_d055de9d')
  createdBy?: Usuario | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'updatedBy_id',
    foreignKeyConstraintName:
      'noticias_noticia_updatedBy_id_0aa687bd_fk_usuarios_usuario_id',
  })
  @Index('noticias_noticia_updatedBy_id_0aa687bd')
  updatedBy?: Usuario | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'deletedBy_id',
    foreignKeyConstraintName:
      'noticias_noticia_deletedBy_id_f85aa04f_fk_usuarios_usuario_id',
  })
  @Index('noticias_noticia_deletedBy_id_f85aa04f')
  deletedBy?: Usuario | null;
}

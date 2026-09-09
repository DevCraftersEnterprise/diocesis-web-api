import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Usuario } from '../../users/entities/usuario.entity';

/** Mapea `articulos_articulo` (`BaseModel` + title/content/tags + createdBy). Patron 2.1. */
@Entity('articulos_articulo')
export class Articulo extends BaseEntity {
  @Column('varchar', { length: 255 })
  title!: string;

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
      'articulos_articulo_createdBy_id_76333383_fk_usuarios_usuario_id',
  })
  @Index('articulos_articulo_createdBy_id_76333383')
  createdBy?: Usuario | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'updatedBy_id',
    foreignKeyConstraintName:
      'articulos_articulo_updatedBy_id_2378745f_fk_usuarios_usuario_id',
  })
  @Index('articulos_articulo_updatedBy_id_2378745f')
  updatedBy?: Usuario | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'deletedBy_id',
    foreignKeyConstraintName:
      'articulos_articulo_deletedBy_id_0ca7fb5b_fk_usuarios_usuario_id',
  })
  @Index('articulos_articulo_deletedBy_id_0ca7fb5b')
  deletedBy?: Usuario | null;
}

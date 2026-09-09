import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Usuario } from '../../users/entities/usuario.entity';

/**
 * Mapea `carrusel_carrusel`. Tras la migracion `0002-carrusel-basemodel-fields` (ADR-004
 * DQ3-B) la tabla tiene ya los 4 campos de `BaseModel` que le faltaban, asi que la entidad
 * extiende `BaseEntity` como el resto. `url` guarda la `secure_url` de Cloudinary (string).
 *
 * Nombres de constraint/indice: `createdBy` es de la baseline; `updatedBy`/`deletedBy` los
 * fijo la migracion 0002 (hex elegido por NestJS).
 */
@Entity('carrusel_carrusel')
export class Carrusel extends BaseEntity {
  @Column('varchar', { length: 200 })
  url!: string;

  @Column('boolean', { name: 'isImage' })
  isImage!: boolean;

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
      'carrusel_carrusel_createdBy_id_7c0299b4_fk_usuarios_usuario_id',
  })
  @Index('carrusel_carrusel_createdBy_id_7c0299b4')
  createdBy?: Usuario | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'updatedBy_id',
    foreignKeyConstraintName:
      'carrusel_carrusel_updatedBy_id_9a1b2c3d_fk_usuarios_usuario_id',
  })
  @Index('carrusel_carrusel_updatedBy_id_9a1b2c3d')
  updatedBy?: Usuario | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'deletedBy_id',
    foreignKeyConstraintName:
      'carrusel_carrusel_deletedBy_id_7e8f9a0b_fk_usuarios_usuario_id',
  })
  @Index('carrusel_carrusel_deletedBy_id_7e8f9a0b')
  deletedBy?: Usuario | null;
}

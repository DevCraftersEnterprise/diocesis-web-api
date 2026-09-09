import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Usuario } from '../../users/entities/usuario.entity';

/** Mapea `colonias_colonia` (gemela de `decanatos_decanato`). Patron audit-FK: Tarea 2.1. */
@Entity('colonias_colonia')
export class Colonia extends BaseEntity {
  @Column('varchar', { length: 255 })
  name!: string;

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
      'colonias_colonia_createdBy_id_fdb5f9d1_fk_usuarios_usuario_id',
  })
  @Index('colonias_colonia_createdBy_id_fdb5f9d1')
  createdBy?: Usuario | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'updatedBy_id',
    foreignKeyConstraintName:
      'colonias_colonia_updatedBy_id_1275c4ce_fk_usuarios_usuario_id',
  })
  @Index('colonias_colonia_updatedBy_id_1275c4ce')
  updatedBy?: Usuario | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'deletedBy_id',
    foreignKeyConstraintName:
      'colonias_colonia_deletedBy_id_1a2cfbb5_fk_usuarios_usuario_id',
  })
  @Index('colonias_colonia_deletedBy_id_1a2cfbb5')
  deletedBy?: Usuario | null;
}

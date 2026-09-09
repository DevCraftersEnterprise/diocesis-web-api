import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Usuario } from '../../users/entities/usuario.entity';

/**
 * Mapea `decanatos_decanato` (Django `BaseModel` + `name` + `createdBy`).
 *
 * Relaciones de auditoria con los nombres de constraint/indice EXACTOS de Django de esta
 * tabla (patron Tarea 2.1). `createdBy` es propio de los modelos de contenido (el
 * `BaseModel` de `usuarios` no lo tiene).
 */
@Entity('decanatos_decanato')
export class Decanato extends BaseEntity {
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
      'decanatos_decanato_createdBy_id_978ed3ec_fk_usuarios_usuario_id',
  })
  @Index('decanatos_decanato_createdBy_id_978ed3ec')
  createdBy?: Usuario | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'updatedBy_id',
    foreignKeyConstraintName:
      'decanatos_decanato_updatedBy_id_253c7f36_fk_usuarios_usuario_id',
  })
  @Index('decanatos_decanato_updatedBy_id_253c7f36')
  updatedBy?: Usuario | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'deletedBy_id',
    foreignKeyConstraintName:
      'decanatos_decanato_deletedBy_id_081a6a2c_fk_usuarios_usuario_id',
  })
  @Index('decanatos_decanato_deletedBy_id_081a6a2c')
  deletedBy?: Usuario | null;
}

import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export type UserRole = 'super' | 'admin' | 'user';

/**
 * Mapea `usuarios_usuario` (Django `AbstractBaseUser` + `PermissionsMixin` + `BaseModel`).
 *
 * Dualidad de "activo" (ADR-002 pto. 6, BUG-DJANGO-020):
 *   - `isActive`  (columna `"isActive"`, heredada de `BaseEntity`) -> flag de negocio.
 *   - `isActiveAuth` (columna `is_active`) -> flag de auth de Django.
 * "Usuario activo" = ambos `true`. Toda (des)activacion toca los dos.
 *
 * Sin `createdBy_id` (el `BaseModel` de Django no lo tiene para usuarios).
 * `role` sin CHECK en BD (ADR-004 DQ2-A lo anade en una migracion de endurecimiento).
 * `is_superuser` / grupos / permisos de Django no se usan (NestJS autoriza por `role`);
 * se mapean solo para fidelidad.
 *
 * PATRON FK auditoria (decision Tarea 2.1, ADR-001/004): cada entidad declara sus
 * relaciones `updatedBy` / `deletedBy` con los **nombres de constraint e indice exactos
 * de Django** de SU tabla, para que `migration:generate` no proponga recrearlos. El unico
 * ruido tolerado es el par de indices `varchar_pattern_ops` `*_like` que TypeORM no sabe
 * modelar (ver `docs/db/migrations.md`).
 */
@Entity('usuarios_usuario')
@Unique('usuarios_usuario_username_key', ['username'])
@Unique('usuarios_usuario_email_key', ['email'])
export class Usuario extends BaseEntity {
  @Column('varchar', { length: 128 })
  password!: string;

  @Column('timestamptz', { name: 'last_login', nullable: true })
  lastLogin!: Date | null;

  @Column('boolean', { name: 'is_superuser' })
  isSuperuser!: boolean;

  @Column('varchar', { length: 150 })
  username!: string;

  @Column('varchar', { length: 254 })
  email!: string;

  @Column('varchar', { length: 10 })
  role!: UserRole;

  @Column('boolean', { name: 'is_staff' })
  isStaff!: boolean;

  @Column('boolean', { name: 'is_active' })
  isActiveAuth!: boolean;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'updatedBy_id',
    foreignKeyConstraintName:
      'usuarios_usuario_updatedBy_id_fc2ef36d_fk_usuarios_usuario_id',
  })
  @Index('usuarios_usuario_updatedBy_id_fc2ef36d')
  updatedBy?: Usuario | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'deletedBy_id',
    foreignKeyConstraintName:
      'usuarios_usuario_deletedBy_id_184ce499_fk_usuarios_usuario_id',
  })
  @Index('usuarios_usuario_deletedBy_id_184ce499')
  deletedBy?: Usuario | null;
}

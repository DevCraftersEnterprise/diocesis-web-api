import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Usuario } from '../../users/entities/usuario.entity';

/** Diaconos agrega 2 subtipos (permanente/transitorio) en vez de un modelo aparte. */
export const PADRE_ROLES = [
  'presbitero',
  'diacono_permanente',
  'diacono_transitorio',
] as const;
export type PadreRole = (typeof PADRE_ROLES)[number];

/**
 * Mapea `padres_padre` (Django `BaseModel` + campos propios + `picture` de Cloudinary).
 * **Sin `createdBy`** (el `BaseModel` de `usuarios`/`padres` no lo tiene). `picture` guarda
 * la `secure_url` como string (igual que Django, que hace `data['picture'] = secure_url`).
 * Patron audit-FK (Tarea 2.1): solo `updatedBy` / `deletedBy`.
 *
 * `role`/`ordinationDate`/`phone`/`assignedCommunity` (Tarea Diaconos, ADR-004 aditiva):
 * reusan este mismo modelo con un campo `role` en vez de duplicar Padre para Diaconos.
 * Filas existentes (todas presbiteros) quedan con `role='presbitero'` por el DEFAULT.
 */
@Entity('padres_padre')
export class Padre extends BaseEntity {
  @Column('varchar', { name: 'firstName', length: 100 })
  firstName!: string;

  @Column('varchar', { name: 'lastName', length: 100 })
  lastName!: string;

  @Column('date', { name: 'birthDate' })
  birthDate!: string;

  @Column('varchar', { length: 255, nullable: true })
  picture!: string | null;

  @Column('varchar', { length: 254, nullable: true })
  email!: string | null;

  @Column('varchar', { length: 200, nullable: true })
  facebook!: string | null;

  @Column('varchar', { length: 200, nullable: true })
  instagram!: string | null;

  @Column('varchar', { length: 200, nullable: true })
  twitter!: string | null;

  @Column('varchar', { length: 30, default: 'presbitero' })
  role!: PadreRole;

  @Column('date', { name: 'ordinationDate', nullable: true })
  ordinationDate!: string | null;

  @Column('varchar', { length: 20, nullable: true })
  phone!: string | null;

  @Column('varchar', { name: 'assignedCommunity', length: 255, nullable: true })
  assignedCommunity!: string | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'updatedBy_id',
    foreignKeyConstraintName:
      'padres_padre_updatedBy_id_66835c95_fk_usuarios_usuario_id',
  })
  @Index('padres_padre_updatedBy_id_66835c95')
  updatedBy?: Usuario | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'deletedBy_id',
    foreignKeyConstraintName:
      'padres_padre_deletedBy_id_09365b89_fk_usuarios_usuario_id',
  })
  @Index('padres_padre_deletedBy_id_09365b89')
  deletedBy?: Usuario | null;
}

import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Colonia } from '../../colonies/entities/colonia.entity';
import { Decanato } from '../../decanates/entities/decanato.entity';
import { Padre } from '../../reverends/entities/padre.entity';
import { Usuario } from '../../users/entities/usuario.entity';

/**
 * Mapea `parroquias_parroquia`. 6 FK (`DEFERRABLE INITIALLY DEFERRED`, sin `ON DELETE`):
 * `coloniaId`/`decanatoId`/`padreId` a contenido (NOT NULL) y `createdBy`/`updatedBy`/
 * `deletedBy` a usuarios. Los nombres de constraint van **truncados a 63 chars** tal como
 * los dejo Django/Postgres (`..._fk_colonias_`, `..._fk_usuarios_`, `..._fk_decanatos`).
 * El `PROTECT` de Django es logica de Python; como todo es soft-delete no se dispara.
 */
@Entity('parroquias_parroquia')
export class Parroquia extends BaseEntity {
  @Column('varchar', { length: 255 })
  name!: string;

  @Column('date', { name: 'openingDate' })
  openingDate!: string;

  @Column('text')
  address!: string;

  @Column('varchar', { name: 'zipCode', length: 10 })
  zipCode!: string;

  @Column('varchar', { length: 100 })
  town!: string;

  @Column('varchar', { length: 255, nullable: true })
  picture!: string | null;

  @Column({ name: 'coloniaId_id', type: 'uuid' })
  coloniaId!: string;

  @Column({ name: 'decanatoId_id', type: 'uuid' })
  decanatoId!: string;

  @Column({ name: 'padreId_id', type: 'uuid' })
  padreId!: string;

  @Column({ name: 'createdBy_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @ManyToOne(() => Colonia, {
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'coloniaId_id',
    foreignKeyConstraintName:
      'parroquias_parroquia_coloniaId_id_788533d8_fk_colonias_',
  })
  @Index('parroquias_parroquia_coloniaId_id_788533d8')
  colonia?: Colonia;

  @ManyToOne(() => Decanato, {
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'decanatoId_id',
    foreignKeyConstraintName:
      'parroquias_parroquia_decanatoId_id_c3204cd1_fk_decanatos',
  })
  @Index('parroquias_parroquia_decanatoId_id_c3204cd1')
  decanato?: Decanato;

  @ManyToOne(() => Padre, {
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'padreId_id',
    foreignKeyConstraintName:
      'parroquias_parroquia_padreId_id_dd063430_fk_padres_padre_id',
  })
  @Index('parroquias_parroquia_padreId_id_dd063430')
  padre?: Padre;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'createdBy_id',
    foreignKeyConstraintName:
      'parroquias_parroquia_createdBy_id_10d4cd4a_fk_usuarios_',
  })
  @Index('parroquias_parroquia_createdBy_id_10d4cd4a')
  createdBy?: Usuario | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'updatedBy_id',
    foreignKeyConstraintName:
      'parroquias_parroquia_updatedBy_id_a65afdc4_fk_usuarios_',
  })
  @Index('parroquias_parroquia_updatedBy_id_a65afdc4')
  updatedBy?: Usuario | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'NO ACTION',
    deferrable: 'INITIALLY DEFERRED',
  })
  @JoinColumn({
    name: 'deletedBy_id',
    foreignKeyConstraintName:
      'parroquias_parroquia_deletedBy_id_d8b711dd_fk_usuarios_',
  })
  @Index('parroquias_parroquia_deletedBy_id_d8b711dd')
  deletedBy?: Usuario | null;
}

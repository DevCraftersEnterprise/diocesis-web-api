import { getMetadataArgsStorage } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Usuario } from './usuario.entity';

const storage = getMetadataArgsStorage();

function dbColumnName(prop: string): string {
  const col = storage.columns.find(
    (c) =>
      (c.target === Usuario || c.target === BaseEntity) &&
      c.propertyName === prop,
  );
  if (!col) throw new Error(`columna no mapeada: ${prop}`);
  return col.options.name ?? prop;
}

describe('Usuario entity (mapeo de usuarios_usuario)', () => {
  it('apunta a la tabla usuarios_usuario', () => {
    const table = storage.tables.find((t) => t.target === Usuario);
    expect(table?.name).toBe('usuarios_usuario');
  });

  it('mapea las columnas snake_case de Django/auth a sus nombres reales', () => {
    expect(dbColumnName('lastLogin')).toBe('last_login');
    expect(dbColumnName('isSuperuser')).toBe('is_superuser');
    expect(dbColumnName('isStaff')).toBe('is_staff');
    expect(dbColumnName('isActiveAuth')).toBe('is_active');
  });

  it('conserva las columnas camelCase del BaseModel', () => {
    expect(dbColumnName('isActive')).toBe('isActive');
    expect(dbColumnName('createdAt')).toBe('createdAt');
    expect(dbColumnName('updatedById')).toBe('updatedBy_id');
    expect(dbColumnName('deletedById')).toBe('deletedBy_id');
  });

  it('no declara createdBy (usuarios_usuario no tiene esa columna)', () => {
    const hasCreatedBy = storage.columns.some(
      (c) =>
        (c.target === Usuario || c.target === BaseEntity) &&
        (c.propertyName === 'createdById' || c.options.name === 'createdBy_id'),
    );
    expect(hasCreatedBy).toBe(false);
  });

  it('declara los UNIQUE con los nombres de constraint de Django', () => {
    const names = storage.uniques
      .filter((u) => u.target === Usuario)
      .map((u) => u.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'usuarios_usuario_username_key',
        'usuarios_usuario_email_key',
      ]),
    );
  });

  it('declara las FK de auditoria con los nombres de constraint de Django', () => {
    const fkNames = storage.joinColumns
      .filter((j) => j.target === Usuario)
      .map((j) => j.foreignKeyConstraintName);
    expect(fkNames).toEqual(
      expect.arrayContaining([
        'usuarios_usuario_updatedBy_id_fc2ef36d_fk_usuarios_usuario_id',
        'usuarios_usuario_deletedBy_id_184ce499_fk_usuarios_usuario_id',
      ]),
    );
  });

  it('declara moduleAccess (Tarea 2.1) como jsonb con el CHECK de dominio', () => {
    expect(dbColumnName('moduleAccess')).toBe('moduleAccess');
    const checks = storage.checks
      .filter((c) => c.target === Usuario)
      .map((c) => c.name);
    expect(checks).toEqual(
      expect.arrayContaining([
        'usuarios_usuario_role_check',
        'usuarios_usuario_moduleaccess_check',
      ]),
    );
  });
});

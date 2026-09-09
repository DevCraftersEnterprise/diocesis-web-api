import { ForbiddenException } from '@nestjs/common';
import type { Usuario } from './entities/usuario.entity';
import { assertCanAssignRole, assertCanManage } from './can-manage';

const u = (role: Usuario['role']) => ({ role }) as Usuario;

describe('assertCanManage', () => {
  it('admin NO puede sobre super', () => {
    expect(() => assertCanManage(u('admin'), u('super'))).toThrow(
      ForbiddenException,
    );
  });

  it('super puede sobre cualquiera; admin sobre admin/user', () => {
    expect(() => assertCanManage(u('super'), u('super'))).not.toThrow();
    expect(() => assertCanManage(u('admin'), u('admin'))).not.toThrow();
    expect(() => assertCanManage(u('admin'), u('user'))).not.toThrow();
  });
});

describe('assertCanAssignRole', () => {
  it('admin no puede asignar super', () => {
    expect(() => assertCanAssignRole(u('admin'), 'super')).toThrow(
      ForbiddenException,
    );
  });
  it('admin puede asignar admin/user; super puede asignar super', () => {
    expect(() => assertCanAssignRole(u('admin'), 'admin')).not.toThrow();
    expect(() => assertCanAssignRole(u('super'), 'super')).not.toThrow();
  });
});

import type { Usuario } from './entities/usuario.entity';
import { toUserResponse } from './user.response';

const base = {
  id: 'u1',
  username: 'ana',
  email: 'ana@x.test',
  role: 'admin',
  isActive: true,
  createdAt: new Date('2025-01-02T03:04:05.000Z'),
  updatedAt: new Date('2025-02-03T04:05:06.000Z'),
  deletedAt: null,
} as unknown as Usuario;

describe('toUserResponse', () => {
  it('expone solo los campos de UsuarioSerializer y fechas en ISO', () => {
    const out = toUserResponse({
      ...base,
      updatedBy: { username: 'root' } as Usuario,
      deletedBy: null,
    });

    expect(out).toEqual({
      id: 'u1',
      username: 'ana',
      email: 'ana@x.test',
      role: 'admin',
      isActive: true,
      createdAt: '2025-01-02T03:04:05.000Z',
      updatedAt: '2025-02-03T04:05:06.000Z',
      deletedAt: null,
      updatedBy: 'root',
      deletedBy: null,
    });
  });

  it('updatedBy/deletedBy son el username o null (StringRelatedField), nunca objeto', () => {
    const out = toUserResponse({ ...base });
    expect(out.updatedBy).toBeNull();
    expect(out.deletedBy).toBeNull();
  });

  it('no filtra password ni flags internos', () => {
    const out = toUserResponse({
      ...base,
      password: '$argon2id$secret',
      isActiveAuth: true,
      isStaff: true,
    });
    expect(out).not.toHaveProperty('password');
    expect(out).not.toHaveProperty('isActiveAuth');
    expect(out).not.toHaveProperty('isStaff');
  });
});

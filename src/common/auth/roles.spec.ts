import { ROLE_RANK, minRank, roleAtLeast } from './roles';

describe('jerarquia de roles', () => {
  it('super > admin > user', () => {
    expect(ROLE_RANK.super).toBeGreaterThan(ROLE_RANK.admin);
    expect(ROLE_RANK.admin).toBeGreaterThan(ROLE_RANK.user);
  });

  it('roleAtLeast: admin cubre @Roles(admin), user no', () => {
    expect(roleAtLeast('admin', 'admin')).toBe(true);
    expect(roleAtLeast('super', 'admin')).toBe(true);
    expect(roleAtLeast('user', 'admin')).toBe(false);
    expect(roleAtLeast('user', 'user')).toBe(true);
  });

  it('minRank toma el menor de la lista', () => {
    expect(minRank(['admin', 'super'])).toBe(ROLE_RANK.admin);
    expect(minRank(['super'])).toBe(ROLE_RANK.super);
  });
});

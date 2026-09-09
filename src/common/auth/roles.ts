import type { UserRole } from '../../modules/users/entities/usuario.entity';

/** Jerarquia `super > admin > user` (ADR-002 pto. 5). */
export const ROLE_RANK: Record<UserRole, number> = {
  user: 1,
  admin: 2,
  super: 3,
};

/** `true` si `role` tiene al menos el rango de `min` (p. ej. `admin` cubre `@Roles('admin')`). */
export function roleAtLeast(role: UserRole, min: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** Rango minimo exigido por un conjunto de `@Roles(...)`. */
export function minRank(roles: readonly UserRole[]): number {
  return Math.min(...roles.map((r) => ROLE_RANK[r]));
}

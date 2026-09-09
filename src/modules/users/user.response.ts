import type { Usuario, UserRole } from './entities/usuario.entity';

/**
 * Forma de `UsuarioSerializer` de DRF. `updatedBy` / `deletedBy` son `StringRelatedField`
 * -> **username** (string) o `null`, NO objeto anidado. Sin `password`, `is_active`,
 * `is_staff`, `is_superuser`, `last_login`.
 */
export interface UserResponse {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
}

function iso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

/** Requiere que las relaciones `updatedBy` / `deletedBy` esten cargadas (o ausentes). */
export function toUserResponse(user: Usuario): UserResponse {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: iso(user.createdAt)!,
    updatedAt: iso(user.updatedAt)!,
    deletedAt: iso(user.deletedAt),
    updatedBy: user.updatedBy?.username ?? null,
    deletedBy: user.deletedBy?.username ?? null,
  };
}

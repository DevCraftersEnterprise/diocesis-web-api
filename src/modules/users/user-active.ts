import type { Usuario } from './entities/usuario.entity';

/**
 * "Usuario activo" = ambos flags a `true` (ADR-002 pto. 6, corrige BUG-DJANGO-020).
 * `isActive` = flag de negocio del `BaseModel`; `isActiveAuth` (`is_active`) = flag de auth
 * de Django. Toda (des)activacion debe mover los dos a la vez.
 */
export function isActiveUser(
  user: Pick<Usuario, 'isActive' | 'isActiveAuth'>,
): boolean {
  return user.isActive === true && user.isActiveAuth === true;
}

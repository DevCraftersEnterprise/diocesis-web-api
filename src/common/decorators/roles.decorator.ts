import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../modules/users/entities/usuario.entity';

export const ROLES_KEY = 'auth:roles';

/**
 * Exige que el usuario tenga **al menos** uno de los roles indicados (por jerarquia:
 * `@Roles('admin')` deja pasar a `admin` y `super`). Sin `@Roles` -> basta con estar
 * autenticado. Replica `es_admin_o_super` de Django.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

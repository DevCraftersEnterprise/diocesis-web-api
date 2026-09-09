import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { ROLE_RANK, minRank } from '../../../common/auth/roles';
import type { Usuario, UserRole } from '../../users/entities/usuario.entity';

const FORBIDDEN = { detail: 'No tienes permiso para realizar esta accion.' };
const NO_CREDENTIALS = {
  detail: 'No se proporcionaron credenciales de autenticacion.',
};

/**
 * Guard global (`APP_GUARD`, corre despues de `JwtAuthGuard`). Sin `@Roles` -> pasa.
 * Con `@Roles(...)` -> el `role` del usuario debe alcanzar el rango minimo pedido
 * (jerarquia `super > admin > user`). Replica y centraliza `es_admin_o_super`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: Usuario }>();
    const user = request.user;
    if (!user) throw new UnauthorizedException(NO_CREDENTIALS);

    if (ROLE_RANK[user.role] >= minRank(required)) return true;
    throw new ForbiddenException(FORBIDDEN);
  }
}

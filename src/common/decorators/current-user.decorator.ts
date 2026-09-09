import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Usuario } from '../../modules/users/entities/usuario.entity';

/**
 * Inyecta el `Usuario` autenticado (`request.user`, puesto por `JwtStrategy`).
 * `@CurrentUser('id')` devuelve solo ese campo.
 */
export const CurrentUser = createParamDecorator(
  (field: keyof Usuario | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: Usuario }>();
    const user = request.user;
    return field && user ? user[field] : user;
  },
);

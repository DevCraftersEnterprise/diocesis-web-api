import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_ACCESS_KEY } from '../../../common/decorators/module-access.decorator';
import type {
  AppModuleName,
  Usuario,
} from '../../users/entities/usuario.entity';

const FORBIDDEN = { detail: 'No tienes permiso para realizar esta accion.' };
const NO_CREDENTIALS = {
  detail: 'No se proporcionaron credenciales de autenticacion.',
};

/**
 * Guard puntual (NO `APP_GUARD` global) para los controllers de `institute`/`isma`
 * (Tarea 2.1). Se aplica por ruta via `@UseGuards(ModuleAccessGuard)` +
 * `@ModuleAccess('instituto-biblico' | 'isma')`, igual que `ThrottlerGuard` en los
 * endpoints de auth (Tarea 8.1) — nunca afecta a los 10 modulos existentes.
 *
 * `admin`/`super` pasan siempre (acceso total, igual que al resto del sistema). Un
 * `user` pasa solo si `moduleAccess` incluye el modulo exigido. Sin `@ModuleAccess`
 * en la ruta -> pasa (mismo criterio que `RolesGuard` sin `@Roles`).
 */
@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<
      AppModuleName | undefined
    >(MODULE_ACCESS_KEY, [context.getHandler(), context.getClass()]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest<{ user?: Usuario }>();
    const user = request.user;
    if (!user) throw new UnauthorizedException(NO_CREDENTIALS);

    if (user.role === 'admin' || user.role === 'super') return true;
    if (user.moduleAccess?.includes(required)) return true;
    throw new ForbiddenException(FORBIDDEN);
  }
}

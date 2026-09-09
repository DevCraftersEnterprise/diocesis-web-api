import {
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

const NO_CREDENTIALS = {
  detail: 'No se proporcionaron credenciales de autenticacion.',
};

/**
 * Guard global (`APP_GUARD`). Exige Bearer valido salvo en rutas `@Public()`.
 * Los 401 salen con `{ detail }` (forma DRF/simplejwt); un token invalido conserva el
 * mensaje que lanza `JwtStrategy`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic ? true : super.canActivate(context);
  }

  handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err instanceof UnauthorizedException) throw err;
    if (err || !user) throw new UnauthorizedException(NO_CREDENTIALS);
    return user;
  }
}

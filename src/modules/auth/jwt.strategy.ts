import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import type { Config } from '../../config/config.types';
import { Usuario } from '../users/entities/usuario.entity';
import { isActiveUser } from '../users/user-active';
import type { JwtPayload } from './token.types';

const INVALID_TOKEN = { detail: 'El token no es valido o ha expirado.' };

/**
 * Estrategia Bearer (ADR-002 pto. 5). Verifica HS256 con `JWT_SECRET`, exige
 * `token_type === 'access'`, carga el usuario por `user_id` y exige que este activo
 * (ambos flags). El `Usuario` devuelto queda en `request.user`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Usuario) private readonly users: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<Config['jwt']>('app-config.jwt').secret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<Usuario> {
    if (payload.token_type !== 'access') {
      throw new UnauthorizedException(INVALID_TOKEN);
    }

    const user = await this.users.findOne({ where: { id: payload.user_id } });
    if (!user || !isActiveUser(user)) {
      throw new UnauthorizedException(INVALID_TOKEN);
    }

    return user;
  }
}

import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import type { Config } from '../../config/config.types';
import type { JwtPayload, TokenPair } from './token.types';

/**
 * Emision y verificacion de JWT (ADR-002). HS256, firma con `JWT_SECRET`. Vidas desde
 * `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` (`8h` / `1d`). El payload replica la forma de
 * simplejwt: `user_id`, `token_type`, `jti`, `iat`, `exp`.
 */
@Injectable()
export class TokenService {
  private readonly jwtConfig: Config['jwt'];

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.jwtConfig = config.getOrThrow<Config['jwt']>('app-config.jwt');
  }

  async issueTokens(userId: string): Promise<TokenPair> {
    const [access, refresh] = await Promise.all([
      this.sign(userId, 'access', this.jwtConfig.accessTtl),
      this.sign(userId, 'refresh', this.jwtConfig.refreshTtl),
    ]);
    return { access, refresh };
  }

  /** Valida un refresh token y devuelve su payload. Lanza 401 con la forma de simplejwt. */
  async verifyRefresh(token: string): Promise<JwtPayload> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException({
        detail: 'El token no es valido o ha expirado.',
      });
    }
    if (payload.token_type !== 'refresh') {
      throw new UnauthorizedException({
        detail: 'El token no es valido o ha expirado.',
      });
    }
    return payload;
  }

  private sign(
    userId: string,
    tokenType: JwtPayload['token_type'],
    expiresIn: string,
  ): Promise<string> {
    const payload: JwtPayload = {
      user_id: userId,
      token_type: tokenType,
      jti: randomUUID(),
    };
    return this.jwt.signAsync(payload, {
      expiresIn: expiresIn as JwtSignOptions['expiresIn'],
    });
  }
}

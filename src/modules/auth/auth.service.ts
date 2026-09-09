import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../users/entities/usuario.entity';
import { isActiveUser } from '../users/user-active';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import type { TokenPair } from './token.types';

/** Mensaje EXACTO de `djangorestframework-simplejwt` ante credenciales invalidas. */
const INVALID_CREDENTIALS = {
  detail: 'No active account found with the given credentials',
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private readonly users: Repository<Usuario>,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  /**
   * Login (ADR-002). Usuario inexistente / contrasena incorrecta / usuario inactivo ->
   * 401 con el mismo cuerpo que simplejwt. En el primer login de un usuario cuyo hash
   * sigue en PBKDF2 (Django), se re-hashea a argon2id y se persiste (`update_fields`
   * = solo `password`, como Django). No se toca `last_login` (simplejwt tampoco, sin
   * `UPDATE_LAST_LOGIN`).
   */
  async login(username: string, password: string): Promise<TokenPair> {
    const user = await this.users.findOne({ where: { username } });
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const { valid, needsRehash } = await this.passwords.verify(
      password,
      user.password,
    );
    if (!valid || !isActiveUser(user)) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (needsRehash) {
      await this.users.update(user.id, {
        password: await this.passwords.hash(password),
      });
    }

    return this.tokens.issueTokens(user.id);
  }

  /** Refresh sin rotacion ni blacklist (igual que `TokenRefreshView` de simplejwt). */
  async refresh(refreshToken: string): Promise<{ access: string }> {
    const payload = await this.tokens.verifyRefresh(refreshToken);
    return { access: await this.tokens.issueAccess(payload.user_id) };
  }
}

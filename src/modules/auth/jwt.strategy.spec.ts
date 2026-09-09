import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import type { Usuario } from '../users/entities/usuario.entity';
import { JwtStrategy } from './jwt.strategy';
import type { JwtPayload } from './token.types';

const config = {
  getOrThrow: () => ({ secret: 'x'.repeat(20) }),
} as unknown as ConfigService;

function buildStrategy(user: Partial<Usuario> | null) {
  const repo = {
    findOne: jest.fn().mockResolvedValue(user),
  } as unknown as Repository<Usuario>;
  return { strategy: new JwtStrategy(config, repo), repo };
}

const accessPayload: JwtPayload = {
  user_id: 'u1',
  token_type: 'access',
  jti: 'j1',
};

describe('JwtStrategy.validate', () => {
  it('devuelve el usuario si el token es access y el usuario esta activo', async () => {
    const active = { id: 'u1', isActive: true, isActiveAuth: true };
    const { strategy } = buildStrategy(active);
    await expect(strategy.validate(accessPayload)).resolves.toBe(active);
  });

  it('rechaza un token refresh', async () => {
    const { strategy } = buildStrategy({
      id: 'u1',
      isActive: true,
      isActiveAuth: true,
    });
    await expect(
      strategy.validate({ ...accessPayload, token_type: 'refresh' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza si el usuario no existe', async () => {
    const { strategy } = buildStrategy(null);
    await expect(strategy.validate(accessPayload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza si el usuario esta inactivo en cualquiera de los dos flags', async () => {
    const { strategy } = buildStrategy({
      id: 'u1',
      isActive: true,
      isActiveAuth: false,
    });
    await expect(strategy.validate(accessPayload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

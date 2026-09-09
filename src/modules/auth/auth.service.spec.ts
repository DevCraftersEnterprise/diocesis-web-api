import { pbkdf2Sync } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Usuario } from '../users/entities/usuario.entity';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import type { TokenService } from './token.service';

const passwords = new PasswordService();

/** Genera un hash PBKDF2 en formato Django (sintetico) para una contrasena dada. */
function djangoHash(
  password: string,
  salt = 'abcdEFGH1234',
  iter = 260000,
): string {
  const raw = pbkdf2Sync(password, salt, iter, 32, 'sha256');
  return `pbkdf2_sha256$${iter}$${salt}$${raw.toString('base64')}`;
}

function buildService(user: Partial<Usuario> | null) {
  const repo = {
    findOne: jest.fn().mockResolvedValue(user),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<Usuario>;
  const tokens = {
    issueTokens: jest.fn().mockResolvedValue({ access: 'a', refresh: 'r' }),
    issueAccess: jest.fn().mockResolvedValue('a2'),
    verifyRefresh: jest.fn(),
  } as unknown as TokenService;
  return { service: new AuthService(repo, passwords, tokens), repo, tokens };
}

const activeBase = { id: 'u1', isActive: true, isActiveAuth: true };

describe('AuthService.login', () => {
  it('401 con el cuerpo de simplejwt si el usuario no existe', async () => {
    const { service } = buildService(null);
    await expect(service.login('nadie', 'x')).rejects.toMatchObject({
      response: {
        detail: 'No active account found with the given credentials',
      },
    });
  });

  it('401 si la contrasena es incorrecta', async () => {
    const hash = await passwords.hash('la-buena');
    const { service } = buildService({ ...activeBase, password: hash });
    await expect(service.login('ana', 'la-mala')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('401 si el usuario esta inactivo aunque la contrasena sea correcta', async () => {
    const hash = await passwords.hash('ok');
    const { service } = buildService({
      ...activeBase,
      isActiveAuth: false,
      password: hash,
    });
    await expect(service.login('ana', 'ok')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('login OK con hash argon2id: devuelve tokens y NO re-hashea', async () => {
    const hash = await passwords.hash('ok');
    const { service, repo, tokens } = buildService({
      ...activeBase,
      password: hash,
    });

    await expect(service.login('ana', 'ok')).resolves.toEqual({
      access: 'a',
      refresh: 'r',
    });
    expect(tokens.issueTokens).toHaveBeenCalledWith('u1');
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('login OK con hash PBKDF2 de Django: devuelve tokens y persiste rehash a argon2id', async () => {
    const { service, repo } = buildService({
      ...activeBase,
      password: djangoHash('legacy-pw'),
    });

    await expect(service.login('ana', 'legacy-pw')).resolves.toEqual({
      access: 'a',
      refresh: 'r',
    });
    expect(repo.update).toHaveBeenCalledTimes(1);
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      unknown,
      { password: string },
    ];
    expect(patch.password.startsWith('$argon2id$')).toBe(true);
  });
});

describe('AuthService.refresh', () => {
  it('devuelve solo un nuevo access', async () => {
    const { service, tokens } = buildService(null);
    (tokens.verifyRefresh as jest.Mock).mockResolvedValue({
      user_id: 'u9',
      token_type: 'refresh',
      jti: 'j',
    });
    await expect(service.refresh('r')).resolves.toEqual({ access: 'a2' });
    expect(tokens.issueAccess).toHaveBeenCalledWith('u9');
  });
});

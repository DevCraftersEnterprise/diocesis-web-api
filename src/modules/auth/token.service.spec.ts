import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from './token.types';
import { TokenService } from './token.service';

const SECRET = 'test-secret-solo-para-tests-0123456789';

function build(): TokenService {
  const jwt = new JwtService({
    secret: SECRET,
    signOptions: { algorithm: 'HS256' },
    verifyOptions: { algorithms: ['HS256'] },
  });
  const config = {
    getOrThrow: () => ({
      secret: SECRET,
      accessTtl: '8h',
      refreshTtl: '1d',
    }),
  } as unknown as ConfigService;
  return new TokenService(jwt, config);
}

function decode(token: string): JwtPayload {
  const [, body] = token.split('.');
  return JSON.parse(Buffer.from(body, 'base64').toString('utf8')) as JwtPayload;
}

describe('TokenService', () => {
  const service = build();

  it('emite access + refresh con la forma de simplejwt', async () => {
    const pair = await service.issueTokens('user-uuid-1');

    for (const token of [pair.access, pair.refresh]) {
      const p = decode(token);
      expect(p.user_id).toBe('user-uuid-1');
      expect(typeof p.jti).toBe('string');
      expect(typeof p.iat).toBe('number');
      expect(typeof p.exp).toBe('number');
    }
    expect(decode(pair.access).token_type).toBe('access');
    expect(decode(pair.refresh).token_type).toBe('refresh');
    // access 8h < refresh 1d
    expect(decode(pair.access).exp).toBeLessThan(decode(pair.refresh).exp!);
    // jti distinto por token
    expect(decode(pair.access).jti).not.toBe(decode(pair.refresh).jti);
  });

  it('verifyRefresh acepta un refresh valido', async () => {
    const { refresh } = await service.issueTokens('user-uuid-2');
    const payload = await service.verifyRefresh(refresh);
    expect(payload.user_id).toBe('user-uuid-2');
    expect(payload.token_type).toBe('refresh');
  });

  it('verifyRefresh rechaza un access token (token_type != refresh)', async () => {
    const { access } = await service.issueTokens('user-uuid-3');
    await expect(service.verifyRefresh(access)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('verifyRefresh rechaza basura', async () => {
    await expect(service.verifyRefresh('no-es-un-jwt')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

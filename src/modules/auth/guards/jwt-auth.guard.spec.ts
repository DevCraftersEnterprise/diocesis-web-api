import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

const ctx = {
  getHandler: () => undefined,
  getClass: () => undefined,
} as unknown as ExecutionContext;

function guard(isPublic: boolean) {
  const reflector = {
    getAllAndOverride: () => isPublic,
  } as unknown as Reflector;
  return new JwtAuthGuard(reflector);
}

describe('JwtAuthGuard', () => {
  it('ruta @Public() -> pasa sin autenticar', () => {
    expect(guard(true).canActivate(ctx)).toBe(true);
  });

  describe('handleRequest', () => {
    const g = guard(false);

    it('devuelve el usuario cuando hay uno', () => {
      const user = { id: 'u1' };
      expect(g.handleRequest(null, user)).toBe(user);
    });

    it('sin usuario -> 401 { detail } generico', () => {
      expect(() => g.handleRequest(null, false)).toThrow(UnauthorizedException);
    });

    it('conserva el UnauthorizedException que lanzo la estrategia', () => {
      const fromStrategy = new UnauthorizedException({ detail: 'token malo' });
      expect(() => g.handleRequest(fromStrategy, false)).toThrow(fromStrategy);
    });
  });
});

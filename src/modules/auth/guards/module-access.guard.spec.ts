import {
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type {
  AppModuleName,
  Usuario,
} from '../../users/entities/usuario.entity';
import { ModuleAccessGuard } from './module-access.guard';

function ctxWith(user: Partial<Usuario> | undefined): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardWith(required: AppModuleName | undefined) {
  const reflector = {
    getAllAndOverride: () => required,
  } as unknown as Reflector;
  return new ModuleAccessGuard(reflector);
}

describe('ModuleAccessGuard', () => {
  it('sin @ModuleAccess -> pasa', () => {
    expect(
      guardWith(undefined).canActivate(
        ctxWith({ role: 'user', moduleAccess: [] }),
      ),
    ).toBe(true);
  });

  it('admin y super pasan siempre, tengan o no el modulo en moduleAccess', () => {
    const g = guardWith('isma');
    expect(g.canActivate(ctxWith({ role: 'admin', moduleAccess: [] }))).toBe(
      true,
    );
    expect(g.canActivate(ctxWith({ role: 'super', moduleAccess: [] }))).toBe(
      true,
    );
  });

  it('user con el modulo en moduleAccess pasa', () => {
    const g = guardWith('isma');
    expect(
      g.canActivate(ctxWith({ role: 'user', moduleAccess: ['isma'] })),
    ).toBe(true);
  });

  it('user sin el modulo (u otro modulo distinto) -> 403', () => {
    const g = guardWith('isma');
    expect(() =>
      g.canActivate(ctxWith({ role: 'user', moduleAccess: [] })),
    ).toThrow(ForbiddenException);
    expect(() =>
      g.canActivate(
        ctxWith({ role: 'user', moduleAccess: ['instituto-biblico'] }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('sin usuario en la request -> 401', () => {
    expect(() => guardWith('isma').canActivate(ctxWith(undefined))).toThrow(
      UnauthorizedException,
    );
  });
});

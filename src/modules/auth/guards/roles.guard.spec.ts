import {
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Usuario, UserRole } from '../../users/entities/usuario.entity';
import { RolesGuard } from './roles.guard';

function ctxWith(user: Partial<Usuario> | undefined): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardWith(required: UserRole[] | undefined) {
  const reflector = {
    getAllAndOverride: () => required,
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('sin @Roles -> pasa', () => {
    expect(guardWith(undefined).canActivate(ctxWith({ role: 'user' }))).toBe(
      true,
    );
    expect(guardWith([]).canActivate(ctxWith({ role: 'user' }))).toBe(true);
  });

  it('@Roles(admin) deja pasar admin y super, no user', () => {
    const g = guardWith(['admin']);
    expect(g.canActivate(ctxWith({ role: 'admin' }))).toBe(true);
    expect(g.canActivate(ctxWith({ role: 'super' }))).toBe(true);
    expect(() => g.canActivate(ctxWith({ role: 'user' }))).toThrow(
      ForbiddenException,
    );
  });

  it('@Roles(super) solo deja pasar super', () => {
    const g = guardWith(['super']);
    expect(g.canActivate(ctxWith({ role: 'super' }))).toBe(true);
    expect(() => g.canActivate(ctxWith({ role: 'admin' }))).toThrow(
      ForbiddenException,
    );
  });

  it('sin usuario en la request -> 401', () => {
    expect(() => guardWith(['admin']).canActivate(ctxWith(undefined))).toThrow(
      UnauthorizedException,
    );
  });
});

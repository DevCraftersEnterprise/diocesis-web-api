import { SetMetadata } from '@nestjs/common';
import type { AppModuleName } from '../../modules/users/entities/usuario.entity';

export const MODULE_ACCESS_KEY = 'auth:moduleAccess';

/**
 * Exige acceso al modulo indicado (Tarea 2.1, `docs/instituto-biblico-isma.md` §4).
 * Distinto de `@Roles(...)`: no es una jerarquia. `admin`/`super` siempre pasan (ver
 * `ModuleAccessGuard`); un `user` pasa solo si `moduleAccess` incluye este modulo.
 * Se usa **solo** en los controllers de `institute`/`isma` — no es un `APP_GUARD`
 * global, así que los 10 modulos existentes no cambian de comportamiento.
 */
export const ModuleAccess = (mod: AppModuleName) =>
  SetMetadata(MODULE_ACCESS_KEY, mod);

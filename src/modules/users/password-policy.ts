import { randomBytes } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { COMMON_PASSWORDS } from './common-passwords';

// Sin caracteres ambiguos (I/l/1/O/0) para que un admin pueda dictarla.
const GEN_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** Contrasena aleatoria para `reset-password` (BUG-DJANGO-002: ya no es el username). */
export function generatePassword(length = 16): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += GEN_ALPHABET[bytes[i] % GEN_ALPHABET.length];
  }
  return out;
}

export interface PasswordContext {
  username?: string;
  email?: string;
}

/**
 * Equivalente a `AUTH_PASSWORD_VALIDATORS` de Django, que estaba configurado pero NUNCA
 * se invocaba (BUG-DJANGO-005): longitud minima 8, no solo numeros, no demasiado parecido
 * a `username` / parte local del `email`, y no una contrasena muy comun
 * (`CommonPasswordValidator` -> `COMMON_PASSWORDS`, subconjunto curado, Tarea 8.4).
 *
 * Lanza `BadRequestException` con la forma DRF `{ "<campo>": ["..."] }`.
 */
export function assertPasswordPolicy(
  password: string,
  context: PasswordContext = {},
  field = 'password',
): void {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push(
      'Esta contrasena es demasiado corta. Debe contener al menos 8 caracteres.',
    );
  }
  if (/^\d+$/.test(password)) {
    errors.push('Esta contrasena es completamente numerica.');
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase().replace(/\s+/g, ''))) {
    errors.push('Esta contrasena es demasiado comun.');
  }

  const lowered = password.toLowerCase();
  const similars = [context.username, context.email?.split('@')[0]]
    .filter((v): v is string => Boolean(v && v.length >= 3))
    .map((v) => v.toLowerCase());
  if (similars.some((v) => lowered.includes(v) || v.includes(lowered))) {
    errors.push(
      'La contrasena es demasiado parecida al nombre de usuario o al correo.',
    );
  }

  if (errors.length > 0) {
    throw new BadRequestException({ [field]: errors });
  }
}

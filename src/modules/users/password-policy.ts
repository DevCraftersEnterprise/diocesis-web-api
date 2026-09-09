import { BadRequestException } from '@nestjs/common';

export interface PasswordContext {
  username?: string;
  email?: string;
}

/**
 * Subconjunto de alto valor de `AUTH_PASSWORD_VALIDATORS` de Django, que estaba
 * configurado pero NUNCA se invocaba (BUG-DJANGO-005): longitud minima 8, no solo
 * numeros, y no demasiado parecido a `username` / parte local del `email`.
 * `CommonPasswordValidator` (lista de 20k) queda pendiente.
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

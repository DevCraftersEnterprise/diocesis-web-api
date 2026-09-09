import { BadRequestException } from '@nestjs/common';
import { assertPasswordPolicy } from './password-policy';

const bodyOf = (fn: () => void): Record<string, string[]> => {
  try {
    fn();
  } catch (e) {
    return (e as BadRequestException).getResponse() as Record<string, string[]>;
  }
  throw new Error('no lanzo');
};

describe('assertPasswordPolicy', () => {
  it('acepta una contrasena razonable', () => {
    expect(() =>
      assertPasswordPolicy('un-secreto-decente', { username: 'ana' }),
    ).not.toThrow();
  });

  it('rechaza < 8 caracteres', () => {
    expect(bodyOf(() => assertPasswordPolicy('corta7x'))).toHaveProperty(
      'password',
    );
  });

  it('rechaza contrasena solo numerica', () => {
    expect(() => assertPasswordPolicy('12345678')).toThrow(BadRequestException);
  });

  it('rechaza una contrasena muy comun (BUG-DJANGO-005, tambien mayusculas)', () => {
    expect(bodyOf(() => assertPasswordPolicy('password'))).toHaveProperty(
      'password',
    );
    expect(() => assertPasswordPolicy('QWERTY123')).toThrow(
      BadRequestException,
    );
    expect(() => assertPasswordPolicy('diocesis123')).toThrow(
      BadRequestException,
    );
  });

  it('rechaza contrasena parecida al username o al email', () => {
    expect(() =>
      assertPasswordPolicy('anabanana', { username: 'anabanana' }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertPasswordPolicy('juanito99extra', { email: 'juanito99@x.test' }),
    ).toThrow(BadRequestException);
  });

  it('usa el nombre de campo dado (p. ej. new_password)', () => {
    expect(
      bodyOf(() => assertPasswordPolicy('x', {}, 'new_password')),
    ).toHaveProperty('new_password');
  });
});

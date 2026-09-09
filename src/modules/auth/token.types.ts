/**
 * Forma del payload de los JWT, espejo de `djangorestframework-simplejwt` (ADR-002 pto. 2).
 * `@nestjs/jwt` aporta `iat` y `exp`; el resto lo pone `TokenService`.
 */
export interface JwtPayload {
  /** UUID del usuario, como string. Claim de identidad que lee el frontend. */
  user_id: string;
  token_type: 'access' | 'refresh';
  /** id unico del token (paridad de forma; no hay blacklist). */
  jti: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import type { CorsConfig } from '../config/config.types';

/**
 * CORS por **allowlist** (Tarea 1.9, cierra SECURITY-003).
 *
 * Django usa hoy `CORS_ALLOW_ALL_ORIGINS = True`. NestJS solo refleja el `Origin` si esta
 * en `CORS_ORIGINS` (lista separada por comas en el env -> `app-config.cors.origins`).
 * Lista vacia -> `origin: false`: sin cabeceras CORS, las peticiones cross-origin del
 * navegador fallan (fail-closed). El frontend usa `Authorization: Bearer` (no cookies),
 * asi que `credentials: false`.
 */
export function buildCorsOptions(cors: CorsConfig): CorsOptions {
  return {
    origin: cors.origins.length > 0 ? cors.origins : false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 86400,
  };
}

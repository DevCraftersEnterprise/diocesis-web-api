import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { buildCorsOptions } from './common/cors.config';
import type { Config } from './config/config.types';

/**
 * Configuracion de la instancia HTTP compartida por `main.ts` y los tests e2e (fuente
 * unica: los tests ejercen el mismo enrutado que produccion).
 *
 * - `setGlobalPrefix('api')`: el frontend usa `environment.apiUrl = <host>/api`.
 *   `GET /health` queda **excluido** del prefijo (Tarea 1.8).
 * - Barra final: Express corre con `strict routing` desactivado (por defecto), asi que
 *   `/api/decanatos` y `/api/decanatos/` resuelven a la misma ruta. El frontend siempre
 *   envia la barra final; se cubre con un test e2e.
 * - CORS: allowlist desde `CORS_ORIGINS` (Tarea 1.9).
 */
export function configureApp(
  app: INestApplication,
  config: ConfigService,
): void {
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableCors(
    buildCorsOptions(config.getOrThrow<Config['cors']>('app-config.cors')),
  );
}

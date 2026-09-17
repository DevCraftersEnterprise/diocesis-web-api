import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Express } from 'express';
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
 * - `trust proxy` (Tarea 9.1): Render pone la app detras de un proxy inverso; sin esto,
 *   Express ve la IP del proxy en vez de la del cliente. Solo importa hoy para el key por
 *   IP del throttler de auth (SECURITY-006, Tarea 8.1) -> con `nodeEnv=production` todas
 *   las peticiones compartirian esa unica IP y el rate limit se volveria global de facto.
 *   `1` = confia en el primer hop (el balanceador de Render), no en saltos mas alla.
 *   Fuera de produccion no hay proxy real: se deja sin activar.
 */
export function configureApp(
  app: INestApplication,
  config: ConfigService,
): void {
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableCors(
    buildCorsOptions(config.getOrThrow<Config['cors']>('app-config.cors')),
  );

  const appConfig = config.getOrThrow<Config['app']>('app-config.app');
  if (appConfig.nodeEnv === 'production') {
    const expressApp = app.getHttpAdapter().getInstance() as Express;
    expressApp.set('trust proxy', 1);
  }
}

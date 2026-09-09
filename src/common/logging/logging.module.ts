import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { Config } from '../../config/config.types';

/**
 * Logging estructurado (JSON) con pino (Tarea 1.7). Sustituye al logger por defecto de
 * Nest (`app.useLogger(...)` en `main.ts`), asi que todo `Logger` de `@nestjs/common`
 * (incluido el de `AllExceptionsFilter`) sale por aqui.
 *
 * - Nivel desde `LOG_LEVEL` (`app-config.log.level`). En `.env.test` = `silent`.
 * - `redact`: nunca se registran `Authorization`, cookies ni campos de contrasena.
 * - En desarrollo, salida legible via `pino-pretty`; en prod/test, JSON de una linea.
 * - `autoLogging`: una linea por peticion HTTP (metodo, ruta, status, latencia).
 */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const level = config.getOrThrow<Config['log']['level']>(
          'app-config.log.level',
        );
        const nodeEnv = config.getOrThrow<Config['app']['nodeEnv']>(
          'app-config.app.nodeEnv',
        );

        return {
          pinoHttp: {
            level,
            autoLogging: true,
            quietReqLogger: true,
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.currentPassword',
                'req.body.newPassword',
                'res.headers["set-cookie"]',
              ],
              remove: true,
            },
            transport:
              nodeEnv === 'development'
                ? {
                    target: 'pino-pretty',
                    options: {
                      singleLine: true,
                      translateTime: 'SYS:standard',
                    },
                  }
                : undefined,
          },
        };
      },
    }),
  ],
})
export class LoggingModule {}

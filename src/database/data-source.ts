import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.validation';
import { buildDataSourceOptions } from './database.options';

/**
 * `DataSource` para la CLI de TypeORM (migraciones, Tarea 1.3). Corre FUERA de Nest, asi
 * que carga los `.env` a mano con el mismo orden de precedencia que `@nestjs/config`
 * (`.env.<NODE_ENV>` gana sobre `.env`) y reutiliza `validateEnv` para fallar rapido.
 *
 * Uso: `npm run typeorm -- migration:run` / `migration:generate` / `migration:revert`.
 */
loadEnv({ path: `.env.${process.env.NODE_ENV ?? 'development'}` });
loadEnv({ path: '.env' });

const env = validateEnv(process.env);

export const dataSource = new DataSource(
  buildDataSourceOptions({ url: env.DATABASE_URL, ssl: env.DATABASE_SSL }),
);

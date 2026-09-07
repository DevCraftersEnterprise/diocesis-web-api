import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import type { DatabaseConfig } from '../config/config.types';

/**
 * Opciones de conexion compartidas por el `DatabaseModule` (runtime) y el `DataSource` de
 * la CLI de TypeORM (migraciones, Tarea 1.3).
 *
 * `synchronize` y `migrationsRun` SIEMPRE `false` (ADR-004): NestJS nunca genera ni aplica
 * esquema por su cuenta.
 */
export function buildDataSourceOptions(db: DatabaseConfig): DataSourceOptions {
  return {
    type: 'postgres',
    url: db.url,
    ssl: db.ssl ? { rejectUnauthorized: false } : false,
    synchronize: false,
    migrationsRun: false,
    entities: [join(__dirname, '..', '**', '*.entity.{js,ts}')],
    migrations: [join(__dirname, 'migrations', '*.{js,ts}')],
    logging: ['error', 'warn'],
  };
}

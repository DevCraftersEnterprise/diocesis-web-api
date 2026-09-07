import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline: esquema completo de produccion (ADR-004, pto. 2).
 *
 * `up()` ejecuta `docs/db/baseline.sql` VERBATIM — copia saneada del `pg_dump --schema-only`
 * de produccion (PostgreSQL 16.15), con los nombres de constraints e indices de Django
 * intactos, para que sea un no-op verificable contra prod.
 *
 * NO se ejecuta contra: produccion, la copia de Neon, el contenedor oraculo, ni ninguna
 * BD restaurada desde `schema.sql` — ahi el esquema YA existe. En esas BDs se marca como
 * aplicada insertando su fila a mano (TypeORM 0.3 no tiene `--fake`):
 *
 *   CREATE TABLE IF NOT EXISTS migrations (
 *     id          SERIAL PRIMARY KEY,
 *     "timestamp" bigint NOT NULL,
 *     name        varchar NOT NULL
 *   );
 *   INSERT INTO migrations ("timestamp", name)
 *   VALUES (1788804486651, 'BaselineProductionSchema1788804486651');
 *
 * Solo se ejecuta de verdad en BDs VACIAS (CI / dev creadas de cero).
 * Detalles en `docs/db/migrations.md`. Correr `npm run migration:*` desde la raiz del repo.
 */
export class BaselineProductionSchema1788804486651 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const sql = readFileSync(
      join(process.cwd(), 'docs', 'db', 'baseline.sql'),
      'utf8',
    );
    await queryRunner.query(sql);
  }

  public down(): Promise<void> {
    throw new Error(
      'La baseline no se revierte: down() recrearia el esquema (borrando datos) y la ' +
        'propia tabla `migrations` vive en el esquema que se caeria. Para reiniciar una ' +
        'BD desechable: dropdb + createdb y vuelve a ejecutar `npm run migration:run`.',
    );
  }
}

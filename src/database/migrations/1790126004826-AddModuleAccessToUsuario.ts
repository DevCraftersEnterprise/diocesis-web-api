import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `moduleAccess` en `usuarios_usuario` (Tarea 2.1, etapa Instituto Biblico / ISMA — ver
 * `docs/instituto-biblico-isma.md` §4). Mecanismo de acceso por modulo, deliberadamente
 * separado de `role`/`ROLE_RANK`: no toca el CHECK ni la jerarquia existente.
 *
 * **Aditiva y segura**: columna `NOT NULL DEFAULT '[]'::jsonb` — Postgres rellena las
 * filas existentes con el propio `ADD COLUMN` (sin paso de backfill aparte, a diferencia
 * de la migracion de carrusel que si necesito un `UPDATE` porque alli no se declaro
 * `DEFAULT`). `CHECK` de dominio con el mismo mecanismo que `usuarios_usuario_role_check`
 * (ADR-004 DQ2-A), pero sobre un array jsonb via el operador de contencion `<@`.
 */
export class AddModuleAccessToUsuario1790126004826 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios_usuario" ADD COLUMN "moduleAccess" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios_usuario" ADD CONSTRAINT "usuarios_usuario_moduleaccess_check" ` +
        `CHECK ("moduleAccess" <@ '["instituto-biblico","isma"]'::jsonb)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios_usuario" DROP CONSTRAINT "usuarios_usuario_moduleaccess_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios_usuario" DROP COLUMN "moduleAccess"`,
    );
  }
}

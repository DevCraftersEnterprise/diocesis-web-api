import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `CHECK` de dominio (ADR-004 decision DQ2-A). Endurece a nivel de BD dos columnas que
 * hoy son `varchar` libres pero que la aplicacion ya restringe:
 *
 * - `documentos_documento.type` -> los 9 `DOCUMENT_TYPE_CHOICES` de Django.
 * - `usuarios_usuario.role` -> `super` / `admin` / `user`.
 *
 * **Aditiva y segura**: los datos actuales de prod/oraculo ya cumplen (documentos: 0 filas;
 * usuarios: solo `super`/`admin`/`user`). Nombres de constraint elegidos por NestJS con el
 * estilo Django `<tabla>_<col>_check`; las entidades los declaran con `@Check(name, expr)`
 * para que `migration:generate` no proponga recrearlos (ADR-004 pto. 9).
 */
export class CheckTypeRoleDomain1788981168539 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documentos_documento" ADD CONSTRAINT "documentos_documento_type_check" ` +
        `CHECK ("type" IN ('carta','circular','comunicado','prensa','decreto','instruccion','mensaje','dominical','rescripto'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios_usuario" ADD CONSTRAINT "usuarios_usuario_role_check" ` +
        `CHECK ("role" IN ('super','admin','user'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios_usuario" DROP CONSTRAINT "usuarios_usuario_role_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documentos_documento" DROP CONSTRAINT "documentos_documento_type_check"`,
    );
  }
}

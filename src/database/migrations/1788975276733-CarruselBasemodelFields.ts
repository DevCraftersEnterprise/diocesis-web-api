import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Alinea `carrusel_carrusel` al `BaseModel` completo (ADR-004 DQ3-B; resuelve
 * BUG-DJANGO-023, la migracion Django `carrusel/0003` que nunca se desplego).
 *
 * **Aditiva y segura**: 3 columnas nuevas son `NULL`; `updatedAt` se anade `NULL`, se
 * backfillea desde `createdAt` (21 filas en prod) y luego se marca `NOT NULL`.
 *
 * Nombres de constraint/indice: elegidos por NestJS (no hay `0003` desplegada que igualar),
 * siguiendo el patron `carrusel_carrusel_<col>_<hex>[_fk_usuarios_usuario_id]`.
 */
export class CarruselBasemodelFields1788975276733 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "carrusel_carrusel" ADD COLUMN "updatedAt" timestamptz`,
    );
    await queryRunner.query(
      `UPDATE "carrusel_carrusel" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "carrusel_carrusel" ALTER COLUMN "updatedAt" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "carrusel_carrusel" ADD COLUMN "deletedAt" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "carrusel_carrusel" ADD COLUMN "updatedBy_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "carrusel_carrusel" ADD COLUMN "deletedBy_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "carrusel_carrusel_updatedBy_id_9a1b2c3d" ON "carrusel_carrusel" ("updatedBy_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "carrusel_carrusel_deletedBy_id_7e8f9a0b" ON "carrusel_carrusel" ("deletedBy_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "carrusel_carrusel" ADD CONSTRAINT "carrusel_carrusel_updatedBy_id_9a1b2c3d_fk_usuarios_usuario_id" ` +
        `FOREIGN KEY ("updatedBy_id") REFERENCES "usuarios_usuario"("id") DEFERRABLE INITIALLY DEFERRED`,
    );
    await queryRunner.query(
      `ALTER TABLE "carrusel_carrusel" ADD CONSTRAINT "carrusel_carrusel_deletedBy_id_7e8f9a0b_fk_usuarios_usuario_id" ` +
        `FOREIGN KEY ("deletedBy_id") REFERENCES "usuarios_usuario"("id") DEFERRABLE INITIALLY DEFERRED`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "carrusel_carrusel" DROP CONSTRAINT "carrusel_carrusel_deletedBy_id_7e8f9a0b_fk_usuarios_usuario_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "carrusel_carrusel" DROP CONSTRAINT "carrusel_carrusel_updatedBy_id_9a1b2c3d_fk_usuarios_usuario_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."carrusel_carrusel_deletedBy_id_7e8f9a0b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."carrusel_carrusel_updatedBy_id_9a1b2c3d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "carrusel_carrusel" DROP COLUMN "deletedBy_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "carrusel_carrusel" DROP COLUMN "updatedBy_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "carrusel_carrusel" DROP COLUMN "deletedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "carrusel_carrusel" DROP COLUMN "updatedAt"`,
    );
  }
}

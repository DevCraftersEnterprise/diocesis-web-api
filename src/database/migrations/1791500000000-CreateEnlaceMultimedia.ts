import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `enlace_multimedia` (seccion publica "Multimedia", ruta `multimedia/misas`). Tabla
 * nueva, sin contraparte en Django. Sin siembra: el admin crea los enlaces desde cero.
 */
export class CreateEnlaceMultimedia1791500000000 implements MigrationInterface {
  name = 'CreateEnlaceMultimedia1791500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "enlace_multimedia" ("id" uuid NOT NULL, "title" character varying(255) NOT NULL, "description" text NOT NULL, "url" character varying(500) NOT NULL, "order" integer NOT NULL, "isActive" boolean NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy_id" uuid, "updatedBy_id" uuid, "deletedBy_id" uuid, CONSTRAINT "PK_enlace_multimedia" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_enlace_multimedia_createdBy" ON "enlace_multimedia" ("createdBy_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_enlace_multimedia_updatedBy" ON "enlace_multimedia" ("updatedBy_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_enlace_multimedia_deletedBy" ON "enlace_multimedia" ("deletedBy_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "enlace_multimedia" ADD CONSTRAINT "FK_enlace_multimedia_createdBy" FOREIGN KEY ("createdBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "enlace_multimedia" ADD CONSTRAINT "FK_enlace_multimedia_updatedBy" FOREIGN KEY ("updatedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "enlace_multimedia" ADD CONSTRAINT "FK_enlace_multimedia_deletedBy" FOREIGN KEY ("deletedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "enlace_multimedia" DROP CONSTRAINT "FK_enlace_multimedia_deletedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "enlace_multimedia" DROP CONSTRAINT "FK_enlace_multimedia_updatedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "enlace_multimedia" DROP CONSTRAINT "FK_enlace_multimedia_createdBy"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_enlace_multimedia_deletedBy"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_enlace_multimedia_updatedBy"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_enlace_multimedia_createdBy"`,
    );
    await queryRunner.query(`DROP TABLE "enlace_multimedia"`);
  }
}

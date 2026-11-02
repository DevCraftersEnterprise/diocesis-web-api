import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `descarga` (seccion publica "Descargas"). Tabla nueva, sin contraparte en Django.
 * Sin siembra de filas: a diferencia de `pagina_contenido`, esta lista la crea el
 * admin desde cero (no hay un catalogo fijo de slugs).
 */
export class CreateDescarga1791400000000 implements MigrationInterface {
  name = 'CreateDescarga1791400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "descarga" ("id" uuid NOT NULL, "title" character varying(255) NOT NULL, "description" text NOT NULL, "fileUrl" character varying(255) NOT NULL, "fileName" character varying(255) NOT NULL, "fileExtension" character varying(20) NOT NULL, "fileSizeBytes" integer NOT NULL, "publishedAt" date NOT NULL, "isActive" boolean NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy_id" uuid, "updatedBy_id" uuid, "deletedBy_id" uuid, CONSTRAINT "PK_descarga" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_descarga_createdBy" ON "descarga" ("createdBy_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_descarga_updatedBy" ON "descarga" ("updatedBy_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_descarga_deletedBy" ON "descarga" ("deletedBy_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "descarga" ADD CONSTRAINT "FK_descarga_createdBy" FOREIGN KEY ("createdBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "descarga" ADD CONSTRAINT "FK_descarga_updatedBy" FOREIGN KEY ("updatedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "descarga" ADD CONSTRAINT "FK_descarga_deletedBy" FOREIGN KEY ("deletedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "descarga" DROP CONSTRAINT "FK_descarga_deletedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "descarga" DROP CONSTRAINT "FK_descarga_updatedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "descarga" DROP CONSTRAINT "FK_descarga_createdBy"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_descarga_deletedBy"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_descarga_updatedBy"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_descarga_createdBy"`);
    await queryRunner.query(`DROP TABLE "descarga"`);
  }
}

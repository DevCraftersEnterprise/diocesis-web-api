import type { MigrationInterface, QueryRunner } from 'typeorm';
import { INSTITUTO_INFORMACION_ID } from '../../modules/institute/information/entities/instituto-informacion.entity';

/**
 * `institutos_informacion` (Tarea 3.1, `docs/instituto-biblico-isma.md` §3.1). Tabla
 * nueva, sin contraparte en Django — nombres de constraint/indice elegidos por TypeORM
 * (via `migration:generate`), no hay nada que igualar.
 *
 * Siembra la unica fila (`INSTITUTO_INFORMACION_ID`) con el titulo tal cual aparece en
 * el documento fuente (`instituto_biblico.md`); `description`/contacto quedan vacios a
 * proposito — el contenido real lo captura un admin desde el panel, nunca se inventa
 * aqui (ver §13 de las instrucciones de esta etapa: nada de contenido institucional
 * fabricado).
 */
export class CreateInstitutoInformacion1790127173782 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "institutos_informacion" (` +
        `"id" uuid NOT NULL, ` +
        `"name" character varying(255) NOT NULL, ` +
        `"description" text NOT NULL, ` +
        `"contactEmail" character varying(255), ` +
        `"contactPhone" character varying(20), ` +
        `"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, ` +
        `"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, ` +
        `"updatedBy_id" uuid, ` +
        `CONSTRAINT "PK_3786dbad48731c1eb043133d35e" PRIMARY KEY ("id")` +
        `)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e9ebfb4a7c204cf6430010a573" ON "institutos_informacion" ("updatedBy_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_informacion" ADD CONSTRAINT "FK_e9ebfb4a7c204cf6430010a573c" ` +
        `FOREIGN KEY ("updatedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "institutos_informacion" ` +
        `("id", "name", "description", "contactEmail", "contactPhone", "createdAt", "updatedAt", "updatedBy_id") ` +
        `VALUES ($1, $2, '', NULL, NULL, now(), now(), NULL)`,
      [
        INSTITUTO_INFORMACION_ID,
        'Instituto Bíblico — Instituto del Sagrado Corazón de Jesús',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "institutos_informacion" DROP CONSTRAINT "FK_e9ebfb4a7c204cf6430010a573c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e9ebfb4a7c204cf6430010a573"`,
    );
    await queryRunner.query(`DROP TABLE "institutos_informacion"`);
  }
}

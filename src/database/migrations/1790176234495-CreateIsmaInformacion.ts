import { MigrationInterface, QueryRunner } from 'typeorm';
import { ISMA_INFORMACION_ID } from '../../modules/isma/information/entities/isma-informacion.entity';

/**
 * `isma_informacion` (Tarea 6.1, `docs/instituto-biblico-isma.md` §3.1). Tabla nueva,
 * sin contraparte en Django — nombres de constraint/indice elegidos por TypeORM, no hay
 * nada que igualar. Siembra la unica fila (`ISMA_INFORMACION_ID`) con todos los campos
 * de texto vacios y los telefonos en NULL: el contenido real (incluidos los telefonos
 * documentados en la fuente) lo captura un admin desde el panel, nunca se inventa aqui
 * (ver §13 de las instrucciones de esta etapa: nada de contenido institucional
 * fabricado). Ruido `*_like` de `usuarios_usuario` removido a mano (ADR-004 pto. 9).
 */
export class CreateIsmaInformacion1790176234495 implements MigrationInterface {
  name = 'CreateIsmaInformacion1790176234495';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "isma_informacion" ("id" uuid NOT NULL, "introduccion" text NOT NULL, "documentacionNecesaria" text NOT NULL, "parroquiaCorrespondiente" text NOT NULL, "entrevistaParroco" text NOT NULL, "programaIsma" text NOT NULL, "tiemposAnticipacion" text NOT NULL, "contactoTelefono1" character varying(20), "contactoTelefono2" character varying(20), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedBy_id" uuid, CONSTRAINT "PK_89b46a9ccd67b2c69b4afcdc2fd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1791c39073aa3886c103d19d3d" ON "isma_informacion" ("updatedBy_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_informacion" ADD CONSTRAINT "FK_1791c39073aa3886c103d19d3d3" FOREIGN KEY ("updatedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "isma_informacion" ` +
        `("id", "introduccion", "documentacionNecesaria", "parroquiaCorrespondiente", "entrevistaParroco", "programaIsma", "tiemposAnticipacion", "contactoTelefono1", "contactoTelefono2", "createdAt", "updatedAt", "updatedBy_id") ` +
        `VALUES ($1, '', '', '', '', '', '', NULL, NULL, now(), now(), NULL)`,
      [ISMA_INFORMACION_ID],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "isma_informacion" DROP CONSTRAINT "FK_1791c39073aa3886c103d19d3d3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1791c39073aa3886c103d19d3d"`,
    );
    await queryRunner.query(`DROP TABLE "isma_informacion"`);
  }
}

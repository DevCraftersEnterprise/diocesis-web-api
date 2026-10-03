import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `isma_curso` (calendarizacion de cursos ISMA). Tabla nueva y aditiva, sin contraparte en
 * Django. Se conservan solo las operaciones de esta tabla: el `migration:generate` tambien
 * habia incluido ruido sobre `carrusel_carrusel` y los `*_like` de `usuarios_usuario`, que
 * se removio a mano (ADR-004 pto. 9).
 */
export class CreateIsmaCurso1791041301321 implements MigrationInterface {
  name = 'CreateIsmaCurso1791041301321';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "isma_curso" ("id" uuid NOT NULL, "isActive" boolean NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "updatedBy_id" uuid, "deletedBy_id" uuid, "parroquiaId_id" uuid NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "diaSemana" smallint, "horaInicio" character varying(5), "horaFin" character varying(5), "modalidad" character varying(20) NOT NULL, "telefonoInformes" text, "notas" text, "createdBy_id" uuid, CONSTRAINT "isma_curso_fechas_check" CHECK ("endDate" >= "startDate"), CONSTRAINT "isma_curso_dia_semana_check" CHECK ("diaSemana" IS NULL OR ("diaSemana" BETWEEN 0 AND 6)), CONSTRAINT "isma_curso_modalidad_check" CHECK ("modalidad" IN ('presencial','en_linea')), CONSTRAINT "PK_67a375c2ba554b5efad6ee89a8d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cb6551d3edb610a23e5759d3a4" ON "isma_curso" ("parroquiaId_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bf7481e3fed9e085d1b5218ad4" ON "isma_curso" ("createdBy_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8b058c5c95cc6733badcaf3edc" ON "isma_curso" ("updatedBy_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b5fb8966128aec5b91ae76f718" ON "isma_curso" ("deletedBy_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_curso" ADD CONSTRAINT "FK_cb6551d3edb610a23e5759d3a4f" FOREIGN KEY ("parroquiaId_id") REFERENCES "parroquias_parroquia"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_curso" ADD CONSTRAINT "FK_bf7481e3fed9e085d1b5218ad4e" FOREIGN KEY ("createdBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_curso" ADD CONSTRAINT "FK_8b058c5c95cc6733badcaf3edcd" FOREIGN KEY ("updatedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_curso" ADD CONSTRAINT "FK_b5fb8966128aec5b91ae76f718a" FOREIGN KEY ("deletedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "isma_curso" DROP CONSTRAINT "FK_b5fb8966128aec5b91ae76f718a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_curso" DROP CONSTRAINT "FK_8b058c5c95cc6733badcaf3edcd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_curso" DROP CONSTRAINT "FK_bf7481e3fed9e085d1b5218ad4e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_curso" DROP CONSTRAINT "FK_cb6551d3edb610a23e5759d3a4f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b5fb8966128aec5b91ae76f718"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8b058c5c95cc6733badcaf3edc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bf7481e3fed9e085d1b5218ad4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cb6551d3edb610a23e5759d3a4"`,
    );
    await queryRunner.query(`DROP TABLE "isma_curso"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `institutos_capacitacion` + `institutos_curso` (Tarea 4.1,
 * `docs/instituto-biblico-isma.md` §3.2). Tablas nuevas, sin contraparte en Django —
 * nombres de constraint/indice elegidos por TypeORM (via `migration:generate`), no hay
 * nada que igualar. `institutos_curso.capacitacionId_id` es FK opcional (nullable) a
 * `institutos_capacitacion` (decision Tarea 0.1: relacion no obligatoria). Ruido `*_like`
 * de `usuarios_usuario` removido a mano (ADR-004 pto. 9, ver `docs/db/migrations.md`).
 */
export class CreateCapacitacionCurso1790128815037 implements MigrationInterface {
  name = 'CreateCapacitacionCurso1790128815037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "institutos_capacitacion" ("id" uuid NOT NULL, "isActive" boolean NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "updatedBy_id" uuid, "deletedBy_id" uuid, "name" character varying(255) NOT NULL, "description" text NOT NULL, "modality" character varying(20) NOT NULL, "createdBy_id" uuid, CONSTRAINT "institutos_capacitacion_modality_check" CHECK ("modality" IN ('presencial','en_linea','mixta')), CONSTRAINT "PK_10f90f122f0a48f4166f95984a2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3daaf2cd0fc6d95e92510820b1" ON "institutos_capacitacion" ("createdBy_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3057193c752f3b82cd5ff86556" ON "institutos_capacitacion" ("updatedBy_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f28ba5f5e1280c9407dea11845" ON "institutos_capacitacion" ("deletedBy_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "institutos_curso" ("id" uuid NOT NULL, "isActive" boolean NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "updatedBy_id" uuid, "deletedBy_id" uuid, "title" character varying(255) NOT NULL, "description" text NOT NULL, "modality" character varying(20) NOT NULL, "capacitacionId_id" uuid, "startDate" date, "endDate" date, "meetingLink" character varying(500), "picture" character varying(255), "createdBy_id" uuid, CONSTRAINT "institutos_curso_modality_check" CHECK ("modality" IN ('presencial','en_linea','mixta')), CONSTRAINT "PK_dc9891ab7f180a8f6223be5459c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3123b1e5fa4c4d7719ccf801dd" ON "institutos_curso" ("capacitacionId_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ddb21a64270cde209adadb707a" ON "institutos_curso" ("createdBy_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_395056c581a7e879da5530761b" ON "institutos_curso" ("updatedBy_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e62fbd9e3a41958f9d3b8e92b7" ON "institutos_curso" ("deletedBy_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_capacitacion" ADD CONSTRAINT "FK_3daaf2cd0fc6d95e92510820b19" FOREIGN KEY ("createdBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_capacitacion" ADD CONSTRAINT "FK_3057193c752f3b82cd5ff865565" FOREIGN KEY ("updatedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_capacitacion" ADD CONSTRAINT "FK_f28ba5f5e1280c9407dea11845c" FOREIGN KEY ("deletedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_curso" ADD CONSTRAINT "FK_3123b1e5fa4c4d7719ccf801dd3" FOREIGN KEY ("capacitacionId_id") REFERENCES "institutos_capacitacion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_curso" ADD CONSTRAINT "FK_ddb21a64270cde209adadb707a9" FOREIGN KEY ("createdBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_curso" ADD CONSTRAINT "FK_395056c581a7e879da5530761b0" FOREIGN KEY ("updatedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_curso" ADD CONSTRAINT "FK_e62fbd9e3a41958f9d3b8e92b76" FOREIGN KEY ("deletedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "institutos_curso" DROP CONSTRAINT "FK_e62fbd9e3a41958f9d3b8e92b76"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_curso" DROP CONSTRAINT "FK_395056c581a7e879da5530761b0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_curso" DROP CONSTRAINT "FK_ddb21a64270cde209adadb707a9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_curso" DROP CONSTRAINT "FK_3123b1e5fa4c4d7719ccf801dd3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_capacitacion" DROP CONSTRAINT "FK_f28ba5f5e1280c9407dea11845c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_capacitacion" DROP CONSTRAINT "FK_3057193c752f3b82cd5ff865565"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_capacitacion" DROP CONSTRAINT "FK_3daaf2cd0fc6d95e92510820b19"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e62fbd9e3a41958f9d3b8e92b7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_395056c581a7e879da5530761b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ddb21a64270cde209adadb707a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3123b1e5fa4c4d7719ccf801dd"`,
    );
    await queryRunner.query(`DROP TABLE "institutos_curso"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f28ba5f5e1280c9407dea11845"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3057193c752f3b82cd5ff86556"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3daaf2cd0fc6d95e92510820b1"`,
    );
    await queryRunner.query(`DROP TABLE "institutos_capacitacion"`);
  }
}

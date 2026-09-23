import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `institutos_sede` + `institutos_evento` (Tarea 5.1,
 * `docs/instituto-biblico-isma.md` §3.2). Tablas nuevas, sin contraparte en Django —
 * nombres de constraint/indice elegidos por TypeORM (via `migration:generate`), no hay
 * nada que igualar. `institutos_evento.cursoId_id`/`sedeId_id` son FKs opcionales
 * (nullable). Ruido `*_like` de `usuarios_usuario` removido a mano (ADR-004 pto. 9, ver
 * `docs/db/migrations.md`).
 */
export class CreateSedeEvento1790175109069 implements MigrationInterface {
  name = 'CreateSedeEvento1790175109069';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "institutos_sede" ("id" uuid NOT NULL, "isActive" boolean NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "updatedBy_id" uuid, "deletedBy_id" uuid, "name" character varying(255) NOT NULL, "address" text NOT NULL, "mapsUrl" character varying(500) NOT NULL, "picture" character varying(255), "createdBy_id" uuid, CONSTRAINT "PK_c4b426a27d79beb1493a48518b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7db88e3def531568fc28811c05" ON "institutos_sede" ("createdBy_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b20872c9146d78f7a289ade57a" ON "institutos_sede" ("updatedBy_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7deee16395c51a79b56a520547" ON "institutos_sede" ("deletedBy_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "institutos_evento" ("id" uuid NOT NULL, "isActive" boolean NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "updatedBy_id" uuid, "deletedBy_id" uuid, "title" character varying(255) NOT NULL, "description" text, "type" character varying(20) NOT NULL, "startDate" date NOT NULL, "endDate" date, "cursoId_id" uuid, "sedeId_id" uuid, "createdBy_id" uuid, CONSTRAINT "institutos_evento_type_check" CHECK ("type" IN ('inscripcion','curso','actividad')), CONSTRAINT "PK_c0533f8cc416a548a3954d2d814" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e47c694495a77e8f1194f8f469" ON "institutos_evento" ("cursoId_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2ae69663c1f32b79b4ab3dc2ce" ON "institutos_evento" ("sedeId_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e5638ac190897ac5aa5d889980" ON "institutos_evento" ("createdBy_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_19dd84730fde8110f7c410e7c9" ON "institutos_evento" ("updatedBy_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1a8a288a2e100b06059effa1e5" ON "institutos_evento" ("deletedBy_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_sede" ADD CONSTRAINT "FK_7db88e3def531568fc28811c050" FOREIGN KEY ("createdBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_sede" ADD CONSTRAINT "FK_b20872c9146d78f7a289ade57a2" FOREIGN KEY ("updatedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_sede" ADD CONSTRAINT "FK_7deee16395c51a79b56a520547d" FOREIGN KEY ("deletedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_evento" ADD CONSTRAINT "FK_e47c694495a77e8f1194f8f469e" FOREIGN KEY ("cursoId_id") REFERENCES "institutos_curso"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_evento" ADD CONSTRAINT "FK_2ae69663c1f32b79b4ab3dc2cec" FOREIGN KEY ("sedeId_id") REFERENCES "institutos_sede"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_evento" ADD CONSTRAINT "FK_e5638ac190897ac5aa5d889980d" FOREIGN KEY ("createdBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_evento" ADD CONSTRAINT "FK_19dd84730fde8110f7c410e7c99" FOREIGN KEY ("updatedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_evento" ADD CONSTRAINT "FK_1a8a288a2e100b06059effa1e50" FOREIGN KEY ("deletedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "institutos_evento" DROP CONSTRAINT "FK_1a8a288a2e100b06059effa1e50"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_evento" DROP CONSTRAINT "FK_19dd84730fde8110f7c410e7c99"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_evento" DROP CONSTRAINT "FK_e5638ac190897ac5aa5d889980d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_evento" DROP CONSTRAINT "FK_2ae69663c1f32b79b4ab3dc2cec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_evento" DROP CONSTRAINT "FK_e47c694495a77e8f1194f8f469e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_sede" DROP CONSTRAINT "FK_7deee16395c51a79b56a520547d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_sede" DROP CONSTRAINT "FK_b20872c9146d78f7a289ade57a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutos_sede" DROP CONSTRAINT "FK_7db88e3def531568fc28811c050"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1a8a288a2e100b06059effa1e5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_19dd84730fde8110f7c410e7c9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e5638ac190897ac5aa5d889980"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2ae69663c1f32b79b4ab3dc2ce"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e47c694495a77e8f1194f8f469"`,
    );
    await queryRunner.query(`DROP TABLE "institutos_evento"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7deee16395c51a79b56a520547"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b20872c9146d78f7a289ade57a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7db88e3def531568fc28811c05"`,
    );
    await queryRunner.query(`DROP TABLE "institutos_sede"`);
  }
}

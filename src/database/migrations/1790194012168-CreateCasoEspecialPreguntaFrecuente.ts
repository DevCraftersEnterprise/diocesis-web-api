import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `isma_caso_especial` + `isma_pregunta_frecuente` (Tarea 7.1,
 * `docs/instituto-biblico-isma.md` §3.3). Tablas nuevas, sin contraparte en Django —
 * nombres de constraint/indice elegidos por TypeORM (via `migration:generate`), no hay
 * nada que igualar. Sin fila sembrada: los 10 casos y las 8 preguntas del documento
 * fuente los captura un admin desde el panel, nunca se inventan aqui (§13 de las
 * instrucciones de esta etapa). Ruido `*_like` de `usuarios_usuario` removido a mano
 * (ADR-004 pto. 9).
 */
export class CreateCasoEspecialPreguntaFrecuente1790194012168 implements MigrationInterface {
  name = 'CreateCasoEspecialPreguntaFrecuente1790194012168';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "isma_caso_especial" ("id" uuid NOT NULL, "isActive" boolean NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "updatedBy_id" uuid, "deletedBy_id" uuid, "title" character varying(255) NOT NULL, "order" integer NOT NULL, "requisitosAdicionales" text NOT NULL, "documentosAdicionales" text, "excepciones" text, "contacto" text, "createdBy_id" uuid, CONSTRAINT "PK_7df2ee95e5cab34ef8b5e6b7916" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_60a9162a385037a6a2f2916b10" ON "isma_caso_especial" ("createdBy_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7f61e029eb0cdc7f7c90d7259a" ON "isma_caso_especial" ("updatedBy_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e101712ff29fe5bd6d31c34511" ON "isma_caso_especial" ("deletedBy_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "isma_pregunta_frecuente" ("id" uuid NOT NULL, "isActive" boolean NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "updatedBy_id" uuid, "deletedBy_id" uuid, "question" text NOT NULL, "answer" text NOT NULL, "order" integer NOT NULL, "createdBy_id" uuid, CONSTRAINT "PK_8176a9b0a9ef7eea270e45fdec2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1f662e11636ea1e91354ee4954" ON "isma_pregunta_frecuente" ("createdBy_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0a91b497ede206a796ca75f16b" ON "isma_pregunta_frecuente" ("updatedBy_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2d60a3f6e31fc1c41542c19a72" ON "isma_pregunta_frecuente" ("deletedBy_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_caso_especial" ADD CONSTRAINT "FK_60a9162a385037a6a2f2916b105" FOREIGN KEY ("createdBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_caso_especial" ADD CONSTRAINT "FK_7f61e029eb0cdc7f7c90d7259aa" FOREIGN KEY ("updatedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_caso_especial" ADD CONSTRAINT "FK_e101712ff29fe5bd6d31c345113" FOREIGN KEY ("deletedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_pregunta_frecuente" ADD CONSTRAINT "FK_1f662e11636ea1e91354ee4954c" FOREIGN KEY ("createdBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_pregunta_frecuente" ADD CONSTRAINT "FK_0a91b497ede206a796ca75f16b4" FOREIGN KEY ("updatedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_pregunta_frecuente" ADD CONSTRAINT "FK_2d60a3f6e31fc1c41542c19a724" FOREIGN KEY ("deletedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "isma_pregunta_frecuente" DROP CONSTRAINT "FK_2d60a3f6e31fc1c41542c19a724"`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_pregunta_frecuente" DROP CONSTRAINT "FK_0a91b497ede206a796ca75f16b4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_pregunta_frecuente" DROP CONSTRAINT "FK_1f662e11636ea1e91354ee4954c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_caso_especial" DROP CONSTRAINT "FK_e101712ff29fe5bd6d31c345113"`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_caso_especial" DROP CONSTRAINT "FK_7f61e029eb0cdc7f7c90d7259aa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_caso_especial" DROP CONSTRAINT "FK_60a9162a385037a6a2f2916b105"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2d60a3f6e31fc1c41542c19a72"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0a91b497ede206a796ca75f16b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1f662e11636ea1e91354ee4954"`,
    );
    await queryRunner.query(`DROP TABLE "isma_pregunta_frecuente"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e101712ff29fe5bd6d31c34511"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7f61e029eb0cdc7f7c90d7259a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_60a9162a385037a6a2f2916b10"`,
    );
    await queryRunner.query(`DROP TABLE "isma_caso_especial"`);
  }
}

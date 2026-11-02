import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  PAGINA_CONTENIDO_IDS,
  type PaginaContenidoSlug,
} from '../../modules/pages/entities/pagina-contenido.entity';

/**
 * `pagina_contenido` + `pagina_imagen` (activar menus "en construccion"). Tablas
 * nuevas, sin contraparte en Django. Siembra las 10 filas fijas de
 * `PAGINA_CONTENIDO_IDS` con `title` = la etiqueta que ya tenia cada item en el menu
 * publico (no es contenido institucional inventado, es solo el rotulo de navegacion
 * que ya existia) y `body` vacio: el texto real lo captura un admin desde el panel
 * (mismo criterio que `CreateIsmaInformacion`).
 */
export class CreatePaginaContenido1791300000000 implements MigrationInterface {
  name = 'CreatePaginaContenido1791300000000';

  private readonly titles: Record<string, string> = {
    historia: 'Historia',
    obispo: 'Obispo',
    'planeacion-pastoral': 'Planeación Pastoral',
    obituario: 'Obituario',
    curia: 'Curia',
    'gobierno-pastoral': 'Gobierno Pastoral',
    'actividad-pastoral': 'Actividad Pastoral',
    seminario: 'Seminario',
    nombramientos: 'Nombramientos',
    diezmo: 'Diezmo',
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    const slugs = Object.keys(PAGINA_CONTENIDO_IDS) as PaginaContenidoSlug[];
    const slugCheck = `"slug" IN (${slugs.map((s) => "'" + s + "'").join(',')})`;

    await queryRunner.query(
      `CREATE TABLE "pagina_contenido" ("id" uuid NOT NULL, "slug" character varying(40) NOT NULL, "title" character varying(255) NOT NULL, "body" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedBy_id" uuid, CONSTRAINT "UQ_pagina_contenido_slug" UNIQUE ("slug"), CONSTRAINT "CHK_pagina_contenido_slug" CHECK (${slugCheck}), CONSTRAINT "PK_pagina_contenido" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pagina_contenido_updatedBy" ON "pagina_contenido" ("updatedBy_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "pagina_contenido" ADD CONSTRAINT "FK_pagina_contenido_updatedBy" FOREIGN KEY ("updatedBy_id") REFERENCES "usuarios_usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "pagina_imagen" ("id" uuid NOT NULL, "pagina_id" uuid NOT NULL, "url" character varying(255) NOT NULL, "caption" character varying(255), "order" integer NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_pagina_imagen" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pagina_imagen_pagina" ON "pagina_imagen" ("pagina_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "pagina_imagen" ADD CONSTRAINT "FK_pagina_imagen_pagina" FOREIGN KEY ("pagina_id") REFERENCES "pagina_contenido"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    for (const slug of slugs) {
      await queryRunner.query(
        `INSERT INTO "pagina_contenido" ("id", "slug", "title", "body", "createdAt", "updatedAt", "updatedBy_id") VALUES ($1, $2, $3, '', now(), now(), NULL)`,
        [PAGINA_CONTENIDO_IDS[slug], slug, this.titles[slug]],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pagina_imagen" DROP CONSTRAINT "FK_pagina_imagen_pagina"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_pagina_imagen_pagina"`);
    await queryRunner.query(`DROP TABLE "pagina_imagen"`);

    await queryRunner.query(
      `ALTER TABLE "pagina_contenido" DROP CONSTRAINT "FK_pagina_contenido_updatedBy"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_pagina_contenido_updatedBy"`,
    );
    await queryRunner.query(`DROP TABLE "pagina_contenido"`);
  }
}

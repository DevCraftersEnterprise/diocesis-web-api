import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `isma_curso.modalidad` (un valor) pasa a `modalidades` (jsonb, uno o ambos valores). Los
 * datos existentes se convierten a arreglo de un elemento. La tabla es nueva y aditiva, sin
 * contraparte en Django.
 */
export class AlterIsmaCursoModalidades1791200000000 implements MigrationInterface {
  name = 'AlterIsmaCursoModalidades1791200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "isma_curso" ADD COLUMN "modalidades" jsonb`,
    );
    await queryRunner.query(
      `UPDATE "isma_curso" SET "modalidades" = jsonb_build_array("modalidad")`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_curso" ALTER COLUMN "modalidades" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_curso" DROP CONSTRAINT "isma_curso_modalidad_check"`,
    );
    await queryRunner.query(`ALTER TABLE "isma_curso" DROP COLUMN "modalidad"`);
    await queryRunner.query(
      `ALTER TABLE "isma_curso" ADD CONSTRAINT "isma_curso_modalidades_check" CHECK (jsonb_typeof("modalidades") = 'array' AND jsonb_array_length("modalidades") > 0 AND "modalidades" <@ '["presencial","en_linea"]'::jsonb)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "isma_curso" DROP CONSTRAINT "isma_curso_modalidades_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_curso" ADD COLUMN "modalidad" character varying(20)`,
    );
    await queryRunner.query(
      `UPDATE "isma_curso" SET "modalidad" = CASE WHEN "modalidades" ? 'presencial' THEN 'presencial' ELSE 'en_linea' END`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_curso" ALTER COLUMN "modalidad" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_curso" ADD CONSTRAINT "isma_curso_modalidad_check" CHECK ("modalidad" IN ('presencial','en_linea'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "isma_curso" DROP COLUMN "modalidades"`,
    );
  }
}

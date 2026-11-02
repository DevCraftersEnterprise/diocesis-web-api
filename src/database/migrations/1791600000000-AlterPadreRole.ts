import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega `role`/`ordinationDate`/`phone`/`assignedCommunity` a `padres_padre` (Tarea
 * Diaconos): reusa el modelo Padre con un campo `role` en vez de duplicarlo para
 * Diaconos (permanente/transitorio). Aditiva: las filas existentes (todas presbiteros
 * hasta ahora) quedan con `role='presbitero'` por el DEFAULT, sin UPDATE manual.
 */
export class AlterPadreRole1791600000000 implements MigrationInterface {
  name = 'AlterPadreRole1791600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "padres_padre" ADD COLUMN "role" character varying(30) NOT NULL DEFAULT 'presbitero'`,
    );
    await queryRunner.query(
      `ALTER TABLE "padres_padre" ADD CONSTRAINT "padres_padre_role_check" CHECK ("role" IN ('presbitero','diacono_permanente','diacono_transitorio'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "padres_padre" ADD COLUMN "ordinationDate" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "padres_padre" ADD COLUMN "phone" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "padres_padre" ADD COLUMN "assignedCommunity" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "padres_padre" DROP COLUMN "assignedCommunity"`,
    );
    await queryRunner.query(`ALTER TABLE "padres_padre" DROP COLUMN "phone"`);
    await queryRunner.query(
      `ALTER TABLE "padres_padre" DROP COLUMN "ordinationDate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "padres_padre" DROP CONSTRAINT "padres_padre_role_check"`,
    );
    await queryRunner.query(`ALTER TABLE "padres_padre" DROP COLUMN "role"`);
  }
}

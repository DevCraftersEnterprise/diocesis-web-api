# Migraciones de base de datos (TypeORM)

Estrategia y decisiones: **ADR-004**. Este documento es el _how-to_ operativo.

## Reglas de oro

- `synchronize: false` y `migrationsRun: false` **siempre** (ver `src/database/database.options.ts`).
  NestJS **nunca** aplica migraciones al arrancar; se ejecutan a mano con los scripts `npm run migration:*`.
- Ejecuta los comandos **desde la raiz del repo** (`diocesis-backend-nest/`). La migracion
  baseline lee `docs/db/baseline.sql` con una ruta relativa a `process.cwd()`.
- La tabla de control de TypeORM es `migrations`. La de Django (`django_migrations`) se
  **deja intacta**; coexisten sin conflicto.
- Nunca cambios destructivos (drop de columna/tabla con datos) sin decision explicita + backup (ADR-004, pto. 10).

## Que BD toca cada comando

El `DataSource` de la CLI (`src/database/data-source.ts`) resuelve la conexion igual que
la app: carga `.env.<NODE_ENV>` y luego `.env` (el primero gana).

| Objetivo | Comando |
|---|---|
| BD de desarrollo local (`.env`) | `npm run migration:run` |
| Contenedor **oraculo** (`.env.test`, `:5433`) | `$env:NODE_ENV="test"; npm run migration:run` |
| Otra BD puntual | `$env:DATABASE_URL="postgres://..."; npm run migration:run` |

## Comandos

```powershell
npm run migration:show        # lista migraciones y su estado ([X] aplicada / [ ] pendiente)
npm run migration:run         # aplica las pendientes
npm run migration:revert      # revierte la ultima aplicada
npm run migration:create -- src/database/migrations/<Nombre>    # stub vacio (sin -d)
npm run migration:generate -- src/database/migrations/<Nombre>  # diff entidades <-> BD (Fase 2+)
```

## La migracion baseline (`0001-BaselineProductionSchema`)

Representa el **esquema actual de produccion** (ADR-004, pto. 2). Su `up()` ejecuta
`docs/db/baseline.sql` verbatim (copia saneada de `docs/db/schema.sql`).

### Caso A — BD que YA tiene el esquema (produccion, copia de Neon, oraculo, cualquier restore de `schema.sql`)

**No** se ejecuta `up()` (crearia tablas que ya existen). Se marca como aplicada
insertando su fila a mano — TypeORM 0.3 no tiene `--fake`:

```sql
CREATE TABLE IF NOT EXISTS migrations (
  id          SERIAL PRIMARY KEY,
  "timestamp" bigint NOT NULL,
  name        varchar NOT NULL
);
INSERT INTO migrations ("timestamp", name)
VALUES (1788804486651, 'BaselineProductionSchema1788804486651');
```

El numero (`1788804486651`) es el timestamp del nombre de archivo/clase de la migracion
(`src/database/migrations/1788804486651-BaselineProductionSchema.ts`). Tras el `INSERT`,
`npm run migration:show` debe listar `[X] BaselineProductionSchema1788804486651` y
`migration:run` no tiene nada pendiente.

### Caso B — BD VACIA (CI, dev creada de cero)

```powershell
npm run migration:run   # ejecuta up(): crea todo el esquema desde baseline.sql
```

### Revertir la baseline

`down()` **lanza error a proposito**: recrear el esquema borraria datos y la propia tabla
`migrations` vive en el esquema que se caeria. Para reiniciar una BD desechable: `dropdb`
+ `createdb` y `migration:run` de nuevo.

## Verificacion del saneado de `baseline.sql`

`baseline.sql` debe diferir de `schema.sql` **solo** en el preambulo (meta-comandos psql,
`SET`, `set_config`, cabeceras `-- Dumped ...`) y en `CREATE SCHEMA public` ->
`CREATE SCHEMA IF NOT EXISTS public`:

```powershell
git diff --no-index docs/db/schema.sql docs/db/baseline.sql
```

## Verificacion estructural del baseline (Fase 2+)

Cuando existan las entidades, `npm run migration:generate` contra una BD restaurada de
`schema.sql` debe dar **diff estructural vacio** (solo se tolera ruido cosmetico de
nombres). Cualquier diff estructural = delta no intencionado -> se reconcilia (ADR-004, pto. 9).
Pendiente de automatizar en CI.

### Ruido tolerado: indices `varchar_pattern_ops` `*_like`

Django crea, por cada `CharField(unique=True)`, un indice extra
`<tabla>_<campo>_<hash>_like` con opclass `varchar_pattern_ops` (acelera `LIKE 'prefijo%'`).
TypeORM 0.3 **no modela opclasses**, asi que `migration:generate` SIEMPRE propone
`DROP INDEX ..._like` para esas columnas. **Se ignora conscientemente** (ADR-004 pto. 9):
la migracion generada no se aplica. En `usuarios_usuario` son
`usuarios_usuario_username_be9def2b_like` y `usuarios_usuario_email_0a82e5f9_like`.

### Patron FK de auditoria en las entidades (decision Tarea 2.1)

`BaseEntity` solo puede llevar decoradores genericos; los nombres de constraint/indice de
`updatedBy_id` / `deletedBy_id` son **por tabla**. Por eso **cada entidad** declara sus
relaciones `updatedBy` / `deletedBy` con `@ManyToOne` + `@JoinColumn({ name,
foreignKeyConstraintName })` + `@Index(<nombre>)` usando los nombres **exactos de Django**
de su tabla (ver `src/modules/users/entities/usuario.entity.ts` como referencia). Con eso
`migration:generate` solo deja el ruido `*_like` de arriba.

## Orden previsto de migraciones (ADR-004)

1. `0001-baseline` — esquema actual de prod.
2. `0002-carrusel-basemodel-fields` — DQ3-B (aditiva; backfill de 21 filas; resuelve BUG-DJANGO-023).
3. `NNNN-check-type-role` — DQ2-A (aditiva; `CHECK` en `documentos.type` y `usuarios.role`).
4. ... deltas que surjan por finding/ADR.

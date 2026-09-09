# ADR-004 — Estrategia de migracion de la base de datos

**Estado:** aceptado (Tarea 0.4)

## Contexto

- Produccion: PostgreSQL 16.15, ~245 filas de negocio. Esquema completo en
  `docs/db/schema.sql`; analisis en `docs/db/notes.md`.
- La BD contiene datos reales: **no se recrea ni se altera libremente** (cambios de
  esquema justificados y no destructivos).
- Rasgos que condicionan la estrategia (ver `notes.md`): UUID generadas por la app sin
  `DEFAULT`, sin `DEFAULT` para timestamps/`tags`/booleanos, FKs
  `NO ACTION DEFERRABLE INITIALLY DEFERRED` (el `on_delete` de Django es logica de Python),
  sin `CHECK` en tablas de negocio, sin enums nativos, columnas camelCase entrecomilladas,
  columnas FK con sufijo `_id`, FK autorreferencial en `usuarios_usuario`, solo 2 `UNIQUE`
  (email/username de usuarios).
- Django tiene 31 migraciones aplicadas; el repo tiene **1 sin aplicar**
  (`carrusel/0003_carrusel_basemodel_fields` -> BUG-DJANGO-023).

## Decision

1. **Adoptar, no recrear.** TypeORM con `synchronize: false` **siempre**. NestJS nunca
   genera el esquema.

2. **Migracion baseline.**
   - La **primera migracion** representa el esquema **actual de produccion** (equivalente a
     `docs/db/schema.sql`) y se marca como **ya aplicada** (no se ejecuta) contra:
     produccion, la copia de Neon y cualquier BD restaurada desde `schema.sql`.
   - Solo se ejecuta de verdad en **BDs vacias** (dev/CI creadas de cero).
   - **Ajuste de implementacion (Tarea 1.3).** En vez de transcribir el DDL a mano al
     `.ts` (~1200 lineas, riesgo de drift), `up()` ejecuta **`docs/db/baseline.sql`
     verbatim**: una copia SANEADA de `schema.sql` cuyo unico delta es el preambulo
     (`\restrict`/`\unrestrict`, `SET ...`, `set_config`, cabeceras `-- Dumped`) y
     `CREATE SCHEMA public` -> `CREATE SCHEMA IF NOT EXISTS public`. Asi hay **una sola
     fuente de verdad** (el dump) y los nombres de constraints/indices de Django quedan
     intactos por construccion. La alternativa "autogenerada" descartada mas abajo lo era
     por generar nombres _de TypeORM_; ejecutar el dump no incurre en eso. El saneado se
     verifica con `git diff --no-index docs/db/schema.sql docs/db/baseline.sql`.
   - `down()` **lanza error a proposito**: recrear el esquema borra datos y la tabla
     `migrations` vive en el esquema que se caeria. Reiniciar una BD desechable = `dropdb`
     + `createdb`, no `migration:revert`.
   - Marcar como aplicada en una BD existente = `INSERT` de la fila de la baseline en la
     tabla `migrations` de TypeORM (comando exacto en `docs/db/migrations.md` y en la
     propia migracion). TypeORM 0.3 no tiene `--fake`.

3. **Tabla de control:** TypeORM usa `migrations` (por defecto). `django_migrations` se
   **deja intacta** (registro de Django; util de referencia). Coexisten sin conflicto.

4. **Entidades sin `DEFAULT` de BD.** Las entidades **no** declaran `DEFAULT` para `id`,
   `createdAt`, `updatedAt`, `tags` ni booleanos. La app aporta esos valores (UUID en
   codigo, timestamps y `tags` via `BaseEntity` con hooks / servicio). No se usan
   `@PrimaryGeneratedColumn('uuid')`, `@CreateDateColumn`, `@UpdateDateColumn` ni
   `default:` en `@Column` para estas columnas. -> la baseline queda identica a prod.

5. **FKs (decision DQ1-A).** La baseline crea las FKs **exactamente como prod**:
   `... REFERENCES ... DEFERRABLE INITIALLY DEFERRED`, **sin `ON DELETE`**. La logica
   `SET_NULL` (`createdBy`/`updatedBy`/`deletedBy`) y `PROTECT`
   (`parroquia -> decanato`/`colonia`/`padre`) se replica en el **servicio**. Como todo son
   soft-deletes, el caso practicamente no se dispara. `DEFERRABLE INITIALLY DEFERRED` es
   necesario para la autorreferencia de `usuarios_usuario` y para inserciones en
   transaccion; hay que forzarlo en la migracion (TypeORM crea FKs no diferibles por
   defecto).

6. **`CHECK` de dominio (decision DQ2-A).** `documentos.type` y `usuarios.role` reciben
   `CHECK (... IN (...))` mediante una **migracion de endurecimiento posterior a la
   baseline** (no en la baseline). Aditivo, sin riesgo con los datos actuales (todos
   validos). **Implementado (Tarea 8.2):** migracion `1788981168539-CheckTypeRoleDomain`
   (constraints `documentos_documento_type_check` y `usuarios_usuario_role_check`). Las
   entidades `Documento`/`Usuario` los declaran con `@Check(name, expr)` -> `migration:generate`
   sigue limpio. Aplicada al oraculo.

7. **`carrusel` (decision DQ3-B).** Se alinea `carrusel_carrusel` al `BaseModel` completo:
   una **migracion aditiva posterior a la baseline** anade `updatedAt`
   (`timestamptz NOT NULL`, backfill de las 21 filas desde `createdAt`), `deletedAt`
   (`timestamptz` NULL), `updatedBy_id` y `deletedBy_id` (`uuid` NULL) + sus FK
   (`DEFERRABLE INITIALLY DEFERRED`) e indices. La entidad `Carrusel` extiende `BaseEntity`
   igual que el resto y su soft-delete queda auditado. Esto **resuelve BUG-DJANGO-023** (la
   migracion Django 0003 que faltaba). La respuesta de `/carrusel/` gana los campos
   `updatedAt`/`deletedAt`/`updatedBy`/`deletedBy`: es un **delta aditivo no disruptivo**
   (el modelo `Carrusel` del frontend es una interfaz; los campos extra en el JSON se
   ignoran en runtime). Se documenta en `contract-matrix.md`.
   **Implementado (Tareas 5.1/5.2):** migracion `1788975276733-CarruselBasemodelFields`
   (nombres de constraint/indice elegidos por NestJS con hex propio, no hay `0003`
   desplegada que igualar). Aplicada al oraculo; backfill 21/21 verificado.

8. **`django_*` / `auth_*` / `usuarios_usuario_groups` / `usuarios_usuario_user_permissions`:**
   NestJS **no las mapea, no las toca, no las borra.** Permanecen en la BD sin uso. Su
   limpieza (destructiva) queda fuera de alcance.

9. **Verificacion del baseline.** Con las entidades listas (Fase 2+), `typeorm
   migration:generate` contra una BD restaurada de `schema.sql` debe dar **diff
   estructural vacio** (solo se tolera ruido cosmetico de nombres, que se ignora
   conscientemente). Cualquier diff estructural = delta no intencionado -> se reconcilia.
   En la Tarea 1.3 no es posible (aun no hay entidades); el check se automatiza en CI
   cuando existan.

10. **Deltas futuros.** Cualquier cambio de esquema posterior a la baseline = migracion
    TypeORM normal **con su justificacion** (referencia a un finding o a un ADR). Nunca
    `synchronize`. Nunca cambios destructivos (drop de columna/tabla con datos) sin
    decision explicita y backup.

## Orden de migraciones previsto

1. `0001-baseline` — esquema actual de prod (no-op contra prod; se ejecuta solo en BD vacia).
2. `0002-carrusel-basemodel-fields` — DQ3-B (aditiva; backfill de 21 filas).
3. `1788981168539-CheckTypeRoleDomain` — DQ2-A (aditiva; `CHECK` en `documentos.type` y
   `usuarios.role`). Aplicada al oraculo en la Tarea 8.2.
4. ... deltas que surjan por finding/ADR.

## Alternativas consideradas

- **`synchronize: true` en dev.** Prohibido: reescribiria el esquema y ocultaria deltas.
- **Baseline autogenerada (no a mano).** Produce nombres de constraint TypeORM que
  difieren de los de Django -> `migration:generate` querria renombrarlos (cambio de
  esquema evitable). Por eso se autora a mano preservando nombres.
- **Prisma `db pull` + `migrate diff`.** Descartado con Prisma en ADR-001.
- **Gestionar el esquema solo con `schema.sql` versionado, sin migraciones.** Fragil para
  deltas futuros y para levantar CI/dev.
- **FKs gestionadas por TypeORM con `onDelete` en BD (DQ1-B).** Menos codigo de servicio,
  pero cambio de esquema (nombres, `ON DELETE`, quita `DEFERRABLE`) y cambia la
  forma/momento de los errores. Descartada.
- **Mantener `carrusel` con solo 6 columnas (DQ3-A).** Mas simple pero deja BUG-DJANGO-023
  sin resolver y el soft-delete de carrusel sin auditar. Descartada.

## Consecuencias

- (+) Produccion no se toca; la baseline es un no-op verificable contra `schema.sql`.
- (+) CI arranca de cero desde la baseline; dev y pruebas de paridad usan `schema.sql` +
  seed.
- (+) Todo cambio de esquema queda trazado y justificado; BUG-DJANGO-023 se resuelve.
- (-) Autorar la baseline a mano (~1200 lineas de DDL) es trabajo mecanico y hay que
  revisarlo con cuidado (Fase 1.3).
- (-) Con DQ1-A, la logica `SET_NULL`/`PROTECT` vive en servicios y hay que testearla.
- (-) Preservar nombres de constraint obliga a `name:` explicito en varios decoradores.
- (-) La migracion de `carrusel` (DQ3-B) incluye un backfill de datos (21 filas) que se
  ejecuta en el corte a produccion.
- (-) `django_*`/`auth_*` quedan como tablas muertas en la BD (limpieza opcional futura,
  destructiva -> fuera de alcance ahora).

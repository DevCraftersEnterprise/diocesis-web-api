# Instituto Bíblico e ISMA — modelo de datos y contrato API (Tarea 1.1)

**Estado: diseño aprobado por el usuario (decisiones de la Tarea 0.1), sin implementar.**
Ningún archivo de código, entidad, migración ni endpoint descrito aquí existe todavía.
Este documento es el contrato de referencia para las fases 2+ de esta nueva etapa
(ver `docs/instituto-biblico-isma.md` §8, Roadmap).

Origen: `instituto_biblico.md` y `requisitos_matrimonio_isma.md` (documentos de la
Diócesis) + decisiones tomadas por el usuario en la Tarea 0.1 sobre 7 puntos abiertos.
No se modifica ningún módulo existente salvo `users` (extensión aditiva, ver §4).

---

## 1. Resumen de decisiones (Tarea 0.1)

| # | Pregunta | Decisión |
|---|---|---|
| 1 | ¿"Oferta de capacitación" y "cursos en activo" son el mismo concepto? | **No.** Dos entidades: `Capacitacion` (catálogo, sin fechas) y `Curso` (instancia activa, con fechas y enlace), unidas por una FK **opcional** `curso.capacitacionId`. |
| 2 | ¿Calendario informativo o widget visual? | **Widget visual nuevo.** Requiere una dependencia de calendario en el frontend — evaluar en un spike antes de comprometerla (§8, FASE 2). |
| 3 | ¿Inscripción a cursos dentro del sistema? | **No.** Solo enlace/contacto (`Curso.meetingLink`), sin flujo de inscripción ni participantes. |
| 4 | ¿Correo institucional gestionado por NestJS? | **No.** Es infraestructura externa (dominio/hosting). El backend solo guarda el dato para mostrarlo (`InstitutoInformacion.contactEmail`, texto libre). |
| 5 | ¿Contenido de ISMA como colecciones o documento único? | **Documento único** (`IsmaInformacion`, fila singleton) para el contenido narrativo; **colecciones reales** para `CasoEspecial` y `PreguntaFrecuente` (son listas enumerables por naturaleza). |
| 6 | ¿Roles nuevos por apartado? | **Sí, pero no como valores nuevos de `Usuario.role`.** Mecanismo nuevo y separado: `moduleAccess` (ver §4). `admin`/`super` conservan acceso total; un usuario con rol `user` puede recibir acceso a uno o varios módulos nuevos sin ser admin general. |
| 7 | ¿Dónde va la navegación? | Admin: **apartado propio** por módulo en el sidebar (plegable, con sub-ítems). Público: **dentro del submenu "Diócesis"** ya existente. |

---

## 2. Estructura de módulos (backend)

Evolución **aditiva** de ADR-003: en vez de 8 módulos NestJS nuevos al mismo nivel plano
que los 10 existentes, se agrupan por dominio en una carpeta padre. Cada sub-recurso
sigue siendo una vertical slice completa e independiente (`entities/`, `dto/`,
`*.service.ts`, `*.controller.ts`, `*.module.ts`); la carpeta padre solo compone los
`imports` en un módulo orquestador, que es lo único que `AppModule` importa:

```
src/modules/
├── institute/
│   ├── information/    InstitutoInformacion (singleton)
│   ├── trainings/       Capacitacion
│   ├── courses/         Curso
│   ├── venues/          Sede
│   ├── events/          Evento (calendario)
│   └── institute.module.ts     # importa los 5 sub-modulos
│
└── isma/
    ├── information/     IsmaInformacion (singleton)
    ├── special-cases/   CasoEspecial
    ├── faq/             PreguntaFrecuente
    └── isma.module.ts   # importa los 3 sub-modulos
```

Motivo: mantiene cada recurso tan aislado y testeable como los módulos actuales
(`news`, `parishes`, ...), evita 8 imports sueltos en `AppModule`, y dentro de cada
carpeta padre queda claro qué pertenece a qué apartado — relevante porque el mecanismo
de `moduleAccess` opera exactamente a ese nivel de agrupación (§4).

**Diferencia deliberada frente al patrón de la migración:** estas son tablas **nuevas**,
sin contraparte en Django. El "Patrón 2.1" (nombres de constraint/índice idénticos a
Django) **no aplica** — no hay nada que igualar. Los nombres de FK/índice los generará
TypeORM por su cuenta y serán la fuente de verdad desde el primer día; `migration:generate`
será limpio sin trabajo adicional de reconciliación.

---

## 3. Modelo de datos

Convenciones heredadas de `BaseEntity` (id uuid generado en código, `isActive`,
`createdAt`/`updatedAt`/`deletedAt` timestamptz, `updatedBy`/`deletedBy` con la relación
`@ManyToOne` estándar) para toda entidad **no singleton**. Los singleton (`InstitutoInformacion`,
`IsmaInformacion`) usan un subconjunto reducido — ver §3.1.

### 3.1. `institutos_informacion` / `isma_informacion` (singleton)

Patrón nuevo en el proyecto (no existía ningún recurso "de una sola fila" hasta ahora):

- `id uuid` — **fijo**, sembrado por migración (no lo genera la app en cada request).
- Sin `isActive`/`deletedAt`/`deletedBy`/`habilitar` — no tiene sentido "borrar" un
  singleton. Solo `createdAt`, `updatedAt`, `updatedById` (nullable).
- Sin `POST` ni `DELETE` en el contrato — solo `GET` (público) y `PUT` (protegido).
- Si la fila no existe (no debería pasar tras la migración semilla), `GET` responde 404
  `{detail:"No encontrado."}` igual que cualquier otro recurso — no se auto-crea en runtime.

**`institutos_informacion`** (`InstitutoInformacion`):

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | fijo (constante en la migración semilla) |
| `name` | varchar(255) | nombre oficial a mostrar |
| `description` | text | |
| `contactEmail` | varchar(255), nullable | informativo; no se gestiona el buzón desde aquí (decisión 4) |
| `contactPhone` | varchar(20), nullable | |
| `createdAt` / `updatedAt` | timestamptz | |
| `updatedBy_id` | uuid, nullable, FK -> `usuarios_usuario` | |

**`isma_informacion`** (`IsmaInformacion`):

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | fijo |
| `introduccion` | text | orientación inicial (doc §1) |
| `documentacionNecesaria` | text | bautismo/1ª comunión/confirmación (doc §2), incluida la nota "no requiere actualización" |
| `parroquiaCorrespondiente` | text | domicilio/cuasidomicilio (doc §3) |
| `entrevistaParroco` | text | 6 meses, testigos (doc §4) |
| `programaIsma` | text | 3 meses, modalidad en línea excepcional (doc §5) |
| `tiemposAnticipacion` | text | 9/6/3 meses diferenciados (doc §6) |
| `contactoTelefono1` / `contactoTelefono2` | varchar(20), nullable | (64) 4415-1646 / (64) 4413-2098 — **el contenido real lo captura un admin**, no se hardcodea |
| `createdAt` / `updatedAt` | timestamptz | |
| `updatedBy_id` | uuid, nullable, FK | |

Los 10 casos especiales y las 8 preguntas frecuentes **no** van aquí — son colecciones
(§3.4).

### 3.2. Instituto Bíblico — recursos con lista

**`institutos_capacitacion`** (`Capacitacion` — catálogo, sin fechas):

| Columna | Tipo | Notas |
|---|---|---|
| `name` | varchar(255) | |
| `description` | text | |
| `modality` | varchar(20) | `presencial` \| `en_linea` \| `mixta`; `CHECK` de dominio igual que `documentos.type` (ADR-004 DQ2-A) |
| `isActive`, `createdAt`, `updatedAt`, `deletedAt` | — | `BaseEntity` estándar |
| `createdBy_id` / `updatedBy_id` / `deletedBy_id` | uuid, nullable, FK | patrón de auditoría estándar |

**`institutos_curso`** (`Curso` — instancia activa):

| Columna | Tipo | Notas |
|---|---|---|
| `title` | varchar(255) | |
| `description` | text | |
| `modality` | varchar(20) | mismo `CHECK` que `Capacitacion` |
| `capacitacionId` | uuid, nullable, FK -> `institutos_capacitacion` | opcional (decisión 1); `assertFksExist` si viene (patrón de `parishes.service.ts`) |
| `startDate` / `endDate` | date, nullable | formato `YYYY-MM-DD`, igual que `Parroquia.openingDate` |
| `meetingLink` | varchar(500), nullable | `@IsUrl()` en el DTO |
| `picture` | varchar(255), nullable | Cloudinary, `assertValidImage` (reutilizado tal cual) |
| `isActive` + auditoría | — | estándar |

**`institutos_sede`** (`Sede`):

| Columna | Tipo | Notas |
|---|---|---|
| `name` | varchar(255) | |
| `address` | text | |
| `mapsUrl` | varchar(500) | **enlace**, no mapa embebido (el doc dice "liga a mapas"); `@IsUrl()` |
| `picture` | varchar(255), nullable | opcional |
| `isActive` + auditoría | — | estándar |

**`institutos_evento`** (`Evento` — calendario):

| Columna | Tipo | Notas |
|---|---|---|
| `title` | varchar(255) | |
| `description` | text, nullable | |
| `type` | varchar(20) | `inscripcion` \| `curso` \| `actividad`; `CHECK` de dominio |
| `startDate` / `endDate` | date, `endDate` nullable | eventos de un día: `endDate = null` |
| `cursoId` | uuid, nullable, FK -> `institutos_curso` | |
| `sedeId` | uuid, nullable, FK -> `institutos_sede` | |
| `isActive` + auditoría | — | estándar |

### 3.3. ISMA — recursos con lista

**`isma_caso_especial`** (`CasoEspecial` — los 10 casos del documento):

| Columna | Tipo | Notas |
|---|---|---|
| `title` | varchar(255) | p. ej. "Divorciados con nulidad matrimonial" |
| `order` | int | orden de presentación (el documento ya los numera 1-10) |
| `requisitosAdicionales` | text | qué se suma a los requisitos generales |
| `documentosAdicionales` | text, nullable | |
| `excepciones` | text, nullable | qué puntos generales NO aplican (p. ej. caso de cárcel excluye el punto 4) |
| `contacto` | text, nullable | a quién contactar |
| `isActive` + auditoría | — | estándar |

**`isma_pregunta_frecuente`** (`PreguntaFrecuente` — las 8 FAQ):

| Columna | Tipo | Notas |
|---|---|---|
| `question` | text | |
| `answer` | text | contenido ya redactado en el documento — no se inventa nada nuevo al cargarlo |
| `order` | int | |
| `isActive` + auditoría | — | estándar |

### 3.4. Extensión de `usuarios_usuario` — `moduleAccess`

Único cambio a un módulo existente. **Aditivo, no rompe nada de lo que ya funciona**:

| Columna | Tipo | Notas |
|---|---|---|
| `moduleAccess` | jsonb NOT NULL DEFAULT `'[]'` | array de strings, mismo patrón que `tags` en Noticias/Artículos/Documentos |

`CHECK` de dominio (mismo mecanismo que `usuarios_usuario_role_check`, ADR-004 DQ2-A, pero
sobre un array jsonb en vez de un escalar):

```sql
ALTER TABLE "usuarios_usuario" ADD CONSTRAINT "usuarios_usuario_moduleaccess_check"
CHECK ("moduleAccess" <@ '["instituto-biblico","isma"]'::jsonb);
```

(`<@` = "está contenido en"; permite `[]`, `["isma"]`, `["instituto-biblico"]`,
`["instituto-biblico","isma"]` y rechaza cualquier otro valor a nivel BD, igual que la
app lo valida vía `@IsIn(MODULE_ACCESS_VALUES, {each:true})` en el DTO.)

`Usuario.role` **no se toca**: sigue siendo `super`/`admin`/`user`, mismo `CHECK`, mismo
`ROLE_RANK`, cero riesgo para los 10 módulos existentes.

---

## 4. Mecanismo de acceso por módulo (`moduleAccess`)

Diseño elegido tras descartar extender `Usuario.role` (ver justificación completa en la
respuesta de la Tarea 0.1: romper la jerarquía lineal `super>admin>user`, forzar un
usuario a un solo módulo a la vez, y tocar el `CHECK`/guard/DTO que ya protegen los 10
módulos actuales).

- **`admin` / `super`**: acceso total, sin cambios — ven y administran todo, Instituto
  Bíblico e ISMA incluidos.
- **`user` con `moduleAccess: ['isma']`** (o `['instituto-biblico']`, o ambos): puede
  administrar **solo** ese/esos módulo(s). No puede tocar Noticias, Parroquias, Usuarios,
  ni el otro módulo nuevo si no está en su lista.
- **`user` sin `moduleAccess`** (el caso de hoy, lista vacía por defecto): sin cambios de
  comportamiento frente al sistema actual.

**Backend — nuevo guard, independiente de `RolesGuard`:**

```ts
// src/common/auth/module-access.decorator.ts (nuevo)
export const MODULE_ACCESS_KEY = 'moduleAccess';
export const ModuleAccess = (mod: AppModuleName) =>
  SetMetadata(MODULE_ACCESS_KEY, mod);

// src/common/auth/module-access.guard.ts (nuevo)
// admin/super -> pasa siempre. user con `mod` en su moduleAccess -> pasa. Resto -> 403.
```

Se aplica **solo** en los controllers de `institute`/`isma` vía `@UseGuards(ModuleAccessGuard)`
por ruta (mismo patrón puntual que `ThrottlerGuard` en `login`/`change-password`,
Tarea 8.1 — no es un `APP_GUARD` global, así que los 10 módulos existentes no cambian).
No hace falta apilarlo con `@Roles('admin')`: la lógica interna del guard ya cubre "admin/
super siempre pasan", así que un solo `@UseGuards(ModuleAccessGuard)` + `@ModuleAccess('isma')`
basta por endpoint de escritura.

**Backend — extensión de `users`:**

- `Usuario` entity: nueva columna `moduleAccess: string[]`.
- `CreateUserDto` / `UpdateUserDto`: nuevo campo opcional `moduleAccess?: string[]`
  (`@IsOptional() @IsArray() @IsIn(MODULE_ACCESS_VALUES, {each:true})`), junto a `username`/
  `email`/`role` ya existentes.
- `UserResponse`: nuevo campo `moduleAccess: string[]`.
- `MODULE_ACCESS_VALUES = ['instituto-biblico', 'isma'] as const` exportado desde
  `usuario.entity.ts`, mismo patrón que `USER_ROLES`/`DOCUMENT_TYPES` ya existentes.

**Frontend — trabajo nuevo real** (hoy no existe ningún guard de rol, solo de sesión):

- `core/guards/`: nuevo `moduleAccessGuard` (o extender `authGuard`) que lee `user()?.role`
  y `user()?.moduleAccess` desde el servicio `Auth` y bloquea la navegación a
  `/dashboard/institute/*` o `/dashboard/isma/*` si no corresponde.
- `layouts/admin/layout/layout.ts`: el `computed()` que hoy expone `allItems` sin filtrar
  es exactamente el punto de enganche — se filtra ahí según rol/`moduleAccess`.
- `admin/users/`: nuevo control en el formulario de edición de usuario (checkboxes o
  multiselect) para asignar `moduleAccess`. Solo visible/editable por `admin`/`super`
  (igual que hoy ya se restringe la edición de `role`).
- `core/models/user.model.ts`: añadir `moduleAccess: string[]` a la interfaz `User`.

---

## 5. Matriz de contratos API

Convenciones idénticas a las de los 10 módulos actuales (ver `docs/contract-matrix.md`,
sección transversal): `/` final, camelCase, `@Public()` en lecturas, paginación
`{count,next,previous,results}`, soft-delete canónico (`DELETE`→204 sin cuerpo,
`isActive=false`+`deletedAt`+`deletedBy`, `PUT`/`DELETE` exigen fila activa,
`habilitar/{id}/` limpia `deletedAt`/`deletedBy`), `createdBy`/`updatedBy` desde
`@CurrentUser()` (nunca del body).

### Información (singleton) — Instituto Bíblico e ISMA

| Método | Ruta | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/instituto-biblico/informacion/` | `@Public()` | — | 200 `{id,name,description,contactEmail,contactPhone,updatedAt,updatedBy}` |
| PUT | `/instituto-biblico/informacion/` | `@ModuleAccess('instituto-biblico')` | JSON parcial | 200 objeto actualizado |
| GET | `/isma/informacion/` | `@Public()` | — | 200 `{id,introduccion,documentacionNecesaria,parroquiaCorrespondiente,entrevistaParroco,programaIsma,tiemposAnticipacion,contactoTelefono1,contactoTelefono2,updatedAt,updatedBy}` |
| PUT | `/isma/informacion/` | `@ModuleAccess('isma')` | JSON parcial | 200 objeto actualizado |

Sin `:id` en la URL (fila fija). Sin `POST`/`DELETE`/`habilitar`.

**Estado (Tarea 3.1): `/instituto-biblico/informacion/` implementado.** Migracion
`CreateInstitutoInformacion` (tabla nueva + fila sembrada con id fijo
`00000000-0000-0000-0000-000000000001` y el titulo del documento fuente; `description`/
contacto vacios a proposito, sin contenido institucional inventado). `ModuleAccessGuard`
en el `PUT` en vez de `@Roles('admin')`. 188 unit + 124 e2e verdes.
`/isma/informacion/` queda para FASE 6.

### Capacitaciones

| Método | Ruta | Auth | Notas |
|---|---|---|---|
| GET | `/instituto-biblico/capacitaciones/` | `@Public()` | paginado; filtros `name?`, `modality?`, `isActive?` |
| GET | `/instituto-biblico/capacitaciones/{id}/` | `@Public()` | sin filtro `isActive` (política canónica) |
| POST | `/instituto-biblico/capacitaciones/` | `@ModuleAccess('instituto-biblico')` | JSON |
| PUT | `/instituto-biblico/capacitaciones/{id}/` | idem | parcial |
| DELETE | `/instituto-biblico/capacitaciones/{id}/` | idem | 204 sin cuerpo |
| POST | `/instituto-biblico/capacitaciones/habilitar/{id}/` | idem | 200 `{detail}` |

### Cursos

| Método | Ruta | Auth | Notas |
|---|---|---|---|
| GET | `/instituto-biblico/cursos/` | `@Public()` | paginado; filtros `title?`, `modality?`, `capacitacionId?`, `isActive?` |
| GET | `/instituto-biblico/cursos/{id}/` | `@Public()` | |
| POST | `/instituto-biblico/cursos/` | `@ModuleAccess(...)` | `multipart/form-data` (`picture` opcional); `capacitacionId` validado con `assertFksExist` si viene |
| PUT | `/instituto-biblico/cursos/{id}/` | idem | parcial, `multipart` |
| DELETE / habilitar | — | idem | patrón estándar |

### Sedes

| Método | Ruta | Auth | Notas |
|---|---|---|---|
| GET | `/instituto-biblico/sedes/` | `@Public()` | paginado; filtro `name?`, `isActive?` |
| GET | `/instituto-biblico/sedes/{id}/` | `@Public()` | |
| POST / PUT | `/instituto-biblico/sedes/(:id/)` | `@ModuleAccess(...)` | `multipart` (`picture` opcional) |
| DELETE / habilitar | — | idem | patrón estándar |

### Eventos (calendario)

| Método | Ruta | Auth | Notas |
|---|---|---|---|
| GET | `/instituto-biblico/eventos/` | `@Public()` | paginado o plano (a decidir según necesite el widget de calendario — el frontend probablemente pide un rango de fechas completo sin paginar); filtros `type?`, `cursoId?`, `sedeId?`, `startDate__gte?`, `startDate__lte?` |
| GET | `/instituto-biblico/eventos/{id}/` | `@Public()` | |
| POST / PUT | `/instituto-biblico/eventos/(:id/)` | `@ModuleAccess(...)` | JSON |
| DELETE / habilitar | — | idem | patrón estándar |

### Casos especiales (ISMA)

| Método | Ruta | Auth | Notas |
|---|---|---|---|
| GET | `/isma/casos-especiales/` | `@Public()` | paginado o plano (son solo 10, probablemente plano — a decidir en FASE 7); orden por `order` |
| GET | `/isma/casos-especiales/{id}/` | `@Public()` | |
| POST / PUT | `/isma/casos-especiales/(:id/)` | `@ModuleAccess('isma')` | JSON |
| DELETE / habilitar | — | idem | patrón estándar |

### Preguntas frecuentes (ISMA)

| Método | Ruta | Auth | Notas |
|---|---|---|---|
| GET | `/isma/preguntas-frecuentes/` | `@Public()` | probablemente plano (8 filas); orden por `order` |
| GET | `/isma/preguntas-frecuentes/{id}/` | `@Public()` | |
| POST / PUT | `/isma/preguntas-frecuentes/(:id/)` | `@ModuleAccess('isma')` | JSON |
| DELETE / habilitar | — | idem | patrón estándar |

### Extensión de usuarios (existente, cambio aditivo)

| Método | Ruta | Cambio |
|---|---|---|
| POST / PUT | `/users/usuarios/(:id/)` | nuevo campo opcional `moduleAccess?: string[]` en el body |
| GET | `/users/usuarios/(:id/)` / `/users/usuarios/me/` | `UserResponse` gana `moduleAccess: string[]` |

---

## 6. Navegación

**Admin (`layouts/admin/layout/layout.ts`)** — nueva sección plegable por módulo (mismo
tipo `children` que ya usa el navbar público, no se inventa un tipo de dato nuevo):

- **Instituto Bíblico** → Información general · Capacitaciones · Cursos · Sedes · Calendario
- **ISMA** → Información general · Casos especiales · Preguntas frecuentes

Visibilidad de cada sección filtrada por `role`/`moduleAccess` (§4).

**Público** — dentro del submenu "Diócesis" ya existente (hoy sus hijos son placeholders
sin ruta real; estos serían los primeros con página real):

- `Diócesis → Instituto Bíblico` → `/diocesis/instituto-biblico`
- `Diócesis → ISMA` → `/diocesis/isma` (texto a confirmar: "ISMA" o "Preparación
  Matrimonial" — pendiente, no bloqueante)

---

## 7. Migraciones previstas (sin escribir todavía)

Todas aditivas, ninguna toca datos existentes:

1. `AddModuleAccessToUsuario` — columna `moduleAccess` + `CHECK` (§3.4).
2. `CreateInstituteSchema` — las 5 tablas de §3.1/§3.2 + FKs + seed de la fila fija de
   `institutos_informacion`.
3. `CreateIsmaSchema` — las 3 tablas de §3.1/§3.3 + FKs + seed de la fila fija de
   `isma_informacion`.

A diferencia de las migraciones de la fase de migración Django→Nest, estas son
`CREATE TABLE` normales — sin el paso de "Caso A / Caso B" (no hay esquema previo de
Django que respetar) y sin reconciliar nombres de constraint contra nada externo.

---

## 8. Roadmap (revisión)

Sin cambios de fondo respecto al propuesto en la Tarea 0.1, ahora con el detalle de este
documento como base:

- **FASE 1 — Decisiones + contrato.** ✅ Este documento.
- **FASE 2 — Infraestructura compartida.** Spike de librería de calendario (decisión 2,
  validar contra Angular 21 zoneless antes de comprometerla) + `ModuleAccessGuard`/
  decorator + migración `AddModuleAccessToUsuario` + extensión de `users` (DTOs,
  response, formulario de edición).
- **FASE 3 — Instituto Bíblico: información general.** Backend (`information`) +
  página pública + pantalla admin.
- **FASE 4 — Instituto Bíblico: capacitaciones y cursos.** Backend (`trainings`,
  `courses`) + público + admin.
- **FASE 5 — Instituto Bíblico: sedes + calendario + integración con Noticias.**
  Backend (`venues`, `events`) + frontend (incluye el widget de calendario) + activar
  tag `instituto-biblico` en Noticias (sin cambios de backend, ver hallazgo original).
- **FASE 6 — ISMA: información general.** Backend (`information`) + página pública
  organizada por secciones.
- **FASE 7 — ISMA: casos especiales y preguntas frecuentes.** Backend (`special-cases`,
  `faq`) + frontend (acordeón nuevo) + admin.
- **FASE 8 — Integración final.** Navegación definitiva, filtro de `moduleAccess` en el
  sidebar admin, verificación cruzada de que nada existente sufrió regresión.

---

## Siguiente tarea propuesta

**Tarea 2.1 — Spike de calendario + `ModuleAccessGuard`.**

Dos piezas de infraestructura que bloquean todo lo demás si no se resuelven primero:
validar que la librería de calendario elegida funciona limpio en Angular 21 zoneless
(decisión 2), y construir el guard/decorator/migración de `moduleAccess` (decisión 6,
la pieza de más riesgo de todo el diseño). Sin esto, ningún módulo de contenido nuevo
tiene dónde apoyarse en materia de permisos, y el calendario de FASE 5 se diseñaría a
ciegas.

**No la implemento todavía** — quedo a la espera de tu autorización para empezarla,
como en cada tarea de la migración.

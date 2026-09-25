<h1 align="center">Diócesis Backend (NestJS)</h1>

<p align="center">
  API de la Diócesis de Ciudad Obregón construida con <a href="https://nestjs.com/" target="_blank">NestJS 11</a>, TypeORM y PostgreSQL. Reemplazo progresivo del backend Django en producción, manteniendo compatible el contrato HTTP que consume el frontend Angular.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/TypeORM-FE0803?style=for-the-badge&logo=typeorm&logoColor=white" alt="TypeORM" />
</p>

---

## 📋 Descripción

`diocesis-backend-nest` reimplementa **módulo a módulo** (_vertical slices_) el backend en producción (`diocesis-backend-python`, Django + DRF) sin romper el comportamiento observable por el frontend (`diocesis-frontend-material`): mismo método, misma URL, mismos parámetros, misma forma de respuesta y mismos códigos de estado, salvo diferencias intencionales — siempre documentadas en [`docs/contract-matrix.md`](docs/contract-matrix.md).

Sobre esa base migrada, una segunda etapa añadió los módulos nuevos **Instituto Bíblico** e **ISMA** (sin contraparte en Django), con un mecanismo propio de permisos por módulo (`moduleAccess`).

> **Estado actual**
> - Los 10 módulos migrados de Django (auth, usuarios, catálogos, padres, carrusel, parroquias, noticias, artículos, documentos) tienen paridad de contrato verificada.
> - La etapa **Instituto Bíblico / ISMA** está completa (FASE 1-8) y mergeada a `dev`.
> - El corte real a producción (Render) es un procedimiento manual documentado y **aún sin ejecutar**: ver [`docs/cutover-runbook.md`](docs/cutover-runbook.md).
> - `main` no se promueve hasta que se pruebe y apruebe el conjunto completo en `dev`.

### ✨ Características principales

- 🔐 Autenticación JWT propia (HS256), con verificación de hashes PBKDF2 heredados de Django y migración progresiva a `argon2id` en el primer login
- 👥 Roles jerárquicos `super` > `admin` > `user` (`@Roles()` / `RolesGuard`)
- 🧩 **Permisos por módulo** (`moduleAccess`): un `user` puede administrar solo Instituto Bíblico y/o ISMA sin ser admin general (`@ModuleAccess()` / `ModuleAccessGuard`)
- 🗄️ TypeORM + PostgreSQL con `synchronize: false` y migraciones **aditivas** sobre el esquema de producción
- ♻️ Convención común de _soft-delete_ (`isActive`, `deletedAt`, `deletedBy`, endpoint `habilitar`), `DELETE` → `204` sin cuerpo
- ☁️ Subida de imágenes/vídeos/documentos a Cloudinary con validación por _magic bytes_
- 🛡️ Rate limiting solo en endpoints sensibles de auth (login, cambio/reset de contraseña) → `429`
- 🧪 Tests unitarios y e2e (Jest) más un arnés de **paridad** que compara respuestas NestJS vs. Django byte a byte sobre el mismo oráculo
- 📝 Logging estructurado con `nestjs-pino`, filtro global de errores con forma de respuesta compatible con DRF

## 📑 Tabla de contenidos

- [Ecosistema](#-ecosistema)
- [Requisitos](#-requisitos)
- [Puesta en marcha](#-puesta-en-marcha)
- [Variables de entorno](#-variables-de-entorno)
- [Scripts](#-scripts)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Módulos y API](#-módulos-y-api)
- [Permisos: roles y `moduleAccess`](#-permisos-roles-y-moduleaccess)
- [Base de datos y migraciones](#-base-de-datos-y-migraciones)
- [Testing](#-testing)
- [Flujo de trabajo Git](#-flujo-de-trabajo-git)
- [Despliegue](#-despliegue)
- [Documentación](#-documentación)
- [Decisiones de arquitectura](#-decisiones-de-arquitectura)

## 🌐 Ecosistema

```text
diocesis-ecosystem/
├── diocesis-backend-python     Django + DRF. Backend en producción hoy. No se modifica.
├── diocesis-frontend-material  Angular 21 SPA. Consumidor del API.
└── diocesis-backend-nest       Este proyecto. Reemplazo del backend.
```

Django permanece intacto y se usa como **oráculo de paridad**: una copia de sus datos reales corre en un contenedor aparte ([`docs/oracle/`](docs/oracle/README.md), PostgreSQL en el puerto `5433`) contra la que se ejercen los tests e2e y el arnés de paridad.

## 🧰 Requisitos

- **Node.js 24** (`engines: >=24 <25`, ver `.nvmrc`; `nvm use`).
- **PostgreSQL**: para desarrollo local sirve el mismo contenedor oráculo (`docs/oracle/docker-compose.yml`) u otra instancia propia.
- **Docker Desktop** para levantar el oráculo (necesario para `test:e2e`, `parity` y `migration:generate`).
- Cuenta de **Cloudinary**. Sin credenciales, las subidas de archivo responden `503`; el resto de la API funciona.

## 🚀 Puesta en marcha

```bash
npm install
cp .env.example .env        # rellenar con valores reales; .env nunca se versiona
npm run start:dev           # http://localhost:3000/api  (watch mode)
```

Con una base de datos **vacía**, aplica el esquema:

```bash
npm run migration:run
```

Si la base **ya tiene** el esquema (p. ej. una copia de producción), sigue el procedimiento "Caso A" de [`docs/db/migrations.md`](docs/db/migrations.md) en vez de `migration:run` directo.

Todas las rutas cuelgan de `/api`. El health check está en `/health` (fuera del prefijo).

## 🔧 Variables de entorno

Copia `.env.example` a `.env`. `NODE_ENV=test` carga `.env.test`, que apunta al oráculo.

| Variable | Descripción |
| --- | --- |
| `NODE_ENV` | Modo del framework. `production` activa `trust proxy` y las carpetas de Cloudinary sin prefijo de entorno. |
| `PORT` | Puerto local. En Render lo inyecta el host. |
| `DATABASE_URL` | `postgresql://user:pass@host:puerto/db`. |
| `DATABASE_SSL` | `true` para Postgres gestionado; normalmente `false` en local. |
| `JWT_SECRET` | Secreto de firma HS256 ([ADR-002](docs/adr/002-autenticacion.md)). |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Vida de los tokens (Django: access 8h, refresh 1d). |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Credenciales de Cloudinary. |
| `CORS_ORIGINS` | _Allowlist_ de orígenes del frontend, separados por coma (p. ej. `http://localhost:4200`). |
| `LOG_LEVEL` | `fatal\|error\|warn\|info\|debug\|trace\|silent` (por defecto `info`). |
| `THROTTLE_AUTH_LIMIT` / `THROTTLE_AUTH_TTL_MS` | Rate limit de los endpoints sensibles de auth (exceso → `429`). |

> ⚠️ Nunca subas `.env` ni reutilices `JWT_SECRET` entre ambientes.

## ⚡ Scripts

| Script | Qué hace |
| --- | --- |
| `npm run start:dev` | Arranca en watch mode. |
| `npm run build` / `npm run start:prod` | Compila a `dist/` y arranca la build compilada. |
| `npm run lint` / `lint:fix` | ESLint (flat config) sobre `src/` y `test/`. |
| `npm run format` | Prettier sobre `src/` y `test/`. |
| `npm test` / `test:cov` / `test:watch` | Tests unitarios (Jest). |
| `npm run test:e2e` | Tests end-to-end contra el oráculo. |
| `npm run parity` | Arnés de paridad NestJS vs. Django. |
| `npm run migration:show` / `run` / `revert` / `create` / `generate` | Migraciones TypeORM. |

Los comandos de migración y e2e que deben apuntar al oráculo se ejecutan con `NODE_ENV=test` (PowerShell: `$env:NODE_ENV="test"; npm run migration:run`).

## 📁 Estructura del proyecto

Cada recurso es una _vertical slice_ independiente: `entities/`, `dto/`, `*.response.ts`, `*.service.ts`, `*.controller.ts`, `*.module.ts` y su `*.spec.ts`.

```text
src/
├── main.ts / app.module.ts / app.setup.ts   # Arranque, prefijo /api, pipes/filtros globales, CORS
├── common/                                   # Código compartido
│   ├── decorators/                           # @Public, @Roles, @ModuleAccess, @CurrentUser
│   ├── entities/base.entity.ts               # BaseEntity (id uuid, isActive, auditoría)
│   ├── files/                                # Validación de imágenes por magic bytes
│   ├── filters/ interceptors/ pipes/         # Errores estilo DRF, uuidParam, etc.
│   ├── pagination/                           # PaginationQueryDto (page, page_size ≤ 100)
│   └── soft-delete/ catalog/ content/        # Bases reutilizables
├── config/ database/ health/ integrations/   # Config, DataSource + migraciones, /health, Cloudinary
└── modules/
    ├── auth/ users/                          # Login, refresh, guards (Roles, ModuleAccess), usuarios
    ├── decanates/ colonies/ reverends/       # Catálogos y padres
    ├── parishes/ carousel/                   # Parroquias, carrusel
    ├── news/ articles/ documents/            # Contenido con tags
    ├── institute/                            # ── Instituto Bíblico (etapa nueva) ──
    │   ├── information/  trainings/  courses/  venues/  events/
    │   └── institute.module.ts               # Orquestador (lo único que importa AppModule)
    └── isma/                                 # ── ISMA (etapa nueva) ──
        ├── information/  special-cases/  faq/
        └── isma.module.ts                    # Orquestador
test/                                         # e2e (*.e2e-spec.ts), helpers y arnés de paridad
docs/                                         # ADR, contrato, hallazgos, BD, oráculo, runbook
```

Los módulos nuevos se agrupan por dominio bajo `institute/` e `isma/`: evolución aditiva de [ADR-003](docs/adr/003-estructura-modular.md) que evita 8 imports sueltos en `AppModule`.

## 🧩 Módulos y API

**Módulos migrados de Django** (paridad de contrato, ver [`docs/contract-matrix.md`](docs/contract-matrix.md)): `/token/login/`, `/users/usuarios/`, `/decanatos/`, `/colonias/`, `/padres/`, `/carrusel/`, `/parroquias/`, `/noticias/`, `/articulos/`, `/documentos/`.

**Módulos nuevos** — lectura pública (`@Public()`), escritura protegida por `ModuleAccessGuard`:

| Recurso | Ruta | Escritura requiere | Notas |
| --- | --- | --- | --- |
| Información (singleton) | `/instituto-biblico/informacion/` | `instituto-biblico` | Solo `GET`/`PUT`, sin `:id`; fila sembrada por migración. |
| Capacitaciones | `/instituto-biblico/capacitaciones/` | `instituto-biblico` | Catálogo sin fechas (`presencial\|en_linea\|mixta`). |
| Cursos | `/instituto-biblico/cursos/` | `instituto-biblico` | FK opcional a capacitación, foto, enlace de videoconferencia. |
| Sedes | `/instituto-biblico/sedes/` | `instituto-biblico` | `mapsUrl` es un **enlace**, no un mapa embebido. |
| Eventos (calendario) | `/instituto-biblico/eventos/` | `instituto-biblico` | Filtros `startDate__gte/lte`, `type`, `cursoId`, `sedeId`. |
| Información (singleton) | `/isma/informacion/` | `isma` | Contenido narrativo por secciones + 2 teléfonos. |
| Casos especiales | `/isma/casos-especiales/` | `isma` | Ordenados por `order`. |
| Preguntas frecuentes | `/isma/preguntas-frecuentes/` | `isma` | Ordenadas por `order`. |

Convenciones comunes de los recursos con lista: `GET /` paginado (`{count, next, previous, results}`, `page`/`page_size`), `GET /:id/` (incluye inactivos), `POST /`, `PUT /:id/` (parcial), `DELETE /:id/` → `204` (soft-delete) y `POST /habilitar/:id/`. Los formularios con imagen usan `multipart/form-data` (`picture`).

> Las migraciones **no siembran contenido institucional**: los textos reales (incluidos teléfonos y los 10 casos / 8 preguntas de ISMA) los captura un admin desde el panel.

Diseño completo, modelo de datos y contrato: [`docs/instituto-biblico-isma.md`](docs/instituto-biblico-isma.md).

## 🔑 Permisos: roles y `moduleAccess`

| Mecanismo | Uso | Cómo funciona |
| --- | --- | --- |
| `@Roles('admin')` + `RolesGuard` | Los 10 módulos migrados | Jerarquía `super` > `admin` > `user` (`ROLE_RANK`). |
| `@ModuleAccess('isma')` + `ModuleAccessGuard` | Módulos `institute/*` e `isma/*` | `admin`/`super` siempre pasan; un `user` pasa solo si su `moduleAccess` incluye el módulo. |

- `moduleAccess` es un `jsonb` en `usuarios_usuario` (`DEFAULT '[]'`) restringido por `CHECK` a `["instituto-biblico","isma"]`.
- **No** es un rol nuevo: no toca `ROLE_RANK` ni el `CHECK` de `role`. Se gestiona desde `POST/PUT /users/usuarios/` (`moduleAccess?: string[]`).
- `ModuleAccessGuard` se aplica **por ruta** (`@UseGuards(ModuleAccessGuard)`), no como `APP_GUARD` global.

## 🗄️ Base de datos y migraciones

`synchronize: false` siempre: NestJS nunca crea ni aplica esquema al arrancar. El esquema base es el de producción tal cual (lo creó Django) y las migraciones de TypeORM son **aditivas** desde ahí.

| Migración | Contenido |
| --- | --- |
| `BaselineProductionSchema` | Esquema de producción (no-op salvo BD vacía). |
| `CarruselBasemodelFields` | Campos de `BaseModel` en `carrusel`. |
| `CheckTypeRoleDomain` | `CHECK` de dominio en `documentos.type` y `usuarios.role`. |
| `AddModuleAccessToUsuario` | Columna `moduleAccess` + `CHECK`. |
| `CreateInstitutoInformacion` / `CreateIsmaInformacion` | Singletons con fila sembrada vacía. |
| `CreateCapacitacionCurso` / `CreateSedeEvento` / `CreateCasoEspecialPreguntaFrecuente` | Tablas nuevas de las colecciones. |

Procedimiento operativo (Caso A/B del baseline, ruido `*_like` tolerado de `migration:generate`, convenciones para tablas nuevas): [`docs/db/migrations.md`](docs/db/migrations.md) y [ADR-004](docs/adr/004-migracion-db.md).

**Flujo para una migración nueva**

```bash
# 1. Con el oráculo arriba y entidades modificadas
NODE_ENV=test npm run migration:generate -- src/database/migrations/<Nombre>
# 2. Revisar el archivo: quitar el DROP/CREATE INDEX "*_like" de usuarios_usuario (ruido tolerado)
# 3. Aplicar y verificar que un nuevo generate solo propone ese ruido
NODE_ENV=test npm run migration:run
```

## 🧪 Testing

```bash
docker compose -f docs/oracle/docker-compose.yml up -d   # oráculo (solo e2e / parity / migraciones)
npm test                                                  # unitarios, sin dependencias externas
NODE_ENV=test npm run test:e2e                            # e2e contra PostgreSQL real (:5433)
npm run parity                                            # NestJS vs. Django sobre el oráculo
```

- Unitarios: mockean repositorios y servicios (`jest.fn()`).
- E2E: levantan `AppModule` completo, siembran usuarios con `test/helpers/seed-user.ts` y limpian lo que crean.
- Cada recurso nuevo debe traer: `*.service.spec.ts` y `test/<recurso>.e2e-spec.ts` (401 sin token, 403 sin permiso, 201/200 con `moduleAccess`, soft-delete y `habilitar`).

## 🔀 Flujo de trabajo Git

- **`dev`** es la rama de integración. **`main` no se toca ni se sube** hasta que se pruebe y apruebe el conjunto en `dev` y se pida explícitamente la promoción.
- **Una rama por fase/cambio** que parte de `dev` (`feat/*`, `fix/*`, `chore/*`, `test/*`, `docs/*`).
- Cada rama pasa su propio gate verde (`build` + `lint` + `test` + `test:e2e`) antes del PR.
- PR contra `dev` (`gh pr create --base dev`), merge, y borrar la rama local y remota.
- Commits en [Conventional Commits](https://www.conventionalcommits.org/) con scope de módulo: `feat(isma): ...`, `test(users): ...`, `docs(...)`.
- Tareas **pequeñas, verificables y reversibles**; una sola cosa por commit.

```bash
git checkout dev && git pull origin dev
git checkout -b feat/mi-cambio
# ... trabajar, correr el gate, commit ...
git push -u origin feat/mi-cambio
gh pr create --base dev --head feat/mi-cambio
```

## 🚀 Despliegue

[`render.yaml`](render.yaml) describe el servicio Render (`npm ci && npm run build`, `npm run start:prod`, `healthCheckPath: /health`, variables de entorno). El procedimiento completo del corte — rotación de secretos, alta del servicio, migraciones contra producción, corte de autenticación, cambio del frontend, smoke test y rollback — está en [`docs/cutover-runbook.md`](docs/cutover-runbook.md).

## 📚 Documentación

| Documento | Contenido |
| --- | --- |
| [`docs/instituto-biblico-isma.md`](docs/instituto-biblico-isma.md) | Diseño, modelo de datos, contrato API y roadmap de Instituto Bíblico e ISMA. |
| [`docs/contract-matrix.md`](docs/contract-matrix.md) | Compatibilidad frontend ↔ backend por endpoint, deltas intencionales y restricciones. |
| [`docs/endpoints-inventory.md`](docs/endpoints-inventory.md) | Endpoints de Django y cuáles consume el frontend. |
| [`docs/findings.md`](docs/findings.md) | Hallazgos de auditoría (`BUG-DJANGO-*`, `SECRET-*`, seguridad) y su resolución. |
| [`docs/db/`](docs/db/migrations.md) | Esquema de referencia, notas de BD y gestión de migraciones. |
| [`docs/oracle/`](docs/oracle/README.md) | Cómo levantar el oráculo de paridad. |
| [`docs/cutover-runbook.md`](docs/cutover-runbook.md) | Procedimiento del corte a producción. |
| [`docs/adr/`](docs/adr/README.md) | Registros de decisiones de arquitectura. |

## 🏛️ Decisiones de arquitectura

- **[ADR-001](docs/adr/001-orm.md)** ORM: **TypeORM**, `synchronize: false`.
- **[ADR-002](docs/adr/002-autenticacion.md)** Autenticación: JWT propio HS256, corte duro de tokens, verificar hashes PBKDF2 heredados + migración progresiva a `argon2id`.
- **[ADR-003](docs/adr/003-estructura-modular.md)** Estructura: monolito modular NestJS (sin hexagonal/CQRS).
- **[ADR-004](docs/adr/004-migracion-db.md)** Base de datos: migración _baseline_ sin recrear el esquema; `CHECK` y campos nuevos como migraciones aditivas.

### Anotado para revisar más adelante

- Método HTTP `QUERY` / `@Search()` de NestJS para listados: **fuera de alcance** en la migración (rompería el contrato actual y depende de un borrador IETF). Posible mejora posterior con su propio ADR y cambio coordinado en el frontend.

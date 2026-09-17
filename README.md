# diocesis-backend-nest

Reimplementación progresiva en **NestJS 11** del backend en producción
(`diocesis-backend-python`, Django + DRF), manteniendo **compatible el contrato HTTP**
que consume el frontend Angular (`diocesis-frontend-material`): mismo método, misma URL,
mismos parámetros, misma forma de respuesta y mismos códigos de estado, salvo
diferencias intencionales — siempre documentadas en `docs/contract-matrix.md`.

> **Estado actual: FASE 9 — preparación del corte a producción.**
> Los 10 módulos de la API (auth, usuarios, catálogos, padres, carrusel, parroquias,
> noticias, artículos, documentos) están migrados y con paridad de contrato verificada.
> El corte real a producción (Render) es un procedimiento manual, documentado y **aún
> sin ejecutar**: ver `docs/cutover-runbook.md`.

## Objetivo

Reconstruir el backend módulo a módulo (_vertical slices_), corrigiendo los problemas
detectados en la auditoría (`docs/findings.md`), **sin romper el comportamiento
observable** por el frontend.

## Ecosistema

```text
diocesis-ecosystem/
├── diocesis-backend-python     Django + DRF. Backend en producción hoy. No se modifica.
├── diocesis-frontend-material  Angular 21 SPA. Consumidor del API. No se modifica (salvo tareas propias).
└── diocesis-backend-nest       Este proyecto. Reemplazo del backend.
```

Django permanece intacto durante toda la migración y se usa como **oráculo de
paridad**: una copia de sus datos reales corre en un contenedor aparte (`docs/oracle/`)
contra la que se ejercen los tests e2e y el arnés de paridad.

## Stack

NestJS 11 · TypeScript 5.9 · TypeORM 0.3 (`synchronize: false`, sin migraciones
automáticas al arrancar) · PostgreSQL · Cloudinary (archivos) · `@nestjs/jwt` +
`passport-jwt` (HS256) · `argon2` (hashing de contraseñas) · `@nestjs/throttler`
(rate limiting) · `nestjs-pino` (logging) · Jest 30 (unit + e2e) · ESLint 10 flat +
`typescript-eslint`.

## Requisitos

- **Node.js 24** (ver `.nvmrc` / `engines` en `package.json`; `nvm use`).
- **PostgreSQL** — para desarrollo local puedes usar el mismo contenedor oráculo
  (`docs/oracle/docker-compose.yml`) u otra instancia propia.
- Cuenta de **Cloudinary** (almacenamiento de imágenes, vídeos y documentos). Sin
  credenciales, las subidas de archivo devuelven 503 (el resto de la API funciona).

## Puesta en marcha

```powershell
npm install
Copy-Item .env.example .env    # rellenar con valores reales; .env nunca se versiona
npm run start:dev              # http://localhost:3000/api  (watch mode)
```

La primera vez, con una base de datos vacía, aplica el esquema:

```powershell
npm run migration:run
```

Si la base de datos **ya tiene** el esquema (p. ej. una copia de producción), sigue el
procedimiento "Caso A" de `docs/db/migrations.md` en vez de `migration:run` directo.

## Scripts principales

| Script | Qué hace |
| --- | --- |
| `npm run start:dev` | Arranca en watch mode. |
| `npm run build` / `npm run start:prod` | Compila a `dist/` y arranca la build compilada. |
| `npm run lint` / `npm run lint:fix` | ESLint sobre `src/` y `test/`. |
| `npm test` / `npm run test:cov` | Tests unitarios (Jest). |
| `npm run test:e2e` | Tests end-to-end contra el oráculo (`docker compose -f docs/oracle/docker-compose.yml up -d` primero). |
| `npm run parity` | Arnés de paridad: compara respuestas reales NestJS vs. Django sobre el oráculo. |
| `npm run migration:show` / `:run` / `:revert` / `:create` / `:generate` | Gestión de migraciones TypeORM (ver `docs/db/migrations.md`). |

## Testing

- **Unitario** (`npm test`): sin dependencias externas, mockea repositorios/servicios.
- **E2E** (`npm run test:e2e`): contra PostgreSQL real (el oráculo, puerto `5433`).
  Arrancar el contenedor primero:

  ```powershell
  docker compose -f docs/oracle/docker-compose.yml up -d
  npm run test:e2e
  ```

- **Paridad** (`npm run parity`, `test/parity/`): compara byte a byte las respuestas de
  NestJS contra Django real para un catálogo de casos, sobre el mismo oráculo.

## Base de datos y migraciones

`synchronize: false` siempre — NestJS nunca genera ni aplica esquema por su cuenta al
arrancar. El esquema base es el de producción tal cual (Django lo creó); las migraciones
de TypeORM son **aditivas** a partir de ahí. Detalle completo, incluidas las 3
migraciones existentes y el ruido cosmético tolerado (`migration:generate`), en
`docs/db/migrations.md` y en **ADR-004**.

## Despliegue

`render.yaml` describe el servicio Render (Node, `healthCheckPath: /health`, variables
de entorno). El procedimiento completo del corte a producción — rotación de secretos
pendientes, alta del servicio, migraciones contra producción, corte de autenticación,
cambio del frontend, smoke test y rollback — está en **`docs/cutover-runbook.md`**.

## Documentación

| Documento | Contenido |
| --- | --- |
| `docs/endpoints-inventory.md` | Inventario de endpoints de Django y cuáles consume el frontend. |
| `docs/contract-matrix.md` | Matriz de compatibilidad frontend ↔ backend (request/response por endpoint, deltas intencionales, restricciones que no se pueden romper). |
| `docs/findings.md` | Hallazgos de la auditoría (`BUG-DJANGO-*`, `SECRET-*`, seguridad, arquitectura...) y su resolución. |
| `docs/db/` | Esquema de referencia, notas de la BD, gestión de migraciones. |
| `docs/oracle/` | Cómo levantar el oráculo de paridad (copia de Django + datos reales). |
| `docs/cutover-runbook.md` | Procedimiento del corte a producción. |
| `docs/adr/` | Registros de decisiones de arquitectura (ADR). |

## Decisiones de arquitectura

- **[ADR-001](docs/adr/001-orm.md)** ORM: **TypeORM**, `synchronize: false`.
- **[ADR-002](docs/adr/002-autenticacion.md)** Autenticación: JWT propio HS256, corte
  duro de tokens, verificar hashes PBKDF2 heredados + migración progresiva a `argon2id`
  con parámetros explícitos.
- **[ADR-003](docs/adr/003-estructura-modular.md)** Estructura: monolito modular NestJS
  (sin hexagonal/CQRS).
- **[ADR-004](docs/adr/004-migracion-db.md)** Base de datos: migración _baseline_ sin
  recrear el esquema; FKs como en prod; `CHECK` de `type`/`role` y alineación de
  `carrusel` como migraciones aditivas.

## Método de trabajo

- Avance en **tareas pequeñas, verificables y reversibles**; una sola cosa por commit.
- Rama principal: `main`. Ramas de trabajo por tarea: `feat/*`, `fix/*`, `chore/*`,
  `test/*`, `docs/*` — cada una con su propio gate verde (build + lint + tests) antes de
  fusionar.
- Convención de commits: Conventional Commits con scope de módulo
  (`feat(auth): ...`, `test(users): ...`).

### Anotado para revisar más adelante

- Método HTTP `QUERY` / `@Search()` de NestJS para endpoints de listado: **fuera de
  alcance** en la migración (rompería el contrato actual y depende de un borrador IETF).
  Posible mejora post-migración con su propio ADR y cambio coordinado en el frontend.

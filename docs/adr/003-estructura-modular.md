# ADR-003 — Estructura del proyecto NestJS

**Estado:** aceptado (Tarea 0.4)

## Contexto

- Proyecto pequeno-mediano: 10 recursos, CRUD + soft-delete + `habilitar` + subida de
  archivos a Cloudinary + JWT. Sin colas, sin tiempo real, sin tareas programadas
  (confirmado en la auditoria).
- El Django actual tiene ~80 % de codigo duplicado entre modulos (cada `APIView`
  reimplementa CRUD + paginacion + permisos + soft-delete + Cloudinary).
- Objetivo: mantenibilidad y baja duplicacion **sin sobreingenieria**.

## Decision

**Monolito modular NestJS estandar** con capa de servicio y, donde aporte, repositorio.

```
src/
├── main.ts                # setGlobalPrefix('api'), ValidationPipe global, filtro global, CORS
├── app.module.ts
├── config/                # ConfigModule + validacion de env al arrancar
├── common/
│   ├── entities/base.entity.ts   # id, isActive, createdAt, updatedAt, deletedAt, updatedBy, deletedBy
│   ├── decorators/               # @CurrentUser, @Roles, @Public
│   ├── guards/                   # JwtAuthGuard, RolesGuard
│   ├── filters/                  # AllExceptionsFilter (formas de error compatibles)
│   ├── interceptors/             # logging + request-id
│   ├── pagination/               # helper estilo DRF ({count,next,previous,results})
│   └── soft-delete/              # servicio/mixin de borrado logico canonico
├── database/
│   ├── database.module.ts        # TypeORM, synchronize:false
│   └── migrations/
├── integrations/cloudinary/      # CloudinaryModule + service (config unica)
├── modules/
│   ├── auth/  users/  carousel/  reverends/  decanates/
│   ├── colonies/  parishes/  news/  articles/  documents/
└── health/                       # GET /health (fuera de /api)
```

Cada modulo: `*.module.ts`, `*.controller.ts` (fino, sin logica), `*.service.ts` (reglas
de negocio), `dto/` (`create`/`update`/`query`), `entities/`, opcional `*.repository.ts`.

Reglas transversales:

- Rutas y verbos **identicos a Django**, con `/` final. Carpetas de modulo en ingles;
  **rutas, campos y payloads permanecen en espanol/camelCase como hoy**.
- `ValidationPipe` global `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`
  -> cierra el mass-assignment (BUG-DJANGO-007).
- Filtro de excepciones global -> `{detail}` / `{campo:[...]}`, status codes correctos
  (403 sigue siendo 403; el interceptor del FE reacciona a 401/403).
- Nada de acceso a DB desde controllers; nada de `any`; nada de logica de negocio en
  controllers.

## Alternativas consideradas

- **Clean Architecture / Hexagonal.** Capas de mapeo sin beneficio real a este tamano.
- **CQRS (`@nestjs/cqrs`).** No hay asimetria lectura/escritura ni proyecciones que lo
  justifiquen.
- **Carpeta por caso de uso.** Multiplica archivos para CRUD homogeneo; un `service` por
  modulo con metodos claros es suficiente.
- Patrones puntuales (repository, value object, un use-case aislado) se permiten **donde
  un modulo lo pida**, no como norma global.

## Consecuencias

- (+) Estructura predecible, curva de entrada baja.
- (+) La logica repetida de Django (paginacion, soft-delete, permisos, Cloudinary) se
  factoriza una sola vez en `common/` e `integrations/`.
- (+) Vertical slices: cada modulo se migra y prueba de punta a punta antes de pasar al
  siguiente.
- (-) Riesgo de que `common/` se convierta en cajon de sastre -> cada helper con
  responsabilidad unica.
- (-) El `service` de usuarios puede crecer (mas reglas) -> partir en submetodos o
  servicios auxiliares si pasa de ~200 lineas.

# diocesis-backend-nest

Reimplementación progresiva en **NestJS** del backend actualmente en producción
(`diocesis-backend-python`, Django + DRF), manteniendo compatible el contrato HTTP
que consume el frontend Angular (`diocesis-frontend-material`).

> **Estado actual: FASE 0 — Auditoría y preparación.**
> Todavía NO hay NestJS instalado, ni `package.json`, ni dependencias, ni base de
> datos conectada. No hay comandos de ejecución: se añadirán en la Tarea 0.5 (scaffold).

## Objetivo

Reconstruir el backend módulo a módulo (_vertical slices_), corrigiendo los problemas
detectados en la auditoría, **sin romper el comportamiento observable** por el frontend:
mismo método HTTP, misma URL, mismos parámetros, misma forma de respuesta y mismos
códigos de estado, salvo diferencias intencionales documentadas.

## Ecosistema

```text
diocesis-ecosystem/
├── diocesis-backend-python     Django + DRF. FUENTE DE REFERENCIA. No se modifica.
├── diocesis-frontend-material  Angular 21 SPA. Consumidor del API. No se modifica (salvo tareas propias).
└── diocesis-backend-nest       Este proyecto. Reemplazo futuro del backend.
```

Django permanece intacto durante toda la migración y se usa como oráculo de paridad.

## Requisitos

- **Node.js 24** (Active LTS). Ver `.nvmrc` (`nvm use`).
- **PostgreSQL** (motor de la base de datos de producción).
- Cuenta de **Cloudinary** (almacenamiento de imágenes, vídeos y documentos).

## Configuración

1. Copiar `.env.example` a `.env`:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Rellenar `.env` con los valores reales.
   **`.env` nunca se versiona** (lo ignora `.gitignore`); solo se versiona `.env.example`.

## Método de trabajo

- Avance en **tareas pequeñas, verificables y reversibles**; una sola cosa por commit.
- **Git exclusivamente local**: sin `origin`, sin `push`, sin Pull Requests.
  - Rama principal: `main`.
  - Ramas de trabajo: `feat/*`, `fix/*`, `chore/*`, `test/*`, `docs/*`.
- Convención de commits: Conventional Commits con scope de módulo
  (`feat(auth): ...`, `test(users): ...`).

## Documentación

| Documento                     | Contenido                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `docs/endpoints-inventory.md` | Inventario de endpoints de Django y cuáles consume el frontend.                     |
| `docs/contract-matrix.md`     | Matriz de compatibilidad frontend ↔ backend (request/response por endpoint).        |
| `docs/findings.md`            | Hallazgos de la auditoría (`BUG-DJANGO-*`, `SECRET-*`, seguridad, arquitectura...). |
| `docs/adr/`                   | Registros de decisiones de arquitectura (ADR).                                      |

## Decisiones tomadas (pendientes de redactar como ADR)

- **ADR-001** ORM: **TypeORM** (esquema PostgreSQL existente, `synchronize: false`).
- **ADR-002** Autenticación: JWT compatible con simplejwt + verificación de hashes PBKDF2 de Django.
- **ADR-003** Estructura: monolito modular NestJS (sin hexagonal/CQRS completos).
- **ADR-004** Base de datos: migración _baseline_ por introspección; no se recrea el esquema.

### Anotado para revisar más adelante

- Método HTTP `QUERY` / `@Search()` de NestJS para endpoints de listado: **fuera de
  alcance** en la migración (rompería el contrato actual y depende de un borrador IETF).
  Posible mejora post-migración con su propio ADR y cambio coordinado en el frontend.

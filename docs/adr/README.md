# Registros de decisiones de arquitectura (ADR)

Un ADR documenta una decision de arquitectura relevante y su contexto, para que
mas adelante se entienda **por que** se hizo asi.

## Formato de cada ADR

Archivo `NNN-titulo-en-kebab-case.md` con estas secciones:

- **Estado**: propuesto / aceptado / reemplazado por ADR-XXX / obsoleto.
- **Contexto**: situacion y fuerzas en juego.
- **Decision**: que se decide.
- **Alternativas consideradas**: opciones descartadas y por que.
- **Consecuencias**: efectos positivos y negativos, deuda que se asume.

## Indice

| ADR | Titulo | Estado |
|---|---|---|
| [001](001-orm.md) | Seleccion de ORM (TypeORM) | aceptado (0.4) |
| [002](002-autenticacion.md) | Autenticacion y autorizacion (JWT propio HS256, corte duro de tokens, verificar PBKDF2 heredado + migracion a argon2id) | aceptado (0.4) |
| [003](003-estructura-modular.md) | Estructura del proyecto NestJS (monolito modular) | aceptado (0.4) |
| [004](004-migracion-db.md) | Migracion de la base de datos (baseline sin recrear esquema; FKs como prod; CHECK y carrusel como migraciones aditivas) | aceptado (0.4) |

## Temas anotados para revisar mas adelante (aun no son ADR)

- **Metodo HTTP QUERY / @Search() de NestJS para endpoints de listado.**
  Fuera de alcance en la migracion: rompe el contrato actual (el frontend usa
  `GET /recurso/?params` en todos los listados) y depende de un borrador IETF que
  intermediarios (proxies, CDN) pueden rechazar. Posible mejora post-migracion con
  su propio ADR y cambio coordinado en el frontend.

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
| 001 | Seleccion de ORM (TypeORM) | pendiente de redactar (Tarea 0.4) |
| 002 | Estrategia de autenticacion (JWT compatible con simplejwt + hashes Django) | pendiente de redactar (Tarea 0.4) |
| 003 | Estructura modular del proyecto NestJS | pendiente de redactar (Tarea 0.4) |
| 004 | Estrategia de migracion de la base de datos (baseline, sin recrear esquema) | pendiente de redactar (Tarea 0.4) |

## Temas anotados para revisar mas adelante (aun no son ADR)

- **Metodo HTTP QUERY / @Search() de NestJS para endpoints de listado.**
  Fuera de alcance en la migracion: rompe el contrato actual (el frontend usa
  `GET /recurso/?params` en todos los listados) y depende de un borrador IETF que
  intermediarios (proxies, CDN) pueden rechazar. Posible mejora post-migracion con
  su propio ADR y cambio coordinado en el frontend.

# AGENTS.md — diocesis-backend-nest

Guía de flujo de trabajo para cualquier agente (o persona) que haga cambios en este
repo. Para arquitectura y decisiones de diseño, ver [`docs/adr/`](docs/adr/) y
[`docs/`](docs/) (`contract-matrix.md`, `endpoints-inventory.md`,
`cutover-runbook.md`, `db/migrations.md`).

## Flujo de ramas y PRs

1. **Nunca se trabaja directo sobre `main` ni `dev`.** Cada tarea va en su propia
   rama, creada desde `origin/dev` actualizado.
2. Nombre de rama: `tipo/descripcion-corta` (`fix/...`, `feat/...`, `chore/...`).
3. Antes de abrir el PR:
   - `npm run lint`
   - `npm test` (Jest, unitarias)
   - `npm run build` (`nest build`, debe compilar sin errores)
   - Si el cambio toca endpoints o módulos con e2e: `npm run test:e2e`
4. El PR va contra `dev`, nunca contra `main` directamente.
5. **El merge del PR a `dev` requiere aprobación explícita del usuario.** No se
   fusiona solo porque los checks pasen.
6. La promoción `dev → main` es un paso aparte y **solo se hace cuando el usuario
   la pide explícitamente**, nunca junto con el merge a `dev` por defecto.
7. Después de promover, verificar el despliegue (ver abajo) antes de dar la tarea
   por terminada.
8. **Borrar ramas ya fusionadas solo cuando el usuario lo pide** (local y remoto).
   Confirmar con `git merge-base --is-ancestor <rama> origin/dev` que de verdad está
   fusionada antes de borrar.

Mensajes de commit y cuerpos de PR en español, describiendo la causa del problema
cuando es un fix, no solo el síntoma.

## Migraciones (ADR-004)

- **Solo aditivas**: agregar tablas/columnas/índices. Nunca `DROP`, nunca renombrar
  en el mismo paso que agrega. `synchronize` está apagado siempre.
- Generar con `npm run migration:generate -- src/database/migrations/NombreMigracion`
  y **revisar el SQL generado a mano** antes de commitear: TypeORM a veces incluye
  cambios de tablas no relacionadas (ruido de otras entidades) que hay que recortar.
- `npm run migration:run:prod` corre automáticamente en cada deploy a Render (parte
  del `buildCommand` en `render.yaml`). Si una migración falla, el build falla y
  Render conserva el deploy anterior — no hay corrupción silenciosa, pero sí que
  revisar el log del build antes de reintentar.
- Ver [`docs/db/migrations.md`](docs/db/migrations.md) para el detalle completo.

## Despliegue

`main` se despliega solo a Render (`render.yaml`): build = `npm ci --include=dev &&
npm run build && npm run migration:run:prod`, arranque = `npm run start:prod`,
healthcheck en `/health`. No hay GitHub Actions para el deploy del backend — Render
lo dispara automáticamente al detectar el push a `main`. Después de promover,
confirmar en el dashboard de Render (o `GET /health`) que el deploy terminó bien
antes de reportar la tarea como hecha.

## Variables de entorno y secretos

- `.env` está en `.gitignore`; nunca commitear credenciales reales.
- En Render, `DATABASE_URL` y `JWT_SECRET` son `sync: false` (se configuran a mano
  en el dashboard, no viven en `render.yaml`).
- `NODE_ENV=production` activa `trust proxy` y cambia las carpetas de Cloudinary sin
  prefijo de entorno — no tocar esa lógica sin revisar `docs/cutover-runbook.md`.

## Git en Windows

Si `git push`/`git commit` falla con errores de escritura en `.git/objects` ("fsync
error", "unable to create temporary file"), es un problema de disco local conocido en
esta máquina, no del repo. Workaround: crear la rama y subir los archivos con la API
de GitHub (`gh api -X POST .../git/refs`, `gh api -X PUT .../contents/...`) en vez de
`git push`, o simplemente reintentar el push una vez.

## Comandos

```bash
npm install
npm run start:dev          # nest start --watch
npm run lint
npm test
npm run test:e2e
npm run build
npm run migration:run      # local, contra la base de pruebas
```

## Qué NO hacer sin que el usuario lo pida explícitamente

- Push directo a `main` o `dev`.
- Merge de un PR.
- Promoción `dev → main`.
- Borrar ramas, aunque estén fusionadas.
- Migraciones destructivas (`DROP`, rename sin columna puente) — nunca, ni pidiéndolo
  explícitamente sin antes confirmar el plan de rollback.
- Correr `migration:run:prod` manualmente fuera del deploy de Render sin avisar.

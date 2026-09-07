# Arnes de paridad

Dispara la misma peticion HTTP al **oraculo Django** (`fe3fc98`, ver `docs/oracle/`) y a
**NestJS**, normaliza las respuestas y hace un diff. Sin dependencias externas (Node 24:
`fetch`, `FormData`, `Blob`).

## Modos

```powershell
# 1) Grabar baselines desde el oraculo (necesita el oraculo levantado en :8000)
npm run parity -- --record

# 2) Comparar NestJS contra los baselines grabados (por defecto)
npm run parity

# 3) Comparar NestJS contra el oraculo EN VIVO (sin baselines)
npm run parity -- --compare --live

# 4) Auto-chequeo de la normalizacion: oraculo vs oraculo (debe salir todo OK)
$env:PARITY_NEST_URL = "http://127.0.0.1:8000"; npm run parity -- --compare --live

# Filtrar por id de caso
npm run parity -- --only decanatos
```

Codigo de salida: `0` si no hay fallos (los `DELTA` esperados no cuentan como fallo), `1`
si hay algun `FALLO`.

## Variables de entorno

| Var | Por defecto | Uso |
|---|---|---|
| `PARITY_ORACLE_URL` | `http://127.0.0.1:8000` | base del oraculo |
| `PARITY_NEST_URL` | `http://127.0.0.1:3000` | base de NestJS |
| `PARITY_ADMIN_USER` / `PARITY_ADMIN_PASS` | — | credenciales para casos `auth: 'admin'` |
| `PARITY_SUPER_USER` / `_PASS`, `PARITY_USER_USER` / `_PASS` | — | idem otros roles |

Para casos con `auth`, primero fija una contrasena conocida a un usuario del oraculo con
`manage.py changepassword` (ver `docs/oracle/README.md`), y crea el mismo usuario en la BD
de NestJS cuando exista.

## Normalizacion (`normalize.ts`)

- Fechas-hora ISO 8601 -> `<ISO_DATETIME>` (Django `auto_now` cambia en cada save).
- URLs absolutas -> ruta desde `/api` (asi `next`/`previous` de DRF no dependen de host/puerto).
- Claves de objeto ordenadas -> el diff es independiente del orden.
- `ignore` por caso: rutas con puntos y comodin `*`, p. ej. `results.*.id`, `data.id`.
  Metodologia: arrancar con `ignore` vacio, correr el modo (4) y añadir solo lo que
  resulte volatil de verdad.

## Casos (`cases/`)

`cases/index.ts` agrega todos los ficheros de `cases/`. Cada caso es un `ParityCase`
(ver `types.ts`): `id`, `method`, `path` (con query), `body` o `form`, `auth`, `ignore`,
`expectedDelta` (un diff con `expectedDelta` se reporta como `DELTA`, no como `FALLO`).

En FASE 0 solo hay `public-get.ts` (GET publicos + `login` invalido). Se amplia por
modulo en Fase 2+, en paralelo a cada *vertical slice*.

## `__baselines__/`

Respuestas grabadas del oraculo (JSON crudo, con datos reales). **Gitignored.**
Se regeneran con `npm run parity -- --record`.

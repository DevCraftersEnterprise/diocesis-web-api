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

- `public-get.ts`: listas publicas de los 10 modulos (paginadas y planas), con
  `IGNORE_PAGINATION_LINKS` para `next`/`previous` (el FE no los usa) y `expectedDelta`
  donde aplica (BUG-DJANGO-023 en carrusel, BUG-DJANGO-024 en decanatos).
- `detail-and-errors.ts`: detalle por id (`GET /{recurso}/{id}/`) de cada catalogo/
  contenido con datos reales en el oraculo, un 404 y varios 401 (endpoint protegido sin
  token) + la validacion de `POST /token/refresh/` sin body.

**Estado (Tarea 9.4):** 22 casos, todos de solo lectura y sin efectos secundarios (el
guard/pipe corta antes de tocar la BD en los casos de error). `npm run parity -- --record`
+ `npm run parity` limpio: 0 `FALLO`, deltas solo donde hay un `expectedDelta` documentado.
Auto-chequeo (`--compare --live` con `PARITY_NEST_URL` = oraculo) da **22/22 OK**, sin
ningun delta — confirma que la normalizacion no enmascara nada que no deba.

### Por que NO hay casos autenticados ni mutaciones (POST/PUT/DELETE reales)

El oraculo Django y NestJS **comparten la misma BD** (`docs/oracle/`, puerto `5433`) para
que una peticion idéntica lea el mismo dato real. Eso hace que dos tipos de caso sean
peligrosos para un arnes que se re-ejecuta muchas veces:

1. **Login exitoso**: el primer login correcto de un usuario reescribe su
   `password` de PBKDF2 (Django) a `argon2id` (NestJS, ADR-002 pto. 4). Django no sabe
   leer `argon2id` -> el login de ESE usuario por el lado oraculo falla en toda corrida
   futura, hasta resetear la contrasena a mano (`manage.py changepassword`). No hay forma
   de deshacer esto automaticamente entre corridas.
2. **Mutaciones (POST/PUT/DELETE con exito)**: dejarian filas nuevas o cambios
   permanentes en el oraculo compartido en cada corrida (sin transaccion, sin rollback);
   una segunda corrida ya no partiria del mismo estado (p. ej. "usuario ya existe").

La paridad de las rutas autenticadas y de las mutaciones **si esta cubierta**, pero por
los tests e2e (`test/*.e2e-spec.ts`, 100+ casos contra el mismo oraculo) — que siembran
sus propios usuarios/filas desechables y los limpian en `afterAll`, evitando ambos
problemas. Este arnes se queda deliberadamente en las rutas publicas + los 401/404/400 sin
efecto, que es exactamente lo que un `GET`/error de verdad hace en produccion en cada
carga de pagina del frontend.

## `__baselines__/`

Respuestas grabadas del oraculo (JSON crudo, con datos reales). **Gitignored.**
Se regeneran con `npm run parity -- --record`.

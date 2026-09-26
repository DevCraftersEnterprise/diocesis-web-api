# Matriz de compatibilidad frontend <-> backend

Estado: **v2 (Tarea 0.6)**. Anclada a **`fe3fc98`** = produccion real. La v1 (0.2) se
construyo leyendo el `main` local, 3 commits por delante y NO desplegado. La verificacion
de respuestas reales (byte a byte contra el oraculo) es la Tarea 0.7.

Progreso: FASES 2-6 hechas (usuarios, catalogos, padres, carrusel, parroquias).
**FASE 7 hecha** (articulos 7.1, noticias 7.2, documentos 7.3): los 3 modulos de
contenido con `tags jsonb`; cierra BUG-DJANGO-011 (filtro `tags` parametrizado).
**FASE 8 hecha** (endurecimiento): rate limiting en auth (8.1, SECURITY-006), CHECK de
dominio `type`/`role` (8.2), parametros argon2id explicitos (8.3), lista de contrasenas
comunes + politica en CSV (8.4, BUG-DJANGO-005), inventario de sobres (8.5, APIC-002).
**FASE 9**: preparacion de despliegue (9.1-9.3) + arnes de paridad completado y corrido
de punta a punta contra el oraculo real (9.4, TEST-001): 22 casos, 0 fallos.

Solo se listan los endpoints que el frontend consume hoy (catalogo completo en
`endpoints-inventory.md`). Cada fila es un contrato que NestJS debe respetar salvo el
delta anotado en **Estado** y justificado en `findings.md`.

`Estado`: `pendiente` (nada migrado) · `delta intencional` · `bloqueado por <ID>`.

---

## Contrato transversal (aplica a todas las filas)

- **Base URL**: `environment.apiUrl` = `<host>/api`. Dev `http://127.0.0.1:8000/api`;
  prod `https://diocesis-backend.onrender.com/api`. **Todas las rutas terminan en `/`.**
  NestJS (Tarea 1.10): `setGlobalPrefix('api', { exclude: ['health'] })` en `configureApp`
  (`src/app.setup.ts`, compartido por `main.ts` y los tests e2e). Express corre sin
  `strict routing`, asi que `/api/x` y `/api/x/` resuelven igual; `/health` queda fuera
  del prefijo.
- **Auth**: `authInterceptor` añade `Authorization: Bearer <access>` a **toda** peticion
  si hay token en `localStorage['token']`. No cookies, no CSRF.
- **Codigos de estado con trato especial en el FE**: `errorInterceptor` hace **logout
  global + redirect a `/login`** ante **401 o 403**. Cualquier otro codigo lo maneja el
  componente. Implicaciones NestJS:
  - Permiso denegado -> **403**.
  - Validacion -> **400** (`{ "<campo>": ["..."] }` o `{"error": "..."}`); **nunca** 401/403.
  - No encontrado -> **404**.
- **Forma del cuerpo de error** (`AllExceptionsFilter`, Tarea 1.4, resuelve APIC-004):
  - Mensaje escalar -> `{ "detail": "<mensaje>" }` (lo que lee `login.ts`). Aplica a la
    forma por defecto de Nest `{statusCode,message,error}`, que se aplana.
  - Cuerpo de objeto propio del controlador/pipe (`{ "<campo>": [...] }`, `{ "error": ... }`,
    `{ "detail": ... }`) -> se devuelve **tal cual**.
  - **Validacion de DTO** (`ValidationPipe` global, Tarea 1.5): errores de `class-validator`
    -> `{ "<campo>": ["mensaje", ...] }` (forma de `serializer.errors` de DRF; anidados con
    ruta por puntos). `whitelist: true` descarta props desconocidas (mitiga el mass
    assignment de BUG-DJANGO-007). Los DTO concretos llegan por modulo (Fases 2+).
  - **5xx** -> siempre `{ "detail": "Error interno del servidor." }`; la traza va solo al
    log del servidor (BUG-DJANGO-004). **Delta intencional**: en prod Django devuelve una
    pagina HTML 500; NestJS devuelve este JSON. El FE solo muestra un toast generico.
  - **429** (rate limiting de auth, FASE 8.1, SECURITY-006) -> `{ "detail": "Demasiados
    intentos. Intentalo de nuevo en un momento." }`. **Delta intencional**: Django no
    tiene rate limiting. Solo en `POST /token/login/`, `PUT .../change-password/`,
    `POST .../reset-password/{id}/`. El interceptor del FE no trata el 429 (no es 401/403);
    lo maneja el componente (toast generico).
- **Paginacion**: el FE lee **`results`** y **`count`**. No lee `next`/`previous`. -> en
  NestJS pueden ser `null`/relativos (delta permitido). El FE envia `page` + `page_size`
  (`page = offset/limit + 1`). Helper en `src/common/pagination/` (Tarea 1.6):
  `PaginationQueryDto` (`page`>=1, `page_size` recortado a 100 como DRF) +
  `buildPage(items, total, query)` -> `{count, next:null, previous:null, results}`, con
  404 `{detail}` ante pagina fuera de rango (replica DRF). `/padres/` sin params sigue
  devolviendo **array plano** (APIC-003): ese endpoint no usa el helper.
- **Cuerpo de create/update**: el FE **ignora el body** de POST/PUT (toast + recarga).
  Excepciones que SI lo leen: `login` (`access`), `loadProfile` (`User`), `home`
  (`results`), `post-details`, `parish-details`, `reverend-details`.
- **Soft-delete canonico** (politica FASE 3, `CatalogService`; cierra BUG-DJANGO-012):
  - `GET /{id}/` **nunca** filtra `isActive` -> devuelve la fila aunque este borrada
    (cierra BUG-DJANGO-022). `GET /` (lista) sigue filtrando segun el query `isActive`.
  - `PUT` / `DELETE` exigen fila **activa** -> 404 si esta borrada (hay que `habilitar/`
    antes). `POST /habilitar/{id}/` exige fila **inactiva** -> 404 si ya esta activa.
  - `DELETE` (soft) fija **`isActive=false` + `deletedAt` + `deletedBy`** (Django no fijaba
    `deletedAt` -> BUG-DJANGO-013). `habilitar/` limpia `deletedAt`/`deletedBy`.
  - Respuesta de `DELETE`: **204 sin cuerpo** (Django devuelve 204 + `{detail}`, invalido).
- **camelCase** en request y response, **obligatorio**.
- **Fechas**: `DateField` -> `YYYY-MM-DD` (columna `date`, string tal cual, p. ej.
  `openingDate`/`birthDate`); `DateTimeField` -> ISO 8601 UTC (`toISOString()`, p. ej.
  `createdAt`/`updatedAt`/`deletedAt`). Verificado contra el oraculo (copia de prod) en
  todos los modulos migrados; helper `iso()` repetido en cada `*.response.ts`.
- **`tags`**: `noticias`/`documentos` -> string JSON `'["a","b"]'` en `multipart`;
  `articulos` -> array JSON en body `application/json`. En respuesta siempre array.
- **Subida de archivos**: `multipart/form-data`; campo `picture` (padres, parroquias,
  noticias), `document` (documentos), `url` (carrusel). En prod **sin validacion**; carpeta
  de Cloudinary **hardcodeada** por vista. NestJS (FASE 4, `src/integrations/cloudinary/` +
  `src/common/files/`): `CloudinaryService` configura el SDK **una vez** al arrancar
  (PERF-004); carpeta `<entorno>/<recurso>` — `padres` en prod, `development/padres` fuera
  (BUG-DJANGO-015). `assertValidImage` valida **por magic bytes** (JPEG/PNG/WebP/GIF) +
  `<= 5 MB` (SECURITY-008) -> 400 `{ "<campo>": [...] }`. Fallo de subida -> 5xx generico,
  nunca `str(e)` (BUG-DJANGO-004). Guarda la `secure_url` como string (igual que Django).

### Sobres de respuesta — inventario final (APIC-002, cerrado en 8.5)

Django mezclaba: usuarios `{mensaje, data}`, el resto objeto plano, y `DELETE` con
`{detail}` + 204. Inventario tras la migracion (el FE solo lee el body donde se indica
en el bullet "Cuerpo de create/update"):

| Tipo de endpoint | Sobre NestJS | Paridad Django | Nota |
|---|---|---|---|
| GET detalle / POST / PUT de entidad | **objeto plano** (forma del serializer) | usuarios era `{mensaje,data}` -> **delta**; el resto ya era plano | el FE ignora el body de POST/PUT salvo las excepciones ya listadas |
| GET lista paginada | `{count, next, previous, results}` (`next`/`previous` = `null`) | si | el FE solo lee `count`/`results` |
| GET lista de `/padres/` sin `page` | **array plano** | si | APIC-003, delta prohibido de tocar |
| `POST\|PUT .../habilitar/{id}/` | `{ detail: "<Recurso> habilitado correctamente." }` | si (`{detail}`) | texto exacto de Django por recurso |
| `DELETE` (todos los modulos) | **204 sin cuerpo** | Django: 204 + `{detail}` | **delta intencional** (204 no lleva body) |
| usuarios `cambiar-estado` / `change-password` | `{ mensaje }` | si | el FE lee `res.mensaje` (toast) |
| usuarios `reset-password/{id}` | `{ mensaje, password }` | Django: `{mensaje}` | `password` anadido (BUG-DJANGO-002) |
| usuarios `cargar-por-csv` | `{ mensaje, creados, errores }` | si | — |
| Errores | `{ detail }` / `{ "<campo>": [...] }` / `{ error }` / 429 `{ detail }` | APIC-004 (filtro global) | ver "Forma del cuerpo de error" arriba |

No queda ningun `{mensaje, data}`. **APIC-002 RESUELTO**: los `{mensaje}` que quedan son
paridad deliberada con Django (el FE los consume); el unico cambio de forma es el de
usuarios create/update (objeto plano) y el `204` sin cuerpo, ambos ya documentados como
delta.

---

## Autenticacion

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Auth.login()` (`login.ts`) | POST | `/token/login/` | JSON `{username, password}`. Sin auth. | 200 `{access, refresh}`. Invalidas -> 401 `{detail:"No active account found with the given credentials"}`. | `/token/login/` | **hecho (2.5; 8.1)**. HS256/`JWT_SECRET` nuevo (corte duro, ADR-002). Payload `{user_id,token_type,jti,iat,exp}`. Verifica PBKDF2 Django y re-hashea a argon2id en el 1er login (parametros argon2id fijados, 8.3). Falta body -> 400 `{campo:[...]}`. **Rate limit (8.1, SECURITY-006)**: `THROTTLE_AUTH_LIMIT` (10) por `THROTTLE_AUTH_TTL_MS` (60s) e IP -> exceso 429 `{detail}`. |
| `Auth.loadProfile()` (`layout.ts` admin) | GET | `/users/usuarios/{id}/` | `id` = `user_id` del JWT. Bearer. | 200 objeto `User`. | `/users/usuarios/{id}/` | **hecho (2.7)**. El propio usuario o admin/super (cierra el IDOR de BUG-DJANGO-008 sin romper `loadProfile`); otro usuario -> 403. |

`/token/refresh/` no se usa. NestJS lo implementa igual (`{refresh}` -> 200 `{access}`, sin rotacion ni blacklist) por ser endpoint del contrato (2.5).

## Usuarios (`/dashboard/users`)

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Users.getUsersPaginated()` | GET | `/users/usuarios/` | Query `page`, `page_size`, `username?`, `isActive?`. Bearer. | 200 `{count, next, previous, results: User[]}`. Excluye al usuario actual. Orden `username`. | `/users/usuarios/` | **hecho (2.7)**. `@Roles('admin')` (cierra BUG-DJANGO-008: antes cualquier autenticado enumeraba usuarios). |
| `Users.createUser()` | POST | `/users/usuarios/` | JSON `{username, email, role, password}` (`role` = `admin`\|`user`). | 201 `{mensaje, data: User}` (FE ignora body). `admin`->`super` = 403. Duplicado = 400 `{error}`. | `/users/usuarios/` | **hecho (2.8; 2.1)**. `@Roles('admin')`. `role` requerido (BUG-DJANGO-009). Reglas de contrasena (BUG-DJANGO-005, subset). Un solo hash argon2id (BUG-DJANGO-014). **Delta**: respuesta = objeto `User` plano 201 (no `{mensaje,data}`). Duplicado -> 400 `{error}`; `admin`->`super` -> 403 `{detail}`. **Campo nuevo sin contraparte en Django (Tarea 2.1)**: `moduleAccess?: string[]` opcional (`'instituto-biblico'`\|`'isma'`), default `[]`; invalido -> 400 `{moduleAccess:[...]}`. |
| `Users.updateUser()` | PUT | `/users/usuarios/{id}/` | JSON `{username, email, role}` (sin password). | 200 `{mensaje, data: User}` (FE ignora body). | `/users/usuarios/{id}/` | **hecho (2.9; 2.1)**. `@Roles('admin')` + `admin`≠actúa sobre `super` (BUG-DJANGO-021). DTO sin `password` (BUG-DJANGO-010). **Delta**: respuesta = `User` plano 200. Acepta tambien `moduleAccess?: string[]` (Tarea 2.1, campo nuevo). |
| `Users.changeUserStatus()` | PUT | `/users/usuarios/cambiar-estado/{id}/` | Body `{}`. | 200 `{mensaje}`. Toggle `isActive`+`is_active`. | igual | **hecho (2.9)**. `@Roles('admin')`. Togglea **ambos** flags + `deletedAt`/`deletedBy` (BUG-DJANGO-020). Mantiene `{mensaje}` exacto de Django. |
| `Users` DELETE (`— sin uso` FE) | DELETE | `/users/usuarios/{id}/` | Bearer. | 200 `{mensaje}` (Django). | igual | **hecho (2.9)**. `@Roles('admin')` + gate super. Soft-delete con **ambos** flags a `false` (BUG-DJANGO-020) + `deletedAt`/`deletedBy`. **Delta**: 204 sin cuerpo. |
| `Users.createUsersByCsv()` | POST | **`/users/usuarios/cargar-por-csv/`** | `multipart` campo `archivo_csv` (`text/csv`). | 200 `{mensaje, creados[], errores[]}`. **Coincide -> funciona.** | `/users/usuarios/cargar-por-csv/` | **hecho (2.10; 8.4)**. `@Roles('admin')`. Cabeceras `username,email,role[,password]`; sin `password` -> usa `username`. Sin archivo -> 400 `{error}`. **8.4**: aplica `assertPasswordPolicy` por fila (delta vs Django, que no valida) -> `password=username` o comun -> esa fila va a `errores`, no aborta. |
| `Users` change-password (`— sin uso` FE) | PUT | `/users/usuarios/change-password/` | `{new_password}` (Django). | 200 `{mensaje}`. | igual | **hecho (2.11, ENDURECIDO; 8.1/8.4)**. Body ahora `{current_password, new_password}`; verifica la actual + politica de contrasenas (BUG-DJANGO-005, incluye lista de comunes en 8.4). Actual incorrecta -> 400 `{current_password:[...]}`. **Rate limit (8.1)** -> exceso 429 `{detail}`. |
| `Users` reset-password (`— sin uso` FE) | POST | `/users/usuarios/reset-password/{id}/` | Bearer + rol. | 200 `{mensaje}`; password = username (BUG-DJANGO-002). | igual | **hecho (2.11; 8.1)**. `@Roles('admin')` + gate super. Genera contrasena **aleatoria** (16 chars) y la devuelve: 200 `{mensaje, password}`. Cierra BUG-DJANGO-002. **Rate limit (8.1)** -> exceso 429 `{detail}`. |

## Carrusel

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Carousel.getAll()` (`home`, admin) | GET | `/carrusel/` | Sin auth. | 200 **array** `Carrusel[]`, solo `isActive=true`, orden `-createdAt`. | `/carrusel/` | **hecho (5.2)**. `@Public()`. Migracion `0002` (DQ3-B) alinea `carrusel_carrusel` al `BaseModel`; la respuesta gana `updatedAt`/`deletedAt`/`updatedBy`/`deletedBy` (**delta aditivo**; el `Carrusel` del FE es interfaz e ignora claves extra). |
| `Carousel.create()` (admin) | POST | `/carrusel/` | `multipart`: `url` = archivo, `isImage` = `"true"`/`"false"` (default `true`). Bearer + rol. | 201 objeto `Carrusel`. Sin archivo -> 400 `{error}`. | `/carrusel/` | **hecho (5.2)**. `@Roles('admin')`. Valida por contenido: `isImage=true` -> imagen (5 MB); `false` -> video MP4/WebM/QuickTime (50 MB) -> 400 `{url:[...]}` (SECURITY-008). Sube a `carrusel/imagenes`|`carrusel/videos`. Error de subida -> 5xx generico (BUG-DJANGO-004). |
| `Carousel.delete()` (admin) | DELETE | `/carrusel/{id}/` | Bearer + rol. | **204 + body** `{detail}` (FE lo ignora). | `/carrusel/{id}/` | **hecho (5.2)**. `@Roles('admin')`. **204 sin cuerpo**; soft-delete fija `deletedAt`+`deletedBy` (ya existen tras `0002`). PUT `/habilitar/{id}/` (**PUT**): 400 `{detail}` si ya activo. PUT/DELETE sobre fila borrada -> 404 (politica canonica). |

## Padres / Reverends

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Reverends.getPadresPaginated()` (admin) | GET | `/padres/` | Query `page`, `page_size`, `firstName?`, `lastName?`, `isActive?`, `birthDay?`, `birthMonth?`. | 200 `{count, next, previous, results: Padre[]}`. | `/padres/` | **hecho (4.2)**. `@Public()`. Con `page`/`page_size` -> objeto paginado. |
| `Reverends.getAllPadres()` (`parishes.ts`) | GET | `/padres/` | Query `isActive=true` (**sin** `page`/`page_size`). | 200 **array** `Padre[]`. | `/padres/` | **hecho (4.2)**. Sin `page`/`page_size` -> **array plano** (APIC-003 preservado). |
| `Reverends.getPadreById()` (`reverend-details`, `parish-details`) | GET | `/padres/{id}/` | — | 200 objeto `Padre`. | `/padres/{id}/` | **hecho (4.2)**. `@Public()`. Devuelve la fila aunque este soft-deleted (politica canonica). |
| `Reverends.createPadre()` / `updatePadre()` (admin) | POST / PUT | `/padres/` , `/padres/{id}/` | `multipart`: `firstName, lastName, birthDate` (`YYYY-MM-DD`), `email, facebook, instagram, twitter` (cadena vacia si no hay valor), `picture` (solo si hay archivo). Bearer + rol. | 201 / 200 objeto `Padre`. Invalido -> 400 `{campo:[...]}`. | mismas rutas | **hecho (4.2)**. `@Roles('admin')`. `""` -> `null` en opcionales. `picture`: valida por magic bytes (JPEG/PNG/WebP/GIF) + <=5 MB (**SECURITY-008**) -> 400 `{picture:[...]}`; sube a Cloudinary (config unica **PERF-004**, carpeta por entorno **BUG-DJANGO-015**). Error de subida -> 5xx generico (**BUG-DJANGO-004**). PUT sobre fila borrada -> 404. |
| `Reverends.activatePadre()` (admin) | POST | `/padres/habilitar/{id}/` | Body `{}`. | 200 `{detail:"Padre habilitado correctamente."}`. 404 si ya activo. | igual | **hecho (4.2)**. `@Roles('admin')`. Limpia `deletedAt`/`deletedBy`. |
| `Reverends.deletePadre()` (admin) | DELETE | `/padres/{id}/` | Bearer + rol. | **204 + body** `{detail}`. | igual | **hecho (4.2)**. `@Roles('admin')`. **204 sin cuerpo**; soft-delete fija `deletedAt`+`deletedBy` (BUG-DJANGO-013). |

## Decanatos

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Decant.getDecanatosPaginated()` (admin) | GET | `/decanatos/` | Query `page`, `page_size`, `name?`, `isActive?`. | 200 `{count, next, previous, results: Decanato[]}` **pero `results` trae TODAS las filas** (BUG-DJANGO-024): serializa el `queryset`, no la `page`. | `/decanatos/` | **hecho (3.1)**. `@Public()`. NestJS pagina bien (`results` respeta `page_size`) -> delta vs BUG-DJANGO-024; con 9 filas el FE no lo nota. Filtro `isActive` solo con valor exacto `true`/`false`. |
| `Decant.getAllDecanatos()` (`parishes.ts`) | GET | `/decanatos/` | Query `isActive=true` (sin `page`). | 200 objeto paginado; `results` = todas (por BUG-DJANGO-024). El FE lee `res.results`/`res.count`. | `/decanatos/` | **hecho (3.1)**. Sin `page` sigue devolviendo objeto paginado (asimetria con `/padres/` preservada, APIC-003). |
| `Decant.getDecanatoById()` (`parish-details`) | GET | `/decanatos/{id}/` | — | 200 objeto `Decanato`. `isActive=True` requerido -> **404 si soft-deleted** (BUG-DJANGO-022). | `/decanatos/{id}/` | **hecho (3.1)**. `@Public()`. **Devuelve la fila aunque este soft-deleted** (cierra BUG-DJANGO-022; delta canonico de soft-delete). |
| `Decant.createDecanato()` / `updateDecanato()` | POST / PUT | `/decanatos/` , `/decanatos/{id}/` | JSON `{name}`. Bearer + rol. | 201 / 200 objeto `Decanato`. | mismas rutas | **hecho (3.1)**. `@Roles('admin')`. DTO solo `{name}`; `createdBy`/`updatedBy` desde `@CurrentUser()` (cierra BUG-DJANGO-007). PUT sobre fila borrada -> 404. |
| `Decant.activateDecanato()` | POST | `/decanatos/habilitar/{id}/` | `{}`. Bearer + rol. | 200 `{detail}`. | igual | **hecho (3.1)**. `@Roles('admin')`. 404 si ya activa. Limpia `deletedAt`/`deletedBy` al reactivar. |
| `Decant.deleteDecanato()` | DELETE | `/decanatos/{id}/` | Bearer + rol. | **204 + body** `{detail}`. | igual | **hecho (3.1)**. `@Roles('admin')`. **204 sin cuerpo**; soft-delete fija `isActive=false` + `deletedAt` + `deletedBy` (cierra BUG-DJANGO-013). |

## Colonias (como Decanatos, sin BUG-DJANGO-024)

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Endpoint NestJS | Estado |
|---|---|---|---|---|
| `Colony.getColoniasPaginated()` (admin) | GET | `/colonias/` (pagina bien) | `/colonias/` | **hecho (3.2)**. `@Public()`, `CatalogService` compartido. |
| `Colony.getAllColonias()` (`parishes.ts`) | GET | `/colonias/` (query `isActive=true`, sin `page` -> objeto paginado) | `/colonias/` | **hecho (3.2)**. Sin `page` sigue devolviendo objeto paginado. |
| `Colony.getColoniaById()` (`parish-details`) | GET | `/colonias/{id}/` | `/colonias/{id}/` | **hecho (3.2)**. `@Public()`. Devuelve la fila aunque este soft-deleted (cierra BUG-DJANGO-022). |
| `Colony.createColonia()` / `updateColonia()` | POST / PUT | `/colonias/` , `/colonias/{id}/` (JSON `{name}`) | mismas | **hecho (3.2)**. `@Roles('admin')`. `createdBy`/`updatedBy` desde `@CurrentUser()` (BUG-DJANGO-007). Objeto `Colonia` plano. |
| `Colony.activateColonia()` | POST | `/colonias/habilitar/{id}/` | igual | **hecho (3.2)**. `@Roles('admin')`. 200 `{detail:"Colonia habilitado correctamente."}` (texto exacto de Django). |
| `Colony.deleteColonia()` | DELETE | `/colonias/{id}/` | igual | **hecho (3.2)**. `@Roles('admin')`. **204 sin cuerpo**; soft-delete fija `deletedAt`+`deletedBy` (BUG-DJANGO-013). |

## Parroquias

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Parish.getParroquiasPaginated()` (admin) | GET | `/parroquias/` | Query `page`, `page_size`, `name?`, `town?`, `colonia?`, `isActive?`. | 200 `{count, next, previous, results: Parroquia[]}`. | `/parroquias/` | **hecho (6.1)**. `@Public()`, paginado siempre. Filtro `colonia` -> `colonia.name` via join (**cierra BUG-DJANGO-003**, antes 500 por `coloniaId__nombre`). |
| `Parish.getParroquiaById()` (`parish-details`) | GET | `/parroquias/{id}/` | — | 200 objeto `Parroquia` (FKs `decanatoId`/`coloniaId`/`padreId` = UUID string). | `/parroquias/{id}/` | **hecho (6.1)**. `@Public()`. Devuelve la fila aunque este soft-deleted (politica canonica). |
| `Parish.createParroquia()` / `updateParroquia()` | POST / PUT | `/parroquias/` , `/parroquias/{id}/` | `multipart`: `name, openingDate` (`YYYY-MM-DD`), `address, zipCode, town, coloniaId, decanatoId, padreId`, `picture?`. Bearer + rol. | 201 / 200 objeto `Parroquia`. FK inexistente -> 400 `{campo:[...]}`. | mismas rutas | **hecho (6.1)**. `@Roles('admin')`. DTO sin `createdBy` (**BUG-DJANGO-007**); `createdBy`/`updatedBy` desde `@CurrentUser()`. `assertFksExist` valida `decanatoId`/`coloniaId`/`padreId` -> 400. `picture` validada (magic bytes + 5 MB) -> Cloudinary carpeta `parroquia`. PUT sobre fila borrada -> 404. |
| `Parish.activateParroquia()` | POST | `/parroquias/habilitar/{id}/` | `{}`. Bearer + rol. | 200 `{detail:"Parroquia habilitada correctamente."}`. 404 si ya activa. | igual | **hecho (6.1)**. `@Roles('admin')`. Limpia `deletedAt`/`deletedBy`. |
| `Parish.deleteParroquia()` | DELETE | `/parroquias/{id}/` | Bearer + rol. | **204 + body** `{detail}`. | igual | **hecho (6.1)**. `@Roles('admin')`. **204 sin cuerpo**; soft-delete fija `deletedAt`+`deletedBy` (**BUG-DJANGO-013**). |

## Noticias

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Newspaper.getNoticiasPaginated()` (admin, `home`, `post-search`) | GET | `/noticias/` | Query `page`, `page_size`, `title?`, `tags?` (una cadena), `isActive?`. `home`: `page_size=10`, `isActive=true`. | 200 `{count, next, previous, results: Noticia[]}`. | `/noticias/` | **hecho (7.2)**. `@Public()`, paginado siempre, orden `-createdAt`. Filtro `title` ILIKE, `tags` via `applyTagFilter` (**cierra BUG-DJANGO-011**, EXISTS parametrizado), `isActive` exacto `true`/`false` (tolera mayusculas). |
| `Newspaper.getNoticiaById()` (`post-details`) | GET | `/noticias/{id}/` | — | 200 objeto `Noticia` (`tags[]`). | `/noticias/{id}/` | **hecho (7.2)**. `@Public()`. Devuelve la fila aunque este soft-deleted (politica canonica). `tags` siempre array. |
| `Newspaper.createNoticia()` / `updateNoticia()` (admin) | POST / PUT | `/noticias/` , `/noticias/{id}/` | `multipart`: `title`, `content`, `tags` = **string JSON**, `picture?`. Bearer + rol. | 201 / 200 objeto `Noticia` (ignorado). | mismas rutas | **hecho (7.2)**. `@Roles('admin')`. `tags` string-JSON normalizado con `parseTags` (`''`/`null`/`'null'` -> `[]`; invalido -> 400 `{tags:[...]}`). `picture` validada (magic bytes + 5 MB) -> Cloudinary carpeta `noticias`; fallo -> 400 `{picture:[...]}` (SECURITY-008). `createdBy`/`updatedBy` desde `@CurrentUser()` (**BUG-DJANGO-007**). PUT sobre fila borrada -> 404. |
| `Newspaper.activateNoticia()` (admin) | POST | `/noticias/habilitar/{id}/` | `{}`. Bearer + rol. | 200 `{detail:"Noticia habilitada correctamente."}`. 404 si ya activa. | igual | **hecho (7.2)**. `@Roles('admin')`. Limpia `deletedAt`/`deletedBy`. |
| `Newspaper.deleteNoticia()` (admin) | DELETE | `/noticias/{id}/` | Bearer + rol. | **204 + body** `{detail}`. `isActive=False` + `deletedBy`, sin `deletedAt`. | igual | **hecho (7.2)**. **204 sin cuerpo**; soft-delete fija `deletedAt`+`deletedBy` (**BUG-DJANGO-013**). |

## Articulos (solo admin; sin ruta publica)

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Article.getArticulosPaginated()` | GET | `/articulos/` | Query `page`, `page_size`, `title?`, `tags?`, `isActive?`. | 200 `{count, next, previous, results: Articulo[]}`. | `/articulos/` | **hecho (7.1)**. `@Public()`, paginado siempre, orden `-createdAt`. `title` ILIKE, `tags` via `applyTagFilter` (**cierra BUG-DJANGO-011**), `isActive` exacto. |
| `Article.getArticuloById()` | GET | `/articulos/{id}/` | — | 200 objeto `Articulo` (`tags[]`). | `/articulos/{id}/` | **hecho (7.1)**. `@Public()`. Devuelve la fila aunque este soft-deleted. `tags` siempre array. |
| `Article.createArticulo()` / `updateArticulo()` | POST / PUT | `/articulos/` , `/articulos/{id}/` | **JSON** `{title, content, tags: string[]}`. Bearer + rol. | 201 / 200 objeto `Articulo` (ignorado). | mismas rutas | **hecho (7.1)**. `@Roles('admin')`. Body JSON (sin multipart). `tags` normalizado con `parseTags` (invalido -> 400 `{tags:[...]}`). `createdBy`/`updatedBy` desde `@CurrentUser()`; `whitelist:true` descarta `createdBy` del body (**cierra BUG-DJANGO-007**). PUT sobre fila borrada -> 404. |
| `Article.activateArticulo()` | POST | `/articulos/habilitar/{id}/` | `{}`. Bearer + rol. | 200 `{detail:"Artículo habilitado correctamente."}`. 404 si ya activa. | igual | **hecho (7.1)**. `@Roles('admin')`. Limpia `deletedAt`/`deletedBy`. Texto exacto de Django (con acento). |
| `Article.deleteArticulo()` | DELETE | `/articulos/{id}/` | Bearer + rol. | **204 + body** `{detail}`. | igual | **hecho (7.1)**. **204 sin cuerpo**; soft-delete fija `deletedAt`+`deletedBy` (**BUG-DJANGO-013**). |

## Documentos (solo admin; sin ruta publica)

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Document.getDocumentosPaginated()` | GET | `/documentos/` | Query `page`, `page_size`, `title?`, `tags?`, `type?` (uno de los 9), `isActive?`. | 200 `{count, next, previous, results: Documento[]}`. | `/documentos/` | **hecho (7.3)**. `@Public()`, paginado siempre, orden `-createdAt`. `title` ILIKE, `tags` via `applyTagFilter` (**cierra BUG-DJANGO-011**), `type` **exacto sin validar** (igual que Django), `isActive` exacto. |
| `Document.getDocumentoById()` | GET | `/documentos/{id}/` | — | 200 objeto `Documento` (`tags[]`). | `/documentos/{id}/` | **hecho (7.3)**. `@Public()`. Devuelve la fila aunque este soft-deleted. `tags` siempre array. |
| `Document.createDocumento()` / `updateDocumento()` | POST / PUT | `/documentos/` , `/documentos/{id}/` | `multipart`: `title`, `type`, `tags` = **string JSON**, `document?` (pdf/ppt/pptx). Bearer + rol. | 201 / 200 objeto `Documento` (ignorado). | mismas rutas | **hecho (7.3)**. `@Roles('admin')`. `document` **obligatorio al crear** -> 400 `{document:['Este campo es requerido.']}` si falta; validado por magic bytes (PDF/PPT/PPTX, 20 MB) -> Cloudinary `resource_type:raw` carpeta `documentos`; fallo -> 400 `{document:[...]}`. `type` `@IsIn` de los 9 -> invalido 400 `{type:[...]}`. `tags` string-JSON via `parseTags`. `createdBy`/`updatedBy` desde `@CurrentUser()` (**BUG-DJANGO-007**). PUT sobre fila borrada -> 404. |
| `Document.activateDocumento()` | POST | `/documentos/habilitar/{id}/` | `{}`. Bearer + rol. | 200 `{detail:"Documento habilitado correctamente."}`. 404 si ya activa. | igual | **hecho (7.3)**. `@Roles('admin')`. Limpia `deletedAt`/`deletedBy`. |
| `Document.deleteDocumento()` | DELETE | `/documentos/{id}/` | Bearer + rol. | **204 + body** `{detail}`. | igual | **hecho (7.3)**. **204 sin cuerpo**; soft-delete fija `deletedAt`+`deletedBy` (**BUG-DJANGO-013**). |

---

## Deltas intencionales previstos (resumen)

| Delta | Endpoints afectados | Justificacion |
|---|---|---|
| 204 **sin** body en DELETE | 17, 23, 30, 37, 44, 51, 57, 63 | 204 no debe llevar cuerpo (HTTP). El FE ignora el body. |
| `next`/`previous` = `null` o relativos | todos los GET de lista | El FE no los usa. |
| `results` respeta `page_size` en `/decanatos/` | 26 | Corrige BUG-DJANGO-024. Con 9 filas el FE no lo nota. |
| Respuesta de create/update de usuarios como objeto plano (no `{mensaje,data}`) | 4, 6 | El FE ignora el body. A decidir en la fase de usuarios. |
| `deletedAt` siempre en soft-delete | 23, 30, 37, 44, 51, 57, 63 | Coherencia de auditoria (BUG-DJANGO-013). No observable por el FE. |
| Errores de negocio sin `str(e)` | varios | No filtrar internals (BUG-DJANGO-004). |
| Respuesta de `/carrusel/` gana 4 campos de auditoria | 13-18 | ADR-004 DQ3-B. Aditivo, no disruptivo. |
| `tags` invalido (no lista de strings / JSON roto) -> 400 `{tags:[...]}` | articulos, noticias, documentos POST/PUT | `parseTags` endurece: Django aceptaba una lista con no-strings sin chistar. El FE siempre envia `string[]` / string-JSON valido. |
| Validacion de archivo por magic bytes -> 400 `{campo:[...]}` | noticias `picture`, documentos `document` | SECURITY-008. Django (prod) no validaba nada. El FE solo sube formatos permitidos. |
| Filtro `?tags=` = `EXISTS(... jsonb_array_elements_text ...)` parametrizado | articulos, noticias, documentos GET | Sustituye `.extra()` deprecado (BUG-DJANGO-011). Mismo resultado observable. |
| **429** `{detail}` por rate limiting | `POST /token/login/`, `PUT .../change-password/`, `POST .../reset-password/{id}/` | SECURITY-006 (8.1). Django no limita. 10/60s/IP por defecto (`THROTTLE_AUTH_*`). |
| Politica de contrasenas en el alta por CSV | `POST /users/usuarios/cargar-por-csv/` | BUG-DJANGO-005 (8.4). Django no valida en esa via; NestSi -> fila invalida a `errores`. |
| `CHECK` de dominio en BD (`documentos.type`, `usuarios.role`) | — (nivel BD, no observable) | ADR-004 DQ2-A (8.2). Defensa en profundidad; la app ya valida con `@IsIn`. |
| Texto de `{detail}` en 401/404 en espanol (NestJS) vs ingles (Django, defaults de DRF) | todos (401 sin token; 404 generico) | Surgido en el arnes de paridad (Tarea 9.4). Status y forma `{detail}` identicos. El FE nunca compara el texto: en 401/403 hace logout global por **status**; `login.ts` solo pasa el `detail` a `console.error`. Coherente con el resto de mensajes propios de NestJS (todos en espanol). |
| Cantidad/texto de mensajes en `{campo:[...]}` de validacion | validacion de DTO (`class-validator`) vs `serializers` de DRF | Mismo hallazgo (Tarea 9.4, caso `refresh-missing-body`). La forma `{campo:[...]}` esta garantizada desde FASE 1; el contenido exacto de cada mensaje nunca se prometio igual. |

## Restricciones que NO se pueden cambiar (deltas prohibidos)

- `/padres/` sin `page`/`page_size` -> **array plano** (lo consume `parishes.ts`).
- camelCase exacto, rutas y verbos identicos con `/` final (incluido `/carrusel/habilitar/` = **PUT**, `/users/usuarios/cargar-por-csv/` con "por").
- 403 para permiso denegado.
- `access` como clave del token; claim `user_id`.

## Puntos a confirmar en runtime (Tarea 0.7)

- Formato exacto de fechas; cuerpo exacto de 404 de paginacion y de 401/403.
- Serializacion de `createdBy`/`updatedBy`/`deletedBy`: `usuarios` usa `StringRelatedField`
  (username); el resto (`fields='__all__'`) devuelve UUID o `null`.
- `picture`/`document` en null vs cadena vacia vs URL.
- `tags` string-JSON en multipart contra el `JSONField` de DRF.
- Confirmar BUG-DJANGO-024 en el oraculo (`/decanatos/?page=1&page_size=1` -> `results` con 9 filas).

# Matriz de compatibilidad frontend <-> backend

Estado: **v2 (Tarea 0.6)**. Anclada a **`fe3fc98`** = produccion real. La v1 (0.2) se
construyo leyendo el `main` local, 3 commits por delante y NO desplegado. La verificacion
de respuestas reales (byte a byte contra el oraculo) es la Tarea 0.7.

Solo se listan los endpoints que el frontend consume hoy (catalogo completo en
`endpoints-inventory.md`). Cada fila es un contrato que NestJS debe respetar salvo el
delta anotado en **Estado** y justificado en `findings.md`.

`Estado`: `pendiente` (nada migrado) · `delta intencional` · `bloqueado por <ID>`.

---

## Contrato transversal (aplica a todas las filas)

- **Base URL**: `environment.apiUrl` = `<host>/api`. Dev `http://127.0.0.1:8000/api`;
  prod `https://diocesis-backend.onrender.com/api`. **Todas las rutas terminan en `/`.**
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
- **Paginacion**: el FE lee **`results`** y **`count`**. No lee `next`/`previous`. -> en
  NestJS pueden ser `null`/relativos (delta permitido). El FE envia `page` + `page_size`
  (`page = offset/limit + 1`).
- **Cuerpo de create/update**: el FE **ignora el body** de POST/PUT (toast + recarga).
  Excepciones que SI lo leen: `login` (`access`), `loadProfile` (`User`), `home`
  (`results`), `post-details`, `parish-details`, `reverend-details`.
- **camelCase** en request y response, **obligatorio**.
- **Fechas**: `DateField` -> `YYYY-MM-DD`; `DateTimeField` -> ISO 8601 UTC. Formato exacto
  -> pendiente runtime.
- **`tags`**: `noticias`/`documentos` -> string JSON `'["a","b"]'` en `multipart`;
  `articulos` -> array JSON en body `application/json`. En respuesta siempre array.
- **Subida de archivos**: `multipart/form-data`; campo `picture` (padres, parroquias,
  noticias), `document` (documentos), `url` (carrusel). En prod **sin validacion**;
  carpeta de Cloudinary **hardcodeada** por vista.

---

## Autenticacion

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Auth.login()` (`login.ts`) | POST | `/token/login/` | JSON `{username, password}`. Sin auth. | 200 `{access, refresh}`. Invalidas -> 401 `{detail:"No active account found with the given credentials"}`. | `/token/login/` | pendiente |
| `Auth.loadProfile()` (`layout.ts` admin) | GET | `/users/usuarios/{id}/` | `id` = `user_id` del JWT. Bearer. | 200 objeto `User`. | `/users/usuarios/{id}/` | pendiente |

`/token/refresh/` no se usa.

## Usuarios (`/dashboard/users`)

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Users.getUsersPaginated()` | GET | `/users/usuarios/` | Query `page`, `page_size`, `username?`, `isActive?`. Bearer. | 200 `{count, next, previous, results: User[]}`. Excluye al usuario actual. Orden `username`. | `/users/usuarios/` | pendiente. Reforzar rol admin/super (BUG-DJANGO-008). |
| `Users.createUser()` | POST | `/users/usuarios/` | JSON `{username, email, role, password}` (`role` = `admin`\|`user`). | 201 `{mensaje, data: User}` (FE ignora body). `admin`->`super` = 403. Duplicado = 400 `{error}`. | `/users/usuarios/` | pendiente. Validar con DTO (BUG-DJANGO-009). |
| `Users.updateUser()` | PUT | `/users/usuarios/{id}/` | JSON `{username, email, role}` (sin password). | 200 `{mensaje, data: User}` (FE ignora body). | `/users/usuarios/{id}/` | pendiente. Añadir gate admin/super (BUG-DJANGO-021). |
| `Users.changeUserStatus()` | PUT | `/users/usuarios/cambiar-estado/{id}/` | Body `{}`. | 200 `{mensaje}`. Toggle `isActive`+`is_active`. | igual | pendiente. |
| `Users.createUsersByCsv()` | POST | **`/users/usuarios/cargar-por-csv/`** | `multipart` campo `archivo_csv` (`text/csv`). | 200 `{mensaje, creados[], errores[]}`. **Coincide -> funciona.** | `/users/usuarios/cargar-por-csv/` | **paridad**. Opcional: aceptar tambien alias `/cargar-csv/`. |

## Carrusel

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Carousel.getAll()` (`home`, admin) | GET | `/carrusel/` | Sin auth. | 200 **array** `Carrusel[]` (`id, url, isImage, isActive, createdAt, createdBy`), solo `isActive=true`, orden `-createdAt`. | `/carrusel/` | pendiente. Entidad de 6 campos (ADR-004 DQ3-B: los 4 de auditoria llegan por migracion aditiva; la respuesta ganara `updatedAt`/`deletedAt`/`updatedBy`/`deletedBy` = delta aditivo no disruptivo). |
| `Carousel.create()` (admin) | POST | `/carrusel/` | `multipart`: `url` = archivo, `isImage` = `"true"`/`"false"`. Bearer + rol. | 201 objeto `Carrusel`. Error -> 400 `{error}`. | `/carrusel/` | pendiente. Añadir validacion de contenido (mejora consciente; prod no valida). |
| `Carousel.delete()` (admin) | DELETE | `/carrusel/{id}/` | Bearer + rol. | **204 + body** `{detail}` (FE lo ignora). Solo `isActive=False`. | `/carrusel/{id}/` | delta intencional (204 sin body; `deletedAt` cuando exista la columna). |

## Padres / Reverends

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Reverends.getPadresPaginated()` (admin, `reverend-search`) | GET | `/padres/` | Query `page`, `page_size`, `firstName?`, `lastName?`, `isActive?`. | 200 `{count, next, previous, results: Padre[]}`. | `/padres/` | pendiente. |
| `Reverends.getAllPadres()` (`parishes.ts`) | GET | `/padres/` | Query `isActive=true` (**sin** `page`/`page_size`). | 200 **array** `Padre[]` (paginacion condicional). El FE usa `Array.isArray(res)`. | `/padres/` | pendiente. **Delta prohibido**: sin `page` debe devolver array (APIC-003). |
| `Reverends.getPadreById()` (`reverend-details`, `parish-details`) | GET | `/padres/{id}/` | — | 200 objeto `Padre`. | `/padres/{id}/` | pendiente. |
| `Reverends.createPadre()` / `updatePadre()` (admin) | POST / PUT | `/padres/` , `/padres/{id}/` | `multipart`: `firstName, lastName, birthDate` (`YYYY-MM-DD`), `email, facebook, instagram, twitter` (cadena vacia si no hay valor), `picture` (solo si hay archivo). Bearer + rol. | 201 / 200 objeto `Padre` (FE ignora body). Invalido -> 400 `{campo:[...]}`. | mismas rutas | pendiente. Normalizar `""` -> null en opcionales. Añadir validacion de imagen. |
| `Reverends.activatePadre()` (admin) | POST | `/padres/habilitar/{id}/` | Body `{}`. | 200 `{detail}`. `isActive=False` requerido -> 404 si ya activo. | igual | pendiente. |
| `Reverends.deletePadre()` (admin) | DELETE | `/padres/{id}/` | Bearer + rol. | **204 + body** `{detail}`. Soft-delete `isActive=False` + `deletedBy`, **sin `deletedAt`**. | igual | delta intencional (204 sin body; `deletedAt` siempre). |

## Decanatos

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Decant.getDecanatosPaginated()` (admin) | GET | `/decanatos/` | Query `page`, `page_size`, `name?`, `isActive?`. | 200 `{count, next, previous, results: Decanato[]}` **pero `results` trae TODAS las filas** (BUG-DJANGO-024): serializa el `queryset`, no la `page`. | `/decanatos/` | delta intencional: NestJS pagina bien (`results` respeta `page_size`). Con 9 filas el FE no lo nota. |
| `Decant.getAllDecanatos()` (`parishes.ts`) | GET | `/decanatos/` | Query `isActive=true` (sin `page`). | 200 objeto paginado; `results` = todas (por BUG-DJANGO-024). El FE lee `res.results`/`res.count`. | `/decanatos/` | pendiente. **Asimetria con `/padres/`** (APIC-003). |
| `Decant.getDecanatoById()` (`parish-details`) | GET | `/decanatos/{id}/` | — | 200 objeto `Decanato`. `isActive=True` requerido -> **404 si soft-deleted** (BUG-DJANGO-022). | `/decanatos/{id}/` | pendiente. |
| `Decant.createDecanato()` / `updateDecanato()` | POST / PUT | `/decanatos/` , `/decanatos/{id}/` | JSON `{name}`. Bearer + rol. | 201 / 200 objeto `Decanato` (ignorado). Invalido -> 400. | mismas rutas | pendiente. `createdBy` mass assignment (BUG-DJANGO-007). |
| `Decant.activateDecanato()` | POST | `/decanatos/habilitar/{id}/` | `{}`. Bearer + rol. | 200 `{detail}`. | igual | pendiente. |
| `Decant.deleteDecanato()` | DELETE | `/decanatos/{id}/` | Bearer + rol. | **204 + body** `{detail}`. `isActive=False` + `deletedBy`, sin `deletedAt` (BUG-DJANGO-013). | igual | delta intencional (204 sin body; `deletedAt` siempre). |

## Colonias (como Decanatos, sin BUG-DJANGO-024)

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Endpoint NestJS | Estado |
|---|---|---|---|---|
| `Colony.getColoniasPaginated()` (admin) | GET | `/colonias/` (pagina bien) | `/colonias/` | pendiente. |
| `Colony.getAllColonias()` (`parishes.ts`) | GET | `/colonias/` (query `isActive=true`, sin `page` -> objeto paginado) | `/colonias/` | pendiente. |
| `Colony.getColoniaById()` (`parish-details`) | GET | `/colonias/{id}/` (404 si soft-deleted, BUG-DJANGO-022) | `/colonias/{id}/` | pendiente. |
| `Colony.createColonia()` / `updateColonia()` | POST / PUT | `/colonias/` , `/colonias/{id}/` (JSON `{name}`) | mismas | pendiente. |
| `Colony.activateColonia()` | POST | `/colonias/habilitar/{id}/` | igual | pendiente. |
| `Colony.deleteColonia()` | DELETE | `/colonias/{id}/` (204+body, sin `deletedAt`) | igual | delta intencional (204 sin body; `deletedAt`). |

## Parroquias

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Parish.getParroquiasPaginated()` (admin, `parish-search`) | GET | `/parroquias/` | Query `page`, `page_size`, `name?`, `town?`, `isActive?`. El FE **no** envia `colonia`. | 200 `{count, next, previous, results: Parroquia[]}` (pagina bien). | `/parroquias/` | pendiente. Filtro `colonia` roto (BUG-DJANGO-003), no dispararlo. |
| `Parish.getParroquiaById()` (`parish-details`) | GET | `/parroquias/{id}/` | — | 200 objeto `Parroquia` (FKs `decanatoId`/`coloniaId`/`padreId` = UUID string). | `/parroquias/{id}/` | pendiente. |
| `Parish.createParroquia()` / `updateParroquia()` | POST / PUT | `/parroquias/` , `/parroquias/{id}/` | `multipart`: `name, openingDate` (`YYYY-MM-DD`), `address, zipCode, town, coloniaId, decanatoId, padreId`, `picture?`. Bearer + rol. | 201 / 200 objeto `Parroquia` (ignorado). FK inexistente -> 400. | mismas rutas | pendiente. Validar existencia de FKs; `createdBy` mass assignment. |
| `Parish.activateParroquia()` | POST | `/parroquias/habilitar/{id}/` | `{}`. Bearer + rol. | 200 `{detail}`. | igual | pendiente. |
| `Parish.deleteParroquia()` | DELETE | `/parroquias/{id}/` | Bearer + rol. | **204 + body** `{detail}`. `isActive=False` + `deletedBy`, sin `deletedAt`. | igual | delta intencional (204 sin body; `deletedAt`). |

## Noticias

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Newspaper.getNoticiasPaginated()` (admin, `home`, `post-search`) | GET | `/noticias/` | Query `page`, `page_size`, `title?`, `tags?` (una cadena), `isActive?`. `home`: `page_size=10`, `isActive=true`. | 200 `{count, next, previous, results: Noticia[]}`. | `/noticias/` | pendiente. Busqueda `tags` sobre jsonb (BUG-DJANGO-011). |
| `Newspaper.getNoticiaById()` (`post-details`) | GET | `/noticias/{id}/` | — | 200 objeto `Noticia` (`tags[]`). | `/noticias/{id}/` | pendiente. |
| `Newspaper.createNoticia()` / `updateNoticia()` (admin) | POST / PUT | `/noticias/` , `/noticias/{id}/` | `multipart`: `title`, `content`, `tags` = **string JSON**, `picture?`. Bearer + rol. | 201 / 200 objeto `Noticia` (ignorado). | mismas rutas | pendiente. Aceptar `tags` string-JSON en multipart. |
| `Newspaper.activateNoticia()` (admin) | POST | `/noticias/habilitar/{id}/` | `{}`. Bearer + rol. | 200 `{detail}`. | igual | pendiente. |
| `Newspaper.deleteNoticia()` (admin) | DELETE | `/noticias/{id}/` | Bearer + rol. | **204 + body** `{detail}`. `isActive=False` + `deletedBy`, sin `deletedAt`. | igual | delta intencional. |

## Articulos (solo admin; sin ruta publica)

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Article.getArticulosPaginated()` | GET | `/articulos/` | Query `page`, `page_size`, `title?`, `tags?`, `isActive?`. | 200 `{count, next, previous, results: Articulo[]}`. | `/articulos/` | pendiente. |
| `Article.createArticulo()` / `updateArticulo()` | POST / PUT | `/articulos/` , `/articulos/{id}/` | **JSON** `{title, content, tags: string[]}`. Bearer + rol. | 201 / 200 objeto `Articulo` (ignorado). | mismas rutas | pendiente. `createdBy` mass assignment (BUG-DJANGO-007). |
| `Article.activateArticulo()` | POST | `/articulos/habilitar/{id}/` | `{}`. Bearer + rol. | 200 `{detail}`. | igual | pendiente. |
| `Article.deleteArticulo()` | DELETE | `/articulos/{id}/` | Bearer + rol. | **204 + body** `{detail}`. | igual | delta intencional. |

## Documentos (solo admin; sin ruta publica)

| Frontend | Metodo | Endpoint Django (`fe3fc98`) | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Document.getDocumentosPaginated()` | GET | `/documentos/` | Query `page`, `page_size`, `title?`, `tags?`, `type?` (uno de los 9), `isActive?`. | 200 `{count, next, previous, results: Documento[]}`. | `/documentos/` | pendiente. |
| `Document.createDocumento()` / `updateDocumento()` | POST / PUT | `/documentos/` , `/documentos/{id}/` | `multipart`: `title`, `type`, `tags` = **string JSON**, `document?` (pdf/ppt/pptx). Bearer + rol. | 201 / 200 objeto `Documento` (ignorado). | mismas rutas | pendiente. `validate_tags` (str->JSON); `createdBy` mass assignment. |
| `Document.activateDocumento()` | POST | `/documentos/habilitar/{id}/` | `{}`. Bearer + rol. | 200 `{detail}`. | igual | pendiente. |
| `Document.deleteDocumento()` | DELETE | `/documentos/{id}/` | Bearer + rol. | **204 + body** `{detail}`. | igual | delta intencional. |

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

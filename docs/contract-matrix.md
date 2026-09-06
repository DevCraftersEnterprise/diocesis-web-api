# Matriz de compatibilidad frontend <-> backend

Estado: **v1 (Tarea 0.2)**. Analisis estatico. La verificacion de respuestas reales
(byte a byte contra Django) es la Tarea 0.6/0.7.

Solo se listan los endpoints que el frontend consume hoy (catalogo completo en
`endpoints-inventory.md`). Cada fila es un contrato que NestJS debe respetar salvo el
delta anotado en **Estado** y justificado en `findings.md`.

`Estado`: `pendiente` (nada migrado) · `delta intencional` (se cambiara a proposito) ·
`bloqueado por <ID>`.

---

## Contrato transversal (aplica a todas las filas)

- **Base URL**: `environment.apiUrl` = `<host>/api`. Dev `http://127.0.0.1:8000/api`;
  prod `https://diocesis-backend.onrender.com/api`. **Todas las rutas terminan en `/`.**
- **Auth**: `authInterceptor` añade `Authorization: Bearer <access>` a **toda** peticion
  si hay token en `localStorage['token']`. No hay cookies, no hay CSRF.
- **Codigos de estado con trato especial en el FE**: `errorInterceptor` hace
  **logout global + redirect a `/login`** ante **401 o 403**. Cualquier otro codigo lo
  maneja el componente (toast generico). Implicaciones para NestJS:
  - Permiso denegado -> **403** (mantener).
  - Validacion -> **400** (`{ "<campo>": ["..."] }` o `{"error": "..."}`); **nunca** 401/403.
  - No encontrado -> **404**.
- **Paginacion**: el FE lee **`results`** (array) y **`count`** (numero). **No** lee
  `next`/`previous` (los recalcula `pagination.util`). -> En NestJS pueden ser `null` o
  relativos: **delta permitido**. El FE calcula `page = offset / limit + 1` y envia
  `page` + `page_size`.
- **Cuerpo de create/update**: el FE **ignora el body** de POST/PUT (solo toast + recarga
  la lista). Excepciones que SI leen el body: `login` (`access`), `loadProfile` (`User`
  completo), `home` (`results`), `post-details`, `parish-details`, `reverend-details`.
  -> Unificar `{mensaje,data}` -> objeto plano en usuarios es un **delta de bajo riesgo**
  (a decidir en la fase de usuarios).
- **Nombres de campos**: camelCase en request y response, **obligatorio**
  (`firstName`, `isActive`, `createdAt`, `decanatoId`, `zipCode`, ...).
- **Fechas**: `DateField` -> `YYYY-MM-DD`; `DateTimeField` -> ISO 8601 UTC. Formato exacto
  (microsegundos, sufijo `Z` vs offset) -> pendiente runtime.
- **`tags`**:
  - `noticias`, `documentos`: el FE lo envia como **string JSON** (`'["a","b"]'`) dentro
    de `multipart/form-data`.
  - `articulos`: el FE lo envia como **array JSON** dentro de un body `application/json`.
  - En la respuesta `tags` es **siempre un array**.
- **Subida de archivos**: `multipart/form-data`; campo de archivo = `picture` (padres,
  parroquias, noticias), `document` (documentos), `url` (carrusel). El backend sube a
  Cloudinary y guarda el `secure_url` (string) en el campo.

---

## Autenticacion

| Frontend | Metodo | Endpoint Django | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Auth.login()` (`login.ts`) | POST | `/token/login/` | JSON `{username, password}`. Sin auth. | 200 `{access, refresh}`. El FE guarda `access`. Credenciales invalidas -> 401 `{detail}` (el FE muestra mensaje fijo). | `/token/login/` | pendiente |
| `Auth.loadProfile()` (`layout.ts` admin) | GET | `/users/usuarios/{id}/` | `id` = `user_id` del JWT. Bearer. | 200 objeto `User` (`id, username, email, role, isActive, createdAt, updatedAt, deletedAt, updatedBy, deletedBy`). | `/users/usuarios/{id}/` | pendiente |

`/token/refresh/` no se usa.

## Usuarios (`/dashboard/users`)

| Frontend | Metodo | Endpoint Django | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Users.getUsersPaginated()` | GET | `/users/usuarios/` | Query `page`, `page_size`, `username?` (icontains), `isActive?` (`true`/`false`). Bearer. | 200 `{count, next, previous, results: User[]}`. Excluye al usuario actual. Orden `username`. | `/users/usuarios/` | pendiente. Reforzar rol admin/super (BUG-DJANGO-008). |
| `Users.createUser()` | POST | `/users/usuarios/` | JSON `{username, email, role, password}` (`role` = `admin`\|`user`). Bearer. | 201 `{mensaje, data: User}` (FE ignora body). `admin`->`super` = 403. Duplicado = 400 `{error}`. | `/users/usuarios/` | pendiente. Validar con DTO (BUG-DJANGO-009). Body de respuesta unificable. |
| `Users.updateUser()` | PUT | `/users/usuarios/{id}/` | JSON `{username, email, role}` (sin password). Bearer. | 200 `{mensaje, data: User}` (FE ignora body). | `/users/usuarios/{id}/` | pendiente. Añadir gate admin/super (BUG-DJANGO-021). |
| `Users.changeUserStatus()` | PUT | `/users/usuarios/cambiar-estado/{id}/` | Body `{}`. Bearer. | 200 `{mensaje}`. Toggle `isActive`+`is_active`. | igual | pendiente. |
| `Users.createUsersByCsv()` | POST | `/users/usuarios/cargar-por-csv/` **(hoy 404)** | `multipart` campo `archivo_csv` (`text/csv`). Bearer. | Hoy **404** (BUG-DJANGO-006). Backend real: 200 `{mensaje, creados[], errores[]}`. | `/users/usuarios/cargar-csv/` **+ alias `/cargar-por-csv/`** | delta intencional (alias). |

## Carrusel

| Frontend | Metodo | Endpoint Django | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Carousel.getAll()` (`home`, admin) | GET | `/carrusel/` | Sin auth. | 200 **array** `Carrusel[]` (`id, url, isImage, createdAt, createdBy, isActive`), solo `isActive=true`, orden `-createdAt`. | `/carrusel/` | pendiente. |
| `Carousel.create()` (admin) | POST | `/carrusel/` | `multipart`: `url` = archivo, `isImage` = `"true"`/`"false"`. Bearer + rol. | 201 objeto `Carrusel`. Error -> 400 `{error}`. | `/carrusel/` | pendiente. Validar contenido (SECURITY-008). |
| `Carousel.delete()` (admin) | DELETE | `/carrusel/{id}/` | Bearer + rol. | **204 + body** `{detail}` (FE lo ignora). | `/carrusel/{id}/` | delta intencional (204 sin body). |

## Padres / Reverends

| Frontend | Metodo | Endpoint Django | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Reverends.getPadresPaginated()` (admin, `reverend-search`) | GET | `/padres/` | Query `page`, `page_size`, `firstName?`, `lastName?`, `isActive?`. Publico: `isActive=true`. | 200 `{count, next, previous, results: Padre[]}`. | `/padres/` | pendiente. |
| `Reverends.getAllPadres()` (`parishes.ts`) | GET | `/padres/` | Query `isActive=true` (**sin** `page`/`page_size`). | 200 **array** `Padre[]` (paginacion condicional). El FE usa `Array.isArray(res)`. | `/padres/` | pendiente. **Delta prohibido**: sin `page` debe devolver array (APIC-003). |
| `Reverends.getPadreById()` (`reverend-details`, `parish-details`) | GET | `/padres/{id}/` | — | 200 objeto `Padre` (`id, firstName, lastName, birthDate, isActive, picture?, email?, facebook?, twitter?, instagram?, createdAt, updatedAt, deletedAt, updatedBy, deletedBy`). | `/padres/{id}/` | pendiente. |
| `Reverends.createPadre()` / `updatePadre()` (admin) | POST / PUT | `/padres/` , `/padres/{id}/` | `multipart`: `firstName, lastName, birthDate` (`YYYY-MM-DD`), `email, facebook, instagram, twitter` (cadena vacia si no hay valor), `picture` (solo si hay archivo nuevo). Bearer + rol. | 201 / 200 objeto `Padre` (FE ignora body). Invalido -> 400 `{campo:[...]}`. | mismas rutas | pendiente. Normalizar `""` -> null en opcionales. |
| `Reverends.activatePadre()` (admin) | POST | `/padres/habilitar/{id}/` | Body `{}`. Bearer + rol. | 200 `{detail}`. `isActive=False` requerido -> 404 si ya activo. | igual | pendiente. |
| `Reverends.deletePadre()` (admin) | DELETE | `/padres/{id}/` | Bearer + rol. | **204 + body** `{detail}` (ignorado). Soft-delete. | igual | delta intencional (204 sin body). |

## Decanatos

| Frontend | Metodo | Endpoint Django | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Decant.getDecanatosPaginated()` (admin) | GET | `/decanatos/` | Query `page`, `page_size`, `name?`, `isActive?`. | 200 `{count, next, previous, results: Decanato[]}`. | `/decanatos/` | pendiente. |
| `Decant.getAllDecanatos()` (`parishes.ts`) | GET | `/decanatos/` | Query `isActive=true` (sin `page`). | 200 `{count, next, previous, results: Decanato[]}` (decanatos **siempre** pagina). El FE lee `res.results`/`res.count`. | `/decanatos/` | pendiente. **Asimetria con `/padres/`** (APIC-003). |
| `Decant.getDecanatoById()` (`parish-details`) | GET | `/decanatos/{id}/` | — | 200 objeto `Decanato`. `isActive=True` requerido -> **404 si soft-deleted** (BUG-DJANGO-022). | `/decanatos/{id}/` | pendiente. |
| `Decant.createDecanato()` / `updateDecanato()` | POST / PUT | `/decanatos/` , `/decanatos/{id}/` | JSON `{name}`. Bearer + rol. | 201 / 200 objeto `Decanato` (ignorado). Invalido -> 400. | mismas rutas | pendiente. `createdBy` mass assignment (BUG-DJANGO-007). |
| `Decant.activateDecanato()` | POST | `/decanatos/habilitar/{id}/` | `{}`. Bearer + rol. | 200 `{detail}`. | igual | pendiente. |
| `Decant.deleteDecanato()` | DELETE | `/decanatos/{id}/` | Bearer + rol. | **204 + body** `{detail}` (ignorado). Soft-delete **sin `deletedAt`** (BUG-DJANGO-013). | igual | delta intencional (204 sin body, `deletedAt` siempre). |

## Colonias (identico a Decanatos)

| Frontend | Metodo | Endpoint Django | Endpoint NestJS | Estado |
|---|---|---|---|---|
| `Colony.getColoniasPaginated()` (admin) | GET | `/colonias/` | `/colonias/` | pendiente (como Decanatos). |
| `Colony.getAllColonias()` (`parishes.ts`) | GET | `/colonias/` (query `isActive=true`, sin `page` -> objeto paginado) | `/colonias/` | pendiente. |
| `Colony.getColoniaById()` (`parish-details`) | GET | `/colonias/{id}/` (404 si soft-deleted, BUG-DJANGO-022) | `/colonias/{id}/` | pendiente. |
| `Colony.createColonia()` / `updateColonia()` | POST / PUT | `/colonias/` , `/colonias/{id}/` (JSON `{name}`) | mismas | pendiente. |
| `Colony.activateColonia()` | POST | `/colonias/habilitar/{id}/` | igual | pendiente. |
| `Colony.deleteColonia()` | DELETE | `/colonias/{id}/` (204 + body, sin `deletedAt`) | igual | delta intencional (204 sin body, `deletedAt`). |

## Parroquias

| Frontend | Metodo | Endpoint Django | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Parish.getParroquiasPaginated()` (admin, `parish-search`) | GET | `/parroquias/` | Query `page`, `page_size`, `name?`, `town?` (solo admin), `isActive?`. El FE **no** envia `colonia`. | 200 `{count, next, previous, results: Parroquia[]}`. | `/parroquias/` | pendiente. |
| `Parish.getParroquiaById()` (`parish-details`) | GET | `/parroquias/{id}/` | — | 200 objeto `Parroquia` (`id, name, openingDate, address, zipCode, town, isActive, picture?, decanatoId, coloniaId, padreId, createdAt, createdBy, updatedAt, updatedBy, deletedAt, deletedBy`). FKs = UUID string. | `/parroquias/{id}/` | pendiente. |
| `Parish.createParroquia()` / `updateParroquia()` | POST / PUT | `/parroquias/` , `/parroquias/{id}/` | `multipart`: `name, openingDate` (`YYYY-MM-DD`), `address, zipCode, town, coloniaId, decanatoId, padreId`, `picture?`. Bearer + rol. | 201 / 200 objeto `Parroquia` (ignorado). Invalido / FK inexistente -> 400. | mismas rutas | pendiente. Validar existencia de FKs; `createdBy` mass assignment. |
| `Parish.activateParroquia()` | POST | `/parroquias/habilitar/{id}/` | `{}`. Bearer + rol. | 200 `{detail}`. | igual | pendiente. |
| `Parish.deleteParroquia()` | DELETE | `/parroquias/{id}/` | Bearer + rol. | **204 + body** `{detail}` (ignorado). Soft-delete **sin `deletedAt`**. | igual | delta intencional (204 sin body, `deletedAt`). |

## Noticias

| Frontend | Metodo | Endpoint Django | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Newspaper.getNoticiasPaginated()` (admin, `home`, `post-search`) | GET | `/noticias/` | Query `page`, `page_size`, `title?`, `tags?` (una cadena), `isActive?`. `home`: `page_size=10`, `isActive=true`. | 200 `{count, next, previous, results: Noticia[]}`. | `/noticias/` | pendiente. Busqueda `tags` sobre jsonb (BUG-DJANGO-011). |
| `Newspaper.getNoticiaById()` (`post-details`) | GET | `/noticias/{id}/` | — | 200 objeto `Noticia` (`id, title, picture?, content, tags[], isActive, createdAt, updatedAt, deletedAt, createdBy, updatedBy, deletedBy`). | `/noticias/{id}/` | pendiente. |
| `Newspaper.createNoticia()` / `updateNoticia()` (admin) | POST / PUT | `/noticias/` , `/noticias/{id}/` | `multipart`: `title`, `content`, `tags` = **string JSON** `'["a","b"]'`, `picture?`. Bearer + rol. | 201 / 200 objeto `Noticia` (ignorado). | mismas rutas | pendiente. Aceptar `tags` string-JSON en multipart. |
| `Newspaper.activateNoticia()` (admin) | POST | `/noticias/habilitar/{id}/` | `{}`. Bearer + rol. | 200 `{detail}`. | igual | pendiente. |
| `Newspaper.deleteNoticia()` (admin) | DELETE | `/noticias/{id}/` | Bearer + rol. | **204 + body** `{detail}` (ignorado). Soft-delete sin `deletedAt`. | igual | delta intencional. |

## Articulos (solo admin; sin ruta publica)

| Frontend | Metodo | Endpoint Django | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Article.getArticulosPaginated()` | GET | `/articulos/` | Query `page`, `page_size`, `title?`, `tags?`, `isActive?`. | 200 `{count, next, previous, results: Articulo[]}`. | `/articulos/` | pendiente. |
| `Article.createArticulo()` / `updateArticulo()` | POST / PUT | `/articulos/` , `/articulos/{id}/` | **JSON** `{title, content, tags: string[]}` (`tags` array real). Bearer + rol. | 201 / 200 objeto `Articulo` (ignorado). | mismas rutas | pendiente. `createdBy` mass assignment (BUG-DJANGO-007). |
| `Article.activateArticulo()` | POST | `/articulos/habilitar/{id}/` | `{}`. Bearer + rol. | 200 `{detail}`. | igual | pendiente. |
| `Article.deleteArticulo()` | DELETE | `/articulos/{id}/` | Bearer + rol. | **204 + body** `{detail}` (ignorado). | igual | delta intencional. |

## Documentos (solo admin; sin ruta publica)

| Frontend | Metodo | Endpoint Django | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| `Document.getDocumentosPaginated()` | GET | `/documentos/` | Query `page`, `page_size`, `title?`, `tags?`, `type?` (uno de los 9), `isActive?`. | 200 `{count, next, previous, results: Documento[]}`. | `/documentos/` | pendiente. |
| `Document.createDocumento()` / `updateDocumento()` | POST / PUT | `/documentos/` , `/documentos/{id}/` | `multipart`: `title`, `type`, `tags` = **string JSON**, `document?` (pdf/ppt/pptx). Bearer + rol. | 201 / 200 objeto `Documento` (ignorado). | mismas rutas | pendiente. `validate_tags` (str->JSON); `createdBy` mass assignment. |
| `Document.activateDocumento()` | POST | `/documentos/habilitar/{id}/` | `{}`. Bearer + rol. | 200 `{detail}`. | igual | pendiente. |
| `Document.deleteDocumento()` | DELETE | `/documentos/{id}/` | Bearer + rol. | **204 + body** `{detail}` (ignorado). | igual | delta intencional. |

---

## Deltas intencionales previstos (resumen)

| Delta | Endpoints afectados | Justificacion |
|---|---|---|
| 204 **sin** body en DELETE | 17, 23, 30, 37, 44, 51, 57, 63 | 204 no debe llevar cuerpo (HTTP). El FE ignora el body. |
| `next`/`previous` = `null` o relativos | todos los GET de lista | El FE no los usa. |
| Respuesta de create/update de usuarios como objeto plano (no `{mensaje,data}`) | 4, 6 | El FE ignora el body. A decidir en la fase de usuarios; por defecto se mantiene. |
| Alias de ruta `/users/usuarios/cargar-por-csv/` -> `/cargar-csv/` | 12 | El FE llama a una ruta que hoy da 404 (BUG-DJANGO-006). |
| `deletedAt` siempre en soft-delete | 30, 37, 44, 51, 57, 63 | Coherencia de auditoria (BUG-DJANGO-013). No observable por el FE. |
| Errores de negocio sin `str(e)` | varios | No filtrar internals (BUG-DJANGO-004). |

## Restricciones que NO se pueden cambiar (deltas prohibidos)

- `/padres/` sin `page`/`page_size` -> **array plano** (lo consume `parishes.ts`).
- Campos y estructura en camelCase, exactamente como hoy.
- 403 para permiso denegado (el FE cierra sesion; cambiarlo a 401 tambien lo haria, pero
  a otra cosa NO).
- Rutas y verbos HTTP identicos, con `/` final.
- `access` como clave del token en la respuesta de `/token/login/`; claim `user_id` en el JWT.

## Puntos a confirmar en runtime (Tareas 0.6/0.7)

- Formato exacto de fechas en las respuestas (microsegundos, `Z` vs offset).
- Cuerpo exacto del 404 de paginacion fuera de rango y de los 401/403 de simplejwt/DRF.
- Serializacion de `picture`/`document` en null vs cadena vacia vs URL.
- Comportamiento de `tags` string-JSON en multipart contra el `JSONField` de DRF.
- Orden de claves en los objetos (no deberia importar al FE; confirmar).

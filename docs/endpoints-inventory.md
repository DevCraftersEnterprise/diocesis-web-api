# Inventario de endpoints

Estado: **v1 (Tarea 0.2)**. Construido por analisis estatico de `diocesis-backend-python`
y `diocesis-frontend-material` (servicios + componentes). Lo que solo se confirma con una
respuesta real (forma de `next`/`previous`, orden de claves, formato de fechas, cuerpo
exacto de errores) va marcado `pendiente runtime (0.6/0.7)`.

Fuentes: `config/urls.py`, `apps/*/urls.py`, `apps/*/views.py`, `apps/*/serializers.py`,
`apps/*/models.py`; frontend `src/app/**/services/*.ts`, `src/app/**/*.ts` (componentes),
`core/interceptors/*`.

## Leyenda

- **Auth**: `Publico` = sin token (`AllowAny`) · `JWT` = token requerido · `JWT + rol` =
  token y ademas `es_admin_o_super()` dentro de la vista (rol `admin`/`super`); si no ->
  `403 {"detail": ...}`.
- **Paginacion** (GET de listas): `siempre` = DRF `{count,next,previous,results}` ·
  `condicional` = paginado solo si llega `page`/`page_size`, si no array plano · `no` =
  array plano siempre.
- Prefijo global `/api`. Todas las rutas terminan en `/`.

## Como consume el frontend (resumen)

- **Admin** (`/dashboard/*`): edita SIEMPRE desde la fila de la lista; nunca hace
  *fetch-by-id*. Por eso los `getXById()` de los servicios admin (articulos, documentos,
  carrusel) no se invocan.
- **Publico**: `post-details`, `reverend-details`, `parish-details` SI usan *fetch-by-id*
  (`/noticias/{id}/`, `/padres/{id}/`, `/parroquias/{id}/`, y desde parroquia
  `/decanatos/{id}/`, `/colonias/{id}/`, `/padres/{id}/`).
- `parishes.ts` (admin) carga listas completas de padres/colonias/decanatos con
  `getAll*({isActive:true})` (sin `page`) para resolver nombres de FK en la tabla.

## Autenticacion — `/api/token/`

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 1 | POST | `/token/login/` | `CustomTokenObtainPairView` (= `TokenObtainPairView`) | Publico | `Auth.login()` | Body `{username,password}` -> `{access,refresh}`. `access` 8h, `refresh` 1d. Claim `user_id` (UUID). El FE solo guarda `access` en `localStorage['token']`. Credenciales invalidas -> 401 `{"detail": ...}`. |
| 2 | POST | `/token/refresh/` | `TokenRefreshView` | Publico | — sin uso | El FE nunca refresca (en 401/403 hace logout). Mantener por paridad. |

## Usuarios — `/api/users/`

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 3 | GET | `/users/usuarios/` | `UsuarioAPIView.get` | JWT | `Users.getUsersPaginated()` | Paginacion `siempre`. Excluye al propio usuario. Orden `username`. Filtros: `username` (icontains), `isActive` (`true`/`false`). BUG-DJANGO-008 (cualquier rol lista usuarios con email/rol). |
| 4 | POST | `/users/usuarios/` | `UsuarioAPIView.post` | JWT + rol | `Users.createUser()` | Body JSON `{username,email,role,password}` (`role` = `admin`\|`user` desde la UI). No valida con serializer. Respuesta `{"mensaje":...,"data":<user>}` **201** (el FE ignora el body). `admin` no crea `super` -> 403. Username duplicado -> 400 `{"error":...}`. BUG-DJANGO-009. |
| 5 | GET | `/users/usuarios/{id}/` | `UsuarioAPIView.get` (pk) | JWT | `Auth.loadProfile()` | Objeto `User`. Sin filtro `isActive`. Lo llama `layout.ts` admin con el `user_id` del JWT. BUG-DJANGO-008 (IDOR). |
| 6 | PUT | `/users/usuarios/{id}/` | `UsuarioAPIView.put` | JWT | `Users.updateUser()` | `partial`. El FE envia solo `{username,email,role}` (sin password). Respuesta `{"mensaje":...,"data":<user>}` **200** (ignorada). El serializer descarta `password` si llega (BUG-DJANGO-010: sin impacto actual, no hay UI de password). Unica regla de rol: `admin` no edita `super`. BUG-DJANGO-021 (falta gate admin/super). |
| 7 | DELETE | `/users/usuarios/{id}/` | `UsuarioAPIView.delete` | JWT | — sin uso | Soft-delete (`isActive`,`deletedAt`,`deletedBy`), no toca `is_active` -> BUG-DJANGO-020. `{"mensaje":...}` **200**. BUG-DJANGO-021. |
| 8 | PUT | `/users/usuarios/cambiar-estado/{id}/` | `HabilitarUsuarioView.put` | JWT + rol | `Users.changeUserStatus()` | Toggle de `isActive` (+ sincroniza `is_active`). Body `{}`. `{"mensaje":"Usuario X ha sido activado/desactivado..."}` 200. No idempotente. |
| 9 | PUT | `/users/usuarios/change-password/` | `ChangePasswordView.put` | JWT | — sin uso (FE-001) | Sobre `request.user`. Body `{"new_password":...}`. Sin verificar contrasena actual ni validadores -> BUG-DJANGO-005. `{"mensaje":...}` 200; falta campo -> 400 `{"error":...}`. |
| 10 | POST | `/users/usuarios/reset-password/{id}/` | `ResetPasswordView.post` | JWT + rol | — sin uso (FE-001) | BUG-DJANGO-002: contrasena = `username`. `{"mensaje":...}` 200. |
| 11 | GET | `/users/usuarios/me/` | `UsuarioPerfilView.get` | JWT | — sin uso | Devuelve el `User` autenticado. |
| 12 | POST | `/users/usuarios/cargar-csv/` | `CrearUsuariosPorCsvView.post` | JWT + rol | `Users.createUsersByCsv()` llama a `/cargar-por-csv/` | BUG-DJANGO-006: ruta FE (`/cargar-por-csv/`) != backend (`/cargar-csv/`) -> **404 en prod**. Campo `archivo_csv` (multipart, `text/csv`). Backend real: `{"mensaje","creados":[],"errores":[]}` 200. |

## Carrusel — `/api/carrusel/`

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 13 | GET | `/carrusel/` | `CarruselView.get` | Publico | `Carousel.getAll()` (`home`, admin) | Array plano (`no` paginacion). Solo `isActive=True`. Orden `-createdAt`. El FE re-filtra `isActive` en cliente. |
| 14 | POST | `/carrusel/` | `CarruselView.post` | JWT + rol | `Carousel.create()` | Multipart. Campo `url` = archivo; `isImage` = `"true"`/`"false"` (`String(file.type.startsWith('image/'))`). Valida img (jpg/jpeg/png/webp <=5MB) o video (mp4/mov/webm <=100MB) por ext+mime+size (SECURITY-008). Cloudinary (BUG-DJANGO-015). `<carrusel>` **201**. Error -> 400 `{"error":...}` (a veces `str(e)` -> BUG-DJANGO-004; el FE lo pasa tal cual a toastr -> FE-003). |
| 15 | GET | `/carrusel/{id}/` | `CarruselView.get` (pk) | Publico | — sin uso | Sin filtro `isActive`. |
| 16 | PUT | `/carrusel/{id}/` | `CarruselView.put` | JWT + rol | — sin uso | Multipart; `url`/`isImage` opcionales. `<carrusel>` 200. |
| 17 | DELETE | `/carrusel/{id}/` | `CarruselView.delete` | JWT + rol | `Carousel.delete()` | Soft-delete. `{"detail":"Elemento desactivado correctamente."}` con **204 + body** (APIC-002). |
| 18 | POST | `/carrusel/habilitar/{id}/` | `HabilitarCarruselView.post` | JWT + rol | — sin uso | `get_object_or_404(pk, isActive=False)`. `{"detail":...}` 200. |

## Padres — `/api/padres/`

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 19 | GET | `/padres/` | `PadreView.get` | Publico | `Reverends.getPadresPaginated()`, `getAllPadres()` | Paginacion **`condicional`** (APIC-003): con `page`/`page_size` -> `{count,...,results}`; sin ellos -> **array plano**. `getPadresPaginated` (admin, `reverend-search`) envia `page`+`page_size`. `getAllPadres({isActive:true})` (SIN page) lo usa `parishes.ts` -> **depende de recibir array plano**. Orden `firstName,lastName`. Filtros: `isActive`, `firstName`/`lastName` (icontains), `birthDay`+`birthMonth`. |
| 20 | GET | `/padres/{id}/` | `PadreView.get` (pk) | Publico | `Reverends.getPadreById()` | Objeto `Padre`. Sin filtro `isActive`. Usado por `reverend-details`, `parish-details`. |
| 21 | POST | `/padres/` | `PadreView.post` | JWT + rol | `Reverends.createPadre()` | Multipart. Campos `firstName`,`lastName`,`birthDate` (`YYYY-MM-DD`), `email`,`facebook`,`instagram`,`twitter` (cadena vacia si no hay valor), `picture?` (solo si hay archivo). `picture`->Cloudinary. `<padre>` **201** / errores serializer **400**. |
| 22 | PUT | `/padres/{id}/` | `PadreView.put` | JWT + rol | `Reverends.updatePadre()` | Multipart, `partial`. Mismos campos; `picture` solo si hay archivo nuevo. `<padre>` 200 / 400. |
| 23 | DELETE | `/padres/{id}/` | `PadreView.delete` | JWT + rol | `Reverends.deletePadre()` | Soft-delete (isActive,deletedAt,deletedBy). `{"detail":"Padre desactivado correctamente."}` **204 + body**. |
| 24 | POST | `/padres/habilitar/{id}/` | `HabilitarPadreView.post` | JWT + rol | `Reverends.activatePadre()` | `get_object_or_404(pk, isActive=False)` -> 404 si ya activo. `{"detail":...}` 200. |
| 25 | POST | `/padres/cargar-csv/` | `CargarPadresPorCSV.post` | JWT + rol | — sin uso | Campo `archivo_csv`. `{"creados":[],"errores":[]}` 200. |

## Decanatos — `/api/decanatos/`

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 26 | GET | `/decanatos/` | `DecanatoView.get` | Publico | `Decant.getDecanatosPaginated()`, `getAllDecanatos()` | Paginacion `siempre` (aun sin `page`). Orden `-createdAt`. Filtros: `name` (icontains), `isActive` (`true`/`false`/otro->sin filtro). `getAllDecanatos({isActive:true})` lo usa `parishes.ts` y funciona porque SIEMPRE devuelve `{count,...,results}`. **Asimetria con `/padres/`** (APIC-003). |
| 27 | GET | `/decanatos/{id}/` | `DecanatoView.get` (pk) | Publico | `Decant.getDecanatoById()` | `get_object_or_404(pk, isActive=True)` -> **404 si soft-deleted** -> rompe `parish-details` (BUG-DJANGO-022). Usado por `parish-details`. |
| 28 | POST | `/decanatos/` | `DecanatoView.post` | JWT + rol | `Decant.createDecanato()` | Body JSON `{name}`. `<decanato>` **201** / 400. BUG-DJANGO-007. |
| 29 | PUT | `/decanatos/{id}/` | `DecanatoView.put` | JWT + rol | `Decant.updateDecanato()` | `get_object_or_404(pk, isActive=True)`, `partial`. Body JSON `{name}`. `<decanato>` 200 / 400. |
| 30 | DELETE | `/decanatos/{id}/` | `DecanatoView.delete` | JWT + rol | `Decant.deleteDecanato()` | `isActive=True` requerido. Soft-delete: isActive, deletedBy, **sin `deletedAt`** (BUG-DJANGO-013). `{"detail":"Decanato desactivado correctamente."}` **204 + body**. |
| 31 | POST | `/decanatos/cargar-csv/` | `CargarDecanatosPorCSV.post` | JWT + rol | — sin uso | Campo `archivo_csv`. `{"creados":[],"errores":[]}` 200. |
| 32 | POST | `/decanatos/habilitar/{id}/` | `HabilitarDecanatoView.post` | JWT + rol | `Decant.activateDecanato()` | `get_object_or_404(pk, isActive=False)`. `{"detail":...}` 200. |

## Colonias — `/api/colonias/`  (estructura identica a Decanatos)

Vistas `ColoniaView` + `CargarColoniaPorCSV` + `HabilitarColoniaView`.

| # | Metodo | Ruta | FE | Notas |
|---|---|---|---|---|
| 33 | GET | `/colonias/` | `Colony.getColoniasPaginated()`, `getAllColonias()` | Igual que #26 (`getAllColonias` usado por `parishes.ts`). |
| 34 | GET | `/colonias/{id}/` | `Colony.getColoniaById()` | Igual que #27 (404 si soft-deleted -> BUG-DJANGO-022). Usado por `parish-details`. |
| 35 | POST | `/colonias/` | `Colony.createColonia()` | Igual que #28. Body JSON `{name}`. |
| 36 | PUT | `/colonias/{id}/` | `Colony.updateColonia()` | Igual que #29. |
| 37 | DELETE | `/colonias/{id}/` | `Colony.deleteColonia()` | Igual que #30. Mensaje con typo: `"Colobia desactivado correctamente."` |
| 38 | POST | `/colonias/cargar-csv/` | — sin uso | Igual que #31. |
| 39 | POST | `/colonias/habilitar/{id}/` | `Colony.activateColonia()` | Igual que #32. |

## Parroquias — `/api/parroquias/`

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 40 | GET | `/parroquias/` | `ParroquiaView.get` | Publico | `Parish.getParroquiasPaginated()` | Paginacion `siempre`. Orden `-createdAt`. Filtros usados por el FE: `name` (icontains), `town` (icontains, solo admin), `isActive`. El filtro `colonia` existe en backend pero **el FE nunca lo envia** -> BUG-DJANGO-003 no se dispara hoy. Publico envia `name`, `isActive=true`. |
| 41 | GET | `/parroquias/{id}/` | `ParroquiaView.get` (pk) | Publico | `Parish.getParroquiaById()` | Objeto `Parroquia` (`fields=__all__`: `decanatoId`,`coloniaId`,`padreId` como UUID string, `picture`, base camelCase). Sin filtro `isActive`. `parish-details` luego pide decanato/padre/colonia por id. |
| 42 | POST | `/parroquias/` | `ParroquiaView.post` | JWT + rol | `Parish.createParroquia()` | Multipart. Campos `name`,`openingDate` (`YYYY-MM-DD`),`address`,`zipCode`,`town`,`coloniaId`,`decanatoId`,`padreId`,`picture?`. FKs `decanatoId/coloniaId/padreId` = `PROTECT`. `<parroquia>` **201** / 400. BUG-DJANGO-007. |
| 43 | PUT | `/parroquias/{id}/` | `ParroquiaView.put` | JWT + rol | `Parish.updateParroquia()` | Multipart, `partial`. `<parroquia>` 200 / 400. |
| 44 | DELETE | `/parroquias/{id}/` | `ParroquiaView.delete` | JWT + rol | `Parish.deleteParroquia()` | `get_object_or_404(pk)` (sin filtro). Soft-delete: isActive, deletedBy, **sin `deletedAt`** (BUG-DJANGO-013). `{"detail":"Parroquia desactivada correctamente."}` **204 + body**. |
| 45 | POST | `/parroquias/habilitar/{id}/` | `HabilitarParroquiaView.post` | JWT + rol | `Parish.activateParroquia()` | `get_object_or_404(pk, isActive=False)`. `{"detail":...}` 200. |
| 46 | POST | `/parroquias/cargar-csv/` | `CargarParroquiasPorCSV.post` | JWT + rol | — sin uso | Campo `archivo_csv`. `{"creados":[],"errores":[]}` 200. |

## Noticias — `/api/noticias/`

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 47 | GET | `/noticias/` | `NoticiaView.get` | Publico | `Newspaper.getNoticiasPaginated()` | Paginacion `siempre`. Orden `-createdAt`. Filtros: `title` (icontains), `tags` (una cadena; SQL crudo jsonb ILIKE, **solo Postgres** -> BUG-DJANGO-011), `isActive`. `home` pide `page_size=10`, `isActive=true`; `post-search` añade `title`/`tags`. |
| 48 | GET | `/noticias/{id}/` | `NoticiaView.get` (pk) | Publico | `Newspaper.getNoticiaById()` | Objeto `Noticia` (`tags` array). Sin filtro `isActive`. `post-details` lee `title,content,tags,picture,createdAt,updatedAt`. |
| 49 | POST | `/noticias/` | `NoticiaView.post` | JWT + rol | `Newspaper.createNoticia()` | Multipart. Campos `title`,`content`,`tags` = **string JSON** `'["a","b"]'`, `picture?`. `<noticia>` **201** / 400. BUG-DJANGO-007. |
| 50 | PUT | `/noticias/{id}/` | `NoticiaView.put` | JWT + rol | `Newspaper.updateNoticia()` | Multipart, `partial`. `<noticia>` **200** / 400. |
| 51 | DELETE | `/noticias/{id}/` | `NoticiaView.delete` | JWT + rol | `Newspaper.deleteNoticia()` | Soft-delete: isActive, deletedBy, **sin `deletedAt`**. `{"detail":"Noticia desactivada correctamente."}` **204 + body**. |
| 52 | POST | `/noticias/habilitar/{id}/` | `HabilitarNoticiaView.post` | JWT + rol | `Newspaper.activateNoticia()` | `get_object_or_404(pk, isActive=False)`. `{"detail":...}` 200. |

## Articulos — `/api/articulos/`  (solo admin; sin ruta publica)

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 53 | GET | `/articulos/` | `ArticuloView.get` | Publico | `Article.getArticulosPaginated()` | Paginacion `siempre`. Filtros: `title`, `tags` (jsonb, BUG-DJANGO-011), `isActive`. |
| 54 | GET | `/articulos/{id}/` | `ArticuloView.get` (pk) | Publico | — sin uso | `Article.getArticuloById()` definido pero no se invoca (el admin edita desde la fila). |
| 55 | POST | `/articulos/` | `ArticuloView.post` | JWT + rol | `Article.createArticulo()` | **Body JSON** `{title,content,tags: string[]}` (`tags` array real). `<articulo>` **201** / 400. BUG-DJANGO-007. |
| 56 | PUT | `/articulos/{id}/` | `ArticuloView.put` | JWT + rol | `Article.updateArticulo()` | Body JSON, `partial`. `<articulo>` **200** / 400 (con `print`). |
| 57 | DELETE | `/articulos/{id}/` | `ArticuloView.delete` | JWT + rol | `Article.deleteArticulo()` | Soft-delete: isActive, deletedBy, **sin `deletedAt`**. `{"detail":"Articulo desactivado correctamente."}` **204 + body**. |
| 58 | POST | `/articulos/habilitar/{id}/` | `HabilitarArticuloView.post` | JWT + rol | `Article.activateArticulo()` | `get_object_or_404(pk, isActive=False)`. `{"detail":...}` 200. |

## Documentos — `/api/documentos/`  (solo admin; sin ruta publica)

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 59 | GET | `/documentos/` | `DocumentoView.get` | Publico | `Document.getDocumentosPaginated()` | Paginacion `siempre`. Filtros: `title`, `tags` (jsonb, BUG-DJANGO-011), `type` (exacto, uno de los 9), `isActive`. |
| 60 | GET | `/documentos/{id}/` | `DocumentoView.get` (pk) | Publico | — sin uso | `Document.getDocumentoById()` definido pero no se invoca. |
| 61 | POST | `/documentos/` | `DocumentoView.post` | JWT + rol | `Document.createDocumento()` | Multipart. Campos `title`, `type` (carta/circular/comunicado/prensa/decreto/instruccion/mensaje/dominical/rescripto), `tags` = **string JSON** (`validate_tags`: str->JSON), `document?` (pdf/ppt/pptx -> Cloudinary `raw`). `<documento>` **201** / 400. BUG-DJANGO-007. |
| 62 | PUT | `/documentos/{id}/` | `DocumentoView.put` | JWT + rol | `Document.updateDocumento()` | Multipart, `partial`. `<documento>` **200** / 400. |
| 63 | DELETE | `/documentos/{id}/` | `DocumentoView.delete` | JWT + rol | `Document.deleteDocumento()` | Soft-delete: isActive, deletedBy, **sin `deletedAt`**. `{"detail":"Documento desactivado correctamente."}` **204 + body**. |
| 64 | POST | `/documentos/habilitar/{id}/` | `HabilitarDocumentoView.post` | JWT + rol | `Document.activateDocumento()` | `get_object_or_404(pk, isActive=False)`. `{"detail":...}` 200. |

## Django Admin

| # | Metodo | Ruta | Auth | FE | Notas |
|---|---|---|---|---|---|
| 65 | * | `/admin/` | Sesion Django | — | Sin `ModelAdmin` registrados. Fuera de alcance salvo decision contraria. |

## Endpoints sin consumidor en el frontend

2, 7, 9, 10, 11, 15, 16, 18, 25, 31, 38, 46, 54, 60, 65. Los servicios
`Article.getArticuloById()` y `Document.getDocumentoById()` existen pero no se invocan (el
admin edita desde la fila de la lista). El #12 (`/users/usuarios/cargar-csv/`) existe pero
el FE llama a `/cargar-por-csv/` -> roto (BUG-DJANGO-006).

## Comportamiento DRF por defecto a reproducir (pendiente runtime 0.6/0.7)

- Paginacion: `next`/`previous` como URL absolutas con host; `page` fuera de rango ->
  **404 `{"detail":"Invalid page."}`**. El FE **no lee** `next`/`previous` (los recalcula
  en `pagination.util`) -> en NestJS pueden ser `null`/relativos (delta permitido).
- `page_size` maximo 100 (`CustomPageNumberPagination.max_page_size`), default 10, param
  de pagina = `page`.
- Errores de serializer -> `{ "<campo>": ["mensaje", ...] }` con 400.
- Sin token en endpoint `JWT` -> 401 `{"detail":"Authentication credentials were not provided."}`.
- `errorInterceptor` del FE hace **logout global ante 401 y 403**: los permisos denegados
  deben seguir siendo **403**; las validaciones **nunca** 401/403.
- `REST_FRAMEWORK` no define `DEFAULT_PERMISSION_CLASSES` ni paginacion global: cada vista
  fija lo suyo.

# Inventario de endpoints

Estado: **v2 (Tarea 0.6)**. Re-anclado a **`fe3fc98`** = `origin/main` = **lo que corre en
produccion (Render)**. La v1 (Tarea 0.2) se construyo leyendo el `main` local, que esta
**3 commits por delante y NO desplegado** (`83a24be`, `a047970`, `86c37cd`): centralizan
`es_admin_o_super`/paginacion en `apps/core/utils.py`, anaden `apps/core/file_validators.py`
y `apps/core/cloudinary_folders.py`, convierten `Carrusel` en `BaseModel` (+ migracion
`0003`), y **renombran las rutas CSV** de `cargar-por-csv/` a `cargar-csv/` (regresion que
romperia el frontend). Nada de eso esta en prod.

Fuentes: `git show fe3fc98:...` de `config/urls.py`, `apps/*/urls.py`, `apps/*/views.py`,
`apps/*/serializers.py`, `apps/*/models.py`; frontend `src/app/**` (sin cambios).
Lo verificable solo con respuesta real va marcado `pendiente runtime (0.7)`.

## Leyenda

- **Auth**: `Publico` = sin token (`AllowAny`) · `JWT` = token requerido · `JWT + rol` =
  token y ademas `es_admin_o_super()` dentro de la vista (rol `admin`/`super`); si no ->
  `403 {"detail": ...}` (o `{"error": ...}` en usuarios).
- **Paginacion** (GET de listas): `siempre` = DRF `{count,next,previous,results}` ·
  `condicional` = paginado solo si llega `page`/`page_size`, si no array plano · `no` =
  array plano siempre.
- En prod **no existe `apps/core/utils.py`**: cada `views.py` define su propia
  `class CustomPageNumberPagination(PageNumberPagination)` con `page_size=10`,
  `page_size_query_param='page_size'`, `max_page_size=100`, y su propia `es_admin_o_super`
  (en `usuarios` y `carrusel` **sin** el `user.is_authenticated`).
- En prod **no hay validacion de archivos** (`file_validators.py` no existe) y las carpetas
  de Cloudinary estan **hardcodeadas** por vista.
- Prefijo global `/api`. Todas las rutas terminan en `/`.

## Como consume el frontend (sin cambios respecto a v1)

- **Admin** (`/dashboard/*`): edita SIEMPRE desde la fila; nunca hace *fetch-by-id* (los
  `getXById` de articulos/documentos/carrusel no se invocan).
- **Publico**: `post-details`, `reverend-details`, `parish-details` SI usan *fetch-by-id*.
- `parishes.ts` (admin) usa `getAll*({isActive:true})` (sin `page`) para el lookup de FKs.

## Autenticacion — `/api/token/`

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 1 | POST | `/token/login/` | `CustomTokenObtainPairView` (= `TokenObtainPairView`) | Publico | `Auth.login()` | Body `{username,password}` -> `{access,refresh}`. HS256, `SECRET_KEY` de Django. `access` 8h, `refresh` 1d. Claim `user_id` (UUID). Credenciales invalidas -> 401 `{"detail":"No active account found with the given credentials"}`. |
| 2 | POST | `/token/refresh/` | `TokenRefreshView` | Publico | — sin uso | `{refresh}` -> `{access}`. Sin rotacion ni blacklist. |

## Usuarios — `/api/users/`

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 3 | GET | `/users/usuarios/` | `UsuarioAPIView.get` | JWT | `Users.getUsersPaginated()` | Paginacion `siempre` (serializa `page` correctamente). Excluye al propio usuario. Orden `username`. Filtros: `username` (icontains), `isActive` (`true`/`false`). BUG-DJANGO-008. |
| 4 | POST | `/users/usuarios/` | `UsuarioAPIView.post` | JWT + rol | `Users.createUser()` | Body JSON `{username,email,role,password}`. No valida con serializer. `{"mensaje":...,"data":<user>}` **201**. `admin`->`super` -> 403 `{"detail"}`. Username duplicado -> 400 `{"error"}`. BUG-DJANGO-009. |
| 5 | GET | `/users/usuarios/{id}/` | `UsuarioAPIView.get` (pk) | JWT | `Auth.loadProfile()` | Objeto `User`. BUG-DJANGO-008 (IDOR). |
| 6 | PUT | `/users/usuarios/{id}/` | `UsuarioAPIView.put` | JWT | `Users.updateUser()` | `partial`. `{"mensaje":...,"data":<user>}` **200**. El FE envia `{username,email,role}`. El serializer descarta `password` (BUG-DJANGO-010, sin impacto). Unica regla de rol: `admin` no edita `super`. BUG-DJANGO-021 (falta gate admin/super). |
| 7 | DELETE | `/users/usuarios/{id}/` | `UsuarioAPIView.delete` | JWT | — sin uso | Soft-delete: `isActive=False`, **`deletedAt`, `deletedBy`** (usuarios SI fija `deletedAt`), **no** toca `is_active` -> BUG-DJANGO-020. `{"mensaje":...}` **200**. BUG-DJANGO-021. |
| 8 | PUT | `/users/usuarios/cambiar-estado/{id}/` | `HabilitarUsuarioView.put` | JWT + rol | `Users.changeUserStatus()` | Toggle `isActive` (+ sincroniza `is_active`, `deletedAt`, `deletedBy`). Body `{}`. `{"mensaje":"Usuario X ha sido activado/desactivado correctamente."}` 200. |
| 9 | PUT | `/users/usuarios/change-password/` | `ChangePasswordView.put` | JWT | — sin uso (FE-001) | Sobre `request.user`. Body `{"new_password"}`. Sin verificar contrasena actual ni validadores -> BUG-DJANGO-005. `{"mensaje"}` 200; falta campo -> 400 `{"error"}`. |
| 10 | POST | `/users/usuarios/reset-password/{id}/` | `ResetPasswordView.post` | JWT + rol | — sin uso (FE-001) | BUG-DJANGO-002: contrasena = `username`. `{"mensaje"}` 200. |
| 11 | GET | `/users/usuarios/me/` | `UsuarioPerfilView.get` | JWT | — sin uso | Devuelve el `User` autenticado. |
| 12 | POST | **`/users/usuarios/cargar-por-csv/`** | `CrearUsuariosPorCsvView.post` | JWT + rol | `Users.createUsersByCsv()` | **Coincide con el FE -> funciona en prod.** Campo `archivo_csv` (multipart). `{"mensaje","creados":[],"errores":[]}` 200. El `main` local la renombra a `/cargar-csv/` (regresion no desplegada) -> antiguo BUG-DJANGO-006, ahora invertido. |

## Carrusel — `/api/carrusel/`

Modelo prod: `Carrusel(models.Model)` con **6 campos** (`id, url, isImage, isActive, createdAt, createdBy`). `CarruselSerializer`: `fields='__all__'`, `read_only_fields=['id','createdAt','createdBy','isActive']`.

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 13 | GET | `/carrusel/` | `CarruselView.get` | Publico | `Carousel.getAll()` (`home`, admin) | Array plano (`no` paginacion). Solo `isActive=True`. Orden `-createdAt`. Respuesta = 6 campos. |
| 14 | POST | `/carrusel/` | `CarruselView.post` | JWT + rol | `Carousel.create()` | Multipart. `url` = archivo; `isImage` (`'true'`/`'false'`, default `'true'`). **Sin validacion.** `cloudinary.config()` + carpeta hardcodeada `carrusel/imagenes` / `carrusel/videos`. `<carrusel>` **201**. Error -> 400 `{"error": str(e)}` (BUG-DJANGO-004). |
| 15 | GET | `/carrusel/{id}/` | `CarruselView.get` (pk) | Publico | — sin uso | Sin filtro `isActive`. |
| 16 | PUT | `/carrusel/{id}/` | `CarruselView.put` | JWT + rol | — sin uso | Multipart; `url`/`isImage` opcionales. **No llama a `cloudinary.config()`** (bug latente). `<carrusel>` 200. |
| 17 | DELETE | `/carrusel/{id}/` | `CarruselView.delete` | JWT + rol | `Carousel.delete()` | Soft-delete: **solo `isActive=False`** (no hay columnas `deletedAt`/`deletedBy`). `{"detail":"Elemento desactivado correctamente."}` con **204 + body** (APIC-002). |
| 18 | **PUT** | `/carrusel/habilitar/{id}/` | `HabilitarCarruselView.put` | JWT + rol | — sin uso | **Metodo PUT** (no POST). Si `carrusel.isActive` ya es `True` -> 400 `{"detail":"Este carrusel ya esta activo."}`. Si no -> `isActive=True` -> 200 `{"detail":"Carrusel habilitado correctamente."}`. |

## Padres — `/api/padres/`

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 19 | GET | `/padres/` | `PadreView.get` | Publico | `Reverends.getPadresPaginated()`, `getAllPadres()` | Paginacion **`condicional`** (APIC-003): con `page`/`page_size` -> `{count,...,results}` (serializa `page`); sin ellos -> **array plano**. `getAllPadres({isActive:true})` (sin page) lo usa `parishes.ts` -> depende del array plano. Orden `firstName,lastName`. Filtros: `isActive`, `firstName`/`lastName` (icontains), `birthDay`+`birthMonth`. |
| 20 | GET | `/padres/{id}/` | `PadreView.get` (pk) | Publico | `Reverends.getPadreById()` | Objeto `Padre`. Sin filtro `isActive`. Usado por `reverend-details`, `parish-details`. |
| 21 | POST | `/padres/` | `PadreView.post` | JWT + rol | `Reverends.createPadre()` | Multipart. Campos `firstName`,`lastName`,`birthDate` (`YYYY-MM-DD`), `email`,`facebook`,`instagram`,`twitter` (cadena vacia si no hay valor), `picture?`. `picture` -> `cloudinary.config()` + `upload(folder="padres")`, **sin validacion**. `<padre>` **201** / errores serializer **400** (con `print`). |
| 22 | PUT | `/padres/{id}/` | `PadreView.put` | JWT + rol | `Reverends.updatePadre()` | Multipart, `partial`. `picture` -> `upload(folder="padres")` **sin `cloudinary.config()`** (bug latente). `<padre>` 200 / 400. |
| 23 | DELETE | `/padres/{id}/` | `PadreView.delete` | JWT + rol | `Reverends.deletePadre()` | Soft-delete: `isActive=False` + `deletedBy`, **sin `deletedAt`** (BUG-DJANGO-013 aplica tambien a padres). `{"detail":"Padre desactivado correctamente."}` **204 + body**. |
| 24 | POST | `/padres/habilitar/{id}/` | `HabilitarPadreView.post` | JWT + rol | `Reverends.activatePadre()` | `get_object_or_404(pk, isActive=False)` -> 404 si ya activo. `{"detail":...}` 200. |
| 25 | POST | **`/padres/cargar-por-csv/`** | `CargarPadresPorCSV.post` | JWT + rol | — sin uso | Campo `archivo_csv`. `{"creados":[],"errores":[]}` 200. (En prod lleva "por"; el `main` local la renombra a `cargar-csv/`.) |

## Decanatos — `/api/decanatos/`

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 26 | GET | `/decanatos/` | `DecanatoView.get` | Publico | `Decant.getDecanatosPaginated()`, `getAllDecanatos()` | Paginacion `siempre`, **pero BUG-DJANGO-024**: serializa el `queryset` completo, no la `page` -> `results` devuelve **todas** las filas ignorando `page_size`; `count`/`next`/`previous` si paginan. Orden `-createdAt`. Filtros: `name` (icontains), `isActive` (`true`/`false`/otro->sin filtro). |
| 27 | GET | `/decanatos/{id}/` | `DecanatoView.get` (pk) | Publico | `Decant.getDecanatoById()` | `get_object_or_404(pk, isActive=True)` -> **404 si soft-deleted** -> rompe `parish-details` (BUG-DJANGO-022). |
| 28 | POST | `/decanatos/` | `DecanatoView.post` | JWT + rol | `Decant.createDecanato()` | Body JSON `{name}`. `<decanato>` **201** / 400. BUG-DJANGO-007. |
| 29 | PUT | `/decanatos/{id}/` | `DecanatoView.put` | JWT + rol | `Decant.updateDecanato()` | `get_object_or_404(pk, isActive=True)`, `partial`, JSON `{name}`. `<decanato>` 200 / 400. |
| 30 | DELETE | `/decanatos/{id}/` | `DecanatoView.delete` | JWT + rol | `Decant.deleteDecanato()` | `isActive=True` requerido. `isActive=False` + `deletedBy`, **sin `deletedAt`** (BUG-DJANGO-013). `{"detail":"Decanato desactivado correctamente."}` **204 + body**. |
| 31 | POST | `/decanatos/cargar-csv/` | `CargarDecanatosPorCSV.post` | JWT + rol | — sin uso | Campo `archivo_csv`. `{"creados":[],"errores":[]}` 200. (En prod SIN "por" — inconsistente con padres/usuarios.) |
| 32 | POST | `/decanatos/habilitar/{id}/` | `HabilitarDecanatoView.post` | JWT + rol | `Decant.activateDecanato()` | `get_object_or_404(pk, isActive=False)`. `{"detail":...}` 200. |

## Colonias — `/api/colonias/`  (como Decanatos, **sin** BUG-DJANGO-024 — serializa `page` bien)

| # | Metodo | Ruta | FE | Notas |
|---|---|---|---|---|
| 33 | GET | `/colonias/` | `Colony.getColoniasPaginated()`, `getAllColonias()` | Paginacion `siempre`, serializa `page` correctamente. Filtros `name`/`isActive`. |
| 34 | GET | `/colonias/{id}/` | `Colony.getColoniaById()` | `get_object_or_404(pk, isActive=True)` -> 404 si soft-deleted (BUG-DJANGO-022). |
| 35 | POST | `/colonias/` | `Colony.createColonia()` | JSON `{name}`. `<colonia>` 201 / 400. BUG-DJANGO-007. |
| 36 | PUT | `/colonias/{id}/` | `Colony.updateColonia()` | `isActive=True` requerido, `partial`. |
| 37 | DELETE | `/colonias/{id}/` | `Colony.deleteColonia()` | `isActive=False` + `deletedBy`, sin `deletedAt`. Mensaje con typo: `"Colobia desactivado correctamente."` **204 + body**. |
| 38 | POST | `/colonias/cargar-csv/` | — sin uso | Campo `archivo_csv`. |
| 39 | POST | `/colonias/habilitar/{id}/` | `Colony.activateColonia()` | `get_object_or_404(pk, isActive=False)` -> 200. |

## Parroquias — `/api/parroquias/`

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 40 | GET | `/parroquias/` | `ParroquiaView.get` | Publico | `Parish.getParroquiasPaginated()` | Paginacion `siempre`, serializa `page`. Orden `-createdAt`. Filtros usados por el FE: `name` (icontains), `town` (icontains), `isActive`. El filtro `colonia` -> `coloniaId__nombre__icontains` -> **BUG-DJANGO-003** (500 si se envia; el FE no lo envia). |
| 41 | GET | `/parroquias/{id}/` | `ParroquiaView.get` (pk) | Publico | `Parish.getParroquiaById()` | Objeto `Parroquia` (`fields=__all__`: `decanatoId`,`coloniaId`,`padreId` como UUID string, `picture`). Sin filtro `isActive`. |
| 42 | POST | `/parroquias/` | `ParroquiaView.post` | JWT + rol | `Parish.createParroquia()` | Multipart/JSON. Campos `name`,`openingDate` (`YYYY-MM-DD`),`address`,`zipCode`,`town`,`coloniaId`,`decanatoId`,`padreId`,`picture?`. `picture` -> `cloudinary.config()` + `upload(folder="parroquia")`, sin validacion. FKs = `PROTECT`. `<parroquia>` **201** / 400. BUG-DJANGO-007. |
| 43 | PUT | `/parroquias/{id}/` | `ParroquiaView.put` | JWT + rol | `Parish.updateParroquia()` | Multipart/JSON, `partial`. `picture` -> `cloudinary.config()` + `upload(folder="parroquia")`. `<parroquia>` 200 / 400. |
| 44 | DELETE | `/parroquias/{id}/` | `ParroquiaView.delete` | JWT + rol | `Parish.deleteParroquia()` | `get_object_or_404(pk)` (sin filtro). `isActive=False` + `deletedBy`, **sin `deletedAt`** (BUG-DJANGO-013). `{"detail":"Parroquia desactivada correctamente."}` **204 + body**. |
| 45 | POST | `/parroquias/habilitar/{id}/` | `HabilitarParroquiaView.post` | JWT + rol | `Parish.activateParroquia()` | `get_object_or_404(pk, isActive=False)`. `{"detail":...}` 200. |
| 46 | POST | `/parroquias/cargar-csv/` | `CargarParroquiasPorCSV.post` | JWT + rol | — sin uso | Campo `archivo_csv`. `{"creados":[],"errores":[]}` 200. (En prod SIN "por".) |

## Noticias — `/api/noticias/`

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 47 | GET | `/noticias/` | `NoticiaView.get` | Publico | `Newspaper.getNoticiasPaginated()` | Paginacion `siempre`, serializa `page`. Orden `-createdAt`. Filtros: `title` (icontains), `tags` (SQL crudo `.extra()` jsonb ILIKE, **solo Postgres** -> BUG-DJANGO-011), `isActive`. `home` pide `page_size=10`, `isActive=true`; `post-search` añade `title`/`tags`. |
| 48 | GET | `/noticias/{id}/` | `NoticiaView.get` (pk) | Publico | `Newspaper.getNoticiaById()` | Objeto `Noticia` (`tags` array). Sin filtro `isActive`. `post-details` lee `title,content,tags,picture,createdAt,updatedAt`. |
| 49 | POST | `/noticias/` | `NoticiaView.post` | JWT + rol | `Newspaper.createNoticia()` | Multipart/JSON. Campos `title`,`content`,`tags` = **string JSON** `'["a","b"]'`, `picture?` -> `cloudinary.config()` + `upload(folder="noticias")`, sin validacion. `<noticia>` **201**. BUG-DJANGO-007. |
| 50 | PUT | `/noticias/{id}/` | `NoticiaView.put` | JWT + rol | `Newspaper.updateNoticia()` | Multipart/JSON, `partial`. `<noticia>` **200**. |
| 51 | DELETE | `/noticias/{id}/` | `NoticiaView.delete` | JWT + rol | `Newspaper.deleteNoticia()` | `isActive=False` + `deletedBy`, **sin `deletedAt`**. `{"detail":"Noticia desactivada correctamente."}` **204 + body**. |
| 52 | POST | `/noticias/habilitar/{id}/` | `HabilitarNoticiaView.post` | JWT + rol | `Newspaper.activateNoticia()` | `get_object_or_404(pk, isActive=False)`. `{"detail":...}` 200. |

## Articulos — `/api/articulos/`  (solo admin; sin ruta publica)

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 53 | GET | `/articulos/` | `ArticuloView.get` | Publico | `Article.getArticulosPaginated()` | Paginacion `siempre`, serializa `page`. Filtros: `title`, `tags` (jsonb, BUG-DJANGO-011), `isActive`. |
| 54 | GET | `/articulos/{id}/` | `ArticuloView.get` (pk) | Publico | — sin uso | `Article.getArticuloById()` definido pero no se invoca. |
| 55 | POST | `/articulos/` | `ArticuloView.post` | JWT + rol | `Article.createArticulo()` | **Body JSON** `{title,content,tags: string[]}` (parsers Form/JSON). `<articulo>` **201** / 400. BUG-DJANGO-007. |
| 56 | PUT | `/articulos/{id}/` | `ArticuloView.put` | JWT + rol | `Article.updateArticulo()` | Body JSON, `partial`. `<articulo>` **200** / 400 (con `print`). |
| 57 | DELETE | `/articulos/{id}/` | `ArticuloView.delete` | JWT + rol | `Article.deleteArticulo()` | `isActive=False` + `deletedBy`, **sin `deletedAt`**. `{"detail":"Articulo desactivado correctamente."}` **204 + body**. |
| 58 | POST | `/articulos/habilitar/{id}/` | `HabilitarArticuloView.post` | JWT + rol | `Article.activateArticulo()` | `get_object_or_404(pk, isActive=False)`. `{"detail":...}` 200. |

## Documentos — `/api/documentos/`  (solo admin; sin ruta publica)

| # | Metodo | Ruta | Vista | Auth | FE | Notas |
|---|---|---|---|---|---|---|
| 59 | GET | `/documentos/` | `DocumentoView.get` | Publico | `Document.getDocumentosPaginated()` | Paginacion `siempre`, serializa `page`. Filtros: `title`, `tags` (jsonb, BUG-DJANGO-011), `type` (exacto, uno de los 9), `isActive`. |
| 60 | GET | `/documentos/{id}/` | `DocumentoView.get` (pk) | Publico | — sin uso | `Document.getDocumentoById()` definido pero no se invoca. |
| 61 | POST | `/documentos/` | `DocumentoView.post` | JWT + rol | `Document.createDocumento()` | Multipart. Campos `title`, `type`, `tags` = **string JSON** (`validate_tags`: str->JSON), `document?` -> `cloudinary.config()` + `upload(folder="documentos", resource_type="raw")`, sin validacion. `<documento>` **201**. BUG-DJANGO-007. |
| 62 | PUT | `/documentos/{id}/` | `DocumentoView.put` | JWT + rol | `Document.updateDocumento()` | Multipart, `partial`. `document` -> `upload(...)` **sin `cloudinary.config()`** (bug latente). `<documento>` **200** / 400. |
| 63 | DELETE | `/documentos/{id}/` | `DocumentoView.delete` | JWT + rol | `Document.deleteDocumento()` | `isActive=False` + `deletedBy`, **sin `deletedAt`**. `{"detail":"Documento desactivado correctamente."}` **204 + body**. |
| 64 | POST | `/documentos/habilitar/{id}/` | `HabilitarDocumentoView.post` | JWT + rol | `Document.activateDocumento()` | `get_object_or_404(pk, isActive=False)`. `{"detail":...}` 200. |

## Django Admin

| # | Metodo | Ruta | Auth | FE | Notas |
|---|---|---|---|---|---|
| 65 | * | `/admin/` | Sesion Django | — | Sin `ModelAdmin` registrados. Fuera de alcance salvo decision contraria. |

## Endpoints sin consumidor en el frontend

2, 7, 9, 10, 11, 15, 16, 18, 25, 31, 38, 46, 54, 60, 65. `Article.getArticuloById()` y
`Document.getDocumentoById()` existen pero no se invocan. **El #12 SI lo consume el FE y
coincide** (`/cargar-por-csv/`).

## Rutas CSV — estado real en prod (`fe3fc98`) vs `main` local

| Ruta en prod | Ruta en `main` local (sin desplegar) | La usa el FE |
|---|---|---|
| `/users/usuarios/cargar-por-csv/` | `/users/usuarios/cargar-csv/` | **si** (coincide con prod) |
| `/padres/cargar-por-csv/` | `/padres/cargar-csv/` | no |
| `/decanatos/cargar-csv/` | `/decanatos/cargar-csv/` | no |
| `/colonias/cargar-csv/` | `/colonias/cargar-csv/` | no |
| `/parroquias/cargar-csv/` | `/parroquias/cargar-csv/` | no |

NestJS mantiene las rutas de **prod**. Si conviene, se puede aceptar tambien el alias
`cargar-csv/` en el modulo de usuarios para que un despliegue futuro del `main` local no
rompa nada.

## Comportamiento DRF por defecto a reproducir (pendiente runtime 0.7)

- Paginacion: `next`/`previous` = URL absolutas con host; `page` fuera de rango ->
  **404 `{"detail":"Invalid page."}`**. El FE **no lee** `next`/`previous` (los recalcula
  en `pagination.util`) -> en NestJS pueden ser `null`/relativos (delta permitido).
- `page_size` maximo 100, default 10, param de pagina = `page`.
- Errores de serializer -> `{ "<campo>": ["mensaje", ...] }` con 400.
- Sin token en endpoint `JWT` -> 401 `{"detail":"Authentication credentials were not provided."}`.
- El `errorInterceptor` del FE hace **logout global ante 401 y 403**: los permisos
  denegados deben seguir siendo **403**; las validaciones **nunca** 401/403.
- `REST_FRAMEWORK` (settings.py, sin cambios): solo `JWTAuthentication`, sin
  `DEFAULT_PERMISSION_CLASSES` ni paginacion global. `CORS_ALLOW_ALL_ORIGINS = True`.

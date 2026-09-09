# Hallazgos de la auditoria

Origen: auditoria previa a la migracion (backend Django + frontend Angular).
Estos hallazgos **no se corrigen ahora**: se atienden en sus tareas del roadmap.
Django y Angular no se modifican fuera de esas tareas.

Severidad: `CRITICAL` / `HIGH` / `MEDIUM` / `LOW`.
Categorias: BUG / SECURITY / ARCHITECTURE / PERFORMANCE / DATABASE / FRONTEND / API CONTRACT / TESTING / MAINTAINABILITY.

Prefijos de ID:
- `BUG-DJANGO-NNN`: bug real del backend actual (no replicar tal cual en NestJS).
- `SECRET-NNN`: exposicion o mal manejo de secretos/credenciales.
- `SECURITY-NNN` / `ARCH-NNN` / `PERF-NNN` / `APIC-NNN` / `DB-NNN` / `TEST-NNN`: otros.
- `FE-NNN`: hallazgo en el frontend Angular.

Actualizado en la Tarea 0.2: nuevos BUG-DJANGO-021, BUG-DJANGO-022, FE-001..FE-003;
matizados BUG-DJANGO-010 y APIC-003.
Actualizado en la Tarea 0.3: nuevo BUG-DJANGO-023; ver tambien `docs/db/notes.md`.
Actualizado en la Tarea 0.6: nuevo SECRET-004; **re-anclaje a `fe3fc98`** (produccion real).
El `main` local esta 3 commits por delante y NO desplegado (`83a24be`, `a047970`, `86c37cd`).
Consecuencias: BUG-DJANGO-006 estaba **invertido** (en prod la ruta CSV coincide con el FE);
BUG-DJANGO-013 se amplia; BUG-DJANGO-015 y SECURITY-008 pasan a "solo en codigo local
sin desplegar"; BUG-DJANGO-023 confirmado solo-local; nuevo **BUG-DJANGO-024**.
El resto de findings 001-022 se re-verificaron contra `fe3fc98` y siguen validos.
Actualizado en la FASE 7 (articulos/noticias/documentos): **BUG-DJANGO-011 RESUELTO**;
BUG-DJANGO-004/007/013 y SECURITY-008 pasan a RESUELTO para todos los modulos migrados.
Actualizado en la FASE 8 (endurecimiento): **SECURITY-006 RESUELTO** (throttler en auth,
Tarea 8.1); nuevo **SECRET-006** (volcado de fila via `DETAIL` de Postgres, Tarea 8.2);
**BUG-DJANGO-005 RESUELTO** (lista de contrasenas comunes + politica en la via CSV, Tarea 8.4);
**APIC-002 RESUELTO** (inventario de sobres, Tarea 8.5); argon2id con parametros fijados
(Tarea 8.3); CHECK de dominio `type`/`role` (Tarea 8.2, ADR-004 DQ2-A).

---

## CRITICAL

| ID | Cat. | Ubicacion | Resumen | Accion prevista |
|---|---|---|---|---|
| BUG-DJANGO-001 | SECURITY | `config/.env.prod` | `DJANGO_ENV=dev` y `DEBUG=True` en el archivo de produccion -> API con DEBUG activo (stack traces, settings expuestos). | NestJS nunca expone stack traces; filtro global (Fase 1.4). Arreglo del `.env` en tarea propia de Django. |
| SECRET-001 | SECURITY | `config/.env.dev`, `config/.env.prod` | Contienen valores reales (`SECRET_KEY`, `DATABASE_URL`, `CLOUDINARY_API_SECRET`, `EMAIL_HOST_PASSWORD`). No trackeados, pero presentes en el arbol. | Verificar historial git; rotar secretos si hay duda; en este repo `.env` fuera de git desde el commit 1. |
| SECRET-002 | SECURITY | `db.sqlite3` (versionado) | Incluye `usuarios_usuario` con 6 filas: hashes de contrasena + emails + usernames. | `git rm --cached db.sqlite3` + `.gitignore` en tarea propia; tratar hashes como comprometidos si los usuarios son reales. |
| SECRET-004 | SECURITY | sesion de trabajo (Tarea 0.6) | La cadena de conexion completa de la BD PostgreSQL de **produccion** (Render), con contrasena en claro, quedo en el transcript al lanzar `pg_dump` contra prod en vez de contra la copia. El dump fue solo lectura (datos de prod intactos). | **ACCION INMEDIATA:** rotar la contrasena de la BD en Render y actualizar la env var del servicio Django. Mantener `docs/oracle/seed*.sql` (dataset real) fuera de git. En adelante, los scripts toman la URL de origen de una env var, nunca hardcodeada. |
| SECRET-005 | SECURITY | sesion de trabajo (Tarea 1.1) | El `CLOUDINARY_API_SECRET` real de `config/.env.dev` quedo en el transcript (seleccion del IDE). El `cloud_name` no es sensible (aparece en cada URL publica). | **ACCION INMEDIATA:** regenerar la API secret en el dashboard de Cloudinary y actualizar `config/.env.dev` / `.env.prod`. Relacionado con SECRET-001. |
| SECRET-006 | SECURITY | sesion de trabajo (Tarea 8.2) | Al verificar el `CHECK` de `usuarios_usuario.role` con un `UPDATE ... ; ROLLBACK` contra el oraculo, el `DETAIL` de Postgres volco una fila de `usuarios_usuario` (copia de datos reales de prod): hash PBKDF2 **truncado** + email + username del propio usuario. Sin cambios en datos (rollback). | **ACCION:** el usuario cambia su propia contrasena en/tras el corte (el hash PBKDF2 se sustituye por argon2id al primer login de todos modos, ADR-002 pto. 4). **Proceso:** contra el oraculo, solo `SELECT` con lista de columnas explicita; nunca `INSERT`/`UPDATE` de prueba (su `DETAIL` de violacion de constraint vuelca la fila). Para probar constraints, tabla scratch o BD desechable aparte. |

## HIGH

| ID | Cat. | Ubicacion | Resumen | Accion prevista |
|---|---|---|---|---|
| BUG-DJANGO-002 | SECURITY | `apps/usuarios/views.py` ResetPasswordView | La nueva contrasena se fija igual al `username` (predecible). | **RESUELTO (Tarea 2.11)**: `reset-password` genera contrasena aleatoria de 16 chars (`generatePassword`) y la devuelve en la respuesta `{mensaje, password}` para que el admin la comunique. |
| BUG-DJANGO-003 | BUG | `apps/parroquias/views.py` GET filtro `colonia` | `filter(coloniaId__nombre__icontains=...)`: el campo es `name`, no `nombre` -> FieldError -> 500 si llega `?colonia=`. | **RESUELTO (Tarea 6.1)**: `ParishesService.list` hace `leftJoin('p.colonia','col')` y filtra `col.name ILIKE :colonia`. Verificado con e2e. |
| BUG-DJANGO-004 | SECURITY | varios `views.py` (carrusel, padres, noticias, documentos, usuarios) | `except Exception as e: return Response({"error": str(e)})` filtra mensajes internos al cliente. | NestJS: error generico + log interno. **Mitigado a nivel global (Tarea 1.4)**: `AllExceptionsFilter` fuerza `{detail:"Error interno del servidor."}` en todo 5xx y solo loguea la traza. Al migrar cada modulo (Fase 5-8) se eliminan los `except Exception` que replicaban el anti-patron. |
| BUG-DJANGO-005 | SECURITY | `config/settings.py` + serializers/vistas de usuario | `AUTH_PASSWORD_VALIDATORS` configurado pero nunca invocado; se aceptan contrasenas arbitrarias. | **RESUELTO (Tareas 2.8/2.11 + 8.4)**: `assertPasswordPolicy` (min 8, no solo numeros, no parecida a username/email, **no en la lista de contrasenas comunes** `COMMON_PASSWORDS` — subconjunto curado ~180, no los 20k de Django) en crear-usuario, change-password **y ahora el alta por CSV** (por fila; `password=username` la rechaza). Delta vs Django: la via CSV de Django no valida nada. |
| BUG-DJANGO-020 | SECURITY | `apps/usuarios/views.py` UsuarioAPIView.delete | Soft-delete no toca `is_active`; un usuario "eliminado" por DELETE puede seguir haciendo login. | **RESUELTO (Tareas 2.4/2.9)**: `isActiveUser()` = `isActive && isActiveAuth`; `softDelete` y `toggleStatus` mueven **ambos** flags. `JwtStrategy` exige ambos. |
| BUG-DJANGO-021 | SECURITY | `apps/usuarios/views.py` UsuarioAPIView.put / .delete | Un rol `user` podia editar/desactivar a cualquiera, incluido un `super`. | **RESUELTO (Tareas 2.6/2.9)**: `@Roles('admin')` en put/delete/cambiar-estado/reset + `assertCanManage` (admin no actua sobre super) centralizado. |

## MEDIUM

| ID | Cat. | Ubicacion | Resumen | Accion prevista |
|---|---|---|---|---|
| BUG-DJANGO-006 | API CONTRACT | `apps/usuarios/urls.py` (prod `fe3fc98`) vs `main` local | **Invertido en Tarea 0.6.** En prod la ruta es `POST /users/usuarios/cargar-por-csv/` = **exactamente lo que llama el FE** -> la carga CSV **funciona en prod**. Son los 3 commits locales sin desplegar los que la renombran a `/cargar-csv/` (junto con padres/decanatos/colonias/parroquias), lo que **romperia el FE si se despliega tal cual**. | NestJS mantiene `/users/usuarios/cargar-por-csv/` (paridad con prod y FE). Opcional: aceptar tambien el alias `/cargar-csv/`. La regresion de los commits locales es un aviso para el equipo Django. |
| BUG-DJANGO-007 | SECURITY | serializers de noticias, articulos, documentos, decanatos, colonias, parroquias | `fields=__all__` sin `createdBy` en `read_only_fields` -> un PUT puede reasignar `createdBy` (mass assignment). | **RESUELTO** para todos los modulos migrados: DTO explicito + `createdBy`/`updatedBy` desde `@CurrentUser()` + `whitelist:true` descarta `createdBy` del body. Aplicado a decanatos (3.1), colonias (3.2), padres (4.x), carrusel (5.1), parroquias (6.1), articulos (7.1), noticias (7.2), documentos (7.3) con e2e (`createdBy: 'atacante'` en el body -> ignorado, respuesta trae el id del actor). |
| BUG-DJANGO-008 | ARCHITECTURE | `apps/usuarios/views.py` list y detail | Solo `IsAuthenticated`: cualquier rol enumera todos los usuarios (email, rol) y consulta cualquiera por id (IDOR / info disclosure). | **RESUELTO (Tarea 2.7)**: `GET /users/usuarios/` -> `@Roles('admin')`. `GET /users/usuarios/{id}/` -> solo el propio usuario o admin/super (mantiene `Auth.loadProfile`). |
| BUG-DJANGO-009 | BUG | `apps/usuarios/views.py` POST | Pasa `role=data.get(role)`; si falta, envia `None` y rompe el `default=user` -> IntegrityError. El FE siempre envia `role`. | **RESUELTO (Tarea 2.8)**: `CreateUserDto.role` con `@IsIn(['super','admin','user'])` requerido -> falta `role` = 400 `{role:[...]}`. |
| BUG-DJANGO-010 | API CONTRACT | `apps/usuarios/serializers.py` update() | `update()` descarta `password` en `PUT /usuarios/{id}/`. Sin impacto real hoy. | **RESUELTO (Tarea 2.9)**: `UpdateUserDto` no declara `password` y `whitelist:true` lo descarta; cambio de contrasena por `change-password`. |
| SECURITY-003 | SECURITY | `config/settings.py` | `CORS_ALLOW_ALL_ORIGINS = True`. | **RESUELTO (Tarea 1.9)**: `buildCorsOptions` (`src/common/cors.config.ts`) + `app.enableCors` en `main.ts`. Allowlist exacta desde `CORS_ORIGINS`; lista vacia -> `origin:false` (fail-closed). `credentials:false` (el FE usa `Authorization: Bearer`, no cookies). **Requiere** poblar `CORS_ORIGINS` en el env de prod con el dominio del frontend. |
| SECURITY-006 | SECURITY | `apps/auth_token`, `apps/usuarios` | Sin rate limiting en `login`, `change-password`, `reset-password`. | **RESUELTO (Tarea 8.1)**: `@nestjs/throttler` **solo** en esos 3 endpoints (`@UseGuards(ThrottlerGuard)`, sin `APP_GUARD` global). Limite `THROTTLE_AUTH_LIMIT` (10) por ventana `THROTTLE_AUTH_TTL_MS` (60s) e IP; exceso -> 429 `{ detail: "Demasiados intentos. ..." }`. `.env.test` usa 1000; `test/throttle.e2e-spec.ts` prueba el 429 con limite 3. **FASE 9**: `trust proxy` en Render para el key por IP real. |
| SECURITY-008 | SECURITY | subidas de archivo (prod `fe3fc98`) | En prod NO hay validacion de archivos: cualquier tipo/tamano en carrusel/padres/parroquias/noticias/documentos. | **RESUELTO** para todos los modulos con subida. Validadores por **magic bytes** en `src/common/files/`: `assertValidImage` (JPEG/PNG/WebP/GIF, 5 MB) — padres (4.2), parroquias (6.1), noticias (7.2); `assertValidVideo` (MP4/WebM/QuickTime, 50 MB) — carrusel (5.1); `assertValidDocument` (PDF/PPT-OLE2/PPTX-zip, 20 MB) — documentos (7.3). Fallo -> 400 `{campo:[...]}`. |
| BUG-DJANGO-011 | DATABASE | noticias/articulos/documentos GET filtro `tags` | `queryset.extra(where=[... jsonb_array_elements_text ...])`: SQL crudo, `.extra()` deprecado, rompe en SQLite local. Parametrizado (sin inyeccion). | **RESUELTO (FASE 7)**: helper `applyTagFilter` (`src/common/content/tags.ts`) genera un `EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(alias.tags, '[]'::jsonb)) AS t(value) WHERE t.value ILIKE :tag)` **parametrizado** (`:tag` = `%<trim>%`); `alias` es un identificador interno controlado. Aplicado a articulos (7.1), noticias (7.2) y documentos (7.3) con e2e de paridad (`?tags=` encuentra la fila sembrada). |
| BUG-DJANGO-023 | DATABASE | `apps/carrusel` (`main` local) + despliegue | En prod (`fe3fc98`) `Carrusel` era `models.Model` de 6 campos; el commit local `83a24be` lo pasaba a `BaseModel` + migracion `0003` que nunca se desplego. | **RESUELTO (Tareas 5.1/5.2)**: migracion aditiva `1788975276733-CarruselBasemodelFields` (ADR-004 DQ3-B) anade los 4 campos + FK + indices y backfillea `updatedAt` (21/21 verificado). `Carrusel` extiende `BaseEntity` como el resto. La respuesta de `/carrusel/` gana 4 campos (delta aditivo). Aviso al equipo Django: el landmine de desplegar `83a24be` sin paso `migrate` sigue existiendo hasta el corte. |
| BUG-DJANGO-012 | ARCHITECTURE | vistas de detalle/edicion de varios modulos | Soft-delete incoherente entre modulos. | **POLITICA ADOPTADA (FASE 3, `CatalogService`)**: `GET /{id}/` NUNCA filtra `isActive`; `PUT`/`DELETE` exigen fila activa (404 si borrada); `DELETE` fija `isActive=false`+`deletedAt`+`deletedBy`; `habilitar` limpia `deletedAt`/`deletedBy`. Aplicado a decanatos (3.1) y colonias (3.2); el resto de modulos-catalogo lo heredan de `CatalogService`. |
| BUG-DJANGO-022 | BUG | `apps/decanatos/views.py` / `apps/colonias/views.py` GET detail + FE `parish-details.ts` | El detalle filtraba `isActive=True` -> 404 en filas borradas -> rompia `parish-details` (`forkJoin` sin handler). | **RESUELTO (Tareas 3.1/3.2)** para decanatos y colonias: `GET /{id}/` devuelve la fila aunque este soft-deleted (`CatalogService.detail`). Ya no hace falta el handler de error en el frontend para este caso. |
| BUG-DJANGO-013 | BUG | delete() de casi todos los modulos (prod `fe3fc98`) | Fijan `isActive=False` + `deletedBy` pero **no `deletedAt`** (padres, decanatos, colonias, parroquias, noticias, articulos, documentos). | **RESUELTO** para todos los modulos migrados: politica canonica de soft-delete (FASE 3) `isActive=false` + `deletedAt` + `deletedBy` siempre; `habilitar` limpia `deletedAt`/`deletedBy`; `DELETE` -> 204 sin cuerpo. Aplicado a decanatos/colonias (3.x), padres (4.x), carrusel (5.1), parroquias (6.1), articulos (7.1), noticias (7.2), documentos (7.3) con e2e. |
| BUG-DJANGO-024 | BUG | `apps/decanatos/views.py` `DecanatoView.get` (prod `fe3fc98`) | `results` traia todas las filas ignorando `page_size` (serializaba el `queryset`, no la `page`). | **RESUELTO (Tarea 3.1)**: `DecanatesService.list` usa `skip/take` + `buildPage` -> `results` respeta `page_size`. Delta documentado en `contract-matrix.md`. |
| APIC-002 | API CONTRACT | respuestas de varios endpoints | Sobres inconsistentes: usuarios `{mensaje,data}`; resto objeto plano; deletes `{detail}` con 204 + body. | **RESUELTO (Tarea 8.5)**: inventario completo en `contract-matrix.md` ("Sobres de respuesta"). No queda ningun `{mensaje,data}` (usuarios create/update -> objeto plano, delta ya documentado). `DELETE` -> **204 sin cuerpo** en todos los modulos. Los `{mensaje}` que quedan (`cambiar-estado`/`change-password`/`reset-password`/`cargar-por-csv`) son paridad deliberada con Django: el FE los consume. |
| APIC-003 | API CONTRACT | `apps/padres/views.py` GET vs `decanatos`/`colonias` GET | `/padres/` pagina solo si llega `page`/`page_size` (si no, array plano); `/decanatos/` y `/colonias/` paginan SIEMPRE. | **RESUELTO**: decanatos/colonias paginan siempre (Tareas 3.1/3.2); `/padres/` devuelve **array plano** sin `page`/`page_size` y objeto paginado con ellos (Tarea 4.2, `PadresService.list(query, paginated)`). |
| APIC-004 | API CONTRACT | manejo de errores global | Formas mezcladas: `{detail}` vs `{error}` vs `{campo:[msgs]}`. El FE `login` lee `err.error.detail`. | **RESUELTO (Tarea 1.4)**: `AllExceptionsFilter` global (`src/common/filters/`, registrado via `APP_FILTER` en `CommonModule`). Escalar -> `{detail}`; objeto propio -> tal cual; 5xx -> `{detail:"Error interno del servidor."}` + log (cubre BUG-DJANGO-004 en NestJS). Contrato en `contract-matrix.md`. |
| TEST-001 | TESTING | ambos proyectos | Cobertura de tests nula -> sin red de seguridad de referencia. | Arnes de paridad + tests por slice. Fases 0.7 y 2+. |

## LOW

| ID | Cat. | Ubicacion | Resumen | Accion prevista |
|---|---|---|---|---|
| BUG-DJANGO-015 | BUG | `apps/core/cloudinary_folders.py` (`main` local, sin desplegar) | Subidas con carpeta hardcodeada por vista; el fix local con `env` estaba roto (`"production"` vs `"prod"`). | **RESUELTO (Tarea 4.1)**: `CloudinaryService` antepone `<nodeEnv>/` a la carpeta (`padres` en produccion; `development/padres`, `test/padres` fuera). `nodeEnv` viene de la config validada, no de una comparacion fragil. |
| ARCH-007 | MAINTAINABILITY | raiz de `diocesis-backend-python/` | Directorios muertos (articulos/, carrusel/, ... con solo `__pycache__/` y `migrations/`); el codigo vive en `apps/`. | No migrar. Limpieza opcional en tarea propia de Django. |
| ARCH-008 | MAINTAINABILITY | `apps/auth_token` | `models.py` vacio; `CustomTokenObtainPairView(TokenObtainPairView): pass`. | NestJS: modulo `auth` propio. Fase 2. |
| ARCH-009 | MAINTAINABILITY | padres/articulos views, settings.py | `print()` de depuracion. | No portar. |
| BUG-DJANGO-014 | BUG | `apps/usuarios/serializers.py` create() | `create_user()` (ya hashea) + `set_password()` + `save()` otra vez (doble hashing, inofensivo). | **RESUELTO (Tarea 2.8)**: `UsersService.create` hashea una sola vez con `PasswordService.hash` (argon2id) y hace un unico `insert`. |
| PERF-001 | PERFORMANCE | FE `parish-details` | 3 requests extra (decanato, padre, colonia) por vista de parroquia. | No es regresion a preservar; posible respuesta expandida post-migracion. |
| PERF-003 | PERFORMANCE | esquema de DB | Sin indices mas alla de PK/unique/FK; filtros `icontains` -> seq scan. Dataset diminuto hoy. | Revisar al escalar. |
| PERF-004 | PERFORMANCE | vistas con Cloudinary | `cloudinary.config()` en cada request. | **RESUELTO (Tarea 4.1)**: `CloudinaryService.onModuleInit()` llama `cloudinary.config()` una sola vez al arrancar. |
| FE-001 | FRONTEND | `diocesis-frontend-material` admin de usuarios | No hay UI para cambiar/resetear la contrasena de un usuario: `ChangePasswordView` (#9) y `ResetPasswordView` (#10) no se invocan desde ningun sitio. Hueco funcional. Detectado en Tarea 0.2. | Decidir si NestJS mantiene esos endpoints y si el FE gana la pantalla (tarea de frontend). |
| FE-002 | FRONTEND | `admin/reverends/reverends.ts`, `admin/documents/documents.ts`, varios | `debugger;` olvidado en `reverends.ts` save(); sentencia de plantilla vacia en `documents.ts` save(); toasts que dicen "creada/o" tambien al editar (newspaper, articles, reverends). Detectado en Tarea 0.2. | Limpieza en las tareas de frontend cuando se toquen esos modulos. |
| FE-003 | FRONTEND | `admin/carousel/carousel.ts` | El handler de error pasa `err.error` (objeto `{"error": "..."}`) a `toastr.error` -> muestra `[object Object]`. Detectado en Tarea 0.2. | Al migrar carrusel, ajustar el FE para leer `err.error.error` / `err.error.detail`. |

---

## Riesgos de migracion (resumen)

| # | Riesgo | Mitigacion |
|---|---|---|
| R1 | Esquema real de produccion no disponible localmente (sqlite desincronizado). | RESUELTO en Tarea 0.3: `docs/db/schema.sql` + `row-counts.md` + `notes.md` (via copia en Neon). Prod = PG 16.15, ~245 filas de negocio. |
| R2 | Compatibilidad de tokens JWT vigentes en el corte. | ADR-002 (corte duro vs. compartir `SECRET_KEY`). |
| R3 | Hashes de contrasena Django (`pbkdf2_sha256$...`). | Verificador PBKDF2 compatible en auth. |
| R4 | Nombres de campos camelCase en toda la API. | Mapeo explicito de columnas + contract tests. |
| R5 | `isActive` vs `is_active` en usuarios. | Unificar y probar login/estado con paridad. |
| R6 | Split publico/privado por recurso. | Matriz de acceso + e2e por endpoint. |
| R7 | Paginacion estilo DRF (`{count,next,previous,results}`). | Helper de paginacion identico (Fase 1.6). |
| R8 | Busqueda de `tags` sobre jsonb. | RESUELTO (FASE 7): `applyTagFilter` (QueryBuilder `EXISTS ... jsonb_array_elements_text`, parametrizado) + e2e de paridad en articulos/noticias/documentos. |
| R9 | Cloudinary: se guarda `secure_url`; en prod carpetas hardcodeadas por vista, sin `secure`/validacion. | Servicio unico con carpetas por entorno; validacion por contenido. |
| R10 | Inconsistencias de soft-delete (`deletedAt` casi nunca) y 204-con-body. | RESUELTO: politica canonica de soft-delete (FASE 3) + 204 sin cuerpo en todos los modulos; inventario de sobres en `contract-matrix.md` (APIC-002, Tarea 8.5). |
| R11 | CSV de usuarios: en prod funciona (`cargar-por-csv/`); los 3 commits locales sin desplegar lo romperian. | NestJS mantiene `cargar-por-csv/` + alias opcional. |
| R12 | Host de despliegue distinto a Render. | Fase 9 (solo preparacion). |

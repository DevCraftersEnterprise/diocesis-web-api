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

---

## CRITICAL

| ID | Cat. | Ubicacion | Resumen | Accion prevista |
|---|---|---|---|---|
| BUG-DJANGO-001 | SECURITY | `config/.env.prod` | `DJANGO_ENV=dev` y `DEBUG=True` en el archivo de produccion -> API con DEBUG activo (stack traces, settings expuestos). | NestJS nunca expone stack traces; filtro global (Fase 1.4). Arreglo del `.env` en tarea propia de Django. |
| SECRET-001 | SECURITY | `config/.env.dev`, `config/.env.prod` | Contienen valores reales (`SECRET_KEY`, `DATABASE_URL`, `CLOUDINARY_API_SECRET`, `EMAIL_HOST_PASSWORD`). No trackeados, pero presentes en el arbol. | Verificar historial git; rotar secretos si hay duda; en este repo `.env` fuera de git desde el commit 1. |
| SECRET-002 | SECURITY | `db.sqlite3` (versionado) | Incluye `usuarios_usuario` con 6 filas: hashes de contrasena + emails + usernames. | `git rm --cached db.sqlite3` + `.gitignore` en tarea propia; tratar hashes como comprometidos si los usuarios son reales. |
| SECRET-004 | SECURITY | sesion de trabajo (Tarea 0.6) | La cadena de conexion completa de la BD PostgreSQL de **produccion** (Render), con contrasena en claro, quedo en el transcript al lanzar `pg_dump` contra prod en vez de contra la copia. El dump fue solo lectura (datos de prod intactos). | **ACCION INMEDIATA:** rotar la contrasena de la BD en Render y actualizar la env var del servicio Django. Mantener `docs/oracle/seed*.sql` (dataset real) fuera de git. En adelante, los scripts toman la URL de origen de una env var, nunca hardcodeada. |

## HIGH

| ID | Cat. | Ubicacion | Resumen | Accion prevista |
|---|---|---|---|---|
| BUG-DJANGO-002 | SECURITY | `apps/usuarios/views.py` ResetPasswordView | La nueva contrasena se fija igual al `username` (predecible). | NestJS: contrasena aleatoria + entrega segura o flujo "set password". Fase 2.11. |
| BUG-DJANGO-003 | BUG | `apps/parroquias/views.py` GET filtro `colonia` | `filter(coloniaId__nombre__icontains=...)`: el campo es `name`, no `nombre` -> FieldError -> 500 si llega `?colonia=`. El FE no lo envia hoy. | NestJS: filtrar por `colonia.name`. Fase 6. |
| BUG-DJANGO-004 | SECURITY | varios `views.py` (carrusel, padres, noticias, documentos, usuarios) | `except Exception as e: return Response({"error": str(e)})` filtra mensajes internos al cliente. | NestJS: error generico + log interno. Fase 8.4. |
| BUG-DJANGO-005 | SECURITY | `config/settings.py` + serializers/vistas de usuario | `AUTH_PASSWORD_VALIDATORS` configurado pero nunca invocado; se aceptan contrasenas arbitrarias. | NestJS: reglas equivalentes en DTO/servicio. Fase 2.8/2.11. |
| BUG-DJANGO-020 | SECURITY | `apps/usuarios/views.py` UsuarioAPIView.delete | Soft-delete no toca `is_active`; solo `cambiar-estado` lo sincroniza -> un usuario "eliminado" por DELETE puede seguir haciendo login. | NestJS: nocion unica de "activo" y bloqueo consistente. Fase 2.4. |
| BUG-DJANGO-021 | SECURITY | `apps/usuarios/views.py` UsuarioAPIView.put / .delete | Solo exigen `IsAuthenticated`; la unica regla de rol es "un `admin` no puede tocar a un `super`". Un rol `user` puede editar o desactivar (soft-delete) a cualquier usuario, incluido un `super`. `UsuarioSerializer.update()` tampoco lo impide. El layout admin muestra el menu completo a cualquier autenticado (no aplica `requiredRole`), asi que la ruta es alcanzable desde la UI. Detectado en Tarea 0.2. | NestJS: `RolesGuard` (admin/super) en `PUT`/`DELETE` de usuarios + jerarquia de roles explicita. Fase 2.6 / 2.9. |

## MEDIUM

| ID | Cat. | Ubicacion | Resumen | Accion prevista |
|---|---|---|---|---|
| BUG-DJANGO-006 | API CONTRACT | `apps/usuarios/urls.py` (prod `fe3fc98`) vs `main` local | **Invertido en Tarea 0.6.** En prod la ruta es `POST /users/usuarios/cargar-por-csv/` = **exactamente lo que llama el FE** -> la carga CSV **funciona en prod**. Son los 3 commits locales sin desplegar los que la renombran a `/cargar-csv/` (junto con padres/decanatos/colonias/parroquias), lo que **romperia el FE si se despliega tal cual**. | NestJS mantiene `/users/usuarios/cargar-por-csv/` (paridad con prod y FE). Opcional: aceptar tambien el alias `/cargar-csv/`. La regresion de los commits locales es un aviso para el equipo Django. |
| BUG-DJANGO-007 | SECURITY | serializers de noticias, articulos, documentos, decanatos, colonias, parroquias | `fields=__all__` con `read_only_fields` sin `createdBy` -> un PUT puede reasignar `createdBy` (mass assignment). | NestJS: ValidationPipe whitelist + DTOs explicitos. Fases 3-7. |
| BUG-DJANGO-008 | ARCHITECTURE | `apps/usuarios/views.py` list y detail | Solo `IsAuthenticated`: cualquier rol enumera todos los usuarios (email, rol) y consulta cualquiera por id (IDOR / info disclosure). | NestJS: RolesGuard (admin/super), validado contra la app real. Fase 2.6/2.7. |
| BUG-DJANGO-009 | BUG | `apps/usuarios/views.py` POST | Pasa `role=data.get(role)`; si falta, envia `None` y rompe el `default=user` -> IntegrityError. El FE siempre envia `role`. | NestJS: DTO con `role` requerido y default correcto. Fase 2.8. |
| BUG-DJANGO-010 | API CONTRACT | `apps/usuarios/serializers.py` update() | `update()` descarta `password` en `PUT /usuarios/{id}/`. El form de edicion del admin **no envia** `password` (solo `username,email,role`) -> sin impacto real hoy; el tipo `UserEditForm` lo permite pero ningun componente lo usa. Matizado en Tarea 0.2. | NestJS: DTO de update sin `password`; cambio de contrasena por endpoint dedicado. Fase 2.9. Ver FE-001. |
| SECURITY-003 | SECURITY | `config/settings.py` | `CORS_ALLOW_ALL_ORIGINS = True`. | NestJS: allowlist por env (`CORS_ORIGINS`). Fase 1.9. |
| SECURITY-006 | SECURITY | `apps/auth_token`, `apps/usuarios` | Sin rate limiting en `login`, `change-password`, `reset-password`. | NestJS: throttler. Fase 8.1. |
| SECURITY-008 | SECURITY | subidas de archivo (prod `fe3fc98`) | **Re-scoped en Tarea 0.6.** En **prod NO hay validacion de archivos**: `apps/core/file_validators.py` no existe en `fe3fc98`; carrusel/padres/parroquias/noticias/documentos aceptan **cualquier tipo y tamano**. La validacion por ext+mime+size (aun debil) es de los 3 commits locales sin desplegar. | NestJS: validacion por **contenido** (magic bytes) + limites de tamano por tipo. Fase 4. |
| BUG-DJANGO-011 | DATABASE | noticias/articulos/documentos GET filtro `tags` | `queryset.extra(where=[... jsonb_array_elements_text ...])`: SQL crudo, `.extra()` deprecado, rompe en SQLite local. Parametrizado (sin inyeccion). | NestJS: QueryBuilder con EXISTS encapsulado + tests. Fase 7. |
| BUG-DJANGO-023 | DATABASE | `apps/carrusel` (`main` local) + despliegue | **Confirmado solo-local en Tarea 0.6.** En prod (`fe3fc98`) `Carrusel` es `models.Model` de 6 campos y **todo el endpoint funciona**. El commit local `83a24be` (sin desplegar) lo convierte en `BaseModel` + migracion `0003`; con `render.yaml` sin paso `migrate`, desplegar esos commits **romperia carrusel en prod** (`GET` incluido, por `fields='__all__'` -> `column carrusel_carrusel.updatedAt does not exist`). Verificado en el oraculo. | **Decidido (ADR-004 DQ3-B):** migracion aditiva `0002-carrusel-basemodel-fields` posterior a la baseline (4 columnas + FK + indices, backfill de `updatedAt` desde `createdAt` en las 21 filas); entidad `Carrusel` extiende `BaseEntity`. La respuesta de `/carrusel/` gana `updatedAt`/`deletedAt`/`updatedBy`/`deletedBy` (delta aditivo no disruptivo). Fase 5. Avisar al equipo Django del landmine de despliegue. |
| BUG-DJANGO-012 | ARCHITECTURE | vistas de detalle/edicion de varios modulos | Soft-delete incoherente: unos filtran `isActive=True`, otros no; el detalle a veces devuelve filas borradas. | Definir comportamiento canonico (ADR). Fase 3+. |
| BUG-DJANGO-022 | BUG | `apps/decanatos/views.py` / `apps/colonias/views.py` GET detail + FE `parish-details.ts` | El detalle de decanato/colonia filtra `isActive=True` -> 404 si esta soft-deleted. `parish-details` hace `forkJoin({decanato, padre, colonia})` sin handler de error: si una parroquia referencia un decanato/colonia soft-deleted, la pagina publica de detalle rompe (queda cargando). Relacionado con BUG-DJANGO-012. Detectado en Tarea 0.2. | NestJS: comportamiento canonico de soft-delete en detalle (o no filtrar en detalle); el FE puede necesitar un handler de error (tarea de frontend). Fase 3 / 6. |
| BUG-DJANGO-013 | BUG | delete() de casi todos los modulos (prod `fe3fc98`) | **Ampliado en Tarea 0.6.** Fijan `isActive=False` + `deletedBy` pero **no `deletedAt`**: aplica a padres, decanatos, colonias, parroquias, noticias, articulos, documentos. Excepciones: `usuarios` SI fija `deletedAt`; `carrusel` no fija ninguno (columnas inexistentes). | NestJS: soft-delete uniforme (`deletedAt` + `deletedBy` siempre). Fase 8.3. |
| BUG-DJANGO-024 | BUG | `apps/decanatos/views.py` `DecanatoView.get` (prod `fe3fc98`) | Hace `page = paginator.paginate_queryset(...)` pero luego `serializer = DecanatoSerializer(queryset, many=True)` (el `queryset` completo, no la `page`). -> `GET /api/decanatos/` devuelve `count`/`next`/`previous` paginados pero `results` con **todas** las filas (9), ignorando `page_size`. Solo decanatos (colonias serializa `page` bien). Con 9 filas nadie lo noto. El `main` local lo corrige. Detectado en Tarea 0.6. | NestJS: paginacion correcta (`results` respeta `page_size`) -> delta intencional documentado en `contract-matrix.md`. Fase 3. |
| APIC-002 | API CONTRACT | respuestas de varios endpoints | Sobres inconsistentes: usuarios `{mensaje,data}`; resto objeto plano; deletes `{detail}` con 204 + body. | Inventariar por endpoint que lee el FE (Tarea 0.2); unificar 204 sin body como delta intencional. Fase 8.3. |
| APIC-003 | API CONTRACT | `apps/padres/views.py` GET vs `decanatos`/`colonias` GET | `/padres/` pagina solo si llega `page`/`page_size` (si no, array plano); `/decanatos/` y `/colonias/` paginan SIEMPRE. `parishes.ts` usa `getAllPadres({isActive:true})` sin `page` y **depende del array plano**; `getAllDecanatos`/`getAllColonias` dependen del objeto paginado. No es codigo muerto. NestJS debe preservar ambas formas exactas. Matizado en Tarea 0.2. | Replicar por endpoint; ver `contract-matrix.md`. Fase 3 / 4. |
| APIC-004 | API CONTRACT | manejo de errores global | Formas mezcladas: `{detail}` vs `{error}` vs `{campo:[msgs]}`. El FE `login` lee `err.error.detail`. | NestJS: filtro global con formas compatibles. Fase 1.4. |
| TEST-001 | TESTING | ambos proyectos | Cobertura de tests nula -> sin red de seguridad de referencia. | Arnes de paridad + tests por slice. Fases 0.7 y 2+. |

## LOW

| ID | Cat. | Ubicacion | Resumen | Accion prevista |
|---|---|---|---|---|
| BUG-DJANGO-015 | BUG | `apps/core/cloudinary_folders.py` (`main` local, sin desplegar) | **Re-scoped en Tarea 0.6.** El archivo **no existe en prod** (`fe3fc98`): las subidas usan carpetas **hardcodeadas** por vista (`carrusel/imagenes`, `padres`, `parroquia`, `noticias`, `documentos`). El bug del `env == "production"` vs `"prod"` es del commit local `86c37cd` sin desplegar. | NestJS: carpetas de Cloudinary por entorno, bien hechas (env correcta). Fase 4 / 8.5. |
| ARCH-007 | MAINTAINABILITY | raiz de `diocesis-backend-python/` | Directorios muertos (articulos/, carrusel/, ... con solo `__pycache__/` y `migrations/`); el codigo vive en `apps/`. | No migrar. Limpieza opcional en tarea propia de Django. |
| ARCH-008 | MAINTAINABILITY | `apps/auth_token` | `models.py` vacio; `CustomTokenObtainPairView(TokenObtainPairView): pass`. | NestJS: modulo `auth` propio. Fase 2. |
| ARCH-009 | MAINTAINABILITY | padres/articulos views, settings.py | `print()` de depuracion. | No portar. |
| BUG-DJANGO-014 | BUG | `apps/usuarios/serializers.py` create() | `create_user()` (ya hashea) + `set_password()` + `save()` otra vez (doble hashing, inofensivo). | NestJS: un solo hashing. Fase 2.8. |
| PERF-001 | PERFORMANCE | FE `parish-details` | 3 requests extra (decanato, padre, colonia) por vista de parroquia. | No es regresion a preservar; posible respuesta expandida post-migracion. |
| PERF-003 | PERFORMANCE | esquema de DB | Sin indices mas alla de PK/unique/FK; filtros `icontains` -> seq scan. Dataset diminuto hoy. | Revisar al escalar. |
| PERF-004 | PERFORMANCE | vistas con Cloudinary | `cloudinary.config()` en cada request. | NestJS: servicio con config unica. Fase 4. |
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
| R8 | Busqueda de `tags` sobre jsonb. | Reproducir con QueryBuilder + tests de paridad. |
| R9 | Cloudinary: se guarda `secure_url`; en prod carpetas hardcodeadas por vista, sin `secure`/validacion. | Servicio unico con carpetas por entorno; validacion por contenido. |
| R10 | Inconsistencias de soft-delete (`deletedAt` casi nunca) y 204-con-body. | Congelar comportamiento actual; unificar como delta intencional (Fase 8.3). |
| R11 | CSV de usuarios: en prod funciona (`cargar-por-csv/`); los 3 commits locales sin desplegar lo romperian. | NestJS mantiene `cargar-por-csv/` + alias opcional. |
| R12 | Host de despliegue distinto a Render. | Fase 9 (solo preparacion). |

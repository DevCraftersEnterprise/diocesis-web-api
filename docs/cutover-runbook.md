# Runbook de corte a produccion (FASE 9)

Estado de este documento: **preparacion, sin ejecutar.** Ninguno de los pasos de este
runbook se ha llevado a cabo — requieren credenciales de Render/Cloudinary/GitHub de
produccion que esta sesion de trabajo no tiene ni debe tener. Lo ejecuta el equipo/el
usuario cuando decida el corte.

Django (`diocesis-backend-python`, commit `fe3fc98` en produccion) y el frontend Angular
(`diocesis-frontend-material`) **no se tocan** salvo en los pasos que lo dicen
explicitamente (apagar Django, cambiar `environment.production.ts`).

---

## 0. Antes de nada: rotaciones de secretos pendientes

Estas acciones son independientes del corte en si, pero **deben** completarse antes o en
el momento del corte (ver `docs/findings.md`):

| Finding | Que rotar | Por que |
|---|---|---|
| **SECRET-004** | Contrasena de la BD PostgreSQL de produccion (Render) | Quedo en claro en un transcript de trabajo (Tarea 0.6). |
| **SECRET-005** | `CLOUDINARY_API_SECRET` | Quedo en un transcript (Tarea 1.1). |
| **SECRET-006** | Tu propia contrasena de usuario | Un hash PBKDF2 truncado + tu email quedaron en un transcript via un `DETAIL` de Postgres (Tarea 8.2). Se resuelve solo con el primer login exitoso post-corte (rehash a argon2id, ADR-002), pero cambiar la contrasena es mas directo. |

Tras rotar SECRET-004, **actualiza `DATABASE_URL` en Django (Render) inmediatamente**
para no dejarlo caido antes de estar listo para el corte.

## 1. Backup antes de tocar el esquema

```powershell
pg_dump "postgresql://<usuario>:<password>@<host>/<db>?sslmode=require" -F c -f backup-pre-corte.dump
```

Guardalo fuera del repo (nunca se versiona un dump con datos reales).

## 2. Preparar el servicio NestJS en Render

`render.yaml` (raiz de este repo) describe el servicio. Alternativas:

- **Servicio nuevo** (recomendado): crea un Web Service Render distinto
  (`diocesis-backend-nest`), aplica `render.yaml` o configuralo a mano con las mismas
  variables. Obtienes una URL nueva (`https://diocesis-backend-nest.onrender.com`) sin
  tocar el servicio Django todavia — permite probar en paralelo antes de mover el
  frontend.
- **Reemplazar el servicio existente**: mas arriesgado (sin marcha atras rapida). No
  recomendado para el primer corte.

### Variables de entorno a fijar en el dashboard de Render (las `sync: false` de `render.yaml`)

| Variable | Valor |
|---|---|
| `DATABASE_URL` | La cadena de conexion de la BD de produccion (password YA rotada, paso 0). |
| `DATABASE_SSL` | `true` (Postgres gestionado de Render exige SSL). |
| `JWT_SECRET` | **Generar uno NUEVO** (`openssl rand -base64 48` o similar). Nunca el `SECRET_KEY` de Django (ADR-002, decision D1-A: corte duro). Minimo 16 caracteres (lo valida `env.validation.ts`), en la practica usar 32+. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Las credenciales de Cloudinary (API secret YA rotado, paso 0). |
| `CORS_ORIGINS` | El/los dominio(s) del frontend en produccion, coma-separados. Sin esto, el frontend no puede llamar a la API (fail-closed, SECURITY-003). |

El resto de variables de `render.yaml` ya traen un valor por defecto razonable
(`THROTTLE_AUTH_LIMIT=10`, `LOG_LEVEL=info`, etc.) y no requieren accion salvo que se
quieran ajustar.

## 3. Poner las migraciones de TypeORM al dia en produccion (una sola vez)

La BD de produccion **ya tiene** el esquema completo (Django la creo), pero **no tiene**
la tabla `migrations` de TypeORM (Django usa `django_migrations`, una tabla distinta que
NestJS no toca). Sin este paso, `migration:run` intentaria ejecutar la migracion baseline
completa (`CREATE TABLE ...`) contra tablas que ya existen y fallaria.

Sigue el mismo "Caso A" documentado en `docs/db/migrations.md` para el oraculo, contra
produccion:

```sql
-- Conectado a la BD de produccion (psql o el cliente que prefieras):
CREATE TABLE IF NOT EXISTS migrations (
  id          SERIAL PRIMARY KEY,
  "timestamp" bigint NOT NULL,
  name        varchar NOT NULL
);
INSERT INTO migrations ("timestamp", name)
VALUES (1788804486651, 'BaselineProductionSchema1788804486651');
```

Despues, desde este repo, apuntando `DATABASE_URL` a produccion:

```powershell
$env:DATABASE_URL = "postgresql://...produccion..."
$env:DATABASE_SSL = "true"
npm run migration:show   # debe listar [X] Baseline, [ ] Carrusel, [ ] CheckTypeRole
npm run migration:run    # aplica las 2 migraciones aditivas pendientes
npm run migration:show   # debe quedar 3x [X]
```

Ambas migraciones ya se probaron contra el oraculo (copia de produccion):
`CarruselBasemodelFields` (backfill de `updatedAt` verificado 21/21) y
`CheckTypeRoleDomain` (CHECK de dominio, datos actuales cumplen). Son **aditivas**: no
borran columnas ni filas.

## 4. Corte de autenticacion (ADR-002, decision D1-A: corte duro)

En el instante en que el servicio NestJS empiece a aceptar trafico real:

1. **Django pasa a solo lectura** (o se apaga): el verificador PBKDF2 -> argon2id de
   NestJS reescribe `usuarios_usuario.password` en el primer login de cada usuario; si
   Django sigue escribiendo esa misma tabla en paralelo, se pueden pisar cambios.
2. Los tokens JWT que Django emitio **dejan de ser validos** (secreto distinto). Los
   pocos usuarios con sesion abierta inician sesion otra vez una sola vez.
3. **Rotar/retirar `SECRET_KEY` de Django** una vez confirmado el corte, para que no
   queden sesiones/tokens Django validos flotando.

## 5. Mover el frontend

`diocesis-frontend-material/src/environments/environment.production.ts` apunta hoy a
`https://diocesis-backend.onrender.com/api` (el Django actual). Para consumir el nuevo
backend:

1. Cambiar `apiUrl` a la URL del servicio NestJS.
2. Rebuild + redeploy del frontend (fuera de alcance de este repo; sigue el proceso que
   ya use el equipo de frontend).

Si se opto por "servicio nuevo" en el paso 2, este es el momento de cambiar de verdad el
trafico real; hasta aqui todo era reversible sin afectar a usuarios.

## 6. Verificacion post-corte (smoke test)

- [ ] `GET /health` -> 200.
- [ ] Login con un usuario real -> `200 {access, refresh}`; el `password` en BD pasa a
      `$argon2id$...` (verificar con una consulta `SELECT password FROM usuarios_usuario
      WHERE username = '...'` — hash truncado en cualquier log, nunca completo).
- [ ] Un GET publico de cada modulo de contenido (`/carrusel/`, `/parroquias/`,
      `/noticias/`, `/articulos/`, `/documentos/`, `/padres/`, `/decanatos/`,
      `/colonias/`) responde 200 con datos reales.
- [ ] Un create/update autenticado (p. ej. crear un articulo) -> 201/200 y visible en el
      admin del frontend.
- [ ] Una subida de archivo (p. ej. `picture` de una noticia) -> 201 con `secure_url` de
      Cloudinary real.
- [ ] 6+ logins fallidos rapidos contra el mismo usuario -> 429 (throttler, SECURITY-006).
- [ ] Revisar logs de Render unos minutos: sin `ECONNREFUSED`, sin 5xx inesperados.

## 7. Rollback

Mientras el frontend siga apuntando a `environment.production.ts` sin desplegar, o si se
uso "servicio nuevo": **revertir `apiUrl` al backend Django y redeployar el frontend**.
Django sigue intacto (nunca se modifico su codigo) y solo se le pidio pasar a solo
lectura — reactivar su escritura basta para retomarlo, **siempre que no se haya
reactivado ya la escritura de Django DESPUES de que algun usuario migrara a
argon2id** (ADR-002, consecuencia documentada: esos usuarios no podrian volver a entrar
por Django, porque Django no entiende hashes argon2id). Si eso ya paso, el rollback
implica resetear la contrasena de esos usuarios en Django o esperar a resolver el corte
hacia adelante.

## 8. Despues de confirmar el corte

- Decidir el destino de `diocesis-backend-python` en Render (apagar el servicio,
  mantenerlo pausado como referencia, o archivarlo).
- Actualizar este documento con la fecha y el resultado real del corte.
- Revisar `docs/findings.md` R2/R3/R5/R6/R9/R11/R12 (riesgos de migracion) y cerrarlos
  con el resultado observado.

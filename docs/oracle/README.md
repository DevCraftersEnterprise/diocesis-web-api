# Oraculo de paridad (Django de produccion en local)

Este directorio levanta el **Django que corre en produccion** para usarlo como oraculo:
misma peticion -> Django y -> NestJS -> comparar (Tarea 0.7).

- **Ref de produccion: `fe3fc98`** = `origin/main` del repo Django (lo que Render despliega).
  El `main` local esta 3 commits por delante y **NO desplegado** (ver
  `../findings.md`, cabecera). El oraculo usa `fe3fc98`, no el `main` local.
- El repo `diocesis-backend-python` **no se modifica**: se usa una `git worktree` aparte y
  se pasan variables de entorno.
- La BD del oraculo es un PostgreSQL 16 en Docker (puerto host **5433**), cargado con
  `../db/schema.sql` (esquema exacto de prod) + un volcado de datos reales.

## Requisitos

- Docker Desktop.
- Python 3.13 (para el venv del oraculo).
- Acceso de solo lectura a un origen de datos: la copia en Neon **o** la BD de prod en
  Render (el volcado es `--data-only`, solo lectura).

## Puesta en marcha (una vez)

```powershell
# 1) Worktree del Django de produccion (carpeta hermana, no toca tu checkout)
git -C ..\diocesis-backend-python worktree add ..\diocesis-backend-python-prod fe3fc98

# 2) venv aislado para el oraculo (en este repo, gitignored)
python -m venv .venv-oracle
.\.venv-oracle\Scripts\python.exe -m pip install --upgrade pip
.\.venv-oracle\Scripts\python.exe -m pip install -r ..\diocesis-backend-python\requirements.txt "Django>=5.1,<5.2"

# 3) Levantar la BD + cargar esquema + datos
$env:ORACLE_SOURCE_URL = "postgresql://USER:PASS@HOST/DB"   # Neon o prod. NO se versiona.
./docs/oracle/load-db.ps1
```

`load-db.ps1` deja `docs/oracle/seed.local.sql` (gitignored: **datos reales de personas +
hashes de contrasena**). Trátalo como confidencial.

## Uso diario

```powershell
# Arranca el oraculo (Ctrl+C para parar). Puerto 8000 por defecto.
./docs/oracle/run-oracle.ps1
# o:  ./docs/oracle/run-oracle.ps1 -Port 8010
```

En otra terminal, peticiones directas (`Invoke-RestMethod http://127.0.0.1:8000/api/...`).
Comparar el **JSON crudo**, no objetos parseados (PowerShell convierte fechas ISO a
`[datetime]` al mostrarlas).

## Resetear la BD (estado limpio para pruebas que mutan)

```powershell
docker compose -f docs/oracle/docker-compose.yml down -v
./docs/oracle/load-db.ps1 -SkipDump    # reusa el seed.local.sql que ya tienes
```

## Pruebas de autenticacion

El seed trae los 4 usuarios reales con sus hashes, pero **no conocemos sus contrasenas**.
Para probar `login`, fija una conocida en un usuario del oraculo (solo toca la BD local):

```powershell
docker run --rm --network diocesis-oracle_default postgres:16 `
  psql "postgresql://oracle:oracle@diocesis-oracle-db:5432/diocesis_oracle" `
  -c "SELECT username FROM usuarios_usuario;"
# luego, con el Django del oraculo:
Push-Location ..\diocesis-backend-python-prod
$env:DJANGO_ENV="oracle"; $env:SECRET_KEY="x"; $env:DEBUG="True"; $env:ALLOWED_HOSTS="127.0.0.1"
$env:DATABASE_URL="postgres://oracle:oracle@127.0.0.1:5433/diocesis_oracle"
..\diocesis-backend-nest\.venv-oracle\Scripts\python.exe manage.py changepassword <username>
Pop-Location
```

## Actualizar el oraculo a otra ref de produccion

Si Render pasa a desplegar otro commit:

```powershell
git -C ..\diocesis-backend-python fetch
git -C ..\diocesis-backend-python-prod checkout <nuevo-commit>
# y re-revisar docs/endpoints-inventory.md / contract-matrix.md / findings.md
```

## Comportamiento del oraculo confirmado (Tarea 0.6)

- `GET /api/carrusel/` funciona: array de **6 campos** (`Carrusel` es `models.Model`, no
  `BaseModel`). BUG-DJANGO-023 es solo del `main` local.
- `GET /api/decanatos/?page_size=1` devuelve `results` con **todas** las filas
  (BUG-DJANGO-024). `colonias` pagina bien.
- `?tags=...` funciona (SQL crudo jsonb, solo Postgres).
- `POST /api/token/login/` con credenciales falsas -> 401
  `{"detail":"No active account found with the given credentials"}`.

## Limpieza total

```powershell
docker compose -f docs/oracle/docker-compose.yml down -v
git -C ..\diocesis-backend-python worktree remove ..\diocesis-backend-python-prod
Remove-Item -Recurse -Force .venv-oracle, docs/oracle/seed.local.sql
```

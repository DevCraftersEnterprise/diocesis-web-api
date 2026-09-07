#Requires -Version 7
# Arranca el Django de produccion (fe3fc98) como oraculo de paridad.
#   ./docs/oracle/run-oracle.ps1 [-Port 8000]
# NO modifica el repo diocesis-backend-python. No versiona secretos.

param(
    [int]$Port = 8000,
    [string]$DjangoDir = (Join-Path $PSScriptRoot '..\..\..\diocesis-backend-python-prod'),
    [string]$VenvPython = (Join-Path $PSScriptRoot '..\..\.venv-oracle\Scripts\python.exe')
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $DjangoDir)) {
    throw "No existe la worktree del Django de prod en '$DjangoDir'. Crea la worktree:`n" +
          '  git -C ..\diocesis-backend-python worktree add ..\diocesis-backend-python-prod fe3fc98'
}
if (-not (Test-Path $VenvPython)) {
    throw "No existe el venv del oraculo en '$VenvPython'. Crealo (ver docs/oracle/README.md)."
}

# Variables de entorno del oraculo (locales, NO secretas).
# DJANGO_ENV=oracle -> settings.py hace load_dotenv('config/.env.oracle'), que no existe -> no-op.
$env:DJANGO_ENV            = 'oracle'
$env:SECRET_KEY            = 'oracle-local-not-a-secret'
$env:DEBUG                 = 'True'
$env:ALLOWED_HOSTS         = '127.0.0.1,localhost'
$env:DATABASE_URL          = 'postgres://oracle:oracle@127.0.0.1:5433/diocesis_oracle'
$env:CLOUDINARY_CLOUD_NAME = ''
$env:CLOUDINARY_API_KEY    = ''
$env:CLOUDINARY_API_SECRET = ''

Write-Host "==> Oraculo (fe3fc98) en http://127.0.0.1:$Port  (Ctrl+C para parar)"
Push-Location $DjangoDir
try {
    & $VenvPython manage.py runserver "127.0.0.1:$Port"
}
finally {
    Pop-Location
}

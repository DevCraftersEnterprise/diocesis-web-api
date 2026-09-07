#Requires -Version 7
# (Re)carga la BD del oraculo: levanta el contenedor, aplica docs/db/schema.sql y
# carga los datos desde $env:ORACLE_SOURCE_URL (Neon o prod) a docs/oracle/seed.local.sql.
#
#   $env:ORACLE_SOURCE_URL = "postgresql://user:pass@host/db"   # NO se versiona ni se imprime
#   ./docs/oracle/load-db.ps1            # descarga seed nuevo y recarga todo
#   ./docs/oracle/load-db.ps1 -SkipDump  # reusa el seed.local.sql existente
#
# docs/oracle/seed.local.sql queda gitignored: contiene datos reales de produccion.

param(
    [switch]$SkipDump,
    [string]$Compose   = (Join-Path $PSScriptRoot 'docker-compose.yml'),
    [string]$SeedSql   = (Join-Path $PSScriptRoot 'seed.local.sql')
)

$ErrorActionPreference = 'Stop'
$db       = 'postgresql://oracle:oracle@diocesis-oracle-db:5432/diocesis_oracle'
$net      = 'diocesis-oracle_default'
$img      = 'postgres:16'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

Write-Host '==> Levantando el contenedor de la BD del oraculo'
docker compose -f $Compose up -d
for ($i = 0; $i -lt 30; $i++) {
    if ((docker inspect -f '{{.State.Health.Status}}' diocesis-oracle-db 2>$null) -eq 'healthy') { break }
    Start-Sleep -Seconds 1
}

Write-Host '==> Cargando el esquema (docs/db/schema.sql)'
docker run --rm --network $net $img psql $db -c 'DROP SCHEMA IF EXISTS public CASCADE;' | Out-Null
docker run --rm -v "${repoRoot}:/work" --network $net $img `
    psql $db -v ON_ERROR_STOP=1 -f /work/docs/db/schema.sql | Out-Null

if (-not $SkipDump) {
    if (-not $env:ORACLE_SOURCE_URL) {
        throw 'Falta $env:ORACLE_SOURCE_URL (cadena de conexion de origen). No se versiona ni se imprime.'
    }
    Write-Host '==> Volcando datos del origen -> docs/oracle/seed.local.sql (solo lectura sobre el origen)'
    docker run --rm -v "${PSScriptRoot}:/out" $img `
        pg_dump $env:ORACLE_SOURCE_URL --data-only --no-owner --disable-triggers --schema=public -f /out/seed.local.sql
}

if (-not (Test-Path $SeedSql)) { throw "No existe $SeedSql. Ejecuta sin -SkipDump con ORACLE_SOURCE_URL." }

Write-Host '==> Cargando el seed en el oraculo'
docker run --rm -v "${PSScriptRoot}:/in" --network $net $img `
    psql $db -v ON_ERROR_STOP=1 --single-transaction -f /in/seed.local.sql | Out-Null

Write-Host '==> Conteos (deben cuadrar con docs/db/row-counts.md)'
docker run --rm --network $net $img psql $db -c @'
SELECT 'usuarios_usuario' t, count(*) n FROM usuarios_usuario
UNION ALL SELECT 'padres_padre', count(*) FROM padres_padre
UNION ALL SELECT 'colonias_colonia', count(*) FROM colonias_colonia
UNION ALL SELECT 'decanatos_decanato', count(*) FROM decanatos_decanato
UNION ALL SELECT 'parroquias_parroquia', count(*) FROM parroquias_parroquia
UNION ALL SELECT 'noticias_noticia', count(*) FROM noticias_noticia
UNION ALL SELECT 'carrusel_carrusel', count(*) FROM carrusel_carrusel
UNION ALL SELECT 'articulos_articulo', count(*) FROM articulos_articulo
UNION ALL SELECT 'documentos_documento', count(*) FROM documentos_documento
UNION ALL SELECT 'django_migrations', count(*) FROM django_migrations
ORDER BY t;
'@

Write-Host '==> Listo. Arranca el oraculo con:  ./docs/oracle/run-oracle.ps1'

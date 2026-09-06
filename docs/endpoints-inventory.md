# Inventario de endpoints

Estado: **borrador**. Se completa en la Tarea 0.2 (verificado contra la app en ejecucion).

Fuente: `diocesis-backend-python/config/urls.py` + `apps/*/urls.py` + los servicios del
frontend en `diocesis-frontend-material/src/app/**/services/*.ts`.

## Convencion de columnas

- **#**: identificador correlativo del endpoint.
- **Metodo**: verbo HTTP.
- **Endpoint**: ruta relativa a `/api`.
- **Auth**: `-` publico sin token / `Pub` GET publico (AllowAny) / `JWT` requiere token / `admin/super` requiere rol.
- **FE**: `Si` / `No` / `Roto` segun si lo consume el frontend actual.
- **Notas**: peculiaridades a preservar o corregir (referencia a `findings.md`).

## Tabla

| # | Metodo | Endpoint | Auth | FE | Notas |
|---|---|---|---|---|---|
| _pendiente Tarea 0.2_ | | | | | |

## Endpoints sin consumidor en el frontend

_pendiente Tarea 0.2_

# Matriz de compatibilidad frontend <-> backend

Estado: **borrador**. Se completa en la Tarea 0.2.

Cada endpoint que el frontend consume hoy es un **contrato**: NestJS debe mantener
metodo, URL, parametros, forma del body, nombres de campos, forma de la respuesta,
codigos de estado y mecanismo de autenticacion, salvo diferencias intencionales
anotadas en la columna **Estado** y justificadas en `findings.md`.

## Convencion de columnas

- **Frontend**: archivo/metodo del servicio Angular que hace la llamada.
- **Metodo**: verbo HTTP.
- **Endpoint Django**: ruta actual (relativa a `/api`).
- **Request**: params de ruta, query params, forma del body / content-type.
- **Response**: forma del cuerpo, campos, codigo(s) de estado.
- **Endpoint NestJS**: ruta prevista (normalmente identica).
- **Estado**: `pendiente` / `paridad` / `delta intencional` / `bloqueado por <ID>`.

## Tabla

| Frontend | Metodo | Endpoint Django | Request | Response | Endpoint NestJS | Estado |
|---|---|---|---|---|---|---|
| _pendiente Tarea 0.2_ | | | | | | |

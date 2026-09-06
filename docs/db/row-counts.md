# Conteos de filas (produccion)

Captura: 2026-09-06. Origen: copia `pg_dump` de produccion restaurada en Neon (PostgreSQL
16.15). Metodo: `SELECT count(*)` por tabla contra la copia.

## Tablas de negocio

| Tabla | Filas | Nota |
|---|---|---|
| `usuarios_usuario` | 4 | El `db.sqlite3` local (obsoleto) tenia 6; la cifra real de prod es 4. |
| `carrusel_carrusel` | 21 | |
| `padres_padre` | 93 | |
| `colonias_colonia` | 93 | |
| `decanatos_decanato` | 9 | |
| `parroquias_parroquia` | 4 | |
| `noticias_noticia` | 21 | |
| `articulos_articulo` | **0** | Funcionalidad nunca usada en produccion. |
| `documentos_documento` | **0** | Funcionalidad nunca usada en produccion. |

Total de filas de negocio: ~245.

## Tablas de Django / auth

| Tabla | Filas |
|---|---|
| `django_migrations` | 31 |
| `django_admin_log` | 0 |
| `django_session` | 0 |
| `usuarios_usuario_groups` | 0 |
| `usuarios_usuario_user_permissions` | 0 |

## Implicaciones para la migracion

- **Volumen minusculo** -> migrar los datos no es un problema de rendimiento; el reto es
  de correccion y compatibilidad, no de escala.
- **`articulos` y `documentos` con 0 filas** -> son los modulos de menor riesgo para
  migrar, y conviene confirmar con el cliente si esas funcionalidades siguen deseandose
  antes de invertir en pulirlas.
- **`django_admin_log` y `django_session` vacias** -> ni el admin de Django ni las
  sesiones se usan; refuerza dejar `/admin/` fuera de alcance de la migracion.
- **`usuarios_usuario_groups` / `..._user_permissions` vacias** -> el sistema de
  grupos/permisos granulares de Django no se usa; la autorizacion real es el campo `role`
  (`super`/`admin`/`user`).

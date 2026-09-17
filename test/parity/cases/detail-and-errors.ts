import type { ParityCase } from '../types';

/**
 * Detalle por id (sin auth, sin efectos secundarios) de cada catalogo/contenido con
 * datos reales en el oraculo. Los UUID son filas activas conocidas del oraculo
 * (copia de prod) — no son secretos, solo identificadores opacos.
 *
 * `articulos`/`documentos` no tienen fila alguna en el oraculo (0 filas reales en prod
 * a la fecha de este arnes) -> no hay id que fijar; sus listas vacias ya se cubren en
 * `public-get.ts`.
 */
export const detailGetCases: ParityCase[] = [
  {
    id: 'decanatos-detail',
    description: 'GET /decanatos/{id}/',
    method: 'GET',
    path: '/decanatos/b1d4722b-e78b-4805-b072-7ddd8958eb2f/',
  },
  {
    id: 'colonias-detail',
    description: 'GET /colonias/{id}/',
    method: 'GET',
    path: '/colonias/59b0d93e-45d6-4b8a-b270-29fb75ff0bba/',
  },
  {
    id: 'padres-detail',
    description: 'GET /padres/{id}/',
    method: 'GET',
    path: '/padres/607d46d1-c319-486b-a3b1-b121ad461109/',
  },
  {
    id: 'parroquias-detail',
    description: 'GET /parroquias/{id}/',
    method: 'GET',
    path: '/parroquias/97f1b0b0-8303-4020-a767-abbd0e6e9c04/',
  },
  {
    id: 'noticias-detail',
    description: 'GET /noticias/{id}/',
    method: 'GET',
    path: '/noticias/5b9bddc1-b1b7-420d-928d-27888f24a6e4/',
  },
  {
    id: 'carrusel-detail',
    description: 'GET /carrusel/{id}/',
    method: 'GET',
    path: '/carrusel/5161e04a-8048-4276-b9e3-df5efc01df2c/',
    expectedDelta:
      'ADR-004 DQ3-B (resuelve BUG-DJANGO-023): NestJS anade updatedAt/deletedAt/' +
      'updatedBy/deletedBy (campos ausentes en el `Carrusel` de 6 columnas de Django).',
  },
  {
    id: 'decanatos-detail-404',
    description: 'GET /decanatos/{uuid-inexistente}/ -> 404',
    method: 'GET',
    path: '/decanatos/00000000-0000-0000-0000-000000000000/',
    expectedDelta:
      'Mensaje: Django "No Decanato matches the given query." (default de ' +
      '`get_object_or_404`) vs NestJS "No encontrado." (generico, unificado en los 10 ' +
      'modulos). Forma `{detail}` y status identicos; el FE no compara el texto.',
  },
];

/**
 * Sin token en un endpoint protegido -> 401. Y validacion de `refresh` -> 400. Ninguno
 * de los dos toca la BD (el guard/pipe corta antes del handler): repetibles sin dejar
 * residuo. Un representante por familia de endpoints basta (el guard/pipe es el mismo
 * middleware global para todos).
 */
export const authErrorCases: ParityCase[] = [
  {
    id: 'no-token-users-list',
    description: 'GET /users/usuarios/ sin token -> 401',
    method: 'GET',
    path: '/users/usuarios/',
    expectedDelta:
      'Mensaje en espanol (NestJS) vs ingles (Django, default de DRF): el status y la ' +
      'forma `{detail}` coinciden; el FE solo actua sobre el status 401 (logout global), ' +
      'nunca compara el texto (`login.ts` solo lo pasa a `console.error`).',
  },
  {
    id: 'no-token-decanatos-post',
    description: 'POST /decanatos/ sin token -> 401 (no crea nada)',
    method: 'POST',
    path: '/decanatos/',
    body: { name: 'no deberia crearse' },
    expectedDelta: 'Mismo delta de mensaje que no-token-users-list.',
  },
  {
    id: 'no-token-noticias-delete',
    description: 'DELETE /noticias/{id}/ sin token -> 401 (no borra nada)',
    method: 'DELETE',
    path: '/noticias/5b9bddc1-b1b7-420d-928d-27888f24a6e4/',
    expectedDelta: 'Mismo delta de mensaje que no-token-users-list.',
  },
  {
    id: 'refresh-missing-body',
    description: 'POST /token/refresh/ sin `refresh` -> 400 { refresh: [...] }',
    method: 'POST',
    path: '/token/refresh/',
    body: {},
    expectedDelta:
      'Forma `{refresh:[...]}` identica; el texto/cantidad de mensajes difiere ' +
      '(mensajes por defecto de DRF vs class-validator). El FE no lee este endpoint ' +
      '(nunca llama a /token/refresh/).',
  },
];

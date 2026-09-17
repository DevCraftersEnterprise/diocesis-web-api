import type { ParityCase } from '../types';

/**
 * `next`/`previous` de la paginacion DRF: NestJS los devuelve `null` siempre (el FE no
 * los usa, ver "Deltas intencionales" en `contract-matrix.md`). Se ignoran en cada caso
 * de lista paginada para no ensuciar la corrida con un diff ya aceptado.
 */
const IGNORE_PAGINATION_LINKS = ['next', 'previous'] as const;

/**
 * Casos GET publicos (sin auth), sin efectos secundarios. Cubren los 10 modulos de la
 * API. Las mutaciones (POST/PUT/DELETE) y los casos autenticados quedan fuera a
 * proposito: ver la nota al pie de `test/parity/README.md`.
 */
export const publicGetCases: ParityCase[] = [
  {
    id: 'carrusel-list',
    description: 'GET /carrusel/ — array plano, solo isActive=true, 6 campos',
    method: 'GET',
    path: '/carrusel/',
    expectedDelta:
      'ADR-004 DQ3-B (resuelve BUG-DJANGO-023): NestJS anade updatedAt/deletedAt/' +
      'updatedBy/deletedBy (campos ausentes en el `Carrusel` de 6 columnas de Django).',
  },
  {
    id: 'decanatos-list-p1',
    description: 'GET /decanatos/?page=1&page_size=5',
    method: 'GET',
    path: '/decanatos/?page=1&page_size=5',
    ignore: IGNORE_PAGINATION_LINKS,
    expectedDelta:
      'BUG-DJANGO-024: en prod `results` trae TODAS las filas (ignora page_size); NestJS pagina bien',
  },
  {
    id: 'colonias-list-p1',
    description: 'GET /colonias/?page=1&page_size=5',
    method: 'GET',
    path: '/colonias/?page=1&page_size=5',
    ignore: IGNORE_PAGINATION_LINKS,
  },
  {
    id: 'padres-list-plain',
    description:
      'GET /padres/?isActive=true — sin page -> array plano (APIC-003)',
    method: 'GET',
    path: '/padres/?isActive=true',
  },
  {
    id: 'padres-list-p1',
    description: 'GET /padres/?page=1&page_size=3 -> objeto paginado',
    method: 'GET',
    path: '/padres/?page=1&page_size=3',
    ignore: IGNORE_PAGINATION_LINKS,
  },
  {
    id: 'parroquias-list-p1',
    description: 'GET /parroquias/?page=1&page_size=5',
    method: 'GET',
    path: '/parroquias/?page=1&page_size=5',
    ignore: IGNORE_PAGINATION_LINKS,
  },
  {
    id: 'noticias-list-p1',
    description: 'GET /noticias/?page=1&page_size=5&isActive=true',
    method: 'GET',
    path: '/noticias/?page=1&page_size=5&isActive=true',
    ignore: IGNORE_PAGINATION_LINKS,
  },
  {
    id: 'noticias-tags-filter',
    description:
      'GET /noticias/?tags=a — filtro jsonb (BUG-DJANGO-011). Debe no-500.',
    method: 'GET',
    path: '/noticias/?tags=a&page=1&page_size=5',
    ignore: IGNORE_PAGINATION_LINKS,
  },
  {
    id: 'articulos-list-p1',
    description: 'GET /articulos/?page=1&page_size=5',
    method: 'GET',
    path: '/articulos/?page=1&page_size=5',
    ignore: IGNORE_PAGINATION_LINKS,
  },
  {
    id: 'documentos-list-p1',
    description: 'GET /documentos/?page=1&page_size=5',
    method: 'GET',
    path: '/documentos/?page=1&page_size=5',
    ignore: IGNORE_PAGINATION_LINKS,
  },
  {
    id: 'login-bad-creds',
    description:
      'POST /token/login/ credenciales falsas -> 401 {"detail": ...}',
    method: 'POST',
    path: '/token/login/',
    body: { username: 'nadie-nope', password: 'incorrecta' },
  },
];

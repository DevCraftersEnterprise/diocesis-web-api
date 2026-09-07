import type { ParityCase } from '../types';

/**
 * Casos GET publicos (sin auth). Punto de partida: se amplian por modulo en Fase 2+.
 * Los `ignore` se dejan al minimo: primero se ejecuta `--compare --live` (oraculo vs
 * oraculo, con `PARITY_NEST_URL` = oraculo) para ver que es volatil de verdad.
 */
export const publicGetCases: ParityCase[] = [
  {
    id: 'carrusel-list',
    description: 'GET /carrusel/ — array plano, solo isActive=true, 6 campos',
    method: 'GET',
    path: '/carrusel/',
  },
  {
    id: 'decanatos-list-p1',
    description: 'GET /decanatos/?page=1&page_size=5',
    method: 'GET',
    path: '/decanatos/?page=1&page_size=5',
    expectedDelta:
      'BUG-DJANGO-024: en prod `results` trae TODAS las filas (ignora page_size); NestJS pagina bien',
  },
  {
    id: 'colonias-list-p1',
    description: 'GET /colonias/?page=1&page_size=5',
    method: 'GET',
    path: '/colonias/?page=1&page_size=5',
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
  },
  {
    id: 'parroquias-list-p1',
    description: 'GET /parroquias/?page=1&page_size=5',
    method: 'GET',
    path: '/parroquias/?page=1&page_size=5',
  },
  {
    id: 'noticias-list-p1',
    description: 'GET /noticias/?page=1&page_size=5&isActive=true',
    method: 'GET',
    path: '/noticias/?page=1&page_size=5&isActive=true',
  },
  {
    id: 'noticias-tags-filter',
    description:
      'GET /noticias/?tags=a — filtro jsonb (BUG-DJANGO-011). Debe no-500.',
    method: 'GET',
    path: '/noticias/?tags=a&page=1&page_size=5',
  },
  {
    id: 'articulos-list-p1',
    description: 'GET /articulos/?page=1&page_size=5',
    method: 'GET',
    path: '/articulos/?page=1&page_size=5',
  },
  {
    id: 'documentos-list-p1',
    description: 'GET /documentos/?page=1&page_size=5',
    method: 'GET',
    path: '/documentos/?page=1&page_size=5',
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

import { NotFoundException } from '@nestjs/common';
import { buildPage } from './paginated';

const q = (page: number, page_size: number) => ({
  page,
  skip: (page - 1) * page_size,
});

describe('buildPage', () => {
  it('arma el sobre DRF con next/previous null', () => {
    const page = buildPage(['a', 'b'], 7, q(1, 2));
    expect(page).toEqual({
      count: 7,
      next: null,
      previous: null,
      results: ['a', 'b'],
    });
  });

  it('page 1 sobre resultado vacio -> 200 con results vacio (no 404)', () => {
    expect(buildPage([], 0, q(1, 10))).toEqual({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
  });

  it('page > 1 fuera de rango -> 404 { detail } (como DRF)', () => {
    expect(() => buildPage([], 5, q(2, 10))).toThrow(NotFoundException);
    try {
      buildPage([], 5, q(2, 10));
    } catch (e) {
      expect((e as NotFoundException).getResponse()).toEqual({
        detail: 'Pagina invalida.',
      });
    }
  });

  it('ultima pagina parcial dentro de rango -> ok', () => {
    expect(buildPage(['x'], 21, q(3, 10)).results).toEqual(['x']);
  });
});

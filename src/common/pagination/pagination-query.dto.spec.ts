import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  PaginationQueryDto,
} from './pagination-query.dto';

function parse(raw: Record<string, unknown>): PaginationQueryDto {
  return plainToInstance(PaginationQueryDto, raw);
}

describe('PaginationQueryDto', () => {
  it('aplica los defaults de Django cuando no llega nada', () => {
    const dto = parse({});
    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.page_size).toBe(DEFAULT_PAGE_SIZE);
    expect(dto.skip).toBe(0);
    expect(dto.take).toBe(DEFAULT_PAGE_SIZE);
  });

  it('parsea strings de query y calcula skip/take', () => {
    const dto = parse({ page: '3', page_size: '20' });
    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.skip).toBe(40);
    expect(dto.take).toBe(20);
  });

  it('recorta page_size a MAX_PAGE_SIZE en silencio (como DRF)', () => {
    const dto = parse({ page_size: '999' });
    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.page_size).toBe(MAX_PAGE_SIZE);
  });

  it('rechaza page < 1', () => {
    expect(validateSync(parse({ page: '0' })).length).toBeGreaterThan(0);
  });

  it('rechaza page no numerico', () => {
    expect(validateSync(parse({ page: 'abc' })).length).toBeGreaterThan(0);
  });
});

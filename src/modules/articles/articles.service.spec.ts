import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Usuario } from '../users/entities/usuario.entity';
import { ArticlesService } from './articles.service';
import type { Articulo } from './entities/articulo.entity';

const actor = { id: 'admin-1' } as Usuario;

const art = (over: Partial<Articulo> = {}): Articulo => ({
  id: 'a1',
  title: 'Cuaresma',
  content: 'Texto',
  tags: ['fe'],
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
  createdById: 'u9',
  updatedById: null,
  deletedById: null,
  ...over,
});

function makeQb(rows: Articulo[]) {
  const qb: Record<string, jest.Mock> = {};
  for (const m of ['orderBy', 'andWhere', 'skip', 'take']) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getManyAndCount = jest.fn().mockResolvedValue([rows, rows.length]);
  return qb;
}

function build(found: Articulo | null, listRows: Articulo[] = []) {
  const qb = makeQb(listRows);
  const repo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn().mockResolvedValue(found),
    insert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<Articulo>;
  const service = new ArticlesService(repo);
  return { service, repo, qb };
}

const baseQuery = { page: 1, page_size: 10, skip: 0, take: 10 };

describe('ArticlesService', () => {
  it('list() aplica title ILIKE, filtro jsonb de tags y isActive exacto', async () => {
    const { service, qb } = build(null, [art()]);
    await service.list({
      ...baseQuery,
      title: 'cua',
      tags: 'fe',
      isActive: true,
    });
    const clauses = qb.andWhere.mock.calls.map((c) => c[0] as string);
    expect(clauses).toContain('a.title ILIKE :title');
    expect(clauses).toContain('a.isActive = :isActive');
    expect(clauses.some((c) => c.includes('jsonb_array_elements_text'))).toBe(
      true,
    );
  });

  it('list() sin filtros: solo orden -createdAt + paginacion', async () => {
    const { service, qb } = build(null, [art(), art({ id: 'a2' })]);
    const page = await service.list(baseQuery);
    expect(qb.andWhere).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith('a.createdAt', 'DESC');
    expect(page).toMatchObject({ count: 2, next: null, previous: null });
    expect(page.results).toHaveLength(2);
  });

  it('detail() devuelve soft-deleted; 404 si no existe', async () => {
    expect(
      (await build(art({ isActive: false })).service.detail('a1')).isActive,
    ).toBe(false);
    await expect(build(null).service.detail('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create() fija createdBy del actor, normaliza tags y no toca updatedBy', async () => {
    const { service, repo } = build(art());
    await service.create(
      { title: 'Nueva', content: 'C', tags: ['a', 'b'] },
      actor,
    );
    const [payload] = (repo.insert as jest.Mock).mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(payload.createdById).toBe('admin-1');
    expect(payload.tags).toEqual(['a', 'b']);
    expect(payload.isActive).toBe(true);
    expect(payload).not.toHaveProperty('updatedById');
  });

  it('create() sin tags -> []', async () => {
    const { service, repo } = build(art());
    await service.create({ title: 'N', content: 'C' }, actor);
    const [payload] = (repo.insert as jest.Mock).mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(payload.tags).toEqual([]);
  });

  it('create() con tags no-lista -> 400', async () => {
    const { service } = build(art());
    await expect(
      service.create({ title: 'N', content: 'C', tags: { x: 1 } }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update() sobre borrado -> 404; fija updatedBy y solo toca campos presentes', async () => {
    await expect(
      build(null).service.update('a1', { title: 'X' }, actor),
    ).rejects.toBeInstanceOf(NotFoundException);

    const { service, repo } = build(art());
    await service.update('a1', { content: 'Nuevo' }, actor);
    const [, changes] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(changes.updatedById).toBe('admin-1');
    expect(changes.content).toBe('Nuevo');
    expect(changes).not.toHaveProperty('title');
    expect(changes).not.toHaveProperty('tags');
  });

  it('update() con tags: [] limpia la lista', async () => {
    const { service, repo } = build(art());
    await service.update('a1', { tags: [] }, actor);
    const [, changes] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(changes.tags).toEqual([]);
  });

  it('softDelete() fija isActive=false + deletedAt + deletedBy (BUG-DJANGO-013)', async () => {
    const { service, repo } = build(art());
    await service.softDelete('a1', actor);
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(patch.isActive).toBe(false);
    expect(patch.deletedAt).toBeInstanceOf(Date);
    expect(patch.deletedById).toBe('admin-1');
  });

  it('softDelete() sobre borrado -> 404', async () => {
    await expect(
      build(null).service.softDelete('a1', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('activate() -> 404 si no hay inactiva; limpia deletedAt/deletedBy si la hay', async () => {
    await expect(
      build(null).service.activate('a1', actor),
    ).rejects.toBeInstanceOf(NotFoundException);

    const { service, repo } = build(art({ isActive: false }));
    expect(await service.activate('a1', actor)).toEqual({
      detail: 'Artículo habilitado correctamente.',
    });
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(patch).toMatchObject({
      isActive: true,
      deletedAt: null,
      deletedById: null,
      updatedById: 'admin-1',
    });
  });
});

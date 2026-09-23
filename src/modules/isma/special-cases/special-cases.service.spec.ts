import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Usuario } from '../../users/entities/usuario.entity';
import type { CasoEspecial } from './entities/caso-especial.entity';
import { SpecialCasesService } from './special-cases.service';

const actor = { id: 'admin-1' } as Usuario;

const caso = (over: Partial<CasoEspecial> = {}): CasoEspecial => ({
  id: 'c1',
  title: 'Divorciados con nulidad matrimonial',
  order: 1,
  requisitosAdicionales: 'Requisitos',
  documentosAdicionales: null,
  excepciones: null,
  contacto: null,
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
  createdById: 'u9',
  updatedById: null,
  deletedById: null,
  ...over,
});

function makeQb(rows: CasoEspecial[]) {
  const qb: Record<string, jest.Mock> = {};
  for (const m of ['orderBy', 'andWhere', 'skip', 'take']) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getManyAndCount = jest.fn().mockResolvedValue([rows, rows.length]);
  return qb;
}

function build(found: CasoEspecial | null, listRows: CasoEspecial[] = []) {
  const qb = makeQb(listRows);
  const repo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn().mockResolvedValue(found),
    insert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<CasoEspecial>;
  const service = new SpecialCasesService(repo);
  return { service, repo, qb };
}

describe('SpecialCasesService', () => {
  it('list() ordena por order ASC y filtra por title/isActive', async () => {
    const { service, qb } = build(null, [caso()]);
    await service.list({
      page: 1,
      page_size: 10,
      title: 'Divorciados',
      isActive: true,
    } as never);
    expect(qb.orderBy).toHaveBeenCalledWith('c.order', 'ASC');
    const whereCalls = qb.andWhere.mock.calls.map((c) => c[0]);
    expect(whereCalls).toContain('c.title ILIKE :title');
    expect(whereCalls).toContain('c.isActive = :isActive');
  });

  it('detail() devuelve soft-deleted; 404 si no existe', async () => {
    expect(
      (await build(caso({ isActive: false })).service.detail('c1')).isActive,
    ).toBe(false);
    await expect(build(null).service.detail('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create() OK: createdBy del actor, sin updatedBy', async () => {
    const { service, repo } = build(caso());
    await service.create(
      {
        title: 'Caso de carcel',
        order: 2,
        requisitosAdicionales: 'Requisitos',
      },
      actor,
    );
    const [payload] = (repo.insert as jest.Mock).mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(payload.createdById).toBe('admin-1');
    expect(payload).not.toHaveProperty('updatedById');
  });

  it('update() sobre borrado -> 404; fija updatedBy y solo toca campos presentes', async () => {
    await expect(
      build(null).service.update('c1', { title: 'X' }, actor),
    ).rejects.toBeInstanceOf(NotFoundException);

    const { service, repo } = build(caso());
    await service.update('c1', { order: 5 }, actor);
    const [, changes] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(changes.updatedById).toBe('admin-1');
    expect(changes.order).toBe(5);
    expect(changes).not.toHaveProperty('title');
  });

  it('softDelete() fija deletedAt + deletedBy', async () => {
    const { service, repo } = build(caso());
    await service.softDelete('c1', actor);
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      { deletedAt: Date; isActive: boolean },
    ];
    expect(patch.isActive).toBe(false);
    expect(patch.deletedAt).toBeInstanceOf(Date);
  });

  it('activate() -> 404 si no hay inactiva; limpia deletedAt si la hay', async () => {
    await expect(
      build(null).service.activate('c1', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
    const { service, repo } = build(caso({ isActive: false }));
    expect(await service.activate('c1', actor)).toEqual({
      detail: 'Caso especial habilitado correctamente.',
    });
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(patch).toMatchObject({ isActive: true, deletedAt: null });
  });
});

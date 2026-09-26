import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Usuario } from '../../users/entities/usuario.entity';
import type { Capacitacion } from './entities/capacitacion.entity';
import { TrainingsService } from './trainings.service';

const actor = { id: 'admin-1' } as Usuario;

const cap = (over: Partial<Capacitacion> = {}): Capacitacion => ({
  id: 'c1',
  name: 'Biblia I',
  description: 'Descripcion',
  modality: 'presencial',
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
  createdById: 'u9',
  updatedById: null,
  deletedById: null,
  ...over,
});

function makeQb(rows: Capacitacion[]) {
  const qb: Record<string, jest.Mock> = {};
  for (const m of ['orderBy', 'andWhere', 'skip', 'take']) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getManyAndCount = jest.fn().mockResolvedValue([rows, rows.length]);
  return qb;
}

function build(found: Capacitacion | null, listRows: Capacitacion[] = []) {
  const qb = makeQb(listRows);
  const repo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn().mockResolvedValue(found),
    insert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<Capacitacion>;
  const service = new TrainingsService(repo);
  return { service, repo, qb };
}

describe('TrainingsService', () => {
  it('list() filtra por name/modality/isActive', async () => {
    const { service, qb } = build(null, [cap()]);
    await service.list({
      page: 1,
      page_size: 10,
      name: 'Biblia',
      modality: 'presencial',
      isActive: true,
    } as never);
    const whereCalls = qb.andWhere.mock.calls.map((c) => c[0]);
    expect(whereCalls).toContain('c.name ILIKE :name');
    expect(whereCalls).toContain('c.modality = :modality');
    expect(whereCalls).toContain('c.isActive = :isActive');
  });

  it('detail() devuelve soft-deleted; 404 si no existe', async () => {
    expect(
      (await build(cap({ isActive: false })).service.detail('c1')).isActive,
    ).toBe(false);
    await expect(build(null).service.detail('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create() OK: createdBy del actor, sin updatedBy', async () => {
    const { service, repo } = build(cap());
    await service.create(
      { name: 'Biblia I', description: 'D', modality: 'presencial' },
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
      build(null).service.update('c1', { name: 'X' }, actor),
    ).rejects.toBeInstanceOf(NotFoundException);

    const { service, repo } = build(cap());
    await service.update('c1', { description: 'Nueva' }, actor);
    const [, changes] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(changes.updatedById).toBe('admin-1');
    expect(changes.description).toBe('Nueva');
    expect(changes).not.toHaveProperty('name');
  });

  it('softDelete() fija deletedAt + deletedBy', async () => {
    const { service, repo } = build(cap());
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
    const { service, repo } = build(cap({ isActive: false }));
    expect(await service.activate('c1', actor)).toEqual({
      detail: 'Capacitación habilitada correctamente.',
    });
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(patch).toMatchObject({ isActive: true, deletedAt: null });
  });
});

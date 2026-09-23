import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Usuario } from '../../users/entities/usuario.entity';
import type { PreguntaFrecuente } from './entities/pregunta-frecuente.entity';
import { FaqService } from './faq.service';

const actor = { id: 'admin-1' } as Usuario;

const pregunta = (
  over: Partial<PreguntaFrecuente> = {},
): PreguntaFrecuente => ({
  id: 'p1',
  question: 'Pregunta',
  answer: 'Respuesta',
  order: 1,
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
  createdById: 'u9',
  updatedById: null,
  deletedById: null,
  ...over,
});

function makeQb(rows: PreguntaFrecuente[]) {
  const qb: Record<string, jest.Mock> = {};
  for (const m of ['orderBy', 'andWhere', 'skip', 'take']) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getManyAndCount = jest.fn().mockResolvedValue([rows, rows.length]);
  return qb;
}

function build(
  found: PreguntaFrecuente | null,
  listRows: PreguntaFrecuente[] = [],
) {
  const qb = makeQb(listRows);
  const repo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn().mockResolvedValue(found),
    insert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<PreguntaFrecuente>;
  const service = new FaqService(repo);
  return { service, repo, qb };
}

describe('FaqService', () => {
  it('list() ordena por order ASC y filtra por isActive', async () => {
    const { service, qb } = build(null, [pregunta()]);
    await service.list({ page: 1, page_size: 10, isActive: true } as never);
    expect(qb.orderBy).toHaveBeenCalledWith('p.order', 'ASC');
    const whereCalls = qb.andWhere.mock.calls.map((c) => c[0]);
    expect(whereCalls).toContain('p.isActive = :isActive');
  });

  it('detail() devuelve soft-deleted; 404 si no existe', async () => {
    expect(
      (await build(pregunta({ isActive: false })).service.detail('p1'))
        .isActive,
    ).toBe(false);
    await expect(build(null).service.detail('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create() OK: createdBy del actor, sin updatedBy', async () => {
    const { service, repo } = build(pregunta());
    await service.create(
      { question: 'Pregunta 2', answer: 'Respuesta 2', order: 2 },
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
      build(null).service.update('p1', { question: 'X' }, actor),
    ).rejects.toBeInstanceOf(NotFoundException);

    const { service, repo } = build(pregunta());
    await service.update('p1', { order: 3 }, actor);
    const [, changes] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(changes.updatedById).toBe('admin-1');
    expect(changes.order).toBe(3);
    expect(changes).not.toHaveProperty('question');
  });

  it('softDelete() fija deletedAt + deletedBy', async () => {
    const { service, repo } = build(pregunta());
    await service.softDelete('p1', actor);
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      { deletedAt: Date; isActive: boolean },
    ];
    expect(patch.isActive).toBe(false);
    expect(patch.deletedAt).toBeInstanceOf(Date);
  });

  it('activate() -> 404 si no hay inactiva; limpia deletedAt si la hay', async () => {
    await expect(
      build(null).service.activate('p1', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
    const { service, repo } = build(pregunta({ isActive: false }));
    expect(await service.activate('p1', actor)).toEqual({
      detail: 'Pregunta frecuente habilitada correctamente.',
    });
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(patch).toMatchObject({ isActive: true, deletedAt: null });
  });
});

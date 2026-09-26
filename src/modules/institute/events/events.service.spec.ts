import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Curso } from '../courses/entities/curso.entity';
import type { Sede } from '../venues/entities/sede.entity';
import type { Usuario } from '../../users/entities/usuario.entity';
import type { Evento } from './entities/evento.entity';
import { EventsService } from './events.service';

const actor = { id: 'admin-1' } as Usuario;
const UUID = '11111111-1111-1111-1111-111111111111';

const fullDto = {
  title: 'Inscripciones abiertas',
  type: 'inscripcion' as const,
  startDate: '2026-02-01',
  cursoId: UUID,
  sedeId: UUID,
};

const evento = (over: Partial<Evento> = {}): Evento => ({
  id: 'e1',
  title: 'Inscripciones abiertas',
  description: null,
  type: 'inscripcion',
  startDate: '2026-02-01',
  endDate: null,
  cursoId: UUID,
  sedeId: UUID,
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
  createdById: 'u9',
  updatedById: null,
  deletedById: null,
  ...over,
});

function makeQb(rows: Evento[]) {
  const qb: Record<string, jest.Mock> = {};
  for (const m of ['orderBy', 'andWhere', 'skip', 'take']) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getManyAndCount = jest.fn().mockResolvedValue([rows, rows.length]);
  return qb;
}

function build(found: Evento | null, fksExist = true, listRows: Evento[] = []) {
  const qb = makeQb(listRows);
  const repo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn().mockResolvedValue(found),
    insert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<Evento>;
  const cursos = {
    existsBy: jest.fn().mockResolvedValue(fksExist),
  } as unknown as Repository<Curso>;
  const sedes = {
    existsBy: jest.fn().mockResolvedValue(fksExist),
  } as unknown as Repository<Sede>;
  const service = new EventsService(repo, cursos, sedes);
  return { service, repo, cursos, sedes, qb };
}

describe('EventsService', () => {
  it('list() filtra por type/cursoId/sedeId/rango de fechas/isActive', async () => {
    const { service, qb } = build(null, true, [evento()]);
    await service.list({
      page: 1,
      page_size: 10,
      type: 'inscripcion',
      cursoId: UUID,
      sedeId: UUID,
      startDate__gte: '2026-01-01',
      startDate__lte: '2026-12-31',
      isActive: true,
    } as never);
    const whereCalls = qb.andWhere.mock.calls.map((c) => c[0]);
    expect(whereCalls).toContain('e.type = :type');
    expect(whereCalls).toContain('e.cursoId = :cursoId');
    expect(whereCalls).toContain('e.sedeId = :sedeId');
    expect(whereCalls).toContain('e.startDate >= :startGte');
    expect(whereCalls).toContain('e.startDate <= :startLte');
    expect(whereCalls).toContain('e.isActive = :isActive');
  });

  it('detail() devuelve soft-deleted; 404 si no existe', async () => {
    expect(
      (await build(evento({ isActive: false })).service.detail('e1')).isActive,
    ).toBe(false);
    await expect(build(null).service.detail('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create() -> 400 { cursoId } si el curso no existe', async () => {
    const { service, repo, cursos, sedes } = build(evento());
    (cursos.existsBy as jest.Mock).mockResolvedValueOnce(false);
    await expect(service.create(fullDto, actor)).rejects.toMatchObject({
      response: { cursoId: expect.any(Array) },
    });
    expect(repo.insert).not.toHaveBeenCalled();
    expect(sedes.existsBy).not.toHaveBeenCalled();
  });

  it('create() -> 400 { sedeId } si la sede no existe', async () => {
    const { service, cursos, sedes } = build(evento());
    (cursos.existsBy as jest.Mock).mockResolvedValueOnce(true);
    (sedes.existsBy as jest.Mock).mockResolvedValueOnce(false);
    await expect(service.create(fullDto, actor)).rejects.toMatchObject({
      response: { sedeId: expect.any(Array) },
    });
  });

  it('create() sin cursoId/sedeId no valida FKs', async () => {
    const { service, cursos, sedes, repo } = build(evento());
    await service.create(
      { title: 'Actividad', type: 'actividad', startDate: '2026-03-01' },
      actor,
    );
    expect(cursos.existsBy).not.toHaveBeenCalled();
    expect(sedes.existsBy).not.toHaveBeenCalled();
    expect(repo.insert).toHaveBeenCalled();
  });

  it('create() OK: createdBy del actor, sin updatedBy', async () => {
    const { service, repo } = build(evento());
    await service.create(fullDto, actor);
    const [payload] = (repo.insert as jest.Mock).mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(payload.createdById).toBe('admin-1');
    expect(payload).not.toHaveProperty('updatedById');
  });

  it('update() sobre borrado -> 404; fija updatedBy y solo toca campos presentes', async () => {
    await expect(
      build(null).service.update('e1', { title: 'X' }, actor),
    ).rejects.toBeInstanceOf(NotFoundException);

    const { service, repo } = build(evento());
    await service.update('e1', { title: 'Nuevo titulo' }, actor);
    const [, changes] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(changes.updatedById).toBe('admin-1');
    expect(changes.title).toBe('Nuevo titulo');
    expect(changes).not.toHaveProperty('type');
  });

  it('softDelete() fija deletedAt + deletedBy', async () => {
    const { service, repo } = build(evento());
    await service.softDelete('e1', actor);
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      { deletedAt: Date; isActive: boolean },
    ];
    expect(patch.isActive).toBe(false);
    expect(patch.deletedAt).toBeInstanceOf(Date);
  });

  it('activate() -> 404 si no hay inactiva; limpia deletedAt si la hay', async () => {
    await expect(
      build(null).service.activate('e1', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
    const { service, repo } = build(evento({ isActive: false }));
    expect(await service.activate('e1', actor)).toEqual({
      detail: 'Evento habilitado correctamente.',
    });
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(patch).toMatchObject({ isActive: true, deletedAt: null });
  });
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Parroquia } from '../../parishes/entities/parroquia.entity';
import type { Usuario } from '../../users/entities/usuario.entity';
import type { IsmaCurso } from './entities/isma-curso.entity';
import { hoyEnDiocesis, IsmaCursosService } from './isma-cursos.service';
import { toIsmaCursoResponse } from './isma-curso.response';

const actor = { id: 'admin-1' } as Usuario;

const parroquia = {
  id: 'p1',
  name: 'Santuario de Nuestra Señora de Guadalupe',
  address: 'Calle Durango entre Galeana y Zaragoza',
  town: 'Ciudad Obregón',
} as Parroquia;

const curso = (over: Partial<IsmaCurso> = {}): IsmaCurso => ({
  id: 'c1',
  parroquiaId: 'p1',
  parroquia,
  startDate: '2026-09-15',
  endDate: '2026-11-08',
  diaSemana: 2,
  horaInicio: '19:00',
  horaFin: '21:00',
  modalidades: ['presencial'],
  telefonoInformes: '644 413 2819',
  notas: null,
  isActive: true,
  createdAt: new Date('2026-08-01T00:00:00Z'),
  updatedAt: new Date('2026-08-01T00:00:00Z'),
  deletedAt: null,
  createdById: 'admin-1',
  updatedById: null,
  deletedById: null,
  ...over,
});

function makeQb(rows: IsmaCurso[], one: IsmaCurso | null = null) {
  const qb: Record<string, jest.Mock> = {};
  for (const m of [
    'leftJoinAndSelect',
    'where',
    'andWhere',
    'orderBy',
    'skip',
    'take',
  ]) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getManyAndCount = jest.fn().mockResolvedValue([rows, rows.length]);
  qb.getOne = jest.fn().mockResolvedValue(one);
  return qb;
}

function build(opts: {
  one?: IsmaCurso | null;
  list?: IsmaCurso[];
  parroquiaExiste?: boolean;
}) {
  const qb = makeQb(opts.list ?? [], opts.one ?? null);
  const repo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn().mockResolvedValue(opts.one ?? null),
    insert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<IsmaCurso>;
  const parroquias = {
    existsBy: jest.fn().mockResolvedValue(opts.parroquiaExiste ?? true),
  } as unknown as Repository<Parroquia>;
  const service = new IsmaCursosService(repo, parroquias);
  return { service, repo, qb, parroquias };
}

const dto = (over: Record<string, unknown> = {}) =>
  ({
    parroquiaId: 'p1',
    startDate: '2026-09-15',
    endDate: '2026-11-08',
    diaSemana: 2,
    horaInicio: '19:00',
    horaFin: '21:00',
    modalidades: ['presencial'],
    ...over,
  }) as never;

describe('hoyEnDiocesis', () => {
  it('usa la fecha de Sonora aunque UTC ya cambió de dia', () => {
    // 2026-10-03 02:30 UTC = 2026-10-02 19:30 en Hermosillo (UTC-7, sin horario de verano).
    expect(hoyEnDiocesis(new Date('2026-10-03T02:30:00Z'))).toBe('2026-10-02');
  });
});

describe('toIsmaCursoResponse', () => {
  it('marca finalizado cuando endDate ya paso', () => {
    expect(toIsmaCursoResponse(curso(), '2026-11-09').finalizado).toBe(true);
    expect(toIsmaCursoResponse(curso(), '2026-11-08').finalizado).toBe(false);
  });
});

describe('IsmaCursosService', () => {
  it('listPublic filtra activos con endDate >= hoy y ordena por startDate', async () => {
    const { service, qb } = build({ list: [curso()] });
    await service.listPublic({ page: 1, page_size: 10 } as never);
    const wheres = [...qb.where.mock.calls, ...qb.andWhere.mock.calls].map(
      (c) => c[0],
    );
    expect(wheres).toContain('c.isActive = :active');
    expect(wheres).toContain('c.endDate >= :hoy');
    expect(qb.orderBy).toHaveBeenCalledWith('c.startDate', 'ASC');
  });

  it('detailPublic 404 si el curso esta deshabilitado', async () => {
    const { service } = build({ one: null });
    await expect(service.detailPublic('c1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('detailPublic devuelve cursos terminados (enlaces compartidos)', async () => {
    const { service } = build({ one: curso({ endDate: '2020-01-01' }) });
    const res = await service.detailPublic('c1');
    expect(res.finalizado).toBe(true);
  });

  it('create() rechaza endDate anterior a startDate', async () => {
    const { service } = build({});
    await expect(
      service.create(dto({ endDate: '2026-09-01' }), actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create() exige horaInicio y horaFin cuando hay diaSemana', async () => {
    const { service } = build({});
    await expect(
      service.create(dto({ horaFin: undefined }), actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create() rechaza horario sin diaSemana', async () => {
    const { service } = build({});
    await expect(
      service.create(dto({ diaSemana: undefined }), actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create() rechaza horaFin no posterior a horaInicio', async () => {
    const { service } = build({});
    await expect(
      service.create(dto({ horaInicio: '21:00', horaFin: '19:00' }), actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create() rechaza parroquia inexistente o inactiva', async () => {
    const { service } = build({ parroquiaExiste: false });
    await expect(service.create(dto(), actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('create() sin horario (solo bloque de fechas) es valido', async () => {
    const { service, repo } = build({
      one: curso({ diaSemana: null, horaInicio: null, horaFin: null }),
    });
    await service.create(
      dto({ diaSemana: undefined, horaInicio: undefined, horaFin: undefined }),
      actor,
    );
    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        diaSemana: null,
        horaInicio: null,
        horaFin: null,
      }),
    );
  });

  it('update() valida la coherencia contra el estado final de la fila', async () => {
    const { service } = build({ one: curso() });
    // Solo cambia endDate a una fecha anterior a startDate guardado en la fila.
    await expect(
      service.update('c1', { endDate: '2026-09-01' }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('softDelete() sobre curso inexistente o ya deshabilitado -> 404', async () => {
    const { service } = build({ one: null });
    await expect(service.softDelete('c1', actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

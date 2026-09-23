import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { CloudinaryService } from '../../../integrations/cloudinary/cloudinary.service';
import type { Usuario } from '../../users/entities/usuario.entity';
import type { Capacitacion } from '../trainings/entities/capacitacion.entity';
import { CoursesService } from './courses.service';
import type { Curso } from './entities/curso.entity';

const actor = { id: 'admin-1' } as Usuario;
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pdf = Buffer.from('%PDF-1.4');
const UUID = '11111111-1111-1111-1111-111111111111';

const fullDto = {
  title: 'Curso de Biblia',
  description: 'Descripcion',
  modality: 'presencial' as const,
  capacitacionId: UUID,
};

const curso = (over: Partial<Curso> = {}): Curso => ({
  id: 'c1',
  title: 'Curso de Biblia',
  description: 'Descripcion',
  modality: 'presencial',
  capacitacionId: UUID,
  startDate: null,
  endDate: null,
  meetingLink: null,
  picture: null,
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
  createdById: 'u9',
  updatedById: null,
  deletedById: null,
  ...over,
});

function makeQb(rows: Curso[]) {
  const qb: Record<string, jest.Mock> = {};
  for (const m of ['orderBy', 'andWhere', 'skip', 'take']) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getManyAndCount = jest.fn().mockResolvedValue([rows, rows.length]);
  return qb;
}

function build(found: Curso | null, fkExists = true, listRows: Curso[] = []) {
  const qb = makeQb(listRows);
  const repo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn().mockResolvedValue(found),
    insert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<Curso>;
  const capacitaciones = {
    existsBy: jest.fn().mockResolvedValue(fkExists),
  } as unknown as Repository<Capacitacion>;
  const cloudinary = {
    upload: jest.fn().mockResolvedValue({
      secureUrl: 'https://cdn/curso/x',
      publicId: 'x',
    }),
  } as unknown as CloudinaryService;
  const service = new CoursesService(repo, capacitaciones, cloudinary);
  return { service, repo, capacitaciones, cloudinary, qb };
}

describe('CoursesService', () => {
  it('list() filtra por title/modality/capacitacionId/isActive', async () => {
    const { service, qb } = build(null, true, [curso()]);
    await service.list({
      page: 1,
      page_size: 10,
      title: 'Biblia',
      modality: 'presencial',
      capacitacionId: UUID,
      isActive: true,
    } as never);
    const whereCalls = qb.andWhere.mock.calls.map((c) => c[0]);
    expect(whereCalls).toContain('c.title ILIKE :title');
    expect(whereCalls).toContain('c.modality = :modality');
    expect(whereCalls).toContain('c.capacitacionId = :capacitacionId');
    expect(whereCalls).toContain('c.isActive = :isActive');
  });

  it('detail() devuelve soft-deleted; 404 si no existe', async () => {
    expect(
      (await build(curso({ isActive: false })).service.detail('c1')).isActive,
    ).toBe(false);
    await expect(build(null).service.detail('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create() -> 400 { capacitacionId } si la FK no existe', async () => {
    await expect(
      build(curso(), false).service.create(fullDto, undefined, actor),
    ).rejects.toMatchObject({
      response: { capacitacionId: expect.any(Array) },
    });
  });

  it('create() sin capacitacionId no valida FK', async () => {
    const { service, capacitaciones, repo } = build(curso());
    await service.create(
      { title: 'X', description: 'D', modality: 'presencial' },
      undefined,
      actor,
    );
    expect(capacitaciones.existsBy).not.toHaveBeenCalled();
    expect(repo.insert).toHaveBeenCalled();
  });

  it('create() OK: createdBy del actor, sin updatedBy, sube picture', async () => {
    const { service, repo, cloudinary } = build(curso());
    await service.create(fullDto, { buffer: png, size: png.length }, actor);
    expect(cloudinary.upload).toHaveBeenCalled();
    const [payload] = (repo.insert as jest.Mock).mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(payload.createdById).toBe('admin-1');
    expect(payload).not.toHaveProperty('updatedById');
    expect(payload.picture).toBe('https://cdn/curso/x');
  });

  it('create() con archivo no-imagen -> 400', async () => {
    const { service, cloudinary } = build(curso());
    await expect(
      service.create(fullDto, { buffer: pdf, size: pdf.length }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cloudinary.upload).not.toHaveBeenCalled();
  });

  it('update() sobre borrado -> 404; fija updatedBy y solo toca campos presentes', async () => {
    await expect(
      build(null).service.update('c1', { title: 'X' }, undefined, actor),
    ).rejects.toBeInstanceOf(NotFoundException);

    const { service, repo } = build(curso());
    await service.update('c1', { title: 'Nuevo' }, undefined, actor);
    const [, changes] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(changes.updatedById).toBe('admin-1');
    expect(changes.title).toBe('Nuevo');
    expect(changes).not.toHaveProperty('description');
  });

  it('softDelete() fija deletedAt + deletedBy', async () => {
    const { service, repo } = build(curso());
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
    const { service, repo } = build(curso({ isActive: false }));
    expect(await service.activate('c1', actor)).toEqual({
      detail: 'Curso habilitado correctamente.',
    });
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(patch).toMatchObject({ isActive: true, deletedAt: null });
  });
});

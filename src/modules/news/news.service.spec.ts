import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import type { Usuario } from '../users/entities/usuario.entity';
import type { Noticia } from './entities/noticia.entity';
import { NewsService } from './news.service';

const actor = { id: 'admin-1' } as Usuario;
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pdf = Buffer.from('%PDF-1.4');

const noti = (over: Partial<Noticia> = {}): Noticia => ({
  id: 'n1',
  title: 'Fiesta patronal',
  picture: null,
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

function makeQb(rows: Noticia[]) {
  const qb: Record<string, jest.Mock> = {};
  for (const m of ['orderBy', 'andWhere', 'skip', 'take']) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getManyAndCount = jest.fn().mockResolvedValue([rows, rows.length]);
  return qb;
}

function build(found: Noticia | null, listRows: Noticia[] = []) {
  const qb = makeQb(listRows);
  const repo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn().mockResolvedValue(found),
    insert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<Noticia>;
  const cloudinary = {
    upload: jest.fn().mockResolvedValue({
      secureUrl: 'https://cdn/noticias/x',
      publicId: 'x',
    }),
  } as unknown as CloudinaryService;
  const service = new NewsService(repo, cloudinary);
  return { service, repo, qb, cloudinary };
}

const baseQuery = { page: 1, page_size: 10, skip: 0, take: 10 };

describe('NewsService', () => {
  it('list() aplica title ILIKE, filtro jsonb de tags e isActive', async () => {
    const { service, qb } = build(null, [noti()]);
    await service.list({
      ...baseQuery,
      title: 'fies',
      tags: 'fe',
      isActive: true,
    });
    const clauses = qb.andWhere.mock.calls.map((c) => c[0] as string);
    expect(clauses).toContain('n.title ILIKE :title');
    expect(clauses).toContain('n.isActive = :isActive');
    expect(clauses.some((c) => c.includes('jsonb_array_elements_text'))).toBe(
      true,
    );
  });

  it('detail() devuelve soft-deleted; 404 si no existe', async () => {
    expect(
      (await build(noti({ isActive: false })).service.detail('n1')).isActive,
    ).toBe(false);
    await expect(build(null).service.detail('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create() fija createdBy, normaliza tags string-JSON y sube picture', async () => {
    const { service, repo, cloudinary } = build(noti());
    await service.create(
      { title: 'Nueva', content: 'C', tags: '["a","b"]' },
      { buffer: png, size: png.length },
      actor,
    );
    expect(cloudinary.upload).toHaveBeenCalled();
    const [payload] = (repo.insert as jest.Mock).mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(payload.createdById).toBe('admin-1');
    expect(payload.tags).toEqual(['a', 'b']);
    expect(payload.picture).toBe('https://cdn/noticias/x');
    expect(payload).not.toHaveProperty('updatedById');
  });

  it('create() sin picture ni tags -> picture null, tags []', async () => {
    const { service, repo, cloudinary } = build(noti());
    await service.create({ title: 'N', content: 'C' }, undefined, actor);
    expect(cloudinary.upload).not.toHaveBeenCalled();
    const [payload] = (repo.insert as jest.Mock).mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(payload.picture).toBeNull();
    expect(payload.tags).toEqual([]);
  });

  it('create() con picture no-imagen -> 400, sin subir', async () => {
    const { service, cloudinary } = build(noti());
    await expect(
      service.create(
        { title: 'N', content: 'C' },
        { buffer: pdf, size: pdf.length },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cloudinary.upload).not.toHaveBeenCalled();
  });

  it('create() con tags string-JSON invalido -> 400', async () => {
    const { service } = build(noti());
    await expect(
      service.create(
        { title: 'N', content: 'C', tags: 'no-json' },
        undefined,
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update() sobre borrado -> 404; solo toca campos presentes', async () => {
    await expect(
      build(null).service.update('n1', { title: 'X' }, undefined, actor),
    ).rejects.toBeInstanceOf(NotFoundException);

    const { service, repo } = build(noti());
    await service.update('n1', { content: 'Nuevo' }, undefined, actor);
    const [, changes] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(changes.updatedById).toBe('admin-1');
    expect(changes.content).toBe('Nuevo');
    expect(changes).not.toHaveProperty('title');
    expect(changes).not.toHaveProperty('picture');
  });

  it('softDelete() fija isActive=false + deletedAt + deletedBy', async () => {
    const { service, repo } = build(noti());
    await service.softDelete('n1', actor);
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(patch.isActive).toBe(false);
    expect(patch.deletedAt).toBeInstanceOf(Date);
    expect(patch.deletedById).toBe('admin-1');
  });

  it('activate() -> 404 si no hay inactiva; limpia deletedAt/deletedBy', async () => {
    await expect(
      build(null).service.activate('n1', actor),
    ).rejects.toBeInstanceOf(NotFoundException);

    const { service, repo } = build(noti({ isActive: false }));
    expect(await service.activate('n1', actor)).toEqual({
      detail: 'Noticia habilitada correctamente.',
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

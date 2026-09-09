import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import type { Usuario } from '../users/entities/usuario.entity';
import { DocumentsService } from './documents.service';
import type { Documento } from './entities/documento.entity';

const actor = { id: 'admin-1' } as Usuario;
const pdf = Buffer.from('%PDF-1.7 fake');
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const doc = (over: Partial<Documento> = {}): Documento => ({
  id: 'd1',
  title: 'Decreto 1',
  document: 'https://cdn/documentos/d1.pdf',
  type: 'decreto',
  tags: ['curia'],
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
  createdById: 'u9',
  updatedById: null,
  deletedById: null,
  ...over,
});

function makeQb(rows: Documento[]) {
  const qb: Record<string, jest.Mock> = {};
  for (const m of ['orderBy', 'andWhere', 'skip', 'take']) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getManyAndCount = jest.fn().mockResolvedValue([rows, rows.length]);
  return qb;
}

function build(found: Documento | null, listRows: Documento[] = []) {
  const qb = makeQb(listRows);
  const repo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn().mockResolvedValue(found),
    insert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<Documento>;
  const cloudinary = {
    upload: jest.fn().mockResolvedValue({
      secureUrl: 'https://cdn/documentos/x.pdf',
      publicId: 'x',
    }),
  } as unknown as CloudinaryService;
  const service = new DocumentsService(repo, cloudinary);
  return { service, repo, qb, cloudinary };
}

const baseQuery = { page: 1, page_size: 10, skip: 0, take: 10 };

describe('DocumentsService', () => {
  it('list() aplica title ILIKE, tags jsonb, type exacto e isActive', async () => {
    const { service, qb } = build(null, [doc()]);
    await service.list({
      ...baseQuery,
      title: 'dec',
      tags: 'curia',
      type: 'decreto',
      isActive: true,
    });
    const clauses = qb.andWhere.mock.calls.map((c) => c[0] as string);
    expect(clauses).toContain('d.title ILIKE :title');
    expect(clauses).toContain('d.type = :type');
    expect(clauses).toContain('d.isActive = :isActive');
    expect(clauses.some((c) => c.includes('jsonb_array_elements_text'))).toBe(
      true,
    );
  });

  it('detail() devuelve soft-deleted; 404 si no existe', async () => {
    expect(
      (await build(doc({ isActive: false })).service.detail('d1')).isActive,
    ).toBe(false);
    await expect(build(null).service.detail('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create() sin archivo -> 400 { document: [...] }', async () => {
    await expect(
      build(doc()).service.create(
        { title: 'T', type: 'carta' },
        undefined,
        actor,
      ),
    ).rejects.toMatchObject({ response: { document: expect.any(Array) } });
  });

  it('create() con archivo no-documento (PNG) -> 400, sin subir', async () => {
    const { service, cloudinary } = build(doc());
    await expect(
      service.create(
        { title: 'T', type: 'carta' },
        { buffer: png, size: png.length },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cloudinary.upload).not.toHaveBeenCalled();
  });

  it('create() OK: sube raw, createdBy del actor, tags string-JSON', async () => {
    const { service, repo, cloudinary } = build(doc());
    await service.create(
      { title: 'Nuevo', type: 'circular', tags: '["a","b"]' },
      { buffer: pdf, size: pdf.length },
      actor,
    );
    expect(cloudinary.upload).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ folder: 'documentos', resourceType: 'raw' }),
    );
    const [payload] = (repo.insert as jest.Mock).mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(payload.createdById).toBe('admin-1');
    expect(payload.type).toBe('circular');
    expect(payload.tags).toEqual(['a', 'b']);
    expect(payload.document).toBe('https://cdn/documentos/x.pdf');
    expect(payload).not.toHaveProperty('updatedById');
  });

  it('update() sobre borrado -> 404; solo toca campos presentes', async () => {
    await expect(
      build(null).service.update('d1', { title: 'X' }, undefined, actor),
    ).rejects.toBeInstanceOf(NotFoundException);

    const { service, repo } = build(doc());
    await service.update('d1', { type: 'prensa' }, undefined, actor);
    const [, changes] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(changes.updatedById).toBe('admin-1');
    expect(changes.type).toBe('prensa');
    expect(changes).not.toHaveProperty('title');
    expect(changes).not.toHaveProperty('document');
  });

  it('update() con archivo nuevo -> valida + sube + fija document', async () => {
    const { service, repo, cloudinary } = build(doc());
    await service.update('d1', {}, { buffer: pdf, size: pdf.length }, actor);
    expect(cloudinary.upload).toHaveBeenCalled();
    const [, changes] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(changes.document).toBe('https://cdn/documentos/x.pdf');
  });

  it('softDelete() fija isActive=false + deletedAt + deletedBy', async () => {
    const { service, repo } = build(doc());
    await service.softDelete('d1', actor);
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
      build(null).service.activate('d1', actor),
    ).rejects.toBeInstanceOf(NotFoundException);

    const { service, repo } = build(doc({ isActive: false }));
    expect(await service.activate('d1', actor)).toEqual({
      detail: 'Documento habilitado correctamente.',
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

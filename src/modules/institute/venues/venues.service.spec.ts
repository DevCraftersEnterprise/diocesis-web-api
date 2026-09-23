import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { CloudinaryService } from '../../../integrations/cloudinary/cloudinary.service';
import type { Usuario } from '../../users/entities/usuario.entity';
import type { Sede } from './entities/sede.entity';
import { VenuesService } from './venues.service';

const actor = { id: 'admin-1' } as Usuario;
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pdf = Buffer.from('%PDF-1.4');

const fullDto = {
  name: 'Sede Centro',
  address: 'Calle 1',
  mapsUrl: 'https://maps.example.test/sede-centro',
};

const sede = (over: Partial<Sede> = {}): Sede => ({
  id: 's1',
  name: 'Sede Centro',
  address: 'Calle 1',
  mapsUrl: 'https://maps.example.test/sede-centro',
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

function makeQb(rows: Sede[]) {
  const qb: Record<string, jest.Mock> = {};
  for (const m of ['orderBy', 'andWhere', 'skip', 'take']) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getManyAndCount = jest.fn().mockResolvedValue([rows, rows.length]);
  return qb;
}

function build(found: Sede | null, listRows: Sede[] = []) {
  const qb = makeQb(listRows);
  const repo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn().mockResolvedValue(found),
    insert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<Sede>;
  const cloudinary = {
    upload: jest.fn().mockResolvedValue({
      secureUrl: 'https://cdn/sede/x',
      publicId: 'x',
    }),
  } as unknown as CloudinaryService;
  const service = new VenuesService(repo, cloudinary);
  return { service, repo, cloudinary, qb };
}

describe('VenuesService', () => {
  it('list() filtra por name/isActive', async () => {
    const { service, qb } = build(null, [sede()]);
    await service.list({
      page: 1,
      page_size: 10,
      name: 'Centro',
      isActive: true,
    } as never);
    const whereCalls = qb.andWhere.mock.calls.map((c) => c[0]);
    expect(whereCalls).toContain('s.name ILIKE :name');
    expect(whereCalls).toContain('s.isActive = :isActive');
  });

  it('detail() devuelve soft-deleted; 404 si no existe', async () => {
    expect(
      (await build(sede({ isActive: false })).service.detail('s1')).isActive,
    ).toBe(false);
    await expect(build(null).service.detail('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create() OK: createdBy del actor, sin updatedBy, sube picture', async () => {
    const { service, repo, cloudinary } = build(sede());
    await service.create(fullDto, { buffer: png, size: png.length }, actor);
    expect(cloudinary.upload).toHaveBeenCalled();
    const [payload] = (repo.insert as jest.Mock).mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(payload.createdById).toBe('admin-1');
    expect(payload).not.toHaveProperty('updatedById');
    expect(payload.picture).toBe('https://cdn/sede/x');
  });

  it('create() sin picture -> picture null', async () => {
    const { service, repo } = build(sede());
    await service.create(fullDto, undefined, actor);
    const [payload] = (repo.insert as jest.Mock).mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(payload.picture).toBeNull();
  });

  it('create() con archivo no-imagen -> 400', async () => {
    const { service, cloudinary } = build(sede());
    await expect(
      service.create(fullDto, { buffer: pdf, size: pdf.length }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cloudinary.upload).not.toHaveBeenCalled();
  });

  it('update() sobre borrado -> 404; fija updatedBy y solo toca campos presentes', async () => {
    await expect(
      build(null).service.update('s1', { name: 'X' }, undefined, actor),
    ).rejects.toBeInstanceOf(NotFoundException);

    const { service, repo } = build(sede());
    await service.update(
      's1',
      { address: 'Nueva direccion' },
      undefined,
      actor,
    );
    const [, changes] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(changes.updatedById).toBe('admin-1');
    expect(changes.address).toBe('Nueva direccion');
    expect(changes).not.toHaveProperty('name');
  });

  it('softDelete() fija deletedAt + deletedBy', async () => {
    const { service, repo } = build(sede());
    await service.softDelete('s1', actor);
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      { deletedAt: Date; isActive: boolean },
    ];
    expect(patch.isActive).toBe(false);
    expect(patch.deletedAt).toBeInstanceOf(Date);
  });

  it('activate() -> 404 si no hay inactiva; limpia deletedAt si la hay', async () => {
    await expect(
      build(null).service.activate('s1', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
    const { service, repo } = build(sede({ isActive: false }));
    expect(await service.activate('s1', actor)).toEqual({
      detail: 'Sede habilitada correctamente.',
    });
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(patch).toMatchObject({ isActive: true, deletedAt: null });
  });
});

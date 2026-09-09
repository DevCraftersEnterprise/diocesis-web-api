import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import type { Usuario } from '../users/entities/usuario.entity';
import type { Parroquia } from './entities/parroquia.entity';
import { ParishesService } from './parishes.service';

const actor = { id: 'admin-1' } as Usuario;
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pdf = Buffer.from('%PDF-1.4');
const UUID = '11111111-1111-1111-1111-111111111111';

const fullDto = {
  name: 'San Judas',
  openingDate: '1990-01-01',
  address: 'Calle 1',
  zipCode: '85000',
  town: 'Obregon',
  decanatoId: UUID,
  coloniaId: UUID,
  padreId: UUID,
};

const par = (over: Partial<Parroquia> = {}): Parroquia => ({
  id: 'p1',
  name: 'San Judas',
  openingDate: '1990-01-01',
  address: 'Calle 1',
  zipCode: '85000',
  town: 'Obregon',
  isActive: true,
  picture: null,
  decanatoId: UUID,
  coloniaId: UUID,
  padreId: UUID,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
  createdById: 'u9',
  updatedById: null,
  deletedById: null,
  ...over,
});

function makeQb(rows: Parroquia[]) {
  const qb: Record<string, jest.Mock> = {};
  for (const m of ['leftJoin', 'orderBy', 'andWhere', 'skip', 'take']) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getManyAndCount = jest.fn().mockResolvedValue([rows, rows.length]);
  return qb;
}

function build(
  found: Parroquia | null,
  fkExists = true,
  listRows: Parroquia[] = [],
) {
  const qb = makeQb(listRows);
  const repo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn().mockResolvedValue(found),
    insert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<Parroquia>;
  const catRepo = { existsBy: jest.fn().mockResolvedValue(fkExists) };
  const cloudinary = {
    upload: jest.fn().mockResolvedValue({
      secureUrl: 'https://cdn/parroquia/x',
      publicId: 'x',
    }),
  } as unknown as CloudinaryService;
  const service = new ParishesService(
    repo,
    catRepo as never,
    catRepo as never,
    catRepo as never,
    cloudinary,
  );
  return { service, repo, qb, catRepo, cloudinary };
}

describe('ParishesService', () => {
  it('list() filtra `colonia` por col.name (BUG-DJANGO-003)', async () => {
    const { service, qb } = build(null, true, [par()]);
    await service.list({ page: 1, page_size: 10, colonia: 'Centro' } as never);
    const whereCalls = qb.andWhere.mock.calls.map((c) => c[0]);
    expect(whereCalls).toContain('col.name ILIKE :colonia');
  });

  it('detail() devuelve soft-deleted; 404 si no existe', async () => {
    expect(
      (await build(par({ isActive: false })).service.detail('p1')).isActive,
    ).toBe(false);
    await expect(build(null).service.detail('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create() -> 400 { decanatoId } si la FK no existe', async () => {
    await expect(
      build(par(), false).service.create(fullDto, undefined, actor),
    ).rejects.toMatchObject({ response: { decanatoId: expect.any(Array) } });
  });

  it('create() OK: createdBy del actor, sin updatedBy, sube picture', async () => {
    const { service, repo, cloudinary } = build(par());
    await service.create(fullDto, { buffer: png, size: png.length }, actor);
    expect(cloudinary.upload).toHaveBeenCalled();
    const [payload] = (repo.insert as jest.Mock).mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(payload.createdById).toBe('admin-1');
    expect(payload).not.toHaveProperty('updatedById');
    expect(payload.picture).toBe('https://cdn/parroquia/x');
  });

  it('create() con archivo no-imagen -> 400', async () => {
    const { service, cloudinary } = build(par());
    await expect(
      service.create(fullDto, { buffer: pdf, size: pdf.length }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cloudinary.upload).not.toHaveBeenCalled();
  });

  it('update() sobre borrado -> 404; fija updatedBy y solo toca campos presentes', async () => {
    await expect(
      build(null).service.update('p1', { town: 'X' }, undefined, actor),
    ).rejects.toBeInstanceOf(NotFoundException);

    const { service, repo } = build(par());
    await service.update('p1', { town: 'Navojoa' }, undefined, actor);
    const [, changes] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(changes.updatedById).toBe('admin-1');
    expect(changes.town).toBe('Navojoa');
    expect(changes).not.toHaveProperty('name');
  });

  it('softDelete() fija deletedAt + deletedBy', async () => {
    const { service, repo } = build(par());
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
    const { service, repo } = build(par({ isActive: false }));
    expect(await service.activate('p1', actor)).toEqual({
      detail: 'Parroquia habilitada correctamente.',
    });
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(patch).toMatchObject({ isActive: true, deletedAt: null });
  });

  it('createFromCsv() valida requeridos, formato de fecha y UUIDs de FK', async () => {
    const { service, repo } = build(null);
    const csv = Buffer.from(
      [
        'name,openingDate,address,zipCode,town,decanatoId,coloniaId,padreId',
        `Buena,1990-01-01,Calle,85000,Obregon,${UUID},${UUID},${UUID}`,
        'MalaFecha,ayer,Calle,85000,Obregon,x,y,z',
      ].join('\n'),
    );
    const res = await service.createFromCsv(csv, actor);
    expect(res.creados).toEqual(['Buena']);
    expect(res.errores).toHaveLength(1);
    expect(repo.insert).toHaveBeenCalledTimes(1);
  });
});

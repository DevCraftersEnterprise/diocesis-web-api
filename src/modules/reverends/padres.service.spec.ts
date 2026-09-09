import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import type { Usuario } from '../users/entities/usuario.entity';
import type { Padre } from './entities/padre.entity';
import { PadresService } from './padres.service';

const actor = { id: 'admin-1' } as Usuario;
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pdf = Buffer.from('%PDF-1.4');

const padre = (over: Partial<Padre> = {}): Padre => ({
  id: 'p1',
  firstName: 'Juan',
  lastName: 'Perez',
  birthDate: '1980-05-15',
  isActive: true,
  picture: null,
  email: null,
  facebook: null,
  instagram: null,
  twitter: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
  updatedById: null,
  deletedById: null,
  ...over,
});

function makeQb(rows: Padre[]) {
  const qb: Record<string, jest.Mock> = {};
  for (const m of ['orderBy', 'addOrderBy', 'andWhere', 'skip', 'take']) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getMany = jest.fn().mockResolvedValue(rows);
  qb.getManyAndCount = jest.fn().mockResolvedValue([rows, rows.length]);
  return qb;
}

function build(found: Padre | null, listRows: Padre[] = []) {
  const qb = makeQb(listRows);
  const repo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn().mockResolvedValue(found),
    insert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<Padre>;
  const cloudinary = {
    upload: jest.fn().mockResolvedValue({
      secureUrl: 'https://cdn/padres/x.jpg',
      publicId: 'padres/x',
    }),
  } as unknown as CloudinaryService;
  return { service: new PadresService(repo, cloudinary), repo, qb, cloudinary };
}

describe('PadresService', () => {
  it('list(paginated=false) -> array plano (APIC-003)', async () => {
    const { service, qb } = build(null, [padre(), padre({ id: 'p2' })]);
    const res = await service.list({ page: 1, page_size: 10 } as never, false);
    expect(Array.isArray(res)).toBe(true);
    expect(qb.skip).not.toHaveBeenCalled();
  });

  it('list(paginated=true) -> objeto { count, results }', async () => {
    const { service, qb } = build(null, [padre()]);
    const res = await service.list({ page: 1, page_size: 10 } as never, true);
    expect(res).toMatchObject({ count: 1, results: expect.any(Array) });
    expect(qb.skip).toHaveBeenCalled();
  });

  it('detail() devuelve una fila soft-deleted', async () => {
    const { service } = build(padre({ isActive: false }));
    expect((await service.detail('p1')).isActive).toBe(false);
  });

  it('detail() -> 404 si no existe', async () => {
    const { service } = build(null);
    await expect(service.detail('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create() sin foto: insert, sin updatedBy', async () => {
    const { service, repo } = build(padre());
    await service.create(
      { firstName: 'Ana', lastName: 'Lopez', birthDate: '1990-01-01' },
      undefined,
    );
    const [payload] = (repo.insert as jest.Mock).mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(payload.picture).toBeNull();
    expect(payload).not.toHaveProperty('updatedById');
  });

  it('create() con foto valida: valida, sube y guarda la secure_url', async () => {
    const { service, repo, cloudinary } = build(padre());
    await service.create(
      { firstName: 'Ana', lastName: 'Lopez', birthDate: '1990-01-01' },
      { buffer: png, size: png.length },
    );
    expect(cloudinary.upload).toHaveBeenCalled();
    const [payload] = (repo.insert as jest.Mock).mock.calls[0] as [
      { picture: string },
    ];
    expect(payload.picture).toBe('https://cdn/padres/x.jpg');
  });

  it('create() con archivo no-imagen -> 400 y no sube nada', async () => {
    const { service, cloudinary } = build(padre());
    await expect(
      service.create(
        { firstName: 'A', lastName: 'B', birthDate: '1990-01-01' },
        { buffer: pdf, size: pdf.length },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cloudinary.upload).not.toHaveBeenCalled();
  });

  it('update() sobre una fila borrada -> 404', async () => {
    const { service } = build(null);
    await expect(
      service.update('p1', { firstName: 'X' }, undefined, actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update() fija updatedById y solo toca campos presentes', async () => {
    const { service, repo } = build(padre());
    await service.update('p1', { email: 'a@b.test' }, undefined, actor);
    const [, changes] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(changes.updatedById).toBe('admin-1');
    expect(changes.email).toBe('a@b.test');
    expect(changes).not.toHaveProperty('firstName');
  });

  it('softDelete() fija deletedAt + deletedBy', async () => {
    const { service, repo } = build(padre());
    await service.softDelete('p1', actor);
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      { deletedAt: Date; deletedById: string; isActive: boolean },
    ];
    expect(patch.isActive).toBe(false);
    expect(patch.deletedAt).toBeInstanceOf(Date);
    expect(patch.deletedById).toBe('admin-1');
  });

  it('activate() -> 404 si no hay fila inactiva; si la hay limpia deletedAt', async () => {
    await expect(
      build(null).service.activate('p1', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
    const { service, repo } = build(padre({ isActive: false }));
    const res = await service.activate('p1', actor);
    expect(res).toEqual({ detail: 'Padre habilitado correctamente.' });
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(patch).toMatchObject({ isActive: true, deletedAt: null });
  });

  it('createFromCsv() valida firstName/lastName/birthDate por fila', async () => {
    const { service, repo } = build(null);
    const csv = Buffer.from(
      [
        'firstName,lastName,birthDate',
        'Ana,Lopez,1990-01-01',
        'SinFecha,X,',
        ',SinNombre,1980-01-01',
      ].join('\n'),
    );
    const res = await service.createFromCsv(csv);
    expect(res.creados).toEqual(['Ana Lopez']);
    expect(res.errores).toHaveLength(2);
    expect(repo.insert).toHaveBeenCalledTimes(1);
  });
});

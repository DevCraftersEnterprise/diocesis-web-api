import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import type { Usuario } from '../users/entities/usuario.entity';
import { CarouselService } from './carousel.service';
import type { Carrusel } from './entities/carrusel.entity';

const actor = { id: 'admin-1' } as Usuario;
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const mp4 = Buffer.concat([
  Buffer.from([0, 0, 0, 0x18]),
  Buffer.from('ftypisom', 'latin1'),
]);

const carr = (over: Partial<Carrusel> = {}): Carrusel => ({
  id: 'c1',
  url: 'https://cdn/x.jpg',
  isImage: true,
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
  createdById: 'u9',
  updatedById: null,
  deletedById: null,
  ...over,
});

function build(found: Carrusel | null, listRows: Carrusel[] = []) {
  const repo = {
    find: jest.fn().mockResolvedValue(listRows),
    findOne: jest.fn().mockResolvedValue(found),
    insert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<Carrusel>;
  const cloudinary = {
    upload: jest.fn().mockResolvedValue({
      secureUrl: 'https://cdn/carrusel/x',
      publicId: 'carrusel/x',
    }),
  } as unknown as CloudinaryService;
  return { service: new CarouselService(repo, cloudinary), repo, cloudinary };
}

describe('CarouselService', () => {
  it('list() solo activos, orden -createdAt', async () => {
    const { service, repo } = build(null, [carr()]);
    await service.list();
    const [opts] = (repo.find as jest.Mock).mock.calls[0] as [
      { where: { isActive: boolean }; order: { createdAt: string } },
    ];
    expect(opts.where.isActive).toBe(true);
    expect(opts.order.createdAt).toBe('DESC');
  });

  it('detail() devuelve una fila soft-deleted; 404 si no existe', async () => {
    expect(
      (await build(carr({ isActive: false })).service.detail('c1')).isActive,
    ).toBe(false);
    await expect(build(null).service.detail('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create() sin archivo -> 400 { error }', async () => {
    await expect(
      build(carr()).service.create({ isImage: true }, undefined, actor),
    ).rejects.toMatchObject({ response: { error: expect.any(String) } });
  });

  it('create() imagen: valida como imagen y sube a carrusel/imagenes', async () => {
    const { service, repo, cloudinary } = build(carr());
    await service.create(
      { isImage: true },
      { buffer: png, size: png.length },
      actor,
    );
    const [opts] = (cloudinary.upload as jest.Mock).mock.calls[0].slice(1) as [
      { folder: string; resourceType: string },
    ];
    expect(opts).toEqual({
      folder: 'carrusel/imagenes',
      resourceType: 'image',
    });
    const [payload] = (repo.insert as jest.Mock).mock.calls[0] as [
      { createdById: string; url: string },
    ];
    expect(payload.createdById).toBe('admin-1');
  });

  it('create() video: valida como video y sube a carrusel/videos', async () => {
    const { service, cloudinary } = build(carr());
    await service.create(
      { isImage: false },
      { buffer: mp4, size: mp4.length },
      actor,
    );
    const [opts] = (cloudinary.upload as jest.Mock).mock.calls[0].slice(1) as [
      { folder: string; resourceType: string },
    ];
    expect(opts).toEqual({ folder: 'carrusel/videos', resourceType: 'video' });
  });

  it('create() isImage=false con una imagen -> 400 (validador de video)', async () => {
    const { service, cloudinary } = build(carr());
    await expect(
      service.create(
        { isImage: false },
        { buffer: png, size: png.length },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cloudinary.upload).not.toHaveBeenCalled();
  });

  it('update() sobre borrado -> 404; sin isImage conserva el actual y fija updatedBy', async () => {
    await expect(
      build(null).service.update('c1', {}, undefined, actor),
    ).rejects.toBeInstanceOf(NotFoundException);

    const { service, repo } = build(carr({ isImage: false }));
    await service.update('c1', {}, undefined, actor);
    const [, changes] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      { isImage: boolean; updatedById: string },
    ];
    expect(changes.isImage).toBe(false);
    expect(changes.updatedById).toBe('admin-1');
  });

  it('softDelete() fija deletedAt + deletedBy', async () => {
    const { service, repo } = build(carr());
    await service.softDelete('c1', actor);
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      { deletedAt: Date; isActive: boolean },
    ];
    expect(patch.isActive).toBe(false);
    expect(patch.deletedAt).toBeInstanceOf(Date);
  });

  it('activate() -> 400 si ya activo; 200 + limpia deletedAt si estaba inactivo', async () => {
    await expect(
      build(carr({ isActive: true })).service.activate('c1', actor),
    ).rejects.toMatchObject({
      response: { detail: 'Este carrusel ya esta activo.' },
    });

    const { service, repo } = build(carr({ isActive: false }));
    const res = await service.activate('c1', actor);
    expect(res).toEqual({ detail: 'Carrusel habilitado correctamente.' });
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(patch).toMatchObject({ isActive: true, deletedAt: null });
  });
});

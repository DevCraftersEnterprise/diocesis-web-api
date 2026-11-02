import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import type { Usuario } from '../users/entities/usuario.entity';
import { PaginaContenido } from './entities/pagina-contenido.entity';
import { PaginaImagen } from './entities/pagina-imagen.entity';
import { PaginaContenidoService } from './pagina-contenido.service';

const actor = { id: 'admin-1' } as Usuario;

const page = (over: Partial<PaginaContenido> = {}): PaginaContenido => ({
  id: 'p1',
  slug: 'historia',
  title: 'Historia',
  body: '',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  updatedById: null,
  ...over,
});

const image = (over: Partial<PaginaImagen> = {}): PaginaImagen => ({
  id: 'img-1',
  paginaId: 'p1',
  url: 'https://cloudinary/img-1.jpg',
  caption: null,
  order: 0,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  ...over,
});

function build(opts: {
  page?: PaginaContenido | null;
  images?: PaginaImagen[];
}) {
  const pagesRepo = {
    findOne: jest.fn().mockResolvedValue(opts.page ?? null),
    find: jest.fn().mockResolvedValue(opts.page ? [opts.page] : []),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<PaginaContenido>;

  const imagesRepo = {
    find: jest.fn().mockResolvedValue(opts.images ?? []),
    findOne: jest
      .fn()
      .mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          (opts.images ?? []).find((i) => i.id === where.id) ?? null,
        ),
      ),
    create: jest.fn().mockImplementation((data) => data),
    save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<PaginaImagen>;

  const cloudinary = {
    upload: jest.fn().mockResolvedValue({
      secureUrl: 'https://cloudinary/new.jpg',
      publicId: 'x',
    }),
  } as unknown as CloudinaryService;

  const service = new PaginaContenidoService(pagesRepo, imagesRepo, cloudinary);
  return { service, pagesRepo, imagesRepo, cloudinary };
}

describe('PaginaContenidoService', () => {
  it('get() devuelve el contenido con su galeria ordenada; 404 si el slug no existe', async () => {
    const { service } = build({
      page: page(),
      images: [image({ order: 1 }), image({ id: 'img-0', order: 0 })],
    });
    const out = await service.get('historia');
    expect(out.slug).toBe('historia');
    expect(out.images.map((i) => i.id)).toEqual(['img-1', 'img-0']); // orden del mock find(), no reordenado aqui

    await expect(
      build({ page: null }).service.get('inexistente'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update() solo toca title/body presentes y fija updatedBy/updatedAt', async () => {
    const { service, pagesRepo } = build({ page: page() });
    await service.update('historia', { title: 'Nueva historia' }, actor);

    const [id, changes] = (pagesRepo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(id).toBe('p1');
    expect(changes.title).toBe('Nueva historia');
    expect(changes.updatedById).toBe('admin-1');
    expect(changes).not.toHaveProperty('body');
  });

  it('addImage() valida, sube a Cloudinary y agrega al final de la galeria', async () => {
    const { service, cloudinary, imagesRepo } = build({
      page: page(),
      images: [image({ order: 0 }), image({ id: 'img-2', order: 1 })],
    });
    const file = { buffer: Buffer.from([0xff, 0xd8, 0xff]), size: 100 };

    const out = await service.addImage('historia', file, {
      caption: 'Pie de foto',
    });

    expect(cloudinary.upload).toHaveBeenCalledWith(file.buffer, {
      folder: 'paginas/historia',
      resourceType: 'image',
    });
    expect(out.url).toBe('https://cloudinary/new.jpg');
    const saved = (imagesRepo.save as jest.Mock).mock.calls[0][0];
    expect(saved.order).toBe(2);
    expect(saved.caption).toBe('Pie de foto');
  });

  it('deleteImage() 404 si la imagen no pertenece a esa pagina', async () => {
    const { service } = build({ page: page(), images: [] });
    await expect(
      service.deleteImage('historia', 'no-existe'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reorderImages() rechaza si el orden no trae exactamente los ids actuales', async () => {
    const { service } = build({
      page: page(),
      images: [image({ id: 'a' }), image({ id: 'b' })],
    });

    await expect(
      service.reorderImages('historia', { order: ['a'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.reorderImages('historia', { order: ['a', 'c'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reorderImages() reasigna order segun la posicion de cada id', async () => {
    const { service, imagesRepo } = build({
      page: page(),
      images: [image({ id: 'a', order: 0 }), image({ id: 'b', order: 1 })],
    });

    await service.reorderImages('historia', { order: ['b', 'a'] });

    expect(imagesRepo.update).toHaveBeenCalledWith(
      { id: 'b', paginaId: 'p1' },
      { order: 0 },
    );
    expect(imagesRepo.update).toHaveBeenCalledWith(
      { id: 'a', paginaId: 'p1' },
      { order: 1 },
    );
  });
});

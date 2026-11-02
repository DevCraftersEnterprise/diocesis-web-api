import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import type { Usuario } from '../users/entities/usuario.entity';
import { DescargasService } from './descargas.service';
import { Descarga } from './entities/descarga.entity';

const actor = { id: 'admin-1' } as Usuario;

const row = (over: Partial<Descarga> = {}): Descarga => ({
  id: 'd1',
  title: 'Circular 2026',
  description: 'Circular de fin de ano.',
  fileUrl: 'https://cloudinary/descargas/circular.pdf',
  fileName: 'circular.pdf',
  fileExtension: 'pdf',
  fileSizeBytes: 1000,
  publishedAt: '2026-01-01',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  createdById: 'admin-1',
  updatedById: null,
  deletedById: null,
  ...over,
});

function build(opts: { found?: Descarga | null } = {}) {
  const qb = {
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[row()], 1]),
  };
  const repo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn().mockResolvedValue('found' in opts ? opts.found : row()),
    insert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<Descarga>;

  const cloudinary = {
    upload: jest.fn().mockResolvedValue({
      secureUrl: 'https://cloudinary/descargas/nuevo.pdf',
      publicId: 'x',
    }),
  } as unknown as CloudinaryService;

  const service = new DescargasService(repo, cloudinary);
  return { service, repo, cloudinary, qb };
}

const pdfFile = {
  buffer: Buffer.from('%PDF-1.4', 'latin1'),
  size: 100,
  originalname: 'circular.pdf',
};

describe('DescargasService', () => {
  it('create() exige el archivo; sube a Cloudinary y guarda nombre/extension/tamano', async () => {
    const { service, repo, cloudinary } = build();

    await expect(
      service.create({ title: 't', description: 'd' }, undefined, actor),
    ).rejects.toBeInstanceOf(BadRequestException);

    await service.create(
      { title: 'Circular', description: 'desc' },
      pdfFile,
      actor,
    );
    expect(cloudinary.upload).toHaveBeenCalledWith(pdfFile.buffer, {
      folder: 'descargas',
      resourceType: 'raw',
    });
    const inserted = (repo.insert as jest.Mock).mock.calls[0][0];
    expect(inserted.fileName).toBe('circular.pdf');
    expect(inserted.fileExtension).toBe('pdf');
    expect(inserted.fileSizeBytes).toBe(100);
    expect(inserted.createdById).toBe('admin-1');
  });

  it('create() rechaza un ejecutable antes de llamar a Cloudinary', async () => {
    const { service, cloudinary } = build();
    const exe = {
      buffer: Buffer.alloc(10),
      size: 10,
      originalname: 'virus.exe',
    };

    await expect(
      service.create({ title: 't', description: 'd' }, exe, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cloudinary.upload).not.toHaveBeenCalled();
  });

  it('create() usa hoy como publishedAt si no se manda', async () => {
    const { service, repo } = build();
    await service.create({ title: 't', description: 'd' }, pdfFile, actor);
    const inserted = (repo.insert as jest.Mock).mock.calls[0][0];
    expect(inserted.publishedAt).toBe(new Date().toISOString().slice(0, 10));
  });

  it('update() sin archivo nuevo no vuelve a subir nada', async () => {
    const { service, repo, cloudinary } = build();
    await service.update('d1', { title: 'Nuevo titulo' }, undefined, actor);

    expect(cloudinary.upload).not.toHaveBeenCalled();
    const changes = (repo.update as jest.Mock).mock.calls[0][1];
    expect(changes.title).toBe('Nuevo titulo');
    expect(changes).not.toHaveProperty('fileUrl');
  });

  it('update() con archivo nuevo reemplaza fileUrl/fileName/fileExtension/fileSizeBytes', async () => {
    const { service, repo, cloudinary } = build();
    const docx = {
      buffer: Buffer.alloc(10),
      size: 10,
      originalname: 'reemplazo.docx',
    };

    await service.update('d1', {}, docx, actor);

    expect(cloudinary.upload).toHaveBeenCalled();
    const changes = (repo.update as jest.Mock).mock.calls[0][1];
    expect(changes.fileName).toBe('reemplazo.docx');
    expect(changes.fileExtension).toBe('docx');
  });

  it('softDelete() 404 si ya esta inactiva', async () => {
    const { service } = build({ found: null });
    await expect(service.softDelete('d1', actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('activate() 404 si no existe una fila inactiva con ese id', async () => {
    const { service } = build({ found: null });
    await expect(service.activate('d1', actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

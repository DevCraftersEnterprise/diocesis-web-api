import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Usuario } from '../users/entities/usuario.entity';
import { EnlaceMultimedia } from './entities/enlace-multimedia.entity';
import { MultimediaService } from './multimedia.service';

const actor = { id: 'admin-1' } as Usuario;

const row = (over: Partial<EnlaceMultimedia> = {}): EnlaceMultimedia => ({
  id: 'e1',
  title: 'Misa dominical',
  description: 'Transmision en vivo.',
  url: 'https://youtube.com/watch?v=x',
  order: 0,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  createdById: 'admin-1',
  updatedById: null,
  deletedById: null,
  ...over,
});

function build(
  opts: { found?: EnlaceMultimedia | null; all?: EnlaceMultimedia[] } = {},
) {
  const repo = {
    find: jest.fn().mockResolvedValue(opts.all ?? [row()]),
    findOne: jest.fn().mockResolvedValue('found' in opts ? opts.found : row()),
    insert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<EnlaceMultimedia>;

  const service = new MultimediaService(repo);
  return { service, repo };
}

describe('MultimediaService', () => {
  it('create() agrega al final del orden actual', async () => {
    const { service, repo } = build({
      all: [row({ order: 0 }), row({ id: 'e2', order: 3 })],
    });
    await service.create(
      { title: 't', description: 'd', url: 'https://x.com' },
      actor,
    );

    const inserted = (repo.insert as jest.Mock).mock.calls[0][0];
    expect(inserted.order).toBe(4);
    expect(inserted.createdById).toBe('admin-1');
  });

  it('create() con tabla vacia empieza en order=0', async () => {
    const { service, repo } = build({ all: [] });
    await service.create(
      { title: 't', description: 'd', url: 'https://x.com' },
      actor,
    );
    expect((repo.insert as jest.Mock).mock.calls[0][0].order).toBe(0);
  });

  it('update() solo toca los campos presentes', async () => {
    const { service, repo } = build();
    await service.update('e1', { title: 'Nuevo' }, actor);

    const changes = (repo.update as jest.Mock).mock.calls[0][1];
    expect(changes.title).toBe('Nuevo');
    expect(changes).not.toHaveProperty('url');
  });

  it('softDelete()/activate() 404 si no corresponde el estado esperado', async () => {
    const { service } = build({ found: null });
    await expect(service.softDelete('e1', actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.activate('e1', actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('reorder() rechaza si no trae exactamente los ids activos actuales', async () => {
    const { service } = build({ all: [row({ id: 'a' }), row({ id: 'b' })] });
    await expect(service.reorder({ order: ['a'] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.reorder({ order: ['a', 'c'] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('reorder() reasigna order segun la posicion de cada id', async () => {
    const { service, repo } = build({
      all: [row({ id: 'a', order: 0 }), row({ id: 'b', order: 1 })],
    });
    await service.reorder({ order: ['b', 'a'] });

    expect(repo.update).toHaveBeenCalledWith('b', { order: 0 });
    expect(repo.update).toHaveBeenCalledWith('a', { order: 1 });
  });
});

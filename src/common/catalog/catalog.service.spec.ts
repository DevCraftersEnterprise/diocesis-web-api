import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Usuario } from '../../modules/users/entities/usuario.entity';
import { CatalogService } from './catalog.service';
import type { CatalogNameEntity } from './catalog.types';

class TestCatalogService extends CatalogService<
  CatalogNameEntity & Record<string, unknown>
> {
  constructor(repo: Repository<CatalogNameEntity & Record<string, unknown>>) {
    super(repo, { alias: 't', activateMessage: 'Reactivado.' });
  }
}

const actor = { id: 'admin-1' } as Usuario;

const row = (over: Partial<CatalogNameEntity> = {}): CatalogNameEntity => ({
  id: 'e1',
  name: 'Uno',
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
  createdById: 'u9',
  updatedById: null,
  deletedById: null,
  ...over,
});

function build(found: CatalogNameEntity | null) {
  const repo = {
    findOne: jest.fn().mockResolvedValue(found),
    insert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<CatalogNameEntity & Record<string, unknown>>;
  return { service: new TestCatalogService(repo), repo };
}

describe('CatalogService', () => {
  it('detail() devuelve la fila aunque este soft-deleted (BUG-DJANGO-022)', async () => {
    const { service } = build(row({ isActive: false, deletedById: 'x' }));
    const res = await service.detail('e1');
    expect(res.isActive).toBe(false);
    expect(res.createdBy).toBe('u9');
    expect(res.deletedBy).toBe('x');
  });

  it('detail() -> 404 si no existe', async () => {
    const { service } = build(null);
    await expect(service.detail('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create() fija createdById desde el actor', async () => {
    const { service, repo } = build(row({ createdById: 'admin-1' }));
    await service.create({ name: 'Nuevo' }, actor);
    const [payload] = (repo.insert as jest.Mock).mock.calls[0] as [
      { createdById: string; isActive: boolean },
    ];
    expect(payload.createdById).toBe('admin-1');
    expect(payload.isActive).toBe(true);
  });

  it('update() sobre una fila no-activa -> 404', async () => {
    const { service } = build(null);
    await expect(
      service.update('e1', { name: 'x' }, actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('softDelete() fija isActive=false + deletedAt + deletedBy', async () => {
    const { service, repo } = build(row());
    await service.softDelete('e1', actor);
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      { isActive: boolean; deletedAt: Date; deletedById: string },
    ];
    expect(patch.isActive).toBe(false);
    expect(patch.deletedAt).toBeInstanceOf(Date);
    expect(patch.deletedById).toBe('admin-1');
  });

  it('activate() -> 404 si no hay fila con isActive=false', async () => {
    const { service } = build(null);
    await expect(service.activate('e1', actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('activate() limpia deletedAt/deletedBy y usa el mensaje configurado', async () => {
    const { service, repo } = build(row({ isActive: false, deletedById: 'x' }));
    const res = await service.activate('e1', actor);
    expect(res).toEqual({ detail: 'Reactivado.' });
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(patch).toMatchObject({
      isActive: true,
      deletedAt: null,
      deletedById: null,
    });
  });

  it('createFromCsv() acumula creados y un error por fila con name vacio', async () => {
    const { service, repo } = build(null);
    const csv = Buffer.from(['name,nota', 'Uno,a', ',b', 'Dos,c'].join('\n'));
    const res = await service.createFromCsv(csv, actor);
    expect(res.creados).toEqual(['Uno', 'Dos']);
    expect(res.errores).toHaveLength(1);
    expect(repo.insert).toHaveBeenCalledTimes(2);
  });

  it('createFromCsv() CSV ilegible -> 400', async () => {
    const { service } = build(null);
    await expect(
      service.createFromCsv(Buffer.from('a,b\n"c'), actor),
    ).rejects.toMatchObject({ response: { error: expect.any(String) } });
  });
});

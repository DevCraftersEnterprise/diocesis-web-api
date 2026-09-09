import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Usuario } from '../users/entities/usuario.entity';
import { DecanatesService } from './decanates.service';
import type { Decanato } from './entities/decanato.entity';

const actor = { id: 'admin-1' } as Usuario;

function build(row: Partial<Decanato> | null = null) {
  const repo = {
    findOne: jest.fn().mockResolvedValue(row),
    insert: jest.fn().mockResolvedValue({ identifiers: [{ id: 'x' }] }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<Decanato>;
  return { service: new DecanatesService(repo), repo };
}

const full = (over: Partial<Decanato> = {}): Decanato => ({
  id: 'd1',
  name: 'San Pedro',
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  deletedAt: null,
  createdById: 'u9',
  updatedById: null,
  deletedById: null,
  ...over,
});

describe('DecanatesService', () => {
  it('detail() devuelve una fila soft-deleted (BUG-DJANGO-022)', async () => {
    const { service } = build(full({ isActive: false, deletedById: 'x' }));
    const res = await service.detail('d1');
    expect(res.isActive).toBe(false);
    expect(res.createdBy).toBe('u9');
  });

  it('detail() -> 404 si no existe', async () => {
    const { service } = build(null);
    await expect(service.detail('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create() fija createdById desde el actor, nunca del body', async () => {
    const { service, repo } = build(full({ createdById: 'admin-1' }));
    await service.create({ name: 'Nuevo' }, actor);
    const [payload] = (repo.insert as jest.Mock).mock.calls[0] as [
      { createdById: string; name: string; isActive: boolean },
    ];
    expect(payload.createdById).toBe('admin-1');
    expect(payload.isActive).toBe(true);
  });

  it('update() sobre una fila borrada -> 404', async () => {
    const { service } = build(null); // findActiveOr404 no encuentra activa
    await expect(
      service.update('d1', { name: 'x' }, actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('softDelete() fija isActive=false + deletedAt + deletedBy (BUG-DJANGO-013)', async () => {
    const { service, repo } = build(full());
    await service.softDelete('d1', actor);
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      { isActive: boolean; deletedAt: Date; deletedById: string },
    ];
    expect(patch.isActive).toBe(false);
    expect(patch.deletedAt).toBeInstanceOf(Date);
    expect(patch.deletedById).toBe('admin-1');
  });

  it('activate() -> 404 si ya esta activo (no hay fila con isActive=false)', async () => {
    const { service } = build(null);
    await expect(service.activate('d1', actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('activate() limpia deletedAt/deletedBy', async () => {
    const { service, repo } = build(
      full({ isActive: false, deletedById: 'x' }),
    );
    await service.activate('d1', actor);
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      { isActive: boolean; deletedAt: null; deletedById: null },
    ];
    expect(patch).toMatchObject({
      isActive: true,
      deletedAt: null,
      deletedById: null,
    });
  });

  it('createFromCsv() acumula creados y errores por fila sin nombre', async () => {
    const { service, repo } = build();
    // 3 filas; la del medio tiene `name` vacio (no es una linea en blanco -> no se salta).
    const csv = Buffer.from(['name,nota', 'Uno,a', ',b', 'Dos,c'].join('\n'));
    const res = await service.createFromCsv(csv, actor);
    expect(res.creados).toEqual(['Uno', 'Dos']);
    expect(res.errores).toHaveLength(1);
    expect(repo.insert).toHaveBeenCalledTimes(2);
  });
});

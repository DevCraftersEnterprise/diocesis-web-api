import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Usuario } from '../../users/entities/usuario.entity';
import { InstituteInformationService } from './institute-information.service';
import {
  INSTITUTO_INFORMACION_ID,
  type InstitutoInformacion,
} from './entities/instituto-informacion.entity';

const actor = { id: 'admin-1' } as Usuario;

const row = (
  over: Partial<InstitutoInformacion> = {},
): InstitutoInformacion => ({
  id: INSTITUTO_INFORMACION_ID,
  name: 'Instituto Biblico',
  description: 'Descripcion',
  contactEmail: null,
  contactPhone: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  updatedById: null,
  ...over,
});

function build(found: InstitutoInformacion | null) {
  const repo = {
    findOne: jest.fn().mockResolvedValue(found),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<InstitutoInformacion>;
  const service = new InstituteInformationService(repo);
  return { service, repo };
}

describe('InstituteInformationService', () => {
  it('get() devuelve la fila fija; 404 si no existe (no deberia pasar tras la migracion)', async () => {
    const { service, repo } = build(row());
    const out = await service.get();
    expect(out.id).toBe(INSTITUTO_INFORMACION_ID);
    expect((repo.findOne as jest.Mock).mock.calls[0][0]).toEqual({
      where: { id: INSTITUTO_INFORMACION_ID },
    });

    await expect(build(null).service.get()).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update() 404 si la fila no existe', async () => {
    await expect(
      build(null).service.update({ name: 'x' }, actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update() solo toca campos presentes y fija updatedBy/updatedAt', async () => {
    const { service, repo } = build(row());
    await service.update({ description: 'Nueva descripcion' }, actor);

    const [id, changes] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(id).toBe(INSTITUTO_INFORMACION_ID);
    expect(changes.description).toBe('Nueva descripcion');
    expect(changes.updatedById).toBe('admin-1');
    expect(changes).not.toHaveProperty('name');
    expect(changes).not.toHaveProperty('contactEmail');
  });
});

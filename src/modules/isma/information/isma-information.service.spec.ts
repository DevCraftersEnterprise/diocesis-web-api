import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { Usuario } from '../../users/entities/usuario.entity';
import { IsmaInformationService } from './isma-information.service';
import {
  ISMA_INFORMACION_ID,
  type IsmaInformacion,
} from './entities/isma-informacion.entity';

const actor = { id: 'admin-1' } as Usuario;

const row = (over: Partial<IsmaInformacion> = {}): IsmaInformacion => ({
  id: ISMA_INFORMACION_ID,
  introduccion: 'Introduccion',
  documentacionNecesaria: 'Documentacion',
  parroquiaCorrespondiente: 'Parroquia',
  entrevistaParroco: 'Entrevista',
  programaIsma: 'Programa',
  tiemposAnticipacion: 'Tiempos',
  contactoTelefono1: null,
  contactoTelefono2: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  updatedById: null,
  ...over,
});

function build(found: IsmaInformacion | null) {
  const repo = {
    findOne: jest.fn().mockResolvedValue(found),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<IsmaInformacion>;
  const service = new IsmaInformationService(repo);
  return { service, repo };
}

describe('IsmaInformationService', () => {
  it('get() devuelve la fila fija; 404 si no existe (no deberia pasar tras la migracion)', async () => {
    const { service, repo } = build(row());
    const out = await service.get();
    expect(out.id).toBe(ISMA_INFORMACION_ID);
    expect((repo.findOne as jest.Mock).mock.calls[0][0]).toEqual({
      where: { id: ISMA_INFORMACION_ID },
    });

    await expect(build(null).service.get()).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update() 404 si la fila no existe', async () => {
    await expect(
      build(null).service.update({ introduccion: 'x' }, actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update() solo toca campos presentes y fija updatedBy/updatedAt', async () => {
    const { service, repo } = build(row());
    await service.update({ programaIsma: 'Nuevo programa' }, actor);

    const [id, changes] = (repo.update as jest.Mock).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(id).toBe(ISMA_INFORMACION_ID);
    expect(changes.programaIsma).toBe('Nuevo programa');
    expect(changes.updatedById).toBe('admin-1');
    expect(changes).not.toHaveProperty('introduccion');
    expect(changes).not.toHaveProperty('contactoTelefono1');
  });
});

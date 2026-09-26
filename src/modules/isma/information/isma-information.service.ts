import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Usuario } from '../../users/entities/usuario.entity';
import { UpdateIsmaInformacionDto } from './dto/isma-informacion.dto';
import {
  ISMA_INFORMACION_ID,
  IsmaInformacion,
} from './entities/isma-informacion.entity';
import {
  toIsmaInformacionResponse,
  type IsmaInformacionResponse,
} from './isma-informacion.response';

const NOT_FOUND = { detail: 'No encontrado.' };

/**
 * Recurso "singleton" (Tarea 6.1, `docs/instituto-biblico-isma.md` §3.1): una unica
 * fila, sembrada por la migracion `CreateIsmaInformacion`. Sin `create`/`delete`.
 */
@Injectable()
export class IsmaInformationService {
  constructor(
    @InjectRepository(IsmaInformacion)
    private readonly repo: Repository<IsmaInformacion>,
  ) {}

  private async findOrThrow(): Promise<IsmaInformacion> {
    const row = await this.repo.findOne({
      where: { id: ISMA_INFORMACION_ID },
    });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async get(): Promise<IsmaInformacionResponse> {
    return toIsmaInformacionResponse(await this.findOrThrow());
  }

  async update(
    dto: UpdateIsmaInformacionDto,
    actor: Usuario,
  ): Promise<IsmaInformacionResponse> {
    await this.findOrThrow();

    const changes: Partial<IsmaInformacion> = {
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    if (dto.introduccion !== undefined) changes.introduccion = dto.introduccion;
    if (dto.documentacionNecesaria !== undefined) {
      changes.documentacionNecesaria = dto.documentacionNecesaria;
    }
    if (dto.parroquiaCorrespondiente !== undefined) {
      changes.parroquiaCorrespondiente = dto.parroquiaCorrespondiente;
    }
    if (dto.entrevistaParroco !== undefined) {
      changes.entrevistaParroco = dto.entrevistaParroco;
    }
    if (dto.programaIsma !== undefined) changes.programaIsma = dto.programaIsma;
    if (dto.tiemposAnticipacion !== undefined) {
      changes.tiemposAnticipacion = dto.tiemposAnticipacion;
    }
    if (dto.contactoTelefono1 !== undefined) {
      changes.contactoTelefono1 = dto.contactoTelefono1;
    }
    if (dto.contactoTelefono2 !== undefined) {
      changes.contactoTelefono2 = dto.contactoTelefono2;
    }

    await this.repo.update(ISMA_INFORMACION_ID, changes);
    return this.get();
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Usuario } from '../../users/entities/usuario.entity';
import { UpdateInstitutoInformacionDto } from './dto/instituto-informacion.dto';
import {
  INSTITUTO_INFORMACION_ID,
  InstitutoInformacion,
} from './entities/instituto-informacion.entity';
import {
  toInstitutoInformacionResponse,
  type InstitutoInformacionResponse,
} from './instituto-informacion.response';

const NOT_FOUND = { detail: 'No encontrado.' };

/**
 * Recurso "singleton" (Tarea 3.1, `docs/instituto-biblico-isma.md` §3.1): una unica
 * fila, sembrada por la migracion `CreateInstitutoInformacion`. Sin `create`/`delete`.
 */
@Injectable()
export class InstituteInformationService {
  constructor(
    @InjectRepository(InstitutoInformacion)
    private readonly repo: Repository<InstitutoInformacion>,
  ) {}

  private async findOrThrow(): Promise<InstitutoInformacion> {
    const row = await this.repo.findOne({
      where: { id: INSTITUTO_INFORMACION_ID },
    });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async get(): Promise<InstitutoInformacionResponse> {
    return toInstitutoInformacionResponse(await this.findOrThrow());
  }

  async update(
    dto: UpdateInstitutoInformacionDto,
    actor: Usuario,
  ): Promise<InstitutoInformacionResponse> {
    await this.findOrThrow();

    const changes: Partial<InstitutoInformacion> = {
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    if (dto.name !== undefined) changes.name = dto.name;
    if (dto.description !== undefined) changes.description = dto.description;
    if (dto.contactEmail !== undefined) changes.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) changes.contactPhone = dto.contactPhone;

    await this.repo.update(INSTITUTO_INFORMACION_ID, changes);
    return this.get();
  }
}

import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildPage, type Paginated } from '../../../common/pagination';
import type { Usuario } from '../../users/entities/usuario.entity';
import {
  toCapacitacionResponse,
  type CapacitacionResponse,
} from './capacitacion.response';
import {
  CreateCapacitacionDto,
  ListCapacitacionQueryDto,
  UpdateCapacitacionDto,
} from './dto/capacitacion.dto';
import { Capacitacion } from './entities/capacitacion.entity';

const NOT_FOUND = { detail: 'No encontrado.' };

/** CRUD de `institutos_capacitacion` (Tarea 4.1) — mismo patron canonico que Articulos. */
@Injectable()
export class TrainingsService {
  constructor(
    @InjectRepository(Capacitacion)
    private readonly repo: Repository<Capacitacion>,
  ) {}

  async list(
    query: ListCapacitacionQueryDto,
  ): Promise<Paginated<CapacitacionResponse>> {
    const qb = this.repo
      .createQueryBuilder('c')
      .orderBy('c.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.take);

    if (query.name) {
      qb.andWhere('c.name ILIKE :name', { name: `%${query.name}%` });
    }
    if (query.modality) {
      qb.andWhere('c.modality = :modality', { modality: query.modality });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('c.isActive = :isActive', { isActive: query.isActive });
    }

    const [rows, total] = await qb.getManyAndCount();
    return buildPage(rows.map(toCapacitacionResponse), total, query);
  }

  async findOr404(id: string): Promise<Capacitacion> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  private async findActiveOr404(id: string): Promise<Capacitacion> {
    const row = await this.repo.findOne({ where: { id, isActive: true } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async detail(id: string): Promise<CapacitacionResponse> {
    return toCapacitacionResponse(await this.findOr404(id));
  }

  async create(
    dto: CreateCapacitacionDto,
    actor: Usuario,
  ): Promise<CapacitacionResponse> {
    const id = randomUUID();
    const now = new Date();
    await this.repo.insert({
      id,
      name: dto.name,
      description: dto.description,
      modality: dto.modality,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: actor.id,
    });
    return this.detail(id);
  }

  async update(
    id: string,
    dto: UpdateCapacitacionDto,
    actor: Usuario,
  ): Promise<CapacitacionResponse> {
    await this.findActiveOr404(id);

    const changes: Partial<Capacitacion> = {
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    if (dto.name !== undefined) changes.name = dto.name;
    if (dto.description !== undefined) changes.description = dto.description;
    if (dto.modality !== undefined) changes.modality = dto.modality;

    await this.repo.update(id, changes);
    return this.detail(id);
  }

  async softDelete(id: string, actor: Usuario): Promise<void> {
    await this.findActiveOr404(id);
    await this.repo.update(id, {
      isActive: false,
      deletedAt: new Date(),
      deletedById: actor.id,
      updatedAt: new Date(),
    });
  }

  async activate(id: string, actor: Usuario): Promise<{ detail: string }> {
    const row = await this.repo.findOne({ where: { id, isActive: false } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    await this.repo.update(id, {
      isActive: true,
      deletedAt: null,
      deletedById: null,
      updatedById: actor.id,
      updatedAt: new Date(),
    });
    return { detail: 'Capacitación habilitada correctamente.' };
  }
}

import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildPage, type Paginated } from '../../../common/pagination';
import type { Usuario } from '../../users/entities/usuario.entity';
import {
  CreatePreguntaFrecuenteDto,
  ListPreguntaFrecuenteQueryDto,
  UpdatePreguntaFrecuenteDto,
} from './dto/pregunta-frecuente.dto';
import { PreguntaFrecuente } from './entities/pregunta-frecuente.entity';
import {
  toPreguntaFrecuenteResponse,
  type PreguntaFrecuenteResponse,
} from './pregunta-frecuente.response';

const NOT_FOUND = { detail: 'No encontrado.' };

/**
 * CRUD de `isma_pregunta_frecuente` (Tarea 7.1) — mismo patron canonico que Articulos,
 * pero ordenado por `order` en vez de `createdAt`.
 */
@Injectable()
export class FaqService {
  constructor(
    @InjectRepository(PreguntaFrecuente)
    private readonly repo: Repository<PreguntaFrecuente>,
  ) {}

  async list(
    query: ListPreguntaFrecuenteQueryDto,
  ): Promise<Paginated<PreguntaFrecuenteResponse>> {
    const qb = this.repo
      .createQueryBuilder('p')
      .orderBy('p.order', 'ASC')
      .skip(query.skip)
      .take(query.take);

    if (query.isActive !== undefined) {
      qb.andWhere('p.isActive = :isActive', { isActive: query.isActive });
    }

    const [rows, total] = await qb.getManyAndCount();
    return buildPage(rows.map(toPreguntaFrecuenteResponse), total, query);
  }

  async findOr404(id: string): Promise<PreguntaFrecuente> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  private async findActiveOr404(id: string): Promise<PreguntaFrecuente> {
    const row = await this.repo.findOne({ where: { id, isActive: true } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async detail(id: string): Promise<PreguntaFrecuenteResponse> {
    return toPreguntaFrecuenteResponse(await this.findOr404(id));
  }

  async create(
    dto: CreatePreguntaFrecuenteDto,
    actor: Usuario,
  ): Promise<PreguntaFrecuenteResponse> {
    const id = randomUUID();
    const now = new Date();
    await this.repo.insert({
      id,
      question: dto.question,
      answer: dto.answer,
      order: dto.order,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: actor.id,
    });
    return this.detail(id);
  }

  async update(
    id: string,
    dto: UpdatePreguntaFrecuenteDto,
    actor: Usuario,
  ): Promise<PreguntaFrecuenteResponse> {
    await this.findActiveOr404(id);

    const changes: Partial<PreguntaFrecuente> = {
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    if (dto.question !== undefined) changes.question = dto.question;
    if (dto.answer !== undefined) changes.answer = dto.answer;
    if (dto.order !== undefined) changes.order = dto.order;

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
    return { detail: 'Pregunta frecuente habilitada correctamente.' };
  }
}

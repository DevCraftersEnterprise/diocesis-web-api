import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { applyTagFilter, parseTags } from '../../common/content';
import type { ListTaggedContentQueryDto } from '../../common/content';
import { buildPage, type Paginated } from '../../common/pagination';
import type { Usuario } from '../users/entities/usuario.entity';
import { toArticuloResponse, type ArticuloResponse } from './articulo.response';
import { CreateArticuloDto, UpdateArticuloDto } from './dto/articulo.dto';
import { Articulo } from './entities/articulo.entity';

const NOT_FOUND = { detail: 'No encontrado.' };

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Articulo) private readonly repo: Repository<Articulo>,
  ) {}

  /** `GET /articulos/` — paginado siempre, orden `-createdAt`. */
  async list(
    query: ListTaggedContentQueryDto,
  ): Promise<Paginated<ArticuloResponse>> {
    const qb = this.repo
      .createQueryBuilder('a')
      .orderBy('a.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.take);

    if (query.title) {
      qb.andWhere('a.title ILIKE :title', { title: `%${query.title}%` });
    }
    if (query.tags?.trim()) {
      applyTagFilter(qb, 'a', query.tags);
    }
    if (query.isActive !== undefined) {
      qb.andWhere('a.isActive = :isActive', { isActive: query.isActive });
    }

    const [rows, total] = await qb.getManyAndCount();
    return buildPage(rows.map(toArticuloResponse), total, query);
  }

  /** Detalle: sin filtro `isActive` (Django `get_object_or_404(pk)`). */
  async findOr404(id: string): Promise<Articulo> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  private async findActiveOr404(id: string): Promise<Articulo> {
    const row = await this.repo.findOne({ where: { id, isActive: true } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async detail(id: string): Promise<ArticuloResponse> {
    return toArticuloResponse(await this.findOr404(id));
  }

  async create(
    dto: CreateArticuloDto,
    actor: Usuario,
  ): Promise<ArticuloResponse> {
    const id = randomUUID();
    const now = new Date();
    await this.repo.insert({
      id,
      title: dto.title,
      content: dto.content,
      tags: parseTags(dto.tags),
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: actor.id,
    });
    return this.detail(id);
  }

  async update(
    id: string,
    dto: UpdateArticuloDto,
    actor: Usuario,
  ): Promise<ArticuloResponse> {
    await this.findActiveOr404(id);

    const changes: Partial<Articulo> = {
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    if (dto.title !== undefined) changes.title = dto.title;
    if (dto.content !== undefined) changes.content = dto.content;
    if (dto.tags !== undefined) changes.tags = parseTags(dto.tags);

    await this.repo.update(id, changes);
    return this.detail(id);
  }

  /** Soft-delete canonico: `isActive=false` + `deletedAt` + `deletedBy` (BUG-DJANGO-013). */
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
    return { detail: 'Artículo habilitado correctamente.' };
  }
}

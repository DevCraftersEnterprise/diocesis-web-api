import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { applyTagFilter, parseTags } from '../../common/content';
import type { ListTaggedContentQueryDto } from '../../common/content';
import {
  assertValidImage,
  type UploadedImage,
} from '../../common/files/image-file.validator';
import { buildPage, type Paginated } from '../../common/pagination';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import type { Usuario } from '../users/entities/usuario.entity';
import { CreateNoticiaDto, UpdateNoticiaDto } from './dto/noticia.dto';
import { Noticia } from './entities/noticia.entity';
import { toNoticiaResponse, type NoticiaResponse } from './noticia.response';

const NOT_FOUND = { detail: 'No encontrado.' };

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(Noticia)
    private readonly repo: Repository<Noticia>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** `GET /noticias/` — paginado siempre, orden `-createdAt`. */
  async list(
    query: ListTaggedContentQueryDto,
  ): Promise<Paginated<NoticiaResponse>> {
    const qb = this.repo
      .createQueryBuilder('n')
      .orderBy('n.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.take);

    if (query.title) {
      qb.andWhere('n.title ILIKE :title', { title: `%${query.title}%` });
    }
    if (query.tags?.trim()) {
      applyTagFilter(qb, 'n', query.tags);
    }
    if (query.isActive !== undefined) {
      qb.andWhere('n.isActive = :isActive', { isActive: query.isActive });
    }

    const [rows, total] = await qb.getManyAndCount();
    return buildPage(rows.map(toNoticiaResponse), total, query);
  }

  /** Detalle: sin filtro `isActive` (Django `get_object_or_404(pk)`). */
  async findOr404(id: string): Promise<Noticia> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  private async findActiveOr404(id: string): Promise<Noticia> {
    const row = await this.repo.findOne({ where: { id, isActive: true } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async detail(id: string): Promise<NoticiaResponse> {
    return toNoticiaResponse(await this.findOr404(id));
  }

  private async uploadPicture(file: UploadedImage): Promise<string> {
    assertValidImage(file, 'picture');
    const { secureUrl } = await this.cloudinary.upload(file.buffer, {
      folder: 'noticias',
    });
    return secureUrl;
  }

  async create(
    dto: CreateNoticiaDto,
    picture: UploadedImage | undefined,
    actor: Usuario,
  ): Promise<NoticiaResponse> {
    const id = randomUUID();
    const now = new Date();
    await this.repo.insert({
      id,
      title: dto.title,
      content: dto.content,
      tags: parseTags(dto.tags),
      picture: picture ? await this.uploadPicture(picture) : null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: actor.id,
    });
    return this.detail(id);
  }

  async update(
    id: string,
    dto: UpdateNoticiaDto,
    picture: UploadedImage | undefined,
    actor: Usuario,
  ): Promise<NoticiaResponse> {
    await this.findActiveOr404(id);

    const changes: Partial<Noticia> = {
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    if (dto.title !== undefined) changes.title = dto.title;
    if (dto.content !== undefined) changes.content = dto.content;
    if (dto.tags !== undefined) changes.tags = parseTags(dto.tags);
    if (picture) changes.picture = await this.uploadPicture(picture);

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
    return { detail: 'Noticia habilitada correctamente.' };
  }
}

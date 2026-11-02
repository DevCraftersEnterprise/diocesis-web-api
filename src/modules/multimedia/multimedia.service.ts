import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Usuario } from '../users/entities/usuario.entity';
import {
  CreateEnlaceMultimediaDto,
  ReorderEnlacesMultimediaDto,
  UpdateEnlaceMultimediaDto,
} from './dto/enlace-multimedia.dto';
import { EnlaceMultimedia } from './entities/enlace-multimedia.entity';
import {
  toEnlaceMultimediaResponse,
  type EnlaceMultimediaResponse,
} from './enlace-multimedia.response';

const NOT_FOUND = { detail: 'No encontrado.' };

@Injectable()
export class MultimediaService {
  constructor(
    @InjectRepository(EnlaceMultimedia)
    private readonly repo: Repository<EnlaceMultimedia>,
  ) {}

  /** `GET /multimedia/` — publico, solo activos, ordenados por `order`. Admin pide
   * `?all=true` para ver tambien los inactivos (gestion). */
  async list(all = false): Promise<EnlaceMultimediaResponse[]> {
    const rows = await this.repo.find({
      where: all ? {} : { isActive: true },
      order: { order: 'ASC' },
    });
    return rows.map(toEnlaceMultimediaResponse);
  }

  async findOr404(id: string): Promise<EnlaceMultimedia> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  private async findActiveOr404(id: string): Promise<EnlaceMultimedia> {
    const row = await this.repo.findOne({ where: { id, isActive: true } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async detail(id: string): Promise<EnlaceMultimediaResponse> {
    return toEnlaceMultimediaResponse(await this.findOr404(id));
  }

  async create(
    dto: CreateEnlaceMultimediaDto,
    actor: Usuario,
  ): Promise<EnlaceMultimediaResponse> {
    const id = randomUUID();
    const now = new Date();
    const current = await this.repo.find();
    const nextOrder =
      current.length === 0 ? 0 : Math.max(...current.map((e) => e.order)) + 1;

    await this.repo.insert({
      id,
      title: dto.title,
      description: dto.description,
      url: dto.url,
      order: nextOrder,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: actor.id,
    });
    return this.detail(id);
  }

  async update(
    id: string,
    dto: UpdateEnlaceMultimediaDto,
    actor: Usuario,
  ): Promise<EnlaceMultimediaResponse> {
    await this.findActiveOr404(id);

    const changes: Partial<EnlaceMultimedia> = {
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    if (dto.title !== undefined) changes.title = dto.title;
    if (dto.description !== undefined) changes.description = dto.description;
    if (dto.url !== undefined) changes.url = dto.url;

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
    return { detail: 'Enlace habilitado correctamente.' };
  }

  /** `order` debe traer exactamente los ids activos actuales (sin importar el orden
   * en que vengan), igual criterio que la galeria de PaginaContenido. */
  async reorder(
    dto: ReorderEnlacesMultimediaDto,
  ): Promise<EnlaceMultimediaResponse[]> {
    const current = await this.repo.find({ where: { isActive: true } });
    const currentIds = new Set(current.map((e) => e.id));
    const newIds = new Set(dto.order);

    if (
      dto.order.length !== current.length ||
      currentIds.size !== newIds.size ||
      ![...currentIds].every((id) => newIds.has(id))
    ) {
      throw new BadRequestException({
        order: ['Debe incluir exactamente los enlaces activos actuales.'],
      });
    }

    await Promise.all(
      dto.order.map((id, index) => this.repo.update(id, { order: index })),
    );
    return this.list();
  }
}

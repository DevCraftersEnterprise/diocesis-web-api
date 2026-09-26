import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildPage, type Paginated } from '../../../common/pagination';
import type { Usuario } from '../../users/entities/usuario.entity';
import {
  toCasoEspecialResponse,
  type CasoEspecialResponse,
} from './caso-especial.response';
import {
  CreateCasoEspecialDto,
  ListCasoEspecialQueryDto,
  UpdateCasoEspecialDto,
} from './dto/caso-especial.dto';
import { CasoEspecial } from './entities/caso-especial.entity';

const NOT_FOUND = { detail: 'No encontrado.' };

/**
 * CRUD de `isma_caso_especial` (Tarea 7.1) — mismo patron canonico que Articulos, pero
 * ordenado por `order` (numeracion del documento fuente) en vez de `createdAt`.
 */
@Injectable()
export class SpecialCasesService {
  constructor(
    @InjectRepository(CasoEspecial)
    private readonly repo: Repository<CasoEspecial>,
  ) {}

  async list(
    query: ListCasoEspecialQueryDto,
  ): Promise<Paginated<CasoEspecialResponse>> {
    const qb = this.repo
      .createQueryBuilder('c')
      .orderBy('c.order', 'ASC')
      .skip(query.skip)
      .take(query.take);

    if (query.title) {
      qb.andWhere('c.title ILIKE :title', { title: `%${query.title}%` });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('c.isActive = :isActive', { isActive: query.isActive });
    }

    const [rows, total] = await qb.getManyAndCount();
    return buildPage(rows.map(toCasoEspecialResponse), total, query);
  }

  async findOr404(id: string): Promise<CasoEspecial> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  private async findActiveOr404(id: string): Promise<CasoEspecial> {
    const row = await this.repo.findOne({ where: { id, isActive: true } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async detail(id: string): Promise<CasoEspecialResponse> {
    return toCasoEspecialResponse(await this.findOr404(id));
  }

  async create(
    dto: CreateCasoEspecialDto,
    actor: Usuario,
  ): Promise<CasoEspecialResponse> {
    const id = randomUUID();
    const now = new Date();
    await this.repo.insert({
      id,
      title: dto.title,
      order: dto.order,
      requisitosAdicionales: dto.requisitosAdicionales,
      documentosAdicionales: dto.documentosAdicionales ?? null,
      excepciones: dto.excepciones ?? null,
      contacto: dto.contacto ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: actor.id,
    });
    return this.detail(id);
  }

  async update(
    id: string,
    dto: UpdateCasoEspecialDto,
    actor: Usuario,
  ): Promise<CasoEspecialResponse> {
    await this.findActiveOr404(id);

    const changes: Partial<CasoEspecial> = {
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    if (dto.title !== undefined) changes.title = dto.title;
    if (dto.order !== undefined) changes.order = dto.order;
    if (dto.requisitosAdicionales !== undefined) {
      changes.requisitosAdicionales = dto.requisitosAdicionales;
    }
    if (dto.documentosAdicionales !== undefined) {
      changes.documentosAdicionales = dto.documentosAdicionales;
    }
    if (dto.excepciones !== undefined) changes.excepciones = dto.excepciones;
    if (dto.contacto !== undefined) changes.contacto = dto.contacto;

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
    return { detail: 'Caso especial habilitado correctamente.' };
  }
}

import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { parse } from 'csv-parse/sync';
import { Repository } from 'typeorm';
import { buildPage, type Paginated } from '../../common/pagination';
import type { Usuario } from '../users/entities/usuario.entity';
import { toDecanatoResponse, type DecanatoResponse } from './decanato.response';
import {
  CreateDecanatoDto,
  ListDecanatoQueryDto,
  UpdateDecanatoDto,
} from './dto/decanato.dto';
import { Decanato } from './entities/decanato.entity';

const NOT_FOUND = { detail: 'No encontrado.' };

export interface CatalogCsvResult {
  creados: string[];
  errores: Record<string, unknown>[];
}

@Injectable()
export class DecanatesService {
  constructor(
    @InjectRepository(Decanato) private readonly repo: Repository<Decanato>,
  ) {}

  /** `GET /decanatos/` — paginado siempre, orden `-createdAt` (BUG-DJANGO-024: se pagina bien). */
  async list(
    query: ListDecanatoQueryDto,
  ): Promise<Paginated<DecanatoResponse>> {
    const qb = this.repo
      .createQueryBuilder('d')
      .orderBy('d.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.take);

    if (query.name) {
      qb.andWhere('d.name ILIKE :pattern', { pattern: `%${query.name}%` });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('d.isActive = :isActive', { isActive: query.isActive });
    }

    const [rows, total] = await qb.getManyAndCount();
    return buildPage(rows.map(toDecanatoResponse), total, query);
  }

  /** Detalle: devuelve la fila **aunque este soft-deleted** (BUG-DJANGO-022). */
  async findOr404(id: string): Promise<Decanato> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  /** Para PUT/DELETE: exige que este activo (404 si borrado -> hay que `habilitar` antes). */
  private async findActiveOr404(id: string): Promise<Decanato> {
    const row = await this.repo.findOne({ where: { id, isActive: true } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async detail(id: string): Promise<DecanatoResponse> {
    return toDecanatoResponse(await this.findOr404(id));
  }

  /** `createdBy` desde el actor, nunca del body (BUG-DJANGO-007). */
  async create(
    dto: CreateDecanatoDto,
    actor: Usuario,
  ): Promise<DecanatoResponse> {
    const id = randomUUID();
    const now = new Date();
    await this.repo.insert({
      id,
      name: dto.name,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: actor.id,
    });
    return this.detail(id);
  }

  async update(
    id: string,
    dto: UpdateDecanatoDto,
    actor: Usuario,
  ): Promise<DecanatoResponse> {
    await this.findActiveOr404(id);
    await this.repo.update(id, {
      ...dto,
      updatedById: actor.id,
      updatedAt: new Date(),
    });
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

  /** `POST /decanatos/habilitar/{id}/` — 404 si ya esta activo o no existe (como Django). */
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
    return { detail: 'Decanato habilitado correctamente.' };
  }

  /** `POST /decanatos/cargar-csv/` — cabecera `name`. Sin uso por el FE. */
  async createFromCsv(csv: Buffer, actor: Usuario): Promise<CatalogCsvResult> {
    let rows: Record<string, string>[];
    try {
      rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
    } catch {
      throw new BadRequestException({
        error: 'El archivo CSV no se pudo leer.',
      });
    }

    const creados: string[] = [];
    const errores: Record<string, unknown>[] = [];
    const now = new Date();

    for (const row of rows) {
      const name = row.name?.trim();
      if (!name) {
        errores.push({ [name ?? '']: { name: ['Este campo es requerido.'] } });
        continue;
      }
      await this.repo.insert({
        id: randomUUID(),
        name,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdById: actor.id,
      });
      creados.push(name);
    }

    return { creados, errores };
  }
}

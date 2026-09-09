import { randomUUID } from 'node:crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import type { FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { buildPage, type Paginated } from '../pagination';
import type { Usuario } from '../../modules/users/entities/usuario.entity';
import type {
  CreateCatalogNameDto,
  ListCatalogQueryDto,
  UpdateCatalogNameDto,
} from './catalog.dto';
import { toCatalogNameResponse } from './catalog.response';
import type {
  CatalogCsvResult,
  CatalogNameEntity,
  CatalogNameResponse,
} from './catalog.types';

const NOT_FOUND = { detail: 'No encontrado.' };

export interface CatalogServiceOptions {
  /** Alias del QueryBuilder (p. ej. `d`, `c`). */
  alias: string;
  /** Cuerpo exacto (texto de Django) de `POST /<catalogo>/habilitar/{id}/`. */
  activateMessage: string;
}

/**
 * CRUD compartido de los catalogos "solo nombre" (decanatos, colonias, ...).
 * Politica canonica de soft-delete de FASE 3 (findings BUG-DJANGO-012):
 *  - `detail()` NUNCA filtra `isActive` (BUG-DJANGO-022).
 *  - `update()` / `softDelete()` exigen fila activa (404 si borrada -> `habilitar` antes).
 *  - `softDelete()` fija `isActive=false` + `deletedAt` + `deletedBy` (BUG-DJANGO-013).
 *  - `activate()` limpia `deletedAt` / `deletedBy`.
 *  - `createdBy` / `updatedBy` desde el actor, nunca del body (BUG-DJANGO-007).
 */
export abstract class CatalogService<
  E extends CatalogNameEntity & ObjectLiteral,
> {
  protected constructor(
    protected readonly repo: Repository<E>,
    protected readonly options: CatalogServiceOptions,
  ) {}

  private patch(data: Partial<CatalogNameEntity>): QueryDeepPartialEntity<E> {
    return data as QueryDeepPartialEntity<E>;
  }

  private byId(where: Partial<CatalogNameEntity>): FindOptionsWhere<E> {
    return where as FindOptionsWhere<E>;
  }

  async list(
    query: ListCatalogQueryDto,
  ): Promise<Paginated<CatalogNameResponse>> {
    const a = this.options.alias;
    const qb = this.repo
      .createQueryBuilder(a)
      .orderBy(`${a}.createdAt`, 'DESC')
      .skip(query.skip)
      .take(query.take);

    if (query.name) {
      qb.andWhere(`${a}.name ILIKE :pattern`, { pattern: `%${query.name}%` });
    }
    if (query.isActive !== undefined) {
      qb.andWhere(`${a}.isActive = :isActive`, { isActive: query.isActive });
    }

    const [rows, total] = await qb.getManyAndCount();
    return buildPage(
      rows.map((r) => toCatalogNameResponse(r)),
      total,
      query,
    );
  }

  /** Devuelve la fila aunque este soft-deleted (BUG-DJANGO-022). */
  async findOr404(id: string): Promise<E> {
    const row = await this.repo.findOne({ where: this.byId({ id }) });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  protected async findActiveOr404(id: string): Promise<E> {
    const row = await this.repo.findOne({
      where: this.byId({ id, isActive: true }),
    });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async detail(id: string): Promise<CatalogNameResponse> {
    return toCatalogNameResponse(await this.findOr404(id));
  }

  async create(
    dto: CreateCatalogNameDto,
    actor: Usuario,
  ): Promise<CatalogNameResponse> {
    const id = randomUUID();
    const now = new Date();
    await this.repo.insert(
      this.patch({
        id,
        name: dto.name,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdById: actor.id,
      }),
    );
    return this.detail(id);
  }

  async update(
    id: string,
    dto: UpdateCatalogNameDto,
    actor: Usuario,
  ): Promise<CatalogNameResponse> {
    await this.findActiveOr404(id);
    await this.repo.update(
      id,
      this.patch({
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        updatedById: actor.id,
        updatedAt: new Date(),
      }),
    );
    return this.detail(id);
  }

  async softDelete(id: string, actor: Usuario): Promise<void> {
    await this.findActiveOr404(id);
    await this.repo.update(
      id,
      this.patch({
        isActive: false,
        deletedAt: new Date(),
        deletedById: actor.id,
        updatedAt: new Date(),
      }),
    );
  }

  /** 404 si ya esta activo o no existe (como `get_object_or_404(pk, isActive=False)`). */
  async activate(id: string, actor: Usuario): Promise<{ detail: string }> {
    const row = await this.repo.findOne({
      where: this.byId({ id, isActive: false }),
    });
    if (!row) throw new NotFoundException(NOT_FOUND);
    await this.repo.update(
      id,
      this.patch({
        isActive: true,
        deletedAt: null,
        deletedById: null,
        updatedById: actor.id,
        updatedAt: new Date(),
      }),
    );
    return { detail: this.options.activateMessage };
  }

  /** `POST /<catalogo>/cargar-csv/` — cabecera `name`. Sin uso por el FE. */
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
      await this.repo.insert(
        this.patch({
          id: randomUUID(),
          name,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          createdById: actor.id,
        }),
      );
      creados.push(name);
    }

    return { creados, errores };
  }
}

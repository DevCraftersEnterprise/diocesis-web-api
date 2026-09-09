import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { parse } from 'csv-parse/sync';
import { Repository } from 'typeorm';
import {
  assertValidImage,
  type UploadedImage,
} from '../../common/files/image-file.validator';
import { buildPage, type Paginated } from '../../common/pagination';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import { Colonia } from '../colonies/entities/colonia.entity';
import { Decanato } from '../decanates/entities/decanato.entity';
import { Padre } from '../reverends/entities/padre.entity';
import type { Usuario } from '../users/entities/usuario.entity';
import {
  CreateParroquiaDto,
  ListParroquiaQueryDto,
  UpdateParroquiaDto,
} from './dto/parroquia.dto';
import { Parroquia } from './entities/parroquia.entity';
import {
  toParroquiaResponse,
  type ParroquiaResponse,
} from './parroquia.response';

const NOT_FOUND = { detail: 'No encontrado.' };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ParroquiaCsvResult {
  creados: string[];
  errores: Record<string, unknown>[];
}

@Injectable()
export class ParishesService {
  constructor(
    @InjectRepository(Parroquia)
    private readonly repo: Repository<Parroquia>,
    @InjectRepository(Decanato)
    private readonly decanatos: Repository<Decanato>,
    @InjectRepository(Colonia)
    private readonly colonias: Repository<Colonia>,
    @InjectRepository(Padre)
    private readonly padres: Repository<Padre>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** `GET /parroquias/` — paginado siempre, orden `-createdAt`. */
  async list(
    query: ListParroquiaQueryDto,
  ): Promise<Paginated<ParroquiaResponse>> {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoin('p.colonia', 'col')
      .orderBy('p.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.take);

    if (query.name) {
      qb.andWhere('p.name ILIKE :name', { name: `%${query.name}%` });
    }
    if (query.town) {
      qb.andWhere('p.town ILIKE :town', { town: `%${query.town}%` });
    }
    if (query.colonia) {
      // BUG-DJANGO-003: Django filtraba por `coloniaId__nombre` (inexistente).
      qb.andWhere('col.name ILIKE :colonia', { colonia: `%${query.colonia}%` });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('p.isActive = :isActive', { isActive: query.isActive });
    }

    const [rows, total] = await qb.getManyAndCount();
    return buildPage(rows.map(toParroquiaResponse), total, query);
  }

  /** Detalle: sin filtro `isActive` (Django `get_object_or_404(pk)`). */
  async findOr404(id: string): Promise<Parroquia> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  private async findActiveOr404(id: string): Promise<Parroquia> {
    const row = await this.repo.findOne({ where: { id, isActive: true } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async detail(id: string): Promise<ParroquiaResponse> {
    return toParroquiaResponse(await this.findOr404(id));
  }

  /**
   * Valida que las FK a catalogo existan (Django lo hace via `PrimaryKeyRelatedField`).
   * Sin esto, un UUID valido pero inexistente daria 500 por violacion de FK.
   */
  private async assertFksExist(dto: {
    decanatoId?: string;
    coloniaId?: string;
    padreId?: string;
  }): Promise<void> {
    const errors: Record<string, string[]> = {};
    if (
      dto.decanatoId !== undefined &&
      !(await this.decanatos.existsBy({ id: dto.decanatoId }))
    ) {
      errors.decanatoId = ['No existe un decanato con ese id.'];
    }
    if (
      dto.coloniaId !== undefined &&
      !(await this.colonias.existsBy({ id: dto.coloniaId }))
    ) {
      errors.coloniaId = ['No existe una colonia con ese id.'];
    }
    if (
      dto.padreId !== undefined &&
      !(await this.padres.existsBy({ id: dto.padreId }))
    ) {
      errors.padreId = ['No existe un padre con ese id.'];
    }
    if (Object.keys(errors).length > 0) {
      throw new BadRequestException(errors);
    }
  }

  private async uploadPicture(file: UploadedImage): Promise<string> {
    assertValidImage(file, 'picture');
    const { secureUrl } = await this.cloudinary.upload(file.buffer, {
      folder: 'parroquia',
    });
    return secureUrl;
  }

  async create(
    dto: CreateParroquiaDto,
    picture: UploadedImage | undefined,
    actor: Usuario,
  ): Promise<ParroquiaResponse> {
    await this.assertFksExist(dto);

    const id = randomUUID();
    const now = new Date();
    await this.repo.insert({
      id,
      name: dto.name,
      openingDate: dto.openingDate,
      address: dto.address,
      zipCode: dto.zipCode,
      town: dto.town,
      decanatoId: dto.decanatoId,
      coloniaId: dto.coloniaId,
      padreId: dto.padreId,
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
    dto: UpdateParroquiaDto,
    picture: UploadedImage | undefined,
    actor: Usuario,
  ): Promise<ParroquiaResponse> {
    await this.findActiveOr404(id);
    await this.assertFksExist(dto);

    const changes: Partial<Parroquia> = {
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    for (const key of [
      'name',
      'openingDate',
      'address',
      'zipCode',
      'town',
      'decanatoId',
      'coloniaId',
      'padreId',
    ] as const) {
      if (dto[key] !== undefined) changes[key] = dto[key];
    }
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
    return { detail: 'Parroquia habilitada correctamente.' };
  }

  /** `POST /parroquias/cargar-csv/` (sin "por" en prod). Sin uso por el FE. */
  async createFromCsv(
    csv: Buffer,
    actor: Usuario,
  ): Promise<ParroquiaCsvResult> {
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
      const fieldErrors: Record<string, string[]> = {};
      const req = {
        openingDate: row.openingDate?.trim(),
        address: row.address?.trim(),
        zipCode: row.zipCode?.trim(),
        town: row.town?.trim(),
        decanatoId: row.decanatoId?.trim(),
        coloniaId: row.coloniaId?.trim(),
        padreId: row.padreId?.trim(),
      };

      if (!name) fieldErrors.name = ['Este campo es requerido.'];
      if (!req.openingDate || !DATE_RE.test(req.openingDate)) {
        fieldErrors.openingDate = ['Fecha invalida (YYYY-MM-DD).'];
      }
      for (const k of ['address', 'zipCode', 'town'] as const) {
        if (!req[k]) fieldErrors[k] = ['Este campo es requerido.'];
      }
      for (const k of ['decanatoId', 'coloniaId', 'padreId'] as const) {
        if (!req[k] || !UUID_RE.test(req[k])) {
          fieldErrors[k] = ['UUID requerido.'];
        }
      }
      if (Object.keys(fieldErrors).length === 0) {
        try {
          await this.assertFksExist(req);
        } catch (e) {
          errores.push({
            [name ?? '']: (e as BadRequestException).getResponse(),
          });
          continue;
        }
      }
      if (Object.keys(fieldErrors).length > 0) {
        errores.push({ [name ?? '']: fieldErrors });
        continue;
      }

      await this.repo.insert({
        id: randomUUID(),
        name,
        openingDate: req.openingDate,
        address: req.address,
        zipCode: req.zipCode,
        town: req.town,
        decanatoId: req.decanatoId,
        coloniaId: req.coloniaId,
        padreId: req.padreId,
        picture: null,
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

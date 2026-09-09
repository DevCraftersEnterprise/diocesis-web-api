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
import type { Usuario } from '../users/entities/usuario.entity';
import {
  CreatePadreDto,
  ListPadresQueryDto,
  UpdatePadreDto,
} from './dto/padre.dto';
import { Padre } from './entities/padre.entity';
import { toPadreResponse, type PadreResponse } from './padre.response';

const NOT_FOUND = { detail: 'No encontrado.' };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface PadreCsvResult {
  creados: string[];
  errores: Record<string, unknown>[];
}

@Injectable()
export class PadresService {
  constructor(
    @InjectRepository(Padre) private readonly repo: Repository<Padre>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /**
   * `GET /padres/` — **forma dual** (APIC-003): con `page`/`page_size` -> objeto paginado;
   * sin ellos -> **array plano** (`getAllPadres` del FE depende de esto). Orden
   * `firstName, lastName`.
   */
  async list(
    query: ListPadresQueryDto,
    paginated: boolean,
  ): Promise<Paginated<PadreResponse> | PadreResponse[]> {
    const qb = this.repo
      .createQueryBuilder('p')
      .orderBy('p.firstName', 'ASC')
      .addOrderBy('p.lastName', 'ASC');

    if (query.isActive !== undefined) {
      qb.andWhere('p.isActive = :isActive', { isActive: query.isActive });
    }
    if (query.firstName) {
      qb.andWhere('p.firstName ILIKE :fn', { fn: `%${query.firstName}%` });
    }
    if (query.lastName) {
      qb.andWhere('p.lastName ILIKE :ln', { ln: `%${query.lastName}%` });
    }
    if (query.birthDay !== undefined) {
      qb.andWhere('EXTRACT(DAY FROM p.birthDate) = :bd', {
        bd: query.birthDay,
      });
    }
    if (query.birthMonth !== undefined) {
      qb.andWhere('EXTRACT(MONTH FROM p.birthDate) = :bm', {
        bm: query.birthMonth,
      });
    }

    if (!paginated) {
      const rows = await qb.getMany();
      return rows.map(toPadreResponse);
    }

    qb.skip(query.skip).take(query.take);
    const [rows, total] = await qb.getManyAndCount();
    return buildPage(rows.map(toPadreResponse), total, query);
  }

  /** Detalle: sin filtro `isActive` (Django tampoco lo tiene; politica canonica FASE 3). */
  async findOr404(id: string): Promise<Padre> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  private async findActiveOr404(id: string): Promise<Padre> {
    const row = await this.repo.findOne({ where: { id, isActive: true } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async detail(id: string): Promise<PadreResponse> {
    return toPadreResponse(await this.findOr404(id));
  }

  private async uploadPicture(file: UploadedImage): Promise<string> {
    assertValidImage(file, 'picture');
    const { secureUrl } = await this.cloudinary.upload(file.buffer, {
      folder: 'padres',
    });
    return secureUrl;
  }

  /** Django no fija `createdBy` ni `updatedBy` al crear (padres no tiene `createdBy`). */
  async create(
    dto: CreatePadreDto,
    picture: UploadedImage | undefined,
  ): Promise<PadreResponse> {
    const id = randomUUID();
    const now = new Date();
    await this.repo.insert({
      id,
      firstName: dto.firstName,
      lastName: dto.lastName,
      birthDate: dto.birthDate,
      email: dto.email ?? null,
      facebook: dto.facebook ?? null,
      instagram: dto.instagram ?? null,
      twitter: dto.twitter ?? null,
      picture: picture ? await this.uploadPicture(picture) : null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return this.detail(id);
  }

  async update(
    id: string,
    dto: UpdatePadreDto,
    picture: UploadedImage | undefined,
    actor: Usuario,
  ): Promise<PadreResponse> {
    await this.findActiveOr404(id);

    const changes: Partial<Padre> = {
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    for (const key of [
      'firstName',
      'lastName',
      'birthDate',
      'email',
      'facebook',
      'instagram',
      'twitter',
    ] as const) {
      if (dto[key] !== undefined) changes[key] = dto[key] as never;
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
    return { detail: 'Padre habilitado correctamente.' };
  }

  /** `POST /padres/cargar-por-csv/` (con "por"). Sin uso por el FE. */
  async createFromCsv(csv: Buffer): Promise<PadreCsvResult> {
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
      const firstName = row.firstName?.trim();
      const lastName = row.lastName?.trim();
      const birthDate = row.birthDate?.trim();
      const label = `${firstName ?? ''} ${lastName ?? ''}`.trim();
      const fieldErrors: Record<string, string[]> = {};

      if (!firstName) fieldErrors.firstName = ['Este campo es requerido.'];
      if (!lastName) fieldErrors.lastName = ['Este campo es requerido.'];
      if (!birthDate || !DATE_RE.test(birthDate)) {
        fieldErrors.birthDate = ['Fecha invalida (YYYY-MM-DD).'];
      }
      if (Object.keys(fieldErrors).length > 0) {
        errores.push({ [label]: fieldErrors });
        continue;
      }

      await this.repo.insert({
        id: randomUUID(),
        firstName,
        lastName,
        birthDate,
        email: row.email?.trim() || null,
        facebook: row.facebook?.trim() || null,
        instagram: row.instagram?.trim() || null,
        twitter: row.twitter?.trim() || null,
        picture: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      creados.push(label);
    }

    return { creados, errores };
  }
}

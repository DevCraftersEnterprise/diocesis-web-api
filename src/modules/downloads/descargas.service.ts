import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  assertValidDownloadFile,
  type UploadedDownloadFile,
} from '../../common/files/download-file.validator';
import { buildPage, type Paginated } from '../../common/pagination';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import type { Usuario } from '../users/entities/usuario.entity';
import {
  CreateDescargaDto,
  ListDescargaQueryDto,
  UpdateDescargaDto,
} from './dto/descarga.dto';
import { toDescargaResponse, type DescargaResponse } from './descarga.response';
import { Descarga } from './entities/descarga.entity';

const NOT_FOUND = { detail: 'No encontrado.' };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class DescargasService {
  constructor(
    @InjectRepository(Descarga) private readonly repo: Repository<Descarga>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** `GET /descargas/` — paginado, orden `-publishedAt`. */
  async list(
    query: ListDescargaQueryDto,
  ): Promise<Paginated<DescargaResponse>> {
    const qb = this.repo
      .createQueryBuilder('d')
      .orderBy('d.publishedAt', 'DESC')
      .addOrderBy('d.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.take);

    if (query.title) {
      qb.andWhere('d.title ILIKE :title', { title: `%${query.title}%` });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('d.isActive = :isActive', { isActive: query.isActive });
    }

    const [rows, total] = await qb.getManyAndCount();
    return buildPage(rows.map(toDescargaResponse), total, query);
  }

  async findOr404(id: string): Promise<Descarga> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  private async findActiveOr404(id: string): Promise<Descarga> {
    const row = await this.repo.findOne({ where: { id, isActive: true } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async detail(id: string): Promise<DescargaResponse> {
    return toDescargaResponse(await this.findOr404(id));
  }

  private async uploadFile(file: UploadedDownloadFile): Promise<{
    fileUrl: string;
    fileName: string;
    fileExtension: string;
    fileSizeBytes: number;
  }> {
    assertValidDownloadFile(file, 'file');
    const { secureUrl } = await this.cloudinary.upload(file.buffer, {
      folder: 'descargas',
      resourceType: 'raw',
    });
    return {
      fileUrl: secureUrl,
      fileName: file.originalname,
      fileExtension: (file.originalname.split('.').pop() ?? '').toLowerCase(),
      fileSizeBytes: file.size,
    };
  }

  async create(
    dto: CreateDescargaDto,
    file: UploadedDownloadFile | undefined,
    actor: Usuario,
  ): Promise<DescargaResponse> {
    if (!file) {
      throw new BadRequestException({ file: ['Este campo es requerido.'] });
    }

    const id = randomUUID();
    const now = new Date();
    const uploaded = await this.uploadFile(file);

    await this.repo.insert({
      id,
      title: dto.title,
      description: dto.description,
      publishedAt: dto.publishedAt ?? todayIso(),
      ...uploaded,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: actor.id,
    });
    return this.detail(id);
  }

  async update(
    id: string,
    dto: UpdateDescargaDto,
    file: UploadedDownloadFile | undefined,
    actor: Usuario,
  ): Promise<DescargaResponse> {
    await this.findActiveOr404(id);

    const changes: Partial<Descarga> = {
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    if (dto.title !== undefined) changes.title = dto.title;
    if (dto.description !== undefined) changes.description = dto.description;
    if (dto.publishedAt !== undefined) changes.publishedAt = dto.publishedAt;
    if (file) Object.assign(changes, await this.uploadFile(file));

    await this.repo.update(id, changes);
    return this.detail(id);
  }

  /** Soft-delete canonico: `isActive=false` + `deletedAt` + `deletedBy`. */
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
    return { detail: 'Descarga habilitada correctamente.' };
  }
}

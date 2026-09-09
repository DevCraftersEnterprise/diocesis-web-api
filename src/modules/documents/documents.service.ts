import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { applyTagFilter, parseTags } from '../../common/content';
import { assertValidDocument } from '../../common/files/document-file.validator';
import type { UploadedImage } from '../../common/files/image-file.validator';
import { buildPage, type Paginated } from '../../common/pagination';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import type { Usuario } from '../users/entities/usuario.entity';
import {
  CreateDocumentoDto,
  ListDocumentoQueryDto,
  UpdateDocumentoDto,
} from './dto/documento.dto';
import {
  toDocumentoResponse,
  type DocumentoResponse,
} from './documento.response';
import { Documento } from './entities/documento.entity';

const NOT_FOUND = { detail: 'No encontrado.' };

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Documento)
    private readonly repo: Repository<Documento>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** `GET /documentos/` — paginado siempre, orden `-createdAt`. */
  async list(
    query: ListDocumentoQueryDto,
  ): Promise<Paginated<DocumentoResponse>> {
    const qb = this.repo
      .createQueryBuilder('d')
      .orderBy('d.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.take);

    if (query.title) {
      qb.andWhere('d.title ILIKE :title', { title: `%${query.title}%` });
    }
    if (query.tags?.trim()) {
      applyTagFilter(qb, 'd', query.tags);
    }
    if (query.type) {
      // Django: `queryset.filter(type=tipo)` — exacto, sin validar el parametro.
      qb.andWhere('d.type = :type', { type: query.type });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('d.isActive = :isActive', { isActive: query.isActive });
    }

    const [rows, total] = await qb.getManyAndCount();
    return buildPage(rows.map(toDocumentoResponse), total, query);
  }

  /** Detalle: sin filtro `isActive` (Django `get_object_or_404(pk)`). */
  async findOr404(id: string): Promise<Documento> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  private async findActiveOr404(id: string): Promise<Documento> {
    const row = await this.repo.findOne({ where: { id, isActive: true } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async detail(id: string): Promise<DocumentoResponse> {
    return toDocumentoResponse(await this.findOr404(id));
  }

  private async uploadDocument(file: UploadedImage): Promise<string> {
    assertValidDocument(file, 'document');
    const { secureUrl } = await this.cloudinary.upload(file.buffer, {
      folder: 'documentos',
      resourceType: 'raw',
    });
    return secureUrl;
  }

  async create(
    dto: CreateDocumentoDto,
    document: UploadedImage | undefined,
    actor: Usuario,
  ): Promise<DocumentoResponse> {
    if (!document) {
      // Django: el serializer marca `document` (CloudinaryField no nulo) como requerido.
      throw new BadRequestException({
        document: ['Este campo es requerido.'],
      });
    }

    const id = randomUUID();
    const now = new Date();
    await this.repo.insert({
      id,
      title: dto.title,
      type: dto.type,
      tags: parseTags(dto.tags),
      document: await this.uploadDocument(document),
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: actor.id,
    });
    return this.detail(id);
  }

  async update(
    id: string,
    dto: UpdateDocumentoDto,
    document: UploadedImage | undefined,
    actor: Usuario,
  ): Promise<DocumentoResponse> {
    await this.findActiveOr404(id);

    const changes: Partial<Documento> = {
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    if (dto.title !== undefined) changes.title = dto.title;
    if (dto.type !== undefined) changes.type = dto.type;
    if (dto.tags !== undefined) changes.tags = parseTags(dto.tags);
    if (document) changes.document = await this.uploadDocument(document);

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
    return { detail: 'Documento habilitado correctamente.' };
  }
}

import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  assertValidImage,
  type UploadedImage,
} from '../../../common/files/image-file.validator';
import { buildPage, type Paginated } from '../../../common/pagination';
import { CloudinaryService } from '../../../integrations/cloudinary/cloudinary.service';
import type { Usuario } from '../../users/entities/usuario.entity';
import { Capacitacion } from '../trainings/entities/capacitacion.entity';
import { toCursoResponse, type CursoResponse } from './curso.response';
import {
  CreateCursoDto,
  ListCursoQueryDto,
  UpdateCursoDto,
} from './dto/curso.dto';
import { Curso } from './entities/curso.entity';

const NOT_FOUND = { detail: 'No encontrado.' };

/**
 * CRUD de `institutos_curso` (Tarea 4.1) — combina el patron de Articulos (soft-delete
 * canonico) con el de Parroquias (FK opcional validada + imagen).
 */
@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Curso)
    private readonly repo: Repository<Curso>,
    @InjectRepository(Capacitacion)
    private readonly capacitaciones: Repository<Capacitacion>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async list(query: ListCursoQueryDto): Promise<Paginated<CursoResponse>> {
    const qb = this.repo
      .createQueryBuilder('c')
      .orderBy('c.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.take);

    if (query.title) {
      qb.andWhere('c.title ILIKE :title', { title: `%${query.title}%` });
    }
    if (query.modality) {
      qb.andWhere('c.modality = :modality', { modality: query.modality });
    }
    if (query.capacitacionId) {
      qb.andWhere('c.capacitacionId = :capacitacionId', {
        capacitacionId: query.capacitacionId,
      });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('c.isActive = :isActive', { isActive: query.isActive });
    }

    const [rows, total] = await qb.getManyAndCount();
    return buildPage(rows.map(toCursoResponse), total, query);
  }

  async findOr404(id: string): Promise<Curso> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  private async findActiveOr404(id: string): Promise<Curso> {
    const row = await this.repo.findOne({ where: { id, isActive: true } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async detail(id: string): Promise<CursoResponse> {
    return toCursoResponse(await this.findOr404(id));
  }

  /** Valida que `capacitacionId`, si viene, exista — igual que `parishes.assertFksExist`. */
  private async assertCapacitacionExists(id?: string): Promise<void> {
    if (id === undefined) return;
    if (!(await this.capacitaciones.existsBy({ id }))) {
      throw new BadRequestException({
        capacitacionId: ['No existe una capacitación con ese id.'],
      });
    }
  }

  private async uploadPicture(file: UploadedImage): Promise<string> {
    assertValidImage(file, 'picture');
    const { secureUrl } = await this.cloudinary.upload(file.buffer, {
      folder: 'instituto-biblico/cursos',
    });
    return secureUrl;
  }

  async create(
    dto: CreateCursoDto,
    picture: UploadedImage | undefined,
    actor: Usuario,
  ): Promise<CursoResponse> {
    await this.assertCapacitacionExists(dto.capacitacionId);

    const id = randomUUID();
    const now = new Date();
    await this.repo.insert({
      id,
      title: dto.title,
      description: dto.description,
      modality: dto.modality,
      capacitacionId: dto.capacitacionId ?? null,
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
      meetingLink: dto.meetingLink ?? null,
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
    dto: UpdateCursoDto,
    picture: UploadedImage | undefined,
    actor: Usuario,
  ): Promise<CursoResponse> {
    await this.findActiveOr404(id);
    await this.assertCapacitacionExists(dto.capacitacionId);

    const changes: Partial<Curso> = {
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    if (dto.title !== undefined) changes.title = dto.title;
    if (dto.description !== undefined) changes.description = dto.description;
    if (dto.modality !== undefined) changes.modality = dto.modality;
    if (dto.capacitacionId !== undefined) {
      changes.capacitacionId = dto.capacitacionId;
    }
    if (dto.startDate !== undefined) changes.startDate = dto.startDate;
    if (dto.endDate !== undefined) changes.endDate = dto.endDate;
    if (dto.meetingLink !== undefined) changes.meetingLink = dto.meetingLink;
    if (picture) changes.picture = await this.uploadPicture(picture);

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
    return { detail: 'Curso habilitado correctamente.' };
  }
}

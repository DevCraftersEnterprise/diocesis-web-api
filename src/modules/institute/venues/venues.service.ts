import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  assertValidImage,
  type UploadedImage,
} from '../../../common/files/image-file.validator';
import { buildPage, type Paginated } from '../../../common/pagination';
import { CloudinaryService } from '../../../integrations/cloudinary/cloudinary.service';
import type { Usuario } from '../../users/entities/usuario.entity';
import { CreateSedeDto, ListSedeQueryDto, UpdateSedeDto } from './dto/sede.dto';
import { Sede } from './entities/sede.entity';
import { toSedeResponse, type SedeResponse } from './sede.response';

const NOT_FOUND = { detail: 'No encontrado.' };

/** CRUD de `institutos_sede` (Tarea 5.1) — mismo patron canonico que Articulos, con foto opcional. */
@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Sede)
    private readonly repo: Repository<Sede>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async list(query: ListSedeQueryDto): Promise<Paginated<SedeResponse>> {
    const qb = this.repo
      .createQueryBuilder('s')
      .orderBy('s.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.take);

    if (query.name) {
      qb.andWhere('s.name ILIKE :name', { name: `%${query.name}%` });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('s.isActive = :isActive', { isActive: query.isActive });
    }

    const [rows, total] = await qb.getManyAndCount();
    return buildPage(rows.map(toSedeResponse), total, query);
  }

  async findOr404(id: string): Promise<Sede> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  private async findActiveOr404(id: string): Promise<Sede> {
    const row = await this.repo.findOne({ where: { id, isActive: true } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async detail(id: string): Promise<SedeResponse> {
    return toSedeResponse(await this.findOr404(id));
  }

  private async uploadPicture(file: UploadedImage): Promise<string> {
    assertValidImage(file, 'picture');
    const { secureUrl } = await this.cloudinary.upload(file.buffer, {
      folder: 'instituto-biblico/sedes',
    });
    return secureUrl;
  }

  async create(
    dto: CreateSedeDto,
    picture: UploadedImage | undefined,
    actor: Usuario,
  ): Promise<SedeResponse> {
    const id = randomUUID();
    const now = new Date();
    await this.repo.insert({
      id,
      name: dto.name,
      address: dto.address,
      mapsUrl: dto.mapsUrl,
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
    dto: UpdateSedeDto,
    picture: UploadedImage | undefined,
    actor: Usuario,
  ): Promise<SedeResponse> {
    await this.findActiveOr404(id);

    const changes: Partial<Sede> = {
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    if (dto.name !== undefined) changes.name = dto.name;
    if (dto.address !== undefined) changes.address = dto.address;
    if (dto.mapsUrl !== undefined) changes.mapsUrl = dto.mapsUrl;
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
    return { detail: 'Sede habilitada correctamente.' };
  }
}

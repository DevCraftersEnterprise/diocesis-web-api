import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { assertValidImage } from '../../common/files/image-file.validator';
import type { UploadedImage } from '../../common/files/image-file.validator';
import { assertValidVideo } from '../../common/files/video-file.validator';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import type { Usuario } from '../users/entities/usuario.entity';
import { toCarruselResponse, type CarruselResponse } from './carrusel.response';
import { CreateCarruselDto, UpdateCarruselDto } from './dto/carrusel.dto';
import { Carrusel } from './entities/carrusel.entity';

const NOT_FOUND = { detail: 'No encontrado.' };
const NO_FILE = {
  error: "Debes proporcionar un archivo en el campo 'url'.",
};

@Injectable()
export class CarouselService {
  constructor(
    @InjectRepository(Carrusel) private readonly repo: Repository<Carrusel>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** `GET /carrusel/` — array plano, solo `isActive=true`, orden `-createdAt`. */
  async list(): Promise<CarruselResponse[]> {
    const rows = await this.repo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map(toCarruselResponse);
  }

  /** Detalle: sin filtro `isActive` (Django `get_object_or_404(pk)`). */
  async findOr404(id: string): Promise<Carrusel> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  private async findActiveOr404(id: string): Promise<Carrusel> {
    const row = await this.repo.findOne({ where: { id, isActive: true } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async detail(id: string): Promise<CarruselResponse> {
    return toCarruselResponse(await this.findOr404(id));
  }

  /** Valida por contenido segun `isImage` y sube a `carrusel/imagenes` o `carrusel/videos`. */
  private async uploadMedia(
    file: UploadedImage,
    isImage: boolean,
  ): Promise<string> {
    if (isImage) {
      assertValidImage(file, 'url');
    } else {
      assertValidVideo(file, 'url');
    }
    const { secureUrl } = await this.cloudinary.upload(file.buffer, {
      folder: isImage ? 'carrusel/imagenes' : 'carrusel/videos',
      resourceType: isImage ? 'image' : 'video',
    });
    return secureUrl;
  }

  async create(
    dto: CreateCarruselDto,
    file: UploadedImage | undefined,
    actor: Usuario,
  ): Promise<CarruselResponse> {
    if (!file) throw new BadRequestException(NO_FILE);
    const isImage = dto.isImage ?? true;

    const id = randomUUID();
    const now = new Date();
    await this.repo.insert({
      id,
      url: await this.uploadMedia(file, isImage),
      isImage,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: actor.id,
    });
    return this.detail(id);
  }

  async update(
    id: string,
    dto: UpdateCarruselDto,
    file: UploadedImage | undefined,
    actor: Usuario,
  ): Promise<CarruselResponse> {
    const current = await this.findActiveOr404(id);
    const isImage = dto.isImage ?? current.isImage;

    const changes: Partial<Carrusel> = {
      isImage,
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    if (file) changes.url = await this.uploadMedia(file, isImage);

    await this.repo.update(id, changes);
    return this.detail(id);
  }

  /** Soft-delete canonico: `isActive=false` + `deletedAt` + `deletedBy` (era solo `isActive`). */
  async softDelete(id: string, actor: Usuario): Promise<void> {
    await this.findActiveOr404(id);
    await this.repo.update(id, {
      isActive: false,
      deletedAt: new Date(),
      deletedById: actor.id,
      updatedAt: new Date(),
    });
  }

  /**
   * `PUT /carrusel/habilitar/{id}/` — **PUT** (no POST). Si ya esta activo -> **400**
   * (comportamiento propio de Django, distinto del 404 de decanatos/padres).
   */
  async activate(id: string, actor: Usuario): Promise<{ detail: string }> {
    const row = await this.findOr404(id);
    if (row.isActive) {
      throw new BadRequestException({
        detail: 'Este carrusel ya esta activo.',
      });
    }
    await this.repo.update(id, {
      isActive: true,
      deletedAt: null,
      deletedById: null,
      updatedById: actor.id,
      updatedAt: new Date(),
    });
    return { detail: 'Carrusel habilitado correctamente.' };
  }
}

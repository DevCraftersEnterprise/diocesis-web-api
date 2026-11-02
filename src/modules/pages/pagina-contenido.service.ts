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
} from '../../common/files/image-file.validator';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import type { Usuario } from '../users/entities/usuario.entity';
import {
  AddPaginaImagenDto,
  ReorderPaginaImagenesDto,
  UpdatePaginaContenidoDto,
  UpdatePaginaImagenDto,
} from './dto/pagina-contenido.dto';
import { PaginaContenido } from './entities/pagina-contenido.entity';
import { PaginaImagen } from './entities/pagina-imagen.entity';
import {
  toPaginaContenidoListItemResponse,
  toPaginaContenidoResponse,
  toPaginaImagenResponse,
  type PaginaContenidoListItemResponse,
  type PaginaContenidoResponse,
  type PaginaImagenResponse,
} from './pagina-contenido.response';

const NOT_FOUND = { detail: 'No encontrado.' };

@Injectable()
export class PaginaContenidoService {
  constructor(
    @InjectRepository(PaginaContenido)
    private readonly pages: Repository<PaginaContenido>,
    @InjectRepository(PaginaImagen)
    private readonly images: Repository<PaginaImagen>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private async findBySlugOrThrow(slug: string): Promise<PaginaContenido> {
    const row = await this.pages.findOne({ where: { slug } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  private async imagesOf(paginaId: string): Promise<PaginaImagen[]> {
    return this.images.find({ where: { paginaId }, order: { order: 'ASC' } });
  }

  /** `GET /paginas/` (admin): catalogo fijo completo, para el listado del panel. */
  async listAdmin(): Promise<PaginaContenidoListItemResponse[]> {
    const rows = await this.pages.find({ order: { title: 'ASC' } });
    return rows.map(toPaginaContenidoListItemResponse);
  }

  /** `GET /paginas/:slug` (publico): contenido + galeria ordenada. */
  async get(slug: string): Promise<PaginaContenidoResponse> {
    const row = await this.findBySlugOrThrow(slug);
    return toPaginaContenidoResponse(row, await this.imagesOf(row.id));
  }

  /** `PUT /paginas/:slug` (admin). */
  async update(
    slug: string,
    dto: UpdatePaginaContenidoDto,
    actor: Usuario,
  ): Promise<PaginaContenidoResponse> {
    const row = await this.findBySlugOrThrow(slug);

    const changes: Partial<PaginaContenido> = {
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    if (dto.title !== undefined) changes.title = dto.title;
    if (dto.body !== undefined) changes.body = dto.body;

    await this.pages.update(row.id, changes);
    return this.get(slug);
  }

  /** `POST /paginas/:slug/imagenes` (admin): valida, sube a Cloudinary, agrega al
   * final de la galeria. */
  async addImage(
    slug: string,
    file: UploadedImage,
    dto: AddPaginaImagenDto,
  ): Promise<PaginaImagenResponse> {
    const row = await this.findBySlugOrThrow(slug);
    assertValidImage(file, 'picture');

    const { secureUrl } = await this.cloudinary.upload(file.buffer, {
      folder: `paginas/${row.slug}`,
      resourceType: 'image',
    });

    const current = await this.imagesOf(row.id);
    const nextOrder =
      current.length === 0 ? 0 : Math.max(...current.map((i) => i.order)) + 1;

    const image = this.images.create({
      id: randomUUID(),
      paginaId: row.id,
      url: secureUrl,
      caption: dto.caption ?? null,
      order: nextOrder,
      createdAt: new Date(),
    });
    await this.images.save(image);
    return toPaginaImagenResponse(image);
  }

  /** `PUT /paginas/:slug/imagenes/:id` (admin): solo el pie de foto. */
  async updateImage(
    slug: string,
    id: string,
    dto: UpdatePaginaImagenDto,
  ): Promise<PaginaImagenResponse> {
    const row = await this.findBySlugOrThrow(slug);
    const image = await this.images.findOne({
      where: { id, paginaId: row.id },
    });
    if (!image) throw new NotFoundException(NOT_FOUND);

    if (dto.caption !== undefined) image.caption = dto.caption;
    await this.images.save(image);
    return toPaginaImagenResponse(image);
  }

  /** `DELETE /paginas/:slug/imagenes/:id` (admin). No borra el archivo de Cloudinary
   * (mismo criterio que el resto del codigo: no hay precedente de borrado remoto). */
  async deleteImage(slug: string, id: string): Promise<void> {
    const row = await this.findBySlugOrThrow(slug);
    const image = await this.images.findOne({
      where: { id, paginaId: row.id },
    });
    if (!image) throw new NotFoundException(NOT_FOUND);
    await this.images.delete(id);
  }

  /** `PUT /paginas/:slug/imagenes/reordenar` (admin): `order` debe traer exactamente
   * los ids actuales de la galeria, en el orden nuevo. */
  async reorderImages(
    slug: string,
    dto: ReorderPaginaImagenesDto,
  ): Promise<PaginaImagenResponse[]> {
    const row = await this.findBySlugOrThrow(slug);
    const current = await this.imagesOf(row.id);
    const currentIds = new Set(current.map((i) => i.id));
    const newIds = new Set(dto.order);

    if (
      dto.order.length !== current.length ||
      currentIds.size !== newIds.size ||
      ![...currentIds].every((id) => newIds.has(id))
    ) {
      throw new BadRequestException({
        order: ['Debe incluir exactamente las imagenes actuales de la pagina.'],
      });
    }

    await Promise.all(
      dto.order.map((id, index) =>
        this.images.update({ id, paginaId: row.id }, { order: index }),
      ),
    );
    return (await this.imagesOf(row.id)).map(toPaginaImagenResponse);
  }
}

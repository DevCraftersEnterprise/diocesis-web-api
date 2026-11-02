import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { uuidParam } from '../../common/pipes/uuid-param.pipe';
import type { Usuario } from '../users/entities/usuario.entity';
import {
  AddPaginaImagenDto,
  ReorderPaginaImagenesDto,
  UpdatePaginaContenidoDto,
  UpdatePaginaImagenDto,
} from './dto/pagina-contenido.dto';
import type {
  PaginaContenidoListItemResponse,
  PaginaContenidoResponse,
  PaginaImagenResponse,
} from './pagina-contenido.response';
import { PaginaContenidoService } from './pagina-contenido.service';

const PICTURE_INTERCEPTOR = FileInterceptor('picture', {
  limits: { fileSize: 6 * 1024 * 1024 },
});

/**
 * `/api/paginas/`. Catalogo fijo de paginas de contenido (menus que antes mostraban
 * "En construccion"). GET publico por `slug`; el listado completo y toda escritura
 * son admin/super, igual que el resto de los "9 modulos generales".
 */
@Controller('paginas')
export class PaginaContenidoController {
  constructor(private readonly pages: PaginaContenidoService) {}

  @Get()
  @Roles('admin')
  listAdmin(): Promise<PaginaContenidoListItemResponse[]> {
    return this.pages.listAdmin();
  }

  @Get(':slug')
  @Public()
  get(@Param('slug') slug: string): Promise<PaginaContenidoResponse> {
    return this.pages.get(slug);
  }

  @Put(':slug')
  @Roles('admin')
  update(
    @Param('slug') slug: string,
    @Body() dto: UpdatePaginaContenidoDto,
    @CurrentUser() actor: Usuario,
  ): Promise<PaginaContenidoResponse> {
    return this.pages.update(slug, dto, actor);
  }

  @Post(':slug/imagenes')
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(PICTURE_INTERCEPTOR)
  addImage(
    @Param('slug') slug: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AddPaginaImagenDto,
  ): Promise<PaginaImagenResponse> {
    return this.pages.addImage(slug, file, dto);
  }

  @Put(':slug/imagenes/reordenar')
  @Roles('admin')
  reorderImages(
    @Param('slug') slug: string,
    @Body() dto: ReorderPaginaImagenesDto,
  ): Promise<PaginaImagenResponse[]> {
    return this.pages.reorderImages(slug, dto);
  }

  @Put(':slug/imagenes/:id')
  @Roles('admin')
  updateImage(
    @Param('slug') slug: string,
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdatePaginaImagenDto,
  ): Promise<PaginaImagenResponse> {
    return this.pages.updateImage(slug, id, dto);
  }

  @Delete(':slug/imagenes/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteImage(
    @Param('slug') slug: string,
    @Param('id', uuidParam()) id: string,
  ): Promise<void> {
    return this.pages.deleteImage(slug, id);
  }
}

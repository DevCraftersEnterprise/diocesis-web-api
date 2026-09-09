import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { Paginated } from '../../common/pagination';
import { uuidParam } from '../../common/pipes/uuid-param.pipe';
import type { Usuario } from '../users/entities/usuario.entity';
import {
  CreatePadreDto,
  ListPadresQueryDto,
  UpdatePadreDto,
} from './dto/padre.dto';
import type { PadreResponse } from './padre.response';
import { type PadreCsvResult, PadresService } from './padres.service';

// Backstop de multer (el validador de contenido da el mensaje amable a 5 MB).
const PICTURE_INTERCEPTOR = FileInterceptor('picture', {
  limits: { fileSize: 10 * 1024 * 1024 },
});

/** `/api/padres/`. GET publico; escritura admin/super. */
@Controller('padres')
export class PadresController {
  constructor(private readonly padres: PadresService) {}

  @Get()
  @Public()
  list(
    @Query() query: ListPadresQueryDto,
    @Query('page') pageRaw?: string,
    @Query('page_size') sizeRaw?: string,
  ): Promise<Paginated<PadreResponse> | PadreResponse[]> {
    const paginated = pageRaw !== undefined || sizeRaw !== undefined;
    return this.padres.list(query, paginated);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(PICTURE_INTERCEPTOR)
  create(
    @Body() dto: CreatePadreDto,
    @UploadedFile() picture: Express.Multer.File | undefined,
  ): Promise<PadreResponse> {
    return this.padres.create(dto, picture);
  }

  @Post('cargar-por-csv')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('archivo_csv'))
  loadCsv(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<PadreCsvResult> {
    if (!file) {
      throw new BadRequestException({
        error: 'No se proporciono un archivo CSV.',
      });
    }
    return this.padres.createFromCsv(file.buffer);
  }

  @Post('habilitar/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ detail: string }> {
    return this.padres.activate(id, me);
  }

  @Get(':id')
  @Public()
  detail(@Param('id', uuidParam()) id: string): Promise<PadreResponse> {
    return this.padres.detail(id);
  }

  @Put(':id')
  @Roles('admin')
  @UseInterceptors(PICTURE_INTERCEPTOR)
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdatePadreDto,
    @UploadedFile() picture: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<PadreResponse> {
    return this.padres.update(id, dto, picture, me);
  }

  /** 204 sin cuerpo (Django devuelve 204 + body, HTTP invalido). */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<void> {
    return this.padres.softDelete(id, me);
  }
}

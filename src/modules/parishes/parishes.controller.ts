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
  CreateParroquiaDto,
  ListParroquiaQueryDto,
  UpdateParroquiaDto,
} from './dto/parroquia.dto';
import type { ParroquiaResponse } from './parroquia.response';
import { type ParroquiaCsvResult, ParishesService } from './parishes.service';

const PICTURE_INTERCEPTOR = FileInterceptor('picture', {
  limits: { fileSize: 10 * 1024 * 1024 },
});

/** `/api/parroquias/`. GET publico; escritura admin/super. Ruta CSV sin "por" (prod). */
@Controller('parroquias')
export class ParishesController {
  constructor(private readonly parishes: ParishesService) {}

  @Get()
  @Public()
  list(
    @Query() query: ListParroquiaQueryDto,
  ): Promise<Paginated<ParroquiaResponse>> {
    return this.parishes.list(query);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(PICTURE_INTERCEPTOR)
  create(
    @Body() dto: CreateParroquiaDto,
    @UploadedFile() picture: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<ParroquiaResponse> {
    return this.parishes.create(dto, picture, me);
  }

  @Post('cargar-csv')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('archivo_csv'))
  loadCsv(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<ParroquiaCsvResult> {
    if (!file) {
      throw new BadRequestException({
        error: 'No se proporciono un archivo CSV.',
      });
    }
    return this.parishes.createFromCsv(file.buffer, me);
  }

  @Post('habilitar/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ detail: string }> {
    return this.parishes.activate(id, me);
  }

  @Get(':id')
  @Public()
  detail(@Param('id', uuidParam()) id: string): Promise<ParroquiaResponse> {
    return this.parishes.detail(id);
  }

  @Put(':id')
  @Roles('admin')
  @UseInterceptors(PICTURE_INTERCEPTOR)
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdateParroquiaDto,
    @UploadedFile() picture: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<ParroquiaResponse> {
    return this.parishes.update(id, dto, picture, me);
  }

  /** 204 sin cuerpo (Django devuelve 204 + body, HTTP invalido). */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<void> {
    return this.parishes.softDelete(id, me);
  }
}

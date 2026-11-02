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
  CreateDescargaDto,
  ListDescargaQueryDto,
  UpdateDescargaDto,
} from './dto/descarga.dto';
import type { DescargaResponse } from './descarga.response';
import { DescargasService } from './descargas.service';

const FILE_INTERCEPTOR = FileInterceptor('file', {
  limits: { fileSize: 105 * 1024 * 1024 },
});

/** `/api/descargas/`. multipart/form-data (`file`). GET publico. */
@Controller('descargas')
export class DescargasController {
  constructor(private readonly descargas: DescargasService) {}

  @Get()
  @Public()
  list(
    @Query() query: ListDescargaQueryDto,
  ): Promise<Paginated<DescargaResponse>> {
    return this.descargas.list(query);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FILE_INTERCEPTOR)
  create(
    @Body() dto: CreateDescargaDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<DescargaResponse> {
    return this.descargas.create(dto, file, me);
  }

  @Post('habilitar/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ detail: string }> {
    return this.descargas.activate(id, me);
  }

  @Get(':id')
  @Public()
  detail(@Param('id', uuidParam()) id: string): Promise<DescargaResponse> {
    return this.descargas.detail(id);
  }

  @Put(':id')
  @Roles('admin')
  @UseInterceptors(FILE_INTERCEPTOR)
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdateDescargaDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<DescargaResponse> {
    return this.descargas.update(id, dto, file, me);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<void> {
    return this.descargas.softDelete(id, me);
  }
}

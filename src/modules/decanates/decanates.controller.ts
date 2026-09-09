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
import type { DecanatoResponse } from './decanato.response';
import { type CatalogCsvResult, DecanatesService } from './decanates.service';
import {
  CreateDecanatoDto,
  ListDecanatoQueryDto,
  UpdateDecanatoDto,
} from './dto/decanato.dto';

/** `/api/decanatos/`. GET publico; escritura admin/super (guards globales). */
@Controller('decanatos')
export class DecanatesController {
  constructor(private readonly decanates: DecanatesService) {}

  @Get()
  @Public()
  list(
    @Query() query: ListDecanatoQueryDto,
  ): Promise<Paginated<DecanatoResponse>> {
    return this.decanates.list(query);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateDecanatoDto,
    @CurrentUser() me: Usuario,
  ): Promise<DecanatoResponse> {
    return this.decanates.create(dto, me);
  }

  /** Nota: en prod la ruta es `cargar-csv/` (sin "por"), a diferencia de usuarios/padres. */
  @Post('cargar-csv')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('archivo_csv'))
  loadCsv(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<CatalogCsvResult> {
    if (!file) {
      throw new BadRequestException({
        error: 'No se proporciono un archivo CSV.',
      });
    }
    return this.decanates.createFromCsv(file.buffer, me);
  }

  @Post('habilitar/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ detail: string }> {
    return this.decanates.activate(id, me);
  }

  @Get(':id')
  @Public()
  detail(@Param('id', uuidParam()) id: string): Promise<DecanatoResponse> {
    return this.decanates.detail(id);
  }

  @Put(':id')
  @Roles('admin')
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdateDecanatoDto,
    @CurrentUser() me: Usuario,
  ): Promise<DecanatoResponse> {
    return this.decanates.update(id, dto, me);
  }

  /** 204 sin cuerpo (Django devuelve 204 + body, HTTP invalido). */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<void> {
    return this.decanates.softDelete(id, me);
  }
}

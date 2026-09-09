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
import {
  type CatalogCsvResult,
  type CatalogNameResponse,
  CreateCatalogNameDto,
  ListCatalogQueryDto,
  UpdateCatalogNameDto,
} from '../../common/catalog';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { Paginated } from '../../common/pagination';
import { uuidParam } from '../../common/pipes/uuid-param.pipe';
import type { Usuario } from '../users/entities/usuario.entity';
import { ColoniesService } from './colonies.service';

/** `/api/colonias/`. Gemelo de decanatos. GET publico; escritura admin/super. */
@Controller('colonias')
export class ColoniesController {
  constructor(private readonly colonies: ColoniesService) {}

  @Get()
  @Public()
  list(
    @Query() query: ListCatalogQueryDto,
  ): Promise<Paginated<CatalogNameResponse>> {
    return this.colonies.list(query);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateCatalogNameDto,
    @CurrentUser() me: Usuario,
  ): Promise<CatalogNameResponse> {
    return this.colonies.create(dto, me);
  }

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
    return this.colonies.createFromCsv(file.buffer, me);
  }

  @Post('habilitar/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ detail: string }> {
    return this.colonies.activate(id, me);
  }

  @Get(':id')
  @Public()
  detail(@Param('id', uuidParam()) id: string): Promise<CatalogNameResponse> {
    return this.colonies.detail(id);
  }

  @Put(':id')
  @Roles('admin')
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdateCatalogNameDto,
    @CurrentUser() me: Usuario,
  ): Promise<CatalogNameResponse> {
    return this.colonies.update(id, dto, me);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<void> {
    return this.colonies.softDelete(id, me);
  }
}

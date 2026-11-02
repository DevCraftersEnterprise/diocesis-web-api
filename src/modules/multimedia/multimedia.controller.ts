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
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { uuidParam } from '../../common/pipes/uuid-param.pipe';
import type { Usuario } from '../users/entities/usuario.entity';
import {
  CreateEnlaceMultimediaDto,
  ReorderEnlacesMultimediaDto,
  UpdateEnlaceMultimediaDto,
} from './dto/enlace-multimedia.dto';
import type { EnlaceMultimediaResponse } from './enlace-multimedia.response';
import { MultimediaService } from './multimedia.service';

/** `/api/multimedia/`. GET publico (solo activos salvo `?all=true` para el admin). */
@Controller('multimedia')
export class MultimediaController {
  constructor(private readonly multimedia: MultimediaService) {}

  @Get()
  @Public()
  list(@Query('all') all?: string): Promise<EnlaceMultimediaResponse[]> {
    return this.multimedia.list(all === 'true');
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateEnlaceMultimediaDto,
    @CurrentUser() me: Usuario,
  ): Promise<EnlaceMultimediaResponse> {
    return this.multimedia.create(dto, me);
  }

  @Post('habilitar/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ detail: string }> {
    return this.multimedia.activate(id, me);
  }

  @Put('reordenar')
  @Roles('admin')
  reorder(
    @Body() dto: ReorderEnlacesMultimediaDto,
  ): Promise<EnlaceMultimediaResponse[]> {
    return this.multimedia.reorder(dto);
  }

  @Get(':id')
  @Public()
  detail(
    @Param('id', uuidParam()) id: string,
  ): Promise<EnlaceMultimediaResponse> {
    return this.multimedia.detail(id);
  }

  @Put(':id')
  @Roles('admin')
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdateEnlaceMultimediaDto,
    @CurrentUser() me: Usuario,
  ): Promise<EnlaceMultimediaResponse> {
    return this.multimedia.update(id, dto, me);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<void> {
    return this.multimedia.softDelete(id, me);
  }
}

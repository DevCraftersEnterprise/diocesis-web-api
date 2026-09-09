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
import type { CarruselResponse } from './carrusel.response';
import { CarouselService } from './carousel.service';
import { CreateCarruselDto, UpdateCarruselDto } from './dto/carrusel.dto';

// Campo de archivo = `url` (nombre historico de Django). 55 MB de backstop (video 50).
const MEDIA_INTERCEPTOR = FileInterceptor('url', {
  limits: { fileSize: 55 * 1024 * 1024 },
});

/** `/api/carrusel/`. GET publico; escritura admin/super. `habilitar/` es PUT (no POST). */
@Controller('carrusel')
export class CarouselController {
  constructor(private readonly carousel: CarouselService) {}

  @Get()
  @Public()
  list(): Promise<CarruselResponse[]> {
    return this.carousel.list();
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(MEDIA_INTERCEPTOR)
  create(
    @Body() dto: CreateCarruselDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<CarruselResponse> {
    return this.carousel.create(dto, file, me);
  }

  @Put('habilitar/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ detail: string }> {
    return this.carousel.activate(id, me);
  }

  @Get(':id')
  @Public()
  detail(@Param('id', uuidParam()) id: string): Promise<CarruselResponse> {
    return this.carousel.detail(id);
  }

  @Put(':id')
  @Roles('admin')
  @UseInterceptors(MEDIA_INTERCEPTOR)
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdateCarruselDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<CarruselResponse> {
    return this.carousel.update(id, dto, file, me);
  }

  /** 204 sin cuerpo (Django devuelve 204 + body, HTTP invalido). */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<void> {
    return this.carousel.softDelete(id, me);
  }
}

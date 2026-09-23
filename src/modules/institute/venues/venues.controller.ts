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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ModuleAccess } from '../../../common/decorators/module-access.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import type { Paginated } from '../../../common/pagination';
import { uuidParam } from '../../../common/pipes/uuid-param.pipe';
import { ModuleAccessGuard } from '../../auth/guards/module-access.guard';
import type { Usuario } from '../../users/entities/usuario.entity';
import { CreateSedeDto, ListSedeQueryDto, UpdateSedeDto } from './dto/sede.dto';
import type { SedeResponse } from './sede.response';
import { VenuesService } from './venues.service';

const PICTURE_INTERCEPTOR = FileInterceptor('picture', {
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * `/api/instituto-biblico/sedes/` (Tarea 5.1). GET publico; escritura protegida por
 * `ModuleAccessGuard` (admin/super, o `user` con `moduleAccess`).
 */
@Controller('instituto-biblico/sedes')
export class VenuesController {
  constructor(private readonly venues: VenuesService) {}

  @Get()
  @Public()
  list(@Query() query: ListSedeQueryDto): Promise<Paginated<SedeResponse>> {
    return this.venues.list(query);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('instituto-biblico')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(PICTURE_INTERCEPTOR)
  create(
    @Body() dto: CreateSedeDto,
    @UploadedFile() picture: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<SedeResponse> {
    return this.venues.create(dto, picture, me);
  }

  @Post('habilitar/:id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('instituto-biblico')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ detail: string }> {
    return this.venues.activate(id, me);
  }

  @Get(':id')
  @Public()
  detail(@Param('id', uuidParam()) id: string): Promise<SedeResponse> {
    return this.venues.detail(id);
  }

  @Put(':id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('instituto-biblico')
  @UseInterceptors(PICTURE_INTERCEPTOR)
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdateSedeDto,
    @UploadedFile() picture: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<SedeResponse> {
    return this.venues.update(id, dto, picture, me);
  }

  /** 204 sin cuerpo (convencion establecida en todos los recursos con soft-delete). */
  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('instituto-biblico')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<void> {
    return this.venues.softDelete(id, me);
  }
}

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
import { CoursesService } from './courses.service';
import type { CursoResponse } from './curso.response';
import {
  CreateCursoDto,
  ListCursoQueryDto,
  UpdateCursoDto,
} from './dto/curso.dto';

const PICTURE_INTERCEPTOR = FileInterceptor('picture', {
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * `/api/instituto-biblico/cursos/` (Tarea 4.1). GET publico; escritura
 * protegida por `ModuleAccessGuard` (admin/super, o `user` con `moduleAccess`).
 */
@Controller('instituto-biblico/cursos')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  @Public()
  list(@Query() query: ListCursoQueryDto): Promise<Paginated<CursoResponse>> {
    return this.courses.list(query);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('instituto-biblico')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(PICTURE_INTERCEPTOR)
  create(
    @Body() dto: CreateCursoDto,
    @UploadedFile() picture: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<CursoResponse> {
    return this.courses.create(dto, picture, me);
  }

  @Post('habilitar/:id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('instituto-biblico')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ detail: string }> {
    return this.courses.activate(id, me);
  }

  @Get(':id')
  @Public()
  detail(@Param('id', uuidParam()) id: string): Promise<CursoResponse> {
    return this.courses.detail(id);
  }

  @Put(':id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('instituto-biblico')
  @UseInterceptors(PICTURE_INTERCEPTOR)
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdateCursoDto,
    @UploadedFile() picture: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<CursoResponse> {
    return this.courses.update(id, dto, picture, me);
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
    return this.courses.softDelete(id, me);
  }
}

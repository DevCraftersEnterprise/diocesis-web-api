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
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ModuleAccess } from '../../../common/decorators/module-access.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import type { Paginated } from '../../../common/pagination';
import { uuidParam } from '../../../common/pipes/uuid-param.pipe';
import { ModuleAccessGuard } from '../../auth/guards/module-access.guard';
import type { Usuario } from '../../users/entities/usuario.entity';
import {
  CreateIsmaCursoDto,
  ListIsmaCursoGestionQueryDto,
  ListIsmaCursoPublicQueryDto,
  UpdateIsmaCursoDto,
} from './dto/isma-curso.dto';
import { IsmaCursosService } from './isma-cursos.service';
import type { IsmaCursoResponse } from './isma-curso.response';

/**
 * `/api/isma/cursos/` — calendario publico de cursos ISMA. La parte `gestion/` es el CRUD
 * del admin (protegida por `ModuleAccessGuard`). Las rutas `gestion/*` van antes de
 * `:id` para que Nest no las confunda con un id.
 */
@Controller('isma/cursos')
export class IsmaCursosController {
  constructor(private readonly cursos: IsmaCursosService) {}

  @Get()
  @Public()
  list(
    @Query() query: ListIsmaCursoPublicQueryDto,
  ): Promise<Paginated<IsmaCursoResponse>> {
    return this.cursos.listPublic(query);
  }

  @Get('gestion')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('isma')
  listGestion(
    @Query() query: ListIsmaCursoGestionQueryDto,
  ): Promise<Paginated<IsmaCursoResponse>> {
    return this.cursos.listGestion(query);
  }

  @Post('gestion')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('isma')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateIsmaCursoDto,
    @CurrentUser() me: Usuario,
  ): Promise<IsmaCursoResponse> {
    return this.cursos.create(dto, me);
  }

  @Post('gestion/habilitar/:id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('isma')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ detail: string }> {
    return this.cursos.activate(id, me);
  }

  @Get('gestion/:id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('isma')
  detailGestion(
    @Param('id', uuidParam()) id: string,
  ): Promise<IsmaCursoResponse> {
    return this.cursos.detailGestion(id);
  }

  @Put('gestion/:id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('isma')
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdateIsmaCursoDto,
    @CurrentUser() me: Usuario,
  ): Promise<IsmaCursoResponse> {
    return this.cursos.update(id, dto, me);
  }

  /** 204 sin cuerpo (convencion de soft-delete del proyecto). */
  @Delete('gestion/:id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('isma')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<void> {
    return this.cursos.softDelete(id, me);
  }

  @Get(':id')
  @Public()
  detail(@Param('id', uuidParam()) id: string): Promise<IsmaCursoResponse> {
    return this.cursos.detailPublic(id);
  }
}

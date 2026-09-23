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
import { ModuleAccess } from '../../../common/decorators/module-access.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import type { Paginated } from '../../../common/pagination';
import { uuidParam } from '../../../common/pipes/uuid-param.pipe';
import { ModuleAccessGuard } from '../../auth/guards/module-access.guard';
import type { Usuario } from '../../users/entities/usuario.entity';
import type { CasoEspecialResponse } from './caso-especial.response';
import {
  CreateCasoEspecialDto,
  ListCasoEspecialQueryDto,
  UpdateCasoEspecialDto,
} from './dto/caso-especial.dto';
import { SpecialCasesService } from './special-cases.service';

/**
 * `/api/isma/casos-especiales/` (Tarea 7.1). GET publico; escritura protegida por
 * `ModuleAccessGuard` (admin/super, o `user` con `moduleAccess`).
 */
@Controller('isma/casos-especiales')
export class SpecialCasesController {
  constructor(private readonly specialCases: SpecialCasesService) {}

  @Get()
  @Public()
  list(
    @Query() query: ListCasoEspecialQueryDto,
  ): Promise<Paginated<CasoEspecialResponse>> {
    return this.specialCases.list(query);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('isma')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateCasoEspecialDto,
    @CurrentUser() me: Usuario,
  ): Promise<CasoEspecialResponse> {
    return this.specialCases.create(dto, me);
  }

  @Post('habilitar/:id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('isma')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ detail: string }> {
    return this.specialCases.activate(id, me);
  }

  @Get(':id')
  @Public()
  detail(@Param('id', uuidParam()) id: string): Promise<CasoEspecialResponse> {
    return this.specialCases.detail(id);
  }

  @Put(':id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('isma')
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdateCasoEspecialDto,
    @CurrentUser() me: Usuario,
  ): Promise<CasoEspecialResponse> {
    return this.specialCases.update(id, dto, me);
  }

  /** 204 sin cuerpo (convencion establecida en todos los recursos con soft-delete). */
  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('isma')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<void> {
    return this.specialCases.softDelete(id, me);
  }
}

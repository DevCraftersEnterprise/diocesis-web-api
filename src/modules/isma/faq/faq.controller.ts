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
import {
  CreatePreguntaFrecuenteDto,
  ListPreguntaFrecuenteQueryDto,
  UpdatePreguntaFrecuenteDto,
} from './dto/pregunta-frecuente.dto';
import { FaqService } from './faq.service';
import type { PreguntaFrecuenteResponse } from './pregunta-frecuente.response';

/**
 * `/api/isma/preguntas-frecuentes/` (Tarea 7.1). GET publico; escritura protegida por
 * `ModuleAccessGuard` (admin/super, o `user` con `moduleAccess`).
 */
@Controller('isma/preguntas-frecuentes')
export class FaqController {
  constructor(private readonly faq: FaqService) {}

  @Get()
  @Public()
  list(
    @Query() query: ListPreguntaFrecuenteQueryDto,
  ): Promise<Paginated<PreguntaFrecuenteResponse>> {
    return this.faq.list(query);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('isma')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreatePreguntaFrecuenteDto,
    @CurrentUser() me: Usuario,
  ): Promise<PreguntaFrecuenteResponse> {
    return this.faq.create(dto, me);
  }

  @Post('habilitar/:id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('isma')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ detail: string }> {
    return this.faq.activate(id, me);
  }

  @Get(':id')
  @Public()
  detail(
    @Param('id', uuidParam()) id: string,
  ): Promise<PreguntaFrecuenteResponse> {
    return this.faq.detail(id);
  }

  @Put(':id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('isma')
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdatePreguntaFrecuenteDto,
    @CurrentUser() me: Usuario,
  ): Promise<PreguntaFrecuenteResponse> {
    return this.faq.update(id, dto, me);
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
    return this.faq.softDelete(id, me);
  }
}

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
import type { CapacitacionResponse } from './capacitacion.response';
import {
  CreateCapacitacionDto,
  ListCapacitacionQueryDto,
  UpdateCapacitacionDto,
} from './dto/capacitacion.dto';
import { TrainingsService } from './trainings.service';

/**
 * `/api/instituto-biblico/capacitaciones/` (Tarea 4.1). GET publico; escritura
 * protegida por `ModuleAccessGuard` (admin/super, o `user` con `moduleAccess`).
 */
@Controller('instituto-biblico/capacitaciones')
export class TrainingsController {
  constructor(private readonly trainings: TrainingsService) {}

  @Get()
  @Public()
  list(
    @Query() query: ListCapacitacionQueryDto,
  ): Promise<Paginated<CapacitacionResponse>> {
    return this.trainings.list(query);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('instituto-biblico')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateCapacitacionDto,
    @CurrentUser() me: Usuario,
  ): Promise<CapacitacionResponse> {
    return this.trainings.create(dto, me);
  }

  @Post('habilitar/:id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('instituto-biblico')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ detail: string }> {
    return this.trainings.activate(id, me);
  }

  @Get(':id')
  @Public()
  detail(@Param('id', uuidParam()) id: string): Promise<CapacitacionResponse> {
    return this.trainings.detail(id);
  }

  @Put(':id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('instituto-biblico')
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdateCapacitacionDto,
    @CurrentUser() me: Usuario,
  ): Promise<CapacitacionResponse> {
    return this.trainings.update(id, dto, me);
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
    return this.trainings.softDelete(id, me);
  }
}

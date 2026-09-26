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
  CreateEventoDto,
  ListEventoQueryDto,
  UpdateEventoDto,
} from './dto/evento.dto';
import type { EventoResponse } from './evento.response';
import { EventsService } from './events.service';

/**
 * `/api/instituto-biblico/eventos/` (Tarea 5.1). GET publico (el widget de calendario
 * pide un rango de fechas con `page_size` alto); escritura protegida por
 * `ModuleAccessGuard` (admin/super, o `user` con `moduleAccess`).
 */
@Controller('instituto-biblico/eventos')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @Public()
  list(@Query() query: ListEventoQueryDto): Promise<Paginated<EventoResponse>> {
    return this.events.list(query);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('instituto-biblico')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateEventoDto,
    @CurrentUser() me: Usuario,
  ): Promise<EventoResponse> {
    return this.events.create(dto, me);
  }

  @Post('habilitar/:id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('instituto-biblico')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ detail: string }> {
    return this.events.activate(id, me);
  }

  @Get(':id')
  @Public()
  detail(@Param('id', uuidParam()) id: string): Promise<EventoResponse> {
    return this.events.detail(id);
  }

  @Put(':id')
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('instituto-biblico')
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdateEventoDto,
    @CurrentUser() me: Usuario,
  ): Promise<EventoResponse> {
    return this.events.update(id, dto, me);
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
    return this.events.softDelete(id, me);
  }
}

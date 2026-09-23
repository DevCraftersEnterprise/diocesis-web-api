import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ModuleAccess } from '../../../common/decorators/module-access.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { ModuleAccessGuard } from '../../auth/guards/module-access.guard';
import type { Usuario } from '../../users/entities/usuario.entity';
import { UpdateInstitutoInformacionDto } from './dto/instituto-informacion.dto';
import { InstituteInformationService } from './institute-information.service';
import type { InstitutoInformacionResponse } from './instituto-informacion.response';

/**
 * `/api/instituto-biblico/informacion/` (Tarea 3.1). Sin `:id` (recurso singleton).
 * `PUT` protegido por `ModuleAccessGuard` (admin/super, o `user` con
 * `moduleAccess: ['instituto-biblico']`) en vez de `@Roles('admin')`.
 */
@Controller('instituto-biblico/informacion')
export class InstituteInformationController {
  constructor(private readonly information: InstituteInformationService) {}

  @Get()
  @Public()
  get(): Promise<InstitutoInformacionResponse> {
    return this.information.get();
  }

  @Put()
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('instituto-biblico')
  update(
    @Body() dto: UpdateInstitutoInformacionDto,
    @CurrentUser() me: Usuario,
  ): Promise<InstitutoInformacionResponse> {
    return this.information.update(dto, me);
  }
}

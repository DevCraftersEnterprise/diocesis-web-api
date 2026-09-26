import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ModuleAccess } from '../../../common/decorators/module-access.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { ModuleAccessGuard } from '../../auth/guards/module-access.guard';
import type { Usuario } from '../../users/entities/usuario.entity';
import { UpdateIsmaInformacionDto } from './dto/isma-informacion.dto';
import { IsmaInformationService } from './isma-information.service';
import type { IsmaInformacionResponse } from './isma-informacion.response';

/**
 * `/api/isma/informacion/` (Tarea 6.1). Sin `:id` (recurso singleton). `PUT` protegido
 * por `ModuleAccessGuard` (admin/super, o `user` con `moduleAccess: ['isma']`) en vez de
 * `@Roles('admin')`.
 */
@Controller('isma/informacion')
export class IsmaInformationController {
  constructor(private readonly information: IsmaInformationService) {}

  @Get()
  @Public()
  get(): Promise<IsmaInformacionResponse> {
    return this.information.get();
  }

  @Put()
  @UseGuards(ModuleAccessGuard)
  @ModuleAccess('isma')
  update(
    @Body() dto: UpdateIsmaInformacionDto,
    @CurrentUser() me: Usuario,
  ): Promise<IsmaInformacionResponse> {
    return this.information.update(dto, me);
  }
}

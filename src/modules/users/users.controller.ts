import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { roleAtLeast } from '../../common/auth/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { Paginated } from '../../common/pagination';
import { uuidParam } from '../../common/pipes/uuid-param.pipe';
import { ListUsersQueryDto } from './dto/list-users.query';
import { Usuario } from './entities/usuario.entity';
import type { UserResponse } from './user.response';
import { UsersService } from './users.service';

const FORBIDDEN = { detail: 'No tienes permiso para realizar esta accion.' };

/** `/api/users/usuarios/`. Todo exige Bearer (guard global). */
@Controller('users/usuarios')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Enumerar usuarios: admin/super (cierra BUG-DJANGO-008, antes cualquier autenticado). */
  @Get()
  @Roles('admin')
  list(
    @Query() query: ListUsersQueryDto,
    @CurrentUser() me: Usuario,
  ): Promise<Paginated<UserResponse>> {
    return this.users.list(query, me.id);
  }

  /** Perfil propio del usuario autenticado. */
  @Get('me')
  me(@CurrentUser() me: Usuario): Promise<UserResponse> {
    return this.users.findForResponse(me.id);
  }

  /**
   * Detalle por id: **el propio usuario** (lo usa `Auth.loadProfile`) **o** admin/super.
   * Cierra el IDOR de BUG-DJANGO-008 sin romper el login del frontend.
   */
  @Get(':id')
  detail(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<UserResponse> {
    if (id !== me.id && !roleAtLeast(me.role, 'admin')) {
      throw new ForbiddenException(FORBIDDEN);
    }
    return this.users.findForResponse(id);
  }
}

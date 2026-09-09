import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { ThrottlerGuard } from '@nestjs/throttler';
import { roleAtLeast } from '../../common/auth/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { Paginated } from '../../common/pagination';
import { uuidParam } from '../../common/pipes/uuid-param.pipe';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query';
import { UpdateUserDto } from './dto/update-user.dto';
import { Usuario } from './entities/usuario.entity';
import type { UserResponse } from './user.response';
import { type CsvImportResult, UsersService } from './users.service';

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

  /** Crear usuario (admin/super). Respuesta: objeto `User` plano, 201 (delta APIC-002). */
  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() me: Usuario,
  ): Promise<UserResponse> {
    return this.users.create(dto, me);
  }

  /** Alta masiva por CSV (admin/super). Campo multipart `archivo_csv`. */
  @Post('cargar-por-csv')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('archivo_csv'))
  loadCsv(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<CsvImportResult> {
    if (!file) {
      throw new BadRequestException({
        error: 'No se proporciono un archivo CSV.',
      });
    }
    return this.users.createFromCsv(file.buffer, me);
  }

  /** Cambiar la propia contrasena. Exige `current_password` (endurecido). Rate-limited (SECURITY-006). */
  @Put('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() me: Usuario,
  ): Promise<{ mensaje: string }> {
    return this.users.changePassword(
      me,
      dto.current_password,
      dto.new_password,
    );
  }

  /** Resetear la contrasena de otro usuario (admin/super). Devuelve la nueva. Rate-limited (SECURITY-006). */
  @Post('reset-password/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  resetPassword(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ mensaje: string; password: string }> {
    return this.users.resetPassword(id, me);
  }

  /** Perfil propio del usuario autenticado. */
  @Get('me')
  me(@CurrentUser() me: Usuario): Promise<UserResponse> {
    return this.users.findForResponse(me.id);
  }

  /** Activar / desactivar (admin/super). Mantiene el `{ mensaje }` de Django. */
  @Put('cambiar-estado/:id')
  @Roles('admin')
  toggleStatus(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ mensaje: string }> {
    return this.users.toggleStatus(id, me);
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

  /** Editar (admin/super). Parcial, sin password. Respuesta: `User` plano, 200. */
  @Put(':id')
  @Roles('admin')
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() me: Usuario,
  ): Promise<UserResponse> {
    return this.users.update(id, dto, me);
  }

  /** Soft-delete (admin/super). 204 sin cuerpo (delta intencional). */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<void> {
    return this.users.softDelete(id, me);
  }
}

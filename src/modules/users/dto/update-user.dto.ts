import {
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  MODULE_ACCESS_VALUES,
  USER_ROLES,
  type AppModuleName,
  type UserRole,
} from '../entities/usuario.entity';

/**
 * `PUT /users/usuarios/{id}/` — parcial. **Sin `password`** (BUG-DJANGO-010: el cambio de
 * contrasena va por su endpoint). El FE solo envia `username`, `email`, `role` — mas
 * `moduleAccess` desde la Tarea 2.1 (pantalla nueva de asignacion en `admin/users`).
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @IsOptional()
  @IsArray()
  @IsIn(MODULE_ACCESS_VALUES, { each: true })
  moduleAccess?: AppModuleName[];
}

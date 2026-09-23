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
 * `POST /users/usuarios/` — `role` REQUERIDO (BUG-DJANGO-009). Sin `is_staff`/`is_active`.
 * `moduleAccess` (Tarea 2.1) es opcional -> `[]` si se omite; solo tiene efecto si
 * `role: 'user'` (un `admin`/`super` ya tiene acceso total, ver `ModuleAccessGuard`).
 */
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsEmail()
  email!: string;

  @IsIn(USER_ROLES)
  role!: UserRole;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsOptional()
  @IsArray()
  @IsIn(MODULE_ACCESS_VALUES, { each: true })
  moduleAccess?: AppModuleName[];
}

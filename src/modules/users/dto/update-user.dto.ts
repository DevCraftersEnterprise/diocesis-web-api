import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { USER_ROLES, type UserRole } from '../entities/usuario.entity';

/**
 * `PUT /users/usuarios/{id}/` — parcial. **Sin `password`** (BUG-DJANGO-010: el cambio de
 * contrasena va por su endpoint). El FE solo envia `username`, `email`, `role`.
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
}

import { IsEmail, IsIn, IsNotEmpty, IsString } from 'class-validator';
import type { UserRole } from '../entities/usuario.entity';

const ROLES: UserRole[] = ['super', 'admin', 'user'];

/** `POST /users/usuarios/` — `role` REQUERIDO (BUG-DJANGO-009). Sin `is_staff`/`is_active`. */
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsEmail()
  email!: string;

  @IsIn(ROLES)
  role!: UserRole;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

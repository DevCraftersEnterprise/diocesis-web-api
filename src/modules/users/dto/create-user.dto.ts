import { IsEmail, IsIn, IsNotEmpty, IsString } from 'class-validator';
import { USER_ROLES, type UserRole } from '../entities/usuario.entity';

/** `POST /users/usuarios/` — `role` REQUERIDO (BUG-DJANGO-009). Sin `is_staff`/`is_active`. */
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
}

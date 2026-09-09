import { IsNotEmpty, IsString } from 'class-validator';

/**
 * `PUT /users/usuarios/change-password/`. **Endurecido** respecto a Django (que solo pedia
 * `new_password` y no verificaba nada, BUG-DJANGO-005): ahora exige la contrasena actual.
 * El frontend no usa este endpoint (FE-001).
 */
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  current_password!: string;

  @IsString()
  @IsNotEmpty()
  new_password!: string;
}

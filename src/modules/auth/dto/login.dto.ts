import { IsNotEmpty, IsString } from 'class-validator';

/** `POST /api/token/login/` — body `{ username, password }` (contrato simplejwt). */
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

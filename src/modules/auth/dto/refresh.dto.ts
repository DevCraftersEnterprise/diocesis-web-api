import { IsNotEmpty, IsString } from 'class-validator';

/** `POST /api/token/refresh/` — body `{ refresh }` (contrato simplejwt). */
export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refresh!: string;
}

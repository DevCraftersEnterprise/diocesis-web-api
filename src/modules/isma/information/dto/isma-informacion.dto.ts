import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * `PUT /isma/informacion/` — parcial, sin `:id` (fila fija, ver `ISMA_INFORMACION_ID`).
 * Sin `POST`/`DELETE`: no tiene sentido crear o borrar la unica fila.
 */
export class UpdateIsmaInformacionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  introduccion?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  documentacionNecesaria?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  parroquiaCorrespondiente?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  entrevistaParroco?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  programaIsma?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tiemposAnticipacion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactoTelefono1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactoTelefono2?: string;
}

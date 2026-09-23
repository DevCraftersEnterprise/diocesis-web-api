import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * `PUT /instituto-biblico/informacion/` — parcial, sin `:id` (fila fija, ver
 * `INSTITUTO_INFORMACION_ID`). Sin `POST`/`DELETE`: no tiene sentido crear o borrar la
 * unica fila.
 */
export class UpdateInstitutoInformacionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;
}

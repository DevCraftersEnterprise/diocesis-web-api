import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Cadena vacia (lo que envia el FE en opcionales sin valor) -> `null` (contract-matrix). */
const emptyToNull = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? null : value;

class PadreSocialDto {
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((o: PadreSocialDto) => o.email != null)
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((o: PadreSocialDto) => o.facebook != null)
  @IsString()
  @MaxLength(200)
  facebook?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((o: PadreSocialDto) => o.instagram != null)
  @IsString()
  @MaxLength(200)
  instagram?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((o: PadreSocialDto) => o.twitter != null)
  @IsString()
  @MaxLength(200)
  twitter?: string | null;
}

/** `POST /padres/` (multipart). `picture` es el archivo, va aparte. */
export class CreatePadreDto extends PadreSocialDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @Matches(DATE_RE, { message: 'birthDate debe tener formato YYYY-MM-DD.' })
  birthDate!: string;
}

/** `PUT /padres/{id}/` — parcial. */
export class UpdatePadreDto extends PadreSocialDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: 'birthDate debe tener formato YYYY-MM-DD.' })
  birthDate?: string;
}

/**
 * `GET /padres/`. `isActive`: cualquier valor != "true" filtra por `false` (como Django).
 * Filtros por dia/mes de nacimiento: params `birthDay` / `birthMonth`.
 */
export class ListPadresQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === 'true',
  )
  isActive?: boolean;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  birthDay?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  birthMonth?: number;
}

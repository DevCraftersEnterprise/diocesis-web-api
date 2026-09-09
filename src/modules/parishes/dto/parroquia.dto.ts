import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** `POST /parroquias/` (multipart/JSON). `picture` es el archivo, va aparte. Sin `createdBy`. */
export class CreateParroquiaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @Matches(DATE_RE, { message: 'openingDate debe tener formato YYYY-MM-DD.' })
  openingDate!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  zipCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  town!: string;

  @IsUUID()
  decanatoId!: string;

  @IsUUID()
  coloniaId!: string;

  @IsUUID()
  padreId!: string;
}

/** `PUT /parroquias/{id}/` — parcial. */
export class UpdateParroquiaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: 'openingDate debe tener formato YYYY-MM-DD.' })
  openingDate?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  zipCode?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  town?: string;

  @IsOptional()
  @IsUUID()
  decanatoId?: string;

  @IsOptional()
  @IsUUID()
  coloniaId?: string;

  @IsOptional()
  @IsUUID()
  padreId?: string;
}

/**
 * `GET /parroquias/`. Filtros de Django: `name`/`town` (icontains), `colonia` (icontains
 * sobre el **nombre de la colonia** — BUG-DJANGO-003: Django usaba `coloniaId__nombre`, un
 * campo inexistente, que reventaba en 500), `isActive` (solo `true`/`false` exactos).
 */
export class ListParroquiaQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  colonia?: string;

  @IsOptional()
  @IsString()
  town?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : undefined,
  )
  isActive?: boolean;
}

import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination';

/** `POST /descargas/` (multipart/form-data). `file` es el archivo, va aparte. */
export class CreateDescargaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  /** Si no se manda, el servicio usa la fecha de hoy. */
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}

/** `PUT /descargas/{id}/` — parcial; `file` opcional (reemplaza el archivo actual). */
export class UpdateDescargaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}

/** `GET /descargas/`. */
export class ListDescargaQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : undefined,
  )
  isActive?: boolean;
}

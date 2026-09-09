import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../pagination';

/** `POST /<catalogo>/` — Django solo acepta `{ name }`. */
export class CreateCatalogNameDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}

/** `PUT /<catalogo>/{id}/` — parcial. */
export class UpdateCatalogNameDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;
}

/**
 * `GET /<catalogo>/`. Filtros de Django: `name` (icontains); `isActive` solo filtra con
 * el valor EXACTO `true`/`false` (cualquier otro -> sin filtro).
 */
export class ListCatalogQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : undefined,
  )
  isActive?: boolean;
}

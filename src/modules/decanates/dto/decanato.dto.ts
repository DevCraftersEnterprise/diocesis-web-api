import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination';

/** `POST /decanatos/` — Django solo acepta `{ name }` (el resto es read-only o mass assignment). */
export class CreateDecanatoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}

/** `PUT /decanatos/{id}/` — parcial. */
export class UpdateDecanatoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;
}

/**
 * `GET /decanatos/`. Filtros de Django: `name` (icontains); `isActive` solo filtra con el
 * valor EXACTO `true`/`false` (cualquier otro -> sin filtro).
 */
export class ListDecanatoQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : undefined,
  )
  isActive?: boolean;
}

import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../../common/pagination';

/** `POST /isma/casos-especiales/` (JSON). Sin `createdBy`. */
export class CreateCasoEspecialDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsInt()
  @Min(1)
  order!: number;

  @IsString()
  @IsNotEmpty()
  requisitosAdicionales!: string;

  @IsOptional()
  @IsString()
  documentosAdicionales?: string;

  @IsOptional()
  @IsString()
  excepciones?: string;

  @IsOptional()
  @IsString()
  contacto?: string;
}

/** `PUT /isma/casos-especiales/{id}/` — parcial. */
export class UpdateCasoEspecialDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  requisitosAdicionales?: string;

  @IsOptional()
  @IsString()
  documentosAdicionales?: string;

  @IsOptional()
  @IsString()
  excepciones?: string;

  @IsOptional()
  @IsString()
  contacto?: string;
}

/** `GET /isma/casos-especiales/`. */
export class ListCasoEspecialQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    const v = typeof value === 'string' ? value.toLowerCase() : '';
    return v === 'true' ? true : v === 'false' ? false : undefined;
  })
  isActive?: boolean;
}

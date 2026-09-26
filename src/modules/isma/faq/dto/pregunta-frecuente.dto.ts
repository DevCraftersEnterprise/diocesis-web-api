import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../../common/pagination';

/** `POST /isma/preguntas-frecuentes/` (JSON). Sin `createdBy`. */
export class CreatePreguntaFrecuenteDto {
  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsString()
  @IsNotEmpty()
  answer!: string;

  @IsInt()
  @Min(1)
  order!: number;
}

/** `PUT /isma/preguntas-frecuentes/{id}/` — parcial. */
export class UpdatePreguntaFrecuenteDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  question?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  answer?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}

/** `GET /isma/preguntas-frecuentes/`. */
export class ListPreguntaFrecuenteQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    const v = typeof value === 'string' ? value.toLowerCase() : '';
    return v === 'true' ? true : v === 'false' ? false : undefined;
  })
  isActive?: boolean;
}

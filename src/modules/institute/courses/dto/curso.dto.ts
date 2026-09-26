import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../../common/pagination';
import {
  INSTITUTE_MODALITIES,
  type InstituteModality,
} from '../../trainings/entities/capacitacion.entity';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `POST /instituto-biblico/cursos/` (multipart, `picture` opcional). Sin `createdBy`.
 * `capacitacionId` opcional (decision Tarea 0.1: relacion no obligatoria).
 */
export class CreateCursoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsIn(INSTITUTE_MODALITIES)
  modality!: InstituteModality;

  @IsOptional()
  @IsUUID()
  capacitacionId?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: 'startDate debe tener formato YYYY-MM-DD.' })
  startDate?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: 'endDate debe tener formato YYYY-MM-DD.' })
  endDate?: string;

  @IsOptional()
  @IsUrl()
  meetingLink?: string;
}

/** `PUT /instituto-biblico/cursos/{id}/` — parcial. */
export class UpdateCursoDto {
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
  @IsIn(INSTITUTE_MODALITIES)
  modality?: InstituteModality;

  @IsOptional()
  @IsUUID()
  capacitacionId?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: 'startDate debe tener formato YYYY-MM-DD.' })
  startDate?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: 'endDate debe tener formato YYYY-MM-DD.' })
  endDate?: string;

  @IsOptional()
  @IsUrl()
  meetingLink?: string;
}

/** `GET /instituto-biblico/cursos/`. */
export class ListCursoQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsIn(INSTITUTE_MODALITIES)
  modality?: InstituteModality;

  @IsOptional()
  @IsUUID()
  capacitacionId?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    const v = typeof value === 'string' ? value.toLowerCase() : '';
    return v === 'true' ? true : v === 'false' ? false : undefined;
  })
  isActive?: boolean;
}

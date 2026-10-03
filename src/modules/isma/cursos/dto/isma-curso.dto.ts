import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../../common/pagination';
import {
  ISMA_MODALIDADES,
  type IsmaModalidad,
} from '../entities/isma-curso.entity';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** `POST /isma/cursos/gestion/` (JSON). */
export class CreateIsmaCursoDto {
  @IsUUID()
  parroquiaId!: string;

  @Matches(DATE_RE, { message: 'startDate debe tener formato YYYY-MM-DD.' })
  startDate!: string;

  @Matches(DATE_RE, { message: 'endDate debe tener formato YYYY-MM-DD.' })
  endDate!: string;

  /** 0 = domingo … 6 = sabado. Opcional: sin dia no se generan sesiones semanales. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana?: number;

  @IsOptional()
  @Matches(HORA_RE, { message: 'horaInicio debe tener formato HH:MM (24 h).' })
  horaInicio?: string;

  @IsOptional()
  @Matches(HORA_RE, { message: 'horaFin debe tener formato HH:MM (24 h).' })
  horaFin?: string;

  @IsIn(ISMA_MODALIDADES)
  modalidad!: IsmaModalidad;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  telefonoInformes?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}

/** `PUT /isma/cursos/gestion/{id}/` — parcial. */
export class UpdateIsmaCursoDto {
  @IsOptional()
  @IsUUID()
  parroquiaId?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: 'startDate debe tener formato YYYY-MM-DD.' })
  startDate?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: 'endDate debe tener formato YYYY-MM-DD.' })
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana?: number | null;

  @IsOptional()
  @Matches(HORA_RE, { message: 'horaInicio debe tener formato HH:MM (24 h).' })
  horaInicio?: string | null;

  @IsOptional()
  @Matches(HORA_RE, { message: 'horaFin debe tener formato HH:MM (24 h).' })
  horaFin?: string | null;

  @IsOptional()
  @IsIn(ISMA_MODALIDADES)
  modalidad?: IsmaModalidad;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  telefonoInformes?: string | null;

  @IsOptional()
  @IsString()
  notas?: string | null;
}

/** `GET /isma/cursos/` (publico): solo cursos activos que aun no terminan. */
export class ListIsmaCursoPublicQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  parroquiaId?: string;

  @IsOptional()
  @IsIn(ISMA_MODALIDADES)
  modalidad?: IsmaModalidad;
}

/** `GET /isma/cursos/gestion/` (admin): todos, incluidos terminados y deshabilitados. */
export class ListIsmaCursoGestionQueryDto extends ListIsmaCursoPublicQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    const v = typeof value === 'string' ? value.toLowerCase() : '';
    return v === 'true' ? true : v === 'false' ? false : undefined;
  })
  isActive?: boolean;
}

import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../../common/pagination';
import { EVENTO_TYPES, type EventoType } from '../entities/evento.entity';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** `POST /instituto-biblico/eventos/` (JSON). Sin `createdBy`. `cursoId`/`sedeId` opcionales. */
export class CreateEventoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(EVENTO_TYPES)
  type!: EventoType;

  @Matches(DATE_RE, { message: 'startDate debe tener formato YYYY-MM-DD.' })
  startDate!: string;

  @IsOptional()
  @Matches(DATE_RE, { message: 'endDate debe tener formato YYYY-MM-DD.' })
  endDate?: string;

  @IsOptional()
  @IsUUID()
  cursoId?: string;

  @IsOptional()
  @IsUUID()
  sedeId?: string;
}

/** `PUT /instituto-biblico/eventos/{id}/` — parcial. */
export class UpdateEventoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(EVENTO_TYPES)
  type?: EventoType;

  @IsOptional()
  @Matches(DATE_RE, { message: 'startDate debe tener formato YYYY-MM-DD.' })
  startDate?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: 'endDate debe tener formato YYYY-MM-DD.' })
  endDate?: string;

  @IsOptional()
  @IsUUID()
  cursoId?: string;

  @IsOptional()
  @IsUUID()
  sedeId?: string;
}

/**
 * `GET /instituto-biblico/eventos/`. `startDate__gte`/`startDate__lte` para que el
 * widget de calendario pida un rango completo (el frontend usa `page_size` alto en vez
 * de una respuesta plana, igual que ya hace con capacitaciones/cursos en la pagina
 * publica — se mantiene la forma de respuesta paginada uniforme de todo el proyecto).
 */
export class ListEventoQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(EVENTO_TYPES)
  type?: EventoType;

  @IsOptional()
  @IsUUID()
  cursoId?: string;

  @IsOptional()
  @IsUUID()
  sedeId?: string;

  @IsOptional()
  @Matches(DATE_RE, {
    message: 'startDate__gte debe tener formato YYYY-MM-DD.',
  })
  startDate__gte?: string;

  @IsOptional()
  @Matches(DATE_RE, {
    message: 'startDate__lte debe tener formato YYYY-MM-DD.',
  })
  startDate__lte?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    const v = typeof value === 'string' ? value.toLowerCase() : '';
    return v === 'true' ? true : v === 'false' ? false : undefined;
  })
  isActive?: boolean;
}

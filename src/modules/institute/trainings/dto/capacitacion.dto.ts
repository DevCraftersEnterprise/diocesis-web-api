import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../../common/pagination';
import {
  INSTITUTE_MODALITIES,
  type InstituteModality,
} from '../entities/capacitacion.entity';

/** `POST /instituto-biblico/capacitaciones/`. Sin `createdBy` (BUG-DJANGO-007). */
export class CreateCapacitacionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsIn(INSTITUTE_MODALITIES)
  modality!: InstituteModality;
}

/** `PUT /instituto-biblico/capacitaciones/{id}/` — parcial. */
export class UpdateCapacitacionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsIn(INSTITUTE_MODALITIES)
  modality?: InstituteModality;
}

/** `GET /instituto-biblico/capacitaciones/`. */
export class ListCapacitacionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(INSTITUTE_MODALITIES)
  modality?: InstituteModality;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    const v = typeof value === 'string' ? value.toLowerCase() : '';
    return v === 'true' ? true : v === 'false' ? false : undefined;
  })
  isActive?: boolean;
}

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../../common/pagination';

/** `POST /instituto-biblico/sedes/` (multipart, `picture` opcional). Sin `createdBy`. */
export class CreateSedeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsUrl()
  mapsUrl!: string;
}

/** `PUT /instituto-biblico/sedes/{id}/` — parcial. */
export class UpdateSedeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string;

  @IsOptional()
  @IsUrl()
  mapsUrl?: string;
}

/** `GET /instituto-biblico/sedes/`. */
export class ListSedeQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    const v = typeof value === 'string' ? value.toLowerCase() : '';
    return v === 'true' ? true : v === 'false' ? false : undefined;
  })
  isActive?: boolean;
}

import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** `POST /multimedia/`. */
export class CreateEnlaceMultimediaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  url!: string;
}

/** `PUT /multimedia/{id}/` — parcial. */
export class UpdateEnlaceMultimediaDto {
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
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  url?: string;
}

/** `PUT /multimedia/reordenar` — ids en el orden deseado, debe traer exactamente todos
 * los enlaces activos. */
export class ReorderEnlacesMultimediaDto {
  @IsArray()
  @IsUUID('4', { each: true })
  order!: string[];
}

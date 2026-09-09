import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * `POST /articulos/` (body JSON). `tags` llega como array; se normaliza en el servicio
 * con `parseTags` (comun a los 3 modulos de contenido).
 */
export class CreateArticuloDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  tags?: unknown;
}

/** `PUT /articulos/{id}/` — parcial. */
export class UpdateArticuloDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  @IsOptional()
  tags?: unknown;
}

import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * `POST /noticias/` (multipart/form-data). `picture` es el archivo, va aparte.
 * `tags` llega como string-JSON (`'["a","b"]'`); se normaliza en el servicio con
 * `parseTags` (comun a los 3 modulos de contenido). Sin `createdBy` (BUG-DJANGO-007).
 */
export class CreateNoticiaDto {
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

/** `PUT /noticias/{id}/` — parcial. */
export class UpdateNoticiaDto {
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

import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** `PUT /paginas/:slug` — parcial, sin crear/borrar (catalogo fijo de slugs). */
export class UpdatePaginaContenidoDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  /** HTML del editor enriquecido; se sanea igual en el frontend al mostrarlo. */
  @IsOptional()
  @IsString()
  body?: string;
}

/** `POST /paginas/:slug/imagenes` (multipart: `picture` + este body). */
export class AddPaginaImagenDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  caption?: string;
}

/** `PUT /paginas/:slug/imagenes/:id`. */
export class UpdatePaginaImagenDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  caption?: string;
}

/** `PUT /paginas/:slug/imagenes/reordenar` — ids en el orden deseado, debe incluir
 * exactamente todas las imagenes actuales de la pagina (se valida en el servicio). */
export class ReorderPaginaImagenesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  order!: string[];
}

import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ListTaggedContentQueryDto } from '../../../common/content';
import { DOCUMENT_TYPES } from '../entities/documento.entity';

/**
 * `POST /documentos/` (multipart/form-data). `document` es el archivo (obligatorio),
 * va aparte. `tags` llega como string-JSON; se normaliza en el servicio con `parseTags`.
 * `type` debe ser uno de los 9 `DOCUMENT_TYPE_CHOICES`. Sin `createdBy` (BUG-DJANGO-007).
 */
export class CreateDocumentoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsIn(DOCUMENT_TYPES, {
    message: `type debe ser uno de: ${DOCUMENT_TYPES.join(', ')}.`,
  })
  type!: string;

  @IsOptional()
  tags?: unknown;
}

/** `PUT /documentos/{id}/` — parcial. */
export class UpdateDocumentoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsIn(DOCUMENT_TYPES, {
    message: `type debe ser uno de: ${DOCUMENT_TYPES.join(', ')}.`,
  })
  type?: string;

  @IsOptional()
  tags?: unknown;
}

/**
 * `GET /documentos/`. Filtros de Django: `title` (icontains), `tags` (array jsonb),
 * `type` (exacto, sin validar), `isActive` (`true`/`false`).
 */
export class ListDocumentoQueryDto extends ListTaggedContentQueryDto {
  @IsOptional()
  @IsString()
  type?: string;
}

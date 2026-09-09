import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * `POST /carrusel/` (multipart). El archivo llega en el campo **`url`** (no en el DTO).
 * `isImage`: Django hace `request.data.get('isImage', 'true').lower() == 'true'` -> default
 * `true`; cualquier valor != `"true"` -> `false`.
 */
export class CreateCarruselDto {
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? true : value === 'true'))
  @IsBoolean()
  isImage?: boolean = true;
}

/** `PUT /carrusel/{id}/` — `isImage` opcional; ausente -> se conserva el valor actual. */
export class UpdateCarruselDto {
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === 'true',
  )
  @IsBoolean()
  isImage?: boolean;
}

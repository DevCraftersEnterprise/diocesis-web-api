import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../pagination';

/**
 * Query compartida de noticias / articulos / documentos. Filtros de Django: `title`
 * (icontains), `tags` (busqueda en el array jsonb), `isActive` (solo `true`/`false`
 * exactos -> filtra; cualquier otro -> sin filtro).
 */
export class ListTaggedContentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    const v = typeof value === 'string' ? value.toLowerCase() : '';
    return v === 'true' ? true : v === 'false' ? false : undefined;
  })
  isActive?: boolean;
}

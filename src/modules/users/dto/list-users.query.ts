import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination';

/**
 * Query de `GET /users/usuarios/`. Filtros de Django: `username` (icontains) e `isActive`
 * (cualquier valor != "true" filtra por `false`, como el `UsuarioAPIView.get`).
 */
export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() === 'true' : undefined,
  )
  isActive?: boolean;
}

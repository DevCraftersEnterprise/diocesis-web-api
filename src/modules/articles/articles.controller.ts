import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ListTaggedContentQueryDto } from '../../common/content';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { Paginated } from '../../common/pagination';
import { uuidParam } from '../../common/pipes/uuid-param.pipe';
import type { Usuario } from '../users/entities/usuario.entity';
import type { ArticuloResponse } from './articulo.response';
import { ArticlesService } from './articles.service';
import { CreateArticuloDto, UpdateArticuloDto } from './dto/articulo.dto';

/** `/api/articulos/`. Body JSON (sin subida de archivos). GET publico; escritura admin. */
@Controller('articulos')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  @Public()
  list(
    @Query() query: ListTaggedContentQueryDto,
  ): Promise<Paginated<ArticuloResponse>> {
    return this.articles.list(query);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateArticuloDto,
    @CurrentUser() me: Usuario,
  ): Promise<ArticuloResponse> {
    return this.articles.create(dto, me);
  }

  @Post('habilitar/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ detail: string }> {
    return this.articles.activate(id, me);
  }

  @Get(':id')
  @Public()
  detail(@Param('id', uuidParam()) id: string): Promise<ArticuloResponse> {
    return this.articles.detail(id);
  }

  @Put(':id')
  @Roles('admin')
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdateArticuloDto,
    @CurrentUser() me: Usuario,
  ): Promise<ArticuloResponse> {
    return this.articles.update(id, dto, me);
  }

  /** 204 sin cuerpo (Django devuelve 204 + body, HTTP invalido). */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<void> {
    return this.articles.softDelete(id, me);
  }
}

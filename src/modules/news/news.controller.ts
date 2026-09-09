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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ListTaggedContentQueryDto } from '../../common/content';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { Paginated } from '../../common/pagination';
import { uuidParam } from '../../common/pipes/uuid-param.pipe';
import type { Usuario } from '../users/entities/usuario.entity';
import { CreateNoticiaDto, UpdateNoticiaDto } from './dto/noticia.dto';
import { NewsService } from './news.service';
import type { NoticiaResponse } from './noticia.response';

const PICTURE_INTERCEPTOR = FileInterceptor('picture', {
  limits: { fileSize: 10 * 1024 * 1024 },
});

/** `/api/noticias/`. multipart/form-data (`picture` + `tags` string-JSON). GET publico. */
@Controller('noticias')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Get()
  @Public()
  list(
    @Query() query: ListTaggedContentQueryDto,
  ): Promise<Paginated<NoticiaResponse>> {
    return this.news.list(query);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(PICTURE_INTERCEPTOR)
  create(
    @Body() dto: CreateNoticiaDto,
    @UploadedFile() picture: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<NoticiaResponse> {
    return this.news.create(dto, picture, me);
  }

  @Post('habilitar/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ detail: string }> {
    return this.news.activate(id, me);
  }

  @Get(':id')
  @Public()
  detail(@Param('id', uuidParam()) id: string): Promise<NoticiaResponse> {
    return this.news.detail(id);
  }

  @Put(':id')
  @Roles('admin')
  @UseInterceptors(PICTURE_INTERCEPTOR)
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdateNoticiaDto,
    @UploadedFile() picture: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<NoticiaResponse> {
    return this.news.update(id, dto, picture, me);
  }

  /** 204 sin cuerpo (Django devuelve 204 + body, HTTP invalido). */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<void> {
    return this.news.softDelete(id, me);
  }
}

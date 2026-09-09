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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { Paginated } from '../../common/pagination';
import { uuidParam } from '../../common/pipes/uuid-param.pipe';
import type { Usuario } from '../users/entities/usuario.entity';
import {
  CreateDocumentoDto,
  ListDocumentoQueryDto,
  UpdateDocumentoDto,
} from './dto/documento.dto';
import type { DocumentoResponse } from './documento.response';
import { DocumentsService } from './documents.service';

const DOCUMENT_INTERCEPTOR = FileInterceptor('document', {
  limits: { fileSize: 22 * 1024 * 1024 },
});

/** `/api/documentos/`. multipart/form-data (`document` raw + `tags` string-JSON). GET publico. */
@Controller('documentos')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @Public()
  list(
    @Query() query: ListDocumentoQueryDto,
  ): Promise<Paginated<DocumentoResponse>> {
    return this.documents.list(query);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(DOCUMENT_INTERCEPTOR)
  create(
    @Body() dto: CreateDocumentoDto,
    @UploadedFile() document: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<DocumentoResponse> {
    return this.documents.create(dto, document, me);
  }

  @Post('habilitar/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<{ detail: string }> {
    return this.documents.activate(id, me);
  }

  @Get(':id')
  @Public()
  detail(@Param('id', uuidParam()) id: string): Promise<DocumentoResponse> {
    return this.documents.detail(id);
  }

  @Put(':id')
  @Roles('admin')
  @UseInterceptors(DOCUMENT_INTERCEPTOR)
  update(
    @Param('id', uuidParam()) id: string,
    @Body() dto: UpdateDocumentoDto,
    @UploadedFile() document: Express.Multer.File | undefined,
    @CurrentUser() me: Usuario,
  ): Promise<DocumentoResponse> {
    return this.documents.update(id, dto, document, me);
  }

  /** 204 sin cuerpo (Django devuelve 204 + body, HTTP invalido). */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', uuidParam()) id: string,
    @CurrentUser() me: Usuario,
  ): Promise<void> {
    return this.documents.softDelete(id, me);
  }
}

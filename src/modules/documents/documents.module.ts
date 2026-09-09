import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../../integrations/cloudinary/cloudinary.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { Documento } from './entities/documento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Documento]), CloudinaryModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}

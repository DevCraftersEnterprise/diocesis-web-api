import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../../integrations/cloudinary/cloudinary.module';
import { Noticia } from './entities/noticia.entity';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';

@Module({
  imports: [TypeOrmModule.forFeature([Noticia]), CloudinaryModule],
  controllers: [NewsController],
  providers: [NewsService],
})
export class NewsModule {}

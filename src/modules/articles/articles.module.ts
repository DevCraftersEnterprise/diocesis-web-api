import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { Articulo } from './entities/articulo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Articulo])],
  controllers: [ArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}

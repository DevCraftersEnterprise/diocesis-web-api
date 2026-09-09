import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../../integrations/cloudinary/cloudinary.module';
import { CarouselController } from './carousel.controller';
import { CarouselService } from './carousel.service';
import { Carrusel } from './entities/carrusel.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Carrusel]), CloudinaryModule],
  controllers: [CarouselController],
  providers: [CarouselService],
})
export class CarouselModule {}

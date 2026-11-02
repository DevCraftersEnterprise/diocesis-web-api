import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../../integrations/cloudinary/cloudinary.module';
import { DescargasController } from './descargas.controller';
import { DescargasService } from './descargas.service';
import { Descarga } from './entities/descarga.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Descarga]), CloudinaryModule],
  controllers: [DescargasController],
  providers: [DescargasService],
})
export class DescargasModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../../integrations/cloudinary/cloudinary.module';
import { Padre } from './entities/padre.entity';
import { PadresController } from './padres.controller';
import { PadresService } from './padres.service';

/** Modulo de padres (`/api/padres/`). Carpeta `reverends/` (ADR-003), ruta `padres`. */
@Module({
  imports: [TypeOrmModule.forFeature([Padre]), CloudinaryModule],
  controllers: [PadresController],
  providers: [PadresService],
})
export class ReverendsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../../integrations/cloudinary/cloudinary.module';
import { Colonia } from '../colonies/entities/colonia.entity';
import { Decanato } from '../decanates/entities/decanato.entity';
import { Padre } from '../reverends/entities/padre.entity';
import { Parroquia } from './entities/parroquia.entity';
import { ParishesController } from './parishes.controller';
import { ParishesService } from './parishes.service';

@Module({
  imports: [
    // Decanato/Colonia/Padre: solo para validar existencia de FK al crear/editar.
    TypeOrmModule.forFeature([Parroquia, Decanato, Colonia, Padre]),
    CloudinaryModule,
  ],
  controllers: [ParishesController],
  providers: [ParishesService],
})
export class ParishesModule {}

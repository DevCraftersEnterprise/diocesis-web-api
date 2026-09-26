import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../../../integrations/cloudinary/cloudinary.module';
import { Capacitacion } from '../trainings/entities/capacitacion.entity';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { Curso } from './entities/curso.entity';

@Module({
  imports: [
    // Capacitacion: solo para validar existencia de FK opcional al crear/editar.
    TypeOrmModule.forFeature([Curso, Capacitacion]),
    CloudinaryModule,
  ],
  controllers: [CoursesController],
  providers: [CoursesService],
})
export class CoursesModule {}

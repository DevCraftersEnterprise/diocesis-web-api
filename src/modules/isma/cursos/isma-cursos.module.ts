import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parroquia } from '../../parishes/entities/parroquia.entity';
import { IsmaCurso } from './entities/isma-curso.entity';
import { IsmaCursosController } from './isma-cursos.controller';
import { IsmaCursosService } from './isma-cursos.service';

@Module({
  imports: [TypeOrmModule.forFeature([IsmaCurso, Parroquia])],
  controllers: [IsmaCursosController],
  providers: [IsmaCursosService],
})
export class IsmaCursosModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Curso } from '../courses/entities/curso.entity';
import { Sede } from '../venues/entities/sede.entity';
import { Evento } from './entities/evento.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [
    // Curso/Sede: solo para validar existencia de FK opcional al crear/editar.
    TypeOrmModule.forFeature([Evento, Curso, Sede]),
  ],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}

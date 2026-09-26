import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Capacitacion } from './entities/capacitacion.entity';
import { TrainingsController } from './trainings.controller';
import { TrainingsService } from './trainings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Capacitacion])],
  controllers: [TrainingsController],
  providers: [TrainingsService],
})
export class TrainingsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaqController } from './faq.controller';
import { FaqService } from './faq.service';
import { PreguntaFrecuente } from './entities/pregunta-frecuente.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PreguntaFrecuente])],
  controllers: [FaqController],
  providers: [FaqService],
})
export class FaqModule {}

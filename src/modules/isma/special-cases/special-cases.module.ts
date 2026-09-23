import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CasoEspecial } from './entities/caso-especial.entity';
import { SpecialCasesController } from './special-cases.controller';
import { SpecialCasesService } from './special-cases.service';

@Module({
  imports: [TypeOrmModule.forFeature([CasoEspecial])],
  controllers: [SpecialCasesController],
  providers: [SpecialCasesService],
})
export class SpecialCasesModule {}

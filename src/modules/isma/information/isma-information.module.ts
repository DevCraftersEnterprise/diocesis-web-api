import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IsmaInformacion } from './entities/isma-informacion.entity';
import { IsmaInformationController } from './isma-information.controller';
import { IsmaInformationService } from './isma-information.service';

@Module({
  imports: [TypeOrmModule.forFeature([IsmaInformacion])],
  controllers: [IsmaInformationController],
  providers: [IsmaInformationService],
})
export class IsmaInformationModule {}

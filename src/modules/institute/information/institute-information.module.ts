import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutoInformacion } from './entities/instituto-informacion.entity';
import { InstituteInformationController } from './institute-information.controller';
import { InstituteInformationService } from './institute-information.service';

@Module({
  imports: [TypeOrmModule.forFeature([InstitutoInformacion])],
  controllers: [InstituteInformationController],
  providers: [InstituteInformationService],
})
export class InstituteInformationModule {}

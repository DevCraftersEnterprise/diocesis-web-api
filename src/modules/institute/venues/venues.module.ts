import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../../../integrations/cloudinary/cloudinary.module';
import { Sede } from './entities/sede.entity';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';

@Module({
  imports: [TypeOrmModule.forFeature([Sede]), CloudinaryModule],
  controllers: [VenuesController],
  providers: [VenuesService],
})
export class VenuesModule {}

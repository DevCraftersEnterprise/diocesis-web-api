import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ColoniesController } from './colonies.controller';
import { ColoniesService } from './colonies.service';
import { Colonia } from './entities/colonia.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Colonia])],
  controllers: [ColoniesController],
  providers: [ColoniesService],
})
export class ColoniesModule {}

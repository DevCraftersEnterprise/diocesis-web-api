import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnlaceMultimedia } from './entities/enlace-multimedia.entity';
import { MultimediaController } from './multimedia.controller';
import { MultimediaService } from './multimedia.service';

@Module({
  imports: [TypeOrmModule.forFeature([EnlaceMultimedia])],
  controllers: [MultimediaController],
  providers: [MultimediaService],
})
export class MultimediaModule {}

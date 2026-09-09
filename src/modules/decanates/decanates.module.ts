import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DecanatesController } from './decanates.controller';
import { DecanatesService } from './decanates.service';
import { Decanato } from './entities/decanato.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Decanato])],
  controllers: [DecanatesController],
  providers: [DecanatesService],
})
export class DecanatesModule {}

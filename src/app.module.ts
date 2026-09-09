import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { LoggingModule } from './common/logging/logging.module';
import { configuration } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { AuthModule } from './modules/auth/auth.module';
import { CarouselModule } from './modules/carousel/carousel.module';
import { ParishesModule } from './modules/parishes/parishes.module';
import { ColoniesModule } from './modules/colonies/colonies.module';
import { DecanatesModule } from './modules/decanates/decanates.module';
import { ReverendsModule } from './modules/reverends/reverends.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
      load: [configuration],
    }),
    LoggingModule,
    DatabaseModule,
    CommonModule,
    HealthModule,
    AuthModule,
    UsersModule,
    DecanatesModule,
    ColoniesModule,
    ReverendsModule,
    CarouselModule,
    ParishesModule,
    ArticlesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

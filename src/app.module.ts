import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { LoggingModule } from './common/logging/logging.module';
import type { Config } from './config/config.types';
import { configuration } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { AuthModule } from './modules/auth/auth.module';
import { CarouselModule } from './modules/carousel/carousel.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { NewsModule } from './modules/news/news.module';
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
    // SECURITY-006: rate limiting SOLO en los endpoints sensibles de auth
    // (login / change-password / reset-password), que lo activan con
    // `@UseGuards(ThrottlerGuard)`. No hay `APP_GUARD` global -> el resto de la API
    // no cambia de comportamiento.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const throttle = config.getOrThrow<Config['throttle']>(
          'app-config.throttle',
        );
        return {
          throttlers: [
            {
              name: 'auth',
              limit: throttle.authLimit,
              ttl: throttle.authTtlMs,
            },
          ],
          errorMessage:
            'Demasiados intentos. Intentalo de nuevo en un momento.',
        };
      },
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
    NewsModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

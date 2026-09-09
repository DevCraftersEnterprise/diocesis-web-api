import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { buildCorsOptions } from './common/cors.config';
import type { Config } from './config/config.types';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.flushLogs();

  const config = app.get(ConfigService);
  app.enableCors(
    buildCorsOptions(config.getOrThrow<Config['cors']>('app-config.cors')),
  );

  await app.listen(config.getOrThrow<number>('app-config.app.port'));
}
void bootstrap();

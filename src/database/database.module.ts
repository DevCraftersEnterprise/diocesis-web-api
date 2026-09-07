import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { Config } from '../config/config.types';
import { buildDataSourceOptions } from './database.options';

/**
 * Unico punto de acceso a PostgreSQL. Configura el pool via `ConfigService` (no lee
 * `process.env` directamente) y verifica la conexion al arrancar con un `SELECT 1`:
 * si la BD no responde, el proceso no queda "arriba pero roto".
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.getOrThrow<Config['database']>('app-config.database');
        const nodeEnv = config.getOrThrow<Config['app']['nodeEnv']>(
          'app-config.app.nodeEnv',
        );
        return {
          ...buildDataSourceOptions(db),
          autoLoadEntities: true,
          retryAttempts: nodeEnv === 'test' ? 1 : 5,
          retryDelay: 1500,
        };
      },
    }),
  ],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.dataSource.query('SELECT 1');
    this.logger.log('Conexion a PostgreSQL verificada (SELECT 1)');
  }
}

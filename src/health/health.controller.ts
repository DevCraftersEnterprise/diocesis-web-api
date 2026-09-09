import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

/**
 * `GET /health` (Tarea 1.8). Queda **fuera** del prefijo `/api` (ver `setGlobalPrefix`
 * con `exclude` en Tarea 1.10) para que los health checks de la plataforma no dependan
 * del contrato de la API. 200 si la BD responde; 503 si no.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}

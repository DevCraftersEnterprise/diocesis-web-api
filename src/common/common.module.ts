import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

/**
 * Infraestructura transversal registrada globalmente via tokens `APP_*`. Se declara como
 * modulo (en vez de `app.useGlobalFilters(...)` en `main.ts`) para que tambien aplique en
 * los tests e2e, que arrancan la app desde `AppModule`.
 *
 * Aqui iran tambien el `ValidationPipe` global (1.5) y los interceptores (1.6/1.7).
 */
@Module({
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class CommonModule {}

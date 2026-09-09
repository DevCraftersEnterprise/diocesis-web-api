import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { createValidationPipe } from './pipes/validation.config';

/**
 * Infraestructura transversal registrada globalmente via tokens `APP_*`. Se declara como
 * modulo (en vez de `app.useGlobalFilters(...)` en `main.ts`) para que tambien aplique en
 * los tests e2e, que arrancan la app desde `AppModule`.
 *
 * Aqui iran tambien los interceptores (1.6/1.7).
 */
@Module({
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_PIPE, useFactory: createValidationPipe },
  ],
})
export class CommonModule {}

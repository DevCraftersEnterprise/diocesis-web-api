import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

/**
 * Aplana los `ValidationError` de class-validator a la forma de `serializer.errors` de DRF:
 * `{ "<campo>": ["mensaje", ...] }`. Los errores anidados usan ruta con puntos
 * (`direccion.calle`). Sin `constraints` ni hijos -> `{ "<campo>": ["Valor invalido."] }`.
 */
export function formatValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      result[path] = Object.values(error.constraints);
    }

    if (error.children && error.children.length > 0) {
      Object.assign(result, formatValidationErrors(error.children, path));
    }

    if (!error.constraints && !error.children?.length) {
      result[path] = ['Valor invalido.'];
    }
  }

  return result;
}

/**
 * `ValidationPipe` global (Tarea 1.5). `whitelist` descarta props desconocidas (DRF
 * tambien las ignora); `transform` instancia los DTO y castea tipos. El
 * `exceptionFactory` produce la forma DRF, que `AllExceptionsFilter` devuelve tal cual.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    stopAtFirstError: false,
    exceptionFactory: (errors: ValidationError[]) =>
      new BadRequestException(formatValidationErrors(errors)),
  });
}

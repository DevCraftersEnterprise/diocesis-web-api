import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Cuerpo de error homogeneo (APIC-004).
 *
 * DRF mezcla tres formas: `{ detail }` para sus `APIException` (401/403/404/405), y
 * `{ "<campo>": [msgs] }` / `{ error }` para validacion y errores de negocio. Este filtro
 * las respeta:
 *
 * - Mensaje escalar (string, o forma por defecto de Nest `{ statusCode, message, error }`)
 *   -> se aplana a `{ detail: "<mensaje>" }` (lo que lee hoy `login.ts` del frontend).
 * - Cuerpo de objeto propio del controlador/pipe (`{ campo: [...] }`, `{ error }`,
 *   `{ detail }`) -> pasa TAL CUAL.
 * - Cualquier 5xx (incluida `InternalServerErrorException` con mensaje) -> cuerpo generico
 *   `{ detail: "Error interno del servidor." }` y traza completa solo al log del servidor
 *   (BUG-DJANGO-004: nunca filtrar internals al cliente).
 */
export type ErrorBody = Record<string, unknown>;

const GENERIC_5XX_MESSAGE = 'Error interno del servidor.';
/** `HttpStatus.INTERNAL_SERVER_ERROR` como number: evita la friccion de comparar contra el enum. */
const SERVER_ERROR_STATUS = 500;

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { status, body } = this.resolve(exception);

    if (status >= SERVER_ERROR_STATUS) {
      this.logger.error(
        `${req.method} ${req.originalUrl} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json(body);
  }

  private resolve(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= SERVER_ERROR_STATUS) {
        return { status, body: { detail: GENERIC_5XX_MESSAGE } };
      }
      return { status, body: normalizeBody(exception.getResponse()) };
    }
    return {
      status: SERVER_ERROR_STATUS,
      body: { detail: GENERIC_5XX_MESSAGE },
    };
  }
}

/** Aplana la forma por defecto de Nest a `{ detail }`; deja intactos los cuerpos propios. */
function normalizeBody(response: string | object): ErrorBody {
  if (typeof response === 'string') {
    return { detail: response };
  }

  const obj = response as Record<string, unknown>;
  const isNestDefaultShape =
    'message' in obj && ('statusCode' in obj || 'error' in obj);

  if (isNestDefaultShape) {
    const message = obj.message;
    return {
      detail: Array.isArray(message)
        ? (message as unknown[]).map((m) => String(m)).join('; ')
        : String(message),
    };
  }

  return obj;
}

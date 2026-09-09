import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

interface CapturedResponse {
  status: jest.Mock;
  json: jest.Mock;
  statusCode: number;
  body: unknown;
}

function makeResponse(): CapturedResponse {
  const res: CapturedResponse = {
    statusCode: 0,
    body: undefined,
    status: jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((payload: unknown) => {
      res.body = payload;
      return res;
    }),
  };
  return res;
}

function makeHost(res: CapturedResponse): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: <T>() => res as T,
      getRequest: <T>() => ({ method: 'GET', originalUrl: '/api/x' }) as T,
      getNext: <T>() => undefined as T,
    }),
  } as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let res: CapturedResponse;
  let errorLog: jest.SpyInstance;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    res = makeResponse();
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('aplana HttpException sin mensaje a { detail } conservando el status', () => {
    filter.catch(new NotFoundException(), makeHost(res));

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ detail: 'Not Found' });
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('usa el mensaje explicito de la excepcion como detail', () => {
    filter.catch(
      new NotFoundException('Decanato no encontrado'),
      makeHost(res),
    );

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ detail: 'Decanato no encontrado' });
  });

  it('mantiene { detail } en 403 (contrato del frontend)', () => {
    filter.catch(new ForbiddenException('No autorizado.'), makeHost(res));

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ detail: 'No autorizado.' });
  });

  it('pasa TAL CUAL un cuerpo de validacion { campo: [msgs] }', () => {
    filter.catch(
      new BadRequestException({ name: ['Este campo es requerido.'] }),
      makeHost(res),
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ name: ['Este campo es requerido.'] });
  });

  it('pasa TAL CUAL un cuerpo de negocio { error }', () => {
    filter.catch(
      new BadRequestException({ error: 'No se proporciono un archivo CSV.' }),
      makeHost(res),
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'No se proporciono un archivo CSV.' });
  });

  it('junta un message array en un unico detail', () => {
    filter.catch(new BadRequestException(['a', 'b']), makeHost(res));

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ detail: 'a; b' });
  });

  it('respeta status y mensaje de un HttpException arbitrario < 500', () => {
    filter.catch(new HttpException('soy una tetera', 418), makeHost(res));

    expect(res.statusCode).toBe(418);
    expect(res.body).toEqual({ detail: 'soy una tetera' });
  });

  it('convierte cualquier error no-HTTP en 500 generico y lo loguea', () => {
    filter.catch(new Error('la base de datos exploto'), makeHost(res));

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ detail: 'Error interno del servidor.' });
    expect(JSON.stringify(res.body)).not.toContain('exploto');
    expect(errorLog).toHaveBeenCalledTimes(1);
  });

  it('NO filtra el mensaje de una InternalServerErrorException', () => {
    filter.catch(
      new InternalServerErrorException('detalle secreto interno'),
      makeHost(res),
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ detail: 'Error interno del servidor.' });
    expect(JSON.stringify(res.body)).not.toContain('secreto');
    expect(errorLog).toHaveBeenCalledTimes(1);
  });
});

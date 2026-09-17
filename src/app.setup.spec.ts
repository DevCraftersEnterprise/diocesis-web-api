import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { configureApp } from './app.setup';
import type { Config } from './config/config.types';

function makeApp() {
  const expressInstance = { set: jest.fn() };
  const httpAdapter = {
    getInstance: jest.fn().mockReturnValue(expressInstance),
  };
  const app = {
    setGlobalPrefix: jest.fn(),
    enableCors: jest.fn(),
    getHttpAdapter: jest.fn().mockReturnValue(httpAdapter),
  } as unknown as INestApplication;
  return { app, expressInstance };
}

function makeConfig(nodeEnv: Config['app']['nodeEnv']) {
  const config = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'app-config.cors') return { origins: [] };
      if (key === 'app-config.app') return { nodeEnv, port: 3000 };
      throw new Error(`clave inesperada: ${key}`);
    }),
  } as unknown as ConfigService;
  return config;
}

describe('configureApp', () => {
  it('activa "trust proxy" en produccion (Render esta detras de un proxy)', () => {
    const { app, expressInstance } = makeApp();
    configureApp(app, makeConfig('production'));
    expect(expressInstance.set).toHaveBeenCalledWith('trust proxy', 1);
  });

  it('NO activa "trust proxy" fuera de produccion (dev/test no tienen proxy real)', () => {
    const { app: appDev, expressInstance: instDev } = makeApp();
    configureApp(appDev, makeConfig('development'));
    expect(instDev.set).not.toHaveBeenCalled();

    const { app: appTest, expressInstance: instTest } = makeApp();
    configureApp(appTest, makeConfig('test'));
    expect(instTest.set).not.toHaveBeenCalled();
  });

  it('siempre fija el prefijo global y CORS', () => {
    const { app } = makeApp();
    configureApp(app, makeConfig('development'));
    expect(app.setGlobalPrefix).toHaveBeenCalledWith('api', {
      exclude: ['health'],
    });
    expect(app.enableCors).toHaveBeenCalled();
  });
});

import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api -> 200 "Hello World!" (prefijo global)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });

  it('GET /api/ -> 200 (tolera barra final; el FE siempre la envia)', () => {
    return request(app.getHttpServer())
      .get('/api/')
      .expect(200)
      .expect('Hello World!');
  });

  it('GET / (sin prefijo) -> 404', () => {
    return request(app.getHttpServer()).get('/').expect(404);
  });

  it('ruta inexistente bajo /api -> 404 JSON con { detail } (AllExceptionsFilter)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/ruta-que-no-existe')
      .expect(404)
      .expect('Content-Type', /json/);

    expect(typeof (res.body as { detail?: unknown }).detail).toBe('string');
    expect(res.body).not.toHaveProperty('statusCode');
  });

  it('GET /health y /health/ -> 200 (excluidos del prefijo /api)', async () => {
    const body = { status: 'ok', details: { database: { status: 'up' } } };

    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject(body));

    await request(app.getHttpServer())
      .get('/health/')
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject(body));
  });

  it('GET /api/health -> 404 (health NO vive bajo el prefijo)', () => {
    return request(app.getHttpServer()).get('/api/health').expect(404);
  });
});

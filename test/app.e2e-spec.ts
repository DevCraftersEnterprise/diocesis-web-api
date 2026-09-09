import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('ruta inexistente -> 404 JSON con { detail } (AllExceptionsFilter)', async () => {
    const res = await request(app.getHttpServer())
      .get('/ruta-que-no-existe')
      .expect(404)
      .expect('Content-Type', /json/);

    expect(typeof (res.body as { detail?: unknown }).detail).toBe('string');
    expect(res.body).not.toHaveProperty('statusCode');
  });

  afterEach(async () => {
    await app.close();
  });
});

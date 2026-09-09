import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { In, Repository } from 'typeorm';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { Usuario } from './../src/modules/users/entities/usuario.entity';
import { seedUser, type SeededUser } from './helpers/seed-user';

const LIMIT = 3;

/**
 * SECURITY-006: rate limiting de los endpoints sensibles de auth. Baja el limite por env
 * antes de compilar el modulo (`configuration()` corre en `compile()`); el resto de la
 * suite usa `THROTTLE_AUTH_LIMIT=1000` de `.env.test`.
 */
describe('Rate limiting de auth (e2e)', () => {
  let app: INestApplication<App>;
  let userRepo: Repository<Usuario>;
  let admin: SeededUser;

  beforeAll(async () => {
    process.env.THROTTLE_AUTH_LIMIT = String(LIMIT);
    process.env.THROTTLE_AUTH_TTL_MS = '60000';

    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = fixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    userRepo = app.get(getRepositoryToken(Usuario));
    admin = await seedUser(userRepo, { role: 'admin' });
  });

  afterAll(async () => {
    delete process.env.THROTTLE_AUTH_LIMIT;
    delete process.env.THROTTLE_AUTH_TTL_MS;
    await userRepo.delete({ id: In([admin.id]) });
    await app.close();
  });

  it(`POST /api/token/login/ -> 429 { detail } tras ${LIMIT} intentos en la ventana`, async () => {
    for (let i = 0; i < LIMIT; i++) {
      await request(app.getHttpServer())
        .post('/api/token/login/')
        .send({ username: admin.username, password: 'no-es-la-buena' })
        .expect(401);
    }

    const blocked = await request(app.getHttpServer())
      .post('/api/token/login/')
      .send({ username: admin.username, password: admin.password })
      .expect(429);
    expect(blocked.body).toEqual({
      detail: 'Demasiados intentos. Intentalo de nuevo en un momento.',
    });
  });

  it('un endpoint no sensible (GET /api/decanatos/) no esta limitado', async () => {
    for (let i = 0; i < LIMIT + 3; i++) {
      await request(app.getHttpServer()).get('/api/decanatos/').expect(200);
    }
  });
});

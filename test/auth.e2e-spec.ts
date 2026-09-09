import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { Usuario } from './../src/modules/users/entities/usuario.entity';

/**
 * Login end-to-end contra el oraculo (contenedor :5433). Siembra un usuario temporal con
 * un hash PBKDF2 formato Django (contrasena conocida) para ejercer el verificador heredado
 * y el rehash a argon2id (ADR-002). Limpia el usuario al terminar.
 */
const PLAIN = 'e2e-login-test-pw';
const PBKDF2_HASH =
  'pbkdf2_sha256$390000$e2eSalt12345$9CqJDKeuYCCYzQ1aZjl34BCOsGHYX84XQyuXmKa4mMM=';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let repo: Repository<Usuario>;
  const username = `e2e_login_tmp_${randomUUID().slice(0, 8)}`;
  const userId = randomUUID();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    repo = app.get<Repository<Usuario>>(getRepositoryToken(Usuario));
    await repo.insert({
      id: userId,
      username,
      email: `${username}@example.test`,
      password: PBKDF2_HASH,
      role: 'user',
      isActive: true,
      isActiveAuth: true,
      isStaff: false,
      isSuperuser: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    await repo.delete({ id: userId });
    await app.close();
  });

  it('POST /api/token/login/ con credenciales validas -> 200 { access, refresh }', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/token/login/')
      .send({ username, password: PLAIN })
      .expect(200);

    expect(typeof (res.body as { access?: unknown }).access).toBe('string');
    expect(typeof (res.body as { refresh?: unknown }).refresh).toBe('string');
    expect((res.body as { access: string }).access.split('.')).toHaveLength(3);
  });

  it('rehashea el PBKDF2 heredado a argon2id y lo persiste', async () => {
    const row = await repo.findOneByOrFail({ id: userId });
    expect(row.password.startsWith('$argon2id$')).toBe(true);
  });

  it('POST /api/token/login/ con contrasena incorrecta -> 401 con el cuerpo de simplejwt', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/token/login/')
      .send({ username, password: 'mala' })
      .expect(401);

    expect(res.body).toEqual({
      detail: 'No active account found with the given credentials',
    });
  });

  it('POST /api/token/refresh/ con un refresh valido -> 200 { access }', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/token/login/')
      .send({ username, password: PLAIN })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post('/api/token/refresh/')
      .send({ refresh: (login.body as { refresh: string }).refresh })
      .expect(200);

    expect(typeof (res.body as { access?: unknown }).access).toBe('string');
  });

  it('POST /api/token/login/ sin body -> 400 con forma DRF { campo: [msgs] }', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/token/login/')
      .send({})
      .expect(400);

    expect(res.body).toHaveProperty('username');
    expect(res.body).toHaveProperty('password');
  });
});

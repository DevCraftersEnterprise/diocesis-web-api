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

const BASE = '/api/users/usuarios';

describe('Users read (e2e)', () => {
  let app: INestApplication<App>;
  let repo: Repository<Usuario>;
  let admin: SeededUser;
  let plain: SeededUser;
  let adminToken: string;
  let plainToken: string;

  const login = async (u: SeededUser): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/token/login/')
      .send({ username: u.username, password: u.password })
      .expect(200);
    return (res.body as { access: string }).access;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    repo = app.get<Repository<Usuario>>(getRepositoryToken(Usuario));
    admin = await seedUser(repo, { role: 'admin' });
    plain = await seedUser(repo, { role: 'user' });
    adminToken = await login(admin);
    plainToken = await login(plain);
  });

  afterAll(async () => {
    await repo.delete({ id: In([admin.id, plain.id]) });
    await app.close();
  });

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  it('sin token -> 401', () =>
    request(app.getHttpServer()).get(`${BASE}/`).expect(401));

  it('GET / como user -> 403 (lista solo admin/super, BUG-DJANGO-008)', () =>
    request(app.getHttpServer())
      .get(`${BASE}/`)
      .set(auth(plainToken))
      .expect(403));

  it('GET / como admin -> 200 paginado, excluye al propio', async () => {
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=100`)
      .set(auth(adminToken))
      .expect(200);

    const body = res.body as { count: number; results: { id: string }[] };
    expect(Array.isArray(body.results)).toBe(true);
    expect(typeof body.count).toBe('number');
    expect(body.results.some((u) => u.id === admin.id)).toBe(false);
    expect(body.results.some((u) => u.id === plain.id)).toBe(true);
  });

  it('GET /me -> 200 perfil propio, sin password', async () => {
    const res = await request(app.getHttpServer())
      .get(`${BASE}/me`)
      .set(auth(plainToken))
      .expect(200);

    const body = res.body as Record<string, unknown>;
    expect(body.id).toBe(plain.id);
    expect(body.username).toBe(plain.username);
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('is_active');
  });

  it('GET /:id propio -> 200 (lo usa Auth.loadProfile)', () =>
    request(app.getHttpServer())
      .get(`${BASE}/${plain.id}`)
      .set(auth(plainToken))
      .expect(200));

  it('GET /:id ajeno como user -> 403 (cierra IDOR)', () =>
    request(app.getHttpServer())
      .get(`${BASE}/${admin.id}`)
      .set(auth(plainToken))
      .expect(403));

  it('GET /:id ajeno como admin -> 200', () =>
    request(app.getHttpServer())
      .get(`${BASE}/${plain.id}`)
      .set(auth(adminToken))
      .expect(200));

  it('GET /<no-uuid> -> 404 (como el converter <uuid:pk> de Django)', () =>
    request(app.getHttpServer())
      .get(`${BASE}/no-es-uuid`)
      .set(auth(adminToken))
      .expect(404));
});

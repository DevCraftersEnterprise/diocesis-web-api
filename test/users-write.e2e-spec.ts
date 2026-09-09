import { randomUUID } from 'node:crypto';
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

describe('Users write (e2e)', () => {
  let app: INestApplication<App>;
  let repo: Repository<Usuario>;
  let admin: SeededUser;
  let target: SeededUser;
  let adminToken: string;
  const createdIds: string[] = [];

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = fixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    repo = app.get<Repository<Usuario>>(getRepositoryToken(Usuario));
    admin = await seedUser(repo, { role: 'admin' });
    target = await seedUser(repo, { role: 'user' });

    const res = await request(app.getHttpServer())
      .post('/api/token/login/')
      .send({ username: admin.username, password: admin.password })
      .expect(200);
    adminToken = (res.body as { access: string }).access;
  });

  afterAll(async () => {
    await repo.delete({ id: In([admin.id, target.id, ...createdIds]) });
    await app.close();
  });

  it('POST / crea un usuario y devuelve el objeto plano (201, sin password)', async () => {
    const username = `e2e_new_${randomUUID().slice(0, 8)}`;
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({
        username,
        email: `${username}@x.test`,
        role: 'user',
        password: 'una-clave-larga',
      })
      .expect(201);

    const body = res.body as Record<string, unknown>;
    createdIds.push(body.id as string);
    expect(body.username).toBe(username);
    expect(body.role).toBe('user');
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('mensaje');
  });

  it('POST / username duplicado -> 400 { error }', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({
        username: target.username,
        email: 'dup@x.test',
        role: 'user',
        password: 'una-clave-larga',
      })
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('error')));

  it('POST / contrasena debil -> 400 { password: [...] }', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({
        username: `e2e_weak_${randomUUID().slice(0, 6)}`,
        email: 'weak@x.test',
        role: 'user',
        password: '123',
      })
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('password')));

  it('POST / sin role -> 400 (BUG-DJANGO-009)', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({ username: 'x', email: 'x@x.test', password: 'una-clave-larga' })
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('role')));

  it('PUT /:id edita (200, objeto plano); el body no admite password', async () => {
    const res = await request(app.getHttpServer())
      .put(`${BASE}/${target.id}`)
      .set(auth(adminToken))
      .send({ email: 'nuevo@x.test', password: 'ignorada' })
      .expect(200);

    expect((res.body as { email: string }).email).toBe('nuevo@x.test');
    const row = await repo.findOneByOrFail({ id: target.id });
    expect(row.password.startsWith('$argon2id$')).toBe(true); // sin cambiar
  });

  it('PUT /cambiar-estado/:id togglea ambos flags y devuelve { mensaje }', async () => {
    const res = await request(app.getHttpServer())
      .put(`${BASE}/cambiar-estado/${target.id}`)
      .set(auth(adminToken))
      .send({})
      .expect(200);

    expect((res.body as { mensaje: string }).mensaje).toMatch(/desactivado/);
    const row = await repo.findOneByOrFail({ id: target.id });
    expect(row.isActive).toBe(false);
    expect(row.isActiveAuth).toBe(false);
    expect(row.deletedAt).not.toBeNull();
  });

  it('DELETE /:id -> 204 sin cuerpo, soft-delete con ambos flags', async () => {
    const victim = await seedUser(repo, { role: 'user' });
    createdIds.push(victim.id);

    const res = await request(app.getHttpServer())
      .delete(`${BASE}/${victim.id}`)
      .set(auth(adminToken))
      .expect(204);
    expect(res.body).toEqual({});

    const row = await repo.findOneByOrFail({ id: victim.id });
    expect(row.isActive).toBe(false);
    expect(row.isActiveAuth).toBe(false);
    expect(row.deletedById).toBe(admin.id);
  });

  it('POST / como user -> 403', async () => {
    const user = await seedUser(repo, { role: 'user' });
    createdIds.push(user.id);
    const login = await request(app.getHttpServer())
      .post('/api/token/login/')
      .send({ username: user.username, password: user.password })
      .expect(200);

    await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth((login.body as { access: string }).access))
      .send({
        username: 'nope',
        email: 'n@x.test',
        role: 'user',
        password: 'una-clave-larga',
      })
      .expect(403);
  });
});

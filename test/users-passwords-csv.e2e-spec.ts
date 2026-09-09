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

describe('Users passwords + CSV (e2e)', () => {
  let app: INestApplication<App>;
  let repo: Repository<Usuario>;
  let admin: SeededUser;
  let user: SeededUser;
  let adminToken: string;
  let userToken: string;
  const createdUsernames: string[] = [];

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const login = async (u: { username: string; password: string }) => {
    const r = await request(app.getHttpServer())
      .post('/api/token/login/')
      .send({ username: u.username, password: u.password })
      .expect(200);
    return (r.body as { access: string }).access;
  };

  beforeAll(async () => {
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = fixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    repo = app.get<Repository<Usuario>>(getRepositoryToken(Usuario));
    admin = await seedUser(repo, { role: 'admin' });
    user = await seedUser(repo, { role: 'user', password: 'clave-actual-1' });
    adminToken = await login(admin);
    userToken = await login(user);
  });

  afterAll(async () => {
    const victims = await repo.find({
      where: { username: In(createdUsernames) },
    });
    await repo.delete({
      id: In([admin.id, user.id, ...victims.map((v) => v.id)]),
    });
    await app.close();
  });

  it('PUT /change-password con actual incorrecta -> 400 { current_password }', () =>
    request(app.getHttpServer())
      .put(`${BASE}/change-password`)
      .set(auth(userToken))
      .send({ current_password: 'mala', new_password: 'otra-clave-larga' })
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('current_password')));

  it('PUT /change-password con nueva debil -> 400 { new_password }', () =>
    request(app.getHttpServer())
      .put(`${BASE}/change-password`)
      .set(auth(userToken))
      .send({ current_password: 'clave-actual-1', new_password: '123' })
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('new_password')));

  it('PUT /change-password OK -> 200 y la nueva contrasena sirve para login', async () => {
    await request(app.getHttpServer())
      .put(`${BASE}/change-password`)
      .set(auth(userToken))
      .send({
        current_password: 'clave-actual-1',
        new_password: 'clave-nueva-2',
      })
      .expect(200)
      .expect({ mensaje: 'Contrasena actualizada correctamente.' });

    await login({ username: user.username, password: 'clave-nueva-2' });
  });

  it('POST /reset-password/:id -> 200 { mensaje, password } y la nueva sirve', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/reset-password/${user.id}`)
      .set(auth(adminToken))
      .expect(200);

    const body = res.body as { mensaje: string; password: string };
    expect(body.mensaje).toContain(user.username);
    expect(body.password).toHaveLength(16);
    expect(body.password).not.toBe(user.username);
    await login({ username: user.username, password: body.password });
  });

  it('POST /cargar-por-csv/ -> 200 { mensaje, creados, errores }', async () => {
    const uname = `e2e_csv_${randomUUID().slice(0, 8)}`;
    createdUsernames.push(uname);
    const weakName = `e2e_csv_weak_${randomUUID().slice(0, 6)}`;
    const csv = [
      'username,email,role,password',
      `${uname},${uname}@x.test,user,clave-csv-larga`,
      'incompleta,,user,x',
      // password = username -> politica de contrasenas lo rechaza (BUG-DJANGO-005, 8.4)
      `${weakName},${weakName}@x.test,user,${weakName}`,
    ].join('\n');

    const res = await request(app.getHttpServer())
      .post(`${BASE}/cargar-por-csv/`)
      .set(auth(adminToken))
      .attach('archivo_csv', Buffer.from(csv), 'usuarios.csv')
      .expect(200);

    const body = res.body as {
      creados: string[];
      errores: string[];
      mensaje: string;
    };
    expect(body.creados).toContain(uname);
    expect(body.errores).toHaveLength(2);
    expect(body.errores.some((e) => e.includes('Contrasena invalida'))).toBe(
      true,
    );
  });

  it('POST /cargar-por-csv/ sin archivo -> 400 { error }', () =>
    request(app.getHttpServer())
      .post(`${BASE}/cargar-por-csv/`)
      .set(auth(adminToken))
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('error')));

  it('POST /cargar-por-csv/ como user -> 403', () =>
    request(app.getHttpServer())
      .post(`${BASE}/cargar-por-csv/`)
      .set(auth(userToken))
      .attach('archivo_csv', Buffer.from('username\nx'), 'u.csv')
      .expect(403));
});

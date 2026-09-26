import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { In, Repository } from 'typeorm';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import {
  INSTITUTO_INFORMACION_ID,
  InstitutoInformacion,
} from './../src/modules/institute/information/entities/instituto-informacion.entity';
import { Usuario } from './../src/modules/users/entities/usuario.entity';
import { seedUser, type SeededUser } from './helpers/seed-user';

const BASE = '/api/instituto-biblico/informacion';

describe('Instituto Biblico — Informacion general (e2e)', () => {
  let app: INestApplication<App>;
  let repo: Repository<InstitutoInformacion>;
  let userRepo: Repository<Usuario>;
  let admin: SeededUser;
  let plainUser: SeededUser;
  let scopedUser: SeededUser;
  let adminToken: string;
  let plainToken: string;
  let scopedToken: string;
  let originalRow: InstitutoInformacion;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const login = async (u: { username: string; password: string }) => {
    const res = await request(app.getHttpServer())
      .post('/api/token/login/')
      .send({ username: u.username, password: u.password })
      .expect(200);
    return (res.body as { access: string }).access;
  };

  beforeAll(async () => {
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = fixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    repo = app.get(getRepositoryToken(InstitutoInformacion));
    userRepo = app.get(getRepositoryToken(Usuario));

    originalRow = await repo.findOneByOrFail({ id: INSTITUTO_INFORMACION_ID });

    admin = await seedUser(userRepo, { role: 'admin' });
    plainUser = await seedUser(userRepo, { role: 'user' });
    scopedUser = await seedUser(userRepo, { role: 'user' });
    await userRepo.update(scopedUser.id, {
      moduleAccess: ['instituto-biblico'],
    });

    adminToken = await login(admin);
    plainToken = await login(plainUser);
    scopedToken = await login(scopedUser);
  });

  afterAll(async () => {
    await repo.update(INSTITUTO_INFORMACION_ID, {
      name: originalRow.name,
      description: originalRow.description,
      contactEmail: originalRow.contactEmail,
      contactPhone: originalRow.contactPhone,
      updatedById: null,
    });
    await userRepo.delete({ id: In([admin.id, plainUser.id, scopedUser.id]) });
    await app.close();
  });

  it('GET / publico -> 200 con la fila fija (sin token)', async () => {
    const res = await request(app.getHttpServer()).get(`${BASE}/`).expect(200);
    const body = res.body as { id: string; name: string };
    expect(body.id).toBe(INSTITUTO_INFORMACION_ID);
    expect(typeof body.name).toBe('string');
  });

  it('PUT / sin token -> 401', () =>
    request(app.getHttpServer())
      .put(`${BASE}/`)
      .send({ name: 'no deberia aplicarse' })
      .expect(401));

  it('PUT / como user sin moduleAccess -> 403 (ModuleAccessGuard)', () =>
    request(app.getHttpServer())
      .put(`${BASE}/`)
      .set(auth(plainToken))
      .send({ name: 'no deberia aplicarse' })
      .expect(403));

  it('PUT / como user con moduleAccess: [instituto-biblico] -> 200', async () => {
    const res = await request(app.getHttpServer())
      .put(`${BASE}/`)
      .set(auth(scopedToken))
      .send({ description: 'Actualizado por usuario con acceso al modulo' })
      .expect(200);

    const body = res.body as { description: string; updatedBy: string };
    expect(body.description).toBe(
      'Actualizado por usuario con acceso al modulo',
    );
    expect(body.updatedBy).toBe(scopedUser.id);
  });

  it('PUT / como admin (sin moduleAccess propio) -> 200 (acceso total)', async () => {
    const res = await request(app.getHttpServer())
      .put(`${BASE}/`)
      .set(auth(adminToken))
      .send({ contactPhone: '6444151646' })
      .expect(200);

    expect((res.body as { contactPhone: string }).contactPhone).toBe(
      '6444151646',
    );
  });

  it('PUT / con contactEmail invalido -> 400 { contactEmail: [...] }', () =>
    request(app.getHttpServer())
      .put(`${BASE}/`)
      .set(auth(adminToken))
      .send({ contactEmail: 'no-es-un-correo' })
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('contactEmail')));

  it('PUT / solo toca los campos enviados', async () => {
    const before = await repo.findOneByOrFail({ id: INSTITUTO_INFORMACION_ID });
    await request(app.getHttpServer())
      .put(`${BASE}/`)
      .set(auth(adminToken))
      .send({ name: 'Nombre actualizado en la prueba' })
      .expect(200);

    const after = await repo.findOneByOrFail({ id: INSTITUTO_INFORMACION_ID });
    expect(after.name).toBe('Nombre actualizado en la prueba');
    expect(after.description).toBe(before.description);
  });
});

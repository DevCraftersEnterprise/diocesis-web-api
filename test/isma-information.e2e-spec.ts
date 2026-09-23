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
  ISMA_INFORMACION_ID,
  IsmaInformacion,
} from './../src/modules/isma/information/entities/isma-informacion.entity';
import { Usuario } from './../src/modules/users/entities/usuario.entity';
import { seedUser, type SeededUser } from './helpers/seed-user';

const BASE = '/api/isma/informacion';

describe('ISMA — Informacion general (e2e)', () => {
  let app: INestApplication<App>;
  let repo: Repository<IsmaInformacion>;
  let userRepo: Repository<Usuario>;
  let admin: SeededUser;
  let plainUser: SeededUser;
  let scopedUser: SeededUser;
  let otherModuleUser: SeededUser;
  let adminToken: string;
  let plainToken: string;
  let scopedToken: string;
  let otherModuleToken: string;
  let originalRow: IsmaInformacion;

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

    repo = app.get(getRepositoryToken(IsmaInformacion));
    userRepo = app.get(getRepositoryToken(Usuario));

    originalRow = await repo.findOneByOrFail({ id: ISMA_INFORMACION_ID });

    admin = await seedUser(userRepo, { role: 'admin' });
    plainUser = await seedUser(userRepo, { role: 'user' });
    scopedUser = await seedUser(userRepo, { role: 'user' });
    otherModuleUser = await seedUser(userRepo, { role: 'user' });
    await userRepo.update(scopedUser.id, { moduleAccess: ['isma'] });
    await userRepo.update(otherModuleUser.id, {
      moduleAccess: ['instituto-biblico'],
    });

    adminToken = await login(admin);
    plainToken = await login(plainUser);
    scopedToken = await login(scopedUser);
    otherModuleToken = await login(otherModuleUser);
  });

  afterAll(async () => {
    await repo.update(ISMA_INFORMACION_ID, {
      introduccion: originalRow.introduccion,
      documentacionNecesaria: originalRow.documentacionNecesaria,
      parroquiaCorrespondiente: originalRow.parroquiaCorrespondiente,
      entrevistaParroco: originalRow.entrevistaParroco,
      programaIsma: originalRow.programaIsma,
      tiemposAnticipacion: originalRow.tiemposAnticipacion,
      contactoTelefono1: originalRow.contactoTelefono1,
      contactoTelefono2: originalRow.contactoTelefono2,
      updatedById: null,
    });
    await userRepo.delete({
      id: In([admin.id, plainUser.id, scopedUser.id, otherModuleUser.id]),
    });
    await app.close();
  });

  it('GET / publico -> 200 con la fila fija (sin token)', async () => {
    const res = await request(app.getHttpServer()).get(`${BASE}/`).expect(200);
    const body = res.body as { id: string; introduccion: string };
    expect(body.id).toBe(ISMA_INFORMACION_ID);
    expect(typeof body.introduccion).toBe('string');
  });

  it('PUT / sin token -> 401', () =>
    request(app.getHttpServer())
      .put(`${BASE}/`)
      .send({ introduccion: 'no deberia aplicarse' })
      .expect(401));

  it('PUT / como user sin moduleAccess -> 403 (ModuleAccessGuard)', () =>
    request(app.getHttpServer())
      .put(`${BASE}/`)
      .set(auth(plainToken))
      .send({ introduccion: 'no deberia aplicarse' })
      .expect(403));

  it('PUT / como user con moduleAccess: [instituto-biblico] (sin isma) -> 403', () =>
    request(app.getHttpServer())
      .put(`${BASE}/`)
      .set(auth(otherModuleToken))
      .send({ introduccion: 'no deberia aplicarse' })
      .expect(403));

  it('PUT / como user con moduleAccess: [isma] -> 200', async () => {
    const res = await request(app.getHttpServer())
      .put(`${BASE}/`)
      .set(auth(scopedToken))
      .send({ programaIsma: 'Actualizado por usuario con acceso al modulo' })
      .expect(200);

    const body = res.body as { programaIsma: string; updatedBy: string };
    expect(body.programaIsma).toBe(
      'Actualizado por usuario con acceso al modulo',
    );
    expect(body.updatedBy).toBe(scopedUser.id);
  });

  it('PUT / como admin (sin moduleAccess propio) -> 200 (acceso total)', async () => {
    const res = await request(app.getHttpServer())
      .put(`${BASE}/`)
      .set(auth(adminToken))
      .send({ contactoTelefono1: '6444151646' })
      .expect(200);

    expect((res.body as { contactoTelefono1: string }).contactoTelefono1).toBe(
      '6444151646',
    );
  });

  it('PUT / con introduccion vacia -> 400 { introduccion: [...] }', () =>
    request(app.getHttpServer())
      .put(`${BASE}/`)
      .set(auth(adminToken))
      .send({ introduccion: '' })
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('introduccion')));

  it('PUT / solo toca los campos enviados', async () => {
    const before = await repo.findOneByOrFail({ id: ISMA_INFORMACION_ID });
    await request(app.getHttpServer())
      .put(`${BASE}/`)
      .set(auth(adminToken))
      .send({ entrevistaParroco: 'Entrevista actualizada en la prueba' })
      .expect(200);

    const after = await repo.findOneByOrFail({ id: ISMA_INFORMACION_ID });
    expect(after.entrevistaParroco).toBe('Entrevista actualizada en la prueba');
    expect(after.programaIsma).toBe(before.programaIsma);
  });
});

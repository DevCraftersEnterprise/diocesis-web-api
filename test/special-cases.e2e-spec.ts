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
import { CasoEspecial } from './../src/modules/isma/special-cases/entities/caso-especial.entity';
import { Usuario } from './../src/modules/users/entities/usuario.entity';
import { seedUser, type SeededUser } from './helpers/seed-user';

const BASE = '/api/isma/casos-especiales';

describe('ISMA — Casos especiales (e2e)', () => {
  let app: INestApplication<App>;
  let repo: Repository<CasoEspecial>;
  let userRepo: Repository<Usuario>;
  let admin: SeededUser;
  let plain: SeededUser;
  let scoped: SeededUser;
  let adminToken: string;
  let plainToken: string;
  let scopedToken: string;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const validBody = () => ({
    title: `e2e_caso_${randomUUID().slice(0, 6)}`,
    order: 1,
    requisitosAdicionales: 'Requisitos',
  });
  const seedCaso = async (
    over: Partial<CasoEspecial> = {},
  ): Promise<string> => {
    const id = randomUUID();
    await repo.insert({
      id,
      title: `e2e_caso_${id.slice(0, 5)}`,
      order: 1,
      requisitosAdicionales: 'Requisitos',
      documentosAdicionales: null,
      excepciones: null,
      contacto: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: admin.id,
      ...over,
    });
    return id;
  };

  beforeAll(async () => {
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = fixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    repo = app.get(getRepositoryToken(CasoEspecial));
    userRepo = app.get(getRepositoryToken(Usuario));

    admin = await seedUser(userRepo, { role: 'admin' });
    plain = await seedUser(userRepo, { role: 'user' });
    scoped = await seedUser(userRepo, { role: 'user' });
    await userRepo.update(scoped.id, { moduleAccess: ['isma'] });

    for (const [u, setToken] of [
      [admin, (t: string) => (adminToken = t)],
      [plain, (t: string) => (plainToken = t)],
      [scoped, (t: string) => (scopedToken = t)],
    ] as const) {
      const r = await request(app.getHttpServer())
        .post('/api/token/login/')
        .send({ username: u.username, password: u.password })
        .expect(200);
      setToken((r.body as { access: string }).access);
    }
  });

  afterAll(async () => {
    await repo.delete({ createdById: In([admin.id]) });
    await userRepo.delete({ id: In([admin.id, plain.id, scoped.id]) });
    await app.close();
  });

  it('GET / publico -> objeto paginado ordenado por order', async () => {
    await seedCaso({ order: 2 });
    await seedCaso({ order: 1 });
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=50`)
      .expect(200);
    const body = res.body as { count: number; results: { order: number }[] };
    expect(typeof body.count).toBe('number');
    const orders = body.results.map((r) => r.order);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it('GET /:id soft-deleted -> 200; GET /<no-uuid> -> 404', async () => {
    const id = await seedCaso({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer()).get(`${BASE}/${id}`).expect(200);
    await request(app.getHttpServer()).get(`${BASE}/nope`).expect(404);
  });

  it('POST / sin token -> 401; como user sin moduleAccess -> 403', async () => {
    await request(app.getHttpServer())
      .post(`${BASE}/`)
      .send(validBody())
      .expect(401);
    await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(plainToken))
      .send(validBody())
      .expect(403);
  });

  it('POST / como user con moduleAccess: [isma] -> 201', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(scopedToken))
      .send(validBody())
      .expect(201);
    const body = res.body as { id: string; createdBy: string };
    await repo.delete({ id: body.id });
    expect(body.createdBy).toBe(scoped.id);
  });

  it('POST / admin OK -> 201; createdBy = actor', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({ ...validBody(), createdBy: 'atacante' })
      .expect(201);
    const body = res.body as Record<string, string>;
    await repo.delete({ id: body.id });
    expect(body.createdBy).toBe(admin.id);
  });

  it('PUT /:id edita (updatedBy); PUT sobre borrado -> 404', async () => {
    const id = await seedCaso();
    await request(app.getHttpServer())
      .put(`${BASE}/${id}`)
      .set(auth(adminToken))
      .send({ order: 9 })
      .expect(200)
      .expect((r) => expect((r.body as { order: number }).order).toBe(9));
    const row = await repo.findOneByOrFail({ id });
    expect(row.updatedById).toBe(admin.id);

    const delId = await seedCaso({ isActive: false });
    await request(app.getHttpServer())
      .put(`${BASE}/${delId}`)
      .set(auth(adminToken))
      .send({ order: 1 })
      .expect(404);
  });

  it('DELETE /:id -> 204 + soft-delete con deletedAt', async () => {
    const id = await seedCaso();
    const res = await request(app.getHttpServer())
      .delete(`${BASE}/${id}`)
      .set(auth(adminToken))
      .expect(204);
    expect(res.body).toEqual({});
    const row = await repo.findOneByOrFail({ id });
    expect(row.isActive).toBe(false);
    expect(row.deletedAt).not.toBeNull();
    expect(row.deletedById).toBe(admin.id);
  });

  it('POST /habilitar/:id -> 200 texto exacto; sobre activa -> 404', async () => {
    const id = await seedCaso({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${id}`)
      .set(auth(adminToken))
      .expect(200)
      .expect({ detail: 'Caso especial habilitado correctamente.' });

    const activeId = await seedCaso();
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${activeId}`)
      .set(auth(adminToken))
      .expect(404);
  });
});

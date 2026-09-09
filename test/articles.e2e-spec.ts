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
import { Articulo } from './../src/modules/articles/entities/articulo.entity';
import { Usuario } from './../src/modules/users/entities/usuario.entity';
import { seedUser, type SeededUser } from './helpers/seed-user';

const BASE = '/api/articulos';

describe('Articulos (e2e)', () => {
  let app: INestApplication<App>;
  let artRepo: Repository<Articulo>;
  let userRepo: Repository<Usuario>;
  let admin: SeededUser;
  let plain: SeededUser;
  let adminToken: string;
  let plainToken: string;
  const tagMark = `e2e${randomUUID().slice(0, 6)}`;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const validBody = () => ({
    title: `Art ${randomUUID().slice(0, 6)}`,
    content: 'Cuerpo del articulo',
    tags: ['fe', tagMark],
  });
  const seedArt = async (over: Partial<Articulo> = {}): Promise<string> => {
    const id = randomUUID();
    await artRepo.insert({
      id,
      title: `e2e_art_${id.slice(0, 5)}`,
      content: 'x',
      tags: [tagMark],
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

    artRepo = app.get(getRepositoryToken(Articulo));
    userRepo = app.get(getRepositoryToken(Usuario));

    admin = await seedUser(userRepo, { role: 'admin' });
    plain = await seedUser(userRepo, { role: 'user' });
    for (const u of [admin, plain]) {
      const r = await request(app.getHttpServer())
        .post('/api/token/login/')
        .send({ username: u.username, password: u.password })
        .expect(200);
      if (u === admin) adminToken = (r.body as { access: string }).access;
      else plainToken = (r.body as { access: string }).access;
    }
  });

  afterAll(async () => {
    await artRepo.delete({ createdById: In([admin.id, plain.id]) });
    await userRepo.delete({ id: In([admin.id, plain.id]) });
    await app.close();
  });

  it('GET / publico -> objeto paginado', async () => {
    await seedArt();
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=5`)
      .expect(200);
    const body = res.body as { count: number; results: unknown[] };
    expect(typeof body.count).toBe('number');
    expect(Array.isArray(body.results)).toBe(true);
  });

  it('GET /?tags=<tag> filtra sobre el array jsonb (BUG-DJANGO-011)', async () => {
    const id = await seedArt();
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=50&tags=${tagMark}`)
      .expect(200);
    const ids = (res.body as { results: { id: string }[] }).results.map(
      (r) => r.id,
    );
    expect(ids).toContain(id);
  });

  it('GET /?title=<txt>&isActive=false filtra title icontains + inactivos', async () => {
    const id = await seedArt({ isActive: false, title: `busca_${tagMark}` });
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=50&title=busca_${tagMark}&isActive=false`)
      .expect(200);
    const ids = (res.body as { results: { id: string }[] }).results.map(
      (r) => r.id,
    );
    expect(ids).toContain(id);
  });

  it('GET /:id soft-deleted -> 200; GET /<no-uuid> -> 404', async () => {
    const id = await seedArt({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer()).get(`${BASE}/${id}`).expect(200);
    await request(app.getHttpServer()).get(`${BASE}/nope`).expect(404);
  });

  it('POST / sin token -> 401; como user -> 403', async () => {
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

  it('POST / admin OK -> 201; createdBy = actor; tags ecoados; createdBy del body ignorado', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({ ...validBody(), createdBy: 'atacante', isActive: false })
      .expect(201);
    const body = res.body as Record<string, unknown>;
    await artRepo.delete({ id: body.id as string });
    expect(body.createdBy).toBe(admin.id);
    expect(body.tags).toEqual(['fe', tagMark]);
    expect(body.isActive).toBe(true);
    expect(body.updatedBy).toBeNull();
  });

  it('POST / sin tags -> 201 con tags []', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({ title: `SinTags ${randomUUID().slice(0, 5)}`, content: 'c' })
      .expect(201);
    const body = res.body as { id: string; tags: unknown };
    await artRepo.delete({ id: body.id });
    expect(body.tags).toEqual([]);
  });

  it('POST / con tags no-lista -> 400 { tags: [...] }', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({ title: 'Mal', content: 'c', tags: { a: 1 } })
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('tags')));

  it('POST / sin title -> 400', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({ content: 'c' })
      .expect(400));

  it('PUT /:id edita (updatedBy); PUT sobre borrado -> 404', async () => {
    const id = await seedArt();
    await request(app.getHttpServer())
      .put(`${BASE}/${id}`)
      .set(auth(adminToken))
      .send({ content: 'Actualizado' })
      .expect(200)
      .expect((r) =>
        expect((r.body as { content: string }).content).toBe('Actualizado'),
      );
    const row = await artRepo.findOneByOrFail({ id });
    expect(row.updatedById).toBe(admin.id);

    const delId = await seedArt({ isActive: false });
    await request(app.getHttpServer())
      .put(`${BASE}/${delId}`)
      .set(auth(adminToken))
      .send({ content: 'x' })
      .expect(404);
  });

  it('DELETE /:id -> 204 sin cuerpo + soft-delete con deletedAt', async () => {
    const id = await seedArt();
    const res = await request(app.getHttpServer())
      .delete(`${BASE}/${id}`)
      .set(auth(adminToken))
      .expect(204);
    expect(res.body).toEqual({});
    const row = await artRepo.findOneByOrFail({ id });
    expect(row.isActive).toBe(false);
    expect(row.deletedAt).not.toBeNull();
    expect(row.deletedById).toBe(admin.id);
  });

  it('POST /habilitar/:id -> 200 texto exacto; sobre activa -> 404', async () => {
    const id = await seedArt({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${id}`)
      .set(auth(adminToken))
      .expect(200)
      .expect({ detail: 'Artículo habilitado correctamente.' });
    const row = await artRepo.findOneByOrFail({ id });
    expect(row.isActive).toBe(true);
    expect(row.deletedAt).toBeNull();
    expect(row.deletedById).toBeNull();

    const activeId = await seedArt();
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${activeId}`)
      .set(auth(adminToken))
      .expect(404);
  });
});

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
import { CloudinaryService } from './../src/integrations/cloudinary/cloudinary.service';
import { Noticia } from './../src/modules/news/entities/noticia.entity';
import { Usuario } from './../src/modules/users/entities/usuario.entity';
import { seedUser, type SeededUser } from './helpers/seed-user';

const BASE = '/api/noticias';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const PDF = Buffer.from('%PDF-1.4 fake');
const FAKE_URL = 'https://res.cloudinary.test/noticias/fake.jpg';

describe('Noticias (e2e)', () => {
  let app: INestApplication<App>;
  let notiRepo: Repository<Noticia>;
  let userRepo: Repository<Usuario>;
  let admin: SeededUser;
  let plain: SeededUser;
  let adminToken: string;
  let plainToken: string;
  const tagMark = `e2e${randomUUID().slice(0, 6)}`;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const seedNoti = async (over: Partial<Noticia> = {}): Promise<string> => {
    const id = randomUUID();
    await notiRepo.insert({
      id,
      title: `e2e_noti_${id.slice(0, 5)}`,
      picture: null,
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
    })
      .overrideProvider(CloudinaryService)
      .useValue({
        upload: jest.fn().mockResolvedValue({
          secureUrl: FAKE_URL,
          publicId: 'noticias/fake',
        }),
      })
      .compile();

    app = fixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    notiRepo = app.get(getRepositoryToken(Noticia));
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
    await notiRepo.delete({ createdById: In([admin.id, plain.id]) });
    await userRepo.delete({ id: In([admin.id, plain.id]) });
    await app.close();
  });

  it('GET / publico -> objeto paginado', async () => {
    await seedNoti();
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=5`)
      .expect(200);
    const body = res.body as { count: number; results: unknown[] };
    expect(typeof body.count).toBe('number');
    expect(Array.isArray(body.results)).toBe(true);
  });

  it('GET /?tags=<tag> filtra sobre el array jsonb (BUG-DJANGO-011)', async () => {
    const id = await seedNoti();
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=50&tags=${tagMark}`)
      .expect(200);
    const ids = (res.body as { results: { id: string }[] }).results.map(
      (r) => r.id,
    );
    expect(ids).toContain(id);
  });

  it('GET /:id soft-deleted -> 200; GET /<no-uuid> -> 404', async () => {
    const id = await seedNoti({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer()).get(`${BASE}/${id}`).expect(200);
    await request(app.getHttpServer()).get(`${BASE}/nope`).expect(404);
  });

  it('POST / sin token -> 401; como user -> 403', async () => {
    await request(app.getHttpServer())
      .post(`${BASE}/`)
      .field('title', 'X')
      .field('content', 'Y')
      .expect(401);
    await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(plainToken))
      .field('title', 'X')
      .field('content', 'Y')
      .expect(403);
  });

  it('POST / admin multipart OK -> 201; createdBy = actor; tags string-JSON; picture stub', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('title', `Noti ${randomUUID().slice(0, 5)}`)
      .field('content', 'Cuerpo')
      .field('tags', JSON.stringify(['fe', tagMark]))
      .field('createdBy', 'atacante')
      .attach('picture', PNG, 'p.png')
      .expect(201);
    const body = res.body as Record<string, unknown>;
    await notiRepo.delete({ id: body.id as string });
    expect(body.createdBy).toBe(admin.id);
    expect(body.tags).toEqual(['fe', tagMark]);
    expect(body.picture).toBe(FAKE_URL);
    expect(body.isActive).toBe(true);
    expect(body.updatedBy).toBeNull();
  });

  it('POST / sin tags ni picture -> 201 con tags [] y picture null', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('title', `SinExtras ${randomUUID().slice(0, 5)}`)
      .field('content', 'c')
      .expect(201);
    const body = res.body as { id: string; tags: unknown; picture: unknown };
    await notiRepo.delete({ id: body.id });
    expect(body.tags).toEqual([]);
    expect(body.picture).toBeNull();
  });

  it('POST / con picture no-imagen (PDF) -> 400 { picture: [...] }', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('title', 'Mala')
      .field('content', 'c')
      .attach('picture', PDF, 'x.pdf')
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('picture')));

  it('POST / con tags string-JSON invalido -> 400 { tags: [...] }', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('title', 'Mala')
      .field('content', 'c')
      .field('tags', 'no-es-json')
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('tags')));

  it('POST / sin title -> 400', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('content', 'c')
      .expect(400));

  it('PUT /:id edita (updatedBy); PUT sobre borrado -> 404', async () => {
    const id = await seedNoti();
    await request(app.getHttpServer())
      .put(`${BASE}/${id}`)
      .set(auth(adminToken))
      .field('content', 'Actualizado')
      .expect(200)
      .expect((r) =>
        expect((r.body as { content: string }).content).toBe('Actualizado'),
      );
    const row = await notiRepo.findOneByOrFail({ id });
    expect(row.updatedById).toBe(admin.id);

    const delId = await seedNoti({ isActive: false });
    await request(app.getHttpServer())
      .put(`${BASE}/${delId}`)
      .set(auth(adminToken))
      .field('content', 'x')
      .expect(404);
  });

  it('DELETE /:id -> 204 sin cuerpo + soft-delete con deletedAt', async () => {
    const id = await seedNoti();
    const res = await request(app.getHttpServer())
      .delete(`${BASE}/${id}`)
      .set(auth(adminToken))
      .expect(204);
    expect(res.body).toEqual({});
    const row = await notiRepo.findOneByOrFail({ id });
    expect(row.isActive).toBe(false);
    expect(row.deletedAt).not.toBeNull();
    expect(row.deletedById).toBe(admin.id);
  });

  it('POST /habilitar/:id -> 200 texto exacto; sobre activa -> 404', async () => {
    const id = await seedNoti({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${id}`)
      .set(auth(adminToken))
      .expect(200)
      .expect({ detail: 'Noticia habilitada correctamente.' });
    const row = await notiRepo.findOneByOrFail({ id });
    expect(row.isActive).toBe(true);
    expect(row.deletedAt).toBeNull();

    const activeId = await seedNoti();
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${activeId}`)
      .set(auth(adminToken))
      .expect(404);
  });
});

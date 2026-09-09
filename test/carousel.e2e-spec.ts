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
import { Carrusel } from './../src/modules/carousel/entities/carrusel.entity';
import { Usuario } from './../src/modules/users/entities/usuario.entity';
import { seedUser, type SeededUser } from './helpers/seed-user';

const BASE = '/api/carrusel';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const PDF = Buffer.from('%PDF-1.4 nope');
const FAKE_URL = 'https://res.cloudinary.test/carrusel/imagenes/fake.jpg';

describe('Carrusel (e2e)', () => {
  let app: INestApplication<App>;
  let repo: Repository<Carrusel>;
  let userRepo: Repository<Usuario>;
  let admin: SeededUser;
  let plain: SeededUser;
  let adminToken: string;
  let plainToken: string;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const seedCar = async (over: Partial<Carrusel> = {}): Promise<string> => {
    const id = randomUUID();
    await repo.insert({
      id,
      url: `https://cdn.test/${id.slice(0, 6)}.jpg`,
      isImage: true,
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
          publicId: 'carrusel/fake',
        }),
      })
      .compile();

    app = fixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    repo = app.get<Repository<Carrusel>>(getRepositoryToken(Carrusel));
    userRepo = app.get<Repository<Usuario>>(getRepositoryToken(Usuario));
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
    await repo.delete({ createdById: In([admin.id, plain.id]) });
    await userRepo.delete({ id: In([admin.id, plain.id]) });
    await app.close();
  });

  it('GET / publico -> array plano, solo activos, con los 4 campos DQ3-B', async () => {
    const activeId = await seedCar();
    await seedCar({ isActive: false, deletedAt: new Date() });
    const res = await request(app.getHttpServer()).get(`${BASE}/`).expect(200);
    const body = res.body as Array<Record<string, unknown>>;
    expect(Array.isArray(body)).toBe(true);
    const item = body.find((c) => c.id === activeId)!;
    expect(item).toHaveProperty('updatedAt');
    expect(item).toHaveProperty('deletedAt');
    expect(item).toHaveProperty('updatedBy');
    expect(body.every((c) => c.isActive === true)).toBe(true);
  });

  it('POST / sin token -> 401; como user -> 403; admin sin archivo -> 400 { error }', async () => {
    await request(app.getHttpServer()).post(`${BASE}/`).expect(401);
    await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(plainToken))
      .field('isImage', 'true')
      .expect(403);
    await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('isImage', 'true')
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('error'));
  });

  it('POST / admin + PNG -> 201, url = stub, createdBy = actor', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('isImage', 'true')
      .attach('url', PNG, 'x.png')
      .expect(201);
    const body = res.body as {
      url: string;
      isImage: boolean;
      createdBy: string;
    };
    expect(body.url).toBe(FAKE_URL);
    expect(body.isImage).toBe(true);
    expect(body.createdBy).toBe(admin.id);
  });

  it('POST / isImage=true con PDF -> 400 { url: [...] }', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('isImage', 'true')
      .attach('url', PDF, 'x.pdf')
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('url')));

  it('PUT /:id edita (fija updatedBy); PUT sobre borrado -> 404', async () => {
    const id = await seedCar();
    await request(app.getHttpServer())
      .put(`${BASE}/${id}`)
      .set(auth(adminToken))
      .field('isImage', 'false')
      .expect(200)
      .expect((r) =>
        expect((r.body as { isImage: boolean }).isImage).toBe(false),
      );
    const row = await repo.findOneByOrFail({ id });
    expect(row.updatedById).toBe(admin.id);

    const delId = await seedCar({ isActive: false });
    await request(app.getHttpServer())
      .put(`${BASE}/${delId}`)
      .set(auth(adminToken))
      .field('isImage', 'true')
      .expect(404);
  });

  it('DELETE /:id -> 204 + soft-delete con deletedAt', async () => {
    const id = await seedCar();
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

  it('PUT /habilitar/:id -> 200 texto exacto; sobre activo -> 400 { detail }', async () => {
    const id = await seedCar({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer())
      .put(`${BASE}/habilitar/${id}`)
      .set(auth(adminToken))
      .expect(200)
      .expect({ detail: 'Carrusel habilitado correctamente.' });

    const activeId = await seedCar();
    await request(app.getHttpServer())
      .put(`${BASE}/habilitar/${activeId}`)
      .set(auth(adminToken))
      .expect(400)
      .expect({ detail: 'Este carrusel ya esta activo.' });
  });
});

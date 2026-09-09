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
import { Colonia } from './../src/modules/colonies/entities/colonia.entity';
import { Decanato } from './../src/modules/decanates/entities/decanato.entity';
import { Parroquia } from './../src/modules/parishes/entities/parroquia.entity';
import { Padre } from './../src/modules/reverends/entities/padre.entity';
import { Usuario } from './../src/modules/users/entities/usuario.entity';
import { seedUser, type SeededUser } from './helpers/seed-user';

const BASE = '/api/parroquias';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const FAKE_URL = 'https://res.cloudinary.test/parroquia/fake.jpg';

describe('Parroquias (e2e)', () => {
  let app: INestApplication<App>;
  let parRepo: Repository<Parroquia>;
  let decRepo: Repository<Decanato>;
  let colRepo: Repository<Colonia>;
  let padRepo: Repository<Padre>;
  let userRepo: Repository<Usuario>;
  let admin: SeededUser;
  let plain: SeededUser;
  let adminToken: string;
  let plainToken: string;
  let decId: string;
  let colId: string;
  let padId: string;
  const colName = `e2e_col_${randomUUID().slice(0, 6)}`;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const validBody = () => ({
    name: `Par ${randomUUID().slice(0, 6)}`,
    openingDate: '1995-06-01',
    address: 'Av. Siempre Viva 1',
    zipCode: '85000',
    town: 'Obregon',
    decanatoId: decId,
    coloniaId: colId,
    padreId: padId,
  });
  const seedPar = async (over: Partial<Parroquia> = {}): Promise<string> => {
    const id = randomUUID();
    await parRepo.insert({
      id,
      name: `e2e_par_${id.slice(0, 5)}`,
      openingDate: '1990-01-01',
      address: 'x',
      zipCode: '85000',
      town: 'Obregon',
      decanatoId: decId,
      coloniaId: colId,
      padreId: padId,
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
          publicId: 'parroquia/fake',
        }),
      })
      .compile();

    app = fixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    parRepo = app.get(getRepositoryToken(Parroquia));
    decRepo = app.get(getRepositoryToken(Decanato));
    colRepo = app.get(getRepositoryToken(Colonia));
    padRepo = app.get(getRepositoryToken(Padre));
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

    decId = randomUUID();
    colId = randomUUID();
    padId = randomUUID();
    const now = new Date();
    await decRepo.insert({
      id: decId,
      name: 'e2e dec',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: admin.id,
    });
    await colRepo.insert({
      id: colId,
      name: colName,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: admin.id,
    });
    await padRepo.insert({
      id: padId,
      firstName: 'E2E',
      lastName: 'ParPadre',
      birthDate: '1970-01-01',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  });

  afterAll(async () => {
    await parRepo.delete({ createdById: In([admin.id, plain.id]) });
    await decRepo.delete({ id: decId });
    await colRepo.delete({ id: colId });
    await padRepo.delete({ id: padId });
    await userRepo.delete({ id: In([admin.id, plain.id]) });
    await app.close();
  });

  it('GET / publico -> objeto paginado', async () => {
    await seedPar();
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=5`)
      .expect(200);
    const body = res.body as { count: number; results: unknown[] };
    expect(typeof body.count).toBe('number');
    expect(Array.isArray(body.results)).toBe(true);
  });

  it('GET /?colonia=<nombre> filtra por nombre de colonia (BUG-DJANGO-003)', async () => {
    const id = await seedPar();
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=50&colonia=${colName}`)
      .expect(200);
    const ids = (res.body as { results: { id: string }[] }).results.map(
      (r) => r.id,
    );
    expect(ids).toContain(id);
  });

  it('GET /:id soft-deleted -> 200; GET /<no-uuid> -> 404', async () => {
    const id = await seedPar({ isActive: false, deletedAt: new Date() });
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

  it('POST / admin OK -> 201; createdBy = actor; FKs ecoadas', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({ ...validBody(), createdBy: 'atacante' })
      .expect(201);
    const body = res.body as Record<string, string>;
    await parRepo.delete({ id: body.id });
    expect(body.createdBy).toBe(admin.id);
    expect(body.decanatoId).toBe(decId);
    expect(body.coloniaId).toBe(colId);
    expect(body.padreId).toBe(padId);
  });

  it('POST / con decanatoId inexistente -> 400 { decanatoId: [...] }', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({ ...validBody(), decanatoId: randomUUID() })
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('decanatoId')));

  it('POST / con picture PNG -> 201, picture = stub', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('name', `ParFoto ${randomUUID().slice(0, 5)}`)
      .field('openingDate', '1995-06-01')
      .field('address', 'x')
      .field('zipCode', '85000')
      .field('town', 'Obregon')
      .field('decanatoId', decId)
      .field('coloniaId', colId)
      .field('padreId', padId)
      .attach('picture', PNG, 'p.png')
      .expect(201);
    const body = res.body as { id: string; picture: string };
    await parRepo.delete({ id: body.id });
    expect(body.picture).toBe(FAKE_URL);
  });

  it('PUT /:id edita (updatedBy); PUT sobre borrado -> 404', async () => {
    const id = await seedPar();
    await request(app.getHttpServer())
      .put(`${BASE}/${id}`)
      .set(auth(adminToken))
      .send({ town: 'Navojoa' })
      .expect(200)
      .expect((r) => expect((r.body as { town: string }).town).toBe('Navojoa'));
    const row = await parRepo.findOneByOrFail({ id });
    expect(row.updatedById).toBe(admin.id);

    const delId = await seedPar({ isActive: false });
    await request(app.getHttpServer())
      .put(`${BASE}/${delId}`)
      .set(auth(adminToken))
      .send({ town: 'x' })
      .expect(404);
  });

  it('DELETE /:id -> 204 + soft-delete con deletedAt', async () => {
    const id = await seedPar();
    const res = await request(app.getHttpServer())
      .delete(`${BASE}/${id}`)
      .set(auth(adminToken))
      .expect(204);
    expect(res.body).toEqual({});
    const row = await parRepo.findOneByOrFail({ id });
    expect(row.isActive).toBe(false);
    expect(row.deletedAt).not.toBeNull();
    expect(row.deletedById).toBe(admin.id);
  });

  it('POST /habilitar/:id -> 200 texto exacto; sobre activa -> 404', async () => {
    const id = await seedPar({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${id}`)
      .set(auth(adminToken))
      .expect(200)
      .expect({ detail: 'Parroquia habilitada correctamente.' });

    const activeId = await seedPar();
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${activeId}`)
      .set(auth(adminToken))
      .expect(404);
  });
});

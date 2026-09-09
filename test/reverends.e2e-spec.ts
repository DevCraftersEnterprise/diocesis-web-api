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
import { Padre } from './../src/modules/reverends/entities/padre.entity';
import { Usuario } from './../src/modules/users/entities/usuario.entity';
import { seedUser, type SeededUser } from './helpers/seed-user';

const BASE = '/api/padres';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const PDF = Buffer.from('%PDF-1.4 not an image');
const FAKE_URL = 'https://res.cloudinary.test/padres/fake.jpg';

describe('Padres (e2e)', () => {
  let app: INestApplication<App>;
  let padreRepo: Repository<Padre>;
  let userRepo: Repository<Usuario>;
  let admin: SeededUser;
  let plain: SeededUser;
  let adminToken: string;
  let plainToken: string;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const seedPadre = async (over: Partial<Padre> = {}): Promise<string> => {
    const id = randomUUID();
    await padreRepo.insert({
      id,
      firstName: `E2E${id.slice(0, 4)}`,
      lastName: 'Test',
      birthDate: '1975-03-20',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
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
        upload: jest
          .fn()
          .mockResolvedValue({ secureUrl: FAKE_URL, publicId: 'padres/fake' }),
      })
      .compile();

    app = fixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    padreRepo = app.get<Repository<Padre>>(getRepositoryToken(Padre));
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

  const created: string[] = [];
  afterAll(async () => {
    await padreRepo.delete({ lastName: 'Test' });
    if (created.length) await padreRepo.delete({ id: In(created) });
    await userRepo.delete({ id: In([admin.id, plain.id]) });
    await app.close();
  });

  it('GET / sin params -> ARRAY PLANO (APIC-003)', async () => {
    await seedPadre();
    const res = await request(app.getHttpServer()).get(`${BASE}/`).expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /?page=1&page_size=2 -> objeto paginado', async () => {
    await Promise.all([seedPadre(), seedPadre(), seedPadre()]);
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=2`)
      .expect(200);
    const body = res.body as { count: number; results: unknown[] };
    expect(body.results).toHaveLength(2);
    expect(body.count).toBeGreaterThanOrEqual(3);
  });

  it('GET /:id soft-deleted -> 200; GET /<no-uuid> -> 404', async () => {
    const id = await seedPadre({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer())
      .get(`${BASE}/${id}`)
      .expect(200)
      .expect((r) =>
        expect((r.body as { isActive: boolean }).isActive).toBe(false),
      );
    await request(app.getHttpServer()).get(`${BASE}/nope`).expect(404);
  });

  it('POST / sin token -> 401; como user -> 403', async () => {
    await request(app.getHttpServer())
      .post(`${BASE}/`)
      .field('firstName', 'x')
      .field('lastName', 'y')
      .field('birthDate', '1990-01-01')
      .expect(401);
    await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(plainToken))
      .field('firstName', 'x')
      .field('lastName', 'y')
      .field('birthDate', '1990-01-01')
      .expect(403);
  });

  it('POST / como admin, sin foto -> 201; email "" -> null', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('firstName', 'Juan')
      .field('lastName', 'ApellidoUnico')
      .field('birthDate', '1980-05-15')
      .field('email', '')
      .field('facebook', '')
      .expect(201);
    const body = res.body as { id: string; email: null; picture: null };
    created.push(body.id);
    expect(body.email).toBeNull();
    expect(body.picture).toBeNull();
  });

  it('POST / con PNG -> 201 y picture = URL (stub de Cloudinary)', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('firstName', 'ConFoto')
      .field('lastName', 'ApellidoUnico')
      .field('birthDate', '1980-05-15')
      .attach('picture', PNG, 'p.png')
      .expect(201);
    const body = res.body as { id: string; picture: string };
    created.push(body.id);
    expect(body.picture).toBe(FAKE_URL);
  });

  it('POST / con archivo no-imagen -> 400 { picture: [...] }', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('firstName', 'Mala')
      .field('lastName', 'Foto')
      .field('birthDate', '1980-05-15')
      .attach('picture', PDF, 'x.pdf')
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('picture')));

  it('POST / birthDate mal formada -> 400 { birthDate: [...] }', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('firstName', 'X')
      .field('lastName', 'Y')
      .field('birthDate', '15/05/1980')
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('birthDate')));

  it('PUT /:id edita y fija updatedBy; PUT sobre borrado -> 404', async () => {
    const id = await seedPadre();
    await request(app.getHttpServer())
      .put(`${BASE}/${id}`)
      .set(auth(adminToken))
      .field('firstName', 'Renombrado')
      .expect(200)
      .expect((r) =>
        expect(
          (r.body as { firstName: string; updatedBy: string }).firstName,
        ).toBe('Renombrado'),
      );
    const row = await padreRepo.findOneByOrFail({ id });
    expect(row.updatedById).toBe(admin.id);

    const delId = await seedPadre({ isActive: false });
    await request(app.getHttpServer())
      .put(`${BASE}/${delId}`)
      .set(auth(adminToken))
      .field('firstName', 'x')
      .expect(404);
  });

  it('DELETE /:id -> 204 + soft-delete con deletedAt', async () => {
    const id = await seedPadre();
    const res = await request(app.getHttpServer())
      .delete(`${BASE}/${id}`)
      .set(auth(adminToken))
      .expect(204);
    expect(res.body).toEqual({});
    const row = await padreRepo.findOneByOrFail({ id });
    expect(row.isActive).toBe(false);
    expect(row.deletedAt).not.toBeNull();
    expect(row.deletedById).toBe(admin.id);
  });

  it('POST /habilitar/:id -> 200 texto exacto; sobre activo -> 404', async () => {
    const id = await seedPadre({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${id}`)
      .set(auth(adminToken))
      .expect(200)
      .expect({ detail: 'Padre habilitado correctamente.' });

    const activeId = await seedPadre();
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${activeId}`)
      .set(auth(adminToken))
      .expect(404);
  });

  it('POST /cargar-por-csv/ -> 200 { creados, errores }', async () => {
    const csv = [
      'firstName,lastName,birthDate',
      'CsvNom,Test,1970-07-07',
      'SinFecha,Test,',
    ].join('\n');
    const res = await request(app.getHttpServer())
      .post(`${BASE}/cargar-por-csv/`)
      .set(auth(adminToken))
      .attach('archivo_csv', Buffer.from(csv), 'p.csv')
      .expect(200);
    const body = res.body as { creados: string[]; errores: unknown[] };
    expect(body.creados).toContain('CsvNom Test');
    expect(body.errores).toHaveLength(1);
  });
});

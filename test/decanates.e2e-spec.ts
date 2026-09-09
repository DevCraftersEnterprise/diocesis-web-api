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
import { Decanato } from './../src/modules/decanates/entities/decanato.entity';
import { Usuario } from './../src/modules/users/entities/usuario.entity';
import { seedUser, type SeededUser } from './helpers/seed-user';

const BASE = '/api/decanatos';

describe('Decanatos (e2e)', () => {
  let app: INestApplication<App>;
  let decRepo: Repository<Decanato>;
  let userRepo: Repository<Usuario>;
  let admin: SeededUser;
  let plain: SeededUser;
  let adminToken: string;
  let plainToken: string;
  const createdDecIds: string[] = [];

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const login = async (u: SeededUser) => {
    const r = await request(app.getHttpServer())
      .post('/api/token/login/')
      .send({ username: u.username, password: u.password })
      .expect(200);
    return (r.body as { access: string }).access;
  };
  const seedDec = async (over: Partial<Decanato> = {}): Promise<string> => {
    const id = randomUUID();
    await decRepo.insert({
      id,
      name: `e2e_dec_${id.slice(0, 6)}`,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: admin.id,
      ...over,
    });
    createdDecIds.push(id);
    return id;
  };

  beforeAll(async () => {
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = fixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    decRepo = app.get<Repository<Decanato>>(getRepositoryToken(Decanato));
    userRepo = app.get<Repository<Usuario>>(getRepositoryToken(Usuario));
    admin = await seedUser(userRepo, { role: 'admin' });
    plain = await seedUser(userRepo, { role: 'user' });
    adminToken = await login(admin);
    plainToken = await login(plain);
  });

  afterAll(async () => {
    // Borra todo decanato creado por los usuarios de prueba (incluye los del CSV),
    // luego los usuarios (evita violar la FK createdBy).
    await decRepo.delete({ createdById: In([admin.id, plain.id]) });
    await userRepo.delete({ id: In([admin.id, plain.id]) });
    await app.close();
  });

  it('GET / es publico y pagina de verdad (BUG-DJANGO-024)', async () => {
    await Promise.all([seedDec(), seedDec(), seedDec()]);
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=2`)
      .expect(200);
    const body = res.body as { count: number; results: unknown[] };
    expect(body.results).toHaveLength(2);
    expect(body.count).toBeGreaterThanOrEqual(3);
  });

  it('GET /:id de una fila soft-deleted -> 200 (BUG-DJANGO-022)', async () => {
    const id = await seedDec({ isActive: false, deletedAt: new Date() });
    const res = await request(app.getHttpServer())
      .get(`${BASE}/${id}`)
      .expect(200);
    expect((res.body as { isActive: boolean }).isActive).toBe(false);
  });

  it('GET /<no-uuid> -> 404', () =>
    request(app.getHttpServer()).get(`${BASE}/no-uuid`).expect(404));

  it('POST / sin token -> 401; como user -> 403', async () => {
    await request(app.getHttpServer())
      .post(`${BASE}/`)
      .send({ name: 'x' })
      .expect(401);
    await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(plainToken))
      .send({ name: 'x' })
      .expect(403);
  });

  it('POST / como admin -> 201, createdBy = actor (ignora el del body, BUG-DJANGO-007)', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({ name: 'Decanato E2E', createdBy: 'atacante', isActive: false })
      .expect(201);
    const body = res.body as {
      id: string;
      name: string;
      createdBy: string;
      isActive: boolean;
    };
    createdDecIds.push(body.id);
    expect(body.name).toBe('Decanato E2E');
    expect(body.createdBy).toBe(admin.id);
    expect(body.isActive).toBe(true);
  });

  it('PUT /:id edita; PUT sobre una fila borrada -> 404', async () => {
    const id = await seedDec();
    await request(app.getHttpServer())
      .put(`${BASE}/${id}`)
      .set(auth(adminToken))
      .send({ name: 'Renombrado' })
      .expect(200)
      .expect((r) =>
        expect((r.body as { name: string }).name).toBe('Renombrado'),
      );

    const delId = await seedDec({ isActive: false });
    await request(app.getHttpServer())
      .put(`${BASE}/${delId}`)
      .set(auth(adminToken))
      .send({ name: 'x' })
      .expect(404);
  });

  it('DELETE /:id -> 204 sin cuerpo; fija deletedAt + deletedBy', async () => {
    const id = await seedDec();
    const res = await request(app.getHttpServer())
      .delete(`${BASE}/${id}`)
      .set(auth(adminToken))
      .expect(204);
    expect(res.body).toEqual({});

    const row = await decRepo.findOneByOrFail({ id });
    expect(row.isActive).toBe(false);
    expect(row.deletedAt).not.toBeNull();
    expect(row.deletedById).toBe(admin.id);
  });

  it('POST /habilitar/:id -> 200 y limpia deletedAt; sobre una activa -> 404', async () => {
    const id = await seedDec({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${id}`)
      .set(auth(adminToken))
      .expect(200)
      .expect((r) =>
        expect((r.body as { detail: string }).detail).toMatch(/habilitado/),
      );
    const row = await decRepo.findOneByOrFail({ id });
    expect(row.isActive).toBe(true);
    expect(row.deletedAt).toBeNull();

    const activeId = await seedDec();
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${activeId}`)
      .set(auth(adminToken))
      .expect(404);
  });

  it('POST /cargar-csv/ -> 200 { creados, errores }', async () => {
    const uname = `csvdec_${randomUUID().slice(0, 6)}`;
    const csv = ['name,nota', `${uname},ok`, ',sin-nombre'].join('\n');
    const res = await request(app.getHttpServer())
      .post(`${BASE}/cargar-csv/`)
      .set(auth(adminToken))
      .attach('archivo_csv', Buffer.from(csv), 'd.csv')
      .expect(200);
    const body = res.body as { creados: string[]; errores: unknown[] };
    expect(body.creados).toContain(uname);
    expect(body.errores).toHaveLength(1);
  });
});

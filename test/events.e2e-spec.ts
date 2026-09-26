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
import { Capacitacion } from './../src/modules/institute/trainings/entities/capacitacion.entity';
import { Curso } from './../src/modules/institute/courses/entities/curso.entity';
import { Evento } from './../src/modules/institute/events/entities/evento.entity';
import { Sede } from './../src/modules/institute/venues/entities/sede.entity';
import { Usuario } from './../src/modules/users/entities/usuario.entity';
import { seedUser, type SeededUser } from './helpers/seed-user';

const BASE = '/api/instituto-biblico/eventos';

describe('Instituto Biblico — Eventos (e2e)', () => {
  let app: INestApplication<App>;
  let eventoRepo: Repository<Evento>;
  let cursoRepo: Repository<Curso>;
  let capRepo: Repository<Capacitacion>;
  let sedeRepo: Repository<Sede>;
  let userRepo: Repository<Usuario>;
  let admin: SeededUser;
  let plain: SeededUser;
  let scoped: SeededUser;
  let adminToken: string;
  let plainToken: string;
  let scopedToken: string;
  let cursoId: string;
  let sedeId: string;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const validBody = () => ({
    title: `e2e_evento_${randomUUID().slice(0, 6)}`,
    type: 'inscripcion',
    startDate: '2026-02-01',
    cursoId,
    sedeId,
  });
  const seedEvento = async (over: Partial<Evento> = {}): Promise<string> => {
    const id = randomUUID();
    await eventoRepo.insert({
      id,
      title: `e2e_evento_${id.slice(0, 5)}`,
      description: null,
      type: 'inscripcion',
      startDate: '2026-02-01',
      endDate: null,
      cursoId,
      sedeId,
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

    eventoRepo = app.get(getRepositoryToken(Evento));
    cursoRepo = app.get(getRepositoryToken(Curso));
    capRepo = app.get(getRepositoryToken(Capacitacion));
    sedeRepo = app.get(getRepositoryToken(Sede));
    userRepo = app.get(getRepositoryToken(Usuario));

    admin = await seedUser(userRepo, { role: 'admin' });
    plain = await seedUser(userRepo, { role: 'user' });
    scoped = await seedUser(userRepo, { role: 'user' });
    await userRepo.update(scoped.id, { moduleAccess: ['instituto-biblico'] });

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

    const now = new Date();
    const capId = randomUUID();
    await capRepo.insert({
      id: capId,
      name: 'e2e_cap_for_evento',
      description: 'Descripcion',
      modality: 'presencial',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: admin.id,
    });
    cursoId = randomUUID();
    await cursoRepo.insert({
      id: cursoId,
      title: 'e2e_curso_for_evento',
      description: 'Descripcion',
      modality: 'presencial',
      capacitacionId: capId,
      startDate: null,
      endDate: null,
      meetingLink: null,
      picture: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: admin.id,
    });
    sedeId = randomUUID();
    await sedeRepo.insert({
      id: sedeId,
      name: 'e2e_sede_for_evento',
      address: 'Calle 1',
      mapsUrl: 'https://maps.example.test/sede',
      picture: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: admin.id,
    });
  });

  afterAll(async () => {
    await eventoRepo.delete({ createdById: In([admin.id]) });
    await cursoRepo.delete({ id: cursoId });
    await capRepo.delete({ createdById: In([admin.id]) });
    await sedeRepo.delete({ id: sedeId });
    await userRepo.delete({ id: In([admin.id, plain.id, scoped.id]) });
    await app.close();
  });

  it('GET / publico -> objeto paginado', async () => {
    await seedEvento();
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=5`)
      .expect(200);
    const body = res.body as { count: number; results: unknown[] };
    expect(typeof body.count).toBe('number');
    expect(Array.isArray(body.results)).toBe(true);
  });

  it('GET /?startDate__gte=...&startDate__lte=... filtra por rango de fechas', async () => {
    const inRange = await seedEvento({ startDate: '2026-05-01' });
    const outOfRange = await seedEvento({ startDate: '2020-01-01' });
    const res = await request(app.getHttpServer())
      .get(
        `${BASE}/?page=1&page_size=50&startDate__gte=2026-01-01&startDate__lte=2026-12-31`,
      )
      .expect(200);
    const ids = (res.body as { results: { id: string }[] }).results.map(
      (r) => r.id,
    );
    expect(ids).toContain(inRange);
    expect(ids).not.toContain(outOfRange);
  });

  it('GET /:id soft-deleted -> 200; GET /<no-uuid> -> 404', async () => {
    const id = await seedEvento({ isActive: false, deletedAt: new Date() });
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

  it('POST / como user con moduleAccess: [instituto-biblico] -> 201', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(scopedToken))
      .send(validBody())
      .expect(201);
    const body = res.body as { id: string; createdBy: string };
    await eventoRepo.delete({ id: body.id });
    expect(body.createdBy).toBe(scoped.id);
  });

  it('POST / admin OK -> 201; createdBy = actor; cursoId/sedeId ecoados', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({ ...validBody(), createdBy: 'atacante' })
      .expect(201);
    const body = res.body as Record<string, string>;
    await eventoRepo.delete({ id: body.id });
    expect(body.createdBy).toBe(admin.id);
    expect(body.cursoId).toBe(cursoId);
    expect(body.sedeId).toBe(sedeId);
  });

  it('POST / sin cursoId/sedeId -> 201 (relaciones opcionales)', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({
        title: `e2e_evento_${randomUUID().slice(0, 6)}`,
        type: 'actividad',
        startDate: '2026-03-01',
      })
      .expect(201);
    const body = res.body as {
      id: string;
      cursoId: string | null;
      sedeId: string | null;
    };
    await eventoRepo.delete({ id: body.id });
    expect(body.cursoId).toBeNull();
    expect(body.sedeId).toBeNull();
  });

  it('POST / con cursoId inexistente -> 400 { cursoId: [...] }', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({ ...validBody(), cursoId: randomUUID() })
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('cursoId')));

  it('POST / con sedeId inexistente -> 400 { sedeId: [...] }', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({ ...validBody(), sedeId: randomUUID() })
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('sedeId')));

  it('PUT /:id edita (updatedBy); PUT sobre borrado -> 404', async () => {
    const id = await seedEvento();
    await request(app.getHttpServer())
      .put(`${BASE}/${id}`)
      .set(auth(adminToken))
      .send({ title: 'Titulo actualizado' })
      .expect(200)
      .expect((r) =>
        expect((r.body as { title: string }).title).toBe('Titulo actualizado'),
      );
    const row = await eventoRepo.findOneByOrFail({ id });
    expect(row.updatedById).toBe(admin.id);

    const delId = await seedEvento({ isActive: false });
    await request(app.getHttpServer())
      .put(`${BASE}/${delId}`)
      .set(auth(adminToken))
      .send({ title: 'x' })
      .expect(404);
  });

  it('DELETE /:id -> 204 + soft-delete con deletedAt', async () => {
    const id = await seedEvento();
    const res = await request(app.getHttpServer())
      .delete(`${BASE}/${id}`)
      .set(auth(adminToken))
      .expect(204);
    expect(res.body).toEqual({});
    const row = await eventoRepo.findOneByOrFail({ id });
    expect(row.isActive).toBe(false);
    expect(row.deletedAt).not.toBeNull();
    expect(row.deletedById).toBe(admin.id);
  });

  it('POST /habilitar/:id -> 200 texto exacto; sobre activa -> 404', async () => {
    const id = await seedEvento({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${id}`)
      .set(auth(adminToken))
      .expect(200)
      .expect({ detail: 'Evento habilitado correctamente.' });

    const activeId = await seedEvento();
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${activeId}`)
      .set(auth(adminToken))
      .expect(404);
  });
});

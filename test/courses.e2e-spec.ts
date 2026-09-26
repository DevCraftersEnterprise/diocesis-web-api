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
import { Capacitacion } from './../src/modules/institute/trainings/entities/capacitacion.entity';
import { Curso } from './../src/modules/institute/courses/entities/curso.entity';
import { Usuario } from './../src/modules/users/entities/usuario.entity';
import { seedUser, type SeededUser } from './helpers/seed-user';

const BASE = '/api/instituto-biblico/cursos';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const FAKE_URL = 'https://res.cloudinary.test/curso/fake.jpg';

describe('Instituto Biblico — Cursos (e2e)', () => {
  let app: INestApplication<App>;
  let cursoRepo: Repository<Curso>;
  let capRepo: Repository<Capacitacion>;
  let userRepo: Repository<Usuario>;
  let admin: SeededUser;
  let plain: SeededUser;
  let scoped: SeededUser;
  let adminToken: string;
  let plainToken: string;
  let scopedToken: string;
  let capId: string;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const validBody = () => ({
    title: `e2e_curso_${randomUUID().slice(0, 6)}`,
    description: 'Descripcion',
    modality: 'presencial',
    capacitacionId: capId,
  });
  const seedCurso = async (over: Partial<Curso> = {}): Promise<string> => {
    const id = randomUUID();
    await cursoRepo.insert({
      id,
      title: `e2e_curso_${id.slice(0, 5)}`,
      description: 'Descripcion',
      modality: 'presencial',
      capacitacionId: capId,
      startDate: null,
      endDate: null,
      meetingLink: null,
      picture: null,
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
          publicId: 'curso/fake',
        }),
      })
      .compile();

    app = fixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    cursoRepo = app.get(getRepositoryToken(Curso));
    capRepo = app.get(getRepositoryToken(Capacitacion));
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

    capId = randomUUID();
    const now = new Date();
    await capRepo.insert({
      id: capId,
      name: 'e2e_cap_for_curso',
      description: 'Descripcion',
      modality: 'presencial',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: admin.id,
    });
  });

  afterAll(async () => {
    await cursoRepo.delete({ createdById: In([admin.id]) });
    await capRepo.delete({ id: capId });
    await userRepo.delete({ id: In([admin.id, plain.id, scoped.id]) });
    await app.close();
  });

  it('GET / publico -> objeto paginado', async () => {
    await seedCurso();
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=5`)
      .expect(200);
    const body = res.body as { count: number; results: unknown[] };
    expect(typeof body.count).toBe('number');
    expect(Array.isArray(body.results)).toBe(true);
  });

  it('GET /?capacitacionId=<uuid> filtra por capacitacion', async () => {
    const id = await seedCurso();
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=50&capacitacionId=${capId}`)
      .expect(200);
    const ids = (res.body as { results: { id: string }[] }).results.map(
      (r) => r.id,
    );
    expect(ids).toContain(id);
  });

  it('GET /:id soft-deleted -> 200; GET /<no-uuid> -> 404', async () => {
    const id = await seedCurso({ isActive: false, deletedAt: new Date() });
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
    await cursoRepo.delete({ id: body.id });
    expect(body.createdBy).toBe(scoped.id);
  });

  it('POST / admin OK -> 201; createdBy = actor; capacitacionId ecoado', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({ ...validBody(), createdBy: 'atacante' })
      .expect(201);
    const body = res.body as Record<string, string>;
    await cursoRepo.delete({ id: body.id });
    expect(body.createdBy).toBe(admin.id);
    expect(body.capacitacionId).toBe(capId);
  });

  it('POST / sin capacitacionId -> 201 (relacion opcional)', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({
        title: `e2e_curso_${randomUUID().slice(0, 6)}`,
        description: 'Descripcion',
        modality: 'en_linea',
      })
      .expect(201);
    const body = res.body as { id: string; capacitacionId: string | null };
    await cursoRepo.delete({ id: body.id });
    expect(body.capacitacionId).toBeNull();
  });

  it('POST / con capacitacionId inexistente -> 400 { capacitacionId: [...] }', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({ ...validBody(), capacitacionId: randomUUID() })
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('capacitacionId')));

  it('POST / con picture PNG -> 201, picture = stub', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('title', `e2e_curso_${randomUUID().slice(0, 6)}`)
      .field('description', 'Descripcion')
      .field('modality', 'presencial')
      .field('capacitacionId', capId)
      .attach('picture', PNG, 'p.png')
      .expect(201);
    const body = res.body as { id: string; picture: string };
    await cursoRepo.delete({ id: body.id });
    expect(body.picture).toBe(FAKE_URL);
  });

  it('PUT /:id edita (updatedBy); PUT sobre borrado -> 404', async () => {
    const id = await seedCurso();
    await request(app.getHttpServer())
      .put(`${BASE}/${id}`)
      .set(auth(adminToken))
      .send({ title: 'Titulo actualizado' })
      .expect(200)
      .expect((r) =>
        expect((r.body as { title: string }).title).toBe('Titulo actualizado'),
      );
    const row = await cursoRepo.findOneByOrFail({ id });
    expect(row.updatedById).toBe(admin.id);

    const delId = await seedCurso({ isActive: false });
    await request(app.getHttpServer())
      .put(`${BASE}/${delId}`)
      .set(auth(adminToken))
      .send({ title: 'x' })
      .expect(404);
  });

  it('DELETE /:id -> 204 + soft-delete con deletedAt', async () => {
    const id = await seedCurso();
    const res = await request(app.getHttpServer())
      .delete(`${BASE}/${id}`)
      .set(auth(adminToken))
      .expect(204);
    expect(res.body).toEqual({});
    const row = await cursoRepo.findOneByOrFail({ id });
    expect(row.isActive).toBe(false);
    expect(row.deletedAt).not.toBeNull();
    expect(row.deletedById).toBe(admin.id);
  });

  it('POST /habilitar/:id -> 200 texto exacto; sobre activa -> 404', async () => {
    const id = await seedCurso({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${id}`)
      .set(auth(adminToken))
      .expect(200)
      .expect({ detail: 'Curso habilitado correctamente.' });

    const activeId = await seedCurso();
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${activeId}`)
      .set(auth(adminToken))
      .expect(404);
  });
});

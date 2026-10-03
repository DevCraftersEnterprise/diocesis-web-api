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
import { IsmaCurso } from './../src/modules/isma/cursos/entities/isma-curso.entity';
import { Parroquia } from './../src/modules/parishes/entities/parroquia.entity';
import { Usuario } from './../src/modules/users/entities/usuario.entity';
import { seedUser, type SeededUser } from './helpers/seed-user';

const BASE = '/api/isma/cursos';

describe('ISMA — Cursos (calendarizacion) (e2e)', () => {
  let app: INestApplication<App>;
  let repo: Repository<IsmaCurso>;
  let userRepo: Repository<Usuario>;
  let parroquiaRepo: Repository<Parroquia>;
  let admin: SeededUser;
  let plain: SeededUser;
  let scoped: SeededUser;
  let adminToken: string;
  let plainToken: string;
  let scopedToken: string;
  let parroquiaId: string;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const validBody = () => ({
    parroquiaId,
    startDate: '2099-09-01',
    endDate: '2099-11-30',
    diaSemana: 2,
    horaInicio: '19:00',
    horaFin: '21:00',
    modalidades: ['presencial'],
  });
  const seedCurso = async (over: Partial<IsmaCurso> = {}): Promise<string> => {
    const id = randomUUID();
    await repo.insert({
      id,
      parroquiaId,
      startDate: '2099-09-01',
      endDate: '2099-11-30',
      diaSemana: null,
      horaInicio: null,
      horaFin: null,
      modalidades: ['presencial'],
      telefonoInformes: null,
      notas: null,
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

    repo = app.get(getRepositoryToken(IsmaCurso));
    userRepo = app.get(getRepositoryToken(Usuario));
    parroquiaRepo = app.get(getRepositoryToken(Parroquia));

    const parroquia = await parroquiaRepo.findOne({
      where: { isActive: true },
    });
    if (!parroquia)
      throw new Error('Se requiere al menos una parroquia activa.');
    parroquiaId = parroquia.id;

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

  it('GET publico solo muestra activos que aun no terminan', async () => {
    const vigente = await seedCurso({
      startDate: '2099-01-01',
      endDate: '2099-06-01',
    });
    const terminado = await seedCurso({
      startDate: '2020-01-01',
      endDate: '2020-06-01',
    });
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=100`)
      .expect(200);
    const ids = (res.body as { results: { id: string }[] }).results.map(
      (r) => r.id,
    );
    expect(ids).toContain(vigente);
    expect(ids).not.toContain(terminado);
  });

  it('GET /:id de un curso terminado -> 200 con finalizado: true', async () => {
    const id = await seedCurso({
      startDate: '2020-01-01',
      endDate: '2020-06-01',
    });
    const res = await request(app.getHttpServer())
      .get(`${BASE}/${id}`)
      .expect(200);
    expect((res.body as { finalizado: boolean }).finalizado).toBe(true);
  });

  it('GET /:id deshabilitado -> 404; GET /<no-uuid> -> 404', async () => {
    const id = await seedCurso({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer()).get(`${BASE}/${id}`).expect(404);
    await request(app.getHttpServer()).get(`${BASE}/nope`).expect(404);
  });

  it('POST gestion sin token -> 401; user sin moduleAccess -> 403', async () => {
    await request(app.getHttpServer())
      .post(`${BASE}/gestion`)
      .send(validBody())
      .expect(401);
    await request(app.getHttpServer())
      .post(`${BASE}/gestion`)
      .set(auth(plainToken))
      .send(validBody())
      .expect(403);
  });

  it('POST gestion como user con moduleAccess isma -> 201; createdBy = actor', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/gestion`)
      .set(auth(scopedToken))
      .send(validBody())
      .expect(201);
    const body = res.body as {
      id: string;
      createdBy: string;
      parroquia: { id: string };
    };
    await repo.delete({ id: body.id });
    expect(body.createdBy).toBe(scoped.id);
    expect(body.parroquia.id).toBe(parroquiaId);
  });

  it('POST gestion con horario incoherente -> 400', async () => {
    await request(app.getHttpServer())
      .post(`${BASE}/gestion`)
      .set(auth(adminToken))
      .send({ ...validBody(), horaInicio: '21:00', horaFin: '19:00' })
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('horaFin'));
    await request(app.getHttpServer())
      .post(`${BASE}/gestion`)
      .set(auth(adminToken))
      .send({ ...validBody(), endDate: '2099-08-01' })
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('endDate'));
  });

  it('POST gestion acepta una o ambas modalidades y rechaza ninguna', async () => {
    const ambas = await request(app.getHttpServer())
      .post(`${BASE}/gestion`)
      .set(auth(adminToken))
      .send({ ...validBody(), modalidades: ['presencial', 'en_linea'] })
      .expect(201);
    await repo.delete({ id: (ambas.body as { id: string }).id });
    expect((ambas.body as { modalidades: string[] }).modalidades).toEqual([
      'presencial',
      'en_linea',
    ]);

    await request(app.getHttpServer())
      .post(`${BASE}/gestion`)
      .set(auth(adminToken))
      .send({ ...validBody(), modalidades: [] })
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('modalidades'));
  });

  it('POST gestion con parroquia inexistente -> 400 { parroquiaId }', async () => {
    await request(app.getHttpServer())
      .post(`${BASE}/gestion`)
      .set(auth(adminToken))
      .send({ ...validBody(), parroquiaId: randomUUID() })
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('parroquiaId'));
  });

  it('la CHECK de la BD rechaza endDate < startDate aunque se salte la validacion', async () => {
    await expect(
      repo.insert({
        id: randomUUID(),
        parroquiaId,
        startDate: '2099-10-01',
        endDate: '2099-09-01',
        diaSemana: null,
        horaInicio: null,
        horaFin: null,
        modalidades: ['presencial'],
        telefonoInformes: null,
        notas: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: admin.id,
      }),
    ).rejects.toThrow();
  });

  it('PUT gestion edita (updatedBy); PUT sobre deshabilitado -> 404', async () => {
    const id = await seedCurso();
    await request(app.getHttpServer())
      .put(`${BASE}/gestion/${id}`)
      .set(auth(adminToken))
      .send({ notas: 'Cupo limitado' })
      .expect(200)
      .expect((r) =>
        expect((r.body as { notas: string }).notas).toBe('Cupo limitado'),
      );
    const row = await repo.findOneByOrFail({ id });
    expect(row.updatedById).toBe(admin.id);

    const delId = await seedCurso({ isActive: false });
    await request(app.getHttpServer())
      .put(`${BASE}/gestion/${delId}`)
      .set(auth(adminToken))
      .send({ notas: 'x' })
      .expect(404);
  });

  it('DELETE gestion -> 204 + soft-delete; habilitar lo restaura', async () => {
    const id = await seedCurso();
    await request(app.getHttpServer())
      .delete(`${BASE}/gestion/${id}`)
      .set(auth(adminToken))
      .expect(204);
    const row = await repo.findOneByOrFail({ id });
    expect(row.isActive).toBe(false);
    expect(row.deletedById).toBe(admin.id);

    await request(app.getHttpServer())
      .post(`${BASE}/gestion/habilitar/${id}`)
      .set(auth(adminToken))
      .expect(200)
      .expect({ detail: 'Curso habilitado correctamente.' });
  });

  it('GET gestion incluye terminados (vista admin)', async () => {
    const terminado = await seedCurso({
      startDate: '2020-01-01',
      endDate: '2020-06-01',
    });
    const res = await request(app.getHttpServer())
      .get(`${BASE}/gestion?page=1&page_size=100`)
      .set(auth(adminToken))
      .expect(200);
    const ids = (res.body as { results: { id: string }[] }).results.map(
      (r) => r.id,
    );
    expect(ids).toContain(terminado);
  });
});

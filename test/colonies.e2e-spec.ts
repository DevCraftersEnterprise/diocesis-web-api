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
import { Colonia } from './../src/modules/colonies/entities/colonia.entity';
import { Usuario } from './../src/modules/users/entities/usuario.entity';
import { seedUser, type SeededUser } from './helpers/seed-user';

const BASE = '/api/colonias';

describe('Colonias (e2e)', () => {
  let app: INestApplication<App>;
  let colRepo: Repository<Colonia>;
  let userRepo: Repository<Usuario>;
  let admin: SeededUser;
  let adminToken: string;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const seedCol = async (over: Partial<Colonia> = {}): Promise<string> => {
    const id = randomUUID();
    await colRepo.insert({
      id,
      name: `e2e_col_${id.slice(0, 6)}`,
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

    colRepo = app.get<Repository<Colonia>>(getRepositoryToken(Colonia));
    userRepo = app.get<Repository<Usuario>>(getRepositoryToken(Usuario));
    admin = await seedUser(userRepo, { role: 'admin' });
    const r = await request(app.getHttpServer())
      .post('/api/token/login/')
      .send({ username: admin.username, password: admin.password })
      .expect(200);
    adminToken = (r.body as { access: string }).access;
  });

  afterAll(async () => {
    await colRepo.delete({ createdById: In([admin.id]) });
    await userRepo.delete({ id: In([admin.id]) });
    await app.close();
  });

  it('GET / publico y paginado', async () => {
    await Promise.all([seedCol(), seedCol(), seedCol()]);
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=2`)
      .expect(200);
    const body = res.body as { count: number; results: unknown[] };
    expect(body.results).toHaveLength(2);
    expect(body.count).toBeGreaterThanOrEqual(3);
  });

  it('GET /:id soft-deleted -> 200 (BUG-DJANGO-022)', async () => {
    const id = await seedCol({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer())
      .get(`${BASE}/${id}`)
      .expect(200)
      .expect((r) =>
        expect((r.body as { isActive: boolean }).isActive).toBe(false),
      );
  });

  it('POST / como admin -> 201, createdBy = actor', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .send({ name: 'Colonia E2E', createdBy: 'atacante' })
      .expect(201);
    expect((res.body as { createdBy: string }).createdBy).toBe(admin.id);
  });

  it('DELETE /:id -> 204 + soft-delete con deletedAt', async () => {
    const id = await seedCol();
    await request(app.getHttpServer())
      .delete(`${BASE}/${id}`)
      .set(auth(adminToken))
      .expect(204);
    const row = await colRepo.findOneByOrFail({ id });
    expect(row.isActive).toBe(false);
    expect(row.deletedAt).not.toBeNull();
  });

  it('POST /habilitar/:id -> 200 con el texto EXACTO de Django', async () => {
    const id = await seedCol({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${id}`)
      .set(auth(adminToken))
      .expect(200)
      .expect({ detail: 'Colonia habilitado correctamente.' });
  });
});

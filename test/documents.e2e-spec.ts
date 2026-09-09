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
import { Documento } from './../src/modules/documents/entities/documento.entity';
import { Usuario } from './../src/modules/users/entities/usuario.entity';
import { seedUser, type SeededUser } from './helpers/seed-user';

const BASE = '/api/documentos';
const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<< >>\nendobj\n', 'latin1');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const FAKE_URL = 'https://res.cloudinary.test/documentos/fake.pdf';

describe('Documentos (e2e)', () => {
  let app: INestApplication<App>;
  let docRepo: Repository<Documento>;
  let userRepo: Repository<Usuario>;
  let admin: SeededUser;
  let plain: SeededUser;
  let adminToken: string;
  let plainToken: string;
  const tagMark = `e2e${randomUUID().slice(0, 6)}`;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const seedDoc = async (over: Partial<Documento> = {}): Promise<string> => {
    const id = randomUUID();
    await docRepo.insert({
      id,
      title: `e2e_doc_${id.slice(0, 5)}`,
      document: 'https://cdn/documentos/seed.pdf',
      type: 'decreto',
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
          publicId: 'documentos/fake',
        }),
      })
      .compile();

    app = fixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    docRepo = app.get(getRepositoryToken(Documento));
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
    await docRepo.delete({ createdById: In([admin.id, plain.id]) });
    await userRepo.delete({ id: In([admin.id, plain.id]) });
    await app.close();
  });

  it('GET / publico -> objeto paginado', async () => {
    await seedDoc();
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=5`)
      .expect(200);
    const body = res.body as { count: number; results: unknown[] };
    expect(typeof body.count).toBe('number');
    expect(Array.isArray(body.results)).toBe(true);
  });

  it('GET /?type=<t>&tags=<tag> filtra exacto por type + array jsonb', async () => {
    const keep = await seedDoc({ type: 'circular' });
    await seedDoc({ type: 'prensa' });
    const res = await request(app.getHttpServer())
      .get(`${BASE}/?page=1&page_size=50&type=circular&tags=${tagMark}`)
      .expect(200);
    const rows = (res.body as { results: { id: string; type: string }[] })
      .results;
    expect(rows.map((r) => r.id)).toContain(keep);
    expect(rows.every((r) => r.type === 'circular')).toBe(true);
  });

  it('GET /:id soft-deleted -> 200; GET /<no-uuid> -> 404', async () => {
    const id = await seedDoc({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer()).get(`${BASE}/${id}`).expect(200);
    await request(app.getHttpServer()).get(`${BASE}/nope`).expect(404);
  });

  it('POST / sin token -> 401; como user -> 403', async () => {
    await request(app.getHttpServer())
      .post(`${BASE}/`)
      .field('title', 'X')
      .field('type', 'carta')
      .expect(401);
    await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(plainToken))
      .field('title', 'X')
      .field('type', 'carta')
      .expect(403);
  });

  it('POST / admin OK -> 201; document raw stub; createdBy = actor; tags string-JSON', async () => {
    const res = await request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('title', `Doc ${randomUUID().slice(0, 5)}`)
      .field('type', 'comunicado')
      .field('tags', JSON.stringify(['curia', tagMark]))
      .field('createdBy', 'atacante')
      .attach('document', PDF, 'd.pdf')
      .expect(201);
    const body = res.body as Record<string, unknown>;
    await docRepo.delete({ id: body.id as string });
    expect(body.createdBy).toBe(admin.id);
    expect(body.type).toBe('comunicado');
    expect(body.tags).toEqual(['curia', tagMark]);
    expect(body.document).toBe(FAKE_URL);
    expect(body.isActive).toBe(true);
  });

  it('POST / sin archivo -> 400 { document: [...] }', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('title', 'SinArchivo')
      .field('type', 'carta')
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('document')));

  it('POST / con type invalido -> 400 { type: [...] }', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('title', 'TipoMalo')
      .field('type', 'no-existe')
      .attach('document', PDF, 'd.pdf')
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('type')));

  it('POST / con archivo no-documento (PNG) -> 400 { document: [...] }', () =>
    request(app.getHttpServer())
      .post(`${BASE}/`)
      .set(auth(adminToken))
      .field('title', 'Mala')
      .field('type', 'carta')
      .attach('document', PNG, 'x.png')
      .expect(400)
      .expect((r) => expect(r.body).toHaveProperty('document')));

  it('PUT /:id edita type (updatedBy); PUT sobre borrado -> 404', async () => {
    const id = await seedDoc();
    await request(app.getHttpServer())
      .put(`${BASE}/${id}`)
      .set(auth(adminToken))
      .field('type', 'mensaje')
      .expect(200)
      .expect((r) => expect((r.body as { type: string }).type).toBe('mensaje'));
    const row = await docRepo.findOneByOrFail({ id });
    expect(row.updatedById).toBe(admin.id);

    const delId = await seedDoc({ isActive: false });
    await request(app.getHttpServer())
      .put(`${BASE}/${delId}`)
      .set(auth(adminToken))
      .field('type', 'carta')
      .expect(404);
  });

  it('DELETE /:id -> 204 sin cuerpo + soft-delete con deletedAt', async () => {
    const id = await seedDoc();
    const res = await request(app.getHttpServer())
      .delete(`${BASE}/${id}`)
      .set(auth(adminToken))
      .expect(204);
    expect(res.body).toEqual({});
    const row = await docRepo.findOneByOrFail({ id });
    expect(row.isActive).toBe(false);
    expect(row.deletedAt).not.toBeNull();
    expect(row.deletedById).toBe(admin.id);
  });

  it('POST /habilitar/:id -> 200 texto exacto; sobre activa -> 404', async () => {
    const id = await seedDoc({ isActive: false, deletedAt: new Date() });
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${id}`)
      .set(auth(adminToken))
      .expect(200)
      .expect({ detail: 'Documento habilitado correctamente.' });
    const row = await docRepo.findOneByOrFail({ id });
    expect(row.isActive).toBe(true);
    expect(row.deletedAt).toBeNull();

    const activeId = await seedDoc();
    await request(app.getHttpServer())
      .post(`${BASE}/habilitar/${activeId}`)
      .set(auth(adminToken))
      .expect(404);
  });
});

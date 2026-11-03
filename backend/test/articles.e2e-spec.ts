import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { AppDataSource } from '../src/database/data-source';
import validationOptions from '../src/utils/validation-options';

// Adapted from Brocoders' HTTP auth tests + Conduit's persistence/HTTP article cases.
describe('Articles against PostgreSQL', () => {
  let app: INestApplication;
  let admin: string;
  let user: string;
  const dto = {
    title: 'Kiểm chứng PostgreSQL',
    summary: 'Literal search summary',
    markdown: '## Heading\n\n```ts\nconst n = 1;\n```',
    tags: ['nestjs', 'nestjs', 'postgresql'],
  };
  beforeAll(async () => {
    if (!process.env.DATABASE_NAME?.endsWith('_journal_test'))
      throw new Error('A dedicated *_journal_test database is required');
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
    // Exercise down/up on the dedicated DB, before any fixtures or application boot.
    await AppDataSource.undoLastMigration();
    await AppDataSource.runMigrations();
    await AppDataSource.query(
      'TRUNCATE article, session, "user", role, status CASCADE',
    );
    await AppDataSource.query(
      `INSERT INTO role(id,name) VALUES (1,'Admin'),(2,'User'); INSERT INTO status(id,name) VALUES(1,'Active')`,
    );
    const hash = await bcrypt.hash('journal-test-password', 10);
    for (const [email, role] of [
      ['admin@example.com', 1],
      ['reader@example.com', 2],
    ]) {
      await AppDataSource.query(
        'INSERT INTO "user"(email,password,provider,"firstName","lastName","roleId","statusId") VALUES($1,$2,\'email\',\'Quan\',\'Tran\',$3,1)',
        [email, hash, role],
      );
    }
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(new ValidationPipe(validationOptions));
    await app.init();
    const login = async (email: string): Promise<string> => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/email/login')
        .send({ email, password: 'journal-test-password' })
        .expect(200);
      return (response.body as { token: string }).token;
    };
    admin = await login('admin@example.com');
    user = await login('reader@example.com');
  }, 60000);
  afterAll(async () => {
    if (app) await app.close();
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });

  it('should enforce backend ADMIN writes for every method', async () => {
    for (const token of ['', user]) {
      const expected = token ? 403 : 401;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await request(app.getHttpServer())
        .post('/api/v1/articles')
        .set(headers)
        .send(dto)
        .expect(expected);
      await request(app.getHttpServer())
        .patch('/api/v1/articles/missing')
        .set(headers)
        .send({ title: 'Changed' })
        .expect(expected);
      await request(app.getHttpServer())
        .delete('/api/v1/articles/missing')
        .set(headers)
        .expect(expected);
    }
    await request(app.getHttpServer())
      .post('/api/v1/articles')
      .set('Authorization', 'Bearer forged')
      .send(dto)
      .expect(401);
  });

  it('should create, publicly read, update with stable slug and delete', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/articles')
      .auth(admin, { type: 'bearer' })
      .send({ ...dto, author: 'Forged', slug: 'injected' })
      .expect(201);
    const article = created.body as {
      slug: string;
      tags: string[];
      author: string;
    };
    expect(article.slug).toBe('kiem-chung-postgresql');
    expect(article.tags).toEqual(['nestjs', 'postgresql']);
    expect(article.author).toBe('Quan Tran');
    const read = await request(app.getHttpServer())
      .get(`/api/v1/articles/${article.slug}`)
      .expect(200);
    expect(read.body).not.toHaveProperty('password');
    expect(read.body).not.toHaveProperty('email');
    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/articles/${article.slug}`)
      .auth(admin, { type: 'bearer' })
      .send({ title: 'New title', tags: ['typescript'] })
      .expect(200);
    expect((updated.body as { slug: string }).slug).toBe(article.slug);
    expect((updated.body as { tags: string[] }).tags).toEqual(['typescript']);
    await request(app.getHttpServer())
      .delete(`/api/v1/articles/${article.slug}`)
      .auth(admin, { type: 'bearer' })
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/v1/articles/${article.slug}`)
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/api/v1/articles/${article.slug}`)
      .auth(admin, { type: 'bearer' })
      .expect(404);
  });

  it('should resolve concurrent duplicate slugs atomically', async () => {
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        request(app.getHttpServer())
          .post('/api/v1/articles')
          .auth(admin, { type: 'bearer' })
          .send(dto)
          .expect(201),
      ),
    );
    expect(
      new Set(
        responses.map((response) => (response.body as { slug: string }).slug),
      ).size,
    ).toBe(4);
  });

  it('should search title and summary, filter tags and paginate without duplicates', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/articles')
      .auth(admin, { type: 'bearer' })
      .send({ ...dto, title: '100% literal', tags: ['unique'] })
      .expect(201);
    const get = (query: string) =>
      request(app.getHttpServer()).get(`/api/v1/articles?${query}`).expect(200);
    const searched = await get('q=POSTGRESQL&limit=2&page=1');
    expect((searched.body as { total: number }).total).toBe(4);
    const second = await get('q=POSTGRESQL&limit=2&page=2');
    const all = [
      ...(searched.body as { articles: { id: string }[] }).articles,
      ...(second.body as { articles: { id: string }[] }).articles,
    ];
    expect(new Set(all.map((article) => article.id)).size).toBe(4);
    expect((await get('q=Literal%20search')).body.total).toBe(5);
    expect((await get('tag=unique')).body.total).toBe(1);
    expect((await get('q=%25')).body.total).toBe(1);
    expect((await get('q=%27%20OR%201%3D1--')).body.total).toBe(0);
    expect((await get('page=100')).body.articles).toEqual([]);
    const tags = await request(app.getHttpServer())
      .get('/api/v1/articles/tags')
      .expect(200);
    expect(tags.body).toEqual(['nestjs', 'postgresql', 'unique']);
  });

  it('should reject malformed input and invalid pagination', async () => {
    const existing = await request(app.getHttpServer()).get(
      '/api/v1/articles?limit=1',
    );
    const slug = (existing.body as { articles: { slug: string }[] }).articles[0]
      .slug;
    await request(app.getHttpServer())
      .patch(`/api/v1/articles/${slug}`)
      .auth(admin, { type: 'bearer' })
      .send({ title: null })
      .expect(422);
    await request(app.getHttpServer())
      .post('/api/v1/articles')
      .auth(admin, { type: 'bearer' })
      .send({ ...dto, title: '  ' })
      .expect(422);
    await request(app.getHttpServer())
      .post('/api/v1/articles')
      .auth(admin, { type: 'bearer' })
      .send({ ...dto, tags: [''] })
      .expect(422);
    for (const query of ['page=0', 'page=NaN', 'limit=51', 'limit=-1'])
      await request(app.getHttpServer())
        .get(`/api/v1/articles?${query}`)
        .expect(422);
  });
});

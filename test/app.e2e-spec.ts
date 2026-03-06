import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { Server } from 'http';

describe('NotifyHub (e2e smoke)', () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    httpServer = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /test should return 200 (API is up)', async () => {
    await request(httpServer).get('/test').expect(200);
  });

  it('Public API should reject requests without x-api-key', async () => {
    await request(httpServer)
      .post('/users')
      .send({ externalId: 'e2e_user_1' })
      .expect((res) => {
        if (![401, 403].includes(res.status)) {
          throw new Error(`Expected 401/403, got ${res.status}`);
        }
      });
  });

  it('Admin API should reject requests without JWT', async () => {
    await request(httpServer)
      .get('/admin/tenants')
      .expect((res) => {
        if (![401, 403].includes(res.status)) {
          throw new Error(`Expected 401/403, got ${res.status}`);
        }
      });
  });
});

import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/db/prisma.service';
import { createTestApp, resetDatabase } from './test-app.factory';

describe('Machine API (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  describe('POST /api/v1/machines', () => {
    it('creates a machine and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/machines')
        .send({
          machineCode: 'PRESS-T01',
          name: '테스트 프레스',
          machineType: 'PRESS',
        })
        .expect(201);

      expect(res.body.data).toMatchObject({
        machineCode: 'PRESS-T01',
        machineType: 'PRESS',
        status: 'ACTIVE',
      });
    });

    it('rejects duplicate machineCode with 409', async () => {
      const payload = { machineCode: 'PRESS-DUP', name: '중복', machineType: 'PRESS' };
      await request(app.getHttpServer()).post('/api/v1/machines').send(payload).expect(201);
      await request(app.getHttpServer()).post('/api/v1/machines').send(payload).expect(409);
    });
  });

  describe('GET /api/v1/machines', () => {
    it('lists all machines', async () => {
      await prisma.machine.createMany({
        data: [
          { machineCode: 'M-01', name: '설비1', machineType: 'PRESS', status: 'ACTIVE' },
          { machineCode: 'M-02', name: '설비2', machineType: 'PRESS', status: 'MAINTENANCE' },
        ],
      });

      const res = await request(app.getHttpServer()).get('/api/v1/machines').expect(200);
      expect(res.body.total).toBe(2);
    });
  });

  describe('PATCH /api/v1/machines/:id', () => {
    it('updates machine status', async () => {
      const machine = await prisma.machine.create({
        data: { machineCode: 'M-PATCH', name: '패치설비', machineType: 'PRESS' },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/machines/${machine.id}`)
        .send({ status: 'MAINTENANCE' })
        .expect(200);

      expect(res.body.data.status).toBe('MAINTENANCE');
    });
  });
});

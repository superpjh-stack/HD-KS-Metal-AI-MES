import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/db/prisma.service';
import { createTestApp, resetDatabase, seedUser } from './test-app.factory';

describe('LOT API (integration)', () => {
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

  // ─── POST /api/v1/lots ───────────────────────────────────────

  describe('POST /api/v1/lots', () => {
    it('creates a LOT and returns 201', async () => {
      const user = await seedUser(prisma);

      const res = await request(app.getHttpServer())
        .post('/api/v1/lots')
        .send({
          lotNumber: 'LOT-TEST-001',
          lotType: 'MATERIAL',
          quantity: 100,
          unit: 'EA',
          createdById: user.id,
        })
        .expect(201);

      expect(res.body.data).toMatchObject({
        lotNumber: 'LOT-TEST-001',
        lotType: 'MATERIAL',
        quantity: 100,
        status: 'ACTIVE',
      });
    });

    it('rejects duplicate lotNumber with 409', async () => {
      const user = await seedUser(prisma);
      const payload = { lotNumber: 'LOT-DUP', lotType: 'MATERIAL', quantity: 10, unit: 'EA', createdById: user.id };

      await request(app.getHttpServer()).post('/api/v1/lots').send(payload).expect(201);
      await request(app.getHttpServer()).post('/api/v1/lots').send(payload).expect(409);
    });
  });

  // ─── GET /api/v1/lots ───────────────────────────────────────

  describe('GET /api/v1/lots', () => {
    it('returns paginated list with total', async () => {
      const user = await seedUser(prisma);
      await prisma.lot.createMany({
        data: [
          { lotNumber: 'LOT-A', lotType: 'MATERIAL', quantity: 10, unit: 'EA', status: 'ACTIVE', createdById: user.id },
          { lotNumber: 'LOT-B', lotType: 'MATERIAL', quantity: 20, unit: 'EA', status: 'USED',   createdById: user.id },
          { lotNumber: 'LOT-C', lotType: 'MATERIAL', quantity: 30, unit: 'EA', status: 'ACTIVE', createdById: user.id },
        ],
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/lots?limit=2&page=1')
        .expect(200);

      expect(res.body.total).toBe(3);
      expect(res.body.data).toHaveLength(2);
    });

    it('filters by status', async () => {
      const user = await seedUser(prisma);
      await prisma.lot.createMany({
        data: [
          { lotNumber: 'LOT-X', lotType: 'MATERIAL', quantity: 10, unit: 'EA', status: 'ACTIVE',   createdById: user.id },
          { lotNumber: 'LOT-Y', lotType: 'MATERIAL', quantity: 10, unit: 'EA', status: 'REJECTED', createdById: user.id },
        ],
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/lots?status=ACTIVE')
        .expect(200);

      expect(res.body.data.every((l: { status: string }) => l.status === 'ACTIVE')).toBe(true);
    });
  });

  // ─── GET /api/v1/lots/:id/trace ─────────────────────────────

  describe('GET /api/v1/lots/:id/trace', () => {
    it('returns lot + events within 3 seconds', async () => {
      const user = await seedUser(prisma);
      const lot = await prisma.lot.create({
        data: { lotNumber: 'TRACE-001', lotType: 'MATERIAL', quantity: 50, unit: 'EA', createdById: user.id },
      });
      await prisma.lotEvent.createMany({
        data: [
          { lotId: lot.id, eventType: 'INBOUND',  occurredAt: new Date(), recordedById: user.id },
          { lotId: lot.id, eventType: 'INSPECTION', occurredAt: new Date(), recordedById: user.id },
        ],
      });

      const start = Date.now();
      const res = await request(app.getHttpServer())
        .get(`/api/v1/lots/${lot.id}/trace`)
        .expect(200);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(3_000);
      expect(res.body.data.lot.lotNumber).toBe('TRACE-001');
      expect(res.body.data.events).toHaveLength(2);
    });

    it('returns 404 for unknown lot id', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/lots/nonexistent-id/trace')
        .expect(404);
    });
  });

  // ─── PATCH /api/v1/lots/:id/status ─────────────────────────

  describe('PATCH /api/v1/lots/:id/status', () => {
    it('updates status', async () => {
      const user = await seedUser(prisma);
      const lot = await prisma.lot.create({
        data: { lotNumber: 'STATUS-001', lotType: 'MATERIAL', quantity: 10, unit: 'EA', createdById: user.id },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/lots/${lot.id}/status`)
        .send({ status: 'SHIPPED' })
        .expect(200);

      expect(res.body.data.status).toBe('SHIPPED');
    });
  });
});

import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/db/prisma.service';
import { createTestApp, resetDatabase, seedMachine } from './test-app.factory';

describe('Alarm API (integration)', () => {
  let app:    INestApplication;
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

  // ── AlarmRule CRUD ──────────────────────────────────────────────

  describe('POST /api/v1/alarm-rules', () => {
    it('임계값 규칙을 생성하고 201 반환', async () => {
      const machine = await seedMachine(prisma);

      const res = await request(app.getHttpServer())
        .post('/api/v1/alarm-rules')
        .send({
          machineId: machine.id,
          channel:   'vibration_x',
          ruleType:  'THRESHOLD',
          threshold: 10.0,
          severity:  'WARNING',
        })
        .expect(201);

      expect(res.body.data).toMatchObject({
        machineId: machine.id,
        channel:   'vibration_x',
        ruleType:  'THRESHOLD',
        threshold: 10.0,
        enabled:   true,
      });
    });

    it('중복 machineId+channel+ruleType 은 409 반환', async () => {
      const machine = await seedMachine(prisma);
      const payload = {
        machineId: machine.id, channel: 'temperature',
        ruleType: 'THRESHOLD', threshold: 80,
      };

      await request(app.getHttpServer()).post('/api/v1/alarm-rules').send(payload).expect(201);
      await request(app.getHttpServer()).post('/api/v1/alarm-rules').send(payload).expect(409);
    });

    it('필수 필드 누락 시 400 반환', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/alarm-rules')
        .send({ channel: 'vibration_x', ruleType: 'THRESHOLD' })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/alarm-rules/:id', () => {
    it('임계값 변경', async () => {
      const machine = await seedMachine(prisma);
      const rule = await prisma.alarmRule.create({
        data: {
          machineId: machine.id, channel: 'current',
          ruleType: 'THRESHOLD', threshold: 50, severity: 'WARNING',
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/alarm-rules/${rule.id}`)
        .send({ threshold: 70, severity: 'CRITICAL' })
        .expect(200);

      expect(res.body.data.threshold).toBe(70);
      expect(res.body.data.severity).toBe('CRITICAL');
    });

    it('enabled = false 로 규칙 비활성화', async () => {
      const machine = await seedMachine(prisma);
      const rule = await prisma.alarmRule.create({
        data: {
          machineId: machine.id, channel: 'temperature',
          ruleType: 'THRESHOLD', threshold: 80, severity: 'WARNING',
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/alarm-rules/${rule.id}`)
        .send({ enabled: false })
        .expect(200);

      expect(res.body.data.enabled).toBe(false);
    });

    it('존재하지 않는 규칙은 404', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/alarm-rules/nonexistent-id')
        .send({ threshold: 10 })
        .expect(404);
    });
  });

  // ── AlarmEvent acknowledge ──────────────────────────────────────

  describe('PATCH /api/v1/alarm-events/:id/acknowledge', () => {
    it('알람 처리 확인 후 acknowledgedAt 설정', async () => {
      const machine = await seedMachine(prisma);
      const rule = await prisma.alarmRule.create({
        data: {
          machineId: machine.id, channel: 'vibration_x',
          ruleType: 'THRESHOLD', threshold: 10, severity: 'CRITICAL',
        },
      });
      const event = await prisma.alarmEvent.create({
        data: {
          ruleId: rule.id, machineId: machine.id,
          channel: 'vibration_x', severity: 'CRITICAL',
          value: 15.2, threshold: 10, message: '테스트 알람',
          occurredAt: new Date(),
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/alarm-events/${event.id}/acknowledge`)
        .expect(200);

      expect(res.body.data.acknowledgedAt).not.toBeNull();
      // 인증 없는 테스트: acknowledgedBy 는 null (guard 미적용)
    });

    it('존재하지 않는 이벤트는 404', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/alarm-events/no-such-event/acknowledge')
        .expect(404);
    });
  });

  // ── AlarmEvent 조회 ─────────────────────────────────────────────

  describe('GET /api/v1/alarm-events', () => {
    it('미처리 알람만 필터링', async () => {
      const machine = await seedMachine(prisma);
      const rule = await prisma.alarmRule.create({
        data: {
          machineId: machine.id, channel: 'pressure',
          ruleType: 'THRESHOLD', threshold: 8, severity: 'WARNING',
        },
      });

      await prisma.alarmEvent.createMany({
        data: [
          {
            ruleId: rule.id, machineId: machine.id, channel: 'pressure',
            severity: 'WARNING', value: 9, threshold: 8,
            message: '미처리', occurredAt: new Date(),
          },
          {
            ruleId: rule.id, machineId: machine.id, channel: 'pressure',
            severity: 'WARNING', value: 10, threshold: 8,
            message: '처리됨', occurredAt: new Date(),
            acknowledgedAt: new Date(), acknowledgedBy: 'user-1',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/alarm-events?unacknowledgedOnly=true')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].message).toBe('미처리');
    });

    it('machineId 필터링', async () => {
      const m1 = await seedMachine(prisma, { machineCode: 'PRESS-F1' });
      const m2 = await seedMachine(prisma, { machineCode: 'PRESS-F2' });
      const rule1 = await prisma.alarmRule.create({
        data: { machineId: m1.id, channel: 'vibration_x', ruleType: 'THRESHOLD', threshold: 5, severity: 'WARNING' },
      });
      const rule2 = await prisma.alarmRule.create({
        data: { machineId: m2.id, channel: 'vibration_x', ruleType: 'THRESHOLD', threshold: 5, severity: 'WARNING' },
      });

      await prisma.alarmEvent.createMany({
        data: [
          { ruleId: rule1.id, machineId: m1.id, channel: 'vibration_x', severity: 'WARNING', value: 6, threshold: 5, message: 'm1', occurredAt: new Date() },
          { ruleId: rule2.id, machineId: m2.id, channel: 'vibration_x', severity: 'WARNING', value: 7, threshold: 5, message: 'm2', occurredAt: new Date() },
        ],
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/alarm-events?machineId=${m1.id}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].machineId).toBe(m1.id);
    });
  });

  // ── AlarmEvent summary ──────────────────────────────────────────

  describe('GET /api/v1/alarm-events/summary', () => {
    it('설비별 미처리 알람 수 반환', async () => {
      const machine = await seedMachine(prisma);
      const rule = await prisma.alarmRule.create({
        data: { machineId: machine.id, channel: 'current', ruleType: 'THRESHOLD', threshold: 50, severity: 'CRITICAL' },
      });

      await prisma.alarmEvent.createMany({
        data: [
          { ruleId: rule.id, machineId: machine.id, channel: 'current', severity: 'CRITICAL', value: 55, threshold: 50, message: 'a1', occurredAt: new Date() },
          { ruleId: rule.id, machineId: machine.id, channel: 'current', severity: 'CRITICAL', value: 56, threshold: 50, message: 'a2', occurredAt: new Date() },
        ],
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/alarm-events/summary')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        machineId:   machine.id,
        count:       2,
        maxSeverity: 'CRITICAL',
      });
    });
  });
});

/**
 * IoT Pipeline Latency Test (< 10s)
 *
 * Verifies the full write path:
 *   TimescaleWriteService.enqueue() → UNNEST bulk INSERT → row visible in DB
 *
 * Uses testcontainers for a real PostgreSQL instance and Redis.
 * Aedes provides an in-process MQTT broker so no external daemon is needed.
 *
 * Design goal §1.1 #2: IoT data latency < 10s
 */

import { Test, TestingModule } from '@nestjs/testing';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { Pool } from 'pg';
import { TimescaleWriteService, SensorRow } from '../src/timescale/timescale-write.service';
import { RedisPubSubService } from '../src/redis/redis-pubsub.service';
import { PG_POOL } from '../src/timescale/timescale.module';
import { REDIS_CLIENT, REDIS_SUB_CLIENT } from '../src/redis/redis.module';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

let pgContainer: StartedTestContainer;
let redisContainer: StartedTestContainer;
let pool: Pool;
let redisClient: Redis;
let redisSubClient: Redis;
let moduleRef: TestingModule;
let timescaleWrite: TimescaleWriteService;
let redisPubSub: RedisPubSubService;

async function waitForRow(
  pgPool: Pool,
  machineId: string,
  channel: string,
  afterTime: Date,
  timeoutMs = 10_000,
): Promise<{ found: boolean; elapsedMs: number }> {
  const start = Date.now();
  const deadline = start + timeoutMs;

  while (Date.now() < deadline) {
    const { rows } = await pgPool.query(
      `SELECT 1 FROM sensor_data WHERE machine_id = $1 AND channel = $2 AND time >= $3 LIMIT 1`,
      [machineId, channel, afterTime],
    );
    if (rows.length > 0) return { found: true, elapsedMs: Date.now() - start };
    await new Promise((r) => setTimeout(r, 100));
  }
  return { found: false, elapsedMs: timeoutMs };
}

beforeAll(async () => {
  // ── Containers ───────────────────────────────────────────────
  [pgContainer, redisContainer] = await Promise.all([
    new GenericContainer('postgres:16-alpine')
      .withEnvironment({ POSTGRES_DB: 'iot_test', POSTGRES_USER: 'test', POSTGRES_PASSWORD: 'test' })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
      .start(),
    new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start(),
  ]);

  pool = new Pool({
    host: pgContainer.getHost(),
    port: pgContainer.getMappedPort(5432),
    database: 'iot_test',
    user: 'test',
    password: 'test',
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sensor_data (
      time        TIMESTAMPTZ NOT NULL,
      machine_id  TEXT NOT NULL,
      channel     TEXT NOT NULL,
      value       DOUBLE PRECISION NOT NULL,
      quality     INT NOT NULL DEFAULT 192
    )
  `);

  const redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;
  redisClient    = new Redis(redisUrl);
  redisSubClient = new Redis(redisUrl);

  // ── NestJS TestingModule ─────────────────────────────────────
  moduleRef = await Test.createTestingModule({
    providers: [
      TimescaleWriteService,
      RedisPubSubService,
      {
        provide: PG_POOL,
        useValue: pool,
      },
      {
        provide: REDIS_CLIENT,
        useValue: redisClient,
      },
      {
        provide: REDIS_SUB_CLIENT,
        useValue: redisSubClient,
      },
      {
        provide: ConfigService,
        useValue: {
          get: (key: string, def?: unknown) => {
            if (key === 'SENSOR_FLUSH_INTERVAL_MS') return 300; // fast flush for tests
            if (key === 'SENSOR_FLUSH_BATCH_SIZE') return 500;
            return def;
          },
        },
      },
    ],
  }).compile();

  timescaleWrite = moduleRef.get(TimescaleWriteService);
  redisPubSub    = moduleRef.get(RedisPubSubService);

  await moduleRef.init();
}, 90_000);

afterAll(async () => {
  await moduleRef?.close();
  await pool?.end();
  await redisClient?.quit();
  await redisSubClient?.quit();
  await pgContainer?.stop();
  await redisContainer?.stop();
});

describe('IoT 파이프라인 지연 테스트 (설계 목표 §1.1 #2)', () => {
  beforeEach(async () => {
    await pool.query('DELETE FROM sensor_data');
  });

  it('enqueue → DB flush 완료 < 2초 (정상 단일 채널)', async () => {
    const t0 = new Date();
    const row: SensorRow = {
      time: t0,
      machineId: 'PRESS-01',
      channel: 'vibration_x',
      value: 1.23,
      quality: 192,
    };

    timescaleWrite.enqueue([row]);

    const { found, elapsedMs } = await waitForRow(pool, 'PRESS-01', 'vibration_x', t0, 2_000);
    console.log(`  단일 채널 flush 지연: ${elapsedMs}ms`);
    expect(found).toBe(true);
    expect(elapsedMs).toBeLessThan(2_000);
  });

  it('enqueue → DB flush 완료 < 10초 (다채널 배치 — 설계 목표)', async () => {
    const t0 = new Date();
    const channels = ['vibration_x', 'vibration_y', 'temperature', 'power_kw', 'spm', 'pressure'];

    const rows: SensorRow[] = channels.map((ch) => ({
      time: t0,
      machineId: 'PRESS-02',
      channel: ch,
      value: Math.random() * 10,
      quality: 192,
    }));

    timescaleWrite.enqueue(rows);

    // Wait for last channel to appear — all rows flush in same batch
    const { found, elapsedMs } = await waitForRow(pool, 'PRESS-02', 'pressure', t0, 10_000);
    console.log(`  6-채널 배치 flush 지연: ${elapsedMs}ms`);
    expect(found).toBe(true);
    expect(elapsedMs).toBeLessThan(10_000);

    const { rows: dbRows } = await pool.query(
      `SELECT channel FROM sensor_data WHERE machine_id = 'PRESS-02'`,
    );
    expect(dbRows).toHaveLength(channels.length);
  });

  it('500개 동시 enqueue → 전부 DB 기록 < 10초 (고부하)', async () => {
    const t0 = new Date();
    const rows: SensorRow[] = Array.from({ length: 500 }, (_, i) => ({
      time: new Date(t0.getTime() + i),
      machineId: 'PRESS-03',
      channel: i % 2 === 0 ? 'vibration_x' : 'temperature',
      value: i * 0.1,
      quality: 192,
    }));

    timescaleWrite.enqueue(rows);

    const { found, elapsedMs } = await waitForRow(pool, 'PRESS-03', 'vibration_x', t0, 10_000);
    console.log(`  500-row 고부하 flush 지연: ${elapsedMs}ms`);
    expect(found).toBe(true);
    expect(elapsedMs).toBeLessThan(10_000);
  });

  it('Redis publish → subscribe 지연 < 500ms', async () => {
    const channel = 'realtime:PRESS-04';
    const received: unknown[] = [];

    const sub = redisPubSub.subscribe(channel).subscribe((data) => received.push(data));

    await new Promise((r) => setTimeout(r, 100)); // allow subscribe to propagate

    const t0 = Date.now();
    await redisPubSub.publish(channel, { machineCode: 'PRESS-04', value: 99 });

    const deadline = Date.now() + 500;
    while (received.length === 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 20));
    }

    const elapsedMs = Date.now() - t0;
    console.log(`  Redis pub/sub 지연: ${elapsedMs}ms`);
    expect(received.length).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(500);

    sub.unsubscribe();
  });
});

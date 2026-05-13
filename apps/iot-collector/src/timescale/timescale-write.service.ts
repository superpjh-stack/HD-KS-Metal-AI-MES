import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PG_POOL } from './timescale.module';

export interface SensorRow {
  time: Date;
  machineId: string;
  channel: string;
  value: number;
  quality: number;
}

@Injectable()
export class TimescaleWriteService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TimescaleWriteService.name);
  private buffer: SensorRow[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly flushInterval: number;
  private readonly batchSize: number;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly config: ConfigService,
  ) {
    this.flushInterval = Number(config.get('SENSOR_FLUSH_INTERVAL_MS', 1000));
    this.batchSize = Number(config.get('SENSOR_FLUSH_BATCH_SIZE', 500));
  }

  onModuleInit() {
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }

  onModuleDestroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    return this.flush();
  }

  enqueue(rows: SensorRow[]) {
    this.buffer.push(...rows);
    if (this.buffer.length >= this.batchSize) {
      void this.flush();
    }
  }

  private async flush() {
    if (this.buffer.length === 0) return;

    const rows = this.buffer.splice(0, this.buffer.length);

    // UNNEST 벌크 인서트 (TimescaleDB 최적화)
    const times = rows.map((r) => r.time);
    const machineIds = rows.map((r) => r.machineId);
    const channels = rows.map((r) => r.channel);
    const values = rows.map((r) => r.value);
    const qualities = rows.map((r) => r.quality);

    try {
      await this.pool.query(
        `INSERT INTO sensor_data (time, machine_id, channel, value, quality)
         SELECT * FROM UNNEST($1::timestamptz[], $2::text[], $3::text[], $4::float8[], $5::int[])`,
        [times, machineIds, channels, values, qualities],
      );
      this.logger.debug(`Flushed ${rows.length} sensor rows`);
    } catch (err) {
      this.logger.error(`TimescaleDB flush error: ${(err as Error).message}`);
      // 실패 시 재시도 없이 버림 — 운영에선 DLQ 고려
    }
  }
}

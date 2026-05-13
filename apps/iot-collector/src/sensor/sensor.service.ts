import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../timescale/timescale.module';

export interface SensorChannel {
  value: number;
  unit: string;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

const CHANNEL_UNITS: Record<string, string> = {
  vibration_x: 'm/s²',
  vibration_y: 'm/s²',
  temperature: '°C',
  power_kw: 'kW',
  spm: 'spm',
  pressure: 'bar',
};

const CHANNEL_THRESHOLDS: Record<string, { warning: number; critical: number }> = {
  vibration_x: { warning: 5.0, critical: 10.0 },
  vibration_y: { warning: 5.0, critical: 10.0 },
  temperature: { warning: 80.0, critical: 100.0 },
  power_kw: { warning: 50.0, critical: 70.0 },
  spm: { warning: 80, critical: 100 },
  pressure: { warning: 8.0, critical: 10.0 },
};

function classifyStatus(channel: string, value: number): 'NORMAL' | 'WARNING' | 'CRITICAL' {
  const t = CHANNEL_THRESHOLDS[channel];
  if (!t) return 'NORMAL';
  if (value >= t.critical) return 'CRITICAL';
  if (value >= t.warning) return 'WARNING';
  return 'NORMAL';
}

@Injectable()
export class SensorService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getLatest() {
    // DISTINCT ON: 설비+채널별 최신값 1건씩
    const { rows } = await this.pool.query<{
      machine_id: string;
      channel: string;
      value: number;
      time: Date;
    }>(`
      SELECT DISTINCT ON (machine_id, channel)
        machine_id, channel, value, time
      FROM sensor_data
      ORDER BY machine_id, channel, time DESC
    `);

    // 설비별로 그룹핑
    const machineMap = new Map<string, { updatedAt: Date; sensors: Record<string, SensorChannel> }>();
    for (const row of rows) {
      if (!machineMap.has(row.machine_id)) {
        machineMap.set(row.machine_id, { updatedAt: row.time, sensors: {} });
      }
      const entry = machineMap.get(row.machine_id)!;
      entry.sensors[row.channel] = {
        value: row.value,
        unit: CHANNEL_UNITS[row.channel] ?? '',
        status: classifyStatus(row.channel, row.value),
      };
      if (row.time > entry.updatedAt) entry.updatedAt = row.time;
    }

    return {
      timestamp: new Date(),
      machines: Array.from(machineMap.entries()).map(([machineCode, data]) => ({
        machineCode,
        sensors: data.sensors,
        updatedAt: data.updatedAt,
      })),
    };
  }

  async getHistory(machineId: string, from: Date, to: Date, channel?: string) {
    const params: (string | Date)[] = [machineId, from, to];
    let channelFilter = '';

    if (channel) {
      params.push(channel);
      channelFilter = `AND channel = $${params.length}`;
    }

    const { rows } = await this.pool.query<{
      time: Date;
      channel: string;
      value: number;
      quality: number;
    }>(
      `SELECT time, channel, value, quality
       FROM sensor_data
       WHERE machine_id = $1
         AND time BETWEEN $2 AND $3
         ${channelFilter}
       ORDER BY time ASC
       LIMIT 10000`,
      params,
    );

    return rows;
  }
}

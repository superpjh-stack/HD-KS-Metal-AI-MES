import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { AlarmSeverity, SpcParameter } from '@prisma/client';
import { TS_POOL } from '../timescale/timescale.module';
import { PrismaService } from '../db/prisma.service';
import { ControlLimits, detectWesternElectric, WERuleId } from './western-electric';

// ── SPC 상수 (n = 2~10) — ISO 8258 / Montgomery ────────────────────
const SPC_CONST: Record<number, { A2: number; D3: number; D4: number }> = {
  2:  { A2: 1.880, D3: 0,     D4: 3.267 },
  3:  { A2: 1.023, D3: 0,     D4: 2.574 },
  4:  { A2: 0.729, D3: 0,     D4: 2.282 },
  5:  { A2: 0.577, D3: 0,     D4: 2.114 },
  6:  { A2: 0.483, D3: 0,     D4: 2.004 },
  7:  { A2: 0.419, D3: 0.076, D4: 1.924 },
  8:  { A2: 0.373, D3: 0.136, D4: 1.864 },
  9:  { A2: 0.337, D3: 0.184, D4: 1.816 },
  10: { A2: 0.308, D3: 0.223, D4: 1.777 },
};

export interface SpcPoint {
  bucket:     Date;
  xbar:       number;
  range:      number;
  violations: WERuleId[];
}

export interface ControlLimitsResult {
  cl_xbar:  number;
  ucl_xbar: number;
  lcl_xbar: number;
  cl_r:     number;
  ucl_r:    number;
  lcl_r:    number;
}

export interface SpcQueryRow {
  bucket:  Date;
  avg_val: number;
  max_val: number;
  min_val: number;
}

export interface ChartData {
  machineId:  string;
  channel:    string;
  sampleSize: number;
  limits:     ControlLimitsResult | null;
  points:     SpcPoint[];
}

export interface CapabilityItem {
  channel:  string;
  cp:       number | null;
  cpk:      number | null;
  mean:     number;
  std:      number;
  samples:  number;
  usl:      number | null;
  lsl:      number | null;
  status:   'OK' | 'WARNING' | 'CRITICAL' | 'INSUFFICIENT_DATA';
}

export interface UpsertSpcParameterInput {
  machineId:   string;
  channel:     string;
  usl?:        number | null;
  lsl?:        number | null;
  sampleSize?: number;
  sampleCount?: number;
}

@Injectable()
export class SpcService {
  constructor(
    @Inject(TS_POOL) private readonly pool: Pool,
    private readonly prisma: PrismaService,
  ) {}

  // ── TimescaleDB 조회 ─────────────────────────────────────────────

  async fetchMinuteAggregates(
    machineCode: string,
    channel: string,
    fromMinutesAgo: number,
  ): Promise<SpcQueryRow[]> {
    const { rows } = await this.pool.query<SpcQueryRow>(
      `SELECT bucket, avg_val, max_val, min_val
       FROM sensor_data_1min
       WHERE machine_id = $1
         AND channel    = $2
         AND bucket    >= NOW() - ($3 || ' minutes')::INTERVAL
       ORDER BY bucket ASC`,
      [machineCode, channel, fromMinutesAgo],
    );
    return rows;
  }

  async fetchMinuteAggregatesRange(
    machineCode: string,
    channel: string,
    from: Date,
    to: Date,
  ): Promise<SpcQueryRow[]> {
    const { rows } = await this.pool.query<SpcQueryRow>(
      `SELECT bucket, avg_val, max_val, min_val
       FROM sensor_data_1min
       WHERE machine_id = $1
         AND channel    = $2
         AND bucket BETWEEN $3 AND $4
       ORDER BY bucket ASC`,
      [machineCode, channel, from, to],
    );
    return rows;
  }

  // ── 서브그룹 분할 ───────────────────────────────────────────────

  buildSubgroups(rows: SpcQueryRow[], n: number): Omit<SpcPoint, 'violations'>[] {
    const points: Omit<SpcPoint, 'violations'>[] = [];
    for (let i = 0; i <= rows.length - n; i += n) {
      const group = rows.slice(i, i + n);
      const vals  = group.map((r) => r.avg_val);
      const xbar  = vals.reduce((s, v) => s + v, 0) / n;
      const range = Math.max(...vals) - Math.min(...vals);
      points.push({ bucket: group[group.length - 1].bucket, xbar, range });
    }
    return points;
  }

  // ── 관리한계 계산 ───────────────────────────────────────────────

  computeControlLimits(
    points: Omit<SpcPoint, 'violations'>[],
    n: number,
  ): ControlLimitsResult | null {
    if (points.length < 2) return null;
    const c = SPC_CONST[n] ?? SPC_CONST[5];

    const xbarBar = points.reduce((s, p) => s + p.xbar, 0)  / points.length;
    const rBar    = points.reduce((s, p) => s + p.range, 0) / points.length;

    return {
      cl_xbar:  xbarBar,
      ucl_xbar: xbarBar + c.A2 * rBar,
      lcl_xbar: Math.max(0, xbarBar - c.A2 * rBar),
      cl_r:     rBar,
      ucl_r:    c.D4 * rBar,
      lcl_r:    c.D3 * rBar,
    };
  }

  xbarLimitsAsControlLimits(limits: ControlLimitsResult): ControlLimits {
    return { cl: limits.cl_xbar, ucl: limits.ucl_xbar, lcl: limits.lcl_xbar };
  }

  // ── Chart 데이터 생성 (컨트롤러용) ─────────────────────────────

  async buildChartData(
    machineId: string,
    machineCode: string,
    channel: string,
    from: Date,
    to: Date,
    sampleSize = 5,
  ): Promise<ChartData> {
    const rows = await this.fetchMinuteAggregatesRange(machineCode, channel, from, to);

    if (rows.length < sampleSize * 2) {
      return { machineId, channel, sampleSize, limits: null, points: [] };
    }

    const rawPoints = this.buildSubgroups(rows, sampleSize);
    const limits    = this.computeControlLimits(rawPoints, sampleSize);
    const clLimits  = limits ? this.xbarLimitsAsControlLimits(limits) : null;

    // WE 위반: 누적 시계열 기준 (각 포인트까지의 히스토리)
    const xbars  = rawPoints.map((p) => p.xbar);
    const points: SpcPoint[] = rawPoints.map((p, i) => ({
      ...p,
      violations: clLimits
        ? detectWesternElectric(xbars.slice(0, i + 1), clLimits)
        : [],
    }));

    return { machineId, channel, sampleSize, limits, points };
  }

  // ── Cp / Cpk 계산 ───────────────────────────────────────────────

  computeCapability(
    samples: number[],
    usl: number | null,
    lsl: number | null,
  ): { cp: number | null; cpk: number | null; mean: number; std: number } {
    const n    = samples.length;
    const mean = samples.reduce((s, v) => s + v, 0) / n;
    const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
    const std  = Math.sqrt(variance);

    if (std === 0) return { cp: null, cpk: null, mean, std };

    const cp  = usl !== null && lsl !== null ? (usl - lsl) / (6 * std) : null;
    const cpu = usl !== null ? (usl - mean) / (3 * std) : null;
    const cpl = lsl !== null ? (mean - lsl) / (3 * std) : null;

    let cpk: number | null = null;
    if (cpu !== null && cpl !== null) cpk = Math.min(cpu, cpl);
    else if (cpu !== null) cpk = cpu;
    else if (cpl !== null) cpk = cpl;

    return { cp, cpk, mean, std };
  }

  private classifyCapability(cpk: number | null): 'OK' | 'WARNING' | 'CRITICAL' | 'INSUFFICIENT_DATA' {
    if (cpk === null) return 'INSUFFICIENT_DATA';
    if (cpk >= 1.33) return 'OK';
    if (cpk >= 1.00) return 'WARNING';
    return 'CRITICAL';
  }

  async getCapabilityForMachine(machineId: string): Promise<CapabilityItem[]> {
    const machine = await this.prisma.machine.findUnique({
      where: { id: machineId },
      select: { machineCode: true },
    });
    if (!machine) return [];

    const params = await this.prisma.spcParameter.findMany({ where: { machineId } });
    if (params.length === 0) return [];

    const results = await Promise.all(
      params.map(async (p) => {
        const windowMin = (p.sampleCount ?? 25) * (p.sampleSize ?? 5);
        const rows = await this.fetchMinuteAggregates(machine.machineCode, p.channel, windowMin);
        const samples = rows.map((r) => r.avg_val);

        if (samples.length < 5) {
          return {
            channel: p.channel, cp: null, cpk: null, mean: 0, std: 0,
            samples: samples.length, usl: p.usl, lsl: p.lsl, status: 'INSUFFICIENT_DATA' as const,
          };
        }

        const { cp, cpk, mean, std } = this.computeCapability(samples, p.usl, p.lsl);
        return {
          channel: p.channel, cp, cpk, mean, std,
          samples: samples.length, usl: p.usl, lsl: p.lsl,
          status: this.classifyCapability(cpk),
        };
      }),
    );

    return results;
  }

  // ── SpcParameter CRUD ───────────────────────────────────────────

  async upsertParameter(input: UpsertSpcParameterInput): Promise<SpcParameter> {
    return this.prisma.spcParameter.upsert({
      where:  { machineId_channel: { machineId: input.machineId, channel: input.channel } },
      create: {
        machineId:   input.machineId,
        channel:     input.channel,
        usl:         input.usl ?? null,
        lsl:         input.lsl ?? null,
        sampleSize:  input.sampleSize  ?? 5,
        sampleCount: input.sampleCount ?? 25,
      },
      update: {
        ...(input.usl        !== undefined && { usl:         input.usl }),
        ...(input.lsl        !== undefined && { lsl:         input.lsl }),
        ...(input.sampleSize !== undefined && { sampleSize:  input.sampleSize }),
        ...(input.sampleCount !== undefined && { sampleCount: input.sampleCount }),
      },
    });
  }

  async getParameter(machineId: string, channel: string): Promise<SpcParameter> {
    const param = await this.prisma.spcParameter.findUnique({
      where: { machineId_channel: { machineId, channel } },
    });
    if (!param) throw new NotFoundException(`SpcParameter not found: ${machineId}/${channel}`);
    return param;
  }

  async listParameters(machineId: string): Promise<SpcParameter[]> {
    return this.prisma.spcParameter.findMany({ where: { machineId } });
  }

  // ── 스케줄러용: 설비 machineCode 조회 ──────────────────────────

  async getMachineCode(machineId: string): Promise<string | null> {
    const m = await this.prisma.machine.findUnique({
      where: { id: machineId },
      select: { machineCode: true },
    });
    return m?.machineCode ?? null;
  }

  async getParameterOrDefault(
    machineId: string,
    channel: string,
  ): Promise<{ sampleSize: number; sampleCount: number }> {
    const p = await this.prisma.spcParameter.findUnique({
      where: { machineId_channel: { machineId, channel } },
      select: { sampleSize: true, sampleCount: true },
    });
    return { sampleSize: p?.sampleSize ?? 5, sampleCount: p?.sampleCount ?? 25 };
  }
}

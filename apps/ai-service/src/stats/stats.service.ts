import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { TS_POOL } from '../timescale/timescale.module';
import { PrismaService } from '../db/prisma.service';

export interface RollingStats {
  mean:   number;
  std:    number;
  count:  number;
  latest: number;
}

export interface MinuteBucket {
  bucket:  Date;
  avg_val: number;
}

// ── 신규 인터페이스 ────────────────────────────────────────────

export interface OeeResult {
  machineId:    string;
  from:         string;
  to:           string;
  availability: number;
  performance:  number;
  quality:      number;
  oee:          number;
  woCount:      number;
}

export interface OeeHistoryItem {
  date:         string;
  availability: number;
  performance:  number;
  quality:      number;
  oee:          number;
}

export interface EnergyPoint {
  time:  string;
  avgKw: number;
}

export interface OverviewItem {
  machineId:        string;
  machineCode:      string;
  name:             string;
  status:           string;
  alarmCount:       number;
  maxAlarmSeverity: 'NONE' | 'INFO' | 'WARNING' | 'CRITICAL';
  pdmAnomalyScore:  number | null;
  pdmFailureProb:   number | null;
  pdmRulHours:      number | null;
  spcViolations:    number;
  riskLevel:        'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface ReportData {
  period:   { from: string; to: string };
  machines: Array<{
    machineId:   string;
    machineCode: string;
    name:        string;
    oee:         number | null;
    alarmCount:  number;
    pdmRisk:     'NONE' | 'LOW' | 'HIGH';
    topChannel:  string | null;
  }>;
  alarms: {
    total:       number;
    critical:    number;
    warning:     number;
    info:        number;
    topChannels: Array<{ channel: string; count: number }>;
  };
  pdm: {
    anomalyCount:     number;
    highRiskMachines: number;
    avgRulHours:      number | null;
  };
  spc: {
    totalViolations: number;
    topMachines:     Array<{ machineCode: string; count: number }>;
  };
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    @Inject(TS_POOL) private readonly pool: Pool,
    private readonly prisma: PrismaService,
  ) {}

  // ── 기존 메서드 ────────────────────────────────────────────────

  async fetchWindow(
    machineCode: string,
    channel: string,
    windowMin: number,
  ): Promise<MinuteBucket[]> {
    const { rows } = await this.pool.query<MinuteBucket>(
      `SELECT bucket, avg_val
       FROM sensor_data_1min
       WHERE machine_id = $1
         AND channel    = $2
         AND bucket    >= NOW() - ($3 || ' minutes')::INTERVAL
       ORDER BY bucket ASC`,
      [machineCode, channel, windowMin],
    );
    return rows;
  }

  compute(buckets: MinuteBucket[]): RollingStats | null {
    if (buckets.length < 5) return null;
    const vals  = buckets.map((b) => b.avg_val);
    const n     = vals.length;
    const mean  = vals.reduce((s, v) => s + v, 0) / n;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
    const std   = Math.sqrt(variance);
    const latest = vals[vals.length - 1];
    return { mean, std, count: n, latest };
  }

  isAnomaly(stats: RollingStats, sigmaFactor: number): boolean {
    if (stats.std === 0) return false;
    return Math.abs(stats.latest - stats.mean) > sigmaFactor * stats.std;
  }

  anomalyMessage(channel: string, stats: RollingStats, sigmaFactor: number): string {
    const deviation = ((stats.latest - stats.mean) / stats.std).toFixed(2);
    return (
      `[±${sigmaFactor}σ ${channel}] 측정값 ${stats.latest.toFixed(4)} — ` +
      `평균 ${stats.mean.toFixed(4)}, σ ${stats.std.toFixed(4)}, 이탈 ${deviation}σ`
    );
  }

  // ── OEE 계산 ──────────────────────────────────────────────────

  async calcOee(machineId: string, from?: Date, to?: Date): Promise<OeeResult> {
    const now = new Date();
    const fromDate = from ?? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const toDate   = to   ?? now;

    const orders = await this.prisma.workOrder.findMany({
      where: {
        machineId,
        status: { in: ['COMPLETED', 'IN_PROGRESS'] },
        plannedStart: { gte: fromDate, lte: toDate },
      },
    });

    if (orders.length === 0) {
      const machine = await this.prisma.machine.findUnique({
        where: { id: machineId },
        select: { status: true },
      });
      const availability = machine?.status === 'ACTIVE' ? 1 : 0;
      return { machineId, from: fromDate.toISOString(), to: toDate.toISOString(),
        availability, performance: availability, quality: availability,
        oee: availability, woCount: 0 };
    }

    let totalPlannedMs = 0, totalActualMs = 0;
    let totalPlannedQty = 0, totalProducedQty = 0, totalDefectQty = 0;

    for (const wo of orders) {
      if (wo.plannedStart && wo.plannedEnd) {
        totalPlannedMs += wo.plannedEnd.getTime() - wo.plannedStart.getTime();
      }
      if (wo.actualStart && wo.actualEnd) {
        totalActualMs += wo.actualEnd.getTime() - wo.actualStart.getTime();
      }
      totalPlannedQty   += wo.plannedQty;
      totalProducedQty  += wo.producedQty;
      totalDefectQty    += wo.defectQty;
    }

    const availability = totalPlannedMs > 0
      ? Math.min(totalActualMs / totalPlannedMs, 1) : 1;
    const performance  = totalPlannedQty > 0
      ? Math.min(totalProducedQty / totalPlannedQty, 1) : 1;
    const quality      = totalProducedQty > 0
      ? Math.max((totalProducedQty - totalDefectQty) / totalProducedQty, 0) : 1;
    const oee = availability * performance * quality;

    return {
      machineId,
      from: fromDate.toISOString(),
      to:   toDate.toISOString(),
      availability: parseFloat(availability.toFixed(4)),
      performance:  parseFloat(performance.toFixed(4)),
      quality:      parseFloat(quality.toFixed(4)),
      oee:          parseFloat(oee.toFixed(4)),
      woCount:      orders.length,
    };
  }

  async getOeeHistory(machineId: string, days = 7): Promise<OeeHistoryItem[]> {
    const result: OeeHistoryItem[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const from = new Date(now);
      from.setDate(from.getDate() - i);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setHours(23, 59, 59, 999);

      const oee = await this.calcOee(machineId, from, to);
      result.push({
        date:         from.toISOString().slice(0, 10),
        availability: oee.availability,
        performance:  oee.performance,
        quality:      oee.quality,
        oee:          oee.oee,
      });
    }
    return result;
  }

  // ── 에너지 소비 ────────────────────────────────────────────────

  async getEnergy(machineId: string, hoursBack = 24): Promise<EnergyPoint[]> {
    const machine = await this.prisma.machine.findUnique({
      where: { id: machineId },
      select: { machineCode: true },
    });
    if (!machine) return [];

    const { rows } = await this.pool.query<{ bucket: Date; avg_val: number }>(
      `SELECT bucket, avg_val
       FROM sensor_data_1min
       WHERE machine_id = $1
         AND channel    = 'power_kw'
         AND bucket    >= NOW() - ($2 || ' hours')::INTERVAL
       ORDER BY bucket ASC`,
      [machine.machineCode, hoursBack],
    );

    return rows.map((r) => ({ time: r.bucket.toISOString(), avgKw: r.avg_val }));
  }

  // ── 통합 현황 ──────────────────────────────────────────────────

  async getOverview(): Promise<OverviewItem[]> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since1h  = new Date(Date.now() -      60 * 60 * 1000);

    const machines = await this.prisma.machine.findMany({
      select: { id: true, machineCode: true, name: true, status: true },
      orderBy: { machineCode: 'asc' },
    });

    const results = await Promise.all(
      machines.map(async (m) => {
        const [alarmEvents, pdmAnomaly, pdmFailure, pdmRul, spcViol] = await Promise.all([
          this.prisma.alarmEvent.findMany({
            where: { machineId: m.id, occurredAt: { gte: since24h } },
            select: { severity: true },
          }),
          this.prisma.predictionLog.findFirst({
            where: { machineId: m.id, modelType: 'AUTOENCODER' },
            orderBy: { predictedAt: 'desc' },
          }),
          this.prisma.predictionLog.findFirst({
            where: { machineId: m.id, modelType: 'FAILURE_PROB' },
            orderBy: { predictedAt: 'desc' },
          }),
          this.prisma.predictionLog.findFirst({
            where: { machineId: m.id, modelType: 'RUL' },
            orderBy: { predictedAt: 'desc' },
          }),
          this.prisma.alarmEvent.count({
            where: {
              machineId: m.id,
              occurredAt: { gte: since1h },
              rule: { ruleType: 'WESTERN_ELECTRIC' },
            },
          }),
        ]);

        const severityOrder = { CRITICAL: 3, WARNING: 2, INFO: 1 };
        const maxSeverity = alarmEvents.reduce<'NONE' | 'INFO' | 'WARNING' | 'CRITICAL'>((max, e) => {
          if ((severityOrder[e.severity] ?? 0) > (severityOrder[max as keyof typeof severityOrder] ?? 0)) {
            return e.severity as 'INFO' | 'WARNING' | 'CRITICAL';
          }
          return max;
        }, 'NONE');

        const failureProb = pdmFailure?.score ?? null;
        const rulHours    = pdmRul?.score ?? null;
        const isAnomaly   = pdmAnomaly?.isAnomaly ?? false;

        const riskLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' =
          maxSeverity === 'CRITICAL' || (failureProb != null && failureProb >= 0.70) || (rulHours != null && rulHours < 72)
            ? 'CRITICAL'
            : maxSeverity === 'WARNING' || isAnomaly || (rulHours != null && rulHours < 200)
            ? 'WARNING'
            : 'NORMAL';

        return {
          machineId:        m.id,
          machineCode:      m.machineCode,
          name:             m.name,
          status:           m.status,
          alarmCount:       alarmEvents.length,
          maxAlarmSeverity: maxSeverity,
          pdmAnomalyScore:  pdmAnomaly?.score ?? null,
          pdmFailureProb:   failureProb,
          pdmRulHours:      rulHours,
          spcViolations:    spcViol,
          riskLevel,
        } satisfies OverviewItem;
      }),
    );

    return results.sort((a, b) => {
      const order = { CRITICAL: 0, WARNING: 1, NORMAL: 2 };
      return order[a.riskLevel] - order[b.riskLevel];
    });
  }

  // ── 집계 리포트 ────────────────────────────────────────────────

  async getReport(from: Date, to: Date): Promise<ReportData> {
    const machines = await this.prisma.machine.findMany({
      select: { id: true, machineCode: true, name: true },
      orderBy: { machineCode: 'asc' },
    });

    const [allAlarms, allPdm] = await Promise.all([
      this.prisma.alarmEvent.findMany({
        where: { occurredAt: { gte: from, lte: to } },
        select: { machineId: true, channel: true, severity: true },
      }),
      this.prisma.predictionLog.findMany({
        where: { predictedAt: { gte: from, lte: to } },
        select: { machineId: true, modelType: true, score: true, isAnomaly: true },
      }),
    ]);

    // 알람 집계
    const alarmTotal    = allAlarms.length;
    const alarmCritical = allAlarms.filter((a) => a.severity === 'CRITICAL').length;
    const alarmWarning  = allAlarms.filter((a) => a.severity === 'WARNING').length;
    const alarmInfo     = allAlarms.filter((a) => a.severity === 'INFO').length;
    const channelCounts = allAlarms.reduce<Record<string, number>>((acc, a) => {
      acc[a.channel] = (acc[a.channel] ?? 0) + 1;
      return acc;
    }, {});
    const topChannels = Object.entries(channelCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([channel, count]) => ({ channel, count }));

    // PDM 집계
    const pdmAnomalies = allPdm.filter((p) => p.modelType === 'AUTOENCODER' && p.isAnomaly);
    const pdmHighRisk  = new Set(
      allPdm.filter((p) => p.modelType === 'FAILURE_PROB' && p.score >= 0.70).map((p) => p.machineId),
    );
    const rulLogs      = allPdm.filter((p) => p.modelType === 'RUL');
    const avgRulHours  = rulLogs.length > 0
      ? rulLogs.reduce((s, p) => s + p.score, 0) / rulLogs.length : null;

    // 설비별 집계
    const machineRows = await Promise.all(
      machines.map(async (m) => {
        const mAlarms = allAlarms.filter((a) => a.machineId === m.id);
        const mPdm    = allPdm.filter((p) => p.machineId === m.id);
        const highRisk = mPdm.some((p) => p.modelType === 'FAILURE_PROB' && p.score >= 0.70);
        const lowRisk  = mPdm.some((p) => p.modelType === 'FAILURE_PROB' && p.score >= 0.40);
        const topCh    = mAlarms.length > 0
          ? [...new Set(mAlarms.map((a) => a.channel))][0] : null;

        let oeeVal: number | null = null;
        try {
          const oee = await this.calcOee(m.id, from, to);
          oeeVal = oee.woCount > 0 ? oee.oee : null;
        } catch { /* no data */ }

        return {
          machineId:   m.id,
          machineCode: m.machineCode,
          name:        m.name,
          oee:         oeeVal,
          alarmCount:  mAlarms.length,
          pdmRisk:     (highRisk ? 'HIGH' : lowRisk ? 'LOW' : 'NONE') as 'NONE' | 'LOW' | 'HIGH',
          topChannel:  topCh,
        };
      }),
    );

    // SPC 이탈 (WESTERN_ELECTRIC 알람 기준)
    const spcAlarms = await this.prisma.alarmEvent.findMany({
      where: {
        occurredAt: { gte: from, lte: to },
        rule: { ruleType: 'WESTERN_ELECTRIC' },
      },
      include: { machine: { select: { machineCode: true } } },
    });
    const spcMachineCounts = spcAlarms.reduce<Record<string, number>>((acc, a) => {
      const code = a.machine.machineCode;
      acc[code] = (acc[code] ?? 0) + 1;
      return acc;
    }, {});
    const spcTopMachines = Object.entries(spcMachineCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([machineCode, count]) => ({ machineCode, count }));

    return {
      period:   { from: from.toISOString(), to: to.toISOString() },
      machines: machineRows,
      alarms:   { total: alarmTotal, critical: alarmCritical, warning: alarmWarning, info: alarmInfo, topChannels },
      pdm:      { anomalyCount: pdmAnomalies.length, highRiskMachines: pdmHighRisk.size, avgRulHours },
      spc:      { totalViolations: spcAlarms.length, topMachines: spcTopMachines },
    };
  }

  // ── 품질 분석 대시보드 ──────────────────────────────────────────

  async getQualitySummary(from: Date, to: Date) {
    const machines = await this.prisma.machine.findMany({
      select: { id: true, machineCode: true, name: true },
    });

    const [allAlarms, spcResults] = await Promise.all([
      this.prisma.alarmEvent.findMany({
        where: { occurredAt: { gte: from, lte: to } },
        select: { machineId: true, severity: true, channel: true },
      }),
      this.prisma.spcResult.findMany({
        where: { calculatedAt: { gte: from, lte: to } },
        select: { machineId: true, channel: true, cpk: true, isViolation: true },
      }),
    ]);

    const totalAlarms = allAlarms.length;
    const criticalAlarms = allAlarms.filter((a) => a.severity === 'CRITICAL').length;
    const totalViolations = spcResults.filter((r) => r.isViolation).length;

    const cpkValues = spcResults.filter((r) => r.cpk != null).map((r) => r.cpk as number);
    const avgCpk = cpkValues.length > 0 ? cpkValues.reduce((s, v) => s + v, 0) / cpkValues.length : null;

    // Per-machine Cp/Cpk aggregation
    const machineCapability = machines.map((m) => {
      const mResults = spcResults.filter((r) => r.machineId === m.id);
      const mCpkVals = mResults.filter((r) => r.cpk != null).map((r) => r.cpk as number);
      const machineCpk = mCpkVals.length > 0 ? mCpkVals.reduce((s, v) => s + v, 0) / mCpkVals.length : null;
      const mViolations = mResults.filter((r) => r.isViolation).length;
      return {
        machineId: m.id,
        machineCode: m.machineCode,
        name: m.name,
        avgCpk: machineCpk,
        violations: mViolations,
        status: machineCpk == null ? 'NO_DATA' : machineCpk >= 1.33 ? 'CAPABLE' : machineCpk >= 1.0 ? 'MARGINAL' : 'INCAPABLE',
      };
    });

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      kpi: { totalAlarms, criticalAlarms, totalViolations, avgCpk },
      machineCapability,
    };
  }

  async getDefectTrend(machineId: string | undefined, days: number) {
    const from = new Date(Date.now() - days * 86_400_000);

    const where = machineId
      ? { occurredAt: { gte: from }, machineId }
      : { occurredAt: { gte: from } };

    const alarms = await this.prisma.alarmEvent.findMany({
      where,
      select: { occurredAt: true, severity: true, machineId: true },
      orderBy: { occurredAt: 'asc' },
    });

    // Group by day
    const byDay = alarms.reduce<Record<string, { date: string; total: number; critical: number }>>((acc, a) => {
      const day = a.occurredAt.toISOString().slice(0, 10);
      if (!acc[day]) acc[day] = { date: day, total: 0, critical: 0 };
      acc[day].total += 1;
      if (a.severity === 'CRITICAL') acc[day].critical += 1;
      return acc;
    }, {});

    return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  }
}

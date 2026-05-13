import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlarmSeverity } from '@prisma/client';
import { PrismaService } from '../db/prisma.service';
import { AlarmService, CreateAlarmEventInput } from '../alarm/alarm.service';

export interface MlAnomalyResult {
  machineId:   string;
  channel:     string;
  score:       number;
  isAnomaly:   boolean;
  threshold:   number;
  predictedAt: string;
}

export interface MlFailureChannel {
  channel:            string;
  failureProbability: number;
}

export interface MlFailureResult {
  machineId:   string;
  channels:    MlFailureChannel[];
  predictedAt: string;
}

export interface MlRulResult {
  machineId:   string;
  channel:     string;
  rulHours:    number | null;
  confidence:  number;
  trend:       'improving' | 'stable' | 'degrading';
  predictedAt: string;
}

export interface PdmSummary {
  machineId:          string;
  anomalyScore:       { score: number; isAnomaly: boolean; updatedAt: string } | null;
  failureProbability: { max: number; channel: string; updatedAt: string } | null;
  rul:                { hours: number; trend: string; updatedAt: string } | null;
}

@Injectable()
export class PdmService implements OnModuleInit {
  private readonly log = new Logger(PdmService.name);
  private readonly mlUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly alarmService: AlarmService,
    private readonly config: ConfigService,
  ) {
    this.mlUrl = this.config.get<string>('ML_SERVICE_URL', 'http://localhost:3007');
  }

  onModuleInit() {
    this.log.log(`ml-service URL: ${this.mlUrl}`);
  }

  // ── ml-service HTTP 클라이언트 ──────────────────────────────────

  private async mlPost<T>(path: string, body: unknown): Promise<T | null> {
    try {
      const res = await fetch(`${this.mlUrl}${path}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  AbortSignal.timeout(8_000),
      });
      if (!res.ok) {
        this.log.warn(`ml-service ${path} → ${res.status}`);
        return null;
      }
      return res.json() as Promise<T>;
    } catch (err) {
      this.log.warn(`ml-service ${path} 호출 실패: ${(err as Error).message}`);
      return null;
    }
  }

  // ── PDM-03: AutoEncoder 이상감지 ─────────────────────────────────

  async runAnomalyDetection(
    machineId:   string,
    machineCode: string,
    channel:     string,
  ): Promise<MlAnomalyResult | null> {
    const result = await this.mlPost<MlAnomalyResult>('/predict/anomaly', {
      machineId: machineCode,
      channel,
    });
    if (!result) return null;

    let alarmEventId: string | undefined;
    if (result.isAnomaly) {
      alarmEventId = await this.createPdmAlarm(machineId, channel, result.score, {
        severity:  'CRITICAL',
        message:   `[AI] ${channel} 이상 패턴 감지 — 재구성 오차 ${result.score.toFixed(4)} (임계값 ${result.threshold.toFixed(4)})`,
      });
    }

    await this.prisma.predictionLog.create({
      data: {
        machineId,
        channel,
        modelType: 'AUTOENCODER',
        score:     result.score,
        isAnomaly: result.isAnomaly,
        predictedAt: new Date(result.predictedAt),
        ...(alarmEventId ? { alarmEventId } : {}),
      },
    });

    return result;
  }

  // ── PDM-04: 고장 확률 ───────────────────────────────────────────

  async runFailurePrediction(
    machineId:   string,
    machineCode: string,
  ): Promise<MlFailureResult | null> {
    const result = await this.mlPost<MlFailureResult>('/predict/failure', {
      machineId: machineCode,
    });
    if (!result) return null;

    for (const ch of result.channels) {
      let alarmEventId: string | undefined;
      if (ch.failureProbability >= 0.70) {
        alarmEventId = await this.createPdmAlarm(machineId, ch.channel, ch.failureProbability, {
          severity:  'CRITICAL',
          message:   `[AI] ${ch.channel} 고장 확률 ${(ch.failureProbability * 100).toFixed(0)}% — 24시간 내 고장 예측`,
        });
      }

      await this.prisma.predictionLog.create({
        data: {
          machineId,
          channel:    ch.channel,
          modelType:  'FAILURE_PROB',
          score:      ch.failureProbability,
          isAnomaly:  ch.failureProbability >= 0.70,
          predictedAt: new Date(result.predictedAt),
          ...(alarmEventId ? { alarmEventId } : {}),
        },
      });
    }

    return result;
  }

  // ── PDM-05: RUL 예측 ────────────────────────────────────────────

  async runRulPrediction(
    machineId:   string,
    machineCode: string,
    channel:     string,
  ): Promise<MlRulResult | null> {
    const result = await this.mlPost<MlRulResult>('/predict/rul', {
      machineId: machineCode,
      channel,
    });
    if (!result || result.rulHours == null) return result;

    let alarmEventId: string | undefined;
    if (result.rulHours < 72) {
      alarmEventId = await this.createPdmAlarm(machineId, channel, result.rulHours, {
        severity:  'CRITICAL',
        message:   `[AI] ${channel} 잔여수명 ${result.rulHours.toFixed(0)}h — 72시간 이내 고장 예상`,
      });
    } else if (result.rulHours < 200) {
      alarmEventId = await this.createPdmAlarm(machineId, channel, result.rulHours, {
        severity:  'WARNING',
        message:   `[AI] ${channel} 잔여수명 ${result.rulHours.toFixed(0)}h — 예방정비 권장`,
      });
    }

    await this.prisma.predictionLog.create({
      data: {
        machineId,
        channel,
        modelType: 'RUL',
        score:     result.rulHours,
        isAnomaly: result.rulHours < 200,
        predictedAt: new Date(result.predictedAt),
        ...(alarmEventId ? { alarmEventId } : {}),
      },
    });

    return result;
  }

  // ── 내부: AlarmEvent 생성 (rule 없는 AI 알람) ─────────────────

  private async createPdmAlarm(
    machineId: string,
    channel:   string,
    value:     number,
    opts:      { severity: AlarmSeverity; message: string },
  ): Promise<string> {
    // PDM 전용 AlarmRule 조회 또는 생성 (ruleId 필요)
    const rule = await this.prisma.alarmRule.upsert({
      where:  { machineId_channel_ruleType: { machineId, channel, ruleType: 'WESTERN_ELECTRIC' } },
      update: {},
      create: {
        machineId,
        channel,
        ruleType:  'WESTERN_ELECTRIC',
        severity:  opts.severity,
        enabled:   true,
      },
    });

    const input: CreateAlarmEventInput = {
      ruleId:     rule.id,
      machineId,
      channel,
      severity:   opts.severity,
      value,
      message:    opts.message,
      occurredAt: new Date(),
    };
    const event = await this.alarmService.createEvent(input);
    return event.id;
  }

  // ── 조회 API ────────────────────────────────────────────────────

  async getPdmSummary(machineId: string): Promise<PdmSummary> {
    const [anomaly, failure, rul] = await Promise.all([
      this.prisma.predictionLog.findFirst({
        where:   { machineId, modelType: 'AUTOENCODER' },
        orderBy: { predictedAt: 'desc' },
      }),
      this.prisma.predictionLog.findFirst({
        where:   { machineId, modelType: 'FAILURE_PROB', isAnomaly: true },
        orderBy: { predictedAt: 'desc' },
      }),
      this.prisma.predictionLog.findFirst({
        where:   { machineId, modelType: 'RUL' },
        orderBy: { predictedAt: 'desc' },
      }),
    ]);

    // 고장확률: 채널별 최신 최대값
    const failureChannels = await this.prisma.predictionLog.findMany({
      where:   { machineId, modelType: 'FAILURE_PROB' },
      orderBy: { predictedAt: 'desc' },
      take:    10,
    });
    const maxFailure = failureChannels.reduce<{ score: number; channel: string } | null>((acc, r) => {
      if (!acc || r.score > acc.score) return { score: r.score, channel: r.channel };
      return acc;
    }, null);

    return {
      machineId,
      anomalyScore: anomaly
        ? { score: anomaly.score, isAnomaly: anomaly.isAnomaly, updatedAt: anomaly.predictedAt.toISOString() }
        : null,
      failureProbability: maxFailure
        ? { max: maxFailure.score, channel: maxFailure.channel, updatedAt: failureChannels[0]?.predictedAt.toISOString() ?? '' }
        : null,
      rul: rul
        ? { hours: rul.score, trend: rul.isAnomaly ? 'degrading' : 'stable', updatedAt: rul.predictedAt.toISOString() }
        : null,
    };
  }

  async getPredictions(machineId: string, modelType?: string, limit = 100) {
    return this.prisma.predictionLog.findMany({
      where:   { machineId, ...(modelType ? { modelType } : {}) },
      orderBy: { predictedAt: 'desc' },
      take:    limit,
    });
  }

  async getModelStatus() {
    try {
      const res = await fetch(`${this.mlUrl}/model/status`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }
}

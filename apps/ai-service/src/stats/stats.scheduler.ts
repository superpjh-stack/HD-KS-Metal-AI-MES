import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import Redis from 'ioredis';
import { PrismaService } from '../db/prisma.service';
import { AlarmService } from '../alarm/alarm.service';
import { StatsService } from './stats.service';
import { REDIS_PUB } from '../shared/redis.module';

const ALERT_CHANNEL = 'ks-mes:alerts';

@Injectable()
export class StatsScheduler {
  private readonly logger = new Logger(StatsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alarmService: AlarmService,
    private readonly statsService: StatsService,
    @Inject(REDIS_PUB) private readonly pub: Redis,
  ) {}

  @Cron('0 */5 * * * *') // 5분마다
  async runSigmaBatch() {
    const rules = await this.prisma.alarmRule.findMany({
      where: { ruleType: 'SIGMA', enabled: true },
      include: { machine: { select: { machineCode: true } } },
    });

    if (rules.length === 0) return;

    await Promise.allSettled(rules.map((rule) => this.checkRule(rule as typeof rule & { machine: { machineCode: string } })));
  }

  private async checkRule(rule: {
    id: string;
    machineId: string;
    channel: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    sigmaFactor: number | null;
    windowMin: number | null;
    machine: { machineCode: string };
  }) {
    try {
      const windowMin   = rule.windowMin   ?? 60;
      const sigmaFactor = rule.sigmaFactor ?? 3.0;

      const buckets = await this.statsService.fetchWindow(
        rule.machine.machineCode,
        rule.channel,
        windowMin,
      );

      const stats = this.statsService.compute(buckets);
      if (!stats) return;

      if (!this.statsService.isAnomaly(stats, sigmaFactor)) return;

      const message = this.statsService.anomalyMessage(rule.channel, stats, sigmaFactor);

      const event = await this.alarmService.createEvent({
        ruleId:    rule.id,
        machineId: rule.machineId,
        channel:   rule.channel,
        severity:  rule.severity,
        value:     stats.latest,
        threshold: stats.mean + sigmaFactor * stats.std,
        message,
        occurredAt: new Date(),
      });

      const alert = {
        id:      event.id,
        level:   event.severity.toLowerCase() as 'info' | 'warning' | 'critical',
        title:   `통계 이상 — ${rule.machine.machineCode} / ${rule.channel}`,
        message,
        time:    event.occurredAt.toISOString(),
      };

      await this.pub.publish(ALERT_CHANNEL, JSON.stringify(alert));
      this.logger.warn(`SIGMA ALARM: ${message}`);
    } catch (err) {
      this.logger.error(
        `Sigma batch error [${rule.machine.machineCode}/${rule.channel}]: ${(err as Error).message}`,
      );
    }
  }
}

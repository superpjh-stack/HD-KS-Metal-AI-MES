import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import Redis from 'ioredis';
import { PrismaService } from '../db/prisma.service';
import { AlarmService } from '../alarm/alarm.service';
import { SpcService } from './spc.service';
import { detectWesternElectric, WERuleId } from './western-electric';
import { REDIS_PUB } from '../shared/redis.module';

const ALERT_CHANNEL = 'ks-mes:alerts';

const WE_RULE_DESC: Record<WERuleId, string> = {
  RULE_1: '관리한계(±3σ) 이탈',
  RULE_2: '연속 9점이 중심선 한쪽',
  RULE_3: '연속 6점 단조 증가/감소',
  RULE_4: '연속 14점 교호 증감',
};

@Injectable()
export class SpcScheduler {
  private readonly logger = new Logger(SpcScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alarmService: AlarmService,
    private readonly spcService: SpcService,
    @Inject(REDIS_PUB) private readonly pub: Redis,
  ) {}

  @Cron('0 * * * * *')
  async runSpcBatch() {
    const rules = await this.prisma.alarmRule.findMany({
      where: { ruleType: 'WESTERN_ELECTRIC', enabled: true },
      include: { machine: { select: { machineCode: true } } },
    });

    if (rules.length === 0) return;

    await Promise.allSettled(
      rules.map((rule) =>
        this.checkRule(rule as typeof rule & { machine: { machineCode: string } }),
      ),
    );
  }

  private async checkRule(rule: {
    id: string;
    machineId: string;
    channel: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    windowMin: number | null;
    machine: { machineCode: string };
  }) {
    try {
      // SpcParameter에서 sampleSize / sampleCount 읽기 (없으면 기본값)
      const { sampleSize, sampleCount } =
        await this.spcService.getParameterOrDefault(rule.machineId, rule.channel);

      const windowMin = rule.windowMin ?? sampleSize * sampleCount;

      const rows = await this.spcService.fetchMinuteAggregates(
        rule.machine.machineCode,
        rule.channel,
        windowMin,
      );

      if (rows.length < sampleSize * 3) return;

      const rawPoints = this.spcService.buildSubgroups(rows, sampleSize);
      if (rawPoints.length < 3) return;

      const limits = this.spcService.computeControlLimits(rawPoints, sampleSize);
      if (!limits) return;

      const xbars      = rawPoints.map((p) => p.xbar);
      const violations = detectWesternElectric(xbars, this.spcService.xbarLimitsAsControlLimits(limits));

      if (violations.length === 0) return;

      const latestXbar = xbars[xbars.length - 1];
      const ruleDesc   = violations.map((r) => WE_RULE_DESC[r]).join(', ');
      const message    = `[SPC ${rule.channel}] Western Electric 위반: ${ruleDesc} (X-bar=${latestXbar.toFixed(4)}, UCL=${limits.ucl_xbar.toFixed(4)})`;

      const event = await this.alarmService.createEvent({
        ruleId:     rule.id,
        machineId:  rule.machineId,
        channel:    rule.channel,
        severity:   rule.severity,
        value:      latestXbar,
        threshold:  limits.ucl_xbar,
        message,
        occurredAt: new Date(),
      });

      await this.pub.publish(ALERT_CHANNEL, JSON.stringify({
        id:      event.id,
        level:   event.severity.toLowerCase(),
        title:   `SPC 이상 — ${rule.machine.machineCode} / ${rule.channel}`,
        message,
        time:    event.occurredAt.toISOString(),
      }));

      this.logger.warn(`SPC ALARM: ${message}`);
    } catch (err) {
      this.logger.error(
        `SPC batch error [${rule.machine.machineCode}/${rule.channel}]: ${(err as Error).message}`,
      );
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { AlarmEvent, AlarmRule, AlarmSeverity, Prisma } from '@prisma/client';
import { PrismaService } from '../db/prisma.service';
import { CreateAlarmRuleDto } from './dto/create-alarm-rule.dto';
import { UpdateAlarmRuleDto } from './dto/update-alarm-rule.dto';
import { QueryAlarmEventsDto } from './dto/query-alarm-events.dto';

export interface CreateAlarmEventInput {
  ruleId: string;
  machineId: string;
  channel: string;
  severity: AlarmSeverity;
  value: number;
  threshold?: number;
  message: string;
  occurredAt: Date;
}

@Injectable()
export class AlarmService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Rules ──────────────────────────────────────────────────────────

  async getRules(machineId?: string): Promise<AlarmRule[]> {
    return this.prisma.alarmRule.findMany({
      where: machineId ? { machineId } : undefined,
      orderBy: [{ machineId: 'asc' }, { channel: 'asc' }],
    });
  }

  async getEnabledRules(machineId?: string): Promise<AlarmRule[]> {
    return this.prisma.alarmRule.findMany({
      where: { enabled: true, ...(machineId ? { machineId } : {}) },
    });
  }

  async createRule(dto: CreateAlarmRuleDto): Promise<AlarmRule> {
    return this.prisma.alarmRule.create({ data: dto });
  }

  async updateRule(id: string, dto: UpdateAlarmRuleDto): Promise<AlarmRule> {
    await this.findRuleOrThrow(id);
    return this.prisma.alarmRule.update({ where: { id }, data: dto });
  }

  async deleteRule(id: string): Promise<void> {
    await this.findRuleOrThrow(id);
    await this.prisma.alarmRule.delete({ where: { id } });
  }

  private async findRuleOrThrow(id: string): Promise<AlarmRule> {
    const rule = await this.prisma.alarmRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException(`AlarmRule ${id} not found`);
    return rule;
  }

  // ── Events ─────────────────────────────────────────────────────────

  async createEvent(input: CreateAlarmEventInput): Promise<AlarmEvent> {
    return this.prisma.alarmEvent.create({ data: input });
  }

  async getEvents(query: QueryAlarmEventsDto): Promise<AlarmEvent[]> {
    const where: Prisma.AlarmEventWhereInput = {};
    if (query.machineId) where.machineId = query.machineId;
    if (query.severity)  where.severity  = query.severity;
    if (query.from || query.to) {
      where.occurredAt = {};
      if (query.from) where.occurredAt.gte = new Date(query.from);
      if (query.to)   where.occurredAt.lte = new Date(query.to);
    }
    if (query.unacknowledgedOnly === 'true') {
      where.acknowledgedAt = null;
    }

    return this.prisma.alarmEvent.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: 500,
    });
  }

  async acknowledge(id: string, userId: string): Promise<AlarmEvent> {
    const event = await this.prisma.alarmEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException(`AlarmEvent ${id} not found`);

    return this.prisma.alarmEvent.update({
      where: { id },
      data: { acknowledgedAt: new Date(), acknowledgedBy: userId },
    });
  }

  async getSummary(): Promise<{ machineId: string; count: number; maxSeverity: AlarmSeverity }[]> {
    const rows = await this.prisma.alarmEvent.groupBy({
      by: ['machineId', 'severity'],
      where: { acknowledgedAt: null },
      _count: { id: true },
    });

    const map = new Map<string, { count: number; maxSeverity: AlarmSeverity }>();
    const severityOrder: AlarmSeverity[] = ['INFO', 'WARNING', 'CRITICAL'];

    for (const row of rows) {
      const existing = map.get(row.machineId);
      const count = (existing?.count ?? 0) + row._count.id;
      const curIdx = severityOrder.indexOf(row.severity);
      const prevIdx = existing ? severityOrder.indexOf(existing.maxSeverity) : -1;
      map.set(row.machineId, {
        count,
        maxSeverity: curIdx > prevIdx ? row.severity : (existing?.maxSeverity ?? row.severity),
      });
    }

    return Array.from(map.entries()).map(([machineId, v]) => ({ machineId, ...v }));
  }
}

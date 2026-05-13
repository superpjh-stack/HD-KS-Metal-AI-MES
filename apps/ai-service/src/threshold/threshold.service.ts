import { Injectable } from '@nestjs/common';
import { AlarmRule, AlarmSeverity } from '@prisma/client';
import { CreateAlarmEventInput } from '../alarm/alarm.service';

export interface SensorReading {
  machineId: string;
  channel: string;
  value: number;
  timestamp: string;
}

@Injectable()
export class ThresholdService {
  check(reading: SensorReading, rules: AlarmRule[]): CreateAlarmEventInput | null {
    const rule = rules.find(
      (r) =>
        r.machineId === reading.machineId &&
        r.channel   === reading.channel   &&
        r.ruleType  === 'THRESHOLD'       &&
        r.enabled,
    );

    if (!rule || rule.threshold === null || reading.value <= rule.threshold) return null;

    return {
      ruleId:     rule.id,
      machineId:  reading.machineId,
      channel:    reading.channel,
      severity:   rule.severity as AlarmSeverity,
      value:      reading.value,
      threshold:  rule.threshold,
      message:    `[${reading.channel}] 측정값 ${reading.value.toFixed(3)} > 임계값 ${rule.threshold} (${rule.severity})`,
      occurredAt: new Date(reading.timestamp),
    };
  }
}

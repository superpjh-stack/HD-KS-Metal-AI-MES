import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MqttPublisherService } from '../mqtt-publisher/mqtt-publisher.service';

interface SensorReading {
  channel: string;
  value: number;
  unit: string;
  timestamp: string;
}

interface MachineProfile {
  baseValues: Record<string, number>;
  units: Record<string, string>;
  jitterPct: number;
}

const MACHINES: Record<string, MachineProfile> = {
  'PRESS-01': {
    baseValues: { vibration_x: 1.2, temperature: 62, power_kw: 45, spm: 60, pressure_bar: 180 },
    units:      { vibration_x: 'm/s²', temperature: '°C', power_kw: 'kW', spm: 'spm', pressure_bar: 'bar' },
    jitterPct: 0.05,
  },
  'PRESS-02': {
    baseValues: { vibration_x: 0.9, temperature: 58, power_kw: 38, spm: 55, pressure_bar: 175 },
    units:      { vibration_x: 'm/s²', temperature: '°C', power_kw: 'kW', spm: 'spm', pressure_bar: 'bar' },
    jitterPct: 0.04,
  },
  'PRESS-03': {
    baseValues: { vibration_x: 4.8, temperature: 78, power_kw: 52, spm: 42, pressure_bar: 195 },
    units:      { vibration_x: 'm/s²', temperature: '°C', power_kw: 'kW', spm: 'spm', pressure_bar: 'bar' },
    jitterPct: 0.08,
  },
  'PRESS-04': {
    baseValues: { vibration_x: 1.5, temperature: 65, power_kw: 47, spm: 58, pressure_bar: 182 },
    units:      { vibration_x: 'm/s²', temperature: '°C', power_kw: 'kW', spm: 'spm', pressure_bar: 'bar' },
    jitterPct: 0.05,
  },
};

@Injectable()
export class OpcuaSimulatorService {
  private readonly logger = new Logger(OpcuaSimulatorService.name);

  constructor(private readonly mqttPublisher: MqttPublisherService) {}

  /** Simulate OPC-UA polling at 1-second intervals */
  @Cron('* * * * * *')
  pollMachines() {
    const timestamp = new Date().toISOString();
    for (const [machineCode, profile] of Object.entries(MACHINES)) {
      const readings = this.generateReadings(profile, timestamp);
      const topic = `factory/${machineCode}/sensors`;
      this.mqttPublisher.publish(topic, { machineCode, timestamp, readings });
    }
  }

  private generateReadings(profile: MachineProfile, timestamp: string): SensorReading[] {
    return Object.entries(profile.baseValues).map(([channel, base]) => ({
      channel,
      value: this.jitter(base, profile.jitterPct),
      unit: profile.units[channel] ?? '',
      timestamp,
    }));
  }

  private jitter(base: number, pct: number): number {
    const delta = base * pct * (Math.random() * 2 - 1);
    return Math.round((base + delta) * 100) / 100;
  }
}

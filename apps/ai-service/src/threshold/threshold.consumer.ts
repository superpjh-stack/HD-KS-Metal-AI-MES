import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { AlarmRule } from '@prisma/client';
import { REDIS_PUB, REDIS_SUB } from '../shared/redis.module';
import { AlarmService } from '../alarm/alarm.service';
import { ThresholdService, SensorReading } from './threshold.service';
import { v4 as uuidv4 } from 'uuid';

const SENSOR_CHANNEL = 'ks-mes:sensor:new-data';
const ALERT_CHANNEL  = 'ks-mes:alerts';

// Cache alarm rules for 5 min to avoid DB hit on every sensor reading
const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class ThresholdConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ThresholdConsumer.name);
  private cachedRules: AlarmRule[] = [];
  private cacheExpiresAt = 0;

  constructor(
    @Inject(REDIS_PUB) private readonly pub: Redis,
    @Inject(REDIS_SUB) private readonly sub: Redis,
    private readonly alarmService: AlarmService,
    private readonly thresholdService: ThresholdService,
  ) {}

  onModuleInit() {
    this.sub.subscribe(SENSOR_CHANNEL, (err) => {
      if (err) this.logger.error('Redis subscribe error', err);
      else     this.logger.log(`Subscribed to ${SENSOR_CHANNEL}`);
    });

    this.sub.on('message', (_ch, message) => {
      this.handleSensorMessage(message).catch((e) =>
        this.logger.error('Threshold check error', e),
      );
    });
  }

  async onModuleDestroy() {
    await this.sub.unsubscribe(SENSOR_CHANNEL);
  }

  private async handleSensorMessage(message: string) {
    let reading: SensorReading;
    try {
      reading = JSON.parse(message) as SensorReading;
    } catch {
      this.logger.warn('Malformed sensor message');
      return;
    }

    const rules = await this.getEnabledRules();
    const event = this.thresholdService.check(reading, rules);
    if (!event) return;

    const saved = await this.alarmService.createEvent(event);

    const alert = {
      id:      saved.id,
      level:   saved.severity.toLowerCase() as 'info' | 'warning' | 'critical',
      title:   `${saved.channel} 임계값 초과`,
      message: saved.message,
      time:    saved.occurredAt.toISOString(),
    };

    await this.pub.publish(ALERT_CHANNEL, JSON.stringify(alert));
    this.logger.warn(`ALARM: ${alert.message}`);
  }

  private async getEnabledRules(): Promise<AlarmRule[]> {
    if (Date.now() < this.cacheExpiresAt) return this.cachedRules;

    this.cachedRules   = await this.alarmService.getEnabledRules();
    this.cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    return this.cachedRules;
  }

  /** Force cache invalidation when rules are updated */
  invalidateCache() {
    this.cacheExpiresAt = 0;
  }
}

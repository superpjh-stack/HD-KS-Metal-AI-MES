import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { NotifGateway, AlertPayload } from './notif.gateway';
import { PublishAlertDto } from './dto/publish-alert.dto';

const ALERT_CHANNEL = 'ks-mes:alerts';

@Injectable()
export class NotifService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotifService.name);
  private sub!: Redis;
  private pub!: Redis;

  constructor(
    private readonly gateway: NotifGateway,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.pub = new Redis(url);
    this.sub = new Redis(url);

    this.sub.subscribe(ALERT_CHANNEL, (err) => {
      if (err) this.logger.error('Redis subscribe error', err);
    });

    this.sub.on('message', (_channel, message) => {
      try {
        const alert = JSON.parse(message) as AlertPayload;
        this.gateway.broadcast(alert);
      } catch {
        this.logger.warn('Malformed alert message');
      }
    });
  }

  async onModuleDestroy() {
    await this.sub.quit();
    await this.pub.quit();
  }

  async publish(dto: PublishAlertDto): Promise<AlertPayload> {
    const alert: AlertPayload = {
      id: uuidv4(),
      ...dto,
      time: new Date().toISOString(),
    };
    await this.pub.publish(ALERT_CHANNEL, JSON.stringify(alert));
    return alert;
  }
}

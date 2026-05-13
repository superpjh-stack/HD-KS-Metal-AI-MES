import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { OfflineBufferService } from '../offline-buffer/offline-buffer.service';

@Injectable()
export class MqttPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttPublisherService.name);
  private client!: mqtt.MqttClient;
  private connected = false;

  constructor(
    private readonly config: ConfigService,
    private readonly buffer: OfflineBufferService,
  ) {}

  onModuleInit() {
    const brokerUrl = this.config.get<string>('MQTT_BROKER_URL', 'mqtt://localhost:1883');
    this.client = mqtt.connect(brokerUrl, {
      clientId: `edge-gateway-${Date.now()}`,
      clean: false,
      reconnectPeriod: 5000,
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.logger.log('MQTT connected — flushing offline buffer');
      this.flushBuffer();
    });

    this.client.on('offline', () => {
      this.connected = false;
      this.logger.warn('MQTT offline — buffering messages');
    });

    this.client.on('error', (err) => {
      this.logger.error('MQTT error', err.message);
    });
  }

  async onModuleDestroy() {
    await this.client.endAsync();
  }

  publish(topic: string, payload: unknown): void {
    const message = JSON.stringify(payload);
    if (this.connected) {
      this.client.publish(topic, message, { qos: 1 });
    } else {
      this.buffer.enqueue(topic, message);
      this.logger.debug(`Buffered message for ${topic} (buffer size: ${this.buffer.size})`);
    }
  }

  private flushBuffer(): void {
    const messages = this.buffer.flush();
    if (messages.length === 0) return;

    this.logger.log(`Flushing ${messages.length} buffered messages`);
    for (const msg of messages) {
      this.client.publish(msg.topic, msg.payload, { qos: 1 });
    }
  }
}

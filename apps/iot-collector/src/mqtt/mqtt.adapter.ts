import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, MqttClient } from 'mqtt';
import { TimescaleWriteService, SensorRow } from '../timescale/timescale-write.service';
import { RedisPubSubService } from '../redis/redis-pubsub.service';

/** MQTT 페이로드 형식: { time?: string, [channel]: number } */
type SensorPayload = { time?: string } & Record<string, number | string>;

const SENSOR_CHANNELS = ['vibration_x', 'vibration_y', 'temperature', 'power_kw', 'spm', 'pressure'];
const TOPIC = 'factory/+/sensors';

@Injectable()
export class MqttAdapter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttAdapter.name);
  private client!: MqttClient;

  constructor(
    private readonly config: ConfigService,
    private readonly timescaleWrite: TimescaleWriteService,
    private readonly redisPubSub: RedisPubSubService,
  ) {}

  onModuleInit() {
    const brokerUrl = this.config.getOrThrow('MQTT_BROKER_URL');
    const clientId = this.config.get('MQTT_CLIENT_ID', 'iot-collector');

    this.client = connect(brokerUrl, {
      clientId,
      username: this.config.get('MQTT_USERNAME') || undefined,
      password: this.config.get('MQTT_PASSWORD') || undefined,
      reconnectPeriod: 3000,
      connectTimeout: 10_000,
      clean: false, // 오프라인 중 수신한 메시지 재수신 (QoS 1)
    });

    this.client.on('connect', () => {
      this.logger.log(`MQTT connected to ${brokerUrl}`);
      this.client.subscribe(TOPIC, { qos: 1 }, (err) => {
        if (err) this.logger.error(`MQTT subscribe error: ${err.message}`);
        else this.logger.log(`Subscribed: ${TOPIC}`);
      });
    });

    this.client.on('message', (topic, payload) => {
      void this.handleMessage(topic, payload);
    });

    this.client.on('error', (err) => this.logger.error(`MQTT error: ${err.message}`));
    this.client.on('reconnect', () => this.logger.warn('MQTT reconnecting...'));
    this.client.on('offline', () => this.logger.warn('MQTT offline'));
  }

  onModuleDestroy() {
    this.client?.end(true);
  }

  private async handleMessage(topic: string, payload: Buffer) {
    // topic: factory/PRESS-01/sensors → machineCode = PRESS-01
    const parts = topic.split('/');
    if (parts.length < 3) return;
    const machineCode = parts[1];

    let data: SensorPayload;
    try {
      data = JSON.parse(payload.toString()) as SensorPayload;
    } catch {
      this.logger.warn(`Invalid MQTT payload on ${topic}`);
      return;
    }

    const time = data.time ? new Date(data.time) : new Date();

    // 채널별 SensorRow 분해
    const rows: SensorRow[] = SENSOR_CHANNELS.filter(
      (ch) => typeof data[ch] === 'number',
    ).map((ch) => ({
      time,
      machineId: machineCode, // sensor_data에선 machineCode를 식별자로 사용 (UUID 조회 생략)
      channel: ch,
      value: data[ch] as number,
      quality: 192,
    }));

    if (rows.length === 0) return;

    // 1. TimescaleDB 버퍼 enqueue (비동기 벌크 플러시)
    this.timescaleWrite.enqueue(rows);

    // 2. Redis Pub-Sub → SSE 실시간 전달
    await this.redisPubSub.publish(`realtime:${machineCode}`, {
      machineCode,
      time,
      channels: Object.fromEntries(rows.map((r) => [r.channel, r.value])),
    });

    // 3. Redis Pub-Sub → ai-service 임계값 감지 (채널별 개별 발행)
    for (const row of rows) {
      await this.redisPubSub.publish('ks-mes:sensor:new-data', {
        machineId: machineCode,
        channel:   row.channel,
        value:     row.value,
        timestamp: time.toISOString(),
      });
    }
  }
}

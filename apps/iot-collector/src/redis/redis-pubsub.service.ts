import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { Observable } from 'rxjs';
import { REDIS_CLIENT, REDIS_SUB_CLIENT } from './redis.module';

@Injectable()
export class RedisPubSubService {
  private readonly logger = new Logger(RedisPubSubService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly pub: Redis,
    @Inject(REDIS_SUB_CLIENT) private readonly sub: Redis,
  ) {}

  async publish(channel: string, data: unknown): Promise<void> {
    try {
      await this.pub.publish(channel, JSON.stringify(data));
    } catch (err) {
      this.logger.error(`Redis publish error on ${channel}: ${(err as Error).message}`);
    }
  }

  /**
   * SSE 스트림용: Redis 채널을 Observable로 래핑
   * 구독자가 unsubscribe하면 자동으로 Redis 구독 해제
   */
  subscribe(channel: string): Observable<unknown> {
    return new Observable((subscriber) => {
      const onMessage = (_ch: string, message: string) => {
        try {
          subscriber.next(JSON.parse(message));
        } catch {
          subscriber.next(message);
        }
      };

      this.sub.subscribe(channel, (err) => {
        if (err) {
          this.logger.error(`Redis subscribe error: ${err.message}`);
          subscriber.error(err);
        }
      });

      this.sub.on('message', onMessage);

      return () => {
        this.sub.off('message', onMessage);
        this.sub.unsubscribe(channel).catch(() => {});
      };
    });
  }
}

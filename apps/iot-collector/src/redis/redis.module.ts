import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisPubSubService } from './redis-pubsub.service';

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REDIS_SUB_CLIENT = 'REDIS_SUB_CLIENT';

function createRedis(config: ConfigService): Redis {
  return new Redis({
    host: config.get('REDIS_HOST', 'localhost'),
    port: Number(config.get('REDIS_PORT', 6379)),
    password: config.get('REDIS_PASSWORD') || undefined,
    lazyConnect: true,
    enableOfflineQueue: true,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) => createRedis(config),
      inject: [ConfigService],
    },
    {
      provide: REDIS_SUB_CLIENT,
      useFactory: (config: ConfigService) => createRedis(config),
      inject: [ConfigService],
    },
    RedisPubSubService,
  ],
  exports: [REDIS_CLIENT, REDIS_SUB_CLIENT, RedisPubSubService],
})
export class RedisModule {}

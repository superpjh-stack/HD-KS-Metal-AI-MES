import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_PUB = 'REDIS_PUB';
export const REDIS_SUB = 'REDIS_SUB';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_PUB,
      useFactory: (config: ConfigService) =>
        new Redis(config.get<string>('REDIS_URL', 'redis://localhost:6379')),
      inject: [ConfigService],
    },
    {
      provide: REDIS_SUB,
      useFactory: (config: ConfigService) =>
        new Redis(config.get<string>('REDIS_URL', 'redis://localhost:6379')),
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_PUB, REDIS_SUB],
})
export class RedisModule {}

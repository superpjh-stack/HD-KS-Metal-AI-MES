import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const TS_POOL = 'TS_POOL';

@Global()
@Module({
  providers: [
    {
      provide: TS_POOL,
      useFactory: (config: ConfigService) =>
        new Pool({
          connectionString: config.getOrThrow('TIMESCALE_URL'),
          max: 5,
          idleTimeoutMillis: 30_000,
        }),
      inject: [ConfigService],
    },
  ],
  exports: [TS_POOL],
})
export class TimescaleModule {}

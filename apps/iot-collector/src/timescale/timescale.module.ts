import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { TimescaleWriteService } from './timescale-write.service';

export const PG_POOL = 'PG_POOL';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: (config: ConfigService) =>
        new Pool({
          connectionString: config.getOrThrow('TIMESCALE_URL'),
          max: 10,
          idleTimeoutMillis: 30_000,
        }),
      inject: [ConfigService],
    },
    TimescaleWriteService,
  ],
  exports: [PG_POOL, TimescaleWriteService],
})
export class TimescaleModule {}

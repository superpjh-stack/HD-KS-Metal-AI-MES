import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PassportModule } from '@nestjs/passport';
import { DbModule } from './db/db.module';
import { RedisModule } from './shared/redis.module';
import { TimescaleModule } from './timescale/timescale.module';
import { AuthModule } from './auth/auth.module';
import { AlarmModule } from './alarm/alarm.module';
import { ThresholdModule } from './threshold/threshold.module';
import { SpcModule } from './spc/spc.module';
import { StatsModule } from './stats/stats.module';
import { PdmModule } from './pdm/pdm.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    ScheduleModule.forRoot(),
    PassportModule,
    DbModule,
    RedisModule,
    TimescaleModule,
    AuthModule,
    AlarmModule,
    ThresholdModule,
    SpcModule,
    StatsModule,
    PdmModule,
    ReportModule,
  ],
})
export class AppModule {}

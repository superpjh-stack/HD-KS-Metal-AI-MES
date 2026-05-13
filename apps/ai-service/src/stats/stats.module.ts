import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsScheduler } from './stats.scheduler';
import { StatsController } from './stats.controller';
import { AlarmModule } from '../alarm/alarm.module';

@Module({
  imports: [AlarmModule],
  providers: [StatsService, StatsScheduler],
  controllers: [StatsController],
  exports: [StatsService],
})
export class StatsModule {}

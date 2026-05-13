import { Module } from '@nestjs/common';
import { ThresholdService } from './threshold.service';
import { ThresholdConsumer } from './threshold.consumer';
import { AlarmModule } from '../alarm/alarm.module';

@Module({
  imports: [AlarmModule],
  providers: [ThresholdService, ThresholdConsumer],
  exports: [ThresholdService, ThresholdConsumer],
})
export class ThresholdModule {}

import { Module } from '@nestjs/common';
import { AlarmService } from './alarm.service';
import { AlarmRuleController, AlarmEventController } from './alarm.controller';

@Module({
  providers: [AlarmService],
  controllers: [AlarmRuleController, AlarmEventController],
  exports: [AlarmService],
})
export class AlarmModule {}

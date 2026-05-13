import { Module } from '@nestjs/common';
import { SpcService } from './spc.service';
import { SpcScheduler } from './spc.scheduler';
import { SpcController } from './spc.controller';
import { AlarmModule } from '../alarm/alarm.module';

@Module({
  imports: [AlarmModule],
  providers: [SpcService, SpcScheduler],
  controllers: [SpcController],
  exports: [SpcService],
})
export class SpcModule {}

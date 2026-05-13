import { Module } from '@nestjs/common';
import { AlarmModule } from '../alarm/alarm.module';
import { PdmService } from './pdm.service';
import { PdmScheduler } from './pdm.scheduler';
import { PdmController } from './pdm.controller';

@Module({
  imports: [AlarmModule],
  providers: [PdmService, PdmScheduler],
  controllers: [PdmController],
  exports: [PdmService],
})
export class PdmModule {}

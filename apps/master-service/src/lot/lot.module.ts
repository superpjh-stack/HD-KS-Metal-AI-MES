import { Module } from '@nestjs/common';
import { LotController } from './lot.controller';
import { LotService } from './lot.service';
import { LotRepository } from './lot.repository';
import { TraceLotUseCase } from './trace-lot.usecase';

@Module({
  controllers: [LotController],
  providers: [LotService, LotRepository, TraceLotUseCase],
})
export class LotModule {}

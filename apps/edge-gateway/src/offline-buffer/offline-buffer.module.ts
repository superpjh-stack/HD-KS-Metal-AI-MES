import { Module } from '@nestjs/common';
import { OfflineBufferService } from './offline-buffer.service';

@Module({
  providers: [OfflineBufferService],
  exports: [OfflineBufferService],
})
export class OfflineBufferModule {}

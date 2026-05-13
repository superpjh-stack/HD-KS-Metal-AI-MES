import { Module } from '@nestjs/common';
import { OfflineBufferModule } from '../offline-buffer/offline-buffer.module';
import { MqttPublisherService } from './mqtt-publisher.service';

@Module({
  imports: [OfflineBufferModule],
  providers: [MqttPublisherService],
  exports: [MqttPublisherService],
})
export class MqttPublisherModule {}

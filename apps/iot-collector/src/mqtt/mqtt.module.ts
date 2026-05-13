import { Module } from '@nestjs/common';
import { MqttAdapter } from './mqtt.adapter';

@Module({
  providers: [MqttAdapter],
  exports: [MqttAdapter],
})
export class MqttModule {}

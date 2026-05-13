import { Module } from '@nestjs/common';
import { MqttPublisherModule } from '../mqtt-publisher/mqtt-publisher.module';
import { OpcuaSimulatorService } from './opcua-simulator.service';

@Module({
  imports: [MqttPublisherModule],
  providers: [OpcuaSimulatorService],
})
export class OpcuaSimulatorModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { OpcuaSimulatorModule } from './opcua-simulator/opcua-simulator.module';
import { MqttPublisherModule } from './mqtt-publisher/mqtt-publisher.module';
import { OfflineBufferModule } from './offline-buffer/offline-buffer.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    OfflineBufferModule,
    MqttPublisherModule,
    OpcuaSimulatorModule,
  ],
})
export class AppModule {}

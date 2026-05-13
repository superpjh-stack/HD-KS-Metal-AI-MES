import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TimescaleModule } from './timescale/timescale.module';
import { RedisModule } from './redis/redis.module';
import { MqttModule } from './mqtt/mqtt.module';
import { SensorModule } from './sensor/sensor.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    PassportModule,
    AuthModule,
    TimescaleModule,
    RedisModule,
    MqttModule,
    SensorModule,
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotifModule } from './notif/notif.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NotifModule,
  ],
})
export class AppModule {}

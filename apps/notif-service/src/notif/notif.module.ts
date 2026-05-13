import { Module } from '@nestjs/common';
import { NotifGateway } from './notif.gateway';
import { NotifService } from './notif.service';
import { NotifController } from './notif.controller';

@Module({
  controllers: [NotifController],
  providers: [NotifGateway, NotifService],
})
export class NotifModule {}

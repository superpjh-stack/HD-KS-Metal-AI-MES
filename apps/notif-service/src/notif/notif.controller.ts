import { Body, Controller, HttpCode, HttpStatus, Post, ValidationPipe } from '@nestjs/common';
import { NotifService } from './notif.service';
import { PublishAlertDto } from './dto/publish-alert.dto';

@Controller('alerts')
export class NotifController {
  constructor(private readonly notifService: NotifService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async publish(@Body(ValidationPipe) dto: PublishAlertDto) {
    const alert = await this.notifService.publish(dto);
    return { data: alert };
  }
}

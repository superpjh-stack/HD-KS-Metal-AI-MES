import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { AlarmService } from './alarm.service';
import { CreateAlarmRuleDto } from './dto/create-alarm-rule.dto';
import { UpdateAlarmRuleDto } from './dto/update-alarm-rule.dto';
import { QueryAlarmEventsDto } from './dto/query-alarm-events.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/jwt.strategy';

@Controller('alarm-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlarmRuleController {
  constructor(private readonly alarmService: AlarmService) {}

  @Get()
  @Roles('MANAGER', 'ADMIN')
  async getRules(@Query('machineId') machineId?: string) {
    const data = await this.alarmService.getRules(machineId);
    return { data };
  }

  @Post()
  @Roles('ADMIN')
  async createRule(@Body() dto: CreateAlarmRuleDto) {
    const data = await this.alarmService.createRule(dto);
    return { data };
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  async updateRule(@Param('id') id: string, @Body() dto: UpdateAlarmRuleDto) {
    const data = await this.alarmService.updateRule(id, dto);
    return { data };
  }

  @Delete(':id')
  @Roles('ADMIN')
  async deleteRule(@Param('id') id: string) {
    await this.alarmService.deleteRule(id);
    return { data: { deleted: true } };
  }
}

@Controller('alarm-events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlarmEventController {
  constructor(private readonly alarmService: AlarmService) {}

  @Get()
  @Roles('VIEWER', 'OPERATOR', 'INSPECTOR', 'MANAGER', 'ADMIN')
  async getEvents(@Query() query: QueryAlarmEventsDto) {
    const data = await this.alarmService.getEvents(query);
    return { data };
  }

  @Get('summary')
  @Roles('VIEWER', 'OPERATOR', 'INSPECTOR', 'MANAGER', 'ADMIN')
  async getSummary() {
    const data = await this.alarmService.getSummary();
    return { data };
  }

  @Patch(':id/acknowledge')
  @Roles('OPERATOR', 'INSPECTOR', 'MANAGER', 'ADMIN')
  async acknowledge(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser | null,
  ) {
    const data = await this.alarmService.acknowledge(id, user?.id ?? 'unknown');
    return { data };
  }
}

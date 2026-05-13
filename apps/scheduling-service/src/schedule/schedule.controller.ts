import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { QueryScheduleDto } from './dto/query-schedule.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/jwt.strategy';

@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  /** GET /api/v1/schedules/gantt?from=&to= — Gantt view grouped by machine */
  @Get('gantt')
  async gantt(@Query('from') from: string, @Query('to') to: string) {
    const now = new Date();
    const f = from || new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
    const t = to   || new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
    const data = await this.scheduleService.gantt(f, t);
    return { data };
  }

  /** GET /api/v1/schedules */
  @Get()
  async findAll(@Query() query: QueryScheduleDto) {
    const data = await this.scheduleService.findAll(query);
    return { data };
  }

  /** GET /api/v1/schedules/:id */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.scheduleService.findOne(id);
    return { data };
  }

  /** POST /api/v1/schedules — MANAGER+ */
  @Post()
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateScheduleDto, @CurrentUser() user: RequestUser) {
    const data = await this.scheduleService.create(dto, user.id);
    return { data };
  }

  /** PATCH /api/v1/schedules/:id — MANAGER+ */
  @Patch(':id')
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  async update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    const data = await this.scheduleService.update(id, dto);
    return { data };
  }

  /** DELETE /api/v1/schedules/:id — ADMIN only */
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.scheduleService.remove(id);
  }
}

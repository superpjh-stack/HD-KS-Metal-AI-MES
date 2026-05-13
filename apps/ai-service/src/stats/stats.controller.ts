import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { StatsService } from './stats.service';
import { QueryOeeDto } from './dto/query-oee.dto';
import { QueryOeeHistoryDto } from './dto/query-oee-history.dto';
import { QueryEnergyDto } from './dto/query-energy.dto';
import { QueryReportDto } from './dto/query-report.dto';
import { QueryQualitySummaryDto } from './dto/query-quality-summary.dto';
import { QueryDefectTrendDto } from './dto/query-defect-trend.dto';

@Controller('stats')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('oee')
  @Roles('VIEWER', 'INSPECTOR', 'MANAGER', 'ADMIN')
  async getOee(@Query() query: QueryOeeDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to   = query.to   ? new Date(query.to)   : undefined;
    const data = await this.statsService.calcOee(query.machineId, from, to);
    return { data };
  }

  @Get('oee/history')
  @Roles('VIEWER', 'INSPECTOR', 'MANAGER', 'ADMIN')
  async getOeeHistory(@Query() query: QueryOeeHistoryDto) {
    const data = await this.statsService.getOeeHistory(query.machineId, query.days);
    return { data };
  }

  @Get('energy')
  @Roles('VIEWER', 'INSPECTOR', 'MANAGER', 'ADMIN')
  async getEnergy(@Query() query: QueryEnergyDto) {
    const data = await this.statsService.getEnergy(query.machineId, query.hoursBack);
    return { data };
  }

  @Get('overview')
  @Roles('VIEWER', 'INSPECTOR', 'MANAGER', 'ADMIN')
  async getOverview() {
    const data = await this.statsService.getOverview();
    return { data };
  }

  @Get('report')
  @Roles('MANAGER', 'ADMIN')
  async getReport(@Query() query: QueryReportDto) {
    const data = await this.statsService.getReport(new Date(query.from), new Date(query.to));
    return { data };
  }

  @Get('quality-summary')
  @Roles('VIEWER', 'INSPECTOR', 'MANAGER', 'ADMIN')
  async getQualitySummary(@Query() query: QueryQualitySummaryDto) {
    const from = query.from ? new Date(query.from) : new Date(Date.now() - 7 * 86_400_000);
    const to   = query.to   ? new Date(query.to)   : new Date();
    const data = await this.statsService.getQualitySummary(from, to);
    return { data };
  }

  @Get('defect-trend')
  @Roles('VIEWER', 'INSPECTOR', 'MANAGER', 'ADMIN')
  async getDefectTrend(@Query() query: QueryDefectTrendDto) {
    const data = await this.statsService.getDefectTrend(query.machineId, query.days ?? 30);
    return { data };
  }
}

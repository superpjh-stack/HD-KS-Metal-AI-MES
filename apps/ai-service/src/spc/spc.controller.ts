import {
  Controller, Get, Post, Put, Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { AlarmSeverity, Prisma } from '@prisma/client';
import { SpcService } from './spc.service';
import { PrismaService } from '../db/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { QuerySpcChartDto } from './dto/query-spc-chart.dto';
import { QuerySpcCapabilityDto } from './dto/query-spc-capability.dto';
import { QueryViolationsDto } from './dto/query-violations.dto';
import { UpsertSpcParameterDto } from './dto/upsert-spc-parameter.dto';

@Controller('spc')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SpcController {
  constructor(
    private readonly spcService: SpcService,
    private readonly prisma: PrismaService,
  ) {}

  // GET /api/v1/spc/chart?machineId=&channel=&from=&to=&sampleSize=
  @Get('chart')
  async getChart(@Query() query: QuerySpcChartDto) {
    const machine = await this.prisma.machine.findUniqueOrThrow({
      where: { id: query.machineId },
      select: { machineCode: true },
    });

    // SpcParameter에서 sampleSize 읽기 (미설정 시 쿼리파라미터 → 기본값 5)
    const { sampleSize: dbSampleSize } = await this.spcService.getParameterOrDefault(
      query.machineId, query.channel,
    );
    const sampleSize = query.sampleSize ?? dbSampleSize;

    const data = await this.spcService.buildChartData(
      query.machineId,
      machine.machineCode,
      query.channel,
      new Date(query.from),
      new Date(query.to),
      sampleSize,
    );

    return { data };
  }

  // GET /api/v1/spc/capability?machineId=
  @Get('capability')
  async getCapability(@Query() query: QuerySpcCapabilityDto) {
    const data = await this.spcService.getCapabilityForMachine(query.machineId);
    return { data };
  }

  // GET /api/v1/spc/violations?machineId=&from=&to=
  @Get('violations')
  async getViolations(@Query() query: QueryViolationsDto) {
    // WE 위반 AlarmEvent 조회 (WESTERN_ELECTRIC 규칙과 연결된 이벤트)
    const where: Prisma.AlarmEventWhereInput = {
      machineId: query.machineId,
      rule:      { ruleType: 'WESTERN_ELECTRIC' },
    };
    if (query.from || query.to) {
      where.occurredAt = {};
      if (query.from) where.occurredAt.gte = new Date(query.from);
      if (query.to)   where.occurredAt.lte = new Date(query.to);
    }

    const data = await this.prisma.alarmEvent.findMany({
      where,
      include: { rule: { select: { ruleType: true, channel: true } } },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });

    return { data };
  }

  // POST /api/v1/spc/parameters
  @Post('parameters')
  @Roles('MANAGER', 'ADMIN')
  async createParameter(@Body() dto: UpsertSpcParameterDto) {
    const data = await this.spcService.upsertParameter(dto);
    return { data };
  }

  // PUT /api/v1/spc/parameters/:machineId/:channel
  @Put('parameters/:machineId/:channel')
  @Roles('MANAGER', 'ADMIN')
  async updateParameter(
    @Param('machineId') machineId: string,
    @Param('channel') channel: string,
    @Body() dto: Omit<UpsertSpcParameterDto, 'machineId' | 'channel'>,
  ) {
    const data = await this.spcService.upsertParameter({ machineId, channel, ...dto });
    return { data };
  }
}

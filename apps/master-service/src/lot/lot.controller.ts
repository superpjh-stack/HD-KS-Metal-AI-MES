import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { LotService } from './lot.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { CreateLotDto } from './dto/create-lot.dto';
import { UpdateLotStatusDto } from './dto/update-lot-status.dto';
import { QueryLotDto } from './dto/query-lot.dto';

@Controller('lots')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LotController {
  constructor(private readonly lotService: LotService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('INSPECTOR', 'MANAGER', 'ADMIN')
  async create(@Body() dto: CreateLotDto, @CurrentUser() user: RequestUser) {
    const lot = await this.lotService.create(dto, user.id);
    return { data: lot };
  }

  @Get()
  async findMany(@Query() query: QueryLotDto) {
    const result = await this.lotService.findMany(query);
    return result;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const lot = await this.lotService.findOne(id);
    return { data: lot };
  }

  @Get(':id/trace')
  async trace(@Param('id') id: string) {
    const result = await this.lotService.trace(id);
    return { data: result };
  }

  @Patch(':id/status')
  @Roles('INSPECTOR', 'MANAGER', 'ADMIN')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateLotStatusDto) {
    const lot = await this.lotService.updateStatus(id, dto);
    return { data: lot };
  }
}

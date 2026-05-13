import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { WorkOrderService } from './work-order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { CreateWorkOrderDto, UpdateWorkOrderDto } from './dto/create-work-order.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('work-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkOrderController {
  constructor(private readonly woService: WorkOrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('MANAGER', 'ADMIN')
  async create(@Body() dto: CreateWorkOrderDto, @CurrentUser() user: RequestUser) {
    const wo = await this.woService.create(dto, user.id);
    return { data: wo };
  }

  @Get()
  async findMany(
    @Query() query: PaginationDto,
    @Query('machineId') machineId: string | undefined,
    @Query('status') status: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    const isOperator = user.roles.includes('OPERATOR');
    const operatorId = isOperator ? user.id : undefined;
    return this.woService.findMany(query, machineId, status, operatorId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const wo = await this.woService.findOne(id);
    return { data: wo };
  }

  @Patch(':id')
  @Roles('OPERATOR', 'MANAGER', 'ADMIN')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
    @CurrentUser() user: RequestUser,
  ) {
    const isOperator = user.roles.includes('OPERATOR');
    const wo = await this.woService.update(id, dto, user.id, isOperator);
    return { data: wo };
  }
}

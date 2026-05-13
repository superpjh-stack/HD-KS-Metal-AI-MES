import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { MachineService } from './machine.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateMachineDto, UpdateMachineDto } from './dto/create-machine.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('machines')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MachineController {
  constructor(private readonly machineService: MachineService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN')
  async create(@Body() dto: CreateMachineDto) {
    const machine = await this.machineService.create(dto);
    return { data: machine };
  }

  @Get()
  async findMany(@Query() query: PaginationDto, @Query('status') status?: string) {
    return this.machineService.findMany(query, status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const machine = await this.machineService.findOne(id);
    return { data: machine };
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateMachineDto) {
    const machine = await this.machineService.update(id, dto);
    return { data: machine };
  }
}

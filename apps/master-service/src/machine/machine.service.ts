import { Injectable, NotFoundException } from '@nestjs/common';
import { MachineRepository } from './machine.repository';
import { CreateMachineDto, UpdateMachineDto } from './dto/create-machine.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class MachineService {
  constructor(private readonly machineRepo: MachineRepository) {}

  async create(dto: CreateMachineDto) {
    return this.machineRepo.create(dto);
  }

  async findOne(id: string) {
    const machine = await this.machineRepo.findById(id);
    if (!machine) throw new NotFoundException(`설비를 찾을 수 없습니다: ${id}`);
    return machine;
  }

  async findMany(query: PaginationDto, status?: string) {
    const { data, total } = await this.machineRepo.findMany(query, status);
    return { data, total, page: query.page, limit: query.limit };
  }

  async update(id: string, dto: UpdateMachineDto) {
    await this.findOne(id);
    return this.machineRepo.update(id, dto);
  }
}

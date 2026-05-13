import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { CreateMachineDto, UpdateMachineDto } from './dto/create-machine.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class MachineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMachineDto) {
    return this.prisma.machine.create({
      data: {
        machineCode: dto.machineCode,
        name: dto.name,
        machineType: dto.machineType,
        lineId: dto.lineId,
        manufacturer: dto.manufacturer,
        model: dto.model,
        plcAddress: dto.plcAddress,
        installedAt: dto.installedAt ? new Date(dto.installedAt) : undefined,
      },
      include: { line: true },
    });
  }

  async findById(id: string) {
    return this.prisma.machine.findUnique({
      where: { id },
      include: { line: true },
    });
  }

  async findByCode(machineCode: string) {
    return this.prisma.machine.findUnique({
      where: { machineCode },
      include: { line: true },
    });
  }

  async findMany(query: PaginationDto, status?: string) {
    const where = status ? { status } : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.machine.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { machineCode: 'asc' },
        include: { line: true },
      }),
      this.prisma.machine.count({ where }),
    ]);
    return { data, total };
  }

  async update(id: string, dto: UpdateMachineDto) {
    return this.prisma.machine.update({
      where: { id },
      data: dto,
      include: { line: true },
    });
  }
}

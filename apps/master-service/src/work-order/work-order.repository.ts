import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { CreateWorkOrderDto, UpdateWorkOrderDto } from './dto/create-work-order.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class WorkOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWorkOrderDto, createdById: string) {
    return this.prisma.workOrder.create({
      data: {
        woNumber: dto.woNumber,
        productCode: dto.productCode,
        machineId: dto.machineId,
        plannedQty: dto.plannedQty,
        moldId: dto.moldId,
        operatorId: dto.operatorId,
        plannedStart: dto.plannedStart ? new Date(dto.plannedStart) : undefined,
        plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : undefined,
        createdById,
      },
      include: {
        machine: { select: { id: true, machineCode: true, name: true } },
        operator: { select: { id: true, name: true } },
        mold: { select: { id: true, moldCode: true, name: true } },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        machine: { select: { id: true, machineCode: true, name: true } },
        operator: { select: { id: true, name: true } },
        mold: { select: { id: true, moldCode: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async findMany(
    query: PaginationDto,
    filters: { machineId?: string; status?: string; operatorId?: string },
  ) {
    const where: Prisma.WorkOrderWhereInput = {
      ...(filters.machineId  && { machineId:  filters.machineId }),
      ...(filters.status     && { status:     filters.status as Prisma.EnumWOStatusFilter['equals'] }),
      ...(filters.operatorId && { operatorId: filters.operatorId }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          machine: { select: { id: true, machineCode: true, name: true } },
          operator: { select: { id: true, name: true } },
        },
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, dto: UpdateWorkOrderDto) {
    return this.prisma.workOrder.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.producedQty !== undefined && { producedQty: dto.producedQty }),
        ...(dto.defectQty !== undefined && { defectQty: dto.defectQty }),
        ...(dto.operatorId && { operatorId: dto.operatorId }),
        ...(dto.actualStart && { actualStart: new Date(dto.actualStart) }),
        ...(dto.actualEnd && { actualEnd: new Date(dto.actualEnd) }),
      },
      include: {
        machine: { select: { id: true, machineCode: true, name: true } },
      },
    });
  }
}

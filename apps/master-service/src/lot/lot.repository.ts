import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { CreateLotDto } from './dto/create-lot.dto';
import { QueryLotDto } from './dto/query-lot.dto';
import { LotStatus } from '@ks-mes/types';
import { Prisma } from '@prisma/client';

@Injectable()
export class LotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLotDto, createdById: string) {
    return this.prisma.lot.create({
      data: {
        lotNumber: dto.lotNumber,
        lotType: dto.lotType,
        materialId: dto.materialId,
        supplierId: dto.supplierId,
        quantity: dto.quantity,
        unit: dto.unit,
        createdById,
      },
      include: { material: true, supplier: true, createdBy: { select: { id: true, name: true } } },
    });
  }

  async findById(id: string) {
    return this.prisma.lot.findUnique({
      where: { id },
      include: { material: true, supplier: true, createdBy: { select: { id: true, name: true } } },
    });
  }

  async findMany(query: QueryLotDto) {
    const where: Prisma.LotWhereInput = {
      ...(query.lotNumber && { lotNumber: { contains: query.lotNumber, mode: 'insensitive' } }),
      ...(query.lotType && { lotType: query.lotType }),
      ...(query.status && { status: query.status }),
      ...(query.supplierId && { supplierId: query.supplierId }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.lot.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { material: true, supplier: true },
      }),
      this.prisma.lot.count({ where }),
    ]);

    return { data, total };
  }

  async updateStatus(id: string, status: LotStatus) {
    return this.prisma.lot.update({
      where: { id },
      data: { status },
    });
  }

  async findEventsById(lotId: string) {
    return this.prisma.lotEvent.findMany({
      where: { lotId },
      orderBy: { occurredAt: 'asc' },
      include: {
        machine: { select: { id: true, machineCode: true, name: true } },
        workOrder: { select: { id: true, woNumber: true } },
        operator: { select: { id: true, name: true } },
      },
    });
  }
}

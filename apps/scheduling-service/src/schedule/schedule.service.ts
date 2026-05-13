import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { QueryScheduleDto } from './dto/query-schedule.dto';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateScheduleDto, userId: string) {
    const conflict = await this.prisma.productionSchedule.findFirst({
      where: {
        machineId: dto.machineId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        plannedStart: { lt: new Date(dto.plannedEnd) },
        plannedEnd:   { gt: new Date(dto.plannedStart) },
      },
    });

    if (conflict) {
      throw new ConflictException(
        `설비 ${dto.machineId}에 ${conflict.scheduleNo} 일정과 시간이 겹칩니다.`,
      );
    }

    const scheduleNo = `SCH-${Date.now()}`;

    return this.prisma.productionSchedule.create({
      data: {
        scheduleNo,
        machineId:    dto.machineId,
        productCode:  dto.productCode,
        plannedQty:   dto.plannedQty,
        plannedStart: new Date(dto.plannedStart),
        plannedEnd:   new Date(dto.plannedEnd),
        workOrderId:  dto.workOrderId,
        priority:     dto.priority ?? 5,
        notes:        dto.notes,
        createdById:  userId,
      },
    });
  }

  async findAll(query: QueryScheduleDto) {
    const where: Record<string, unknown> = {};

    if (query.machineId) where.machineId = query.machineId;
    if (query.status)    where.status    = query.status;
    if (query.from || query.to) {
      where.plannedStart = {};
      if (query.from) (where.plannedStart as Record<string, unknown>).gte = new Date(query.from);
      if (query.to)   (where.plannedStart as Record<string, unknown>).lte = new Date(query.to);
    }

    return this.prisma.productionSchedule.findMany({
      where,
      orderBy: [{ plannedStart: 'asc' }, { priority: 'asc' }],
    });
  }

  async findOne(id: string) {
    const schedule = await this.prisma.productionSchedule.findUnique({ where: { id } });
    if (!schedule) throw new NotFoundException(`스케줄 ${id}을 찾을 수 없습니다.`);
    return schedule;
  }

  async update(id: string, dto: UpdateScheduleDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = { ...dto };
    if (dto.actualStart) data.actualStart = new Date(dto.actualStart);
    if (dto.actualEnd)   data.actualEnd   = new Date(dto.actualEnd);
    if (dto.plannedStart) data.plannedStart = new Date(dto.plannedStart);
    if (dto.plannedEnd)   data.plannedEnd   = new Date(dto.plannedEnd);

    return this.prisma.productionSchedule.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.productionSchedule.delete({ where: { id } });
  }

  async gantt(from: string, to: string) {
    const schedules = await this.prisma.productionSchedule.findMany({
      where: {
        plannedStart: { lt: new Date(to) },
        plannedEnd:   { gt: new Date(from) },
        status: { not: 'CANCELLED' },
      },
      orderBy: [{ machineId: 'asc' }, { plannedStart: 'asc' }],
    });

    const machineMap = new Map<string, typeof schedules>();
    for (const s of schedules) {
      if (!machineMap.has(s.machineId)) machineMap.set(s.machineId, []);
      machineMap.get(s.machineId)!.push(s);
    }

    return Array.from(machineMap.entries()).map(([machineId, items]) => ({
      machineId,
      schedules: items,
    }));
  }
}

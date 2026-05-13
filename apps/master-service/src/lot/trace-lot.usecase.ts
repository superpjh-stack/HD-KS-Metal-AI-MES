import { Injectable, NotFoundException } from '@nestjs/common';
import { LotRepository } from './lot.repository';

@Injectable()
export class TraceLotUseCase {
  constructor(private readonly lotRepo: LotRepository) {}

  async execute(lotId: string) {
    const lot = await this.lotRepo.findById(lotId);
    if (!lot) throw new NotFoundException(`LOT를 찾을 수 없습니다: ${lotId}`);

    const events = await this.lotRepo.findEventsById(lotId);

    return {
      lot: {
        id: lot.id,
        lotNumber: lot.lotNumber,
        lotType: lot.lotType,
        material: lot.material ? { code: lot.material.materialCode, name: lot.material.name } : null,
        supplier: lot.supplier ? { name: lot.supplier.name } : null,
        quantity: Number(lot.quantity),
        unit: lot.unit,
        status: lot.status,
        createdAt: lot.createdAt,
      },
      events: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        occurredAt: e.occurredAt,
        machine: e.machine ?? null,
        workOrder: e.workOrder ?? null,
        operator: e.operator ?? null,
        payload: e.payload,
      })),
    };
  }
}

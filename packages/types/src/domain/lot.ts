export type LotType = 'MATERIAL' | 'WIP' | 'PRODUCT';
export type LotStatus = 'ACTIVE' | 'USED' | 'REJECTED' | 'SHIPPED';

export type LotEventType =
  | 'INBOUND'
  | 'INSPECTION'
  | 'PROCESS_START'
  | 'PROCESS_END'
  | 'QUALITY_CHECK'
  | 'SHIPMENT'
  | 'REJECT';

export interface Lot {
  id: string;
  lotNumber: string;
  lotType: LotType;
  materialId?: string;
  supplierId?: string;
  quantity: number;
  unit: string;
  status: LotStatus;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LotEvent {
  id: string;
  lotId: string;
  eventType: LotEventType;
  machineId?: string;
  workOrderId?: string;
  operatorId?: string;
  payload?: Record<string, unknown>;
  occurredAt: Date;
}

export interface LotTrace {
  lot: Lot & {
    material?: { code: string; name: string };
    supplier?: { name: string };
  };
  events: Array<
    LotEvent & {
      machine?: { code: string; name: string };
      workOrder?: { woNumber: string };
      operator?: { name: string };
    }
  >;
}

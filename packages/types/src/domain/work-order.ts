export type WOStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';

export interface WorkOrder {
  id: string;
  woNumber: string;
  productCode: string;
  moldId?: string;
  machineId: string;
  plannedQty: number;
  producedQty: number;
  defectQty: number;
  status: WOStatus;
  plannedStart?: Date;
  plannedEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  operatorId?: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

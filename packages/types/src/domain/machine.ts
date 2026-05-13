export type MachineType = 'PRESS' | 'WELDER' | 'WASHER' | 'ASSEMBLER' | 'INSPECTOR';
export type MachineStatus = 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';

export interface Machine {
  id: string;
  machineCode: string;
  name: string;
  machineType: MachineType;
  lineId?: string;
  manufacturer?: string;
  model?: string;
  plcAddress?: string;
  mqttTopic: string;
  installedAt?: Date;
  status: MachineStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SensorReading {
  machineId: string;
  machineCode: string;
  channel: string;
  value: number;
  unit: string;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  timestamp: Date;
}

export interface MachineSensorSnapshot {
  machineId: string;
  machineCode: string;
  sensors: Record<string, { value: number; unit: string; status: string }>;
  updatedAt: Date;
}

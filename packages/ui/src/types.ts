export interface SpcControlLimits {
  cl_xbar:  number;
  ucl_xbar: number;
  lcl_xbar: number;
  cl_r:     number;
  ucl_r:    number;
  lcl_r:    number;
}

export interface SpcPoint {
  bucket:     string;
  xbar:       number;
  range:      number;
  violations: string[];
}

export type AlarmSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AlarmEvent {
  id:             string;
  machineId:      string;
  channel:        string;
  severity:       AlarmSeverity;
  value:          number;
  threshold:      number | null;
  message:        string;
  occurredAt:     string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

export type CapabilityStatus = 'OK' | 'WARNING' | 'CRITICAL' | 'NO_SPEC' | 'INSUFFICIENT_DATA';

export interface CapabilityItem {
  channel: string;
  cp:      number | null;
  cpk:     number | null;
  mean:    number;
  std:     number;
  samples: number;
  usl:     number | null;
  lsl:     number | null;
  status:  CapabilityStatus;
}

export interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  status?: 'normal' | 'warning' | 'critical';
}

export interface MachineStatusBadgeProps {
  machineCode: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED' | 'WARNING';
  spm?: number;
}

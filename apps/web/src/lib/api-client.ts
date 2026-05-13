import { getSession } from 'next-auth/react';

const MASTER_URL = process.env.NEXT_PUBLIC_MASTER_URL ?? 'http://localhost:3002/api/v1';
const IOT_URL    = process.env.NEXT_PUBLIC_IOT_URL    ?? 'http://localhost:3003/api/v1';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  if (!session?.accessToken) return {};
  return { Authorization: `Bearer ${session.accessToken}` };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── LOT ───────────────────────────────────────────────────────

export interface LotSummary {
  id: string;
  lotNumber: string;
  lotType: string;
  status: string;
  quantity: number;
  unit: string;
  material?: { name: string } | null;
  supplier?: { name: string } | null;
  createdAt: string;
}

export interface LotTraceResult {
  lot: {
    id: string;
    lotNumber: string;
    lotType: string;
    material: { code: string; name: string } | null;
    supplier: { name: string } | null;
    quantity: number;
    unit: string;
    status: string;
    createdAt: string;
  };
  events: Array<{
    id: string;
    eventType: string;
    occurredAt: string;
    machine: { machineCode: string; name: string } | null;
    workOrder: { woNumber: string } | null;
    operator: { name: string } | null;
    payload: unknown;
  }>;
}

export const lotApi = {
  list: (params?: Record<string, string>) =>
    request<{ data: LotSummary[]; total: number; page: number; limit: number }>(
      `${MASTER_URL}/lots?${new URLSearchParams(params)}`,
    ),
  get: (id: string) => request<{ data: LotSummary }>(`${MASTER_URL}/lots/${id}`),
  trace: (id: string) => request<{ data: LotTraceResult }>(`${MASTER_URL}/lots/${id}/trace`),
};

// ─── Machine ───────────────────────────────────────────────────

export interface MachineSummary {
  id: string;
  machineCode: string;
  name: string;
  machineType: string;
  status: string;
  manufacturer?: string | null;
  installedAt?: string | null;
  line?: { name: string } | null;
}

export const machineApi = {
  list: () => request<{ data: MachineSummary[]; total: number; page: number; limit: number }>(`${MASTER_URL}/machines`),
  get: (id: string) => request<{ data: MachineSummary }>(`${MASTER_URL}/machines/${id}`),
};

// ─── Work Order ────────────────────────────────────────────────

export interface WorkOrderSummary {
  id: string;
  woNumber: string;
  productCode: string;
  status: string;
  plannedQty: number;
  producedQty: number;
  defectQty: number;
  machineId?: string;
  machine?: { id: string; machineCode: string; name: string } | null;
  operator?: { id: string; name: string } | null;
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  createdAt?: string;
}

export const workOrderApi = {
  list: (params?: Record<string, string>) =>
    request<{ data: WorkOrderSummary[]; total: number; page: number; limit: number }>(
      `${MASTER_URL}/work-orders?${new URLSearchParams(params)}`,
    ),
  get: (id: string) => request<{ data: WorkOrderSummary }>(`${MASTER_URL}/work-orders/${id}`),
};

// ─── AI Service base ───────────────────────────────────────────

const AI_URL = process.env.NEXT_PUBLIC_AI_URL ?? 'http://localhost:3006/api/v1';

// ─── Alarm ─────────────────────────────────────────────────────

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

export interface AlarmSummaryItem {
  machineId:   string;
  count:       number;
  maxSeverity: AlarmSeverity;
}

export const alarmApi = {
  events: (params?: Record<string, string>) =>
    request<{ data: AlarmEvent[] }>(
      `${AI_URL}/alarm-events?${new URLSearchParams(params)}`,
    ),
  summary: () =>
    request<{ data: AlarmSummaryItem[] }>(`${AI_URL}/alarm-events/summary`),
  acknowledge: (id: string) =>
    request<{ data: AlarmEvent }>(`${AI_URL}/alarm-events/${id}/acknowledge`, {
      method: 'PATCH',
    }),
};

// ─── SPC ───────────────────────────────────────────────────────

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

export interface SpcChartData {
  machineId:  string;
  channel:    string;
  sampleSize: number;
  limits:     SpcControlLimits | null;
  points:     SpcPoint[];
}

export interface CapabilityItem {
  channel: string;
  cp:      number | null;
  cpk:     number | null;
  mean:    number;
  std:     number;
  samples: number;
  usl:     number | null;
  lsl:     number | null;
  status:  'OK' | 'WARNING' | 'CRITICAL' | 'NO_SPEC' | 'INSUFFICIENT_DATA';
}

export const spcApi = {
  chart: (params: { machineId: string; channel: string; from: string; to: string; sampleSize?: number }) =>
    request<{ data: SpcChartData }>(
      `${AI_URL}/spc/chart?${new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])),
      )}`,
    ),
  capability: (machineId: string) =>
    request<{ data: CapabilityItem[] }>(`${AI_URL}/spc/capability?machineId=${machineId}`),
  violations: (params: { machineId: string; from?: string; to?: string }) =>
    request<{ data: AlarmEvent[] }>(
      `${AI_URL}/spc/violations?${new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v != null) as [string, string][]),
      )}`,
    ),
};

// ─── Stats ─────────────────────────────────────────────────────

export interface OeeResult {
  machineId:    string;
  from:         string;
  to:           string;
  availability: number;
  performance:  number;
  quality:      number;
  oee:          number;
  woCount:      number;
}

export interface OeeHistoryItem {
  date:         string;
  availability: number;
  performance:  number;
  quality:      number;
  oee:          number;
}

export interface EnergyPoint {
  time:  string;
  avgKw: number;
}

export interface OverviewItem {
  machineId:        string;
  machineCode:      string;
  name:             string;
  status:           string;
  alarmCount:       number;
  maxAlarmSeverity: 'NONE' | 'INFO' | 'WARNING' | 'CRITICAL';
  pdmAnomalyScore:  number | null;
  pdmFailureProb:   number | null;
  pdmRulHours:      number | null;
  spcViolations:    number;
  riskLevel:        'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface ReportData {
  period:   { from: string; to: string };
  machines: Array<{
    machineId: string; machineCode: string; name: string;
    oee: number | null; alarmCount: number;
    pdmRisk: 'NONE' | 'LOW' | 'HIGH'; topChannel: string | null;
  }>;
  alarms: {
    total: number; critical: number; warning: number; info: number;
    topChannels: Array<{ channel: string; count: number }>;
  };
  pdm: { anomalyCount: number; highRiskMachines: number; avgRulHours: number | null };
  spc: { totalViolations: number; topMachines: Array<{ machineCode: string; count: number }> };
}

export const statsApi = {
  oee: (machineId: string, from?: string, to?: string) =>
    request<{ data: OeeResult }>(
      `${AI_URL}/stats/oee?${new URLSearchParams(
        Object.fromEntries(Object.entries({ machineId, from, to }).filter(([, v]) => v != null) as [string,string][]),
      )}`,
    ),
  oeeHistory: (machineId: string, days?: number) =>
    request<{ data: OeeHistoryItem[] }>(
      `${AI_URL}/stats/oee/history?${new URLSearchParams(
        Object.fromEntries(Object.entries({ machineId, days: days?.toString() }).filter(([, v]) => v != null) as [string,string][]),
      )}`,
    ),
  energy: (machineId: string, hoursBack?: number) =>
    request<{ data: EnergyPoint[] }>(
      `${AI_URL}/stats/energy?${new URLSearchParams(
        Object.fromEntries(Object.entries({ machineId, hoursBack: hoursBack?.toString() }).filter(([, v]) => v != null) as [string,string][]),
      )}`,
    ),
  overview: () =>
    request<{ data: OverviewItem[] }>(`${AI_URL}/stats/overview`),
  report: (from: string, to: string) =>
    request<{ data: ReportData }>(`${AI_URL}/stats/report?from=${from}&to=${to}`),
};

// ─── PDM ───────────────────────────────────────────────────────

export type MlModelType = 'AUTOENCODER' | 'FAILURE_PROB' | 'RUL';

export interface PdmSummary {
  machineId:          string;
  anomalyScore:       { score: number; isAnomaly: boolean; updatedAt: string } | null;
  failureProbability: { max: number; channel: string; updatedAt: string } | null;
  rul:                { hours: number; trend: string; updatedAt: string } | null;
}

export interface PredictionLog {
  id:          string;
  machineId:   string;
  channel:     string;
  modelType:   MlModelType;
  predictedAt: string;
  score:       number;
  isAnomaly:   boolean;
}

export interface MlModelStatus {
  modelType:    MlModelType;
  version:      string;
  trainedAt:    string | null;
  trainSamples: number;
  threshold:    number | null;
  isActive:     boolean;
}

export const pdmApi = {
  summary: (machineId: string) =>
    request<{ data: PdmSummary }>(`${AI_URL}/pdm/summary?machineId=${machineId}`),
  predictions: (params: { machineId: string; modelType?: MlModelType; limit?: number }) =>
    request<{ data: PredictionLog[] }>(
      `${AI_URL}/pdm/predictions?${new URLSearchParams(
        Object.fromEntries(
          Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
        ),
      )}`,
    ),
  modelStatus: () =>
    request<{ data: MlModelStatus[] }>(`${AI_URL}/pdm/model-status`),
};

// ─── Sensor ────────────────────────────────────────────────────

export interface SensorLatestResponse {
  timestamp: string;
  machines: Array<{
    machineCode: string;
    sensors: Record<string, { value: number; unit: string; status: string }>;
    updatedAt: string;
  }>;
}

export const sensorApi = {
  latest: () => request<{ data: SensorLatestResponse }>(`${IOT_URL}/sensors/latest`),
  history: (machineId: string, from: string, to: string, channel?: string) =>
    request<{ data: Array<{ time: string; channel: string; value: number }> }>(
      `${IOT_URL}/sensors/${machineId}/history?from=${from}&to=${to}${channel ? `&channel=${channel}` : ''}`,
    ),
};

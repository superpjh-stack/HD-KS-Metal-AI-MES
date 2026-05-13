import { useQuery } from '@tanstack/react-query';
import { request } from '@/lib/api-client';

const AI_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? 'http://localhost:3006';

export interface MachineCapability {
  machineId: string;
  machineCode: string;
  name: string;
  avgCpk: number | null;
  violations: number;
  status: 'CAPABLE' | 'MARGINAL' | 'INCAPABLE' | 'NO_DATA';
}

export interface QualitySummary {
  period: { from: string; to: string };
  kpi: { totalAlarms: number; criticalAlarms: number; totalViolations: number; avgCpk: number | null };
  machineCapability: MachineCapability[];
}

export function useQualitySummary(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  return useQuery({
    queryKey: ['quality-summary', from, to],
    queryFn: () => request<{ data: QualitySummary }>(`${AI_URL}/api/v1/stats/quality-summary?${params}`),
    staleTime: 60_000,
  });
}

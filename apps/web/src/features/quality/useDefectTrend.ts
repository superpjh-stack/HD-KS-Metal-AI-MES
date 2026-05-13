import { useQuery } from '@tanstack/react-query';
import { request } from '@/lib/api-client';

const AI_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? 'http://localhost:3006';

export interface DefectTrendPoint {
  date: string;
  total: number;
  critical: number;
}

export function useDefectTrend(machineId?: string, days = 30) {
  const params = new URLSearchParams({ days: String(days) });
  if (machineId) params.set('machineId', machineId);

  return useQuery({
    queryKey: ['defect-trend', machineId, days],
    queryFn: () => request<{ data: DefectTrendPoint[] }>(`${AI_URL}/api/v1/stats/defect-trend?${params}`),
    staleTime: 120_000,
  });
}

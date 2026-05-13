import { useQuery } from '@tanstack/react-query';
import { request } from '@/lib/api-client';

const AI_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? 'http://localhost:3006';

export interface SpcResult {
  id: string;
  machineId: string;
  channel: string;
  xbar: number;
  rbar: number;
  cpk: number | null;
  isViolation: boolean;
  violationType: string | null;
  calculatedAt: string;
}

export function useSpcDrilldown(machineId: string, enabled = true) {
  return useQuery({
    queryKey: ['spc-results', machineId],
    queryFn: () =>
      request<{ data: SpcResult[] }>(
        `${AI_URL}/api/v1/spc/results?machineId=${machineId}&limit=100`,
      ),
    enabled: enabled && !!machineId,
    staleTime: 60_000,
  });
}

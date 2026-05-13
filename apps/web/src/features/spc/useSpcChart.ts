'use client';

import { useQuery } from '@tanstack/react-query';
import { spcApi } from '@/lib/api-client';

interface UseSpcChartParams {
  machineId: string;
  channel:   string;
  hoursBack?: number;
  sampleSize?: number;
}

export function useSpcChart({ machineId, channel, hoursBack = 4, sampleSize }: UseSpcChartParams) {
  const now  = new Date();
  const from = new Date(now.getTime() - hoursBack * 60 * 60 * 1000).toISOString();
  const to   = now.toISOString();

  return useQuery({
    queryKey: ['spc', 'chart', machineId, channel, hoursBack, sampleSize],
    queryFn: () => spcApi.chart({ machineId, channel, from, to, sampleSize }),
    enabled: !!(machineId && channel),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

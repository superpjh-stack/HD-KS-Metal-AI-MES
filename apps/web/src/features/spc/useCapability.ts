'use client';

import { useQuery } from '@tanstack/react-query';
import { spcApi } from '@/lib/api-client';

export function useCapability(machineId: string) {
  return useQuery({
    queryKey: ['spc', 'capability', machineId],
    queryFn: () => spcApi.capability(machineId),
    enabled: !!machineId,
    staleTime: 5 * 60_000,
  });
}

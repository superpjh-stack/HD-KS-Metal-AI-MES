'use client';

import { useQuery } from '@tanstack/react-query';
import { lotApi } from '@/lib/api-client';

export function useLotTrace(lotId: string) {
  return useQuery({
    queryKey: ['lot', lotId, 'trace'],
    queryFn: () => lotApi.trace(lotId),
    enabled: !!lotId,
    staleTime: 60_000,
  });
}

export function useLotList(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['lots', params],
    queryFn: () => lotApi.list(params),
    staleTime: 30_000,
  });
}

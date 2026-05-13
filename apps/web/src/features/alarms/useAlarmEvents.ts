'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { alarmApi } from '@/lib/api-client';

export function useAlarmEvents(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['alarms', 'events', params],
    queryFn: () => alarmApi.events(params),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useAlarmSummary() {
  return useQuery({
    queryKey: ['alarms', 'summary'],
    queryFn: () => alarmApi.summary(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useAcknowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => alarmApi.acknowledge(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['alarms'] });
    },
  });
}

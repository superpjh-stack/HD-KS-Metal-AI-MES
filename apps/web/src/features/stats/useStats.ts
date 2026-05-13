import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib/api-client';

export function useOee(machineId: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ['stats', 'oee', machineId, from, to],
    queryFn:  () => statsApi.oee(machineId, from, to),
    enabled:  !!machineId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOeeHistory(machineId: string, days = 7) {
  return useQuery({
    queryKey: ['stats', 'oee-history', machineId, days],
    queryFn:  () => statsApi.oeeHistory(machineId, days),
    enabled:  !!machineId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEnergy(machineId: string, hoursBack = 24) {
  return useQuery({
    queryKey: ['stats', 'energy', machineId, hoursBack],
    queryFn:  () => statsApi.energy(machineId, hoursBack),
    enabled:  !!machineId,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useOverview() {
  return useQuery({
    queryKey: ['stats', 'overview'],
    queryFn:  () => statsApi.overview(),
    refetchInterval: 30_000,
  });
}

export function useReport(from: string, to: string) {
  return useQuery({
    queryKey: ['stats', 'report', from, to],
    queryFn:  () => statsApi.report(from, to),
    enabled:  !!from && !!to,
    staleTime: 10 * 60 * 1000,
  });
}

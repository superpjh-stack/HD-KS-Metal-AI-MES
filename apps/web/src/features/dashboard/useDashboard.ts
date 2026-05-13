'use client';

import { useQuery } from '@tanstack/react-query';
import { lotApi, machineApi, sensorApi, workOrderApi } from '@/lib/api-client';

// ─── Machine status ─────────────────────────────────────────────

export function useMachines() {
  return useQuery({
    queryKey: ['machines'],
    queryFn: () => machineApi.list(),
    staleTime: 60_000,
  });
}

// ─── Sensor latest ──────────────────────────────────────────────

export function useSensorLatest() {
  return useQuery({
    queryKey: ['sensors', 'latest'],
    queryFn: () => sensorApi.latest(),
    refetchInterval: 30_000,
  });
}

// ─── KPI: active lots ───────────────────────────────────────────

export function useActiveLots() {
  return useQuery({
    queryKey: ['lots', 'active'],
    queryFn: () => lotApi.list({ status: 'ACTIVE', limit: '1', page: '1' }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

// ─── KPI: machine utilisation ───────────────────────────────────

export function useMachineKpi() {
  return useQuery({
    queryKey: ['machines', 'kpi'],
    queryFn: () => machineApi.list(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

// ─── KPI: active work orders ────────────────────────────────────

export function useActiveWorkOrders() {
  return useQuery({
    queryKey: ['work-orders', 'active'],
    queryFn: () => workOrderApi.list({ status: 'IN_PROGRESS', limit: '1', page: '1' }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

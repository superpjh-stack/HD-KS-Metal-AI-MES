import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from '@/lib/api-client';

const SCHED_URL = process.env.NEXT_PUBLIC_SCHEDULING_URL ?? 'http://localhost:3008';

export type ScheduleStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';

export interface ProductionSchedule {
  id: string;
  scheduleNo: string;
  workOrderId: string | null;
  machineId: string;
  productCode: string;
  plannedQty: number;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  status: ScheduleStatus;
  priority: number;
  notes: string | null;
  createdAt: string;
}

export interface GanttRow {
  machineId: string;
  schedules: ProductionSchedule[];
}

export function useGantt(from: string, to: string) {
  return useQuery({
    queryKey: ['gantt', from, to],
    queryFn: () =>
      request<{ data: GanttRow[] }>(
        `${SCHED_URL}/api/v1/schedules/gantt?from=${from}&to=${to}`,
      ),
    staleTime: 30_000,
  });
}

export function useSchedules(params?: { machineId?: string; status?: ScheduleStatus; from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params?.machineId) qs.set('machineId', params.machineId);
  if (params?.status)    qs.set('status',    params.status);
  if (params?.from)      qs.set('from',      params.from);
  if (params?.to)        qs.set('to',        params.to);

  return useQuery({
    queryKey: ['schedules', params],
    queryFn: () => request<{ data: ProductionSchedule[] }>(`${SCHED_URL}/api/v1/schedules?${qs}`),
    staleTime: 30_000,
  });
}

export function useUpdateScheduleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ScheduleStatus }) =>
      request<{ data: ProductionSchedule }>(`${SCHED_URL}/api/v1/schedules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
      qc.invalidateQueries({ queryKey: ['gantt'] });
    },
  });
}

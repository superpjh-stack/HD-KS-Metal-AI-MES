import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { getCachedJson, setCachedJson } from '../lib/storage';

export interface WorkOrder {
  id: string;
  lotId: string;
  machineId: string;
  status: string;
  plannedStart: string;
  plannedEnd: string;
  producedQty: number;
  defectQty: number;
  assignedOperatorId: string | null;
}

export function useWorkOrders() {
  return useQuery({
    queryKey: ['work-orders'],
    queryFn: async () => {
      try {
        const { data } = await api.get<{ data: WorkOrder[]; total: number }>('/work-orders');
        setCachedJson('work-orders', data.data);
        return data.data;
      } catch {
        return getCachedJson<WorkOrder[]>('work-orders') ?? [];
      }
    },
    staleTime: 60_000,
  });
}

export function useCompleteWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, defectQty }: { id: string; defectQty: number }) =>
      api.patch(`/work-orders/${id}/status`, { status: 'COMPLETED', defectQty }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-orders'] }),
  });
}

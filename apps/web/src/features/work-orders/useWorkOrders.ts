import { useQuery } from '@tanstack/react-query';
import { workOrderApi } from '@/lib/api-client';

export function useWorkOrders() {
  return useQuery({
    queryKey: ['work-orders', 'all'],
    queryFn: () => workOrderApi.list({ limit: '200', page: '1' }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: ['work-orders', id],
    queryFn: () => workOrderApi.get(id),
    staleTime: 30_000,
    enabled: !!id,
  });
}

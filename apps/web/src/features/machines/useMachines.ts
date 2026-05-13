import { useQuery } from '@tanstack/react-query';
import { machineApi } from '@/lib/api-client';

export function useMachineList() {
  return useQuery({
    queryKey: ['machines', 'list'],
    queryFn: () => machineApi.list(),
    staleTime: 60_000,
  });
}

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface AlarmEvent {
  id: string;
  machineId: string;
  channel: string;
  severity: string;
  message: string;
  triggeredAt: string;
  acknowledgedAt: string | null;
}

export function useAlarmFeed() {
  return useQuery({
    queryKey: ['alarms-active'],
    queryFn: async () => {
      const { data } = await api.get<{ data: AlarmEvent[] }>('/alarms/events?status=ACTIVE&limit=50');
      return data.data;
    },
    refetchInterval: 30_000,
  });
}

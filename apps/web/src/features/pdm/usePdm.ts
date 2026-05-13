import { useQuery } from '@tanstack/react-query';
import { pdmApi, MlModelType } from '@/lib/api-client';

export function usePdmSummary(machineId: string) {
  return useQuery({
    queryKey: ['pdm', 'summary', machineId],
    queryFn:  () => pdmApi.summary(machineId),
    enabled:  !!machineId,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function usePredictions(machineId: string, modelType?: MlModelType, limit = 50) {
  return useQuery({
    queryKey: ['pdm', 'predictions', machineId, modelType, limit],
    queryFn:  () => pdmApi.predictions({ machineId, modelType, limit }),
    enabled:  !!machineId,
    staleTime: 60_000,
  });
}

export function useModelStatus() {
  return useQuery({
    queryKey: ['pdm', 'model-status'],
    queryFn:  () => pdmApi.modelStatus(),
    staleTime: 5 * 60 * 1000,
  });
}

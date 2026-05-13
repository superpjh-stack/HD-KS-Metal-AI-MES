import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { WorkOrder } from '../hooks/useWorkOrders';

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100',
  IN_PROGRESS: 'bg-blue-100',
  COMPLETED: 'bg-green-100',
  CANCELLED: 'bg-gray-100',
};

interface Props { wo: WorkOrder; onPress: () => void; }

export function WorkOrderCard({ wo, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`rounded-lg p-4 mb-3 ${STATUS_COLOR[wo.status] ?? 'bg-white'} border border-gray-200`}
    >
      <View className="flex-row justify-between items-center">
        <Text className="font-semibold text-gray-800 text-base">{wo.id.slice(-8)}</Text>
        <Text className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">{wo.status}</Text>
      </View>
      <Text className="text-gray-500 text-sm mt-1">Machine: {wo.machineId}</Text>
      <Text className="text-gray-500 text-sm">Planned: {new Date(wo.plannedStart).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );
}

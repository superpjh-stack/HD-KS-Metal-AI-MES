import React from 'react';
import { View, Text } from 'react-native';

interface Machine { id: string; code: string; name: string; status: string; }

const STATUS_DOT: Record<string, string> = {
  ACTIVE: 'bg-green-500',
  IDLE: 'bg-yellow-400',
  MAINTENANCE: 'bg-orange-400',
  OFFLINE: 'bg-gray-400',
};

export function MachineStatusCard({ machine }: { machine: Machine }) {
  return (
    <View className="bg-white rounded-lg p-3 m-1 flex-1 border border-gray-100 items-center">
      <View className={`w-3 h-3 rounded-full mb-2 ${STATUS_DOT[machine.status] ?? 'bg-gray-300'}`} />
      <Text className="font-medium text-gray-700 text-xs text-center">{machine.code}</Text>
      <Text className="text-gray-400 text-xs">{machine.status}</Text>
    </View>
  );
}

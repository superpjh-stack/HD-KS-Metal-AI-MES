import React from 'react';
import { View, Text } from 'react-native';
import type { AlarmEvent } from '../hooks/useAlarmFeed';

const SEV_COLOR: Record<string, string> = {
  CRITICAL: 'border-red-500',
  HIGH: 'border-orange-400',
  MEDIUM: 'border-yellow-400',
  LOW: 'border-blue-300',
};

export function AlarmItem({ alarm }: { alarm: AlarmEvent }) {
  return (
    <View className={`bg-white rounded-lg p-4 mb-2 border-l-4 ${SEV_COLOR[alarm.severity] ?? 'border-gray-300'}`}>
      <View className="flex-row justify-between">
        <Text className="font-semibold text-gray-800">{alarm.severity}</Text>
        <Text className="text-gray-400 text-xs">{new Date(alarm.triggeredAt).toLocaleTimeString()}</Text>
      </View>
      <Text className="text-gray-600 text-sm mt-1">{alarm.message}</Text>
      <Text className="text-gray-400 text-xs mt-1">Machine: {alarm.machineId} / {alarm.channel}</Text>
    </View>
  );
}

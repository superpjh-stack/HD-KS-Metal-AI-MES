import React from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MachineStatusCard } from '@/components/MachineStatusCard';

interface Machine { id: string; code: string; name: string; status: string; }

export default function MachinesScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Machine[] }>('/machines');
      return data.data;
    },
    refetchInterval: 60_000,
  });

  const counts = (data ?? []).reduce((acc, m) => {
    acc[m.status] = (acc[m.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <View className="flex-row mb-4 gap-2">
        {Object.entries(counts).map(([s, c]) => (
          <View key={s} className="flex-1 bg-white rounded-lg p-3 items-center border border-gray-100">
            <Text className="text-xl font-bold text-gray-800">{c}</Text>
            <Text className="text-xs text-gray-500">{s}</Text>
          </View>
        ))}
      </View>
      {isLoading
        ? <ActivityIndicator />
        : (
          <FlatList
            data={data ?? []}
            numColumns={3}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <MachineStatusCard machine={item} />}
          />
        )
      }
    </View>
  );
}

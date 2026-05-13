import React from 'react';
import { View, FlatList, Text, ActivityIndicator, RefreshControl } from 'react-native';
import { useAlarmFeed } from '@/hooks/useAlarmFeed';
import { AlarmItem } from '@/components/AlarmItem';

export default function AlarmsScreen() {
  const { data: alarms, isLoading, refetch, isRefetching } = useAlarmFeed();

  return (
    <View className="flex-1 bg-gray-50 p-4">
      {isLoading
        ? <ActivityIndicator className="mt-8" />
        : (
          <FlatList
            data={alarms ?? []}
            keyExtractor={(a) => a.id}
            renderItem={({ item }) => <AlarmItem alarm={item} />}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            ListEmptyComponent={<Text className="text-center text-gray-400 mt-8">활성 알람 없음</Text>}
          />
        )
      }
    </View>
  );
}

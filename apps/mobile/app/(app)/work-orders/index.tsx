import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { WorkOrderCard } from '@/components/WorkOrderCard';

export default function WorkOrdersScreen() {
  const { data: wos, isLoading } = useWorkOrders();
  const [filter, setFilter] = useState('');
  const router = useRouter();

  const filtered = (wos ?? []).filter(
    (w) => filter === '' || w.status.includes(filter.toUpperCase()) || w.id.includes(filter),
  );

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <TextInput
        className="bg-white border border-gray-200 rounded-lg px-4 py-2 mb-4"
        placeholder="상태 또는 ID로 검색..."
        value={filter}
        onChangeText={setFilter}
      />
      {isLoading
        ? <ActivityIndicator className="mt-8" />
        : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <WorkOrderCard wo={item} onPress={() => router.push(`/(app)/work-orders/${item.id}`)} />
            )}
            ListEmptyComponent={<Text className="text-center text-gray-400 mt-8">작업지시 없음</Text>}
          />
        )
      }
    </View>
  );
}

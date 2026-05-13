import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useWorkOrders, useCompleteWorkOrder } from '@/hooks/useWorkOrders';

export default function WorkOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: wos } = useWorkOrders();
  const wo = (wos ?? []).find((w) => w.id === id);
  const { mutate: complete, isPending } = useCompleteWorkOrder();
  const [defectQty, setDefectQty] = useState('0');
  const router = useRouter();

  if (!wo) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>작업지시를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const handleComplete = () => {
    Alert.alert('작업 완료', `불량 수량: ${defectQty}개로 완료 처리합니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '완료',
        onPress: () => complete(
          { id: wo.id, defectQty: parseInt(defectQty, 10) || 0 },
          { onSuccess: () => router.back() },
        ),
      },
    ]);
  };

  const rows = [
    ['ID', wo.id],
    ['상태', wo.status],
    ['설비', wo.machineId],
    ['생산 계획', wo.producedQty + '개'],
    ['시작', new Date(wo.plannedStart).toLocaleString()],
    ['종료', new Date(wo.plannedEnd).toLocaleString()],
  ];

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-xl font-bold text-gray-800 mb-4">작업지시 상세</Text>
      <View className="bg-gray-50 rounded-lg p-4 mb-4">
        {rows.map(([k, v]) => (
          <View key={k} className="flex-row justify-between py-2 border-b border-gray-200">
            <Text className="text-gray-500">{k}</Text>
            <Text className="text-gray-800 font-medium">{v}</Text>
          </View>
        ))}
      </View>
      {wo.status === 'IN_PROGRESS' && (
        <View>
          <Text className="text-gray-700 font-medium mb-2">불량 수량 입력</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
            keyboardType="numeric"
            value={defectQty}
            onChangeText={setDefectQty}
          />
          <TouchableOpacity
            onPress={handleComplete}
            disabled={isPending}
            className="bg-green-600 rounded-lg py-4 items-center"
          >
            <Text className="text-white font-semibold text-base">작업 완료 처리</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

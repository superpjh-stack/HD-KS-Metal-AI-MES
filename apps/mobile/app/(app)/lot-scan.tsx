import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface LotEvent { id: string; eventType: string; description: string; createdAt: string; }
interface LotTrace { id: string; lotNumber: string; status: string; events: LotEvent[]; }

export default function LotScanScreen() {
  const [scanning, setScanning] = useState(false);
  const [lotId, setLotId] = useState('');
  const [searchId, setSearchId] = useState('');

  const { data: trace, isLoading } = useQuery({
    queryKey: ['lot-trace', searchId],
    queryFn: async () => {
      const { data } = await api.get<{ data: LotTrace }>(`/lots/${searchId}/trace`);
      return data.data;
    },
    enabled: !!searchId,
  });

  const requestCamera = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    if (status === 'granted') setScanning(true);
    else Alert.alert('카메라 권한 필요', '바코드 스캔을 위해 카메라 권한이 필요합니다.');
  };

  const handleScan = ({ data }: { data: string }) => {
    setScanning(false);
    setLotId(data);
    setSearchId(data);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      {scanning ? (
        <View className="h-64 rounded-xl overflow-hidden mb-4">
          <BarCodeScanner onBarCodeScanned={handleScan} className="flex-1" />
          <TouchableOpacity
            onPress={() => setScanning(false)}
            className="absolute bottom-4 self-center bg-black/60 px-6 py-2 rounded-full"
          >
            <Text className="text-white">취소</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="mb-4">
          <View className="flex-row gap-2 mb-3">
            <TextInput
              className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3"
              placeholder="LOT ID 입력"
              value={lotId}
              onChangeText={setLotId}
            />
            <TouchableOpacity
              onPress={() => setSearchId(lotId)}
              className="bg-blue-700 rounded-lg px-4 justify-center"
            >
              <Text className="text-white font-medium">조회</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={requestCamera} className="bg-gray-700 rounded-lg py-3 items-center">
            <Text className="text-white">바코드 스캔</Text>
          </TouchableOpacity>
        </View>
      )}
      {isLoading && <ActivityIndicator />}
      {trace && (
        <View className="bg-white rounded-lg p-4">
          <Text className="font-bold text-lg mb-1">{trace.lotNumber}</Text>
          <Text className="text-blue-600 mb-4">{trace.status}</Text>
          {trace.events.map((e) => (
            <View key={e.id} className="flex-row mb-3">
              <View className="items-center mr-3">
                <View className="w-3 h-3 rounded-full bg-blue-500 mt-1" />
                <View className="w-0.5 flex-1 bg-gray-200" />
              </View>
              <View className="flex-1">
                <Text className="font-medium text-gray-800">{e.eventType}</Text>
                <Text className="text-gray-500 text-sm">{e.description}</Text>
                <Text className="text-gray-400 text-xs">{new Date(e.createdAt).toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

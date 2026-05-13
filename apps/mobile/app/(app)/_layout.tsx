import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1d4ed8',
        headerStyle: { backgroundColor: '#1d4ed8' },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="work-orders/index"
        options={{ title: '작업지시', tabBarIcon: ({ color }) => <Ionicons name="clipboard-outline" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="lot-scan"
        options={{ title: 'LOT 조회', tabBarIcon: ({ color }) => <Ionicons name="barcode-outline" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="alarms"
        options={{ title: '알람', tabBarIcon: ({ color }) => <Ionicons name="notifications-outline" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="machines"
        options={{ title: '설비', tabBarIcon: ({ color }) => <Ionicons name="hardware-chip-outline" size={24} color={color} /> }}
      />
    </Tabs>
  );
}

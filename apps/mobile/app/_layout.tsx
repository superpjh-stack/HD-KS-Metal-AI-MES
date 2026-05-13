import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { storage } from '@/lib/storage';

const qc = new QueryClient();

function AuthGuard() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const token = storage.getString('accessToken');
    const inAuth = segments[0] === '(auth)';
    if (!token && !inAuth) router.replace('/(auth)/login');
    if (token && inAuth) router.replace('/(app)/work-orders');
  }, [segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={qc}>
      <AuthGuard />
    </QueryClientProvider>
  );
}

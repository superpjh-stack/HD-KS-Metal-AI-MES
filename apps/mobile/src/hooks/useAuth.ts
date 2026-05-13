import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { storage } from '../lib/storage';
import { useRouter } from 'expo-router';

interface LoginPayload { email: string; password: string; }
interface TokenResponse { accessToken: string; refreshToken: string; roles: string[]; userId: string; }

export function useLogin() {
  const router = useRouter();
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await api.post<{ data: TokenResponse }>('/auth/login', payload);
      return data.data;
    },
    onSuccess: (tokens) => {
      storage.set('accessToken', tokens.accessToken);
      storage.set('refreshToken', tokens.refreshToken);
      storage.set('userId', tokens.userId);
      router.replace('/(app)/work-orders');
    },
  });
}

export function useLogout() {
  const router = useRouter();
  return () => {
    storage.delete('accessToken');
    storage.delete('refreshToken');
    storage.delete('userId');
    router.replace('/(auth)/login');
  };
}

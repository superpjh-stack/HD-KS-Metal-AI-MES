import axios from 'axios';
import { storage } from './storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export const api = axios.create({ baseURL: `${BASE_URL}/api/v1` });

api.interceptors.request.use((config) => {
  const token = storage.getString('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = storage.getString('refreshToken');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken: refresh });
          storage.set('accessToken', data.data.accessToken);
          error.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api.request(error.config);
        } catch {
          storage.delete('accessToken');
          storage.delete('refreshToken');
        }
      }
    }
    return Promise.reject(error);
  },
);

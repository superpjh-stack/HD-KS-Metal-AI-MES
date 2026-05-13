import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({ id: 'ks-mes-storage' });

export function getCachedJson<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { data: T; cachedAt: number };
    if (Date.now() - parsed.cachedAt > 30 * 60 * 1000) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function setCachedJson<T>(key: string, data: T): void {
  storage.set(key, JSON.stringify({ data, cachedAt: Date.now() }));
}

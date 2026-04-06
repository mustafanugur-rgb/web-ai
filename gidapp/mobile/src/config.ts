import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? (Constants as unknown as { manifest?: { extra?: { apiUrl?: string } } }).manifest?.extra;

export const API_URL =
  (typeof extra?.apiUrl === 'string' && extra.apiUrl) ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:8000';

export const api = (path: string) => `${API_URL.replace(/\/$/, '')}/api${path.startsWith('/') ? path : `/${path}`}`;

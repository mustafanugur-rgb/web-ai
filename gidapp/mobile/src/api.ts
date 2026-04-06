import * as SecureStore from 'expo-secure-store';

import { api as apiUrl } from './config';

const TOKEN_KEY = 'gidapp_token';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function apiFetch<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers = new Headers(opts.headers);
  if (!headers.has('Content-Type') && opts.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const r = await fetch(apiUrl(path), { ...opts, headers });
  if (!r.ok) {
    let msg = r.statusText;
    try {
      const err = (await r.json()) as { detail?: string | unknown };
      if (typeof err.detail === 'string') msg = err.detail;
      else if (Array.isArray(err.detail)) msg = JSON.stringify(err.detail);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (r.status === 204) return undefined as T;
  return r.json() as Promise<T>;
}

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Session } from './types';

const SESSION_KEY = 'bambu-session-v1';

function webStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export async function readSession(): Promise<Session | null> {
  try {
    const raw =
      Platform.OS === 'web'
        ? webStorage()?.getItem(SESSION_KEY)
        : await SecureStore.getItemAsync(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export async function writeSession(session: Session): Promise<void> {
  const raw = JSON.stringify(session);
  if (Platform.OS === 'web') {
    webStorage()?.setItem(SESSION_KEY, raw);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, raw);
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage()?.removeItem(SESSION_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

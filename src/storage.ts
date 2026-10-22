import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Session } from './types';

const SESSION_KEY = 'bambu-session-v1';
const TARE_PREFIX = 'spool-tare-v1-';
const FORCE_RFID_KEY = 'force-rfid-edit-v1';
const WEIGHT_MEMORY_PREFIX = 'spool-weight-memory-v1-';

export type WeightMemory = {
  tarePresetId: string;
  extraPresetId: string;
};

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

export async function readTare(spoolId: number): Promise<number | null> {
  const key = `${TARE_PREFIX}${spoolId}`;
  try {
    const raw =
      Platform.OS === 'web'
        ? webStorage()?.getItem(key)
        : await SecureStore.getItemAsync(key);
    const value = raw ? Number(raw) : Number.NaN;
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export async function writeTare(spoolId: number, tare: number): Promise<void> {
  const key = `${TARE_PREFIX}${spoolId}`;
  const value = String(tare);
  if (Platform.OS === 'web') {
    webStorage()?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function readForceRfidEdit(): Promise<boolean> {
  try {
    const raw =
      Platform.OS === 'web'
        ? webStorage()?.getItem(FORCE_RFID_KEY)
        : await SecureStore.getItemAsync(FORCE_RFID_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function writeForceRfidEdit(value: boolean): Promise<void> {
  const raw = value ? 'true' : 'false';
  if (Platform.OS === 'web') {
    webStorage()?.setItem(FORCE_RFID_KEY, raw);
    return;
  }
  await SecureStore.setItemAsync(FORCE_RFID_KEY, raw);
}

export async function readWeightMemory(spoolId: number): Promise<WeightMemory | null> {
  const key = `${WEIGHT_MEMORY_PREFIX}${spoolId}`;
  try {
    const raw =
      Platform.OS === 'web'
        ? webStorage()?.getItem(key)
        : await SecureStore.getItemAsync(key);
    return raw ? (JSON.parse(raw) as WeightMemory) : null;
  } catch {
    return null;
  }
}

export async function writeWeightMemory(
  spoolId: number,
  memory: WeightMemory,
): Promise<void> {
  const key = `${WEIGHT_MEMORY_PREFIX}${spoolId}`;
  const value = JSON.stringify(memory);
  if (Platform.OS === 'web') {
    webStorage()?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

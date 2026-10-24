import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Small key-value helpers. Every call is wrapped in try/catch: storage can be unavailable
 * (private browsing on the web preview, a full disk) and the app must keep working without it.
 */
export const kv = {
  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
  async getJson<T>(key: string, fallback: T): Promise<T> {
    const raw = await kv.get(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  async setJson(key: string, value: unknown): Promise<void> {
    await kv.set(key, JSON.stringify(value));
  },
};

const memory = new Map<string, string>();

function webSession(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/**
 * Secrets (the refresh token). Native: Keychain / Android Keystore via expo-secure-store.
 * Web preview: sessionStorage (per tab) with an in-memory fallback — never localStorage.
 */
export const secure = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return webSession()?.getItem(key) ?? memory.get(key) ?? null;
      } catch {
        return memory.get(key) ?? null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  async set(key: string, value: string | null): Promise<void> {
    if (value === null) memory.delete(key);
    else memory.set(key, value);
    if (Platform.OS === 'web') {
      try {
        const s = webSession();
        if (value === null) s?.removeItem(key);
        else s?.setItem(key, value);
      } catch {
        /* memory only */
      }
      return;
    }
    try {
      if (value === null) await SecureStore.deleteItemAsync(key);
      else await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
    } catch {
      /* memory only for this run */
    }
  },
};

/** App-specific storage keys (shared keys live in STORAGE_KEYS of @vero/config). */
export const MOBILE_KEYS = {
  recentlyViewed: 'ot.recentlyViewed',
  languageChosen: 'ot.languageChosen',
  pushToken: 'ot.pushToken',
  pushPrompted: 'ot.pushPrompted',
} as const;

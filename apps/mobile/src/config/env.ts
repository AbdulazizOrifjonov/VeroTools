import Constants from 'expo-constants';
import { Platform } from 'react-native';

interface Extra {
  apiUrl?: string;
  webUrl?: string;
  eas?: { projectId?: string };
}

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function resolveApiUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:4000/api';
    }
  }
  return extra.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';
}

/** Absolute API base, e.g. "http://192.168.1.20:4000/api" (see app.config.ts / EXPO_PUBLIC_API_URL). */
export const API_URL = trimSlash(resolveApiUrl());

/** API origin without "/api" — Socket.IO endpoint and host of uploaded images. */
export const API_ORIGIN = API_URL.replace(/\/api$/, '');

/** Storefront origin (share links, universal links). */
export const WEB_URL = trimSlash(extra.webUrl ?? process.env.EXPO_PUBLIC_WEB_URL ?? 'https://verotools.uz');

/** EAS project id; Expo push tokens cannot be issued without it. */
export const EAS_PROJECT_ID: string | undefined =
  extra.eas?.projectId ??
  (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

export const IS_WEB = Platform.OS === 'web';
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

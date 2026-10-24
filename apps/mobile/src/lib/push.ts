import * as Device from 'expo-device';
const Notifications: any = {};
import { Platform } from 'react-native';
import { EAS_PROJECT_ID } from '../config/env';
import { api } from './api';
import { i18n } from './i18n';
import { kv, MOBILE_KEYS } from './storage';

/** Why push notifications cannot be used on this build / device (shown in Settings). */
export type PushUnavailableReason = 'web' | 'simulator' | 'no-project';

export function pushUnavailableReason(): PushUnavailableReason | null {
  if (Platform.OS === 'web') return 'web';
  if (!Device.isDevice) return 'simulator';
  if (!EAS_PROJECT_ID) return 'no-project';
  return null;
}

let handlerSet = false;

/** Foreground behaviour: the in-app banner (realtime) is shown instead of a system banner. */
export function configureNotificationHandler(): void {
  if (handlerSet || Platform.OS === 'web') return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: i18n.t('mobile:push.channelName'),
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#FD8902',
    vibrationPattern: [0, 200, 120, 200],
  });
}

export type PushPermission = 'granted' | 'denied' | 'undetermined';

export async function getPushPermission(): Promise<PushPermission> {
  if (Platform.OS === 'web') return 'denied';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'undetermined';
  }
}

export type PushResult =
  { ok: true; token: string } | { ok: false; reason: PushUnavailableReason | 'denied' | 'error' };

/**
 * Requests permission (when `prompt`), obtains the Expo push token and registers it with the API
 * (POST /users/me/push-tokens). Safe to call repeatedly — the API de-duplicates tokens.
 */
export async function registerPush({ prompt }: { prompt: boolean }): Promise<PushResult> {
  const unavailable = pushUnavailableReason();
  if (unavailable) return { ok: false, reason: unavailable };
  try {
    await ensureAndroidChannel();
    let permission = await getPushPermission();
    if (permission !== 'granted' && prompt) {
      const res = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      permission = res.status === 'granted' ? 'granted' : 'denied';
    }
    if (permission !== 'granted') return { ok: false, reason: 'denied' };
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
    await api.account.registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
    await kv.set(MOBILE_KEYS.pushToken, token);
    return { ok: true, token };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** Removes this device's token from the account (called before signing out). */
export async function unregisterPush(): Promise<void> {
  const token = await kv.get(MOBILE_KEYS.pushToken);
  if (!token) return;
  try {
    await api.account.removePushToken(token);
  } catch {
    /* the API also drops tokens reported invalid by Expo */
  }
  await kv.remove(MOBILE_KEYS.pushToken);
}

export async function hasRegisteredPushToken(): Promise<boolean> {
  return !!(await kv.get(MOBILE_KEYS.pushToken));
}

export interface PushData {
  type?: string;
  orderId?: string;
  orderNumber?: string;
  productId?: string;
  productSlug?: string;
  url?: string;
  notificationId?: string;
}

/** Storefront path a notification points to. */
export function notificationHref(data: PushData | undefined | null): string {
  if (!data) return '/account/notifications';
  if (data.url) return data.url;
  if (data.orderId) return `/account/orders/${data.orderId}`;
  if (data.productSlug) return `/product/${data.productSlug}`;
  return '/account/notifications';
}

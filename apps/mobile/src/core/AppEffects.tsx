import NetInfo from '@react-native-community/netinfo';
import { STORAGE_KEYS, type Language } from '@vero/config';
import {
  qk,
  resetSessionQueries,
  useApi,
  useMe,
  useRealtimeSync,
  useSession,
  useUpdatePreferences,
} from '@vero/api-client';
import { isLanguage } from '@vero/i18n';
import type { NotificationDTO } from '@vero/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ORIGIN } from '../config/env';
import { applyOverrides } from '../lib/i18n';
import { openHref } from '../lib/links';
import { usePrefs } from '../lib/prefs';
import { notificationHref } from '../lib/push';
import { isSuppressed, seenRecently } from '../lib/realtime-toasts';
import { secure } from '../lib/storage';
import { toast } from '../lib/toast';
import { flushNavigationQueue } from '../navigation/ref';

const ORDER_TYPES: Record<string, string> = {
  ORDER_CREATED: 'PENDING',
  ORDER_CONFIRMED: 'CONFIRMED',
  ORDER_PROCESSING: 'PROCESSING',
  ORDER_PACKED: 'PACKED',
  ORDER_SHIPPED: 'SHIPPED',
  ORDER_DELIVERED: 'DELIVERED',
  ORDER_CANCELLED: 'CANCELLED',
  ORDER_RETURNED: 'RETURNED',
};

/** Realtime banners (order status, new notifications) — the same events the website receives. */
function RealtimeBridge() {
  const { t } = useTranslation();
  useRealtimeSync({
    url: API_ORIGIN,
    onOrderUpdated: (e) => {
      const key = `order:${e.orderId}:${e.status}`;
      if (isSuppressed(key) || seenRecently(key)) return;
      toast.info(
        t('shop:orders.statusChanged', {
          number: e.number,
          status: t(`common:orderStatus.${e.status}`, { defaultValue: e.status }),
        }),
        {
          action: {
            label: t('common:actions.view'),
            onPress: () => openHref(`/account/orders/${e.orderId}`),
          },
        },
      );
    },
    onNotification: (n: NotificationDTO) => {
      const status = ORDER_TYPES[n.type];
      if (status && n.data?.orderId) {
        const key = `order:${n.data.orderId}:${status}`;
        if (isSuppressed(key) || isSuppressed(`type:${n.type}`) || seenRecently(key)) return;
      } else if (isSuppressed(`type:${n.type}`) || seenRecently(`n:${n.id}`)) return;
      toast.info(n.title, {
        message: n.body,
        action: { label: t('common:actions.view'), onPress: () => openHref(notificationHref(n.data)) },
      });
    },
  });
  return null;
}

/** Admin-edited texts (GET /api/translations?lng=) for the current language. */
function TranslationOverrides() {
  const api = useApi();
  const language = usePrefs((s) => s.language);
  const overrides = useQuery({
    queryKey: qk.translations(language),
    queryFn: () => api.catalog.translations(language),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  useEffect(() => {
    if (overrides.data)
      applyOverrides(language, overrides.data.resources ?? {}, overrides.data.updatedAt ?? '');
  }, [overrides.data, language]);
  return null;
}

/**
 * Account preferences are shared with the website: language and theme from the profile are applied on
 * sign-in and whenever they change on another device (realtime `profile` sync refetches /auth/me).
 */
function ProfilePreferencesSync() {
  const { isAuthenticated } = useSession();
  const me = useMe();
  const updatePreferences = useUpdatePreferences();
  const setLanguage = usePrefs((s) => s.setLanguage);
  const setTheme = usePrefs((s) => s.setTheme);
  const applied = useRef<{ userId: string; key: string } | null>(null);
  const prefs = me.data?.preferences;
  const userId = me.data?.id;
  useEffect(() => {
    if (!isAuthenticated || !prefs || !userId) {
      if (!isAuthenticated) applied.current = null;
      return;
    }
    const key = `${prefs.language}:${prefs.theme}`;
    if (applied.current?.userId === userId && applied.current.key === key) return;
    const firstSync = applied.current?.userId !== userId;
    applied.current = { userId, key };
    const state = usePrefs.getState();
    const patch: { language?: Language; theme?: typeof prefs.theme } = {};
    // first sync after sign-in: an explicit choice made on this device wins and is saved to the account;
    // later changes (from the website / another phone) are applied here
    if (firstSync && state.languageChosen && state.language !== prefs.language)
      patch.language = state.language;
    else if (isLanguage(prefs.language) && prefs.language !== state.language)
      setLanguage(prefs.language as Language, { explicit: false });
    if (firstSync && state.themeChosen && state.theme !== prefs.theme) patch.theme = state.theme;
    else if (prefs.theme && prefs.theme !== state.theme) setTheme(prefs.theme, { explicit: false });
    if (patch.language || patch.theme) updatePreferences.mutate(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, prefs, userId, setLanguage, setTheme]);
  return null;
}

/** Registers the push token after sign-in when the customer allowed notifications before (no prompt here). */
function PushRegistration() {
  return null;
}

/**
 * If the app started offline the refresh token could not be exchanged — the customer is shown as a guest
 * until the connection is back; then the session is restored silently.
 */
function SessionRestore() {
  const api = useApi();
  const qc = useQueryClient();
  const { status } = useSession();
  useEffect(() => {
    if (status !== 'guest') return;
    let cancelled = false;
    const unsub = NetInfo.addEventListener(async (state) => {
      if (!state.isConnected || cancelled) return;
      const stored = await secure.get(STORAGE_KEYS.refreshToken);
      if (!stored || cancelled) return;
      try {
        const ok = await api.client.refresh();
        if (ok && !cancelled) await resetSessionQueries(qc);
      } catch {
        /* still offline */
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [status, api, qc]);
  return null;
}

export function AppEffects() {
  useEffect(() => {
    flushNavigationQueue();
  }, []);
  return (
    <>
      <RealtimeBridge />
      <TranslationOverrides />
      <ProfilePreferencesSync />
      <PushRegistration />
      <SessionRestore />
    </>
  );
}

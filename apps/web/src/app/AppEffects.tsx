import { useApi, useRealtimeSync, type OrderUpdatedEvent } from '@vero/api-client';
import type { Language } from '@vero/config';
import type { NotificationDTO } from '@vero/types';
import { toast } from '@vero/ui';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { applyOverrides } from '../lib/i18n';
import { localizeHref } from '../lib/paths';
import { isSuppressed, seenRecently as seen } from '../lib/realtime-toasts';

/** Admin-edited texts for the current language (GET /api/translations), applied on top of the bundles. */
function useTranslationOverrides(lang: Language) {
  const api = useApi();
  const { data } = useQuery({
    queryKey: ['translations', lang],
    queryFn: () => api.catalog.translations(lang),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  useEffect(() => {
    if (data?.resources) applyOverrides(lang, data.resources, data.updatedAt ?? '');
  }, [data, lang]);
}

/**
 * App-wide side effects that need the API context: realtime sync with toasts for order updates /
 * notifications, and translation overrides.
 */
export function AppEffects({ lang }: { lang: Language }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useTranslationOverrides(lang);

  const onOrderUpdated = useCallback(
    (e: OrderUpdatedEvent) => {
      if (seen(`order:${e.orderId}:${e.status}`)) return;
      toast.info(t('realtime.orderStatus', { number: e.number, status: t(`common:orderStatus.${e.status}`, { defaultValue: e.status }) }), {
        action: {
          label: t('common:actions.view'),
          onClick: () => void navigate(localizeHref(`/account/orders/${e.orderId}`, lang)),
        },
      });
    },
    [t, navigate, lang],
  );

  const onNotification = useCallback(
    (n: NotificationDTO) => {
      // order status changes arrive twice (order event + notification) — show one toast
      const orderKey = n.data?.orderId && n.type.startsWith('ORDER_') ? `order:${n.data.orderId}:${n.type.replace('ORDER_', '')}` : null;
      if (orderKey && seen(orderKey)) return;
      // the customer placed the order in this tab — the success page is the feedback
      if (n.type === 'ORDER_CREATED' && isSuppressed('type:ORDER_CREATED')) return;
      if (seen(`n:${n.id}`)) return;
      const url = n.data?.url;
      toast(n.title, {
        description: n.body,
        action: url
          ? {
              label: t('common:actions.view'),
              onClick: () => {
                if (/^https?:\/\//.test(url)) window.open(url, '_blank', 'noopener,noreferrer');
                else void navigate(localizeHref(url, lang));
              },
            }
          : undefined,
      });
    },
    [t, navigate, lang],
  );

  useRealtimeSync({ url: '', onOrderUpdated, onNotification });
  return null;
}

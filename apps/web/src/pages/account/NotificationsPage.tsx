import { useDeleteNotification, useEngagement, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import type { NotificationDTO, NotificationType } from '@vero/types';
import { Button, cn, EmptyState, PaginationBar, Skeleton, toast } from '@vero/ui';
import {
  BadgePercentIcon,
  BellIcon,
  CheckCheckIcon,
  CheckIcon,
  CreditCardIcon,
  MessageCircleQuestionIcon,
  MessageSquareTextIcon,
  PackageCheckIcon,
  PackageIcon,
  TrendingDownIcon,
  Trash2Icon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { ErrorState } from '../../components/common/states';
import { AccountHeading } from '../../features/account/AccountSection';
import { useDocumentMeta } from '../../hooks/use-document-meta';
import { useFormat } from '../../hooks/use-format';
import { LocaleLink } from '../../hooks/use-lang';
import { errorMessage } from '../../lib/i18n';
import { assetUrl } from '../../lib/images';
import { isInternalHref } from '../../lib/paths';

const PAGE_SIZE = 20;

function iconOf(type: NotificationType): LucideIcon {
  if (type.startsWith('ORDER_')) return PackageIcon;
  if (type.startsWith('PAYMENT_')) return CreditCardIcon;
  if (type === 'PROMOTION' || type === 'DISCOUNT') return BadgePercentIcon;
  if (type === 'PRICE_DROP') return TrendingDownIcon;
  if (type === 'BACK_IN_STOCK') return PackageCheckIcon;
  if (type === 'REVIEW_APPROVED' || type === 'REVIEW_REPLY') return MessageSquareTextIcon;
  if (type === 'QUESTION_ANSWERED') return MessageCircleQuestionIcon;
  return BellIcon;
}

/** Internal link of a notification (API paths are unlocalised; LocaleLink adds the language prefix). */
function targetOf(n: NotificationDTO): string | null {
  const url = n.data?.url;
  if (url && isInternalHref(url)) return url;
  if (n.data?.orderId) return STORE_ROUTES.order(n.data.orderId);
  if (n.data?.productSlug) return STORE_ROUTES.product(n.data.productSlug);
  return null;
}

function NotificationItem({ n }: { n: NotificationDTO }) {
  const { t } = useTranslation();
  const f = useFormat();
  const markRead = useMarkNotificationRead();
  const remove = useDeleteNotification();
  const unread = !n.readAt;
  const Icon = iconOf(n.type);
  const target = targetOf(n);
  const read = () => {
    if (unread && !markRead.isPending) markRead.mutate(n.id);
  };

  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="font-semibold">{t(`common:notificationType.${n.type}`)}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={n.createdAt} title={f.date(n.createdAt, 'datetime')}>
            {f.relative(n.createdAt)}
          </time>
        </span>
        <span className={cn('text-sm leading-snug', unread ? 'font-bold' : 'font-semibold')}>{n.title}</span>
        {n.body ? <span className="text-sm leading-relaxed text-muted-foreground">{n.body}</span> : null}
      </span>
      {n.image ? (
        <span className="img-well size-14 shrink-0 overflow-hidden rounded-lg bg-well">
          <img src={assetUrl(n.image)} alt="" loading="lazy" className="size-full object-contain" />
        </span>
      ) : null}
    </>
  );

  return (
    <li className={cn('relative flex gap-3 p-4 transition-colors duration-150 sm:gap-4 sm:p-5', unread && 'bg-brand-soft/35 dark:bg-brand-soft/20')}>
      <span className={cn('relative mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full', unread ? 'bg-primary text-primary-foreground dark:bg-brand dark:text-graphite' : 'bg-muted text-muted-foreground')} aria-hidden="true">
        <Icon className="size-[18px]" />
      </span>
      {target ? (
        <LocaleLink to={target} onClick={read} className="flex min-w-0 flex-1 gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          {body}
          {unread ? <span className="sr-only">{t('shop:notifications.unread')}</span> : null}
        </LocaleLink>
      ) : (
        <div className="flex min-w-0 flex-1 gap-3">
          {body}
          {unread ? <span className="sr-only">{t('shop:notifications.unread')}</span> : null}
        </div>
      )}
      <div className="flex shrink-0 flex-col gap-1">
        {unread ? (
          <Button variant="ghost" size="icon-sm" onClick={read} loading={markRead.isPending} aria-label={`${t('notifications.markRead')}: ${n.title}`} title={t('notifications.markRead')}>
            <CheckIcon aria-hidden="true" />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => remove.mutate(n.id, { onError: (e) => toast.error(errorMessage(t, e)) })}
          loading={remove.isPending}
          aria-label={`${t('shop:notifications.delete')}: ${n.title}`}
          title={t('shop:notifications.delete')}
          className="text-muted-foreground hover:text-danger"
        >
          <Trash2Icon aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const unreadOnly = searchParams.get('unread') === '1';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const list = useNotifications({ page, limit: PAGE_SIZE, unread: unreadOnly || undefined });
  const engagement = useEngagement();
  const markAll = useMarkAllNotificationsRead();
  const unreadCount = engagement.data?.unreadNotifications ?? 0;
  useDocumentMeta({ title: t('shop:notifications.title'), noindex: true });

  const setQuery = (next: { unread?: boolean; page?: number }) => {
    const sp = new URLSearchParams();
    if (next.unread) sp.set('unread', '1');
    if (next.page && next.page > 1) sp.set('page', String(next.page));
    setSearchParams(sp);
  };

  const filters = [
    { value: false, label: t('shop:orders.filterAll') },
    { value: true, label: unreadCount ? `${t('shop:notifications.unread')} · ${unreadCount}` : t('shop:notifications.unread') },
  ];

  return (
    <div className="flex flex-col gap-5">
      <AccountHeading
        title={t('shop:notifications.title')}
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              onClick={() => markAll.mutate(undefined, { onError: (e) => toast.error(errorMessage(t, e)) })}
              loading={markAll.isPending}
              leftIcon={<CheckCheckIcon aria-hidden="true" />}
            >
              {t('shop:notifications.markAllRead')}
            </Button>
          ) : null
        }
      />
      <div className="flex gap-2" role="group" aria-label={t('common:actions.filter')}>
        {filters.map((fl) => (
          <button
            key={String(fl.value)}
            type="button"
            aria-pressed={fl.value === unreadOnly}
            onClick={() => setQuery({ unread: fl.value })}
            className={cn(
              'h-9 rounded-full border px-4 text-sm font-semibold whitespace-nowrap tabular-nums transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              fl.value === unreadOnly ? 'border-primary bg-brand-soft text-brand-soft-foreground' : 'border-border bg-card hover:bg-accent',
            )}
          >
            {fl.label}
          </button>
        ))}
      </div>
      {list.isPending ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : !list.data.items.length ? (
        <EmptyState bordered icon={<BellIcon />} title={unreadOnly ? t('common:status.empty') : t('shop:notifications.empty')} description={unreadOnly ? undefined : t('shop:notifications.emptyHint')} />
      ) : (
        <>
          <ul className={cn('divide-y divide-border overflow-hidden rounded-xl border border-border bg-card transition-opacity', list.isPlaceholderData && 'opacity-60')}>
            {list.data.items.map((n) => (
              <NotificationItem key={n.id} n={n} />
            ))}
          </ul>
          <PaginationBar
            page={page}
            pages={list.data.meta.pages}
            onPageChange={(p) => {
              setQuery({ unread: unreadOnly, page: p });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            labels={{ previous: t('common:a11y.previous'), next: t('common:a11y.next'), page: (n) => t('common:a11y.page', { page: n }), morePages: t('common:a11y.morePages') }}
          />
        </>
      )}
    </div>
  );
}

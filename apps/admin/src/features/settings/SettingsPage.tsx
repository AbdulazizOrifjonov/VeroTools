import { useAdminQuery, useSession } from '@vero/api-client';
import { cn, Skeleton } from '@vero/ui';
import { BellIcon, BoxesIcon, CalendarClockIcon, CreditCardIcon, HouseIcon, SearchIcon, Share2Icon, StoreIcon, type LucideIcon } from 'lucide-react';
import { useCallback, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { ErrorState } from '../../components/common/states';
import { useSearchParamState } from '../../lib/url-state';
import { HomeSection, InstallmentSection, NotificationsSection, OperationsSection, PaymentsSection, SeoSection, SocialSection, StoreSection } from './sections';
import { SECTION_KEYS, type SectionKey } from './settings-model';
import type { AdminSetting } from '@vero/types';

const SECTION_UI: Record<SectionKey, { icon: LucideIcon; Component: ComponentType<{ settings: AdminSetting[]; onDirtyChange: (dirty: boolean) => void }> }> = {
  store: { icon: StoreIcon, Component: StoreSection },
  social: { icon: Share2Icon, Component: SocialSection },
  payments: { icon: CreditCardIcon, Component: PaymentsSection },
  installment: { icon: CalendarClockIcon, Component: InstallmentSection },
  operations: { icon: BoxesIcon, Component: OperationsSection },
  home: { icon: HouseIcon, Component: HomeSection },
  seo: { icon: SearchIcon, Component: SeoSection },
  notifications: { icon: BellIcon, Component: NotificationsSection },
};

export default function SettingsPage() {
  const { t } = useTranslation();
  const { can } = useSession();
  usePageMeta(t('settings.title'));
  const query = useAdminQuery(['settings'], (api) => api.admin.settings.get());
  const [param, setParam] = useSearchParamState('section', 'store');
  const section = (SECTION_KEYS as string[]).includes(param) ? (param as SectionKey) : 'store';
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<SectionKey | null>(null);
  const onDirtyChange = useCallback((d: boolean) => setDirty(d), []);

  const go = (next: SectionKey) => {
    if (next === section) return;
    if (dirty) setPending(next);
    else setParam(next === 'store' ? null : next);
  };

  const { Component } = SECTION_UI[section];

  return (
    <Page>
      <PageHeader title={t('settings.title')} description={t('settings.description')} />
      {!can('settings.update') ? <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-[13px] text-muted-foreground">{t('settings.readOnly')}</p> : null}
      {query.isError && !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] xl:gap-6">
          <nav aria-label={t('settings.sections')} className="-mx-4 overflow-x-auto px-4 no-scrollbar lg:sticky lg:top-20 lg:mx-0 lg:overflow-visible lg:px-0">
            <ul className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col">
              {SECTION_KEYS.map((key) => {
                const Icon = SECTION_UI[key].icon;
                const active = key === section;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => go(key)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-start text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                        active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                      )}
                    >
                      <Icon className={cn('size-4 shrink-0', active ? 'text-brand' : '')} aria-hidden="true" />
                      {t(`settings.groups.${key}`)}
                      {active && dirty ? <span className="ms-auto size-1.5 rounded-full bg-warning" aria-label={t('form.dirty')} /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          {query.data ? (
            <Component key={section} settings={query.data} onDirtyChange={onDirtyChange} />
          ) : (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-96 rounded-xl" />
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        tone="danger"
        title={t('form.unsavedTitle')}
        description={t('form.unsavedText')}
        confirmLabel={t('form.leave')}
        onConfirm={() => {
          if (pending) setParam(pending === 'store' ? null : pending);
          setDirty(false);
          setPending(null);
        }}
      />
    </Page>
  );
}

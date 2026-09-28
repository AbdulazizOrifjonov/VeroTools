import { useCategories } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { Skeleton } from '@vero/ui';
import { ArrowRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Crumbs } from '../components/common/Crumbs';
import { DynamicIcon } from '../components/common/DynamicIcon';
import { PageTitle } from '../components/common/Section';
import { SmartImage } from '../components/common/SmartImage';
import { ErrorState } from '../components/common/states';
import { useDocumentMeta } from '../hooks/use-document-meta';
import { LocaleLink } from '../hooks/use-lang';

const CHILD_LIMIT = 6;

/** All top-level categories with their subcategories. */
export default function CatalogPage() {
  const { t } = useTranslation();
  const categories = useCategories();
  useDocumentMeta({ title: t('shop:catalog.title'), description: t('catalogPage.description') });
  const total = categories.data?.reduce((s, c) => s + c.productCount, 0);

  return (
    <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
      <Crumbs items={[{ label: t('common:nav.catalog') }]} />
      <PageTitle count={total !== undefined ? t('shop:catalog.found', { count: total }) : undefined}>{t('shop:catalog.title')}</PageTitle>
      {categories.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-lg" />
          ))}
        </div>
      ) : categories.isError ? (
        <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {categories.data.map((c) => (
            <li key={c.id} className="flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20">
              <LocaleLink to={STORE_ROUTES.category(c.slug)} className="group flex items-center gap-4 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface">
                  {c.image ? (
                    <SmartImage image={c.image} prefer="thumb" sizes="80px" className="size-full object-contain p-1.5 transition-transform duration-200 group-hover:scale-105" alt="" />
                  ) : (
                    <DynamicIcon name={c.icon} className="size-8 text-muted-foreground" />
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <h2 className="text-base leading-snug font-bold tracking-tight group-hover:text-primary dark:group-hover:text-brand">{c.name}</h2>
                  <span className="text-xs text-muted-foreground tabular-nums">{t('shop:catalog.found', { count: c.productCount })}</span>
                </span>
              </LocaleLink>
              {c.children.length ? (
                <ul className="mt-4 flex flex-col border-t border-border pt-3">
                  {c.children.slice(0, CHILD_LIMIT).map((child) => (
                    <li key={child.id}>
                      <LocaleLink
                        to={STORE_ROUTES.category(child.slug)}
                        className="flex min-h-9 items-center justify-between gap-3 rounded-sm text-sm text-foreground/85 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring dark:hover:text-brand"
                      >
                        <span className="min-w-0 truncate">{child.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{child.productCount}</span>
                      </LocaleLink>
                    </li>
                  ))}
                  {c.children.length > CHILD_LIMIT ? (
                    <li>
                      <LocaleLink to={STORE_ROUTES.category(c.slug)} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-primary hover:underline dark:text-brand">
                        {t('shop:catalog.more', { count: c.children.length - CHILD_LIMIT })}
                        <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                      </LocaleLink>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

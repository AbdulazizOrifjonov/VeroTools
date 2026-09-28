import { useBrands } from '@vero/api-client';
import { cn, EmptyState, Input, Skeleton } from '@vero/ui';
import { SearchIcon, TagsIcon } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crumbs } from '../components/common/Crumbs';
import { PageTitle } from '../components/common/Section';
import { ErrorState } from '../components/common/states';
import { BrandTile } from '../components/marketing/Tiles';
import { useDocumentMeta } from '../hooks/use-document-meta';

const firstLetter = (name: string) => {
  const c = name.trim().charAt(0).toLocaleUpperCase();
  return /[0-9]/.test(c) ? '0–9' : c;
};

export default function BrandsPage() {
  const { t } = useTranslation();
  const brands = useBrands({ limit: 100 });
  const [query, setQuery] = useState('');
  const [letter, setLetter] = useState<string | null>(null);
  const searchId = useId();
  useDocumentMeta({ title: t('shop:brands.title'), description: t('brands.description') });

  const all = useMemo(() => [...(brands.data?.items ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [brands.data]);
  const letters = useMemo(() => [...new Set(all.map((b) => firstLetter(b.name)))], [all]);
  const q = query.trim().toLocaleLowerCase();
  const visible = all.filter((b) => (!letter || firstLetter(b.name) === letter) && (!q || b.name.toLocaleLowerCase().includes(q)));

  return (
    <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
      <Crumbs items={[{ label: t('shop:brands.title') }]} />
      <div className="flex flex-col gap-2">
        <PageTitle count={brands.data ? brands.data.meta.total : undefined}>{t('shop:brands.title')}</PageTitle>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('brands.description')}</p>
      </div>

      {brands.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-busy="true">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : brands.isError ? (
        <ErrorState error={brands.error} onRetry={() => void brands.refetch()} />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <label htmlFor={searchId} className="sr-only">
                {t('common:actions.search')}
              </label>
              <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id={searchId} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('brands.searchPlaceholder')} className="ps-9" />
            </div>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label={t('brands.alphabet')}>
              <div className="flex w-max gap-1">
                {[null, ...letters].map((l) => (
                  <button
                    key={l ?? 'all'}
                    type="button"
                    aria-pressed={letter === l}
                    onClick={() => setLetter(l)}
                    className={cn(
                      'h-9 min-w-9 rounded-md px-2.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-ring',
                      letter === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {l ?? t('common:labels.all')}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {visible.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {visible.map((b) => (
                <li key={b.id}>
                  <BrandTile brand={b} className="h-full" />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState bordered icon={<TagsIcon />} title={t('common:status.noResults')} />
          )}
        </>
      )}
    </div>
  );
}

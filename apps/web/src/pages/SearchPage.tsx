import { usePopularSearches, useProducts } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { EmptyState } from '@vero/ui';
import { SearchXIcon, TrendingUpIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Crumbs } from '../components/common/Crumbs';
import { PageTitle, Section } from '../components/common/Section';
import { ProductRail } from '../components/product/ProductRail';
import { ProductListing } from '../features/catalog/ProductListing';
import { useDocumentMeta } from '../hooks/use-document-meta';
import { LocaleLink } from '../hooks/use-lang';
import { recentSearches } from '../lib/recent';
import { withQuery } from '../lib/paths';

function NoResults({ query }: { query: string }) {
  const { t } = useTranslation();
  const popular = usePopularSearches();
  const suggestions = useProducts({ sort: 'popular', limit: 10 });
  return (
    <div className="flex flex-col gap-4">
      <EmptyState
        bordered
        icon={<SearchXIcon />}
        title={t('shop:search.noResults', { query })}
        description={t('shop:search.noResultsHint')}
      >
        {popular.data?.length ? (
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('shop:search.popular')}</span>
            <ul className="flex max-w-lg flex-wrap justify-center gap-2">
              {popular.data.slice(0, 10).map((p) => (
                <li key={p.query}>
                  <LocaleLink
                    to={withQuery(STORE_ROUTES.search, { q: p.query })}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-3.5 text-sm font-medium hover:border-primary/40 hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <TrendingUpIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    {p.query}
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </EmptyState>
      {suggestions.data?.items.length ? (
        <Section title={t('shop:search.youMayLike')}>
          <ProductRail products={suggestions.data.items} label={t('shop:search.youMayLike')} />
        </Section>
      ) : null}
    </div>
  );
}

/** /search?q= — full-text results with the catalogue filters; without q it lists all products. */
export default function SearchPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim();
  const title = q ? t('shop:search.resultsFor', { query: q }) : t('shop:catalog.allProducts');
  useDocumentMeta({ title, noindex: true });
  const fixed = useMemo(() => ({}), []);

  useEffect(() => {
    if (q) recentSearches.push(q);
  }, [q]);

  return (
    <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
      <Crumbs items={[{ label: q ? t('common:nav.search') : t('shop:catalog.allProducts') }]} />
      <PageTitle>{title}</PageTitle>
      <ProductListing key={q} fixed={fixed} showCategoryFacet emptyState={q ? <NoResults query={q} /> : undefined} />
    </div>
  );
}

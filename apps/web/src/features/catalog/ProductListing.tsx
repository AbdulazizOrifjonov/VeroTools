import { useFacets, useProducts } from '@vero/api-client';
import { SORT_OPTIONS, type ProductListParams, type SortOption } from '@vero/types';
import {
  Button,
  cn,
  EmptyState,
  NativeSelect,
  NativeSelectOption,
  PaginationBar,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Spinner,
  ToggleGroup,
  ToggleGroupItem,
} from '@vero/ui';
import { LayoutGridIcon, ListIcon, PackageSearchIcon, SlidersHorizontalIcon } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '../../components/common/states';
import { ProductCard, ProductCardSkeleton, ProductGrid } from '../../components/product/ProductCard';
import { readString, WEB_KEYS, writeString } from '../../lib/storage';
import { useSearchParams } from 'react-router';
import { ActiveFilters } from './ActiveFilters';
import { FiltersPanel } from './FiltersPanel';
import { cleanParams, countFilters, useListingParams, withoutFilters } from './listing-params';

type View = 'grid' | 'list';

/** Grid / list: `?view=list` in the URL (shareable); without it the visitor's last choice is used. */
function useListingView(): [View, (v: View) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromUrl = searchParams.get('view');
  const view: View = fromUrl === 'list' || fromUrl === 'grid' ? fromUrl : readString(WEB_KEYS.listingView) === 'list' ? 'list' : 'grid';
  const setView = useCallback(
    (v: View) => {
      writeString(WEB_KEYS.listingView, v);
      const sp = new URLSearchParams(window.location.search);
      if (v === 'list') sp.set('view', 'list');
      else sp.delete('view');
      setSearchParams(sp, { replace: true, preventScrollReset: true, flushSync: true });
    },
    [setSearchParams],
  );
  return [view, setView];
}

/** Extra page loaded with "Show more" (rendered into the same grid). */
function AppendedPage({ params, page, view }: { params: ProductListParams; page: number; view: View }) {
  const query = useProducts({ ...params, page });
  if (query.isPending) {
    return (
      <>
        {Array.from({ length: 4 }, (_, i) => (
          <ProductCardSkeleton key={i} layout={view} />
        ))}
      </>
    );
  }
  if (query.isError) return null;
  return (
    <>
      {query.data.items.map((p) => (
        <ProductCard key={p.id} product={p} layout={view} />
      ))}
    </>
  );
}

export interface ProductListingProps {
  /** params from the route (category / brand / promotion) — not written to the URL */
  fixed?: ProductListParams;
  hideBrandFacet?: boolean;
  showCategoryFacet?: boolean;
  /** rendered instead of the default empty state when nothing matches and no filters are set */
  emptyState?: ReactNode;
  /** content above the toolbar inside the results column (subcategory chips…) */
  top?: ReactNode;
  /** called with the total once known (page titles) */
  onTotal?: (total: number) => void;
}

/**
 * Category / search / brand / promotion listing: facet filters (sidebar or bottom sheet), sorting,
 * grid/list view, active filter chips, pagination and "show more". All state lives in the URL.
 */
export function ProductListing({ fixed = {}, hideBrandFacet, showCategoryFacet, emptyState, top, onTotal }: ProductListingProps) {
  const { t } = useTranslation();
  const { params, setParams } = useListingParams(fixed);
  const products = useProducts(params);
  const facets = useFacets(params);
  const [view, setView] = useListingView();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<ProductListParams>(params);
  const draftFacets = useFacets(draft, { enabled: sheetOpen });
  const resultsRef = useRef<HTMLDivElement>(null);
  const sortId = useId();

  const page = params.page ?? 1;
  const baseKey = useMemo(() => JSON.stringify({ ...params, page: undefined }), [params]);
  const [extra, setExtra] = useState<number[]>([]);
  useEffect(() => setExtra([]), [baseKey, page]);

  const total = products.data?.meta.total;
  const pages = products.data?.meta.pages ?? 1;
  const lastPage = extra.length ? extra[extra.length - 1]! : page;
  const filterCount = countFilters(params, fixed);

  useEffect(() => {
    if (total !== undefined) onTotal?.(total);
  }, [total, onTotal]);

  const scrollToResults = () => {
    const el = resultsRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'auto' });
  };

  const update = (next: ProductListParams) => setParams(next);
  const clear = () => setParams(withoutFilters(params, fixed));

  const openSheet = () => {
    setDraft(params);
    setSheetOpen(true);
  };

  const sortSelect = (
    <div className="flex min-w-0 items-center gap-2">
      <label htmlFor={sortId} className="sr-only sm:not-sr-only sm:shrink-0 sm:text-sm sm:text-muted-foreground">
        {t('common:actions.sort')}
      </label>
      <NativeSelect
        id={sortId}
        selectSize="sm"
        containerClassName="w-auto min-w-0"
        className="h-9 min-w-40 font-medium"
        value={params.sort ?? 'recommended'}
        onChange={(e) => setParams({ ...params, sort: e.target.value as SortOption })}
      >
        {SORT_OPTIONS.map((s) => (
          <NativeSelectOption key={s} value={s}>
            {t(`common:sort.${s}`)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );

  let body: ReactNode;
  if (products.isPending) {
    body = view === 'grid' ? (
      <ProductGrid dense>
        {Array.from({ length: 12 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </ProductGrid>
    ) : (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <ProductCardSkeleton key={i} layout="list" />
        ))}
      </div>
    );
  } else if (products.isError) {
    body = <ErrorState error={products.error} onRetry={() => void products.refetch()} />;
  } else if (!products.data.items.length) {
    body =
      filterCount === 0 && emptyState ? (
        emptyState
      ) : (
        <EmptyState
          bordered
          icon={<PackageSearchIcon />}
          title={t('shop:catalog.noProducts')}
          description={t('shop:catalog.noProductsHint')}
          action={
            filterCount > 0 ? (
              <Button variant="outline" onClick={clear}>
                {t('shop:catalog.clearFilters')}
              </Button>
            ) : undefined
          }
        />
      );
  } else {
    const items = products.data.items;
    const cards = items.map((p, i) => <ProductCard key={p.id} product={p} layout={view} priority={i < 4} />);
    const appended = extra.map((p) => <AppendedPage key={p} params={params} page={p} view={view} />);
    body = (
      <div className={cn('transition-opacity duration-150', products.isPlaceholderData && 'pointer-events-none opacity-60')}>
        {view === 'grid' ? (
          <ProductGrid dense>
            {cards}
            {appended}
          </ProductGrid>
        ) : (
          <div className="flex flex-col gap-3">
            {cards}
            {appended}
          </div>
        )}
        {pages > 1 ? (
          <div className="mt-8 flex flex-col items-center gap-5">
            {lastPage < pages ? (
              <Button variant="outline" size="lg" onClick={() => setExtra((e) => [...e, lastPage + 1])} className="min-w-56">
                {t('shop:catalog.loadMore')}
              </Button>
            ) : null}
            <PaginationBar
              page={lastPage}
              pages={pages}
              onPageChange={(p) => {
                setParams({ ...params, page: p }, { keepPage: true });
                scrollToResults();
              }}
              labels={{
                previous: t('common:a11y.previous'),
                next: t('common:a11y.next'),
                page: (n) => t('common:a11y.page', { page: n }),
                morePages: t('common:a11y.morePages'),
              }}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-8">
      <aside className="hidden lg:block" aria-label={t('shop:catalog.filters')}>
        <div className="sticky top-[calc(var(--header-offset)+1rem)] max-h-[calc(100dvh-var(--header-offset)-2rem)] overflow-y-auto overscroll-contain pe-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-base font-bold tracking-tight">{t('shop:catalog.filters')}</h2>
            {filterCount > 0 ? (
              <button type="button" onClick={clear} className="rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring dark:text-brand">
                {t('common:actions.reset')}
              </button>
            ) : null}
          </div>
          <FiltersPanel
            value={params}
            facets={facets.data}
            loading={facets.isFetching}
            onChange={update}
            hideBrand={hideBrandFacet}
            showCategory={showCategoryFacet}
          />
        </div>
      </aside>

      <div ref={resultsRef} className="flex min-w-0 flex-col gap-4">
        <h2 className="sr-only">{t('listing.results')}</h2>
        {top}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" className="h-9 lg:hidden" onClick={openSheet} leftIcon={<SlidersHorizontalIcon aria-hidden="true" />}>
            {filterCount ? t('shop:catalog.filtersCount', { count: filterCount }) : t('shop:catalog.filters')}
          </Button>
          <p className="me-auto hidden text-sm text-muted-foreground tabular-nums sm:block" aria-live="polite">
            {total !== undefined ? t('shop:catalog.found', { count: total }) : ' '}
            {products.isFetching && !products.isPending ? <Spinner size="xs" className="ms-2 inline" /> : null}
          </p>
          <div className="ms-auto flex items-center gap-2 sm:ms-0">
            {sortSelect}
            <ToggleGroup
              type="single"
              variant="segmented"
              size="sm"
              value={view}
              onValueChange={(v) => v && setView(v as View)}
              aria-label={t('listing.view')}
              className="hidden sm:flex"
            >
              <ToggleGroupItem value="grid" aria-label={t('shop:catalog.viewGrid')}>
                <LayoutGridIcon aria-hidden="true" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label={t('shop:catalog.viewList')}>
                <ListIcon aria-hidden="true" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <p className="w-full text-sm text-muted-foreground tabular-nums sm:hidden">{total !== undefined ? t('shop:catalog.found', { count: total }) : ' '}</p>
        </div>
        <ActiveFilters value={params} fixed={fixed} facets={facets.data} onChange={update} onClear={clear} />
        {body}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" closeLabel={t('common:actions.close')} className="h-[88dvh]">
          <SheetHeader>
            <SheetTitle>{t('shop:catalog.filters')}</SheetTitle>
            <SheetDescription className="sr-only">{t('listing.filtersHint')}</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <FiltersPanel
              value={draft}
              facets={draftFacets.data ?? facets.data}
              loading={draftFacets.isFetching}
              onChange={(next) => setDraft(cleanParams(next))}
              hideBrand={hideBrandFacet}
              showCategory={showCategoryFacet}
            />
          </SheetBody>
          <SheetFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDraft(withoutFilters(draft, fixed))} disabled={countFilters(draft, fixed) === 0}>
              {t('common:actions.reset')}
            </Button>
            <Button
              className="flex-[2]"
              loading={draftFacets.isFetching && !draftFacets.data}
              onClick={() => {
                setParams(draft);
                setSheetOpen(false);
                scrollToResults();
              }}
            >
              {draftFacets.data ? t('listing.showProducts', { count: draftFacets.data.total }) : t('shop:catalog.filters')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

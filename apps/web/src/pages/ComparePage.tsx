import { useClearCompare, useCompare } from '@vero/api-client';
import { LIMITS, STORE_ROUTES } from '@vero/config';
import type { CompareGroup, CompareRow, ProductCard } from '@vero/types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  cn,
  EmptyState,
  Label,
  RatingStars,
  Skeleton,
  Switch,
  toast,
} from '@vero/ui';
import { GitCompareArrowsIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import { Fragment, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Crumbs } from '../components/common/Crumbs';
import { Money } from '../components/common/Money';
import { PageTitle } from '../components/common/Section';
import { SmartImage } from '../components/common/SmartImage';
import { ErrorState } from '../components/common/states';
import { CartControl } from '../components/product/ProductActions';
import { StockStatus } from '../components/product/StockStatus';
import { useCompareToggle } from '../features/product/actions';
import { useDocumentMeta } from '../hooks/use-document-meta';
import { LocaleLink } from '../hooks/use-lang';
import { errorMessage } from '../lib/i18n';

const GROUP_KEYS = new Set(['overview', 'main', 'power', 'performance', 'dimensions', 'equipment', 'general']);

function ProductHead({ product }: { product: ProductCard }) {
  const { t } = useTranslation();
  const compare = useCompareToggle();
  return (
    <div className="relative flex h-full flex-col gap-2">
      <button
        type="button"
        onClick={() => compare.toggle(product.id)}
        disabled={compare.pendingId === product.id}
        aria-label={`${t('common:actions.removeFromCompare')}: ${product.name}`}
        className="absolute end-0 top-0 z-[1] flex size-8 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-xs ring-1 ring-border hover:text-danger focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
      >
        <XIcon className="size-4" aria-hidden="true" />
      </button>
      <LocaleLink to={STORE_ROUTES.product(product.slug)} tabIndex={-1} aria-hidden="true" className="img-well block aspect-square overflow-hidden rounded-lg bg-well">
        <SmartImage image={product.image} prefer="thumb" sizes="200px" className="size-full object-contain" alt="" />
      </LocaleLink>
      {/* fixed two-line name box keeps prices and buttons aligned across the columns */}
      <LocaleLink to={STORE_ROUTES.product(product.slug)} title={product.name} className="line-clamp-2 min-h-10 text-sm leading-5 font-semibold hover:text-primary dark:hover:text-brand">
        {product.name}
      </LocaleLink>
      <div className="mt-auto flex flex-col gap-2">
        <Money amount={product.price} oldAmount={product.oldPrice} size="md" className="min-h-6" />
        <CartControl product={product} size="sm" />
      </div>
    </div>
  );
}

/** Values from the API are already localised; price / rating / availability get the storefront widgets. */
function Cell({ row, product, value }: { row: CompareRow; product: ProductCard; value: string | null }) {
  const { t } = useTranslation();
  if (row.key === 'price') return <Money amount={product.price} oldAmount={product.oldPrice} size="sm" />;
  if (row.key === 'rating')
    return product.reviewCount ? (
      <span className="inline-flex items-center gap-1.5">
        <RatingStars value={product.rating} size="xs" label={t('common:a11y.rating', { value: product.rating.toFixed(1) })} />
        <span className="text-xs text-muted-foreground tabular-nums">({product.reviewCount})</span>
      </span>
    ) : (
      <span className="text-muted-foreground">—</span>
    );
  if (row.key === 'availability') return <StockStatus stock={product.stock} />;
  if (row.key === 'brand' && product.brand)
    return (
      <LocaleLink to={STORE_ROUTES.brand(product.brand.slug)} className="font-medium hover:text-primary dark:hover:text-brand">
        {product.brand.name}
      </LocaleLink>
    );
  return value ? <span className="tabular-nums">{value}</span> : <span className="text-muted-foreground">—</span>;
}

function CompareTable({ group, onlyDifferences }: { group: CompareGroup; onlyDifferences: boolean }) {
  const { t } = useTranslation();
  const single = group.products.length < 2;
  // the price is already shown (with the cart button) in the column header
  const all = group.rows.filter((r) => r.key !== 'price');
  const rows = onlyDifferences && !single ? all.filter((r) => r.isDifferent) : all;
  const grouped = useMemo(() => {
    const out: Array<{ group: string; rows: CompareRow[] }> = [];
    for (const r of rows) {
      const last = out[out.length - 1];
      if (last && last.group === r.group) last.rows.push(r);
      else out.push({ group: r.group, rows: [r] });
    }
    return out;
  }, [rows]);
  const cols = group.products.length;
  const canAdd = cols < LIMITS.compareMax;

  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0" tabIndex={0} role="region" aria-label={group.category.name}>
      <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
        <caption className="sr-only">{`${t('shop:compare.title')}: ${group.category.name}`}</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky start-0 z-10 w-32 min-w-32 border-b border-border bg-background p-3 text-start align-bottom text-xs font-semibold text-muted-foreground sm:w-44 sm:min-w-44">
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-foreground">{group.category.name}</span>
                <span className="tabular-nums">{t('shop:cart.items', { count: cols })}</span>
              </span>
            </th>
            {group.products.map((p) => (
              <th key={p.id} scope="col" className="w-44 min-w-44 border-b border-border p-3 text-start align-top font-normal sm:w-56 sm:min-w-56">
                <ProductHead product={p} />
              </th>
            ))}
            {canAdd ? (
              <td className="w-44 min-w-44 border-b border-border p-3 align-top sm:w-56 sm:min-w-56">
                <LocaleLink
                  to={STORE_ROUTES.category(group.category.slug)}
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <PlusIcon className="size-6" aria-hidden="true" />
                  {t('shop:compare.addMore')}
                </LocaleLink>
              </td>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {grouped.map((g) => (
            <Fragment key={g.group}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={cols + 1 + (canAdd ? 1 : 0)}
                  className="border-b border-border bg-surface px-3 py-2 text-start text-xs font-bold tracking-wide text-muted-foreground uppercase"
                >
                  <span className="sticky start-3">{GROUP_KEYS.has(g.group) ? t(`specGroup.${g.group}`) : g.group}</span>
                </th>
              </tr>
              {g.rows.map((row) => (
                <tr key={row.key} className={cn(!single && row.isDifferent && 'bg-brand-soft/25 dark:bg-brand-soft/10')}>
                  <th scope="row" className="sticky start-0 z-[1] border-b border-border bg-background p-3 text-start align-top text-xs font-medium text-muted-foreground sm:text-sm">
                    {row.label}
                  </th>
                  {group.products.map((p, i) => (
                    <td key={p.id} className="border-b border-border p-3 align-top">
                      <Cell row={row} product={p} value={row.values[i] ?? null} />
                    </td>
                  ))}
                  {canAdd ? <td className="border-b border-border" /> : null}
                </tr>
              ))}
            </Fragment>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan={cols + 1 + (canAdd ? 1 : 0)} className="p-6 text-center text-muted-foreground">
                {t('shop:compare.sameValues')}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export default function ComparePage() {
  const { t } = useTranslation();
  const compare = useCompare();
  const clear = useClearCompare();
  const [searchParams, setSearchParams] = useSearchParams();
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const diffId = useId();
  useDocumentMeta({ title: t('shop:compare.title'), noindex: true });

  const groups = compare.data?.groups ?? [];
  const activeSlug = searchParams.get('category');
  const active = groups.find((g) => g.category.slug === activeSlug) ?? groups[0];

  const onClear = async () => {
    try {
      await clear.mutateAsync();
      setConfirmClear(false);
    } catch (error) {
      toast.error(errorMessage(t, error));
    }
  };

  return (
    <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
      <Crumbs items={[{ label: t('shop:compare.title') }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle count={compare.data?.count ? `${compare.data.count} / ${LIMITS.compareMax}` : undefined}>{t('shop:compare.title')}</PageTitle>
        {groups.length ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2.5">
              <Switch id={diffId} checked={onlyDifferences} onCheckedChange={setOnlyDifferences} />
              <Label htmlFor={diffId} className="font-medium">
                {t('shop:compare.onlyDifferences')}
              </Label>
            </div>
            <Button variant="ghost" onClick={() => setConfirmClear(true)} leftIcon={<Trash2Icon aria-hidden="true" />} className="text-muted-foreground hover:text-danger">
              {t('shop:compare.clear')}
            </Button>
          </div>
        ) : null}
      </div>

      {compare.isPending ? (
        <div className="flex gap-3 overflow-hidden" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-96 w-56 shrink-0 rounded-xl" />
          ))}
        </div>
      ) : compare.isError ? (
        <ErrorState error={compare.error} onRetry={() => void compare.refetch()} />
      ) : !active ? (
        <EmptyState
          icon={<GitCompareArrowsIcon />}
          title={t('shop:compare.empty')}
          description={t('shop:compare.emptyHint')}
          action={
            <Button asChild size="lg">
              <LocaleLink to={STORE_ROUTES.catalog}>{t('common:nav.catalog')}</LocaleLink>
            </Button>
          }
        />
      ) : (
        <>
          {groups.length > 1 ? (
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label={t('common:product.category')}>
              <div className="flex w-max gap-2">
                {groups.map((g) => {
                  const on = g.category.id === active.category.id;
                  return (
                    <button
                      key={g.category.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSearchParams(g === groups[0] ? {} : { category: g.category.slug }, { replace: true, preventScrollReset: true })}
                      className={cn(
                        'h-9 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        on ? 'border-primary bg-brand-soft text-brand-soft-foreground' : 'border-border bg-card hover:bg-accent',
                      )}
                    >
                      {g.category.name} <span className="tabular-nums opacity-70">{g.products.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <CompareTable group={active} onlyDifferences={onlyDifferences} />
        </>
      )}

      <AlertDialog open={confirmClear} onOpenChange={(o) => !clear.isPending && setConfirmClear(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('shop:compare.clear')}?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clear.isPending}>{t('common:actions.cancel')}</AlertDialogCancel>
            <Button variant="destructive" onClick={() => void onClear()} loading={clear.isPending}>
              {t('common:actions.clear')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

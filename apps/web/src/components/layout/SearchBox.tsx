import { usePopularSearches, useSearchSuggestions } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import type { BrandSummary, CategorySummary, ProductCard } from '@vero/types';
import { cn, Spinner, useDebouncedValue } from '@vero/ui';
import { ArrowUpLeftIcon, ClockIcon, SearchIcon, TrendingUpIcon, XIcon } from 'lucide-react';
import { Fragment, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearchParams } from 'react-router';
import { useLocaleNavigate } from '../../hooks/use-lang';
import { recentSearches, useRecentSearches } from '../../lib/recent';
import { withQuery } from '../../lib/paths';
import { DynamicIcon } from '../common/DynamicIcon';
import { Money } from '../common/Money';
import { SmartImage } from '../common/SmartImage';

type OptionKind = 'recent' | 'popular' | 'suggestion' | 'category' | 'brand' | 'product' | 'all';

interface SearchOption {
  kind: OptionKind;
  key: string;
  label: string;
  href: string;
  /** stored in the recent searches when the option is chosen */
  query?: string;
  product?: ProductCard;
  category?: CategorySummary;
  brand?: BrandSummary;
}

interface Group {
  id: string;
  label: string;
  icon?: ReactNode;
  layout?: 'list' | 'chips';
  options: SearchOption[];
}

const searchHref = (q: string) => withQuery(STORE_ROUTES.search, { q });

/**
 * Header search with autocomplete (WAI-ARIA combobox): products with image and price, categories,
 * brands; recent + popular searches when empty. ↑/↓ move, Enter opens, Esc closes.
 */
export function SearchBox({
  variant = 'inline',
  autoFocus = false,
  onNavigate,
  className,
}: {
  variant?: 'inline' | 'overlay';
  autoFocus?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const uid = useId().replace(/:/g, '');
  const listboxId = `search-listbox-${uid}`;
  const inputRef = useRef<HTMLInputElement>(null);

  const onSearchPage = /\/search$/.test(location.pathname);
  const urlQuery = onSearchPage ? (searchParams.get('q') ?? '') : '';
  const [value, setValue] = useState(urlQuery);
  const [open, setOpen] = useState(variant === 'overlay');
  const [active, setActive] = useState(-1);

  // keep the field in sync with the search results page (back / forward)
  useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  const debounced = useDebouncedValue(value, 220);
  const query = debounced.trim();
  const typing = value.trim().length >= 2;
  const suggestions = useSearchSuggestions(typing ? query : '');
  const popular = usePopularSearches();
  const recents = useRecentSearches();

  const groups = useMemo<Group[]>(() => {
    if (!typing) {
      const out: Group[] = [];
      if (recents.length) {
        out.push({
          id: 'recent',
          label: t('shop:search.recent'),
          options: recents.slice(0, 6).map((q) => ({ kind: 'recent', key: `r-${q}`, label: q, href: searchHref(q), query: q })),
        });
      }
      const pop = (popular.data ?? []).slice(0, 8);
      if (pop.length) {
        out.push({
          id: 'popular',
          label: t('shop:search.popular'),
          layout: 'chips',
          options: pop.map((p) => ({ kind: 'popular', key: `p-${p.query}`, label: p.query, href: searchHref(p.query), query: p.query })),
        });
      }
      return out;
    }
    const data = suggestions.data;
    if (!data) return [];
    const out: Group[] = [];
    const productNames = new Set(data.products.map((p) => p.name.toLowerCase()));
    const texts = data.suggestions.filter((s) => !productNames.has(s.toLowerCase())).slice(0, 4);
    if (texts.length) {
      out.push({
        id: 'suggestions',
        label: t('shop:search.suggestions'),
        options: texts.map((s) => ({ kind: 'suggestion', key: `s-${s}`, label: s, href: searchHref(s), query: s })),
      });
    }
    if (data.categories.length) {
      out.push({
        id: 'categories',
        label: t('shop:search.categories'),
        options: data.categories.slice(0, 4).map((c) => ({
          kind: 'category',
          key: `c-${c.id}`,
          label: c.name,
          href: STORE_ROUTES.category(c.slug),
          category: c,
          query: value.trim(),
        })),
      });
    }
    if (data.brands.length) {
      out.push({
        id: 'brands',
        label: t('shop:search.brands'),
        options: data.brands.slice(0, 4).map((b) => ({
          kind: 'brand',
          key: `b-${b.id}`,
          label: b.name,
          href: STORE_ROUTES.brand(b.slug),
          brand: b,
          query: value.trim(),
        })),
      });
    }
    if (data.products.length) {
      out.push({
        id: 'products',
        label: t('shop:search.products'),
        options: data.products.slice(0, 6).map((p) => ({
          kind: 'product',
          key: `pr-${p.id}`,
          label: p.name,
          href: STORE_ROUTES.product(p.slug),
          product: p,
          query: value.trim(),
        })),
      });
    }
    out.push({
      id: 'all',
      label: '',
      options: [{ kind: 'all', key: 'all', label: t('search.allResultsFor', { query: value.trim() }), href: searchHref(value.trim()), query: value.trim() }],
    });
    return out;
  }, [typing, recents, popular.data, suggestions.data, t, value]);

  const options = useMemo(() => groups.flatMap((g) => g.options), [groups]);
  const hasOptions = options.length > 0;
  const expanded = open && (hasOptions || (typing && !suggestions.isFetching && !!suggestions.data));
  const optionId = (i: number) => `${listboxId}-o${i}`;

  useEffect(() => setActive(-1), [groups]);

  const choose = (option: SearchOption | null) => {
    const q = option ? option.query : value.trim();
    if (!option && !q) return;
    if (q) recentSearches.push(q);
    setOpen(variant === 'overlay');
    setActive(-1);
    inputRef.current?.blur();
    onNavigate?.();
    navigate(option ? option.href : searchHref(q!));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      if (options.length) setActive((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      if (options.length) setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(active >= 0 ? (options[active] ?? null) : null);
    } else if (e.key === 'Escape') {
      if (open && variant === 'inline') {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      } else if (value) {
        e.preventDefault();
        setValue('');
      }
    }
  };

  let index = -1;
  const panel = (
    <div
      className={cn(
        'overflow-y-auto overscroll-contain bg-popover text-popover-foreground',
        variant === 'inline'
          ? 'absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-[min(70vh,560px)] rounded-xl border border-border shadow-lg'
          : 'min-h-0 flex-1',
      )}
      // keep focus in the input while clicking inside the panel
      onMouseDown={(e) => e.preventDefault()}
    >
      <div id={listboxId} role="listbox" aria-label={t('common:nav.search')} className="p-2">
        {groups.map((group) => (
          <div key={group.id} role="group" aria-labelledby={group.label ? `${listboxId}-${group.id}` : undefined} className="py-1">
            {group.label ? (
              <div
                id={`${listboxId}-${group.id}`}
                role="presentation"
                className="px-2.5 pt-1.5 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {group.label}
              </div>
            ) : (
              <div role="presentation" className="mx-2.5 my-1 h-px bg-border" />
            )}
            <div className={cn(group.layout === 'chips' ? 'flex flex-wrap gap-1.5 px-2 pt-1 pb-1.5' : 'flex flex-col')}>
              {group.options.map((option) => {
                index += 1;
                const i = index;
                const isActive = i === active;
                return (
                  <div
                    key={option.key}
                    id={optionId(i)}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => choose(option)}
                    onMouseMove={() => active !== i && setActive(i)}
                    className={cn(
                      'cursor-pointer select-none',
                      group.layout === 'chips'
                        ? cn(
                            'inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-medium',
                            isActive && 'border-primary/40 bg-brand-soft text-brand-soft-foreground',
                          )
                        : cn('flex min-h-10 items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm', isActive && 'bg-accent'),
                    )}
                  >
                    <OptionContent option={option} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {typing && suggestions.data && !hasOptions ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t('shop:search.noResults', { query: value.trim() })}</p>
        ) : null}
      </div>
      {!typing && recents.length ? (
        <div className="flex justify-end border-t border-border px-3 py-2">
          <button
            type="button"
            onClick={() => recentSearches.clear()}
            className="rounded-sm text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {t('shop:search.clearHistory')}
          </button>
        </div>
      ) : null}
      {!typing && !hasOptions && variant === 'overlay' ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t('shop:search.startTyping')}</p>
      ) : null}
    </div>
  );

  return (
    <div className={cn('relative', variant === 'overlay' && 'flex min-h-0 flex-1 flex-col', className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          choose(active >= 0 ? (options[active] ?? null) : null);
        }}
        className={cn(variant === 'overlay' && 'shrink-0 border-b border-border p-3 pe-14')}
      >
        <div
          className={cn(
            'group/search relative flex h-11 w-full items-center rounded-lg border border-input bg-surface-elevated shadow-xs transition-[border-color,box-shadow] duration-150',
            'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20',
            variant === 'inline' && 'lg:h-11',
          )}
        >
          <SearchIcon className="pointer-events-none ms-3 size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-label={t('common:nav.search')}
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listboxId}
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            autoFocus={autoFocus}
            maxLength={100}
            placeholder={t('shop:search.placeholder')}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => variant === 'inline' && setOpen(false)}
            onKeyDown={onKeyDown}
            className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-base outline-hidden placeholder:text-muted-foreground/75 md:text-sm [&::-webkit-search-cancel-button]:appearance-none"
          />
          {suggestions.isFetching && typing ? <Spinner size="sm" className="me-2 text-muted-foreground" /> : null}
          {value ? (
            <button
              type="button"
              aria-label={t('common:actions.clear')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setValue('');
                inputRef.current?.focus();
              }}
              className="me-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <XIcon className="size-4" aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="submit"
            className="me-1 hidden h-9 shrink-0 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:inline-flex"
          >
            {t('common:actions.search')}
          </button>
        </div>
      </form>
      {expanded || variant === 'overlay' ? panel : null}
    </div>
  );
}

function OptionContent({ option }: { option: SearchOption }) {
  switch (option.kind) {
    case 'recent':
      return (
        <Fragment>
          <ClockIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{option.label}</span>
          <ArrowUpLeftIcon className="size-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
        </Fragment>
      );
    case 'popular':
      return (
        <Fragment>
          <TrendingUpIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
          {option.label}
        </Fragment>
      );
    case 'suggestion':
      return (
        <Fragment>
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{option.label}</span>
        </Fragment>
      );
    case 'category':
      return (
        <Fragment>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface text-muted-foreground">
            <DynamicIcon name={option.category?.icon} className="size-4" />
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
          {option.category ? (
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{option.category.productCount}</span>
          ) : null}
        </Fragment>
      );
    case 'brand':
      return (
        <Fragment>
          <span className="flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white p-1">
            {option.brand?.logo ? (
              <SmartImage image={option.brand.logo} prefer="thumb" sizes="48px" className="max-h-full max-w-full object-contain" alt="" />
            ) : (
              <span className="text-[10px] font-bold text-neutral-900">{option.label.slice(0, 3)}</span>
            )}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
          {option.brand ? <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{option.brand.productCount}</span> : null}
        </Fragment>
      );
    case 'product': {
      const p = option.product!;
      return (
        <Fragment>
          <span className="img-well flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-well">
            <SmartImage image={p.image} prefer="thumb" sizes="48px" className="size-full object-contain" alt="" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="line-clamp-2 text-[13px] leading-snug font-medium">{p.name}</span>
            {p.brand ? <span className="text-xs text-muted-foreground">{p.brand.name}</span> : null}
          </span>
          <Money amount={p.price} oldAmount={p.oldPrice} size="sm" stacked className="shrink-0 items-end text-end" />
        </Fragment>
      );
    }
    case 'all':
      return (
        <Fragment>
          <SearchIcon className="size-4 shrink-0 text-primary dark:text-brand" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate font-semibold text-primary dark:text-brand">{option.label}</span>
        </Fragment>
      );
  }
}

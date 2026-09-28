import { useCategories } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import type { CategoryNode } from '@vero/types';
import { Button, cn, Skeleton } from '@vero/ui';
import { ArrowRightIcon, ChevronRightIcon, LayoutGridIcon, XIcon } from 'lucide-react';
import { forwardRef, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { LocaleLink } from '../../hooks/use-lang';
import { DynamicIcon } from '../common/DynamicIcon';
import { ErrorState } from '../common/states';
import { SmartImage } from '../common/SmartImage';

export const MEGA_MENU_ID = 'mega-menu';

export const CatalogButton = forwardRef<HTMLButtonElement, { open: boolean; onToggle: (viaKeyboard: boolean) => void; compact?: boolean }>(
  function CatalogButton({ open, onToggle, compact }, ref) {
    const { t } = useTranslation();
    return (
      <Button
        ref={ref}
        type="button"
        size={compact ? 'default' : 'lg'}
        aria-expanded={open}
        aria-controls={MEGA_MENU_ID}
        aria-haspopup="true"
        // keyboard-activated clicks have detail === 0 → move focus into the panel
        onClick={(e) => onToggle(e.detail === 0)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            onToggle(true);
          }
        }}
        leftIcon={open ? <XIcon aria-hidden="true" /> : <LayoutGridIcon aria-hidden="true" />}
        className="min-w-[8.5rem]"
      >
        {t('common:nav.catalog')}
      </Button>
    );
  },
);

/** Desktop catalogue panel: top categories on the left, subcategories of the active one on the right. */
export function MegaMenuPanel({ onClose, focusFirst }: { onClose: () => void; focusFirst: boolean }) {
  const { t } = useTranslation();
  const categories = useCategories();
  const [activeId, setActiveId] = useState<string | null>(null);
  const topRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const childListRef = useRef<HTMLUListElement>(null);
  const list = categories.data ?? [];
  const active: CategoryNode | undefined = list.find((c) => c.id === activeId) ?? list[0];

  useEffect(() => {
    if (focusFirst && list.length) topRefs.current[0]?.focus();
    // focus once when data is ready
  }, [focusFirst, list.length]);

  const onTopKey = (e: KeyboardEvent<HTMLAnchorElement>, index: number) => {
    const move = (to: number) => {
      e.preventDefault();
      const next = (to + list.length) % list.length;
      topRefs.current[next]?.focus();
      setActiveId(list[next]!.id);
    };
    if (e.key === 'ArrowDown') move(index + 1);
    else if (e.key === 'ArrowUp') move(index - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(list.length - 1);
    else if (e.key === 'ArrowRight') {
      const first = childListRef.current?.querySelector<HTMLAnchorElement>('a');
      if (first) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const onChildKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'ArrowLeft') {
      const i = list.findIndex((c) => c.id === active?.id);
      if (i >= 0) {
        e.preventDefault();
        topRefs.current[i]?.focus();
      }
    }
  };

  return (
    <div
      id={MEGA_MENU_ID}
      role="region"
      aria-label={t('common:nav.catalog')}
      className="absolute inset-x-0 top-full z-10 border-b border-border bg-popover shadow-lg animate-slide-down"
    >
      <div className="container-page">
        {categories.isPending ? (
          <div className="grid grid-cols-[280px_1fr] gap-8 py-6">
            <div className="flex flex-col gap-2">
              {Array.from({ length: 9 }, (_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 9 }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </div>
        ) : categories.isError ? (
          <ErrorState compact error={categories.error} onRetry={() => void categories.refetch()} className="my-6" />
        ) : (
          <div className="grid max-h-[min(72vh,640px)] grid-cols-[280px_1fr] gap-8">
            <ul className="-ms-2 overflow-y-auto overscroll-contain border-e border-border py-4 pe-3">
              {list.map((c, i) => {
                const isActive = c.id === active?.id;
                return (
                  <li key={c.id}>
                    <LocaleLink
                      ref={(el) => {
                        topRefs.current[i] = el;
                      }}
                      to={STORE_ROUTES.category(c.slug)}
                      onMouseEnter={() => setActiveId(c.id)}
                      onFocus={() => setActiveId(c.id)}
                      onKeyDown={(e) => onTopKey(e, i)}
                      onClick={onClose}
                      aria-current={isActive ? 'true' : undefined}
                      className={cn(
                        'flex h-10 items-center gap-3 rounded-md px-2 text-sm font-medium transition-colors duration-100',
                        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                        isActive ? 'bg-accent text-foreground' : 'text-foreground/85 hover:bg-accent',
                      )}
                    >
                      <DynamicIcon name={c.icon} className={cn('size-[18px] shrink-0', isActive ? 'text-primary dark:text-brand' : 'text-muted-foreground')} />
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      {c.children.length ? <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
                    </LocaleLink>
                  </li>
                );
              })}
            </ul>
            {active ? (
              <div className="min-w-0 overflow-y-auto overscroll-contain py-5">
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <h2 className="text-lg font-bold tracking-tight">{active.name}</h2>
                  <LocaleLink
                    to={STORE_ROUTES.category(active.slug)}
                    onClick={onClose}
                    className="inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring dark:text-brand"
                  >
                    {t('header.allInCategory', { count: active.productCount })}
                    <ArrowRightIcon className="size-4" aria-hidden="true" />
                  </LocaleLink>
                </div>
                {active.children.length ? (
                  <ul ref={childListRef} onKeyDown={onChildKey} className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                    {active.children.map((child) => (
                      <li key={child.id}>
                        <LocaleLink
                          to={STORE_ROUTES.category(child.slug)}
                          onClick={onClose}
                          className="group flex items-center gap-3 rounded-lg border border-transparent p-2 transition-colors hover:border-border hover:bg-surface focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface">
                            {child.image ? (
                              <SmartImage image={child.image} prefer="thumb" sizes="48px" className="size-full object-contain p-1" alt="" />
                            ) : (
                              <DynamicIcon name={child.icon} className="size-5 text-muted-foreground" />
                            )}
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="line-clamp-2 text-sm leading-snug font-semibold group-hover:text-primary dark:group-hover:text-brand">
                              {child.name}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {t('shop:catalog.found', { count: child.productCount })}
                            </span>
                          </span>
                        </LocaleLink>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('header.noSubcategories')}</p>
                )}
              </div>
            ) : null}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border py-3 text-sm">
          <LocaleLink
            to={STORE_ROUTES.catalog}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-sm font-semibold hover:text-primary focus-visible:outline-2 focus-visible:outline-ring dark:hover:text-brand"
          >
            <LayoutGridIcon className="size-4" aria-hidden="true" />
            {t('common:nav.allCategories')}
          </LocaleLink>
          <div className="flex items-center gap-5">
            <LocaleLink to={STORE_ROUTES.brands} onClick={onClose} className="font-medium text-muted-foreground hover:text-foreground">
              {t('common:nav.brands')}
            </LocaleLink>
            <LocaleLink to={STORE_ROUTES.promotions} onClick={onClose} className="font-medium text-muted-foreground hover:text-foreground">
              {t('common:nav.promotions')}
            </LocaleLink>
          </div>
        </div>
      </div>
    </div>
  );
}

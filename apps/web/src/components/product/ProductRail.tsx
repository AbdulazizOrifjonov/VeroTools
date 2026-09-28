import type { ProductCard as ProductCardDTO } from '@vero/types';
import { Button, cn } from '@vero/ui';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProductCard, ProductCardSkeleton } from './ProductCard';

const ITEM = 'shrink-0 snap-start basis-[calc((100%-0.625rem)/2.15)] sm:basis-[calc((100%-2rem)/3.15)] lg:basis-[calc((100%-3rem)/4)] xl:basis-[calc((100%-4rem)/5)]';

/** Horizontally scrolling product row (native scroll-snap + arrow buttons on desktop). */
export function ProductRail({ products, loading = false, label }: { products: ProductCardDTO[] | undefined; loading?: boolean; label: string }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [update, products?.length]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <div className="group/rail relative" role="group" aria-label={label}>
      <div ref={ref} className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto overscroll-x-contain px-4 pb-1 sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0">
        {loading || !products
          ? Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={ITEM}>
                <ProductCardSkeleton />
              </div>
            ))
          : products.map((p) => (
              <div key={p.id} className={cn(ITEM, 'flex')}>
                <ProductCard product={p} className="w-full" />
              </div>
            ))}
      </div>
      {!edges.start ? (
        <Button
          variant="outline"
          size="icon"
          onClick={() => scroll(-1)}
          aria-label={t('common:a11y.previous')}
          className="absolute top-[30%] -start-4 hidden rounded-full shadow-md lg:inline-flex"
        >
          <ChevronLeftIcon aria-hidden="true" />
        </Button>
      ) : null}
      {!edges.end ? (
        <Button
          variant="outline"
          size="icon"
          onClick={() => scroll(1)}
          aria-label={t('common:a11y.next')}
          className="absolute top-[30%] -end-4 hidden rounded-full shadow-md lg:inline-flex"
        >
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}

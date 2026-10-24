import { useProduct, useProductsByIds, useRelatedProducts } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import type { ProductDetail } from '@vero/types';
import { Button, cn, Skeleton } from '@vero/ui';
import { ShoppingCartIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams, useSearchParams } from 'react-router';
import { Crumbs } from '../components/common/Crumbs';
import { Markdown } from '../components/common/Markdown';
import { Money } from '../components/common/Money';
import { Section } from '../components/common/Section';
import { ErrorState } from '../components/common/states';
import { ProductBadges } from '../components/product/ProductBadges';
import { ProductRail } from '../components/product/ProductRail';
import { useAddToCartAction } from '../features/product/actions';
import { BuyBox, offerOf } from '../features/product/BuyBox';
import { Gallery } from '../features/product/Gallery';
import { DeliveryEstimate, InstallmentCalculator, WarrantyAndTrust } from '../features/product/ProductExtras';
import { Questions } from '../features/product/Questions';
import { Reviews } from '../features/product/Reviews';
import { Specs } from '../features/product/Specs';
import { useDocumentMeta } from '../hooks/use-document-meta';
import { isNotFound } from '../lib/errors';
import { recentlyViewed, useRecentlyViewed } from '../lib/recent';
import NotFoundPage from './NotFoundPage';

function ProductSkeleton() {
  return (
    <div className="container-page flex flex-col gap-5 py-5 sm:py-6" aria-hidden="true">
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="mt-2 h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

const SECTIONS = ['description', 'specs', 'reviews', 'questions'] as const;

function SectionNav({ product }: { product: ProductDetail }) {
  const { t } = useTranslation();
  const [active, setActive] = useState<string>('description');
  useEffect(() => {
    const els = SECTIONS.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-120px 0px -55% 0px' },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  const labels: Record<(typeof SECTIONS)[number], string> = {
    description: t('shop:product.tabs.description'),
    specs: t('shop:product.tabs.specs'),
    reviews: `${t('shop:product.tabs.reviews')}${product.reviewCount ? ` ${product.reviewCount}` : ''}`,
    questions: `${t('shop:product.tabs.questions')}${product.questionCount ? ` ${product.questionCount}` : ''}`,
  };
  return (
    <nav aria-label={t('product.sections')} className="sticky top-[var(--header-offset)] z-20 -mx-4 border-b border-border bg-background px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      <ul className="no-scrollbar flex gap-6 overflow-x-auto sm:gap-8">
        {SECTIONS.map((id) => (
          <li key={id} className="shrink-0">
            <a
              href={`#${id}`}
              aria-current={active === id ? 'true' : undefined}
              className={cn(
                'relative inline-flex h-12 items-center text-sm font-semibold transition-colors',
                'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand after:transition-transform after:duration-200',
                active === id ? 'text-foreground after:scale-x-100' : 'text-muted-foreground after:scale-x-0 hover:text-foreground',
              )}
            >
              {labels[id]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function StickyBuyBar({ product, visible, variantId, onChooseVariant }: { product: ProductDetail; visible: boolean; variantId?: string; onChooseVariant: () => void }) {
  const { t } = useTranslation();
  const cartAction = useAddToCartAction();
  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const offer = offerOf(product, variant);
  const out = offer.status === 'out_of_stock' || offer.available <= 0;
  const needsChoice = product.variants.length > 0 && !variant;
  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        'fixed inset-x-0 z-30 border-t border-border bg-background px-4 py-2.5 transition-transform duration-200 lg:hidden',
        'bottom-[var(--bottom-bar-h)]',
        visible ? 'translate-y-0' : 'pointer-events-none translate-y-[calc(100%+var(--bottom-bar-h))]',
      )}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{product.name}</p>
          <Money amount={offer.price} oldAmount={offer.oldPrice} size="md" />
        </div>
        {out ? (
          <Button variant="secondary" disabled>
            {t('common:product.outOfStock')}
          </Button>
        ) : needsChoice ? (
          <Button variant="outline" onClick={onChooseVariant}>
            {t('productCard.chooseOption')}
          </Button>
        ) : (
          <Button loading={cartAction.isPending} onClick={() => cartAction.add({ productId: product.id, variantId: variant?.id, quantity: 1 })} leftIcon={<ShoppingCartIcon aria-hidden="true" />}>
            {t('common:actions.addToCart')}
          </Button>
        )}
      </div>
    </div>
  );
}

function RecentlyViewed({ currentId }: { currentId: string }) {
  const { t } = useTranslation();
  const ids = useRecentlyViewed().filter((id) => id !== currentId).slice(0, 12);
  const products = useProductsByIds(ids);
  const ordered = useMemo(() => {
    if (!products.data) return undefined;
    const byId = new Map(products.data.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
  }, [products.data, ids]);
  if (!ids.length || (products.isSuccess && !ordered?.length)) return null;
  return (
    <Section title={t('shop:product.recentlyViewed')} id="recently-viewed">
      <ProductRail products={ordered} loading={products.isPending} label={t('shop:product.recentlyViewed')} />
    </Section>
  );
}

function ProductView({ product }: { product: ProductDetail }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const related = useRelatedProducts(product.id);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [barVisible, setBarVisible] = useState(false);

  const variantParam = searchParams.get('variant');
  const variant = useMemo(() => {
    if (!product.variants.length) return null;
    return (
      product.variants.find((v) => v.id === variantParam) ??
      product.variants.find((v) => v.stock.available > 0 && v.price === product.price) ??
      product.variants.find((v) => v.stock.available > 0) ??
      product.variants[0]!
    );
  }, [product, variantParam]);

  useEffect(() => {
    recentlyViewed.push(product.id);
  }, [product.id]);

  // "#reviews" / "#questions" links (order page, notifications): the section exists only once the product is loaded
  const location = useLocation();
  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id || !(SECTIONS as readonly string[]).includes(id)) return;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [location.hash, product.id]);

  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setBarVisible(!entry!.isIntersecting && entry!.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const crumbs = [
    { label: t('common:nav.catalog'), to: STORE_ROUTES.catalog },
    ...product.breadcrumbs.map((b) => ({ label: b.name, to: STORE_ROUTES.category(b.slug) })),
    { label: product.name },
  ];

  const offer = offerOf(product, variant);
  const galleryImages = useMemo(() => {
    const imgs = [...product.images];
    if (variant?.image && !imgs.some((i) => i.url === variant.image!.url)) imgs.unshift(variant.image);
    return imgs;
  }, [product.images, variant]);

  return (
    <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
      <Crumbs items={crumbs} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10 xl:gap-14">
        <div className="lg:sticky lg:top-[calc(var(--header-offset)+1rem)] lg:self-start">
          <Gallery
            images={galleryImages}
            title={product.name}
            activeImage={variant?.image}
            badges={<ProductBadges product={product} className="pointer-events-none absolute start-3 top-3" />}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <BuyBox
            ref={actionsRef}
            product={product}
            variant={variant}
            onVariantChange={(id) => {
              const sp = new URLSearchParams(searchParams);
              sp.set('variant', id);
              setSearchParams(sp, { replace: true, preventScrollReset: true });
            }}
          />
          <DeliveryEstimate amount={offer.price} />
          <InstallmentCalculator amount={offer.price} />
          <WarrantyAndTrust warrantyMonths={product.warrantyMonths} />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:mt-10">
        <SectionNav product={product} />
        <section id="description" aria-labelledby="description-title" className="scroll-mt-[calc(var(--header-offset)+4rem)] py-6">
          <h2 id="description-title" className="mb-4 text-xl font-bold tracking-tight">
            {t('shop:product.tabs.description')}
          </h2>
          {product.description ? <Markdown className="max-w-3xl">{product.description}</Markdown> : <p className="text-muted-foreground">{product.shortDescription}</p>}
          {product.videos.length ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {product.videos.map((v, i) => (
                <li key={v}>
                  <a href={v} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-semibold hover:bg-accent">
                    {t('shop:product.video')} {product.videos.length > 1 ? i + 1 : ''}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        <section id="specs" aria-labelledby="specs-title" className="scroll-mt-[calc(var(--header-offset)+4rem)] border-t border-border py-6">
          <h2 id="specs-title" className="mb-4 text-xl font-bold tracking-tight">
            {t('shop:product.tabs.specs')}
          </h2>
          <Specs specs={product.specs} />
        </section>
        <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-[calc(var(--header-offset)+4rem)] border-t border-border py-6">
          <h2 id="reviews-title" className="mb-4 text-xl font-bold tracking-tight">
            {t('shop:reviews.title')}
          </h2>
          <Reviews product={product} />
        </section>
        <section id="questions" aria-labelledby="questions-title" className="scroll-mt-[calc(var(--header-offset)+4rem)] border-t border-border py-6">
          <h2 id="questions-title" className="mb-4 text-xl font-bold tracking-tight">
            {t('shop:questions.title')}
          </h2>
          <Questions product={product} />
        </section>
      </div>

      {related.data?.length ? (
        <Section title={t('shop:product.related')} id="related">
          <ProductRail products={related.data} label={t('shop:product.related')} />
        </Section>
      ) : null}
      <RecentlyViewed currentId={product.id} />
      <StickyBuyBar
        product={product}
        visible={barVisible}
        variantId={variant?.id}
        onChooseVariant={() => actionsRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })}
      />
    </div>
  );
}

export default function ProductPage() {
  const { slug = '' } = useParams();
  const product = useProduct(slug);
  const p = product.data;
  useDocumentMeta({ title: p ? (p.seoTitle?.replace(/\s*\|\s*OCKEAN\s*$/i, '') || p.name) : undefined, description: p?.seoDescription || p?.shortDescription });

  if (product.isPending) return <ProductSkeleton />;
  if (product.isError) {
    if (isNotFound(product.error)) return <NotFoundPage kind="product" />;
    return (
      <div className="container-page py-10">
        <ErrorState error={product.error} onRetry={() => void product.refetch()} />
      </div>
    );
  }
  return <ProductView key={product.data.id} product={product.data} />;
}

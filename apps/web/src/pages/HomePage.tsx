import { useHome, useSettings } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import type { BannerDTO, FaqDTO, HomeReview, StoreAdvantage } from '@vero/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, cn, RatingStars, Skeleton } from '@vero/ui';
import { useTranslation } from 'react-i18next';
import { DynamicIcon } from '../components/common/DynamicIcon';
import { Section } from '../components/common/Section';
import { SmartImage } from '../components/common/SmartImage';
import { ErrorState } from '../components/common/states';
import { BannerAnchor, bannerBg, BannerPicture, BannerText } from '../components/marketing/BannerLink';
import { HeroCarousel } from '../components/marketing/HeroCarousel';
import { PromotionCard } from '../components/marketing/PromotionCard';
import { BrandTile, CategoryTile } from '../components/marketing/Tiles';
import { ProductRail } from '../components/product/ProductRail';
import { useDocumentMeta } from '../hooks/use-document-meta';
import { useFormat } from '../hooks/use-format';
import { LocaleLink } from '../hooks/use-lang';
import { withQuery } from '../lib/paths';

function SecondaryBanners({ banners }: { banners: BannerDTO[] }) {
  if (!banners.length) return null;
  return (
    <div className={cn('grid gap-3 sm:gap-4', banners.length > 1 && 'md:grid-cols-2')}>
      {banners.slice(0, 2).map((b) => (
        <BannerAnchor
          key={b.id}
          banner={b}
          className={cn(
            'group relative block aspect-[8/5] overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:aspect-[3/2] lg:aspect-[2/1]',
            bannerBg(b),
          )}
        >
          <BannerPicture banner={b} sizes="(min-width: 768px) 50vw, 100vw" />
          <div className="absolute inset-0 flex items-start p-5 sm:items-center sm:p-8 md:p-5 lg:p-8">
            <BannerText
              banner={b}
              size="md"
              className="max-w-[62%]"
              titleClassName="md:max-lg:text-lg"
              subtitleClassName="md:max-lg:line-clamp-2 md:max-lg:text-[13px]"
            />
          </div>
        </BannerAnchor>
      ))}
    </div>
  );
}

function MiddleBanner({ banner }: { banner: BannerDTO | undefined }) {
  if (!banner) return null;
  return (
    <div className="py-4 sm:py-6">
      <BannerAnchor
        banner={banner}
        className={cn(
          'group relative block aspect-[4/3] overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:aspect-[4/1]',
          bannerBg(banner),
        )}
      >
        <BannerPicture banner={banner} sizes="(min-width: 1440px) 1376px, 100vw" />
        <div className="absolute inset-0 flex items-start p-6 sm:items-center sm:p-10">
          <BannerText banner={banner} size="md" className="max-w-[min(30rem,65%)] max-md:max-w-full" />
        </div>
      </BannerAnchor>
    </div>
  );
}

function Advantages({ items }: { items: StoreAdvantage[] }) {
  const { t } = useTranslation();
  if (!items.length) return null;
  return (
    <Section title={t('shop:home.whyUs')} id="advantages">
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {items.map((a, i) => (
          <li key={i} className="flex gap-4 rounded-lg border border-border bg-card p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary dark:text-brand">
              <DynamicIcon name={a.icon} className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-[15px] leading-snug font-bold">{a.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{a.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Reviews({ reviews }: { reviews: HomeReview[] }) {
  const { t } = useTranslation();
  const f = useFormat();
  if (!reviews.length) return null;
  return (
    <Section title={t('shop:home.reviews')} id="reviews">
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {reviews.slice(0, 8).map((r) => (
          <li key={r.id} className="flex w-[82%] shrink-0 snap-start flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:w-[46%] lg:w-auto">
            <div className="flex items-center justify-between gap-2">
              <RatingStars value={r.rating} size="sm" label={t('common:a11y.rating', { value: r.rating })} />
              <time dateTime={r.createdAt} className="text-xs text-muted-foreground">
                {f.date(r.createdAt, 'short')}
              </time>
            </div>
            <p className="line-clamp-5 text-sm leading-relaxed text-foreground/90">{r.comment}</p>
            <p className="text-xs font-semibold text-muted-foreground">{r.author.name}</p>
            <LocaleLink
              to={STORE_ROUTES.product(r.product.slug)}
              className="mt-auto flex items-center gap-3 rounded-md border-t border-border pt-3 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring dark:hover:text-brand"
            >
              <span className="img-well flex size-11 shrink-0 overflow-hidden rounded-md bg-well">
                <SmartImage image={r.product.image} prefer="thumb" sizes="44px" className="size-full object-contain" alt="" />
              </span>
              <span className="line-clamp-2 text-xs leading-snug font-semibold">{r.product.name}</span>
            </LocaleLink>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function FaqPreview({ items }: { items: FaqDTO[] }) {
  const { t } = useTranslation();
  if (!items.length) return null;
  return (
    <Section title={t('shop:home.faq')} href={STORE_ROUTES.faq} linkLabel={t('common:actions.seeAll')} id="faq">
      <div className="rounded-lg border border-border bg-card px-4 sm:px-6">
        <Accordion type="single" collapsible>
          {items.slice(0, 6).map((q) => (
            <AccordionItem key={q.id} value={q.id}>
              <AccordionTrigger>{q.question}</AccordionTrigger>
              <AccordionContent className="whitespace-pre-line">{q.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}

function HomeSkeleton() {
  return (
    <div className="container-page flex flex-col gap-8 py-4 sm:py-6" aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-xl sm:aspect-[16/7] lg:aspect-[1600/560]" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="aspect-[2/1] rounded-xl" />
        <Skeleton className="aspect-[2/1] rounded-xl max-md:hidden" />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const home = useHome();
  const settings = useSettings();
  useDocumentMeta({ title: settings.data ? null : undefined, description: settings.data?.seo.description });

  if (home.isPending) return <HomeSkeleton />;
  if (home.isError) {
    return (
      <div className="container-page py-10">
        <ErrorState error={home.error} onRetry={() => void home.refetch()} />
      </div>
    );
  }

  const d = home.data;
  const rails = [
    { key: 'featured', title: t('home.featured'), items: d.featured, href: withQuery(STORE_ROUTES.search, { featured: 1 }) },
    { key: 'new', title: t('shop:home.new'), items: d.newArrivals, href: withQuery(STORE_ROUTES.search, { isNew: 1, sort: 'newest' }) },
    { key: 'best', title: t('shop:home.bestsellers'), items: d.bestsellers, href: withQuery(STORE_ROUTES.search, { bestseller: 1, sort: 'popular' }) },
    { key: 'sale', title: t('shop:home.discounted'), items: d.discounted, href: withQuery(STORE_ROUTES.search, { discounted: 1, sort: 'discount' }) },
    { key: 'rec', title: t('shop:home.recommended'), items: d.recommended, href: undefined },
  ];
  const rail = (i: number) => {
    const r = rails[i]!;
    if (!r.items.length) return null;
    return (
      <Section key={r.key} title={r.title} href={r.href} linkLabel={t('common:actions.seeAll')} id={`rail-${r.key}`}>
        <ProductRail products={r.items} label={r.title} />
      </Section>
    );
  };

  return (
    <div className="container-page flex flex-col py-4 sm:py-6">
      <h1 className="sr-only">{settings.data?.seo.title ?? t('common:brand.name')}</h1>
      <div className="flex flex-col gap-3 sm:gap-4">
        <HeroCarousel banners={d.hero} />
        <SecondaryBanners banners={d.secondary} />
      </div>

      {d.categories.length ? (
        <Section title={t('shop:home.categories')} href={STORE_ROUTES.catalog} linkLabel={t('common:nav.allCategories')} id="categories">
          <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 xl:grid-cols-5">
            {d.categories.map((c) => (
              <li key={c.id} className="flex">
                <CategoryTile category={c} className="w-full" />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {rail(0)}

      {d.promotions.length ? (
        <Section title={t('shop:home.promotions')} href={STORE_ROUTES.promotions} linkLabel={t('shop:home.allPromotions')} id="promotions">
          <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {d.promotions.slice(0, 4).map((p) => (
              <li key={p.id} className="flex">
                <PromotionCard promotion={p} className="w-full" />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {rail(1)}
      <MiddleBanner banner={d.middle[0]} />
      {rail(2)}
      {rail(3)}
      <MiddleBanner banner={d.middle[1]} />

      {d.brands.length ? (
        <Section title={t('shop:home.brands')} href={STORE_ROUTES.brands} linkLabel={t('shop:home.allBrands')} id="brands">
          <ul className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-8 lg:overflow-visible lg:px-0">
            {d.brands.slice(0, 15).map((b) => (
              <li key={b.id} className="flex w-36 shrink-0 snap-start lg:w-auto">
                <BrandTile brand={b} className="w-full" />
              </li>
            ))}
            <li className="flex w-36 shrink-0 snap-start lg:w-auto">
              <LocaleLink
                to={STORE_ROUTES.brands}
                className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input p-3 text-center text-sm font-semibold text-primary transition-colors hover:border-primary/50 hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-brand"
              >
                {t('shop:home.allBrands')}
                <span className="text-xs font-medium text-muted-foreground">{t('shop:catalog.found', { count: d.brands.reduce((s, b) => s + b.productCount, 0) })}</span>
              </LocaleLink>
            </li>
          </ul>
        </Section>
      ) : null}

      {rail(4)}
      <MiddleBanner banner={d.middle[2]} />
      <Advantages items={settings.data?.advantages ?? []} />
      <Reviews reviews={d.reviews} />
      <FaqPreview items={d.faq} />
    </div>
  );
}

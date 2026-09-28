import { useBrand } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { ExternalLinkIcon, GlobeIcon, MapPinIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { Crumbs } from '../components/common/Crumbs';
import { ErrorState, PageSkeleton } from '../components/common/states';
import { BrandLogo } from '../components/marketing/Tiles';
import { ProductListing } from '../features/catalog/ProductListing';
import { useDocumentMeta } from '../hooks/use-document-meta';
import { isNotFound } from '../lib/errors';
import NotFoundPage from './NotFoundPage';

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function BrandPage() {
  const { t } = useTranslation();
  const { slug = '' } = useParams();
  const brand = useBrand(slug);
  const fixed = useMemo(() => ({ brand: [slug] }), [slug]);
  const b = brand.data;
  useDocumentMeta({
    title: b ? t('shop:brands.products', { name: b.name }) : undefined,
    description: b?.description,
  });

  if (brand.isPending) return <PageSkeleton />;
  if (brand.isError || !b) {
    if (isNotFound(brand.error)) return <NotFoundPage />;
    return (
      <div className="container-page py-10">
        <ErrorState error={brand.error} onRetry={() => void brand.refetch()} />
      </div>
    );
  }

  const website = b.website && /^https?:\/\//.test(b.website) ? b.website : null;

  return (
    <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
      <Crumbs items={[{ label: t('shop:brands.title'), to: STORE_ROUTES.brands }, { label: b.name }]} />
      <header className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:gap-8 sm:p-6">
        <BrandLogo brand={b} className="h-20 w-full max-w-60 shrink-0 p-3 ring-1 ring-border sm:h-24 sm:w-60" />
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-2xl leading-tight font-bold tracking-tight sm:text-3xl">{b.name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {b.country ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPinIcon className="size-4" aria-hidden="true" />
                {t('shop:brands.country')}: <span className="font-medium text-foreground">{b.country}</span>
              </span>
            ) : null}
            <span className="tabular-nums">{t('shop:catalog.found', { count: b.productCount })}</span>
            {website ? (
              <a href={website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary dark:hover:text-brand">
                <GlobeIcon className="size-4" aria-hidden="true" />
                {hostOf(website)}
                <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
          {b.description ? <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{b.description}</p> : null}
        </div>
      </header>
      <h2 className="sr-only">{t('shop:brands.products', { name: b.name })}</h2>
      <ProductListing fixed={fixed} hideBrandFacet showCategoryFacet />
    </div>
  );
}

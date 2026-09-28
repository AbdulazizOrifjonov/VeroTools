import { useCategory } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { cn } from '@vero/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { Crumbs } from '../components/common/Crumbs';
import { Markdown } from '../components/common/Markdown';
import { PageTitle } from '../components/common/Section';
import { SmartImage } from '../components/common/SmartImage';
import { ErrorState, PageSkeleton } from '../components/common/states';
import { ProductListing } from '../features/catalog/ProductListing';
import { useDocumentMeta } from '../hooks/use-document-meta';
import { LocaleLink } from '../hooks/use-lang';
import { isNotFound } from '../lib/errors';
import NotFoundPage from './NotFoundPage';

export default function CategoryPage() {
  const { t } = useTranslation();
  const { slug = '' } = useParams();
  const category = useCategory(slug);
  const fixed = useMemo(() => ({ category: slug }), [slug]);
  const c = category.data;
  useDocumentMeta({
    title: c ? (c.seoTitle || c.name) : undefined,
    description: c?.seoDescription || c?.description,
  });

  if (category.isPending) return <PageSkeleton />;
  if (category.isError) {
    if (isNotFound(category.error)) return <NotFoundPage />;
    return (
      <div className="container-page py-10">
        <ErrorState error={category.error} onRetry={() => void category.refetch()} />
      </div>
    );
  }

  const crumbs = [
    { label: t('common:nav.catalog'), to: STORE_ROUTES.catalog },
    ...c!.breadcrumbs.filter((b) => b.slug !== c!.slug).map((b) => ({ label: b.name, to: STORE_ROUTES.category(b.slug) })),
    { label: c!.name },
  ];

  const chips = c!.children.length ? (
    <nav aria-label={t('shop:catalog.subcategories')} className="-mx-4 sm:mx-0">
      <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:px-0">
        {c!.children.map((child) => (
          <li key={child.id} className="shrink-0">
            <LocaleLink
              to={STORE_ROUTES.category(child.slug)}
              className={cn(
                'flex h-11 items-center gap-2 rounded-lg border border-border bg-card ps-1.5 pe-3 text-sm font-semibold transition-colors',
                'hover:border-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface">
                {child.image ? <SmartImage image={child.image} prefer="thumb" sizes="32px" className="size-full object-contain p-0.5" alt="" /> : null}
              </span>
              <span className="whitespace-nowrap">{child.name}</span>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">{child.productCount}</span>
            </LocaleLink>
          </li>
        ))}
      </ul>
    </nav>
  ) : null;

  return (
    <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
      <Crumbs items={crumbs} />
      <div className="flex flex-col gap-2">
        <PageTitle count={t('shop:catalog.found', { count: c!.productCount })}>{c!.name}</PageTitle>
        {c!.description && c!.description.length <= 280 ? <p className="max-w-3xl text-sm text-muted-foreground sm:text-[15px]">{c!.description}</p> : null}
      </div>
      <ProductListing fixed={fixed} top={chips} />
      {c!.description && c!.description.length > 280 ? (
        <section aria-label={t('common:product.description')} className="mt-6 max-w-4xl border-t border-border pt-8">
          <Markdown>{c!.description}</Markdown>
        </section>
      ) : null}
    </div>
  );
}

import { useCategories } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { Button, Skeleton } from '@vero/ui';
import { HouseIcon, SearchXIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CategoryTile } from '../components/marketing/Tiles';
import { SearchBox } from '../components/layout/SearchBox';
import { useDocumentMeta } from '../hooks/use-document-meta';
import { LocaleLink } from '../hooks/use-lang';

/** 404 — with search and popular categories so the visitor can continue. */
export default function NotFoundPage({ kind = 'page' }: { kind?: 'page' | 'product' }) {
  const { t } = useTranslation();
  const categories = useCategories();
  const title = kind === 'product' ? t('shop:notFound.productTitle') : t('shop:notFound.title');
  useDocumentMeta({ title, noindex: true });

  return (
    <div className="container-page flex flex-col items-center py-12 sm:py-16">
      <div className="flex max-w-xl flex-col items-center gap-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-brand-soft text-primary ring-8 ring-brand-soft/40 dark:text-brand">
          <SearchXIcon className="size-8" aria-hidden="true" />
        </span>
        <p className="text-sm font-bold tracking-widest text-muted-foreground tabular-nums">404</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="text-muted-foreground">{kind === 'product' ? t('shop:notFound.productText') : t('shop:notFound.text')}</p>
        <div className="mt-2 w-full">
          <SearchBox />
        </div>
        <Button asChild variant="outline" leftIcon={<HouseIcon aria-hidden="true" />} className="mt-1">
          <LocaleLink to="/">{t('common:actions.goHome')}</LocaleLink>
        </Button>
      </div>
      <section aria-labelledby="nf-categories" className="mt-12 w-full">
        <h2 id="nf-categories" className="mb-4 text-lg font-bold tracking-tight">
          {t('notFound.popularCategories')}
        </h2>
        {categories.isPending ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
            ))}
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-8">
            {(categories.data ?? [])
              .slice()
              .sort((a, b) => b.productCount - a.productCount)
              .slice(0, 8)
              .map((c) => (
                <li key={c.id} className="flex">
                  <CategoryTile category={c} size="sm" className="w-full" />
                </li>
              ))}
          </ul>
        )}
        <p className="mt-4 text-center text-sm">
          <LocaleLink to={STORE_ROUTES.catalog} className="font-semibold text-primary hover:underline dark:text-brand">
            {t('common:nav.allCategories')}
          </LocaleLink>
        </p>
      </section>
    </div>
  );
}

import { usePage } from '@vero/api-client';
import { cn, Skeleton } from '@vero/ui';
import { useTranslation } from 'react-i18next';
import { Crumbs } from '../components/common/Crumbs';
import { Markdown } from '../components/common/Markdown';
import { ErrorState } from '../components/common/states';
import { INFO_LINKS, LEGAL_LINKS } from '../components/layout/links';
import { useDocumentMeta } from '../hooks/use-document-meta';
import { useFormat } from '../hooks/use-format';
import { LocaleNavLink } from '../hooks/use-lang';
import { isNotFound } from '../lib/errors';
import NotFoundPage from './NotFoundPage';

/** Sidebar with the other customer information pages. */
function InfoNav() {
  const { t } = useTranslation();
  const links = [...INFO_LINKS, ...LEGAL_LINKS];
  return (
    <nav aria-label={t('content.pagesNav')} className="lg:sticky lg:top-[calc(var(--header-offset)+1.5rem)]">
      <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
        {links.map((l) => (
          <li key={l.to} className="shrink-0">
            <LocaleNavLink
              to={l.to}
              end
              className={({ isActive }) =>
                cn(
                  'flex h-9 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-ring',
                  'lg:h-10 lg:rounded-lg lg:border-0 lg:px-3',
                  isActive ? 'border-primary bg-brand-soft font-semibold text-brand-soft-foreground lg:bg-accent lg:text-foreground' : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              {t(l.label)}
            </LocaleNavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function ContentPage({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const f = useFormat();
  const page = usePage(slug);
  const p = page.data;
  useDocumentMeta({ title: p ? p.seoTitle || p.title : undefined, description: p?.seoDescription });

  if (page.isError && isNotFound(page.error)) return <NotFoundPage />;

  return (
    <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
      <Crumbs items={[{ label: p?.title ?? '…' }]} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        <aside>
          <InfoNav />
        </aside>
        <article className="min-w-0 max-w-3xl">
          {page.isPending ? (
            <div className="flex flex-col gap-4" aria-busy="true">
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-4 w-40" />
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : page.isError || !p ? (
            <ErrorState error={page.error} onRetry={() => void page.refetch()} />
          ) : (
            <>
              <header className="mb-6 flex flex-col gap-2 border-b border-border pb-5">
                <h1 className="text-2xl leading-tight font-bold tracking-tight text-balance sm:text-[2rem]">{p.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('content.updated', { date: f.date(p.updatedAt, 'long') })}
                </p>
              </header>
              <Markdown>{p.content}</Markdown>
            </>
          )}
        </article>
      </div>
    </div>
  );
}

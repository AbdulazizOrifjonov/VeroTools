import { useAdminQuery, useSession } from '@vero/api-client';
import { LANGUAGES, LANGUAGE_LABELS } from '@vero/config';
import { PAGE_SLUGS, type AdminPage } from '@vero/types';
import { Badge, Button, cn, Skeleton } from '@vero/ui';
import { ChevronRightIcon, FileTextIcon, PencilIcon, PlusIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Page, PageHeader, Panel, usePageMeta } from '../../components/common/page';
import { ErrorState } from '../../components/common/states';
import { useFormat } from '../../lib/format';

function PageStatus({ page }: { page?: AdminPage }) {
  const { t } = useTranslation();
  if (!page) return <Badge variant="outline">{t('pages.notCreated')}</Badge>;
  return page.isPublished ? <Badge variant="success">{t('pages.published')}</Badge> : <Badge variant="secondary">{t('pages.draft')}</Badge>;
}

function LanguageChips({ page }: { page?: AdminPage }) {
  const { t } = useTranslation();
  return (
    <span className="flex items-center gap-1">
      {LANGUAGES.map((l) => {
        const filled = !!page?.content?.[l]?.trim();
        const label = filled ? t('form.langFilled', { lang: LANGUAGE_LABELS[l].native }) : t('form.langEmpty', { lang: LANGUAGE_LABELS[l].native });
        return (
          <span key={l} className={cn('rounded-sm px-1.5 py-0.5 text-[11px] font-semibold', filled ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground')} title={label}>
            <span aria-hidden="true">{LANGUAGE_LABELS[l].short}</span>
            <span className="sr-only">{label}</span>
          </span>
        );
      })}
    </span>
  );
}

export default function PagesListPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  usePageMeta(t('pages.title'));
  const query = useAdminQuery(['pages'], (api) => api.admin.pages.list());
  const bySlug = new Map((query.data ?? []).map((p) => [p.slug, p]));
  const canEdit = can('content.update');

  return (
    <Page>
      <PageHeader title={t('pages.title')} description={t('pages.description')} />
      {query.isError && !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <Panel flush>
          <ul className="divide-y divide-border" aria-busy={query.isLoading || undefined}>
            {PAGE_SLUGS.map((slug) => {
              const page = bySlug.get(slug);
              const title = page ? f.loc(page.title) || t(`enums.page.${slug}`) : t(`enums.page.${slug}`);
              return (
                <li key={slug} className="group relative flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 hover:bg-muted/40 sm:px-5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FileTextIcon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link to={`/pages/${slug}`} className="truncate font-semibold text-foreground after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-ring">
                      {title}
                    </Link>
                    <span className="font-mono text-xs text-muted-foreground">{slug}</span>
                  </div>
                  {query.isLoading ? (
                    <Skeleton className="h-6 w-48" />
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                      <LanguageChips page={page} />
                      <PageStatus page={page} />
                      <span className="w-24 text-xs text-muted-foreground tabular" title={page ? t('pages.editor.lastUpdated', { date: f.datetime(page.updatedAt) }) : undefined}>
                        {page ? f.date(page.updatedAt) : ''}
                      </span>
                      {canEdit ? (
                        <Button variant="ghost" size="sm" className="relative" leftIcon={page ? <PencilIcon /> : <PlusIcon />} asChild>
                          <Link to={`/pages/${slug}`} tabIndex={-1}>
                            {page ? t('common.edit') : t('pages.create')}
                          </Link>
                        </Button>
                      ) : (
                        <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </Page>
  );
}

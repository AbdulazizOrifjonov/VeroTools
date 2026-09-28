import { useAdminItem, useAdminMutation, useSession } from '@vero/api-client';
import { PAGE_SLUGS, type AdminPage, type PageSlug } from '@vero/types';
import { Alert, AlertDescription, Badge, Button, Form, Skeleton, toast } from '@vero/ui';
import { pageInputSchema } from '@vero/validation';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import type { z } from 'zod';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { ErrorState } from '../../components/common/states';
import { SwitchField } from '../../components/form/fields';
import { FormActionBar, FormSection, UnsavedChangesGuard, useSaveShortcut } from '../../components/form/form-kit';
import { LocalizedField } from '../../components/form/LocalizedField';
import { handleFormError, isNotFound } from '../../lib/errors';
import { formResolver } from '../../lib/forms';
import { useFormat } from '../../lib/format';
import NotFoundPage from '../errors/NotFoundPage';

type Values = z.input<typeof pageInputSchema>;
type Output = z.output<typeof pageInputSchema>;

const L = () => ({ uz: '', ru: '', en: '' });
const toForm = (p: AdminPage | undefined): Values => ({
  title: { ...L(), ...p?.title },
  content: { ...L(), ...p?.content },
  seoTitle: { ...L(), ...p?.seoTitle },
  seoDescription: { ...L(), ...p?.seoDescription },
  isPublished: p?.isPublished ?? true,
});

function Editor({ slug, page }: { slug: PageSlug; page: AdminPage | undefined }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  const canEdit = can('content.update');
  const defaults = useMemo(() => toForm(page), [page]);
  const form = useForm<Values, unknown, Output>({ resolver: formResolver<Values, typeof pageInputSchema>(pageInputSchema), defaultValues: defaults });
  useEffect(() => {
    if (!form.formState.isDirty) form.reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- follow refetches only while untouched
  }, [defaults]);
  const save = useAdminMutation((api, input: Output) => api.admin.pages.update(slug, input), { invalidate: ['pages'] });
  const dirty = form.formState.isDirty;
  const submit = form.handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync(values);
      form.reset(toForm(saved));
      toast.success(t('pages.editor.saved'));
    } catch (error) {
      handleFormError(t, form, error);
    }
  });
  useSaveShortcut(() => void submit(), canEdit);
  const title = (page && f.loc(page.title)) || t(`enums.page.${slug}`);
  usePageMeta(t('pages.title'), title);

  return (
    <Page>
      <UnsavedChangesGuard when={dirty && !save.isPending} />
      <PageHeader
        back={{ to: '/pages', label: t('pages.editor.back') }}
        title={title}
        meta={
          page ? (
            <Badge variant={page.isPublished ? 'success' : 'secondary'} size="lg" dot>
              {page.isPublished ? t('pages.published') : t('pages.draft')}
            </Badge>
          ) : (
            <Badge variant="outline" size="lg">
              {t('pages.notCreated')}
            </Badge>
          )
        }
        description={page ? t('pages.editor.lastUpdated', { date: f.datetime(page.updatedAt) }) : undefined}
      />
      {!page ? (
        <Alert variant="info">
          <AlertDescription>{t('pages.editor.newHint')}</AlertDescription>
        </Alert>
      ) : null}
      <Form {...form}>
        <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
          <fieldset disabled={!canEdit} className="contents">
            <div className="grid min-w-0 gap-4 xl:grid-cols-3">
              <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
                <FormSection id="content" title={t('pages.editor.content')} description={t('pages.editor.contentHint')}>
                  <LocalizedField name="title" label={t('pages.editor.titleLabel')} required="all" maxLength={160} />
                  <LocalizedField name="content" label={t('pages.editor.content')} required="default" markdown rows={18} maxLength={60000} />
                </FormSection>
              </div>
              <div className="flex min-w-0 flex-col gap-4">
                <FormSection id="publishing" title={t('pages.editor.publishing')}>
                  <SwitchField name="isPublished" label={t('pages.editor.published')} description={t('pages.editor.publishedHint')} />
                </FormSection>
                <FormSection id="seo" title={t('pages.editor.seo')} description={t('pages.editor.seoHint')}>
                  <LocalizedField name="seoTitle" label={t('common.seoTitle')} maxLength={160} />
                  <LocalizedField name="seoDescription" label={t('common.seoDescription')} multiline rows={4} maxLength={320} />
                </FormSection>
              </div>
            </div>
          </fieldset>
          {canEdit ? (
            <FormActionBar dirty={dirty} submitting={save.isPending} onDiscard={() => form.reset(defaults)}>
              <Button type="submit" loading={save.isPending} disabled={!dirty && !!page}>
                {page ? t('common.save') : t('pages.create')}
              </Button>
            </FormActionBar>
          ) : null}
        </form>
      </Form>
    </Page>
  );
}

export default function PageEditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const valid = !!slug && (PAGE_SLUGS as readonly string[]).includes(slug);
  const query = useAdminItem('pages', valid ? slug : undefined, (api, s) => api.admin.pages.get(s));
  if (!valid) return <NotFoundPage />;
  const missing = query.isError && isNotFound(query.error);
  if (query.isError && !missing) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (query.isLoading) {
    return (
      <Page>
        <Skeleton className="h-14 w-80" />
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-[32rem] rounded-xl xl:col-span-2" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </Page>
    );
  }
  return <Editor key={slug} slug={slug as PageSlug} page={missing ? undefined : query.data} />;
}

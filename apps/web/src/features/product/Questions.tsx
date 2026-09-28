import { useAskQuestion, useProductQuestions, useSession } from '@vero/api-client';
import { parseLocalizedPath, STORE_ROUTES } from '@vero/config';
import type { ProductDetail } from '@vero/types';
import { Button, EmptyState, Form, PaginationBar, Skeleton, toast } from '@vero/ui';
import { createQuestionSchema } from '@vero/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { MessageCircleQuestionIcon, StoreIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { ErrorState } from '../../components/common/states';
import { TextareaField } from '../../components/form/fields';
import { useFormat } from '../../hooks/use-format';
import { LocaleLink } from '../../hooks/use-lang';
import { handleFormError } from '../../lib/errors';
import { withQuery } from '../../lib/paths';

function AskForm({ productId }: { productId: string }) {
  const { t } = useTranslation();
  const ask = useAskQuestion();
  const form = useForm({ resolver: zodResolver(createQuestionSchema), defaultValues: { productId, question: '' } });
  const onSubmit = form.handleSubmit((values) =>
    ask.mutate(values, {
      onSuccess: () => {
        toast.success(t('shop:questions.submitted'));
        form.reset({ productId, question: '' });
      },
      onError: (e) => handleFormError(t, form, e),
    }),
  );
  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <TextareaField control={form.control} name="question" label={t('shop:questions.ask')} placeholder={t('shop:questions.placeholder')} rows={3} maxLength={1000} />
        <Button type="submit" loading={ask.isPending} className="self-start">
          {t('common:actions.send')}
        </Button>
      </form>
    </Form>
  );
}

/** Published questions with the store's answers + the ask form. */
export function Questions({ product }: { product: ProductDetail }) {
  const { t } = useTranslation();
  const f = useFormat();
  const session = useSession();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const questions = useProductQuestions(product.id, { page, limit: 5 });
  const here = `${parseLocalizedPath(location.pathname).path}#questions`;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-10">
      <div className="lg:sticky lg:top-[calc(var(--header-offset)+1rem)] lg:self-start">
        {!session.isReady ? null : session.isAuthenticated ? (
          <AskForm productId={product.id} />
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-sm">
            <p className="text-muted-foreground">{t('shop:questions.loginToAsk')}</p>
            <Button variant="outline" asChild className="self-start">
              <LocaleLink to={withQuery(STORE_ROUTES.login, { next: here })}>{t('common:nav.login')}</LocaleLink>
            </Button>
          </div>
        )}
      </div>
      <div className="min-w-0">
        {questions.isPending ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 2 }, (_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : questions.isError ? (
          <ErrorState compact error={questions.error} onRetry={() => void questions.refetch()} />
        ) : !questions.data.items.length ? (
          <EmptyState size="sm" bordered icon={<MessageCircleQuestionIcon />} title={t('shop:questions.empty')} />
        ) : (
          <div className="flex flex-col">
            {questions.data.items.map((q) => (
              <article key={q.id} className="flex flex-col gap-2.5 border-b border-border py-5 first:pt-0 last:border-0">
                <header className="flex flex-wrap items-center gap-x-3 text-sm">
                  <span className="font-semibold">{q.author.name}</span>
                  <time dateTime={q.createdAt} className="ms-auto text-xs text-muted-foreground">
                    {f.date(q.createdAt, 'long')}
                  </time>
                </header>
                <p className="text-sm leading-relaxed font-medium whitespace-pre-line">{q.question}</p>
                {q.answer ? (
                  <div className="flex flex-col gap-1 rounded-lg bg-surface p-3.5 text-sm">
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <StoreIcon className="size-4 text-primary dark:text-brand" aria-hidden="true" />
                      {t('shop:questions.answer')}
                      <span className="font-normal text-muted-foreground">· {q.answer.author}</span>
                    </span>
                    <p className="whitespace-pre-line text-muted-foreground">{q.answer.text}</p>
                  </div>
                ) : null}
              </article>
            ))}
            <PaginationBar
              className="mt-4"
              page={page}
              pages={questions.data.meta.pages}
              onPageChange={setPage}
              labels={{ previous: t('common:a11y.previous'), next: t('common:a11y.next'), page: (n) => t('common:a11y.page', { page: n }), morePages: t('common:a11y.morePages') }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

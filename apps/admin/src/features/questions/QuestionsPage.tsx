import { useAdminList, useAdminMutation, useSession } from '@vero/api-client';
import { QUESTION_STATUSES, type AdminQuestion, type QuestionStatus } from '@vero/types';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Label,
  Skeleton,
  Textarea,
  toast,
} from '@vero/ui';
import { CheckIcon, CircleHelpIcon, EllipsisIcon, EyeOffIcon, MessageSquareReplyIcon, Trash2Icon, XIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { StatusBadge } from '../../components/common/badges';
import { ConfirmDialog, useConfirm, useDialogTarget } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { StatusTabs, useFilterCounts } from '../../components/common/StatusTabs';
import { ErrorState } from '../../components/common/states';
import { ListFooter } from '../../components/data-table/ListFooter';
import { toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { useListState } from '../../lib/url-state';

type Change = { id: string; status?: QuestionStatus; answer?: string };

function AnswerDialog({ question, open, onOpenChange, onSave, pending }: { question: AdminQuestion | null; open: boolean; onOpenChange: (open: boolean) => void; onSave: (text: string) => Promise<void>; pending: boolean }) {
  const { t } = useTranslation();
  const id = useId();
  const [text, setText] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    if (open) {
      setText(question?.answer?.text ?? '');
      setError(false);
    }
  }, [open, question]);
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent size="md" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{t('questions.answerDialog.title')}</DialogTitle>
          <DialogDescription>{t('questions.answerDialog.description')}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex min-h-0 flex-1 flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) {
              setError(true);
              return;
            }
            void onSave(text.trim()).then(() => onOpenChange(false), () => undefined);
          }}
        >
          <DialogBody className="flex flex-col gap-3">
            {question ? <blockquote className="rounded-lg border-s-2 border-border bg-surface px-3 py-2 text-[13px] text-foreground">{question.question}</blockquote> : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-answer`} required>
                {t('questions.answerDialog.label')}
              </Label>
              <Textarea
                id={`${id}-answer`}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setError(false);
                }}
                rows={5}
                maxLength={2000}
                aria-invalid={error || undefined}
                autoFocus
              />
              {error ? <p className="text-[13px] font-medium text-danger">{t('validation:required')}</p> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={pending}>
              {t('questions.actions.answer')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function QuestionsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  usePageMeta(t('questions.title'));
  const list = useListState({ filters: ['status'] as const, defaultLimit: 20 });
  const query = useAdminList('questions', (api, p) => api.admin.questions.list(p), list.params);
  const counts = useFilterCounts('questions', (api, p) => api.admin.questions.list(p), list.params, 'status', QUESTION_STATUSES);
  const canModerate = can('reviews.moderate');
  const answerTo = useDialogTarget<AdminQuestion>();
  const del = useConfirm<AdminQuestion>();
  const change = useAdminMutation((api, v: Change) => api.admin.questions.answer(v.id, { status: v.status, answer: v.answer }), { invalidate: ['questions'] });
  const remove = useAdminMutation((api, id: string) => api.admin.questions.remove(id), { invalidate: ['questions'] });

  const run = async (v: Change) => {
    try {
      await change.mutateAsync(v);
      toast.success(v.answer ? t('questions.answered') : v.status === 'PUBLISHED' ? t('questions.published') : v.status === 'REJECTED' ? t('questions.rejected') : t('questions.unpublished'));
    } catch (error) {
      toastError(t, error);
      throw error;
    }
  };

  const items = query.data?.items;

  return (
    <Page>
      <PageHeader title={t('questions.title')} description={t('questions.description')} />
      <StatusTabs
        label={t('questions.statusTabs')}
        value={list.filters.status || ''}
        onChange={(key) => list.setFilter('status', key || null)}
        tabs={[{ key: '', label: t('table.all') }, ...QUESTION_STATUSES.map((s) => ({ key: s as string, label: t(`status.question.${s}`) }))].map((tab) => ({ ...tab, count: counts[tab.key] }))}
      />
      <section className="flex min-w-0 flex-col rounded-xl border border-border bg-card" aria-label={t('questions.title')} aria-busy={query.isFetching || undefined}>
        {query.isError && !items ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} className="py-12" />
        ) : !items ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <CircleHelpIcon className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-semibold">{t('questions.empty')}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{t('questions.emptyHint')}</p>
          </div>
        ) : (
          <ul className={query.isFetching ? 'opacity-70 transition-opacity' : undefined}>
            {items.map((q) => (
              <li key={q.id} className="flex flex-col gap-2.5 border-b border-border px-4 py-4 last:border-b-0 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Link to={`/products/${q.product.id}`} className="line-clamp-1 text-[13px] font-semibold text-foreground hover:underline">
                      {f.loc(q.product.name)}
                    </Link>
                    <span className="text-xs text-muted-foreground">{t('questions.asked', { name: q.user.name, date: f.datetime(q.createdAt) })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge kind="question" value={q.status} size="sm" />
                    {canModerate ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`${t('table.rowActions')}: ${q.user.name}`}>
                            <EllipsisIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          {q.status === 'PUBLISHED' ? (
                            <DropdownMenuItem onSelect={() => void run({ id: q.id, status: 'PENDING' }).catch(() => undefined)}>
                              <EyeOffIcon aria-hidden="true" />
                              {t('questions.actions.unpublish')}
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => del.ask(q)}>
                            <Trash2Icon aria-hidden="true" />
                            {t('questions.actions.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-line">{q.question}</p>
                {q.answer ? (
                  <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
                    <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <MessageSquareReplyIcon className="size-3.5" aria-hidden="true" />
                      {t('questions.answer')} · {t('questions.answeredBy', { name: q.answer.by, date: f.datetime(q.answer.createdAt) })}
                    </p>
                    <p className="text-[13px] leading-relaxed whitespace-pre-line">{q.answer.text}</p>
                  </div>
                ) : null}
                {canModerate ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="xs" variant={q.answer ? 'ghost' : 'outline'} leftIcon={<MessageSquareReplyIcon />} disabled={change.isPending} onClick={() => answerTo.ask(q)}>
                      {q.answer ? t('questions.actions.editAnswer') : t('questions.actions.answer')}
                    </Button>
                    {q.status !== 'PUBLISHED' && q.answer ? (
                      <Button size="xs" variant="outline" leftIcon={<CheckIcon />} disabled={change.isPending} onClick={() => void run({ id: q.id, status: 'PUBLISHED' }).catch(() => undefined)}>
                        {t('questions.actions.publish')}
                      </Button>
                    ) : null}
                    {q.status !== 'REJECTED' ? (
                      <Button size="xs" variant="outline" leftIcon={<XIcon />} disabled={change.isPending} onClick={() => void run({ id: q.id, status: 'REJECTED' }).catch(() => undefined)}>
                        {t('questions.actions.reject')}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {query.data ? <ListFooter page={list.page} limit={list.limit} total={query.data.meta.total} pages={query.data.meta.pages} onPageChange={list.setPage} onLimitChange={list.setLimit} /> : null}
      </section>

      <AnswerDialog
        question={answerTo.target}
        open={answerTo.open}
        onOpenChange={answerTo.onOpenChange}
        pending={change.isPending}
        onSave={async (text) => {
          if (!answerTo.target) return;
          await run({ id: answerTo.target.id, answer: text, status: 'PUBLISHED' });
        }}
      />
      <ConfirmDialog
        open={del.open}
        onOpenChange={del.onOpenChange}
        title={t('questions.deleteTitle')}
        description={t('questions.deleteText')}
        onConfirm={async () => {
          if (!del.target) return;
          try {
            await remove.mutateAsync(del.target.id);
            toast.success(t('form.deleted'));
          } catch (error) {
            toastError(t, error);
            throw error;
          }
        }}
      />
    </Page>
  );
}

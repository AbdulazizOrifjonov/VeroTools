import { useQueryClient } from '@tanstack/react-query';
import { useAdminMutation, useAdminQuery, useApi, useSession } from '@vero/api-client';
import { LANGUAGES } from '@vero/config';
import { FAQ_CATEGORIES, type AdminFaq } from '@vero/types';
import { Badge, Button, Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Form, Skeleton, toast } from '@vero/ui';
import { faqInputSchema } from '@vero/validation';
import { ArrowDownIcon, ArrowUpIcon, EllipsisIcon, EyeIcon, EyeOffIcon, MessageCircleQuestionIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { ConfirmDialog, useConfirm, useDialogTarget } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, Panel, usePageMeta } from '../../components/common/page';
import { ErrorState } from '../../components/common/states';
import { StatusTabs } from '../../components/common/StatusTabs';
import { SearchInput } from '../../components/data-table/toolbar';
import { FieldGrid } from '../../components/form/form-kit';
import { NumberField, SelectField, SwitchField } from '../../components/form/fields';
import { LocalizedField } from '../../components/form/LocalizedField';
import { handleFormError, toastError } from '../../lib/errors';
import { formResolver } from '../../lib/forms';
import { useFormat } from '../../lib/format';
import { useSearchParamState } from '../../lib/url-state';

type Values = z.input<typeof faqInputSchema>;
type Output = z.output<typeof faqInputSchema>;
const FAQ_KEY = ['admin', 'faq'];

const byOrder = (a: AdminFaq, b: AdminFaq) => a.order - b.order || a.id.localeCompare(b.id);

function FaqDialog({ item, items, defaultCategory, open, onOpenChange }: { item: AdminFaq | null; items: AdminFaq[]; defaultCategory: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const isNew = !item;
  const nextOrder = (category: string) => Math.max(0, ...items.filter((i) => i.category === category).map((i) => i.order)) + 10;
  const defaults = (): Values => {
    const category = (item?.category ?? (defaultCategory || 'general')) as Values['category'];
    return {
      category,
      question: { uz: '', ru: '', en: '', ...item?.question },
      answer: { uz: '', ru: '', en: '', ...item?.answer },
      order: item?.order ?? nextOrder(category),
      isActive: item?.isActive ?? true,
    };
  };
  const form = useForm<Values, unknown, Output>({ resolver: formResolver<Values, typeof faqInputSchema>(faqInputSchema), defaultValues: defaults() });
  useEffect(() => {
    if (open) form.reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when the dialog opens
  }, [open, item?.id]);
  const create = useAdminMutation((api, v: Output) => api.admin.faq.create(v), { invalidate: ['faq'] });
  const update = useAdminMutation((api, v: Output) => api.admin.faq.update(item!.id, v), { invalidate: ['faq'] });
  const pending = create.isPending || update.isPending;
  const submit = form.handleSubmit(async (values) => {
    try {
      if (isNew) await create.mutateAsync(values);
      else await update.mutateAsync(values);
      toast.success(isNew ? t('faq.created') : t('faq.saved'));
      onOpenChange(false);
    } catch (error) {
      handleFormError(t, form, error);
    }
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent size="lg" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{isNew ? t('faq.form.createTitle') : t('faq.form.editTitle')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="flex flex-col gap-4">
              <FieldGrid>
                <SelectField
                  name="category"
                  label={t('faq.category')}
                  required
                  options={FAQ_CATEGORIES.map((c) => ({ value: c, label: t(`enums.faqCategory.${c}`) }))}
                  onValueChange={(c) => isNew && form.setValue('order', nextOrder(c))}
                />
                <NumberField name="order" label={t('faq.form.order')} description={t('faq.form.orderHint')} />
              </FieldGrid>
              <LocalizedField name="question" label={t('faq.form.question')} required="all" maxLength={300} />
              <LocalizedField name="answer" label={t('faq.form.answer')} required="all" multiline rows={6} maxLength={4000} />
              <SwitchField name="isActive" label={t('faq.form.active')} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={pending}>
                {isNew ? t('common.create') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function FaqPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const api = useApi();
  const qc = useQueryClient();
  const { can } = useSession();
  usePageMeta(t('faq.title'));
  const canEdit = can('content.update');
  const query = useAdminQuery(['faq'], (a) => a.admin.faq.list());
  const [category, setCategory] = useSearchParamState('category');
  const [q, setQ] = useSearchParamState('q');
  const edit = useDialogTarget<AdminFaq | null>();
  const del = useConfirm<AdminFaq>();
  const [busy, setBusy] = useState(false);
  const toggle = useAdminMutation((a, v: { id: string; isActive: boolean }) => a.admin.faq.update(v.id, { isActive: v.isActive }), { invalidate: ['faq'] });
  const remove = useAdminMutation((a, id: string) => a.admin.faq.remove(id), { invalidate: ['faq'] });

  const items = useMemo(() => query.data ?? [], [query.data]);
  const needle = q.trim().toLowerCase();
  const matches = (i: AdminFaq) => !needle || LANGUAGES.some((l) => (i.question[l] ?? '').toLowerCase().includes(needle) || (i.answer[l] ?? '').toLowerCase().includes(needle));
  const counts = useMemo(() => {
    const out: Record<string, number> = { '': 0 };
    for (const i of items.filter(matches)) {
      out[''] = (out[''] ?? 0) + 1;
      out[i.category] = (out[i.category] ?? 0) + 1;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, needle]);
  const groups = FAQ_CATEGORIES.filter((c) => !category || c === category)
    .map((c) => ({ category: c, items: items.filter((i) => i.category === c && matches(i)).sort(byOrder) }))
    .filter((g) => g.items.length > 0);

  /** Swaps an item with its neighbour and renumbers the topic 10, 20, 30… (only changed rows are saved). */
  const move = async (item: AdminFaq, dir: -1 | 1) => {
    const siblings = items.filter((i) => i.category === item.category).sort(byOrder);
    const index = siblings.findIndex((i) => i.id === item.id);
    const target = index + dir;
    if (target < 0 || target >= siblings.length) return;
    const next = [...siblings];
    [next[index], next[target]] = [next[target]!, next[index]!];
    const renumbered = next.map((i, n) => ({ ...i, order: (n + 1) * 10 }));
    const changed = renumbered.filter((i) => siblings.find((s) => s.id === i.id)!.order !== i.order);
    qc.setQueryData<AdminFaq[]>(FAQ_KEY, (old) => old?.map((o) => renumbered.find((r) => r.id === o.id) ?? o));
    setBusy(true);
    try {
      await Promise.all(changed.map((i) => api.admin.faq.update(i.id, { order: i.order })));
    } catch (error) {
      toastError(t, error);
    } finally {
      setBusy(false);
      void qc.invalidateQueries({ queryKey: FAQ_KEY });
    }
  };

  const tabs = [{ key: '', label: t('table.all'), count: counts[''] }, ...FAQ_CATEGORIES.map((c) => ({ key: c, label: t(`enums.faqCategory.${c}`), count: counts[c] ?? 0 }))];

  return (
    <Page>
      <PageHeader
        title={t('faq.title')}
        description={t('faq.description')}
        actions={
          canEdit ? (
            <Button leftIcon={<PlusIcon />} onClick={() => edit.ask(null)}>
              {t('faq.add')}
            </Button>
          ) : undefined
        }
      />
      {query.isError && !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <StatusTabs label={t('faq.category')} tabs={tabs} value={category} onChange={(k) => setCategory(k || null)} />
            <SearchInput value={q} onChange={(v) => setQ(v || null)} placeholder={t('faq.searchPlaceholder')} className="sm:w-80" />
          </div>
          {!query.data ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <Panel>
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <MessageCircleQuestionIcon className="size-8 text-muted-foreground" aria-hidden="true" />
                <p className="font-semibold">{items.length ? t('faq.emptyFiltered') : t('faq.empty')}</p>
              </div>
            </Panel>
          ) : (
            groups.map((g) => (
              <Panel key={g.category} flush title={t(`enums.faqCategory.${g.category}`)} description={t('faq.count', { count: g.items.length })}>
                <ol className="divide-y divide-border border-t border-border">
                  {g.items.map((item, index) => {
                    const question = f.loc(item.question);
                    return (
                      <li key={item.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                        {canEdit ? (
                          <div className="flex shrink-0 flex-col">
                            <Button variant="ghost" size="icon-sm" className="size-7" disabled={index === 0 || busy || !!needle} onClick={() => void move(item, -1)} aria-label={`${t('common.moveUp')}: ${question}`}>
                              <ArrowUpIcon />
                            </Button>
                            <Button variant="ghost" size="icon-sm" className="size-7" disabled={index === g.items.length - 1 || busy || !!needle} onClick={() => void move(item, 1)} aria-label={`${t('common.moveDown')}: ${question}`}>
                              <ArrowDownIcon />
                            </Button>
                          </div>
                        ) : null}
                        <div className={item.isActive ? 'flex min-w-0 flex-1 flex-col gap-1' : 'flex min-w-0 flex-1 flex-col gap-1 opacity-60'}>
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" className="text-start text-sm font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring disabled:no-underline" onClick={() => canEdit && edit.ask(item)} disabled={!canEdit}>
                              {question}
                            </button>
                            {!item.isActive ? (
                              <Badge variant="muted" size="sm">
                                {t('faq.hidden')}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="line-clamp-2 text-[13px] text-muted-foreground">{f.loc(item.answer)}</p>
                        </div>
                        {canEdit ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" aria-label={`${t('table.rowActions')}: ${question}`}>
                                <EllipsisIcon />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onSelect={() => edit.ask(item)}>
                                <PencilIcon aria-hidden="true" />
                                {t('common.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={async () => {
                                  try {
                                    await toggle.mutateAsync({ id: item.id, isActive: !item.isActive });
                                    toast.success(item.isActive ? t('faq.hiddenDone') : t('faq.shown'));
                                  } catch (error) {
                                    toastError(t, error);
                                  }
                                }}
                              >
                                {item.isActive ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
                                {item.isActive ? t('faq.hide') : t('faq.show')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onSelect={() => del.ask(item)}>
                                <Trash2Icon aria-hidden="true" />
                                {t('common.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </Panel>
            ))
          )}
        </div>
      )}
      <FaqDialog item={edit.target} items={items} defaultCategory={category} open={edit.open} onOpenChange={edit.onOpenChange} />
      <ConfirmDialog
        open={del.open}
        onOpenChange={del.onOpenChange}
        title={t('faq.deleteTitle')}
        description={del.target ? t('faq.deleteText', { question: f.loc(del.target.question) }) : undefined}
        onConfirm={async () => {
          if (!del.target) return;
          try {
            await remove.mutateAsync(del.target.id);
            toast.success(t('faq.deleted'));
          } catch (error) {
            toastError(t, error);
            throw error;
          }
        }}
      />
    </Page>
  );
}

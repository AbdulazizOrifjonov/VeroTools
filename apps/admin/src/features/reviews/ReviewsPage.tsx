import { useAdminList, useAdminMutation, useSession } from '@vero/api-client';
import { REVIEW_STATUSES, type AdminReview, type ReviewStatus } from '@vero/types';
import {
  Button,
  Checkbox,
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
  RatingStars,
  Skeleton,
  Textarea,
  toast,
} from '@vero/ui';
import { BadgeCheckIcon, CheckIcon, EllipsisIcon, MessageSquareReplyIcon, MessagesSquareIcon, RotateCcwIcon, Trash2Icon, XIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { StatusBadge } from '../../components/common/badges';
import { ConfirmDialog, useConfirm, useDialogTarget } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { StatusTabs, useFilterCounts } from '../../components/common/StatusTabs';
import { ErrorState } from '../../components/common/states';
import { Thumb } from '../../components/common/Thumb';
import { ListFooter } from '../../components/data-table/ListFooter';
import { FilterSelect, SearchInput } from '../../components/data-table/toolbar';
import { toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { assetUrl, imageRefThumb } from '../../lib/images';
import { useListState } from '../../lib/url-state';
import { ProductFilter } from '../catalog/product-picker';

const FILTERS = ['status', 'rating', 'product'] as const;

type Moderation = { id: string; status?: ReviewStatus; reply?: string };

function ReplyDialog({ review, open, onOpenChange, onSave, pending }: { review: AdminReview | null; open: boolean; onOpenChange: (open: boolean) => void; onSave: (text: string, approve: boolean) => Promise<void>; pending: boolean }) {
  const { t } = useTranslation();
  const id = useId();
  const [text, setText] = useState('');
  const [approve, setApprove] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (open) {
      setText(review?.reply?.text ?? '');
      setApprove(review?.status !== 'APPROVED');
      setError(false);
    }
  }, [open, review]);
  const needsApproval = review?.status !== 'APPROVED';
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent size="md" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{t('reviews.replyDialog.title')}</DialogTitle>
          <DialogDescription>{t('reviews.replyDialog.description')}</DialogDescription>
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
            void onSave(text.trim(), needsApproval && approve).then(() => onOpenChange(false), () => undefined);
          }}
        >
          <DialogBody className="flex flex-col gap-3">
            {review ? <blockquote className="rounded-lg border-s-2 border-border bg-surface px-3 py-2 text-[13px] text-muted-foreground">{review.comment}</blockquote> : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-reply`} required>
                {t('reviews.replyDialog.label')}
              </Label>
              <Textarea
                id={`${id}-reply`}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setError(false);
                }}
                rows={5}
                maxLength={2000}
                placeholder={t('reviews.replyDialog.placeholder')}
                aria-invalid={error || undefined}
                autoFocus
              />
              {error ? <p className="text-[13px] font-medium text-danger">{t('validation:required')}</p> : null}
            </div>
            {needsApproval ? (
              <label className="flex items-center gap-2 text-[13px]">
                <Checkbox checked={approve} onCheckedChange={(v) => setApprove(!!v)} />
                {t('reviews.replyDialog.approveToo')}
              </label>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={pending}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReviewCard({ review, canModerate, onModerate, onReply, onDelete, busy }: { review: AdminReview; canModerate: boolean; onModerate: (v: Moderation) => void; onReply: () => void; onDelete: () => void; busy: boolean }) {
  const { t } = useTranslation();
  const f = useFormat();
  const r = review;
  return (
    <article className="flex flex-col gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:px-5" aria-labelledby={`review-${r.id}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Thumb src={imageRefThumb(r.product.image)} size="md" alt="" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <Link id={`review-${r.id}`} to={`/products/${r.product.id}`} className="line-clamp-1 text-[13px] font-semibold text-foreground hover:underline">
              {f.loc(r.product.name)}
            </Link>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{r.user.name}</span>
              {r.user.phone ? <span className="tabular">{f.phone(r.user.phone)}</span> : null}
              <span>·</span>
              <time dateTime={r.createdAt}>{f.datetime(r.createdAt)}</time>
              {r.isVerifiedPurchase ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <BadgeCheckIcon className="size-3.5" aria-hidden="true" />
                  {t('reviews.verified')}
                </span>
              ) : null}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge kind="review" value={r.status} size="sm" />
          {canModerate ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`${t('table.rowActions')}: ${r.user.name}`}>
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {r.status !== 'PENDING' ? (
                  <DropdownMenuItem onSelect={() => onModerate({ id: r.id, status: 'PENDING' })}>
                    <RotateCcwIcon aria-hidden="true" />
                    {t('reviews.actions.pending')}
                  </DropdownMenuItem>
                ) : null}
                {r.reply ? (
                  <DropdownMenuItem onSelect={() => onModerate({ id: r.id, reply: '' })}>
                    <XIcon aria-hidden="true" />
                    {t('reviews.actions.removeReply')}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2Icon aria-hidden="true" />
                  {t('reviews.actions.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </header>

      <div className="flex flex-col gap-1.5 ps-0 sm:ps-15">
        <div className="flex flex-wrap items-center gap-2">
          <RatingStars value={r.rating} size="sm" label={t('reviews.ratingValue', { count: r.rating })} />
          {r.title ? <h3 className="text-sm font-semibold">{r.title}</h3> : null}
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">{r.comment}</p>
        {r.pros || r.cons ? (
          <dl className="grid gap-2 text-[13px] sm:grid-cols-2">
            {r.pros ? (
              <div>
                <dt className="font-semibold text-success">{t('reviews.pros')}</dt>
                <dd className="whitespace-pre-line text-muted-foreground">{r.pros}</dd>
              </div>
            ) : null}
            {r.cons ? (
              <div>
                <dt className="font-semibold text-danger">{t('reviews.cons')}</dt>
                <dd className="whitespace-pre-line text-muted-foreground">{r.cons}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        {r.images.length ? (
          <ul className="flex flex-wrap gap-2 pt-1" aria-label={t('reviews.photos', { count: r.images.length })}>
            {r.images.map((img, i) => (
              <li key={`${img.url}-${i}`}>
                <a href={assetUrl(img.url)} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-border focus-visible:outline-2 focus-visible:outline-ring" aria-label={`${t('reviews.openPhoto')} ${i + 1}`}>
                  <img src={imageRefThumb(img)} alt="" className="size-16 object-cover" loading="lazy" />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        {r.reply ? (
          <div className="mt-1 rounded-lg border border-border bg-surface px-3 py-2.5">
            <p className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
              <MessageSquareReplyIcon className="size-3.5" aria-hidden="true" />
              {t('reviews.storeReply')} · {r.reply.by} · {f.datetime(r.reply.createdAt)}
            </p>
            <p className="text-[13px] leading-relaxed whitespace-pre-line">{r.reply.text}</p>
          </div>
        ) : null}
        {canModerate ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {r.status !== 'APPROVED' ? (
              <Button size="xs" variant="outline" leftIcon={<CheckIcon />} disabled={busy} onClick={() => onModerate({ id: r.id, status: 'APPROVED' })}>
                {t('reviews.actions.approve')}
              </Button>
            ) : null}
            {r.status !== 'REJECTED' ? (
              <Button size="xs" variant="outline" leftIcon={<XIcon />} disabled={busy} onClick={() => onModerate({ id: r.id, status: 'REJECTED' })}>
                {t('reviews.actions.reject')}
              </Button>
            ) : null}
            <Button size="xs" variant="ghost" leftIcon={<MessageSquareReplyIcon />} disabled={busy} onClick={onReply}>
              {r.reply ? t('reviews.actions.editReply') : t('reviews.actions.reply')}
            </Button>
            {r.moderatedAt ? <span className="ms-auto text-xs text-muted-foreground">{t('reviews.moderated', { date: f.datetime(r.moderatedAt) })}</span> : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function ReviewsPage() {
  const { t } = useTranslation();
  const { can } = useSession();
  usePageMeta(t('reviews.title'));
  const list = useListState({ filters: FILTERS, defaultLimit: 20 });
  const query = useAdminList('reviews', (api, p) => api.admin.reviews.list(p), list.params);
  const counts = useFilterCounts('reviews', (api, p) => api.admin.reviews.list(p), list.params, 'status', REVIEW_STATUSES);
  const canModerate = can('reviews.moderate');
  const replyTo = useDialogTarget<AdminReview>();
  const del = useConfirm<AdminReview>();

  const moderate = useAdminMutation((api, v: Moderation) => api.admin.reviews.moderate(v.id, { status: v.status, reply: v.reply }), { invalidate: ['reviews', 'products'] });
  const remove = useAdminMutation((api, id: string) => api.admin.reviews.remove(id), { invalidate: ['reviews', 'products'] });

  const run = async (v: Moderation) => {
    try {
      await moderate.mutateAsync(v);
      if (v.reply !== undefined) toast.success(v.reply ? t('reviews.replySaved') : t('reviews.replyRemoved'));
      else toast.success(v.status === 'APPROVED' ? t('reviews.approved') : v.status === 'REJECTED' ? t('reviews.rejected') : t('reviews.pendingDone'));
    } catch (error) {
      toastError(t, error);
      throw error;
    }
  };

  const filtered = !!list.q || !!list.filters.rating || !!list.filters.product;
  const items = query.data?.items;

  return (
    <Page>
      <PageHeader title={t('reviews.title')} description={t('reviews.description')} />
      <StatusTabs
        label={t('reviews.statusTabs')}
        value={list.filters.status || ''}
        onChange={(key) => list.setFilter('status', key || null)}
        tabs={[{ key: '', label: t('table.all') }, ...REVIEW_STATUSES.map((s) => ({ key: s as string, label: t(`status.review.${s}`) }))].map((tab) => ({ ...tab, count: counts[tab.key] }))}
      />
      <section className="flex min-w-0 flex-col rounded-xl border border-border bg-card" aria-label={t('reviews.title')} aria-busy={query.isFetching || undefined}>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <SearchInput value={list.q} onChange={list.setQ} placeholder={t('reviews.searchPlaceholder')} className="sm:w-72" />
          <FilterSelect label={t('reviews.rating')} value={list.filters.rating} onChange={(v) => list.setFilter('rating', v)} options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: t('reviews.ratingValue', { count: n }) }))} />
          <div className="w-full sm:w-72">
            <ProductFilter value={list.filters.product} onChange={(v) => list.setFilter('product', v)} placeholder={t('reviews.allProducts')} className="h-8 text-[13px]" />
          </div>
          {filtered ? (
            <Button variant="ghost" size="sm" onClick={() => list.resetOnly(['rating', 'product'])}>
              {t('table.resetFilters')}
            </Button>
          ) : null}
        </div>
        {query.isError && !items ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} className="py-12" />
        ) : !items ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <MessagesSquareIcon className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-semibold">{filtered ? t('table.noResultsTitle') : t('reviews.empty')}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{filtered ? t('table.noResultsText') : t('reviews.emptyHint')}</p>
          </div>
        ) : (
          <div className={query.isFetching ? 'opacity-70 transition-opacity' : undefined}>
            {items.map((r) => (
              <ReviewCard key={r.id} review={r} canModerate={canModerate} busy={moderate.isPending} onModerate={(v) => void run(v).catch(() => undefined)} onReply={() => replyTo.ask(r)} onDelete={() => del.ask(r)} />
            ))}
          </div>
        )}
        {query.data ? <ListFooter page={list.page} limit={list.limit} total={query.data.meta.total} pages={query.data.meta.pages} onPageChange={list.setPage} onLimitChange={list.setLimit} /> : null}
      </section>

      <ReplyDialog
        review={replyTo.target}
        open={replyTo.open}
        onOpenChange={replyTo.onOpenChange}
        pending={moderate.isPending}
        onSave={async (text, approve) => {
          if (!replyTo.target) return;
          await run({ id: replyTo.target.id, reply: text, status: approve ? 'APPROVED' : undefined });
        }}
      />
      <ConfirmDialog
        open={del.open}
        onOpenChange={del.onOpenChange}
        title={t('reviews.deleteTitle')}
        description={t('reviews.deleteText')}
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

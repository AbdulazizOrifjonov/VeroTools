import { useQueryClient } from '@tanstack/react-query';
import { useAdminList, useAdminMutation, useApi, useSession } from '@vero/api-client';
import type { LocalizedText } from '@vero/config';
import { MEDIA_FOLDERS, type AdminMedia, type MediaFolder } from '@vero/types';
import {
  Button,
  cn,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Form,
  Label,
  NativeSelect,
  NativeSelectOption,
  Progress,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Skeleton,
  Switch,
  toast,
  ToggleGroup,
  ToggleGroupItem,
} from '@vero/ui';
import { mediaUpdateSchema } from '@vero/validation';
import { ExternalLinkIcon, FileTextIcon, ImagesIcon, LayoutGridIcon, ListIcon, RefreshCwIcon, Trash2Icon, UploadIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { CopyButton } from '../../components/common/CopyButton';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { ErrorState } from '../../components/common/states';
import { ListFooter } from '../../components/data-table/ListFooter';
import { FilterSelect, SearchInput } from '../../components/data-table/toolbar';
import { SelectField } from '../../components/form/fields';
import { LocalizedField } from '../../components/form/LocalizedField';
import { TagsField } from '../../components/form/pickers';
import { UploadDropzone } from '../../components/media/UploadDropzone';
import { apiErrorCode, handleFormError, toastError, type ApiError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { formResolver } from '../../lib/forms';
import { assetUrl, formatBytes, thumbOf } from '../../lib/images';
import { ADMIN_STORAGE, readString, writeString } from '../../lib/storage';
import { IMAGE_ACCEPT, replaceMediaFile, uploadMedia } from '../../lib/upload';
import { useListState } from '../../lib/url-state';

const FILTERS = ['folder', 'type', 'unused'] as const;
type View = 'grid' | 'list';

const isImage = (m: AdminMedia) => m.mime.startsWith('image/');

function UploadDialog({ open, onOpenChange, defaultFolder }: { open: boolean; onOpenChange: (open: boolean) => void; defaultFolder: MediaFolder }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const id = useId();
  const [folder, setFolder] = useState<MediaFolder>(defaultFolder);
  useEffect(() => {
    if (open) setFolder(defaultFolder);
  }, [open, defaultFolder]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{t('media.uploadFiles')}</DialogTitle>
          <DialogDescription>{t('media.dropHintWebp')}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4 pb-2">
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <Label htmlFor={`${id}-folder`}>{t('media.uploadTo')}</Label>
            <NativeSelect id={`${id}-folder`} value={folder} onChange={(e) => setFolder(e.target.value as MediaFolder)}>
              {MEDIA_FOLDERS.map((fo) => (
                <NativeSelectOption key={fo} value={fo}>
                  {t(`enums.mediaFolder.${fo}`)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <UploadDropzone<AdminMedia>
            accept={IMAGE_ACCEPT}
            upload={(files, onProgress) => uploadMedia(files, folder, onProgress)}
            onUploaded={(items) => {
              void qc.invalidateQueries({ queryKey: ['admin', 'media'] });
              toast.success(t('media.uploaded', { count: items.length }));
            }}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

type MetaValues = { alt: LocalizedText; tags: string[]; folder: MediaFolder };
type MetaOutput = z.output<typeof mediaUpdateSchema>;

function MediaDetails({ media, open, onOpenChange, onDeleted }: { media: AdminMedia | null; open: boolean; onOpenChange: (open: boolean) => void; onDeleted: () => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const api = useApi();
  const qc = useQueryClient();
  const { can } = useSession();
  const canEdit = can('media.upload');
  const canDelete = can('media.delete');
  const fileRef = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [inUse, setInUse] = useState<number | null>(null);
  const form = useForm<MetaValues, unknown, MetaOutput>({
    resolver: formResolver<MetaValues, typeof mediaUpdateSchema>(mediaUpdateSchema),
    defaultValues: { alt: { uz: '', ru: '', en: '' }, tags: [], folder: 'general' },
  });
  useEffect(() => {
    if (open && media) form.reset({ alt: { uz: media.alt.uz ?? '', ru: media.alt.ru ?? '', en: media.alt.en ?? '' }, tags: media.tags, folder: media.folder });
  }, [open, media, form]);
  const save = useAdminMutation((a, v: MetaOutput) => a.admin.media.update(media!.id, v), { invalidate: ['media'] });

  if (!media) return null;
  const image = isImage(media);

  const submit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
      toast.success(t('form.saved'));
    } catch (error) {
      handleFormError(t, form, error);
    }
  });

  const replace = async (file: File) => {
    setReplacing(0);
    try {
      await replaceMediaFile(media.id, file, (p) => setReplacing(Math.round(p * 100)));
      await qc.invalidateQueries({ queryKey: ['admin'] });
      toast.success(t('media.replaced'));
    } catch (error) {
      toastError(t, error);
    } finally {
      setReplacing(null);
    }
  };

  const remove = async (force: boolean) => {
    try {
      await api.admin.media.remove(encodeURIComponent(media.id), { force });
      await qc.invalidateQueries({ queryKey: ['admin', 'media'] });
      toast.success(t('form.deleted'));
      setInUse(null);
      onDeleted();
    } catch (error) {
      if (apiErrorCode(error) === 'IN_USE') {
        const details = (error as ApiError).details as { usageCount?: number } | undefined;
        setInUse(details?.usageCount ?? media.usageCount ?? 1);
        return;
      }
      toastError(t, error);
      throw error;
    }
  };

  const urls = [
    { label: t('media.original'), url: media.url },
    media.mediumUrl ? { label: t('media.medium'), url: media.mediumUrl } : null,
    media.thumbUrl ? { label: t('media.thumb'), url: media.thumbUrl } : null,
  ].filter((u): u is { label: string; url: string } => !!u);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="sm:max-w-lg"
          closeLabel={t('common.close')}
          // focus the panel itself (announced by its title) instead of the first copy button and its tooltip
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)?.focus();
          }}
        >
          <SheetHeader>
            <SheetTitle className="truncate">{media.originalName}</SheetTitle>
            <SheetDescription>{t('media.details')}</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-5 pb-6">
            <div className="img-well flex aspect-[4/3] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-well">
              {image ? <img src={assetUrl(media.mediumUrl ?? media.url)} alt={f.loc(media.alt)} className="size-full object-contain" /> : <FileTextIcon className="size-12 text-muted-foreground" aria-hidden="true" />}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
              <div>
                <dt className="text-xs text-muted-foreground">{t('media.size')}</dt>
                <dd className="font-medium tabular">{formatBytes(media.size)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('media.dimensions')}</dt>
                <dd className="font-medium tabular">{media.width && media.height ? `${media.width} × ${media.height}` : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('media.type')}</dt>
                <dd className="font-mono text-xs">{media.mime}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('media.usage')}</dt>
                <dd className="font-medium">{t('media.usedTimes', { count: media.usageCount })}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('media.uploadedBy')}</dt>
                <dd className="font-medium">{media.uploadedBy?.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('media.uploadedAt')}</dt>
                <dd className="font-medium tabular">{f.datetime(media.createdAt)}</dd>
              </div>
            </dl>
            <section className="flex flex-col gap-2" aria-label={t('media.urls')}>
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('media.urls')}</h3>
              {urls.map((u) => (
                <div key={u.label} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
                  <span className="w-28 shrink-0 text-xs text-muted-foreground">{u.label}</span>
                  <code className="min-w-0 flex-1 truncate font-mono text-xs">{u.url}</code>
                  <CopyButton value={u.url} />
                  <a href={assetUrl(u.url)} target="_blank" rel="noopener noreferrer" className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={t('media.openOriginal')}>
                    <ExternalLinkIcon className="size-3.5" />
                  </a>
                </div>
              ))}
            </section>
            <Form {...form}>
              <form id="media-meta" onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
                <fieldset disabled={!canEdit} className="contents">
                  <LocalizedField name="alt" label={t('media.alt')} description={t('media.altHint')} maxLength={200} />
                  <TagsField name="tags" label={t('media.tags')} />
                  <SelectField name="folder" label={t('media.folder')} options={MEDIA_FOLDERS.map((fo) => ({ value: fo, label: t(`enums.mediaFolder.${fo}`) }))} />
                </fieldset>
              </form>
            </Form>
            {canEdit && image ? (
              <section className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{t('media.replaceFile')}</span>
                  <Button type="button" variant="outline" size="sm" leftIcon={<RefreshCwIcon />} loading={replacing !== null} onClick={() => fileRef.current?.click()}>
                    {t('media.replaceFile')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('media.replaceHint')}</p>
                {replacing !== null ? <Progress value={replacing} size="sm" aria-label={t('media.uploading', { name: media.originalName })} /> : null}
                <input
                  ref={fileRef}
                  type="file"
                  accept={IMAGE_ACCEPT}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void replace(file);
                  }}
                />
              </section>
            ) : null}
          </SheetBody>
          {canEdit || canDelete ? (
            <SheetFooter className="flex-row items-center justify-between">
              {canDelete ? (
                <Button type="button" variant="ghost" className="text-danger hover:text-danger" leftIcon={<Trash2Icon />} onClick={() => setConfirmDelete(true)}>
                  {t('common.delete')}
                </Button>
              ) : (
                <span />
              )}
              {canEdit ? (
                <Button type="submit" form="media-meta" loading={save.isPending}>
                  {t('media.saveMeta')}
                </Button>
              ) : null}
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={t('media.deleteTitle')} description={t('media.deleteText', { name: media.originalName })} onConfirm={() => remove(false)} />
      <ConfirmDialog
        open={inUse !== null}
        onOpenChange={(o) => !o && setInUse(null)}
        title={t('media.inUseTitle')}
        description={
          <>
            {t('media.inUseText', { count: inUse ?? 0 })} <span className="mt-2 block text-xs">{t('media.forceHint')}</span>
          </>
        }
        confirmLabel={t('media.forceDelete')}
        onConfirm={() => remove(true)}
      />
    </>
  );
}

export default function MediaLibraryPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  usePageMeta(t('media.title'));
  const list = useListState({ filters: FILTERS, defaultLimit: 50 });
  const query = useAdminList('media', (api, p) => api.admin.media.list(p), list.params);
  const [view, setViewState] = useState<View>(() => (readString(ADMIN_STORAGE.mediaView) === 'list' ? 'list' : 'grid'));
  const setView = (v: View) => {
    setViewState(v);
    writeString(ADMIN_STORAGE.mediaView, v);
  };
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const items = query.data?.items;
  const selected = items?.find((m) => m.id === selectedId) ?? null;
  const filtered = list.activeFilterCount > 0 || !!list.q;

  const open = (m: AdminMedia) => {
    setSelectedId(m.id);
    setDetailsOpen(true);
  };

  return (
    <Page>
      <PageHeader
        title={t('media.title')}
        description={t('media.description')}
        actions={
          can('media.upload') ? (
            <Button leftIcon={<UploadIcon />} onClick={() => setUploadOpen(true)}>
              {t('media.uploadFiles')}
            </Button>
          ) : undefined
        }
      />
      <section className="flex min-w-0 flex-col rounded-xl border border-border bg-card" aria-label={t('media.title')} aria-busy={query.isFetching || undefined}>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <SearchInput value={list.q} onChange={list.setQ} placeholder={t('media.searchPlaceholder')} className="sm:w-72" />
          <FilterSelect label={t('media.folder')} value={list.filters.folder} onChange={(v) => list.setFilter('folder', v)} options={MEDIA_FOLDERS.map((fo) => ({ value: fo, label: t(`enums.mediaFolder.${fo}`) }))} />
          <FilterSelect
            label={t('media.type')}
            value={list.filters.type}
            onChange={(v) => list.setFilter('type', v)}
            options={[
              { value: 'image', label: t('media.typeImage') },
              { value: 'document', label: t('media.typeDocument') },
            ]}
          />
          <label className="flex h-8 items-center gap-2 rounded-md border border-input px-2.5 text-[13px]">
            <Switch size="sm" checked={list.filters.unused === '1'} onCheckedChange={(v) => list.setFilter('unused', v ? '1' : null)} />
            {t('media.unusedOnly')}
          </label>
          {filtered ? (
            <Button variant="ghost" size="sm" onClick={list.reset}>
              {t('table.resetFilters')}
            </Button>
          ) : null}
          <ToggleGroup type="single" size="sm" variant="outline" value={view} onValueChange={(v) => v && setView(v as View)} aria-label={t('media.view')} className="ms-auto">
            <ToggleGroupItem value="grid" aria-label={t('media.grid')}>
              <LayoutGridIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label={t('media.list')}>
              <ListIcon />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {query.isError && !items ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} className="py-12" />
        ) : !items ? (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8">
            {Array.from({ length: 16 }, (_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
            <ImagesIcon className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-semibold">{filtered ? t('table.noResultsTitle') : t('media.empty')}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{filtered ? t('table.noResultsText') : t('media.emptyHint')}</p>
            {!filtered && can('media.upload') ? (
              <Button size="sm" leftIcon={<UploadIcon />} onClick={() => setUploadOpen(true)}>
                {t('media.uploadFiles')}
              </Button>
            ) : null}
          </div>
        ) : view === 'grid' ? (
          <ul className={cn('grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8', query.isFetching && 'opacity-70')}>
            {items.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => open(m)}
                  className={cn(
                    'group flex w-full flex-col overflow-hidden rounded-lg border bg-card text-start transition-[border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    selectedId === m.id && detailsOpen ? 'border-primary shadow-[0_0_0_1px_var(--primary)]' : 'border-border hover:border-[color-mix(in_oklab,var(--border),var(--foreground)_25%)]',
                  )}
                >
                  <span className="img-well relative flex aspect-square items-center justify-center bg-well">
                    {isImage(m) ? <img src={thumbOf(m)} alt={f.loc(m.alt) || m.originalName} loading="lazy" decoding="async" className="size-full object-contain" /> : <FileTextIcon className="size-8 text-muted-foreground" aria-hidden="true" />}
                    {m.usageCount ? (
                      <span className="absolute start-1.5 top-1.5 rounded-xs bg-black/55 px-1 text-[10px] font-semibold text-white tabular" title={t('media.usedTimes', { count: m.usageCount })}>
                        ×{m.usageCount}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex flex-col gap-0.5 border-t border-border px-2 py-1.5">
                    <span className="truncate text-xs font-medium">{m.originalName}</span>
                    <span className="truncate text-[11px] text-muted-foreground tabular">
                      {m.width && m.height ? `${m.width}×${m.height} · ` : ''}
                      {formatBytes(m.size)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className={cn('overflow-x-auto', query.isFetching && 'opacity-70')}>
            <table className="w-full text-[13px]">
              <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-start font-semibold">{t('media.file')}</th>
                  <th scope="col" className="px-3 py-2.5 text-start font-semibold">{t('media.folder')}</th>
                  <th scope="col" className="px-3 py-2.5 text-end font-semibold">{t('media.size')}</th>
                  <th scope="col" className="px-3 py-2.5 text-end font-semibold">{t('media.dimensions')}</th>
                  <th scope="col" className="px-3 py-2.5 text-start font-semibold">{t('media.usage')}</th>
                  <th scope="col" className="px-3 py-2.5 text-start font-semibold">{t('media.uploadedBy')}</th>
                  <th scope="col" className="px-4 py-2.5 text-start font-semibold">{t('media.uploadedAt')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((m) => (
                  <tr key={m.id} className="cursor-pointer hover:bg-accent/40" onClick={() => open(m)}>
                    <td className="px-4 py-2">
                      <button type="button" onClick={() => open(m)} className="flex items-center gap-3 text-start focus-visible:outline-2 focus-visible:outline-ring">
                        <span className="img-well flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-well">
                          {isImage(m) ? <img src={thumbOf(m)} alt="" loading="lazy" className="size-full object-contain" /> : <FileTextIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="max-w-72 truncate font-medium">{m.originalName}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">{m.mime}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{t(`enums.mediaFolder.${m.folder}`)}</td>
                    <td className="px-3 py-2 text-end whitespace-nowrap tabular">{formatBytes(m.size)}</td>
                    <td className="px-3 py-2 text-end whitespace-nowrap tabular">{m.width && m.height ? `${m.width}×${m.height}` : '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap tabular">{m.usageCount ? t('media.usedTimes', { count: m.usageCount }) : <span className="text-muted-foreground">0</span>}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{m.uploadedBy?.name || '—'}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-muted-foreground tabular">{f.datetime(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {query.data ? <ListFooter page={list.page} limit={list.limit} total={query.data.meta.total} pages={query.data.meta.pages} onPageChange={list.setPage} onLimitChange={list.setLimit} /> : null}
      </section>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} defaultFolder={(list.filters.folder as MediaFolder) || 'general'} />
      <MediaDetails media={selected} open={detailsOpen && !!selected} onOpenChange={setDetailsOpen} onDeleted={() => setDetailsOpen(false)} />
    </Page>
  );
}

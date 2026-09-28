import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useApi, useSession } from '@vero/api-client';
import { MEDIA_FOLDERS, type AdminMedia, type MediaFolder } from '@vero/types';
import {
  Button,
  cn,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@vero/ui';
import { CheckIcon, ImagesIcon, UploadIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../../lib/format';
import { formatBytes, thumbOf } from '../../lib/images';
import { IMAGE_ACCEPT, uploadMedia } from '../../lib/upload';
import { FilterSelect, SearchInput } from '../data-table/toolbar';
import { ErrorState } from '../common/states';
import { UploadDropzone } from './UploadDropzone';

const PAGE = 40;

export interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (items: AdminMedia[]) => void;
  multiple?: boolean;
  /** maximum number of items that can be picked (multiple mode) */
  max?: number;
  /** default folder for uploads and the initial library filter */
  folder?: MediaFolder;
  title?: string;
}

/**
 * Media library picker: browse / search the library or upload new images (drag & drop, progress),
 * then insert the selection. Used by every image field (products, categories, brands, banners …).
 */
export function MediaPicker({ open, onOpenChange, onSelect, multiple = false, max = 15, folder = 'general', title }: MediaPickerProps) {
  const { t } = useTranslation();
  const f = useFormat();
  const api = useApi();
  const qc = useQueryClient();
  const { can } = useSession();
  const [tab, setTab] = useState<'library' | 'upload'>('library');
  const [q, setQ] = useState('');
  const [folderFilter, setFolderFilter] = useState<string>(folder);
  const [selected, setSelected] = useState<AdminMedia[]>([]);

  useEffect(() => {
    if (open) {
      setSelected([]);
      setTab('library');
      setFolderFilter(folder);
      setQ('');
    }
  }, [open, folder]);

  const query = useInfiniteQuery({
    queryKey: ['admin', 'media', 'picker', { q, folder: folderFilter }],
    queryFn: ({ pageParam }) => api.admin.media.list({ page: pageParam, limit: PAGE, q: q || undefined, folder: folderFilter || undefined, type: 'image' }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined),
    enabled: open,
  });
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const total = query.data?.pages[0]?.meta.total ?? 0;
  const selectedIds = new Set(selected.map((m) => m.id));

  const toggle = (m: AdminMedia) => {
    if (!multiple) {
      setSelected(selectedIds.has(m.id) ? [] : [m]);
      return;
    }
    setSelected((list) => (list.some((x) => x.id === m.id) ? list.filter((x) => x.id !== m.id) : list.length >= max ? list : [...list, m]));
  };

  const onUploaded = (created: AdminMedia[]) => {
    void qc.invalidateQueries({ queryKey: ['admin', 'media'] });
    const images = created.filter((m) => m.mime.startsWith('image/'));
    setSelected((list) => (multiple ? [...list, ...images].slice(0, max) : images.slice(-1)));
    setTab('library');
  };

  const confirm = () => {
    if (!selected.length) return;
    onSelect(selected);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" closeLabel={t('common.close')} className="h-[min(46rem,calc(100dvh-2rem))]">
        <DialogHeader>
          <DialogTitle>{title ?? (multiple ? t('media.pickMany') : t('media.pickOne'))}</DialogTitle>
          <DialogDescription>{multiple ? t('media.pickManyHint', { max }) : t('media.pickOneHint')}</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'library' | 'upload')} className="min-h-0 flex-1 gap-3">
          <TabsList>
            <TabsTrigger value="library">
              <ImagesIcon aria-hidden="true" />
              {t('media.library')}
            </TabsTrigger>
            {can('media.upload') ? (
              <TabsTrigger value="upload">
                <UploadIcon aria-hidden="true" />
                {t('media.upload')}
              </TabsTrigger>
            ) : null}
          </TabsList>
          <TabsContent value="library" className="flex min-h-0 flex-col gap-3 data-[state=inactive]:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput value={q} onChange={setQ} placeholder={t('media.searchPlaceholder')} />
              <FilterSelect
                label={t('media.folder')}
                value={folderFilter}
                onChange={setFolderFilter}
                options={MEDIA_FOLDERS.map((fo) => ({ value: fo, label: t(`enums.mediaFolder.${fo}`) }))}
              />
              <span className="ms-auto text-[13px] text-muted-foreground tabular">{t('table.total', { count: total })}</span>
            </div>
            <DialogBody className="-mx-5 min-h-0 flex-1 sm:-mx-6">
              {query.isError ? (
                <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
              ) : query.isLoading ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                  {Array.from({ length: 18 }, (_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <p className="text-sm text-muted-foreground">{t('media.emptyPicker')}</p>
                  {can('media.upload') ? (
                    <Button variant="outline" size="sm" onClick={() => setTab('upload')} leftIcon={<UploadIcon />}>
                      {t('media.upload')}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <>
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6" role="listbox" aria-multiselectable={multiple || undefined} aria-label={t('media.library')}>
                    {items.map((m) => {
                      const isSelected = selectedIds.has(m.id);
                      const order = selected.findIndex((s) => s.id === m.id);
                      return (
                        <li key={m.id} role="option" aria-selected={isSelected}>
                          <button
                            type="button"
                            onClick={() => toggle(m)}
                            onDoubleClick={() => {
                              if (!multiple) {
                                onSelect([m]);
                                onOpenChange(false);
                              }
                            }}
                            className={cn(
                              'group img-well relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border bg-well transition-[border-color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                              isSelected ? 'border-primary shadow-[0_0_0_2px_var(--primary)] dark:border-brand' : 'border-border hover:border-[color-mix(in_oklab,var(--border),var(--foreground)_30%)]',
                            )}
                            title={`${m.originalName} · ${m.width ?? '?'}×${m.height ?? '?'} · ${formatBytes(m.size)}`}
                          >
                            <img src={thumbOf(m)} alt={f.loc(m.alt) || m.originalName} loading="lazy" decoding="async" className="size-full object-contain" />
                            <span
                              aria-hidden="true"
                              className={cn(
                                'absolute end-1.5 top-1.5 flex size-5 items-center justify-center rounded-full border text-[11px] font-bold transition-opacity',
                                isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-white/80 bg-black/20 opacity-0 group-hover:opacity-100',
                              )}
                            >
                              {isSelected ? multiple ? order + 1 : <CheckIcon className="size-3" /> : null}
                            </span>
                            {m.usageCount === 0 ? null : (
                              <span className="absolute start-1.5 bottom-1.5 rounded-xs bg-black/55 px-1 text-[10px] font-semibold text-white tabular">×{m.usageCount}</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {query.hasNextPage ? (
                    <div className="mt-4 flex justify-center">
                      <Button variant="outline" size="sm" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
                        {t('common.loadMore')}
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </DialogBody>
          </TabsContent>
          {can('media.upload') ? (
            <TabsContent value="upload" className="min-h-0 overflow-y-auto data-[state=inactive]:hidden">
              <UploadDropzone<AdminMedia> accept={IMAGE_ACCEPT} upload={(files, onProgress) => uploadMedia(files, folder, onProgress)} onUploaded={onUploaded} hint={t('media.dropHintWebp')} />
            </TabsContent>
          ) : null}
        </Tabs>
        <DialogFooter className="items-center sm:justify-between">
          <span className="text-[13px] text-muted-foreground tabular">
            {multiple ? t('media.selectedOf', { count: selected.length, max }) : selected[0]?.originalName ?? t('media.nothingSelected')}
          </span>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={confirm} disabled={!selected.length}>
              {multiple ? t('media.insertMany', { count: selected.length }) : t('media.insert')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

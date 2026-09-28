import { LIMITS } from '@vero/config';
import { Button, cn, Progress } from '@vero/ui';
import { CircleAlertIcon, CircleCheckIcon, UploadCloudIcon, XIcon } from 'lucide-react';
import { useId, useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '../../lib/images';
import { errorMessage } from '../../lib/i18n';

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
}

/**
 * Drag & drop (or click) file picker that uploads in batches with a progress bar per file.
 * `upload` receives the files of one batch and reports progress 0…1; it resolves with the created records.
 */
export function UploadDropzone<T>({
  accept,
  maxBytes = LIMITS.imageUploadMaxBytes,
  multiple = true,
  upload,
  onUploaded,
  hint,
  compact = false,
  disabled,
}: {
  accept: string;
  maxBytes?: number;
  multiple?: boolean;
  upload: (files: File[], onProgress: (fraction: number) => void) => Promise<T[]>;
  onUploaded: (items: T[]) => void;
  hint?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const busy = items.some((i) => i.status === 'uploading' || i.status === 'queued');

  const patch = (ids: string[], p: Partial<UploadItem>) => setItems((list) => list.map((i) => (ids.includes(i.id) ? { ...i, ...p } : i)));

  const start = async (files: File[]) => {
    const accepted: UploadItem[] = [];
    const rejected: UploadItem[] = [];
    const acceptList = accept.split(',').map((s) => s.trim());
    for (const file of files) {
      const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
      const typeOk = !file.type || acceptList.includes(file.type) || acceptList.some((a) => a.endsWith('/*') && file.type.startsWith(a.slice(0, -1)));
      if (!typeOk) rejected.push({ id, file, progress: 0, status: 'error', error: t('errors:FILE_TYPE_NOT_ALLOWED') });
      else if (file.size > maxBytes) rejected.push({ id, file, progress: 0, status: 'error', error: `${t('errors:FILE_TOO_LARGE')} (${formatBytes(maxBytes)})` });
      else accepted.push({ id, file, progress: 0, status: 'queued' });
    }
    setItems((list) => [...accepted, ...rejected, ...list.filter((i) => i.status !== 'done')].slice(0, 40));
    // upload one file per request so every file gets its own progress and its own error
    const created: T[] = [];
    for (const item of accepted) {
      patch([item.id], { status: 'uploading' });
      try {
        const result = await upload([item.file], (fraction) => patch([item.id], { progress: Math.round(fraction * 100) }));
        created.push(...result);
        patch([item.id], { status: 'done', progress: 100 });
      } catch (error) {
        patch([item.id], { status: 'error', error: errorMessage(t, error) });
      }
    }
    if (created.length) onUploaded(created);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) void start(multiple ? files : files.slice(0, 1));
  };

  return (
    <div className="flex flex-col gap-3">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-surface px-4 text-center transition-colors duration-150',
          compact ? 'py-5' : 'py-10',
          dragging ? 'border-primary bg-brand-soft/60 dark:border-brand' : 'hover:border-[color-mix(in_oklab,var(--input),var(--foreground)_25%)] hover:bg-accent/40',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-primary dark:text-brand" aria-hidden="true">
          <UploadCloudIcon className="size-5" />
        </span>
        <span className="text-sm font-semibold text-foreground">{t('media.dropTitle')}</span>
        <span className="max-w-md text-[13px] text-muted-foreground">{hint ?? t('media.dropHint', { size: formatBytes(maxBytes) })}</span>
        <span className="mt-1 inline-flex h-8 items-center rounded-md border border-input bg-surface-elevated px-3 text-[13px] font-semibold text-foreground shadow-xs">
          {t('media.chooseFiles')}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = '';
            if (files.length) void start(files);
          }}
        />
      </label>

      {items.length ? (
        <ul className="flex flex-col gap-2" aria-live="polite" aria-busy={busy || undefined}>
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              {item.status === 'done' ? (
                <CircleCheckIcon className="size-4 shrink-0 text-success" aria-hidden="true" />
              ) : item.status === 'error' ? (
                <CircleAlertIcon className="size-4 shrink-0 text-danger" aria-hidden="true" />
              ) : (
                <UploadCloudIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="truncate font-medium">{item.file.name}</span>
                  <span className="shrink-0 text-muted-foreground tabular">
                    {item.status === 'uploading' ? `${item.progress}%` : formatBytes(item.file.size)}
                  </span>
                </div>
                {item.status === 'uploading' || item.status === 'queued' ? (
                  <Progress value={item.progress} size="sm" aria-label={t('media.uploading', { name: item.file.name })} />
                ) : item.status === 'error' ? (
                  <span className="text-xs text-danger">{item.error}</span>
                ) : null}
              </div>
              {item.status === 'error' || item.status === 'done' ? (
                <Button type="button" variant="ghost" size="icon-sm" className="size-7" aria-label={t('common.remove')} onClick={() => setItems((l) => l.filter((x) => x.id !== item.id))}>
                  <XIcon />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

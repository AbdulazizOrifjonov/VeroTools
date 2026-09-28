import type { AdminImage, AdminMedia, MediaFolder } from '@vero/types';
import { Badge, Button, cn, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@vero/ui';
import { ArrowLeftIcon, ArrowRightIcon, GripVerticalIcon, ImagePlusIcon, RefreshCwIcon, StarIcon, Trash2Icon } from 'lucide-react';
import { useState, type DragEvent, type ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { assetUrl } from '../../lib/images';
import { FieldMessage } from '../form/fields';
import { MediaPicker } from './MediaPicker';

/** Image value kept in forms: the media id (sent to the API) + urls for the preview. */
export type FormImage = Pick<AdminImage, 'media' | 'url' | 'thumb' | 'medium'>;

export function mediaToFormImage(m: AdminMedia): FormImage {
  return { media: m.id, url: m.url, thumb: m.thumbUrl, medium: m.mediumUrl };
}

export function imageToForm(img: AdminImage | undefined | null): FormImage | null {
  return img?.media ? { media: img.media, url: img.url, thumb: img.thumb, medium: img.medium } : null;
}

/** Single image picked from the media library (logo, category image, banner, promotion). */
export function ImageField({
  name,
  label,
  description,
  required,
  folder = 'general',
  aspect = 'square',
  className,
}: {
  name: string;
  label: ReactNode;
  description?: ReactNode;
  required?: boolean;
  folder?: MediaFolder;
  aspect?: 'square' | 'wide' | 'banner';
  className?: string;
}) {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const [open, setOpen] = useState(false);
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = field.value as FormImage | null | undefined;
        const src = assetUrl(value?.medium ?? value?.url ?? value?.thumb);
        return (
          <FormItem className={className}>
            <FormLabel required={required}>{label}</FormLabel>
            <div className="flex flex-wrap items-start gap-3">
              <FormControl>
                <button
                  type="button"
                  ref={field.ref}
                  onClick={() => setOpen(true)}
                  className={cn(
                    'img-well group relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-input bg-well text-muted-foreground transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    aspect === 'square' ? 'size-28' : aspect === 'wide' ? 'h-28 w-44' : 'aspect-[21/8] w-full max-w-md',
                    value && 'border-solid border-border',
                  )}
                  aria-label={value ? t('media.replaceImage') : t('media.chooseImage')}
                >
                  {src ? <img src={src} alt="" className="size-full object-contain" /> : <ImagePlusIcon className="size-6" aria-hidden="true" />}
                </button>
              </FormControl>
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} leftIcon={value ? <RefreshCwIcon /> : <ImagePlusIcon />}>
                  {value ? t('media.replaceImage') : t('media.chooseImage')}
                </Button>
                {value ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange(null)} leftIcon={<Trash2Icon />} className="text-danger hover:text-danger">
                    {t('common.remove')}
                  </Button>
                ) : null}
              </div>
            </div>
            {description ? <FormDescription>{description}</FormDescription> : null}
            <FieldMessage />
            <MediaPicker open={open} onOpenChange={setOpen} folder={folder} onSelect={(items) => items[0] && field.onChange(mediaToFormImage(items[0]))} />
          </FormItem>
        );
      }}
    />
  );
}

/** Ordered image list (product gallery): pick from the library, drag or use arrows to reorder, first = main. */
export function ImageListField({
  name,
  label,
  description,
  max = 15,
  folder = 'products',
  className,
}: {
  name: string;
  label: ReactNode;
  description?: ReactNode;
  max?: number;
  folder?: MediaFolder;
  className?: string;
}) {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const [open, setOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const images = (field.value as FormImage[] | undefined) ?? [];
        const set = (next: FormImage[]) => field.onChange(next);
        const move = (from: number, to: number) => {
          if (to < 0 || to >= images.length || from === to) return;
          const next = [...images];
          const [item] = next.splice(from, 1);
          next.splice(to, 0, item!);
          set(next);
        };
        const onDrop = (e: DragEvent, index: number) => {
          e.preventDefault();
          if (dragIndex !== null) move(dragIndex, index);
          setDragIndex(null);
          setOverIndex(null);
        };
        return (
          <FormItem className={className}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <FormLabel>{label}</FormLabel>
              <span className="text-xs text-muted-foreground tabular">
                {images.length} / {max}
              </span>
            </div>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5" aria-label={typeof label === 'string' ? label : undefined}>
              {images.map((img, index) => (
                <li
                  key={`${img.media}-${index}`}
                  draggable
                  onDragStart={(e) => {
                    setDragIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverIndex(index);
                  }}
                  onDragLeave={() => setOverIndex((o) => (o === index ? null : o))}
                  onDrop={(e) => onDrop(e, index)}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  className={cn(
                    'group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-[border-color,opacity] duration-150',
                    index === 0 ? 'border-primary/50 dark:border-brand/50' : 'border-border',
                    dragIndex === index && 'opacity-50',
                    overIndex === index && dragIndex !== index && 'border-primary shadow-[0_0_0_2px_var(--primary)]',
                  )}
                >
                  <div className="img-well relative aspect-square bg-well">
                    <img src={assetUrl(img.thumb ?? img.medium ?? img.url)} alt="" className="size-full object-contain" draggable={false} />
                    {index === 0 ? (
                      <Badge variant="default" size="sm" className="absolute start-1.5 top-1.5 gap-1">
                        <StarIcon className="size-3" aria-hidden="true" />
                        {t('media.main')}
                      </Badge>
                    ) : null}
                    <GripVerticalIcon className="absolute end-1 top-1.5 size-4 cursor-grab text-neutral-500 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                  </div>
                  <div className="flex items-center justify-between gap-1 border-t border-border px-1 py-1">
                    <Button type="button" variant="ghost" size="icon-sm" className="size-7" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label={t('media.moveBefore', { n: index + 1 })}>
                      <ArrowLeftIcon />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" className="size-7 text-danger hover:text-danger" onClick={() => set(images.filter((_, i) => i !== index))} aria-label={t('media.removeImage', { n: index + 1 })}>
                      <Trash2Icon />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" className="size-7" disabled={index === images.length - 1} onClick={() => move(index, index + 1)} aria-label={t('media.moveAfter', { n: index + 1 })}>
                      <ArrowRightIcon />
                    </Button>
                  </div>
                </li>
              ))}
              {images.length < max ? (
                <li>
                  <FormControl>
                    <button
                      type="button"
                      ref={field.ref}
                      onClick={() => setOpen(true)}
                      aria-label={typeof label === 'string' ? `${label}: ${t('media.addImages')}` : t('media.addImages')}
                      className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-input text-[13px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <ImagePlusIcon className="size-5" aria-hidden="true" />
                      {t('media.addImages')}
                    </button>
                  </FormControl>
                </li>
              ) : null}
            </ul>
            <FormDescription>{description ?? t('media.galleryHint')}</FormDescription>
            <FieldMessage />
            <MediaPicker
              open={open}
              onOpenChange={setOpen}
              multiple
              max={Math.max(1, max - images.length)}
              folder={folder}
              onSelect={(items) => {
                const existing = new Set(images.map((i) => i.media));
                set([...images, ...items.filter((m) => !existing.has(m.id)).map(mediaToFormImage)].slice(0, max));
              }}
            />
          </FormItem>
        );
      }}
    />
  );
}

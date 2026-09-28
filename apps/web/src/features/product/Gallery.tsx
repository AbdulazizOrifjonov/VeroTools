import type { ImageRef } from '@vero/types';
import { cn, Dialog, DialogContent, DialogDescription, DialogTitle } from '@vero/ui';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeftIcon, ChevronRightIcon, ExpandIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SmartImage } from '../../components/common/SmartImage';
import { imageSources } from '../../lib/images';

function useCarouselIndex(embla: ReturnType<typeof useEmblaCarousel>[1]) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setIndex(embla.selectedScrollSnap());
    onSelect();
    embla.on('select', onSelect).on('reInit', onSelect);
    return () => {
      embla.off('select', onSelect).off('reInit', onSelect);
    };
  }, [embla]);
  return index;
}

function Arrow({ dir, onClick, disabled, className, label }: { dir: 'prev' | 'next'; onClick: () => void; disabled?: boolean; className?: string; label: string }) {
  const Icon = dir === 'prev' ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'flex size-10 items-center justify-center rounded-full border border-border bg-surface-elevated/95 text-foreground shadow-sm transition-opacity hover:bg-surface-elevated disabled:pointer-events-none disabled:opacity-0 focus-visible:outline-2 focus-visible:outline-ring',
        className,
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}

/** Full-screen viewer: swipe, arrows / keyboard, click to zoom (pans with the pointer). */
export function Lightbox({ images, start, open, onOpenChange, title }: { images: ImageRef[]; start: number; open: boolean; onOpenChange: (v: boolean) => void; title: string }) {
  const { t } = useTranslation();
  const [ref, embla] = useEmblaCarousel({ startIndex: start, loop: images.length > 1, watchDrag: true });
  const index = useCarouselIndex(embla);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');

  useEffect(() => {
    if (open) embla?.scrollTo(start, true);
  }, [open, start, embla]);
  useEffect(() => {
    setZoom(false);
  }, [index]);
  useEffect(() => {
    // no swiping while zoomed in (the pointer pans the picture instead)
    if (embla) embla.reInit({ watchDrag: !zoom, startIndex: embla.selectedScrollSnap() });
  }, [zoom, embla]);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!zoom) return;
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}% ${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t('common:actions.close')}
        className="top-0 left-0 flex h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background p-0 sm:max-w-none sm:p-0"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') embla?.scrollNext();
          if (e.key === 'ArrowLeft') embla?.scrollPrev();
        }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{t('product.galleryHint')}</DialogDescription>
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 pe-14">
          <span className="text-sm font-semibold tabular-nums">
            {index + 1} / {images.length}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{title}</span>
          <button
            type="button"
            onClick={() => setZoom((z) => !z)}
            aria-pressed={zoom}
            aria-label={zoom ? t('product.zoomOut') : t('common:a11y.zoomImage')}
            className="flex size-9 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            {zoom ? <ZoomOutIcon className="size-5" aria-hidden="true" /> : <ZoomInIcon className="size-5" aria-hidden="true" />}
          </button>
        </div>
        <div className="relative min-h-0 flex-1">
          <div ref={ref} className="h-full overflow-hidden">
            <div className="flex h-full touch-pan-y">
              {images.map((img, i) => {
                const src = imageSources(img, 'full');
                return (
                  <div key={img.id ?? img.url} className="relative flex h-full min-w-0 shrink-0 grow-0 basis-full items-center justify-center overflow-hidden p-4 sm:p-8">
                    <div
                      className={cn('img-well relative flex max-h-full max-w-full items-center justify-center overflow-hidden rounded-lg bg-well', zoom && i === index ? 'cursor-zoom-out' : 'cursor-zoom-in')}
                      onPointerMove={onMove}
                      onClick={() => setZoom((z) => !z)}
                    >
                      {src ? (
                        <img
                          src={src.src}
                          alt={img.alt ?? title}
                          width={src.width}
                          height={src.height}
                          draggable={false}
                          loading={Math.abs(i - start) <= 1 ? 'eager' : 'lazy'}
                          className="max-h-[calc(100dvh-12rem)] w-auto max-w-full object-contain transition-transform duration-200"
                          style={zoom && i === index ? { transform: 'scale(2.2)', transformOrigin: origin } : undefined}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {images.length > 1 ? (
            <>
              <Arrow dir="prev" label={t('common:a11y.previous')} onClick={() => embla?.scrollPrev()} className="absolute top-1/2 start-3 -translate-y-1/2 sm:start-6" />
              <Arrow dir="next" label={t('common:a11y.next')} onClick={() => embla?.scrollNext()} className="absolute top-1/2 end-3 -translate-y-1/2 sm:end-6" />
            </>
          ) : null}
        </div>
        {images.length > 1 ? (
          <div className="no-scrollbar flex shrink-0 justify-center gap-2 overflow-x-auto border-t border-border p-3">
            {images.map((img, i) => (
              <button
                key={img.id ?? img.url}
                type="button"
                onClick={() => embla?.scrollTo(i)}
                aria-label={t('common:a11y.slide', { index: i + 1 })}
                aria-current={i === index ? 'true' : undefined}
                className={cn(
                  'img-well size-14 shrink-0 overflow-hidden rounded-md border-2 bg-well focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  i === index ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
                )}
              >
                <SmartImage image={img} prefer="thumb" sizes="56px" className="size-full object-contain" alt="" />
              </button>
            ))}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Product gallery: swipeable main image, thumbnails (vertical on desktop), keyboard arrows,
 * lightbox with zoom. `activeImage` (variant photo) moves the carousel to that picture.
 */
export function Gallery({ images, title, badges, activeImage }: { images: ImageRef[]; title: string; badges?: ReactNode; activeImage?: ImageRef }) {
  const { t } = useTranslation();
  const [ref, embla] = useEmblaCarousel({ loop: false });
  const index = useCarouselIndex(embla);
  const [lightbox, setLightbox] = useState(false);
  const thumbsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeImage || !embla) return;
    const i = images.findIndex((img) => (img.id && img.id === activeImage.id) || img.url === activeImage.url);
    if (i >= 0) embla.scrollTo(i);
  }, [activeImage, images, embla]);

  useEffect(() => {
    thumbsRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [index]);

  const onKey = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        embla?.scrollNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        embla?.scrollPrev();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setLightbox(true);
      }
    },
    [embla],
  );

  if (!images.length) {
    return (
      <div className="img-well relative flex aspect-square items-center justify-center rounded-xl bg-well">
        <SmartImage image={null} fallbackLabel={t('common:product.noImage')} />
        {badges}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:items-start lg:gap-4">
      <div className="relative min-w-0 flex-1">
        <div
          ref={ref}
          role="region"
          aria-roledescription="carousel"
          aria-label={`${title} — ${t('shop:product.photos')}`}
          tabIndex={0}
          onKeyDown={onKey}
          className="img-well overflow-hidden rounded-xl bg-well focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <div className="flex touch-pan-y">
            {images.map((img, i) => (
              <div key={img.id ?? img.url} className="relative aspect-square min-w-0 shrink-0 grow-0 basis-full" role="group" aria-roledescription="slide" aria-label={t('home.slideOf', { index: i + 1, total: images.length })}>
                <button type="button" tabIndex={-1} onClick={() => setLightbox(true)} className="block size-full cursor-zoom-in" aria-label={t('common:a11y.zoomImage')}>
                  <SmartImage
                    image={img}
                    prefer="full"
                    priority={i === 0}
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    alt={img.alt ?? title}
                    className="size-full object-contain"
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
        {badges}
        <button
          type="button"
          onClick={() => setLightbox(true)}
          aria-label={t('common:a11y.zoomImage')}
          className="absolute end-3 bottom-3 flex size-10 items-center justify-center rounded-full border border-border bg-surface-elevated/95 shadow-sm hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ExpandIcon className="size-[18px]" aria-hidden="true" />
        </button>
        {images.length > 1 ? (
          <>
            <Arrow dir="prev" label={t('common:a11y.previous')} disabled={index === 0} onClick={() => embla?.scrollPrev()} className="absolute top-1/2 start-3 hidden -translate-y-1/2 sm:flex" />
            <Arrow dir="next" label={t('common:a11y.next')} disabled={index === images.length - 1} onClick={() => embla?.scrollNext()} className="absolute top-1/2 end-3 hidden -translate-y-1/2 sm:flex" />
            <span className="absolute start-3 bottom-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white tabular-nums sm:hidden" aria-hidden="true">
              {index + 1} / {images.length}
            </span>
          </>
        ) : null}
      </div>
      {images.length > 1 ? (
        <div
          ref={thumbsRef}
          className="no-scrollbar flex gap-2 overflow-x-auto lg:max-h-[min(640px,calc(100dvh-10rem))] lg:w-[76px] lg:shrink-0 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto"
          aria-label={t('shop:product.photos')}
        >
          {images.map((img, i) => (
            <button
              key={img.id ?? img.url}
              type="button"
              data-index={i}
              onClick={() => embla?.scrollTo(i)}
              aria-label={t('common:a11y.slide', { index: i + 1 })}
              aria-current={i === index ? 'true' : undefined}
              className={cn(
                'img-well size-16 shrink-0 overflow-hidden rounded-lg border-2 bg-well transition-[border-color,opacity] lg:size-[72px]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                i === index ? 'border-primary' : 'border-transparent opacity-75 hover:opacity-100',
              )}
            >
              <SmartImage image={img} prefer="thumb" sizes="72px" className="size-full object-contain" alt="" />
            </button>
          ))}
        </div>
      ) : null}
      <Lightbox images={images} start={index} open={lightbox} onOpenChange={setLightbox} title={title} />
    </div>
  );
}

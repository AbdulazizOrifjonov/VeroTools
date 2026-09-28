import type { BannerDTO } from '@vero/types';
import { cn } from '@vero/ui';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BannerAnchor, bannerBg, BannerPicture, BannerText } from './BannerLink';

const AUTOPLAY_MS = 6500;

/** Home hero: swipeable banner carousel with dots, arrows and a pausable autoplay (off for reduced motion). */
export function HeroCarousel({ banners }: { banners: BannerDTO[] }) {
  const { t } = useTranslation();
  const [viewportRef, embla] = useEmblaCarousel({ loop: banners.length > 1, align: 'start', duration: 24 });
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [paused, setPaused] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setSelected(embla.selectedScrollSnap());
    onSelect();
    embla.on('select', onSelect).on('reInit', onSelect);
    return () => {
      embla.off('select', onSelect).off('reInit', onSelect);
    };
  }, [embla]);

  useEffect(() => {
    if (!embla || paused || hovered || banners.length < 2) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') embla.scrollNext();
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [embla, paused, hovered, banners.length]);

  const go = useCallback((i: number) => embla?.scrollTo(i), [embla]);

  if (!banners.length) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t('home.heroLabel')}
      className="relative overflow-hidden rounded-xl bg-neutral-900"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      <div ref={viewportRef} className="overflow-hidden">
        <div className="flex touch-pan-y">
          {banners.map((b, i) => (
            <div
              key={b.id}
              role="group"
              aria-roledescription="slide"
              aria-label={t('home.slideOf', { index: i + 1, total: banners.length })}
              inert={i !== selected}
              className="relative min-w-0 shrink-0 grow-0 basis-full"
            >
              <BannerAnchor banner={b} className={cn('group relative block aspect-square overflow-hidden sm:aspect-[16/7] lg:aspect-[1600/560]', bannerBg(b))}>
                <BannerPicture banner={b} priority={i === 0} breakpoint={640} sizes="(min-width: 1440px) 1376px, 100vw" className="sm:object-right" />
                <div className="absolute inset-0 flex items-start p-6 pt-8 sm:items-center sm:p-10 lg:p-14">
                  <BannerText banner={b} size="lg" className="max-w-[min(34rem,60%)] max-sm:max-w-full" />
                </div>
              </BannerAnchor>
            </div>
          ))}
        </div>
      </div>
      {banners.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => embla?.scrollPrev()}
            aria-label={t('common:a11y.previous')}
            className="absolute top-1/2 start-3 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-md transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:flex"
          >
            <ChevronLeftIcon className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => embla?.scrollNext()}
            aria-label={t('common:a11y.next')}
            className="absolute top-1/2 end-3 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-md transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:flex"
          >
            <ChevronRightIcon className="size-5" aria-hidden="true" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 sm:bottom-4">
            <div className="flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1.5">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={t('common:a11y.slide', { index: i + 1 })}
                  aria-current={i === selected ? 'true' : undefined}
                  className={cn(
                    'h-2 rounded-full transition-[width,background-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                    i === selected ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80',
                  )}
                />
              ))}
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? t('home.playSlides') : t('home.pauseSlides')}
                aria-pressed={paused}
                className="ms-1 flex size-5 items-center justify-center rounded-full text-white/85 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
              >
                {paused ? <PlayIcon className="size-3" aria-hidden="true" /> : <PauseIcon className="size-3" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

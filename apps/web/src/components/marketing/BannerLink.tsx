import type { BannerDTO } from '@vero/types';
import { cn } from '@vero/ui';
import { ArrowRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { LocaleLink } from '../../hooks/use-lang';
import { imageSources } from '../../lib/images';
import { isInternalHref } from '../../lib/paths';

/** Placeholder colour while the art loads — matches the banner theme so text stays readable. */
export function bannerBg(banner: BannerDTO): string {
  return banner.textTheme === 'dark' ? 'bg-neutral-900' : 'bg-neutral-100';
}

/** Wraps a banner in a link to its `buttonUrl` (internal links keep the language, external open in a new tab). */
export function BannerAnchor({ banner, className, children }: { banner: BannerDTO; className?: string; children: ReactNode }) {
  const url = banner.buttonUrl;
  if (!url) return <div className={className}>{children}</div>;
  if (isInternalHref(url)) {
    return (
      <LocaleLink to={url} className={className}>
        {children}
      </LocaleLink>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

/** <picture> with the mobile rendition below `breakpoint`. */
export function BannerPicture({
  banner,
  priority = false,
  sizes = '100vw',
  className,
  breakpoint = 768,
}: {
  banner: BannerDTO;
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** viewport width (px) from which the desktop rendition is used */
  breakpoint?: number;
}) {
  const desktop = imageSources(banner.imageDesktop ?? banner.imageMobile, 'full');
  const mobile = imageSources(banner.imageMobile ?? banner.imageDesktop, 'full');
  if (!desktop && !mobile) return null;
  const main = mobile ?? desktop!;
  return (
    <picture>
      {desktop && mobile && banner.imageMobile && banner.imageDesktop ? (
        <source media={`(min-width: ${breakpoint}px)`} srcSet={desktop.srcSet ?? desktop.src} sizes={sizes} width={desktop.width} height={desktop.height} />
      ) : null}
      <img
        src={main.src}
        srcSet={main.srcSet}
        sizes={sizes}
        width={main.width}
        height={main.height}
        alt=""
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : undefined}
        draggable={false}
        className={cn('size-full object-cover', className)}
      />
    </picture>
  );
}

/** Title / subtitle / CTA over the banner art. `textTheme` = the banner background (dark → light text). */
export function BannerText({
  banner,
  size = 'md',
  className,
  titleClassName,
  subtitleClassName,
}: {
  banner: BannerDTO;
  size?: 'lg' | 'md' | 'sm';
  className?: string;
  /** overrides for tight layouts (two banners side by side on tablets) */
  titleClassName?: string;
  subtitleClassName?: string;
}) {
  const dark = banner.textTheme === 'dark';
  return (
    <div className={cn('flex flex-col items-start', size === 'lg' ? 'gap-3 sm:gap-4' : 'gap-2', dark ? 'text-white' : 'text-neutral-950', className)}>
      <h2
        className={cn(
          'max-w-[18ch] font-extrabold tracking-tight text-balance',
          size === 'lg' ? 'text-2xl leading-[1.1] sm:text-4xl lg:text-5xl' : size === 'md' ? 'text-xl leading-tight sm:text-2xl' : 'text-lg leading-tight sm:text-xl',
          titleClassName,
        )}
      >
        {banner.title}
      </h2>
      {banner.subtitle ? (
        <p
          className={cn(
            'max-w-[42ch] text-pretty',
            size === 'lg' ? 'text-sm sm:text-base lg:text-lg' : 'text-sm',
            dark ? 'text-white/80' : 'text-neutral-700',
            subtitleClassName,
          )}
        >
          {banner.subtitle}
        </p>
      ) : null}
      {banner.buttonText && banner.buttonUrl ? (
        <span
          className={cn(
            'mt-1 inline-flex items-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-colors duration-150',
            size === 'lg' ? 'h-11 px-5 text-[15px] sm:h-12 sm:px-6' : 'h-9 px-4 text-sm',
            'bg-primary text-primary-foreground group-hover:bg-primary-hover',
          )}
        >
          {banner.buttonText}
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </span>
      ) : null}
    </div>
  );
}

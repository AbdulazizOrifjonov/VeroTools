import type { ImageRef } from '@vero/types';
import { cn } from '@vero/ui';
import { ImageOffIcon } from 'lucide-react';
import { useState, type ImgHTMLAttributes } from 'react';
import { imageSources } from '../../lib/images';

export interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> {
  image?: ImageRef | null;
  /** Preferred rendition for `src` (srcSet still offers all). */
  prefer?: 'thumb' | 'medium' | 'full';
  /** Eager + high priority for the LCP image (hero, product main photo). */
  priority?: boolean;
  /** Rendered when there is no image or it failed to load. */
  fallbackClassName?: string;
  fallbackLabel?: string;
}

/**
 * Responsive, lazy image: srcSet from thumb/medium/original, intrinsic width/height (no layout shift —
 * the parent box should also define an aspect ratio), graceful fallback when the file is missing.
 */
export function SmartImage({
  image,
  prefer = 'medium',
  priority = false,
  alt,
  className,
  fallbackClassName,
  fallbackLabel,
  sizes = '(min-width: 1024px) 25vw, 50vw',
  loading,
  ...props
}: SmartImageProps) {
  const [failed, setFailed] = useState(false);
  const sources = imageSources(image, prefer);
  if (!sources || failed) {
    return (
      <span
        role={fallbackLabel ? 'img' : undefined}
        aria-label={fallbackLabel}
        className={cn('flex size-full items-center justify-center text-muted-foreground/50', fallbackClassName)}
      >
        <ImageOffIcon className="size-1/4 max-h-10 max-w-10" aria-hidden="true" strokeWidth={1.5} />
      </span>
    );
  }
  return (
    <img
      src={sources.src}
      srcSet={sources.srcSet}
      sizes={sources.srcSet ? sizes : undefined}
      width={sources.width}
      height={sources.height}
      alt={alt ?? image?.alt ?? ''}
      loading={loading ?? (priority ? 'eager' : 'lazy')}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : undefined}
      onError={() => setFailed(true)}
      draggable={false}
      className={className}
      {...props}
    />
  );
}

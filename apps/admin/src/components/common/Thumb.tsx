import { cn } from '@vero/ui';
import { ImageOffIcon } from 'lucide-react';
import { useState } from 'react';
import { assetUrl } from '../../lib/images';

const SIZES = {
  xs: 'size-7 rounded-md',
  sm: 'size-9 rounded-md',
  md: 'size-12 rounded-lg',
  lg: 'size-16 rounded-lg',
  xl: 'size-24 rounded-xl',
} as const;

/** Square product / media thumbnail on the light image well (product photos are shot on light grey). */
export function Thumb({
  src,
  alt = '',
  size = 'sm',
  className,
  fit = 'contain',
}: {
  src?: string | null;
  alt?: string;
  size?: keyof typeof SIZES;
  className?: string;
  fit?: 'contain' | 'cover';
}) {
  const [failed, setFailed] = useState(false);
  const url = assetUrl(src ?? undefined);
  return (
    <span className={cn('img-well relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-well', SIZES[size], className)}>
      {url && !failed ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={cn('size-full', fit === 'contain' ? 'object-contain p-0.5' : 'object-cover')}
        />
      ) : (
        <ImageOffIcon className="size-1/2 max-h-5 max-w-5 text-neutral-400" aria-hidden="true" />
      )}
    </span>
  );
}

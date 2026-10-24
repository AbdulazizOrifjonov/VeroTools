import { clsx, type ClassValue } from 'clsx';
import * as React from 'react';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge that knows about the OCKEAN TOOLS theme extensions
 * (custom easing / animations / utilities), so conflicting classes are resolved correctly.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      ease: ['brand'],
      animate: [
        'accordion-down',
        'accordion-up',
        'collapsible-down',
        'collapsible-up',
        'shimmer',
        'cart-bounce',
        'check-draw',
        'slide-up',
        'slide-down',
        'fade-in',
        'fade-out',
        'scale-in',
      ],
    },
    classGroups: {
      'fvn-spacing': ['tabular'],
    },
  },
});

/** Merge class names with Tailwind-aware conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

type PossibleRef<T> = React.Ref<T> | undefined;

function setRef<T>(ref: PossibleRef<T>, node: T | null): void | (() => void) {
  if (typeof ref === 'function') {
    const cleanup = ref(node);
    return typeof cleanup === 'function' ? cleanup : undefined;
  }
  if (ref != null) (ref as React.RefObject<T | null>).current = node;
}

/** Combine several refs (callback or object) into a single callback ref (React 19 cleanup aware). */
export function mergeRefs<T>(...refs: PossibleRef<T>[]): React.RefCallback<T> {
  return (node: T | null) => {
    const cleanups = refs.map((ref) => setRef(ref, node));
    return () => {
      refs.forEach((ref, index) => {
        const cleanup = cleanups[index];
        if (typeof cleanup === 'function') cleanup();
        else setRef(ref, null);
      });
    };
  };
}

/** Memoised version of {@link mergeRefs} — keeps the same callback while the refs are stable. */
export function useMergedRefs<T>(...refs: PossibleRef<T>[]): React.RefCallback<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => mergeRefs(...refs), refs);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

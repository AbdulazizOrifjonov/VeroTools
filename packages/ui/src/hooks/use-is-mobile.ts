import { useMediaQuery } from './use-media-query';

/** Phone layout: `(max-width: 767px)` — i.e. below Tailwind's `md` breakpoint. */
export const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_MEDIA_QUERY);
}

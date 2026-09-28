import {
  isApiError,
  qk,
  useAddToCart,
  useApi,
  useApiLanguage,
  useCart,
  useEngagement,
  useToggleCompare,
  useToggleWishlist,
  useUpdateCartItem,
} from '@vero/api-client';
import { LIMITS, STORE_ROUTES } from '@vero/config';
import type { CartItemDTO } from '@vero/types';
import { toast } from '@vero/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { pages } from '../../app/pages';
import { useLocaleNavigate } from '../../hooks/use-lang';
import { errorMessage } from '../../lib/i18n';

/** Cart line of a product (optionally a specific variant) from the cached cart. */
export function useCartLine(productId: string, variantId?: string | null): CartItemDTO | undefined {
  const cart = useCart();
  return cart.data?.items.find((i) => i.productId === productId && (variantId === undefined || (i.variantId ?? null) === (variantId ?? null)));
}

function cartErrorText(t: ReturnType<typeof useTranslation>['t'], error: unknown): string {
  if (isApiError(error)) {
    if (error.code === 'INSUFFICIENT_STOCK') {
      const details = error.details as { available?: number; inCart?: number } | undefined;
      if (details?.available !== undefined) return t('cartActions.onlyAvailable', { count: details.available });
    }
    if (error.code === 'VALIDATION_ERROR' && error.fields?.variantId) return t('shop:product.selectVariant');
  }
  return errorMessage(t, error);
}

/** Add to cart with success toast ("Go to cart") and translated stock errors. */
export function useAddToCartAction() {
  const { t } = useTranslation();
  const navigate = useLocaleNavigate();
  const add = useAddToCart();
  const run = useCallback(
    (input: { productId: string; variantId?: string; quantity?: number }, options: { silent?: boolean; then?: () => void } = {}) =>
      add.mutate(
        { productId: input.productId, variantId: input.variantId, quantity: input.quantity ?? 1 },
        {
          onSuccess: () => {
            if (!options.silent) {
              toast.success(t('shop:product.addedToCart'), {
                action: { label: t('common:actions.goToCart'), onClick: () => navigate(STORE_ROUTES.cart) },
              });
            }
            options.then?.();
          },
          onError: (error) => toast.error(cartErrorText(t, error)),
        },
      ),
    [add, t, navigate],
  );
  return { add: run, addAsync: add.mutateAsync, isPending: add.isPending, variables: add.variables };
}

/** Quantity change of a cart line (0 removes it). */
export function useSetLineQuantity() {
  const { t } = useTranslation();
  const update = useUpdateCartItem();
  const run = useCallback(
    (lineId: string, quantity: number) =>
      update.mutate({ lineId, quantity }, { onError: (error) => toast.error(cartErrorText(t, error)) }),
    [update, t],
  );
  return { setQuantity: run, isPending: update.isPending };
}

/** Heart toggle (optimistic) with feedback. Works for guests (X-Guest-Id) and customers. */
export function useWishlistToggle() {
  const { t } = useTranslation();
  const navigate = useLocaleNavigate();
  const engagement = useEngagement();
  const toggle = useToggleWishlist();
  const ids = engagement.data?.wishlistIds ?? [];
  const run = useCallback(
    (productId: string) => {
      const active = ids.includes(productId);
      toggle.mutate(
        { productId, active },
        {
          onSuccess: () =>
            active
              ? toast(t('shop:product.removedFromWishlist'))
              : toast.success(t('shop:product.addedToWishlist'), {
                  action: { label: t('common:actions.view'), onClick: () => navigate(STORE_ROUTES.wishlist) },
                }),
          onError: (error) => toast.error(errorMessage(t, error)),
        },
      );
    },
    [ids, toggle, t, navigate],
  );
  return { isActive: (id: string) => ids.includes(id), toggle: run, pendingId: toggle.isPending ? toggle.variables?.productId : undefined };
}

export function useCompareToggle() {
  const { t } = useTranslation();
  const navigate = useLocaleNavigate();
  const engagement = useEngagement();
  const toggle = useToggleCompare();
  const ids = engagement.data?.compareIds ?? [];
  const run = useCallback(
    (productId: string) => {
      const active = ids.includes(productId);
      if (!active && ids.length >= LIMITS.compareMax) {
        toast.warning(t('shop:product.compareLimit', { count: LIMITS.compareMax }), {
          action: { label: t('common:actions.view'), onClick: () => navigate(STORE_ROUTES.compare) },
        });
        return;
      }
      toggle.mutate(
        { productId, active },
        {
          onSuccess: () =>
            active
              ? toast(t('shop:product.removedFromCompare'))
              : toast.success(t('shop:product.addedToCompare'), {
                  action: { label: t('common:actions.view'), onClick: () => navigate(STORE_ROUTES.compare) },
                }),
          onError: (error) =>
            toast.error(
              isApiError(error) && error.code === 'LIMIT_REACHED' ? t('shop:product.compareLimit', { count: LIMITS.compareMax }) : errorMessage(t, error),
            ),
        },
      );
    },
    [ids, toggle, t, navigate],
  );
  return { isActive: (id: string) => ids.includes(id), toggle: run, pendingId: toggle.isPending ? toggle.variables?.productId : undefined };
}

/** Warms the product page chunk and its data on hover / focus. */
export function usePrefetchProduct() {
  const api = useApi();
  const lang = useApiLanguage();
  const qc = useQueryClient();
  return useCallback(
    (slug: string) => {
      void pages.product.preload();
      void qc.prefetchQuery({ queryKey: qk.product(slug, lang), queryFn: () => api.catalog.product(slug), staleTime: 60_000 });
    },
    [api, lang, qc],
  );
}

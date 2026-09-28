import { useNavigation } from '@react-navigation/native';
import {
  isApiError,
  useAddToCart,
  useCart,
  useEngagement,
  useSettings,
  useToggleCompare,
  useToggleWishlist,
  useUpdateCartItem,
} from '@vero/api-client';
import { LIMITS } from '@vero/config';
import type { CartItemDTO } from '@vero/types';
import { cheapestInstallment } from '@vero/utils';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { haptic } from '../../lib/haptics';
import { errorMessage } from '../../lib/i18n';
import { toast } from '../../lib/toast';

/** Cart line of a product (optionally a specific variant) from the cached cart. */
export function useCartLine(productId: string, variantId?: string | null): CartItemDTO | undefined {
  const cart = useCart();
  return cart.data?.items.find(
    (i) =>
      i.productId === productId && (variantId === undefined || (i.variantId ?? null) === (variantId ?? null)),
  );
}

export function useCartQuantity(productId: string): number {
  const cart = useCart();
  return cart.data?.items.filter((i) => i.productId === productId).reduce((s, i) => s + i.quantity, 0) ?? 0;
}

export function cartErrorText(t: ReturnType<typeof useTranslation>['t'], error: unknown): string {
  if (isApiError(error)) {
    if (error.code === 'INSUFFICIENT_STOCK') {
      const details = error.details as { available?: number } | undefined;
      if (details?.available !== undefined) return t('cart.onlyAvailable', { count: details.available });
    }
    if (error.code === 'VALIDATION_ERROR' && error.fields?.variantId) return t('shop:product.selectVariant');
  }
  return errorMessage(t, error);
}

function useGoTo() {
  const navigation = useNavigation();
  return useCallback(
    (tab: 'CartTab' | 'WishlistTab') => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigation as any).navigate('Tabs', { screen: tab }, { pop: true });
    },
    [navigation],
  );
}

/** Add to cart with haptics, a success banner ("Go to cart") and translated stock errors. */
export function useAddToCartAction() {
  const { t } = useTranslation();
  const goTo = useGoTo();
  const add = useAddToCart();
  const run = useCallback(
    (
      input: { productId: string; variantId?: string; quantity?: number },
      options: { silent?: boolean; onDone?: () => void } = {},
    ) =>
      add.mutate(
        { productId: input.productId, variantId: input.variantId, quantity: input.quantity ?? 1 },
        {
          onSuccess: () => {
            haptic.success();
            if (!options.silent) {
              toast.success(t('shop:product.addedToCart'), {
                action: { label: t('common:actions.goToCart'), onPress: () => goTo('CartTab') },
              });
            }
            options.onDone?.();
          },
          onError: (error) => {
            haptic.warning();
            toast.error(cartErrorText(t, error));
          },
        },
      ),
    [add, t, goTo],
  );
  return {
    add: run,
    addAsync: add.mutateAsync,
    isPending: add.isPending,
    pendingProductId: add.isPending ? add.variables?.productId : undefined,
  };
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
  return {
    setQuantity: run,
    isPending: update.isPending,
    pendingLine: update.isPending ? update.variables?.lineId : undefined,
  };
}

/** Heart toggle (optimistic) with feedback. Works for guests (X-Guest-Id) and customers. */
export function useWishlistToggle() {
  const { t } = useTranslation();
  const goTo = useGoTo();
  const engagement = useEngagement();
  const toggle = useToggleWishlist();
  const ids = engagement.data?.wishlistIds;
  const run = useCallback(
    (productId: string, options: { silent?: boolean } = {}) => {
      const active = (ids ?? []).includes(productId);
      haptic.light();
      toggle.mutate(
        { productId, active },
        {
          onSuccess: () => {
            if (options.silent) return;
            if (active) toast.info(t('shop:product.removedFromWishlist'));
            else
              toast.success(t('shop:product.addedToWishlist'), {
                action: { label: t('common:actions.view'), onPress: () => goTo('WishlistTab') },
              });
          },
          onError: (error) => toast.error(errorMessage(t, error)),
        },
      );
    },
    [ids, toggle, t, goTo],
  );
  const isActive = useCallback((id: string) => (ids ?? []).includes(id), [ids]);
  return { isActive, toggle: run, pendingId: toggle.isPending ? toggle.variables?.productId : undefined };
}

export function useCompareToggle() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const engagement = useEngagement();
  const toggle = useToggleCompare();
  const ids = engagement.data?.compareIds;
  const run = useCallback(
    (productId: string) => {
      const list = ids ?? [];
      const active = list.includes(productId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const view = () => (navigation as any).navigate('Compare');
      if (!active && list.length >= LIMITS.compareMax) {
        toast.warning(t('shop:product.compareLimit', { count: LIMITS.compareMax }), {
          action: { label: t('common:actions.view'), onPress: view },
        });
        return;
      }
      haptic.light();
      toggle.mutate(
        { productId, active },
        {
          onSuccess: () =>
            active
              ? toast.info(t('shop:product.removedFromCompare'))
              : toast.success(t('shop:product.addedToCompare'), {
                  action: { label: t('common:actions.view'), onPress: view },
                }),
          onError: (error) =>
            toast.error(
              isApiError(error) && error.code === 'LIMIT_REACHED'
                ? t('shop:product.compareLimit', { count: LIMITS.compareMax })
                : errorMessage(t, error),
            ),
        },
      );
    },
    [ids, toggle, t, navigation],
  );
  const isActive = useCallback((id: string) => (ids ?? []).includes(id), [ids]);
  return { isActive, toggle: run, pendingId: toggle.isPending ? toggle.variables?.productId : undefined };
}

/** "from 99 000 so'm / mo" — cheapest installment plan from the public settings (null below the minimum). */
export function useInstallmentFrom() {
  const settings = useSettings();
  const inst = settings.data?.installment;
  return useCallback(
    (price: number) => (inst?.enabled ? cheapestInstallment(price, inst.plans, inst.minAmount) : null),
    [inst],
  );
}

import { STORE_ROUTES } from '@vero/config';
import type { ProductDetail, ProductVariant } from '@vero/types';
import { Badge, Button, cn, formatDiscount, QuantityStepper, RadioCard, RadioGroup, RatingStars, toast } from '@vero/ui';
import { CheckIcon, Share2Icon, ShoppingCartIcon, TimerIcon, ZapIcon } from 'lucide-react';
import { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Countdown } from '../../components/common/Countdown';
import { Money } from '../../components/common/Money';
import { CompareButton, WishlistButton } from '../../components/product/ProductActions';
import { StockStatus } from '../../components/product/StockStatus';
import { useInstallmentFrom } from '../../components/product/ProductCard';
import { useFormat } from '../../hooks/use-format';
import { LocaleLink, useLocaleNavigate } from '../../hooks/use-lang';
import { errorMessage } from '../../lib/i18n';
import { useAddToCartAction, useCartLine } from './actions';

export interface Offer {
  price: number;
  oldPrice?: number;
  discountPercent: number;
  available: number;
  status: ProductDetail['stock']['status'];
  sku: string;
}

export function offerOf(product: ProductDetail, variant: ProductVariant | null): Offer {
  if (variant) {
    return {
      price: variant.price,
      oldPrice: variant.oldPrice,
      discountPercent: variant.discountPercent,
      available: variant.stock.available,
      status: variant.stock.status,
      sku: variant.sku,
    };
  }
  return {
    price: product.price,
    oldPrice: product.oldPrice,
    discountPercent: product.discountPercent,
    available: product.stock.available,
    status: product.stock.status,
    sku: product.sku,
  };
}

function VariantSelector({ variants, value, onChange }: { variants: ProductVariant[]; value: string | null; onChange: (id: string) => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-2.5 text-sm font-semibold">{t('shop:product.selectVariant')}</legend>
      <RadioGroup value={value ?? ''} onValueChange={onChange} className="gap-2">
        {variants.map((v) => {
          const out = v.stock.status === 'out_of_stock';
          return (
            <RadioCard key={v.id} value={v.id} className={cn('p-3', out && 'opacity-70')}>
              <span className="flex items-start justify-between gap-3">
                <span className="text-sm leading-snug font-semibold">{v.name}</span>
                <span className="shrink-0 text-sm font-bold whitespace-nowrap tabular-nums">{f.price(v.price)}</span>
              </span>
              <span className="flex items-center justify-between gap-3">
                <StockStatus stock={v.stock} />
                {v.oldPrice && v.oldPrice > v.price ? <del className="text-xs text-muted-foreground tabular-nums">{f.price(v.oldPrice)}</del> : null}
              </span>
            </RadioCard>
          );
        })}
      </RadioGroup>
    </fieldset>
  );
}

/** Price, options, stock, quantity and the buy buttons of the product page. */
export const BuyBox = forwardRef<HTMLDivElement, {
  product: ProductDetail;
  variant: ProductVariant | null;
  onVariantChange: (id: string) => void;
}>(function BuyBox({ product, variant, onVariantChange }, actionsRef) {
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useLocaleNavigate();
  const cartAction = useAddToCartAction();
  const [qty, setQty] = useState(1);
  const [buying, setBuying] = useState(false);
  const needsVariant = product.variants.length > 0;
  const offer = offerOf(product, variant);
  const line = useCartLine(product.id, needsVariant ? (variant?.id ?? '__none__') : undefined);
  const inCart = line?.quantity ?? 0;
  const maxAddable = Math.max(0, offer.available - inCart);
  const out = offer.status === 'out_of_stock' || offer.available <= 0;
  const blocked = out || (needsVariant && !variant);
  const installment = useInstallmentFrom(offer.price);
  const saving = offer.oldPrice && offer.oldPrice > offer.price ? offer.oldPrice - offer.price : 0;

  const add = (then?: () => void) =>
    cartAction.add({ productId: product.id, variantId: variant?.id, quantity: Math.min(qty, Math.max(1, maxAddable)) }, { silent: !!then, then });

  const buyNow = async () => {
    if (maxAddable <= 0 && inCart > 0) {
      navigate(STORE_ROUTES.checkout);
      return;
    }
    setBuying(true);
    try {
      await cartAction.addAsync({ productId: product.id, variantId: variant?.id, quantity: Math.min(qty, Math.max(1, maxAddable)) });
      navigate(STORE_ROUTES.checkout);
    } catch (error) {
      toast.error(errorMessage(t, error));
    } finally {
      setBuying(false);
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(t('shop:product.linkCopied'));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      toast.error(t('common:status.error'));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          {product.brand ? (
            <LocaleLink to={STORE_ROUTES.brand(product.brand.slug)} className="font-bold tracking-wide text-primary uppercase hover:underline dark:text-brand">
              {product.brand.name}
            </LocaleLink>
          ) : null}
          <span className="text-muted-foreground">
            {t('common:product.sku')}: <span className="font-medium text-foreground tabular-nums">{offer.sku}</span>
          </span>
        </div>
        <h1 className="text-xl leading-tight font-bold tracking-tight text-balance sm:text-2xl lg:text-[1.75rem]">{product.name}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          {product.reviewCount > 0 ? (
            <a href="#reviews" className="inline-flex items-center gap-1.5 rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-ring dark:hover:text-brand">
              <RatingStars value={product.rating} size="sm" label={t('common:a11y.rating', { value: product.rating.toFixed(1) })} />
              <span className="font-semibold tabular-nums">{product.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">{t('common:product.reviews', { count: product.reviewCount })}</span>
            </a>
          ) : (
            <a href="#reviews" className="text-muted-foreground hover:text-foreground">
              {t('common:product.noReviews')}
            </a>
          )}
          {product.questionCount > 0 ? (
            <a href="#questions" className="text-muted-foreground hover:text-foreground">
              {t('product.questionsCount', { count: product.questionCount })}
            </a>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Money amount={offer.price} oldAmount={offer.oldPrice} size="xl" />
          {offer.discountPercent > 0 ? (
            <Badge variant="sale" size="lg">
              {formatDiscount(offer.discountPercent)}
            </Badge>
          ) : null}
        </div>
        {saving ? <p className="text-sm font-semibold text-success">{t('common:product.youSave', { amount: f.price(saving) })}</p> : null}
        {installment ? <p className="text-sm text-muted-foreground">{installment}</p> : null}
        {product.promotion && new Date(product.promotion.endsAt).getTime() > Date.now() ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-brand-soft px-3 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-soft-foreground">
              {product.promotion.type === 'FLASH_SALE' ? <ZapIcon className="size-4" aria-hidden="true" /> : <TimerIcon className="size-4" aria-hidden="true" />}
              <LocaleLink to={STORE_ROUTES.promotion(product.promotion.slug)} className="hover:underline">
                {t('shop:product.promoEnds')}
              </LocaleLink>
            </span>
            <Countdown endsAt={product.promotion.endsAt} variant="boxes" label={t('shop:product.promoEnds')} className="ms-auto" />
          </div>
        ) : null}

        {needsVariant ? <VariantSelector variants={product.variants} value={variant?.id ?? null} onChange={onVariantChange} /> : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <StockStatus stock={{ status: offer.status, available: offer.available }} showCount className="text-sm" />
          {inCart > 0 ? (
            <LocaleLink to={STORE_ROUTES.cart} className="inline-flex items-center gap-1 text-sm font-semibold text-success hover:underline">
              <CheckIcon className="size-4" aria-hidden="true" />
              {t('product.inCart', { count: inCart })}
            </LocaleLink>
          ) : null}
        </div>

        <div ref={actionsRef} className="flex flex-col gap-2.5">
          <div className="flex gap-2.5">
            {!blocked && maxAddable > 1 ? (
              <QuantityStepper
                size="lg"
                value={Math.min(qty, maxAddable)}
                min={1}
                max={Math.max(1, maxAddable)}
                onChange={setQty}
                decreaseLabel={t('common:product.decrease')}
                increaseLabel={t('common:product.increase')}
                inputLabel={t('common:product.quantity')}
              />
            ) : null}
            <Button
              size="xl"
              className="min-w-0 flex-1"
              disabled={blocked || maxAddable <= 0}
              loading={cartAction.isPending && !buying}
              onClick={() => add()}
              leftIcon={<ShoppingCartIcon aria-hidden="true" />}
            >
              {out ? t('common:product.outOfStock') : needsVariant && !variant ? t('shop:product.selectVariant') : t('common:actions.addToCart')}
            </Button>
          </div>
          {!blocked ? (
            <Button size="lg" variant="graphite" loading={buying} onClick={() => void buyNow()}>
              {t('common:actions.buyNow')}
            </Button>
          ) : null}
          {!blocked && maxAddable <= 0 && inCart > 0 ? <p className="text-xs text-muted-foreground">{t('product.allInCart')}</p> : null}
        </div>

        <div className="flex items-center gap-2 border-t border-border pt-3">
          <WishlistButton productId={product.id} productName={product.name} size="md" className="shadow-none" />
          <CompareButton productId={product.id} productName={product.name} size="md" className="shadow-none" />
          <button
            type="button"
            onClick={() => void share()}
            aria-label={t('common:actions.share')}
            title={t('common:actions.share')}
            className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface-elevated text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:text-brand"
          >
            <Share2Icon className="size-5" aria-hidden="true" />
          </button>
          <span className="ms-auto text-xs text-muted-foreground">{t('product.saveOrCompare')}</span>
        </div>
      </div>
    </div>
  );
});

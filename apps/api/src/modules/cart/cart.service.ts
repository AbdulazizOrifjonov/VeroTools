import { Types } from 'mongoose';
import type { Language } from '@vero/config';
import { LIMITS } from '@vero/config';
import type { CartDTO, CartItemDTO, CartItemWarning } from '@vero/types';
import { lineId, parseLineId } from '@vero/utils';
import { Cart, type ICart } from '../../models/cart.model';
import { Product, type IProduct } from '../../models/product.model';
import { HttpError, badRequest, notFound } from '../../lib/http-error';
import { iso, loc, toImageRef } from '../../lib/localize';
import { emitSync } from '../../lib/socket';
import { getSetting } from '../settings/settings.service';
import { getCatalogIndex } from '../catalog/catalog-index';
import { stockInfo } from '../catalog/serializers';
import { defaultFreeThreshold } from '../delivery/delivery.service';
import { evaluateCoupon, type CouponResult } from './coupon.service';
import { guestExpiry, ownerFilter, syncTarget, type Owner } from './owner';
import { clock } from '../../lib/clock';

const PRODUCT_FIELDS =
  'slug sku name brand category categoryPath images price oldPrice regularPrice costPrice status stock variants deliveryDays warrantyMonths promotion';

export interface ResolvedLine {
  productId: Types.ObjectId;
  variantId: Types.ObjectId | null;
  product: IProduct;
  variant: IProduct['variants'][number] | null;
  quantity: number;
  requested: number;
  available: number;
  price: number;
  oldPrice?: number;
  regularPrice: number;
  costPrice: number;
  isAvailable: boolean;
  warning?: CartItemWarning;
  addedAt: Date;
  priceAtAdd: number;
}

export async function findCart(owner: Owner): Promise<ICart | null> {
  return Cart.findOne(ownerFilter(owner)).lean();
}

async function getOrCreateCart(owner: Owner): Promise<ICart> {
  const filter = ownerFilter(owner);
  const cart = await Cart.findOneAndUpdate(
    filter,
    { $setOnInsert: { ...filter, items: [] }, $set: { expiresAt: guestExpiry(owner) } },
    { upsert: true, new: true },
  ).lean();
  return cart!;
}

/** Resolves cart items against live product data (price, stock, availability). */
export async function resolveLines(items: ICart['items']): Promise<ResolvedLine[]> {
  if (!items.length) return [];
  const ids = [...new Set(items.map((i) => String(i.product)))].map((id) => new Types.ObjectId(id));
  const products = await Product.find({ _id: { $in: ids } }).select(PRODUCT_FIELDS).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  return items.map((item) => {
    const product = byId.get(String(item.product));
    const variant = product && item.variant ? product.variants.find((v) => String(v._id) === String(item.variant)) ?? null : null;
    const published = !!product && product.status === 'published';
    const variantOk = !item.variant || (!!variant && variant.isActive !== false);
    const available = variant ? variant.stock?.available ?? 0 : product?.stock?.available ?? 0;
    const price = variant ? variant.price : product?.price ?? 0;
    const oldPrice = variant ? variant.oldPrice : product?.oldPrice;
    let warning: CartItemWarning | undefined;
    let quantity = item.quantity;
    let isAvailable = published && variantOk;
    if (!isAvailable) warning = 'UNAVAILABLE';
    else if (available <= 0) {
      warning = 'OUT_OF_STOCK';
      isAvailable = false;
    } else if (quantity > available) {
      warning = 'QUANTITY_REDUCED';
      quantity = available;
    } else if (item.priceAtAdd && price !== item.priceAtAdd) warning = 'PRICE_CHANGED';
    return {
      productId: item.product,
      variantId: item.variant ?? null,
      product: product as IProduct,
      variant,
      quantity,
      requested: item.quantity,
      available,
      price,
      oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
      regularPrice: variant ? variant.regularPrice : product?.regularPrice ?? price,
      costPrice: variant ? variant.costPrice : product?.costPrice ?? 0,
      isAvailable,
      warning,
      addedAt: item.addedAt,
      priceAtAdd: item.priceAtAdd,
    };
  });
}

export function toCartItemDTO(l: ResolvedLine, lang: Language, lowThreshold: number, brandName?: string): CartItemDTO {
  const name = l.product ? loc(l.product.name, lang) : '';
  const image = l.variant?.image ?? l.product?.images?.[0];
  return {
    id: lineId(String(l.productId), l.variantId ? String(l.variantId) : null),
    productId: String(l.productId),
    variantId: l.variantId ? String(l.variantId) : undefined,
    slug: l.product?.slug ?? '',
    sku: l.variant?.sku ?? l.product?.sku ?? '',
    name,
    variantName: l.variant ? loc(l.variant.name, lang) : undefined,
    brandName,
    image: toImageRef(image, lang, name),
    price: l.price,
    oldPrice: l.oldPrice,
    quantity: l.quantity,
    maxQuantity: Math.min(LIMITS.cartMaxLineQuantity, Math.max(0, l.available)),
    lineTotal: l.isAvailable ? l.price * l.quantity : 0,
    lineOldTotal: l.isAvailable ? (l.oldPrice ?? l.price) * l.quantity : 0,
    stock: stockInfo(l.variant?.stock ?? l.product?.stock, lowThreshold),
    isAvailable: l.isAvailable,
    warning: l.warning,
    deliveryDays: { min: l.product?.deliveryDays?.min ?? 1, max: l.product?.deliveryDays?.max ?? 3 },
    warrantyMonths: l.product?.warrantyMonths ?? 0,
    addedAt: iso(l.addedAt)!,
  };
}

/** Builds the cart response; persists quantity corrections and acknowledges price changes. */
export async function cartView(cart: ICart | null, lang: Language, userId?: Types.ObjectId | null): Promise<CartDTO> {
  const idx = await getCatalogIndex();
  const low = await getSetting('inventory.lowStockThreshold');
  const threshold = await defaultFreeThreshold();
  const lines = await resolveLines(cart?.items ?? []);

  if (cart && lines.some((l) => l.quantity !== l.requested || (l.warning === 'PRICE_CHANGED' && l.isAvailable))) {
    await Cart.updateOne(
      { _id: cart._id },
      {
        $set: {
          items: cart.items.map((item, i) => {
            const l = lines[i]!;
            return { ...item, quantity: Math.max(1, l.quantity || item.quantity), priceAtAdd: l.isAvailable ? l.price : item.priceAtAdd };
          }),
        },
      },
    );
  }

  const items = lines.map((l) => toCartItemDTO(l, lang, low, l.product?.brand ? idx.brands.get(String(l.product.brand))?.name : undefined));
  const available = lines.filter((l) => l.isAvailable);
  const subtotal = available.reduce((s, l) => s + l.price * l.quantity, 0);
  const oldSubtotal = available.reduce((s, l) => s + (l.oldPrice ?? l.price) * l.quantity, 0);

  let coupon: CouponResult | null = null;
  let couponError: string | undefined;
  if (cart?.couponCode && available.length) {
    try {
      coupon = await evaluateCoupon(
        cart.couponCode,
        available.map((l) => ({ productId: l.productId, categoryPath: l.product.categoryPath ?? [], brand: l.product.brand, lineTotal: l.price * l.quantity })),
        { userId, lang },
      );
    } catch (e) {
      couponError = e instanceof HttpError ? e.code : 'COUPON_INVALID';
    }
  }
  const couponDiscount = coupon?.discount ?? 0;
  const total = Math.max(0, subtotal - couponDiscount);
  const maxDays = available.reduce((m, l) => Math.max(m, l.product.deliveryDays?.max ?? 3), 0);
  const minDays = available.reduce((m, l) => Math.max(m, l.product.deliveryDays?.min ?? 1), 0);

  return {
    id: cart ? String(cart._id) : '',
    items,
    coupon: coupon
      ? { code: coupon.coupon.code, type: coupon.coupon.type, value: coupon.coupon.value, discount: coupon.discount, description: coupon.description }
      : undefined,
    couponError,
    totals: {
      itemsCount: available.reduce((s, l) => s + l.quantity, 0),
      linesCount: items.length,
      subtotal,
      oldSubtotal,
      productDiscount: Math.max(0, oldSubtotal - subtotal),
      couponDiscount,
      total,
      freeDeliveryThreshold: threshold,
      amountToFreeDelivery: Math.max(0, threshold - total),
    },
    estimatedDelivery: available.length ? { minDays, maxDays } : undefined,
    updatedAt: iso(cart?.updatedAt ?? new Date())!,
  };
}

export async function getCart(owner: Owner, lang: Language): Promise<CartDTO> {
  return cartView(await findCart(owner), lang, owner.userId);
}

function notify(owner: Owner, origin?: string | null) {
  emitSync(syncTarget(owner), 'cart', origin);
}

async function loadSellable(productId: string, variantId?: string | null) {
  if (!Types.ObjectId.isValid(productId)) throw notFound('Product');
  const product = await Product.findOne({ _id: productId, status: 'published' }).select('price variants stock').lean();
  if (!product) throw new HttpError(404, 'PRODUCT_UNAVAILABLE', 'Product is not available');
  const activeVariants = (product.variants ?? []).filter((v) => v.isActive !== false);
  let variant = variantId ? activeVariants.find((v) => String(v._id) === String(variantId)) : undefined;
  if (variantId && !variant) throw new HttpError(404, 'PRODUCT_UNAVAILABLE', 'Variant is not available');
  if (!variant && activeVariants.length === 1) variant = activeVariants[0];
  if (!variant && activeVariants.length > 1) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Please choose an option', { fields: { variantId: 'validation.required' } });
  }
  return {
    product,
    variant: variant ?? null,
    available: variant ? variant.stock?.available ?? 0 : product.stock?.available ?? 0,
    price: variant ? variant.price : product.price,
  };
}

export async function addItem(owner: Owner, input: { productId: string; variantId?: string; quantity: number }, lang: Language, origin?: string | null) {
  const { variant, available, price } = await loadSellable(input.productId, input.variantId);
  const cart = await getOrCreateCart(owner);
  const variantId = variant ? String(variant._id) : null;
  const existing = cart.items.find((i) => String(i.product) === input.productId && String(i.variant ?? '') === String(variantId ?? ''));
  const nextQty = (existing?.quantity ?? 0) + input.quantity;
  if (available <= 0) throw new HttpError(409, 'OUT_OF_STOCK', 'Product is out of stock');
  if (nextQty > available) {
    throw new HttpError(409, 'INSUFFICIENT_STOCK', 'Not enough stock', { details: { available, inCart: existing?.quantity ?? 0 } });
  }
  if (!existing && cart.items.length >= LIMITS.cartMaxLines) throw new HttpError(422, 'CART_LIMIT', 'Too many items in cart');
  if (existing) {
    await Cart.updateOne(
      { _id: cart._id },
      { $set: { 'items.$[line].quantity': nextQty, 'items.$[line].priceAtAdd': price, expiresAt: guestExpiry(owner) } },
      { arrayFilters: [{ 'line.product': new Types.ObjectId(input.productId), 'line.variant': variantId ? new Types.ObjectId(variantId) : null }] },
    );
  } else {
    await Cart.updateOne(
      { _id: cart._id },
      {
        $push: {
          items: {
            product: new Types.ObjectId(input.productId),
            variant: variantId ? new Types.ObjectId(variantId) : null,
            quantity: input.quantity,
            priceAtAdd: price,
            addedAt: clock.now(),
          },
        },
        $set: { expiresAt: guestExpiry(owner) },
      },
    );
  }
  notify(owner, origin);
  return getCart(owner, lang);
}

export async function updateItem(owner: Owner, line: string, quantity: number, lang: Language, origin?: string | null) {
  if (quantity <= 0) return removeItem(owner, line, lang, origin);
  const { productId, variantId } = parseLineId(line);
  const cart = await findCart(owner);
  const item = cart?.items.find((i) => String(i.product) === productId && String(i.variant ?? '') === String(variantId ?? ''));
  if (!cart || !item) throw notFound('Cart item');
  const { available, price } = await loadSellable(productId, variantId);
  if (quantity > available) throw new HttpError(409, 'INSUFFICIENT_STOCK', 'Not enough stock', { details: { available } });
  await Cart.updateOne(
    { _id: cart._id },
    { $set: { 'items.$[line].quantity': quantity, 'items.$[line].priceAtAdd': price, expiresAt: guestExpiry(owner) } },
    { arrayFilters: [{ 'line.product': new Types.ObjectId(productId), 'line.variant': variantId ? new Types.ObjectId(variantId) : null }] },
  );
  notify(owner, origin);
  return getCart(owner, lang);
}

export async function removeItem(owner: Owner, line: string, lang: Language, origin?: string | null) {
  const { productId, variantId } = parseLineId(line);
  if (!Types.ObjectId.isValid(productId)) throw badRequest('BAD_REQUEST', 'Invalid line id');
  await Cart.updateOne(ownerFilter(owner), {
    $pull: { items: { product: new Types.ObjectId(productId), variant: variantId ? new Types.ObjectId(variantId) : null } },
  });
  notify(owner, origin);
  return getCart(owner, lang);
}

export async function clearCart(owner: Owner, lang: Language, origin?: string | null) {
  await Cart.updateOne(ownerFilter(owner), { $set: { items: [], couponCode: null } });
  notify(owner, origin);
  return getCart(owner, lang);
}

export async function applyCoupon(owner: Owner, code: string, lang: Language, origin?: string | null) {
  const cart = await findCart(owner);
  const lines = (await resolveLines(cart?.items ?? [])).filter((l) => l.isAvailable);
  if (!lines.length) throw new HttpError(422, 'CART_EMPTY', 'Cart is empty');
  await evaluateCoupon(
    code,
    lines.map((l) => ({ productId: l.productId, categoryPath: l.product.categoryPath ?? [], brand: l.product.brand, lineTotal: l.price * l.quantity })),
    { userId: owner.userId, lang },
  );
  await Cart.updateOne({ _id: cart!._id }, { $set: { couponCode: code.trim().toUpperCase() } });
  notify(owner, origin);
  return getCart(owner, lang);
}

export async function removeCoupon(owner: Owner, lang: Language, origin?: string | null) {
  await Cart.updateOne(ownerFilter(owner), { $set: { couponCode: null } });
  notify(owner, origin);
  return getCart(owner, lang);
}

/**
 * Merges a guest cart into the user's cart after sign-in: quantities are summed and capped by
 * available stock; the user's coupon wins, otherwise the guest coupon is kept. The guest cart is removed.
 */
export async function mergeGuestCart(guestId: string, userId: Types.ObjectId): Promise<boolean> {
  const guest = await Cart.findOne({ guestId }).lean();
  if (!guest || !guest.items.length) {
    if (guest) await Cart.deleteOne({ _id: guest._id });
    return false;
  }
  const user = await getOrCreateCart({ userId });
  const lines = await resolveLines([...user.items, ...guest.items]);
  const merged = new Map<string, ICart['items'][number]>();
  lines.forEach((l, i) => {
    const src = i < user.items.length ? user.items[i]! : guest.items[i - user.items.length]!;
    const key = `${l.productId}:${l.variantId ?? ''}`;
    const prev = merged.get(key);
    const qty = Math.min((prev?.quantity ?? 0) + src.quantity, Math.max(1, l.available || src.quantity));
    merged.set(key, { ...src, quantity: qty, addedAt: prev?.addedAt ?? src.addedAt });
  });
  await Cart.updateOne(
    { _id: user._id },
    { $set: { items: [...merged.values()].slice(0, LIMITS.cartMaxLines), couponCode: user.couponCode || guest.couponCode || null, expiresAt: null } },
  );
  await Cart.deleteOne({ _id: guest._id });
  emitSync({ userId: String(userId) }, 'cart');
  return true;
}

export async function cartCount(owner: Owner): Promise<number> {
  const cart = await Cart.findOne(ownerFilter(owner)).select('items.quantity').lean();
  return (cart?.items ?? []).reduce((s, i) => s + i.quantity, 0);
}

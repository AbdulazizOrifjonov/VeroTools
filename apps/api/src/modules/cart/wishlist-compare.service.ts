import { Types } from 'mongoose';
import type { Language } from '@vero/config';
import { LIMITS } from '@vero/config';
import type { CompareDTO, CompareGroup, CompareRow, WishlistDTO } from '@vero/types';
import { formatPrice } from '@vero/utils';
import { Comparison, Wishlist } from '../../models/wishlist.model';
import { Product, type IProduct } from '../../models/product.model';
import { HttpError, notFound } from '../../lib/http-error';
import { iso, loc } from '../../lib/localize';
import { emitSync } from '../../lib/socket';
import { getCatalogIndex } from '../catalog/catalog-index';
import { CARD_PROJECTION, displaySpecValue, toProductCard } from '../catalog/serializers';
import { getSetting } from '../settings/settings.service';
import { guestExpiry, ownerFilter, syncTarget, type Owner } from './owner';
import { clock } from '../../lib/clock';

async function assertProduct(productId: string) {
  if (!Types.ObjectId.isValid(productId)) throw notFound('Product');
  const product = await Product.findOne({ _id: productId, status: 'published' }).select('price').lean();
  if (!product) throw new HttpError(404, 'PRODUCT_UNAVAILABLE', 'Product is not available');
  return product;
}

/* -------------------------------- wishlist ------------------------------- */

export async function wishlistIds(owner: Owner): Promise<string[]> {
  const doc = await Wishlist.findOne(ownerFilter(owner)).select('items.product').lean();
  return (doc?.items ?? []).map((i) => String(i.product));
}

export async function addToWishlist(owner: Owner, productId: string, origin?: string | null) {
  const product = await assertProduct(productId);
  const filter = ownerFilter(owner);
  const doc = await Wishlist.findOneAndUpdate(filter, { $setOnInsert: { ...filter, items: [] }, $set: { expiresAt: guestExpiry(owner) } }, { upsert: true, new: true }).lean();
  if (!doc!.items.some((i) => String(i.product) === productId)) {
    if (doc!.items.length >= LIMITS.wishlistMax) throw new HttpError(422, 'LIMIT_REACHED', 'Wishlist is full');
    await Wishlist.updateOne(
      { _id: doc!._id },
      { $push: { items: { $each: [{ product: new Types.ObjectId(productId), addedAt: clock.now(), priceAtAdd: product.price, notifiedPrice: product.price }], $position: 0 } } },
    );
  }
  emitSync(syncTarget(owner), 'wishlist', origin);
  return { ids: await wishlistIds(owner) };
}

export async function removeFromWishlist(owner: Owner, productId: string, origin?: string | null) {
  if (!Types.ObjectId.isValid(productId)) throw notFound('Product');
  await Wishlist.updateOne(ownerFilter(owner), { $pull: { items: { product: new Types.ObjectId(productId) } } });
  emitSync(syncTarget(owner), 'wishlist', origin);
  return { ids: await wishlistIds(owner) };
}

export async function getWishlist(owner: Owner, lang: Language): Promise<WishlistDTO> {
  const doc = await Wishlist.findOne(ownerFilter(owner)).lean();
  const items = doc?.items ?? [];
  if (!items.length) return { count: 0, items: [] };
  const idx = await getCatalogIndex();
  const low = await getSetting('inventory.lowStockThreshold');
  const products = await Product.find({ _id: { $in: items.map((i) => i.product) }, status: 'published' }).select(CARD_PROJECTION).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const out = items
    .map((i) => {
      const p = byId.get(String(i.product));
      if (!p) return null;
      return {
        productId: String(i.product),
        addedAt: iso(i.addedAt)!,
        priceAtAdd: i.priceAtAdd,
        priceChange: i.priceAtAdd ? p.price - i.priceAtAdd : 0,
        product: toProductCard(p, lang, idx, low),
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  return { count: out.length, items: out };
}

export async function mergeGuestWishlist(guestId: string, userId: Types.ObjectId) {
  const guest = await Wishlist.findOne({ guestId }).lean();
  if (!guest) return;
  if (guest.items.length) {
    const user = await Wishlist.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId, items: [] } }, { upsert: true, new: true }).lean();
    const have = new Set(user!.items.map((i) => String(i.product)));
    const add = guest.items.filter((i) => !have.has(String(i.product)));
    if (add.length) await Wishlist.updateOne({ _id: user!._id }, { $push: { items: { $each: add, $position: 0, $slice: LIMITS.wishlistMax } } });
    emitSync({ userId: String(userId) }, 'wishlist');
  }
  await Wishlist.deleteOne({ _id: guest._id });
}

/* -------------------------------- compare -------------------------------- */

export async function compareIds(owner: Owner): Promise<string[]> {
  const doc = await Comparison.findOne(ownerFilter(owner)).select('items.product').lean();
  return (doc?.items ?? []).map((i) => String(i.product));
}

export async function addToCompare(owner: Owner, productId: string, origin?: string | null) {
  await assertProduct(productId);
  const filter = ownerFilter(owner);
  const doc = await Comparison.findOneAndUpdate(filter, { $setOnInsert: { ...filter, items: [] }, $set: { expiresAt: guestExpiry(owner) } }, { upsert: true, new: true }).lean();
  if (!doc!.items.some((i) => String(i.product) === productId)) {
    if (doc!.items.length >= LIMITS.compareMax) {
      throw new HttpError(422, 'LIMIT_REACHED', 'Compare list is full', { details: { max: LIMITS.compareMax } });
    }
    await Comparison.updateOne({ _id: doc!._id }, { $push: { items: { product: new Types.ObjectId(productId), addedAt: clock.now() } } });
  }
  emitSync(syncTarget(owner), 'compare', origin);
  return { ids: await compareIds(owner) };
}

export async function removeFromCompare(owner: Owner, productId: string, origin?: string | null) {
  if (!Types.ObjectId.isValid(productId)) throw notFound('Product');
  await Comparison.updateOne(ownerFilter(owner), { $pull: { items: { product: new Types.ObjectId(productId) } } });
  emitSync(syncTarget(owner), 'compare', origin);
  return { ids: await compareIds(owner) };
}

export async function clearCompare(owner: Owner, origin?: string | null) {
  await Comparison.updateOne(ownerFilter(owner), { $set: { items: [] } });
  emitSync(syncTarget(owner), 'compare', origin);
  return { ids: [] as string[] };
}

const LABELS: Record<Language, { price: string; brand: string; rating: string; warranty: string; availability: string; delivery: string; months: string; days: string; inStock: string; out: string }> = {
  uz: { price: 'Narx', brand: 'Brend', rating: 'Reyting', warranty: 'Kafolat', availability: 'Mavjudligi', delivery: 'Yetkazib berish', months: 'oy', days: 'kun', inStock: 'Mavjud', out: 'Mavjud emas' },
  ru: { price: 'Цена', brand: 'Бренд', rating: 'Рейтинг', warranty: 'Гарантия', availability: 'Наличие', delivery: 'Доставка', months: 'мес.', days: 'дн.', inStock: 'В наличии', out: 'Нет в наличии' },
  en: { price: 'Price', brand: 'Brand', rating: 'Rating', warranty: 'Warranty', availability: 'Availability', delivery: 'Delivery', months: 'mo.', days: 'days', inStock: 'In stock', out: 'Out of stock' },
};

function row(key: string, label: string, values: Array<string | null>, group: CompareRow['group'], unit?: string): CompareRow {
  const distinct = new Set(values.filter((v) => v !== null && v !== ''));
  return { key, label, unit, group, values, isDifferent: distinct.size > 1 || (distinct.size === 1 && values.some((v) => v === null)) };
}

export async function getCompare(owner: Owner, lang: Language): Promise<CompareDTO> {
  const doc = await Comparison.findOne(ownerFilter(owner)).lean();
  const ids = (doc?.items ?? []).map((i) => i.product);
  if (!ids.length) return { count: 0, productIds: [], groups: [] };
  const idx = await getCatalogIndex();
  const low = await getSetting('inventory.lowStockThreshold');
  const products = await Product.find({ _id: { $in: ids }, status: 'published' }).lean<IProduct[]>();
  const ordered = ids.map((id) => products.find((p) => String(p._id) === String(id))).filter((p): p is IProduct => !!p);
  const L = LABELS[lang];

  const groupsMap = new Map<string, IProduct[]>();
  for (const p of ordered) {
    const key = String(p.category);
    groupsMap.set(key, [...(groupsMap.get(key) ?? []), p]);
  }
  const groups: CompareGroup[] = [...groupsMap.entries()].map(([catId, items]) => {
    const cat = idx.categories.get(catId);
    const rows: CompareRow[] = [
      row('price', L.price, items.map((p) => formatPrice(p.price, lang)), 'overview'),
      row('brand', L.brand, items.map((p) => (p.brand ? idx.brands.get(String(p.brand))?.name ?? null : null)), 'overview'),
      row('rating', L.rating, items.map((p) => (p.rating?.count ? `${p.rating.average.toFixed(1)} (${p.rating.count})` : null)), 'overview'),
      row('warranty', L.warranty, items.map((p) => (p.warrantyMonths ? `${p.warrantyMonths} ${L.months}` : null)), 'overview'),
      row('availability', L.availability, items.map((p) => ((p.stock?.available ?? 0) > 0 ? L.inStock : L.out)), 'overview'),
      row('delivery', L.delivery, items.map((p) => `${p.deliveryDays?.min ?? 1}–${p.deliveryDays?.max ?? 3} ${L.days}`), 'overview'),
    ];
    const keys = [...new Set(items.flatMap((p) => (p.specs ?? []).map((s) => s.key)))].sort(
      (a, b) => (idx.specs.get(a)?.order ?? 999) - (idx.specs.get(b)?.order ?? 999),
    );
    for (const key of keys) {
      const def = idx.specs.get(key);
      rows.push(
        row(
          key,
          def ? loc(def.label, lang) : key,
          items.map((p) => {
            const s = p.specs?.find((x) => x.key === key);
            return s ? displaySpecValue(s, def, lang) : null;
          }),
          def?.group ?? 'general',
          def?.unit,
        ),
      );
    }
    return {
      category: { id: catId, slug: cat?.slug ?? '', name: cat ? loc(cat.name, lang) : '' },
      products: items.map((p) => toProductCard(p, lang, idx, low)),
      rows,
    };
  });
  return { count: ordered.length, productIds: ordered.map((p) => String(p._id)), groups };
}

export async function mergeGuestCompare(guestId: string, userId: Types.ObjectId) {
  const guest = await Comparison.findOne({ guestId }).lean();
  if (!guest) return;
  if (guest.items.length) {
    const user = await Comparison.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId, items: [] } }, { upsert: true, new: true }).lean();
    const have = new Set(user!.items.map((i) => String(i.product)));
    const add = guest.items.filter((i) => !have.has(String(i.product))).slice(0, Math.max(0, LIMITS.compareMax - user!.items.length));
    if (add.length) await Comparison.updateOne({ _id: user!._id }, { $push: { items: { $each: add } } });
    emitSync({ userId: String(userId) }, 'compare');
  }
  await Comparison.deleteOne({ _id: guest._id });
}

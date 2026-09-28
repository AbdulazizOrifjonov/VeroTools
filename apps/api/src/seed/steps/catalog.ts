import { type Types } from 'mongoose';
import { productInputSchema, type ProductData } from '@vero/validation';
import { cache, CacheTags } from '../../lib/cache';
import { clock } from '../../lib/clock';
import { Brand } from '../../models/brand.model';
import { Product } from '../../models/product.model';
import { Banner, Coupon, Promotion } from '../../models/marketing.model';
import { toImageValue, uploadFile, type Uploader } from '../../modules/media/media.service';
import { createProduct } from '../../modules/admin/products.admin';
import { recountCatalog } from '../../modules/catalog/products.service';
import { countPromotionTargets, refreshAllPricing } from '../../modules/catalog/promotions.service';
import { invalidateCatalogIndex } from '../../modules/catalog/catalog-index';
import type { MediaFolder } from '@vero/types';
import { renderBanner, renderBrandLogo, renderProductImage, renderPromotionImage } from '../assets';
import { BRANDS } from '../data/brands';
import { PRODUCTS } from '../data/products';
import { PROMOTIONS } from '../data/promotions';
import { COUPONS } from '../data/coupons';
import { BANNERS } from '../data/banners';
import type { L, SeedBanner, SeedProduct } from '../data/types';
import { pool, type Rng } from '../rng';
import type { SeedLog } from './log';

const DAY = 86_400_000;
const EMPTY: L = { uz: '', ru: '', en: '' };

async function storePng(png: Buffer, folder: MediaFolder, name: string, uploader: Uploader, alt?: L, tags: string[] = []) {
  const media = await uploadFile({ buffer: png, originalname: `${name}.png`, size: png.length }, folder, uploader, { alt, tags });
  return { media, image: toImageValue(media) };
}

export interface CatalogRefs {
  categories: Map<string, Types.ObjectId>;
  brands: Map<string, Types.ObjectId>;
  products: Map<string, Types.ObjectId>; // by SKU (product + variant SKUs)
}

/* ----------------------------------------------------------------- brands */

export async function seedBrands(log: SeedLog, uploader: Uploader): Promise<Map<string, Types.ObjectId>> {
  const map = new Map<string, Types.ObjectId>();
  if (await Brand.exists({})) {
    const bySlug = new Map((await Brand.find().select('slug').lean()).map((b) => [b.slug, b._id]));
    for (const b of BRANDS) if (bySlug.has(b.slug)) map.set(b.key, bySlug.get(b.slug)!);
    log.skip('brands', 'already present');
    return map;
  }
  const logos = await pool(BRANDS, 4, async (b) => {
    const png = await renderBrandLogo(b.name, { primary: b.color, secondary: b.accent }, { width: 600, height: 200 });
    return (await storePng(png, 'brands', `${b.slug}-logo`, uploader, { uz: b.name, ru: b.name, en: b.name }, ['brand', 'logo'])).image;
  });
  for (const [i, b] of BRANDS.entries()) {
    const doc = await Brand.create({ name: b.name, slug: b.slug, description: b.description, country: b.country, website: b.website, logo: logos[i], isActive: true });
    map.set(b.key, doc._id);
  }
  invalidateCatalogIndex();
  log.done('brands', `${BRANDS.length} (fictional demo brands) with generated logos`);
  return map;
}

/* --------------------------------------------------------------- products */

function brandColors(brandKey: string) {
  const b = BRANDS.find((x) => x.key === brandKey);
  return { body: b?.color ?? '#FF4500', accent: b?.accent ?? '#303338' };
}

function toProductInput(p: SeedProduct, refs: { categoryId: Types.ObjectId; brandId?: Types.ObjectId }, images: string[]): ProductData {
  return productInputSchema.parse({
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    brand: refs.brandId ? String(refs.brandId) : undefined,
    category: String(refs.categoryId),
    shortDescription: p.shortDescription,
    description: p.description,
    price: p.price,
    oldPrice: p.oldPrice,
    costPrice: p.costPrice,
    minStock: p.minStock,
    initialStock: p.variants?.length ? undefined : p.stock,
    images: images.map((media) => ({ media })),
    videos: p.videos ?? [],
    specs: p.specs,
    tags: p.tags,
    warrantyMonths: p.warrantyMonths,
    deliveryDays: p.deliveryDays,
    weightKg: p.weightKg,
    seo: { title: p.seoTitle ?? EMPTY, description: p.seoDescription ?? EMPTY },
    flags: { featured: !!p.flags?.featured, isNew: !!p.flags?.isNew, bestseller: !!p.flags?.bestseller },
    status: 'published',
    variants: (p.variants ?? []).map((v) => ({
      sku: v.sku,
      name: v.name,
      attributes: v.attributes,
      price: v.price,
      oldPrice: v.oldPrice,
      costPrice: v.costPrice,
      isActive: true,
      initialStock: v.stock,
    })),
  });
}

/**
 * Products go through the same service as the admin "Create product" form: input validation, media library
 * images, normalised specs, inventory records with "Initial stock" movements and promotion pricing.
 */
export async function seedProducts(log: SeedLog, uploader: Uploader, refs: Omit<CatalogRefs, 'products'>, rng: Rng): Promise<Map<string, Types.ObjectId>> {
  const map = new Map<string, Types.ObjectId>();
  if (await Product.exists({})) {
    for (const p of await Product.find().select('sku variants.sku').lean()) {
      map.set(p.sku, p._id);
      for (const v of p.variants ?? []) map.set(v.sku, p._id);
    }
    log.skip('products', 'already present');
    return map;
  }
  // render illustrations first (CPU bound, parallel), then create products sequentially
  const imageSets = await pool(PRODUCTS, 4, async (p, i) => {
    const colors = brandColors(p.brand);
    const views: Array<'main' | 'detail' | 'package'> = i % 3 === 0 ? ['main', 'detail', 'package'] : ['main', 'detail'];
    const ids: string[] = [];
    for (const view of views) {
      const png = await renderProductImage(p.illustration, colors, { size: 1200, view });
      const { media } = await storePng(png, 'products', `${p.slug}-${view}`, uploader, p.name, ['product', p.category, view]);
      ids.push(String(media._id));
    }
    return ids;
  });

  const now = Date.now();
  for (const [i, p] of PRODUCTS.entries()) {
    const categoryId = refs.categories.get(p.category);
    if (!categoryId) throw new Error(`Unknown category ${p.category} for ${p.sku}`);
    // catalogue history: "new" products arrived during the last three weeks, the rest over the past year
    const ageDays = p.flags?.isNew ? rng.int(1, 20) : rng.int(45, 420);
    clock.pin(new Date(now - ageDays * DAY - rng.int(0, 8) * 3_600_000));
    const product = await createProduct(toProductInput(p, { categoryId, brandId: refs.brands.get(p.brand) }, imageSets[i]!), {
      bulk: true,
      actor: uploader,
      reference: { type: 'seed', label: 'Demo catalogue' },
    });
    map.set(p.sku, product._id);
    for (const v of p.variants ?? []) map.set(v.sku, product._id);
  }
  clock.pin(null);
  await recountCatalog();
  await cache.invalidate(CacheTags.home, CacheTags.catalog);
  const images = imageSets.reduce((s, x) => s + x.length, 0);
  log.done('products', `${PRODUCTS.length} with ${images} generated images, inventory and initial stock movements`);
  return map;
}

/* --------------------------------------------------- promotions / coupons */

export async function seedPromotions(log: SeedLog, uploader: Uploader, refs: CatalogRefs) {
  if (await Promotion.exists({})) return log.skip('promotions', 'already present');
  const now = Date.now();
  const images = await pool(PROMOTIONS, 3, async (p) => (await storePng(await renderPromotionImage(p.art, { width: 1200, height: 800 }), 'promotions', p.slug, uploader, p.name, ['promotion'])).image);
  for (const [i, p] of PROMOTIONS.entries()) {
    const target = {
      products: (p.products ?? []).map((sku) => refs.products.get(sku)).filter(Boolean) as Types.ObjectId[],
      categories: (p.categories ?? []).map((k) => refs.categories.get(k)).filter(Boolean) as Types.ObjectId[],
      brands: (p.brands ?? []).map((k) => refs.brands.get(k)).filter(Boolean) as Types.ObjectId[],
    };
    await Promotion.create({
      slug: p.slug,
      name: p.name,
      description: p.description,
      type: p.type,
      discountType: p.discountType,
      discountValue: p.discountValue,
      ...target,
      startsAt: new Date(now + p.startsInDays * DAY),
      endsAt: new Date(now + p.endsInDays * DAY),
      priority: p.priority,
      isActive: p.active,
      showOnHome: p.showOnHome,
      image: images[i],
      productCount: await countPromotionTargets(target),
    });
  }
  const { updated } = await refreshAllPricing(true);
  log.done('promotions', `${PROMOTIONS.length}, prices recalculated for ${updated} products`);
}

export async function seedCoupons(log: SeedLog, refs: CatalogRefs) {
  if (await Coupon.exists({})) return log.skip('coupons', 'already present');
  const now = Date.now();
  await Coupon.insertMany(
    COUPONS.map((c) => {
      const ids = (c.targets ?? []).map((t) =>
        c.scope === 'products' ? refs.products.get(t) : c.scope === 'categories' ? refs.categories.get(t) : c.scope === 'brands' ? refs.brands.get(t) : undefined,
      );
      const clean = ids.filter(Boolean) as Types.ObjectId[];
      return {
        code: c.code,
        description: c.description,
        type: c.type,
        value: c.value,
        maxDiscount: c.maxDiscount,
        scope: c.scope,
        products: c.scope === 'products' ? clean : [],
        categories: c.scope === 'categories' ? clean : [],
        brands: c.scope === 'brands' ? clean : [],
        minOrderAmount: c.minOrderAmount ?? 0,
        firstOrderOnly: !!c.firstOrderOnly,
        startsAt: new Date(now + c.startsInDays * DAY),
        expiresAt: new Date(now + c.expiresInDays * DAY),
        usageLimit: c.usageLimit,
        perUserLimit: c.perUserLimit,
        isActive: c.active,
      };
    }),
  );
  log.done('coupons', `${COUPONS.length}`);
}

/* ----------------------------------------------------------------- banners */

const BANNER_SIZES: Record<SeedBanner['placement'], { desktop: [number, number]; mobile: [number, number] }> = {
  home_hero: { desktop: [1600, 560], mobile: [800, 800] },
  home_secondary: { desktop: [800, 400], mobile: [800, 500] },
  home_middle: { desktop: [1600, 400], mobile: [800, 600] },
  catalog_top: { desktop: [1600, 300], mobile: [800, 400] },
};

export async function seedBanners(log: SeedLog, uploader: Uploader) {
  if (await Banner.exists({})) return log.skip('banners', 'already present');
  const now = Date.now();
  const art = await pool(BANNERS, 3, async (b, i) => {
    const size = BANNER_SIZES[b.placement];
    const desktop = await renderBanner(b.art, { width: size.desktop[0], height: size.desktop[1] });
    const mobile = await renderBanner(b.art, { width: size.mobile[0], height: size.mobile[1] });
    return {
      desktop: (await storePng(desktop, 'banners', `banner-${i + 1}-desktop`, uploader, b.title, ['banner', b.placement])).image,
      mobile: (await storePng(mobile, 'banners', `banner-${i + 1}-mobile`, uploader, b.title, ['banner', b.placement])).image,
    };
  });
  await Banner.insertMany(
    BANNERS.map((b, i) => ({
      placement: b.placement,
      title: b.title,
      subtitle: b.subtitle,
      buttonText: b.buttonText,
      buttonUrl: b.buttonUrl,
      imageDesktop: art[i]!.desktop,
      imageMobile: art[i]!.mobile,
      textTheme: b.textTheme,
      startsAt: new Date(now + b.startsInDays * DAY),
      endsAt: new Date(now + b.endsInDays * DAY),
      priority: b.priority,
      isActive: b.active,
    })),
  );
  await cache.invalidate(CacheTags.home);
  log.done('banners', `${BANNERS.length} with desktop + mobile artwork`);
}

import {
  alternatePaths,
  LANGUAGES,
  localizedPath,
  NOINDEX_PREFIXES,
  parseLocalizedPath,
  STORE_ROUTES,
  type Language,
} from '@vero/config';
import { PAGE_SLUGS, type SeoMetaDTO } from '@vero/types';
import { pickLocalized, stripTags } from '@vero/utils';
import { env } from '../../config/env';
import { cache, CacheTags } from '../../lib/cache';
import { absoluteUrl } from '../../lib/localize';
import { Product } from '../../models/product.model';
import { Page, Faq } from '../../models/content.model';
import { Promotion } from '../../models/marketing.model';
import { getCatalogIndex, type CatalogIndex } from '../catalog/catalog-index';
import { getSettings } from '../settings/settings.service';

type Tri = Record<Language, string>;
const t3 = (uz: string, ru: string, en: string): Tri => ({ uz, ru, en });

const STATIC_TITLES: Record<string, Tri> = {
  '/catalog': t3('Mahsulotlar katalogi', 'Каталог товаров', 'Product catalogue'),
  '/brands': t3('Brendlar', 'Бренды', 'Brands'),
  '/promotions': t3('Aksiyalar va chegirmalar', 'Акции и скидки', 'Promotions and discounts'),
  '/faq': t3("Ko'p beriladigan savollar", 'Частые вопросы', 'Frequently asked questions'),
  '/search': t3('Qidiruv', 'Поиск', 'Search'),
  '/cart': t3('Savat', 'Корзина', 'Cart'),
  '/checkout': t3('Buyurtmani rasmiylashtirish', 'Оформление заказа', 'Checkout'),
  '/compare': t3('Taqqoslash', 'Сравнение', 'Compare'),
  '/wishlist': t3('Sevimlilar', 'Избранное', 'Wishlist'),
  '/login': t3('Kirish', 'Вход', 'Sign in'),
  '/register': t3("Ro'yxatdan o'tish", 'Регистрация', 'Create account'),
  '/forgot-password': t3('Parolni tiklash', 'Восстановление пароля', 'Reset password'),
  '/reset-password': t3('Yangi parol', 'Новый пароль', 'New password'),
  '/verify-email': t3('Emailni tasdiqlash', 'Подтверждение email', 'Verify email'),
  '/account': t3('Shaxsiy kabinet', 'Личный кабинет', 'My account'),
};

const STATIC_DESCRIPTIONS: Record<string, Tri> = {
  '/catalog': t3(
    "Elektr asboblar, qo'l asboblari, generatorlar, kompressorlar, payvandlash uskunalari va boshqa mahsulotlar katalogi.",
    'Каталог электроинструмента, ручного инструмента, генераторов, компрессоров, сварочного оборудования и других товаров.',
    'Catalogue of power tools, hand tools, generators, compressors, welding equipment and more.',
  ),
  '/brands': t3("Do'konimizdagi barcha brendlar.", 'Все бренды нашего магазина.', 'All brands available in our store.'),
  '/promotions': t3('Amaldagi aksiyalar va chegirmalar.', 'Действующие акции и скидки.', 'Current promotions and discounts.'),
  '/faq': t3(
    "Buyurtma, yetkazib berish, to'lov va kafolat bo'yicha javoblar.",
    'Ответы на вопросы о заказе, доставке, оплате и гарантии.',
    'Answers about ordering, delivery, payment and warranty.',
  ),
};

const NOT_FOUND_TITLE = t3('Sahifa topilmadi', 'Страница не найдена', 'Page not found');
const OG_LOCALE: Record<Language, string> = { uz: 'uz_UZ', ru: 'ru_RU', en: 'en_US' };

export const siteUrl = () => env.CLIENT_URL.replace(/\/+$/, '');
const abs = (path: string) => `${siteUrl()}${path}`;
const clip = (text: string, max = 160) => {
  const clean = stripTags(text).replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
};

function breadcrumbs(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

function categoryTrail(idx: CatalogIndex, categoryId: string, lang: Language) {
  const cat = idx.categories.get(categoryId);
  if (!cat) return [];
  const chain = [...cat.ancestors.map((a) => idx.categories.get(String(a))).filter(Boolean), cat];
  return chain.map((c) => ({ name: pickLocalized(c!.name, lang), path: localizedPath(lang, STORE_ROUTES.category(c!.slug)) }));
}

/** <head> data for a storefront URL (used by the storefront server for crawlers & link previews). */
export async function resolveMeta(rawPath: string): Promise<SeoMetaDTO> {
  let pathname: string;
  try {
    pathname = decodeURIComponent((rawPath.split(/[?#]/)[0] || '/').replace(/\/{2,}/g, '/')).replace(/(.)\/$/, '$1');
  } catch {
    pathname = '/__invalid__';
  }
  if (!pathname.startsWith('/') || pathname.length > 300) pathname = '/__invalid__';
  const { lang, path } = parseLocalizedPath(pathname);
  const key = `${CacheTags.catalog}seo:meta:${lang}:${path}`;
  return cache.wrap(key, 120, () => buildMeta(lang, path));
}

async function buildMeta(lang: Language, path: string): Promise<SeoMetaDTO> {
  const [s, idx] = await Promise.all([getSettings(), getCatalogIndex()]);
  const siteName = s['store.name'] || 'OCKEAN';
  const homeTitle = pickLocalized(s['seo.title'], lang) || siteName;
  const homeDescription = pickLocalized(s['seo.description'], lang);
  const defaultImage = abs('/og-image.png');
  const homeCrumb = { name: siteName, path: localizedPath(lang, '/') };

  const base = (over: Partial<SeoMetaDTO> & { path: string }): SeoMetaDTO => {
    const { path: p, ...rest } = over;
    return {
      status: 200,
      lang,
      title: homeTitle,
      description: homeDescription,
      canonical: abs(localizedPath(lang, p)),
      alternates: alternatePaths(p).map((a) => ({ hreflang: a.lang, href: abs(a.path) })),
      image: defaultImage,
      type: 'website',
      noindex: false,
      siteName,
      locale: OG_LOCALE[lang],
      jsonLd: [],
      ...rest,
    };
  };
  const titled = (title: string) => (title.toLowerCase().includes(siteName.toLowerCase()) ? title : `${title} | ${siteName}`);
  const notFound = () =>
    base({ path, status: 404, noindex: true, title: titled(NOT_FOUND_TITLE[lang]), description: homeDescription, alternates: [] });

  // private / transactional pages
  if (NOINDEX_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    const staticKey = Object.keys(STATIC_TITLES).find((k) => path === k || path.startsWith(`${k}/`));
    return base({ path, noindex: true, title: titled(staticKey ? STATIC_TITLES[staticKey]![lang] : siteName), alternates: [] });
  }

  if (path === '/') {
    return base({
      path,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: siteName,
          url: siteUrl(),
          logo: abs('/logo-512.png'),
          email: s['store.email'] || undefined,
          telephone: s['store.phone'] || undefined,
          address: { '@type': 'PostalAddress', streetAddress: pickLocalized(s['store.address'], lang), addressCountry: 'UZ' },
          sameAs: [s['social.telegram'], s['social.instagram'], s['social.facebook'], s['social.youtube'], s['social.tiktok']].filter(Boolean),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: siteName,
          url: abs(localizedPath(lang, '/')),
          inLanguage: lang,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${abs(localizedPath(lang, STORE_ROUTES.search))}?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
      ],
    });
  }

  if (STATIC_TITLES[path] && STATIC_DESCRIPTIONS[path]) {
    const jsonLd: SeoMetaDTO['jsonLd'] = [breadcrumbs([homeCrumb, { name: STATIC_TITLES[path]![lang], path: localizedPath(lang, path) }])];
    if (path === '/faq') {
      const faqs = await Faq.find({ isActive: true }).sort({ order: 1 }).limit(50).lean();
      if (faqs.length) {
        jsonLd.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: pickLocalized(f.question, lang),
            acceptedAnswer: { '@type': 'Answer', text: clip(pickLocalized(f.answer, lang), 1000) },
          })),
        });
      }
    }
    return base({ path, title: titled(STATIC_TITLES[path]![lang]), description: STATIC_DESCRIPTIONS[path]![lang], jsonLd });
  }

  let m: RegExpExecArray | null;

  if ((m = /^\/product\/([^/]+)$/.exec(path))) {
    const product = await Product.findOne({ slug: m[1], status: 'published' }).lean();
    if (!product) return notFound();
    const name = pickLocalized(product.name, lang);
    const brand = product.brand ? idx.brands.get(String(product.brand)) : undefined;
    const description = clip(pickLocalized(product.seo?.description, lang) || pickLocalized(product.shortDescription, lang) || pickLocalized(product.description, lang));
    const images = product.images.map((i) => absoluteUrl(i.url)!).filter(Boolean);
    const url = abs(localizedPath(lang, STORE_ROUTES.product(product.slug)));
    return base({
      path: STORE_ROUTES.product(product.slug),
      type: 'product',
      title: titled(pickLocalized(product.seo?.title, lang) || name),
      description,
      image: images[0] ?? defaultImage,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name,
          sku: product.sku,
          image: images,
          description,
          brand: brand ? { '@type': 'Brand', name: brand.name } : undefined,
          offers: {
            '@type': 'Offer',
            url,
            priceCurrency: 'UZS',
            price: product.price,
            availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@type': 'Organization', name: siteName },
          },
          aggregateRating:
            product.rating?.count > 0
              ? { '@type': 'AggregateRating', ratingValue: product.rating.average, reviewCount: product.rating.count }
              : undefined,
        },
        breadcrumbs([homeCrumb, ...categoryTrail(idx, String(product.category), lang), { name, path: localizedPath(lang, STORE_ROUTES.product(product.slug)) }]),
      ],
    });
  }

  if ((m = /^\/catalog\/([^/]+)$/.exec(path))) {
    const cat = idx.categoriesBySlug.get(m[1]!);
    if (!cat || !cat.isActive) return notFound();
    const name = pickLocalized(cat.name, lang);
    return base({
      path: STORE_ROUTES.category(cat.slug),
      title: titled(pickLocalized(cat.seoTitle, lang) || name),
      description: clip(pickLocalized(cat.seoDescription, lang) || pickLocalized(cat.description, lang) || `${name} — ${siteName}`),
      image: absoluteUrl(cat.image?.url) ?? defaultImage,
      jsonLd: [breadcrumbs([homeCrumb, ...categoryTrail(idx, String(cat._id), lang)])],
    });
  }

  if ((m = /^\/brands\/([^/]+)$/.exec(path))) {
    const brand = idx.brandsBySlug.get(m[1]!);
    if (!brand || !brand.isActive) return notFound();
    return base({
      path: STORE_ROUTES.brand(brand.slug),
      title: titled(brand.name),
      description: clip(pickLocalized(brand.description, lang) || `${brand.name} — ${siteName}`),
      image: absoluteUrl(brand.logo?.url) ?? defaultImage,
      jsonLd: [
        breadcrumbs([
          homeCrumb,
          { name: STATIC_TITLES['/brands']![lang], path: localizedPath(lang, STORE_ROUTES.brands) },
          { name: brand.name, path: localizedPath(lang, STORE_ROUTES.brand(brand.slug)) },
        ]),
      ],
    });
  }

  if ((m = /^\/promotions\/([^/]+)$/.exec(path))) {
    const promo = await Promotion.findOne({ slug: m[1], isActive: true }).lean();
    if (!promo) return notFound();
    const name = pickLocalized(promo.name, lang);
    return base({
      path: STORE_ROUTES.promotion(promo.slug),
      title: titled(name),
      description: clip(pickLocalized(promo.description, lang) || name),
      image: absoluteUrl(promo.image?.url) ?? defaultImage,
      noindex: promo.endsAt < new Date(),
    });
  }

  const pageSlug = path.slice(1);
  if ((PAGE_SLUGS as readonly string[]).includes(pageSlug)) {
    const page = await Page.findOne({ slug: pageSlug, isPublished: true }).lean();
    if (!page) return notFound();
    const title = pickLocalized(page.title, lang);
    return base({
      path,
      type: 'article',
      title: titled(pickLocalized(page.seoTitle, lang) || title),
      description: clip(pickLocalized(page.seoDescription, lang) || pickLocalized(page.content, lang) || title),
      jsonLd: [breadcrumbs([homeCrumb, { name: title, path: localizedPath(lang, path) }])],
    });
  }

  return notFound();
}

/* ----------------------------------------------------------------- sitemap */

export interface SitemapEntry {
  path: string;
  /** YYYY-MM-DD */
  lastmod?: string;
  priority?: number;
}

export const SITEMAP_CHUNK = 15_000; // entries per file (× 3 languages stays below the 50 000 URL limit)

export async function sitemapEntries(): Promise<SitemapEntry[]> {
  return cache.wrap(`${CacheTags.catalog}seo:sitemap`, 600, async () => {
    const idx = await getCatalogIndex();
    const day = (d?: Date) => (d ? new Date(d).toISOString().slice(0, 10) : undefined);
    const [products, pages, promotions] = await Promise.all([
      Product.find({ status: 'published' }).select('slug updatedAt').sort({ _id: 1 }).lean(),
      Page.find({ isPublished: true }).select('slug updatedAt').lean(),
      Promotion.find({ isActive: true, endsAt: { $gt: new Date() } }).select('slug updatedAt').lean(),
    ]);
    const entries: SitemapEntry[] = [
      { path: '/', priority: 1 },
      { path: STORE_ROUTES.catalog, priority: 0.9 },
      { path: STORE_ROUTES.brands, priority: 0.6 },
      { path: STORE_ROUTES.promotions, priority: 0.7 },
      { path: STORE_ROUTES.faq, priority: 0.4 },
    ];
    for (const c of idx.categories.values()) if (c.isActive) entries.push({ path: STORE_ROUTES.category(c.slug), lastmod: day(c.updatedAt), priority: 0.8 });
    for (const b of idx.brands.values()) if (b.isActive) entries.push({ path: STORE_ROUTES.brand(b.slug), lastmod: day(b.updatedAt), priority: 0.5 });
    for (const p of promotions) entries.push({ path: STORE_ROUTES.promotion(p.slug), lastmod: day(p.updatedAt), priority: 0.6 });
    for (const p of pages) entries.push({ path: STORE_ROUTES.page(p.slug), lastmod: day(p.updatedAt), priority: 0.3 });
    for (const p of products) entries.push({ path: STORE_ROUTES.product(p.slug), lastmod: day(p.updatedAt), priority: 0.7 });
    return entries;
  });
}

const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderUrlSet(entries: SitemapEntry[]): string {
  const out: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ];
  for (const e of entries) {
    const alternates = alternatePaths(e.path)
      .map((a) => `<xhtml:link rel="alternate" hreflang="${a.lang}" href="${xmlEscape(abs(a.path))}"/>`)
      .join('');
    for (const lang of LANGUAGES) {
      out.push(
        `<url><loc>${xmlEscape(abs(localizedPath(lang, e.path)))}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}${
          e.priority !== undefined ? `<priority>${e.priority.toFixed(1)}</priority>` : ''
        }${alternates}</url>`,
      );
    }
  }
  out.push('</urlset>');
  return out.join('\n');
}

export function renderSitemapIndex(chunks: number): string {
  const now = new Date().toISOString().slice(0, 10);
  const items = Array.from({ length: chunks }, (_, i) => `<sitemap><loc>${xmlEscape(abs(`/sitemap-${i + 1}.xml`))}</loc><lastmod>${now}</lastmod></sitemap>`);
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...items, '</sitemapindex>'].join('\n');
}

export function robotsTxt(allowIndexing: boolean): string {
  if (!allowIndexing) return 'User-agent: *\nDisallow: /\n';
  const disallow = new Set<string>();
  for (const p of NOINDEX_PREFIXES) for (const lang of LANGUAGES) disallow.add(localizedPath(lang, p));
  return ['User-agent: *', 'Allow: /', ...[...disallow].map((p) => `Disallow: ${p}`), '', `Sitemap: ${abs('/sitemap.xml')}`, ''].join('\n');
}

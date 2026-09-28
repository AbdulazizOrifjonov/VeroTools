import { describe, expect, it } from 'vitest';
import { alternatePaths, localizedPath, parseLocalizedPath } from '@vero/config';
import { calcInstallment, formatPrice, normalizeUzPhone, resolveDatePreset, transliterate } from '@vero/utils';
import { bucketKeyOf, bucketKeys, defaultGranularity, profitBreakdown, resolveAnalyticsRange } from '../src/modules/analytics/analytics.service';
import { robotsTxt, renderUrlSet } from '../src/modules/seo/seo.service';
import { clock } from '../src/lib/clock';

describe('analytics buckets (Asia/Tashkent)', () => {
  it('assigns late-evening UTC timestamps to the next Tashkent day', () => {
    // 2026-09-20 19:30 UTC = 2026-09-21 00:30 in Tashkent (Monday)
    const d = new Date('2026-09-20T19:30:00Z');
    expect(bucketKeyOf(d, 'day')).toBe('2026-09-21');
    expect(bucketKeyOf(d, 'week')).toBe('2026-09-21');
    expect(bucketKeyOf(new Date('2026-09-20T18:30:00Z'), 'week')).toBe('2026-09-14');
    expect(bucketKeyOf(d, 'month')).toBe('2026-09');
  });

  it('enumerates zero-filled buckets for a range', () => {
    const range = resolveDatePreset('last7', new Date('2026-09-23T08:00:00Z'));
    expect(bucketKeys(range, 'day')).toHaveLength(7);
    expect(defaultGranularity(range)).toBe('day');
    const year = resolveDatePreset('thisYear', new Date('2026-09-23T08:00:00Z'));
    expect(defaultGranularity(year)).toBe('month');
    expect(bucketKeys(year, 'month')[0]).toBe('2026-01');
  });

  it('clamps ranges to today and rejects invalid custom ranges', () => {
    const now = new Date('2026-09-23T08:00:00Z');
    const r = resolveAnalyticsRange({ preset: 'thisYear' }, now);
    expect(r.to.getTime()).toBe(resolveDatePreset('today', now).to.getTime());
    expect(() => resolveAnalyticsRange({ preset: 'custom', from: 'not-a-date' }, now)).toThrow();
    expect(() => resolveAnalyticsRange({ preset: 'custom', from: '2026-09-10', to: '2026-09-01' }, now)).toThrow();
  });

  it('computes the profit breakdown', () => {
    const p = profitBreakdown(
      { orders: 3, acceptedOrders: 2, revenue: 1_000_000, grossSales: 1_100_000, promotionDiscount: 80_000, couponDiscount: 50_000, deliveryIncome: 30_000, productCost: 600_000, itemsSold: 4, cancelledOrders: 1, returnedOrders: 0 },
      { deliveryExpenses: 40_000, operationalExpenses: 160_000 },
    );
    expect(p).toMatchObject({ discounts: 130_000, estimatedProfit: 200_000, margin: 20 });
  });
});

describe('storefront URLs & SEO', () => {
  it('prefixes non-default languages', () => {
    expect(localizedPath('uz', '/product/x')).toBe('/product/x');
    expect(localizedPath('ru', '/')).toBe('/ru');
    expect(parseLocalizedPath('/en/catalog/drills')).toEqual({ lang: 'en', path: '/catalog/drills' });
    expect(alternatePaths('/faq').map((a) => a.lang)).toEqual(['uz', 'ru', 'en', 'x-default']);
  });

  it('renders sitemap entries with hreflang alternates for every language', () => {
    const xml = renderUrlSet([{ path: '/product/drill', lastmod: '2026-09-01' }]);
    expect(xml.match(/<url>/g)).toHaveLength(3);
    expect(xml).toContain('hreflang="x-default"');
    expect(robotsTxt(false)).toContain('Disallow: /');
    expect(robotsTxt(true)).toContain('Disallow: /ru/checkout');
  });
});

describe('shared utilities', () => {
  it('normalises Uzbek phone numbers', () => {
    expect(normalizeUzPhone('90 123 45 67')).toBe('+998901234567');
    expect(normalizeUzPhone('+998 (90) 123-45-67')).toBe('+998901234567');
    expect(normalizeUzPhone('12345')).toBeNull();
  });

  it('formats prices in so‘m per language', () => {
    expect(formatPrice(1_250_000, 'uz')).toMatch(/^1\s250\s000\sso'm$/);
    expect(formatPrice(1_250_000, 'ru')).toMatch(/сум$/);
  });

  it('calculates installment plans', () => {
    expect(calcInstallment(1_200_000, { months: 12, markupPercent: 15 })).toMatchObject({ total: 1_380_000, monthlyPayment: 115_000 });
  });

  it('transliterates Cyrillic search input', () => {
    expect(transliterate('дрель')).toBe('drel');
  });

  it('business clock can be pinned for history replays', () => {
    clock.pin(new Date('2025-01-01T00:00:00Z'));
    expect(clock.now().toISOString()).toBe('2025-01-01T00:00:00.000Z');
    clock.pin(null);
    expect(Math.abs(clock.ms() - Date.now())).toBeLessThan(1000);
  });
});

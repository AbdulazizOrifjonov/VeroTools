import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, createCatalog, makeProduct, setupDatabase, teardownDatabase, type Catalog } from './helpers';

let cat: Catalog;
const L = (uz: string, ru: string, en: string) => ({ uz, ru, en });

beforeAll(async () => {
  await setupDatabase('catalog');
  cat = await createCatalog();
  await makeProduct({
    category: cat.drillsId,
    brand: cat.brandA,
    name: L('Akkumulyatorli drel 18V', 'Аккумуляторная дрель 18В', 'Cordless drill 18V'),
    price: 1_200_000,
    oldPrice: 1_500_000,
    stock: 10,
    specs: [
      { key: 'power_w', value: 450 },
      { key: 'voltage_v', value: 18 },
      { key: 'brushless', value: true },
    ],
    tags: ['drel', 'shurupovert'],
  });
  await makeProduct({
    category: cat.drillsId,
    brand: cat.brandB,
    name: L('Tarmoqli drel 800 Vt', 'Сетевая дрель 800 Вт', 'Corded drill 800 W'),
    price: 650_000,
    stock: 0,
    specs: [{ key: 'power_w', value: 800 }],
  });
  await makeProduct({
    category: cat.saws,
    brand: cat.brandA,
    name: L('Aylanma arra 1400 Vt', 'Циркулярная пила 1400 Вт', 'Circular saw 1400 W'),
    price: 2_100_000,
    stock: 3,
    specs: [{ key: 'power_w', value: 1400 }],
  });
  await makeProduct({ category: cat.saws, name: L('Qoralama arra', 'Черновик пилы', 'Draft saw'), price: 100_000, stock: 5, status: 'draft' });
});
afterAll(teardownDatabase);

const names = (res: { body: { data: Array<{ name: string }> } }) => res.body.data.map((p) => p.name);

describe('product listing', () => {
  it('lists only published products with pagination meta', async () => {
    const res = await api().get('/api/products').set('Accept-Language', 'en');
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(3);
    expect(names(res)).not.toContain('Draft saw');
  });

  it('filters by category including sub-categories', async () => {
    const all = await api().get('/api/products?category=power-tools');
    expect(all.body.meta.total).toBe(3);
    const drills = await api().get('/api/products?category=drills');
    expect(drills.body.meta.total).toBe(2);
  });

  it('filters by brand, price range, stock and discount', async () => {
    expect((await api().get('/api/products?brand=alpha-tools')).body.meta.total).toBe(2);
    expect((await api().get('/api/products?brand=alpha-tools,beta-works')).body.meta.total).toBe(3);
    expect((await api().get('/api/products?minPrice=1000000&maxPrice=2000000')).body.meta.total).toBe(1);
    expect((await api().get('/api/products?inStock=1')).body.meta.total).toBe(2);
    expect((await api().get('/api/products?discounted=1')).body.meta.total).toBe(1);
  });

  it('filters by specifications (range and boolean)', async () => {
    expect((await api().get('/api/products?spec.power_w=500..1500')).body.meta.total).toBe(2);
    expect((await api().get('/api/products?category=drills&spec.brushless=1')).body.meta.total).toBe(1);
  });

  it('sorts by price in both directions', async () => {
    const asc = await api().get('/api/products?sort=price_asc').set('Accept-Language', 'en');
    const prices = asc.body.data.map((p: { price: number }) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    const desc = await api().get('/api/products?sort=price_desc').set('Accept-Language', 'en');
    expect(desc.body.data[0].price).toBe(2_100_000);
  });

  it('computes the discount percentage from the old price', async () => {
    const res = await api().get('/api/products?discounted=1').set('Accept-Language', 'en');
    expect(res.body.data[0]).toMatchObject({ price: 1_200_000, oldPrice: 1_500_000, discountPercent: 20 });
  });

  it('returns dynamic facets for the current selection', async () => {
    const res = await api().get('/api/products/facets?category=drills');
    expect(res.status).toBe(200);
    const facets = res.body.data;
    expect(facets.brands.map((b: { value: string }) => b.value).sort()).toEqual(['alpha-tools', 'beta-works']);
    expect(facets.price).toMatchObject({ min: 650_000, max: 1_200_000 });
    expect(facets.specs.map((s: { key: string }) => s.key)).toEqual(expect.arrayContaining(['power_w']));
  });

  it('rejects malformed filters with a validation error', async () => {
    const res = await api().get('/api/products?sort=price_asc&limit=100000');
    expect(res.status).toBe(422);
  });
});

describe('search', () => {
  it('finds products by name in every language and across scripts', async () => {
    expect((await api().get('/api/products?q=drill')).body.meta.total).toBe(2);
    expect((await api().get('/api/products?q=дрель')).body.meta.total).toBe(2);
    expect((await api().get('/api/products?q=drel')).body.meta.total).toBe(2);
    expect((await api().get('/api/products?q=пила')).body.meta.total).toBe(1);
  });

  it('suggests products, categories and brands', async () => {
    const res = await api().get('/api/search/suggest?q=dri').set('Accept-Language', 'en');
    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBeGreaterThan(0);
  });

  it('records searches for the popular-searches list', async () => {
    await api().get('/api/products?q=circular');
    await api().get('/api/products?q=circular');
    const res = await api().get('/api/search/popular');
    expect(res.body.data.map((p: { query: string }) => p.query)).toContain('circular');
  });
});

describe('product detail', () => {
  it('returns localized detail by slug with breadcrumbs and specs', async () => {
    const list = await api().get('/api/products?category=saws').set('Accept-Language', 'ru');
    const slug = list.body.data[0].slug;
    const res = await api().get(`/api/products/${slug}`).set('Accept-Language', 'ru');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Циркулярная пила 1400 Вт');
    expect(res.body.data.breadcrumbs.map((b: { slug: string }) => b.slug)).toEqual(['power-tools', 'saws']);
    expect(res.body.data.specs.length).toBeGreaterThan(0);
  });

  it('hides unpublished products', async () => {
    const res = await api().get('/api/products/draft-saw');
    expect(res.status).toBe(404);
  });

  it('serves the category tree and brand pages', async () => {
    const tree = await api().get('/api/categories').set('Accept-Language', 'uz');
    expect(tree.body.data[0]).toMatchObject({ slug: 'power-tools', name: 'Elektr asboblar' });
    expect(tree.body.data[0].children.map((c: { slug: string }) => c.slug)).toEqual(['drills', 'saws']);
    const brand = await api().get('/api/brands/alpha-tools');
    expect(brand.status).toBe(200);
  });
});

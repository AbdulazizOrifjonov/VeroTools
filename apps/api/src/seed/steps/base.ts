import { Types } from 'mongoose';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  EXPENSE_CATEGORY_CODES,
  PERMISSION_GROUPS,
  type ExpenseCategoryCode,
  type PermissionGroup,
  type SystemRoleKey,
} from '@vero/types';
import { normalizeUzPhone } from '@vero/utils';
import { email as emailSchema, password as passwordSchema } from '@vero/validation';
import { env, isProd } from '../../config/env';
import { Permission, Role } from '../../models/role.model';
import { User } from '../../models/user.model';
import { ExpenseCategory } from '../../models/expense.model';
import { DeliveryZone, PickupPoint } from '../../models/delivery.model';
import { Faq, Page, Setting } from '../../models/content.model';
import { ProductSpecification } from '../../models/product-specification.model';
import { Category } from '../../models/category.model';
import { hashPassword } from '../../modules/auth/auth.service';
import { invalidateRoleCache } from '../../modules/auth/permissions';
import { DEFAULT_SETTINGS, updateSettings } from '../../modules/settings/settings.service';
import { invalidateCatalogIndex } from '../../modules/catalog/catalog-index';
import { invalidateDeliveryCache } from '../../modules/delivery/delivery.service';
import { toImageValue, uploadFile } from '../../modules/media/media.service';
import { renderCategoryImage } from '../assets';
import { STORE_SETTINGS } from '../data/settings';
import { DELIVERY_ZONES, PICKUP_POINTS } from '../data/delivery';
import { PAGES } from '../data/pages';
import { FAQS } from '../data/faq';
import { SPEC_DEFINITIONS } from '../data/specs';
import { CATEGORIES } from '../data/categories';
import type { L, SeedCategory } from '../data/types';
import { pool } from '../rng';
import type { SeedLog } from './log';

const t3 = (uz: string, ru: string, en: string): L => ({ uz, ru, en });

/* ------------------------------------------------------------ permissions */

const GROUP_LABELS: Record<PermissionGroup, L> = {
  dashboard: t3('Boshqaruv paneli', 'Дашборд', 'Dashboard'),
  products: t3('Mahsulotlar', 'Товары', 'Products'),
  categories: t3('Kategoriyalar', 'Категории', 'Categories'),
  brands: t3('Brendlar', 'Бренды', 'Brands'),
  orders: t3('Buyurtmalar', 'Заказы', 'Orders'),
  customers: t3('Mijozlar', 'Клиенты', 'Customers'),
  users: t3('Xodimlar', 'Сотрудники', 'Staff users'),
  roles: t3('Rollar va ruxsatlar', 'Роли и права', 'Roles & permissions'),
  reviews: t3('Sharhlar va savollar', 'Отзывы и вопросы', 'Reviews & questions'),
  inventory: t3('Ombor', 'Склад', 'Inventory'),
  coupons: t3('Promokodlar', 'Промокоды', 'Coupons'),
  promotions: t3('Aksiyalar', 'Акции', 'Promotions'),
  banners: t3('Bannerlar', 'Баннеры', 'Banners'),
  media: t3('Media kutubxona', 'Медиатека', 'Media library'),
  payments: t3("To'lovlar", 'Платежи', 'Payments'),
  delivery: t3('Yetkazib berish', 'Доставка', 'Delivery'),
  expenses: t3('Xarajatlar', 'Расходы', 'Expenses'),
  analytics: t3('Analitika', 'Аналитика', 'Analytics'),
  reports: t3('Hisobotlar', 'Отчёты', 'Reports'),
  notifications: t3('Bildirishnomalar', 'Уведомления', 'Notifications'),
  translations: t3('Tarjimalar', 'Переводы', 'Translations'),
  content: t3('Sahifalar va FAQ', 'Страницы и FAQ', 'Pages & FAQ'),
  settings: t3('Sozlamalar', 'Настройки', 'Settings'),
  audit: t3('Audit jurnali', 'Журнал аудита', 'Audit log'),
};

const ACTION_LABELS: Record<string, L> = {
  read: t3("ko'rish", 'просмотр', 'view'),
  create: t3('yaratish', 'создание', 'create'),
  update: t3('tahrirlash', 'изменение', 'edit'),
  delete: t3("o'chirish", 'удаление', 'delete'),
  manage: t3('boshqarish', 'управление', 'manage'),
  moderate: t3('moderatsiya', 'модерация', 'moderate'),
  upload: t3('yuklash', 'загрузка', 'upload'),
  export: t3('eksport', 'экспорт', 'export'),
  send: t3('yuborish', 'отправка', 'send'),
};

const ROLE_INFO: Record<SystemRoleKey, { name: string; description: string }> = {
  CUSTOMER: { name: 'Customer', description: 'Storefront and mobile app customer (no admin access)' },
  MANAGER: { name: 'Manager', description: 'Processes orders, stock and reviews' },
  ADMIN: { name: 'Administrator', description: 'Full store management except roles and staff deletion' },
  SUPER_ADMIN: { name: 'Super administrator', description: 'Unrestricted access (owner)' },
};

export async function seedAccessControl(log: SeedLog) {
  for (const [group, keys] of Object.entries(PERMISSION_GROUPS) as Array<[PermissionGroup, readonly string[]]>) {
    for (const key of keys) {
      const action = key.split('.')[1]!;
      const g = GROUP_LABELS[group];
      const a = ACTION_LABELS[action] ?? t3(action, action, action);
      await Permission.updateOne(
        { key },
        { $set: { group, description: { uz: `${g.uz}: ${a.uz}`, ru: `${g.ru}: ${a.ru}`, en: `${g.en}: ${a.en}` } } },
        { upsert: true },
      );
    }
  }
  // system roles: created once — later edits made in the admin panel are preserved
  for (const key of Object.keys(DEFAULT_ROLE_PERMISSIONS) as SystemRoleKey[]) {
    await Role.updateOne(
      { key },
      {
        $setOnInsert: { key, name: ROLE_INFO[key].name, description: ROLE_INFO[key].description, permissions: DEFAULT_ROLE_PERMISSIONS[key] },
        $set: { isSystem: true },
      },
      { upsert: true },
    );
  }
  // SUPER_ADMIN always keeps the wildcard
  await Role.updateOne({ key: 'SUPER_ADMIN' }, { $set: { permissions: ['*'] } });
  invalidateRoleCache();
  log.done('permissions & roles', `${ALL_PERMISSIONS.length} permissions, ${Object.keys(DEFAULT_ROLE_PERMISSIONS).length} system roles`);
}

/** Creates a staff account unless one with the same phone / e-mail already exists. */
export async function ensureStaff(input: {
  roleKey: SystemRoleKey;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
}): Promise<{ id: Types.ObjectId; created: boolean }> {
  const phone = normalizeUzPhone(input.phone);
  if (!phone) throw new Error(`Invalid staff phone ${input.phone}`);
  const email = input.email.trim().toLowerCase();
  const existing = await User.findOne({ $or: [{ phone }, { email }] }).select('_id').lean();
  if (existing) return { id: existing._id, created: false };
  const role = await Role.findOne({ key: input.roleKey }).lean();
  if (!role) throw new Error(`Role ${input.roleKey} is missing — run the access-control step first`);
  const user = await User.create({
    firstName: input.firstName,
    lastName: input.lastName,
    phone,
    email,
    passwordHash: await hashPassword(input.password),
    role: role._id,
    roleKey: input.roleKey,
    isEmailVerified: true,
    isPhoneVerified: true,
    preferences: { language: 'uz' },
  });
  return { id: user._id, created: true };
}

export async function seedOwner(log: SeedLog): Promise<Types.ObjectId> {
  const existingOwner = await User.findOne({ roleKey: 'SUPER_ADMIN' }).select('_id email').lean();
  if (existingOwner) {
    log.skip('owner account', `already exists (${existingOwner.email ?? existingOwner._id})`);
    return existingOwner._id;
  }
  if (isProd && env.SEED_ADMIN_PASSWORD === 'OckeanAdmin2026') {
    throw new Error('Refusing to create the owner account with the default password in production. Set SEED_ADMIN_PASSWORD (min. 8 chars, letters + digits).');
  }
  // the same rules as every other account, so the owner can actually sign in afterwards
  if (!passwordSchema.safeParse(env.SEED_ADMIN_PASSWORD).success) {
    throw new Error('SEED_ADMIN_PASSWORD must be 8–72 characters and contain letters and digits.');
  }
  if (!emailSchema.safeParse(env.SEED_ADMIN_EMAIL).success) throw new Error(`SEED_ADMIN_EMAIL "${env.SEED_ADMIN_EMAIL}" is not a valid e-mail address.`);
  if (!normalizeUzPhone(env.SEED_ADMIN_PHONE)) throw new Error(`SEED_ADMIN_PHONE "${env.SEED_ADMIN_PHONE}" is not a valid +998 phone number.`);
  const { id } = await ensureStaff({
    roleKey: 'SUPER_ADMIN',
    firstName: env.SEED_ADMIN_FIRST_NAME,
    lastName: env.SEED_ADMIN_LAST_NAME,
    phone: env.SEED_ADMIN_PHONE,
    email: env.SEED_ADMIN_EMAIL,
    password: env.SEED_ADMIN_PASSWORD,
  });
  log.done('owner account', `${env.SEED_ADMIN_EMAIL} (SUPER_ADMIN) — change the password after the first sign-in`);
  return id;
}

/* --------------------------------------------------------------- settings */

export async function seedSettings(log: SeedLog, ownerId: Types.ObjectId) {
  const s = STORE_SETTINGS;
  const values: Record<string, unknown> = {
    'store.name': s.storeName,
    'store.legalName': s.legalName,
    'store.website': s.website,
    'store.phone': s.phones.primary,
    'store.phoneSecondary': s.phones.secondary,
    'store.email': s.email,
    'store.supportEmail': s.supportEmail,
    'store.address': s.address,
    'store.workingHours': s.workingHours,
    'store.map': s.map,
    'store.footerAbout': s.footerAbout,
    'social.telegram': s.social.telegram,
    'social.telegramBot': s.social.telegramBot,
    'social.instagram': s.social.instagram,
    'social.facebook': s.social.facebook,
    'social.youtube': s.social.youtube,
    'installment.enabled': s.installment.enabled,
    'installment.minAmount': s.installment.minAmount,
    'installment.plans': s.installment.plans,
    'order.autoCancelUnpaidMinutes': s.order.autoCancelUnpaidMinutes,
    'inventory.lowStockThreshold': s.inventory.lowStockThreshold,
    'seo.title': s.seo.title,
    'seo.description': s.seo.description,
    'home.advantages': s.advantages,
    'product.trustBullets': s.trustBullets,
  };
  // never overwrite values an administrator has already changed
  const existing = new Set((await Setting.find().select('key').lean()).map((r) => r.key));
  const missing = Object.fromEntries(Object.entries(values).filter(([k]) => !existing.has(k) && k in DEFAULT_SETTINGS));
  const changed = await updateSettings(missing, ownerId);
  log.done('store settings', changed.length ? `${changed.length} values` : 'already configured');
}

/* ------------------------------------------------------ delivery & finance */

export async function seedDelivery(log: SeedLog) {
  if (await DeliveryZone.exists({})) return log.skip('delivery zones & pickup points', 'already configured');
  await DeliveryZone.insertMany(DELIVERY_ZONES.map((z) => ({ ...z, isActive: true })));
  await PickupPoint.insertMany(PICKUP_POINTS.map((p) => ({ ...p, isActive: true })));
  await invalidateDeliveryCache();
  log.done('delivery zones & pickup points', `${DELIVERY_ZONES.length} zones, ${PICKUP_POINTS.length} pickup points`);
}

const EXPENSE_CATEGORIES: Record<ExpenseCategoryCode, { name: L; color: string }> = {
  RENT: { name: t3('Ijara', 'Аренда', 'Rent'), color: '#6366F1' },
  SALARY: { name: t3('Ish haqi', 'Зарплата', 'Salaries'), color: '#0EA5E9' },
  DELIVERY: { name: t3('Yetkazib berish', 'Доставка', 'Delivery'), color: '#F97316' },
  MARKETING: { name: t3('Marketing', 'Маркетинг', 'Marketing'), color: '#A855F7' },
  ADVERTISING: { name: t3('Reklama', 'Реклама', 'Advertising'), color: '#EC4899' },
  UTILITIES: { name: t3('Kommunal xizmatlar', 'Коммунальные услуги', 'Utilities'), color: '#14B8A6' },
  WAREHOUSE: { name: t3('Ombor', 'Склад', 'Warehouse'), color: '#84CC16' },
  PACKAGING: { name: t3('Qadoqlash', 'Упаковка', 'Packaging'), color: '#EAB308' },
  EQUIPMENT: { name: t3('Jihozlar', 'Оборудование', 'Equipment'), color: '#64748B' },
  MAINTENANCE: { name: t3("Ta'mirlash va xizmat", 'Ремонт и обслуживание', 'Maintenance'), color: '#78716C' },
  TAXES: { name: t3("Soliqlar va yig'imlar", 'Налоги и сборы', 'Taxes & fees'), color: '#EF4444' },
  OTHER: { name: t3('Boshqa', 'Прочее', 'Other'), color: '#9CA3AF' },
};

export async function seedExpenseCategories(log: SeedLog) {
  let created = 0;
  for (const code of EXPENSE_CATEGORY_CODES) {
    const r = await ExpenseCategory.updateOne(
      { code },
      { $setOnInsert: { code, name: EXPENSE_CATEGORIES[code].name, color: EXPENSE_CATEGORIES[code].color, isActive: true }, $set: { isSystem: true } },
      { upsert: true },
    );
    created += r.upsertedCount;
  }
  log.done('expense categories', created ? `${created} created` : 'already configured');
}

/* ------------------------------------------------------------ content */

export async function seedContent(log: SeedLog) {
  let pages = 0;
  for (const p of PAGES) {
    const r = await Page.updateOne(
      { slug: p.slug },
      { $setOnInsert: { slug: p.slug, title: p.title, content: p.content, seoTitle: p.seoTitle, seoDescription: p.seoDescription, isPublished: true } },
      { upsert: true },
    );
    pages += r.upsertedCount;
  }
  let faqs = 0;
  if (!(await Faq.exists({}))) {
    await Faq.insertMany(FAQS.map((f) => ({ ...f, isActive: true })));
    faqs = FAQS.length;
  }
  log.done('pages & FAQ', `${pages} pages, ${faqs} FAQ entries (review the policy texts before launch)`);
}

/* ------------------------------------------------------------ catalogue */

export async function seedSpecDefinitions(log: SeedLog) {
  if (await ProductSpecification.exists({})) return log.skip('specification definitions', 'already present');
  await ProductSpecification.insertMany(SPEC_DEFINITIONS.map((s) => ({ ...s, categories: [] })));
  invalidateCatalogIndex();
  log.done('specification definitions', `${SPEC_DEFINITIONS.length}`);
}

interface FlatCategory {
  seed: SeedCategory;
  parentKey: string | null;
  order: number;
}

function flatten(list: SeedCategory[], parentKey: string | null = null, out: FlatCategory[] = []): FlatCategory[] {
  list.forEach((c, i) => {
    out.push({ seed: c, parentKey, order: i });
    if (c.children?.length) flatten(c.children, c.key, out);
  });
  return out;
}

/** Category tree with rendered category illustrations stored in the media library. */
export async function seedCategories(log: SeedLog, ownerId: Types.ObjectId): Promise<Map<string, Types.ObjectId>> {
  const map = new Map<string, Types.ObjectId>();
  const flat = flatten(CATEGORIES);
  if (await Category.exists({})) {
    const bySlug = new Map((await Category.find().select('slug').lean()).map((c) => [c.slug, c._id]));
    for (const f of flat) {
      const id = bySlug.get(f.seed.slug);
      if (id) map.set(f.seed.key, id);
    }
    log.skip('categories', 'already present');
    return map;
  }
  const images = await pool(flat, 4, async ({ seed }) => {
    const png = await renderCategoryImage(seed.illustration, { size: 800 });
    const media = await uploadFile({ buffer: png, originalname: `${seed.slug}.png`, size: png.length }, 'categories', { id: ownerId, name: 'seed' }, {
      alt: seed.name,
      tags: ['category', seed.key],
    });
    return toImageValue(media);
  });
  const byKey = new Map<string, { id: Types.ObjectId; ancestors: Types.ObjectId[]; level: number }>();
  for (const [i, f] of flat.entries()) {
    const parent = f.parentKey ? byKey.get(f.parentKey)! : null;
    const id = new Types.ObjectId();
    const ancestors = parent ? [...parent.ancestors, parent.id] : [];
    await Category.create({
      _id: id,
      name: f.seed.name,
      slug: f.seed.slug,
      description: f.seed.description,
      parent: parent?.id ?? null,
      ancestors,
      level: ancestors.length,
      order: f.order,
      icon: f.seed.icon,
      image: images[i],
      isActive: true,
      specKeys: f.seed.specKeys ?? [],
    });
    byKey.set(f.seed.key, { id, ancestors, level: ancestors.length });
    map.set(f.seed.key, id);
  }
  invalidateCatalogIndex();
  log.done('categories', `${flat.length} (${CATEGORIES.length} top-level) with illustrations`);
  return map;
}


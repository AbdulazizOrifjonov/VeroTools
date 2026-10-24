import type { Language } from '@vero/config';
import { LANGUAGES, DEFAULT_LANGUAGE } from '@vero/config';
import { PAYMENT_METHODS, type InstallmentPlan, type PaymentMethod, type PublicSettings } from '@vero/types';
import type { Types } from 'mongoose';
import { Setting } from '../../models/content.model';
import { cache, CacheTags } from '../../lib/cache';
import { loc } from '../../lib/localize';
import type { Localized } from '../../models/common';

const L = (uz = '', ru = '', en = ''): Localized => ({ uz, ru, en });

export interface StoreSettingsValues {
  'store.name': string;
  'store.legalName': Localized;
  'store.website': string;
  'store.phone': string;
  'store.phoneSecondary': string;
  'store.email': string;
  'store.supportEmail': string;
  'store.address': Localized;
  'store.workingHours': Localized;
  'store.map': { lat: number; lng: number; zoom: number };
  'store.footerAbout': Localized;
  'social.telegram': string;
  'social.telegramBot': string;
  'social.instagram': string;
  'social.facebook': string;
  'social.youtube': string;
  'social.tiktok': string;
  'installment.enabled': boolean;
  'installment.minAmount': number;
  'installment.plans': InstallmentPlan[];
  'order.autoCancelUnpaidMinutes': number;
  'inventory.lowStockThreshold': number;
  'payments.enabledMethods': PaymentMethod[];
  'seo.title': Localized;
  'seo.description': Localized;
  'home.advantages': Array<{ icon: string; title: Localized; text: Localized }>;
  'product.trustBullets': Localized[];
  'notifications.telegramNewOrders': boolean;
  'notifications.emailOrderStatus': boolean;
  'notifications.smsOrderStatus': boolean;
  'delivery.defaultFreeThreshold': number;
}

export type SettingKey = keyof StoreSettingsValues;

export const SETTING_GROUPS: Record<SettingKey, string> = {
  'store.name': 'store',
  'store.legalName': 'store',
  'store.website': 'store',
  'store.phone': 'store',
  'store.phoneSecondary': 'store',
  'store.email': 'store',
  'store.supportEmail': 'store',
  'store.address': 'store',
  'store.workingHours': 'store',
  'store.map': 'store',
  'store.footerAbout': 'store',
  'social.telegram': 'social',
  'social.telegramBot': 'social',
  'social.instagram': 'social',
  'social.facebook': 'social',
  'social.youtube': 'social',
  'social.tiktok': 'social',
  'installment.enabled': 'installment',
  'installment.minAmount': 'installment',
  'installment.plans': 'installment',
  'order.autoCancelUnpaidMinutes': 'orders',
  'inventory.lowStockThreshold': 'inventory',
  'payments.enabledMethods': 'payments',
  'seo.title': 'seo',
  'seo.description': 'seo',
  'home.advantages': 'home',
  'product.trustBullets': 'home',
  'notifications.telegramNewOrders': 'notifications',
  'notifications.emailOrderStatus': 'notifications',
  'notifications.smsOrderStatus': 'notifications',
  'delivery.defaultFreeThreshold': 'delivery',
};

export const DEFAULT_SETTINGS: StoreSettingsValues = {
  'store.name': 'OCKEAN',
  'store.legalName': L('"OCKEAN" MChJ', 'ООО «OCKEAN»', 'OCKEAN LLC'),
  'store.website': 'https://ockean.uz',
  'store.phone': '+998712000000',
  'store.phoneSecondary': '',
  'store.email': 'info@ockean.uz',
  'store.supportEmail': '',
  'store.address': L('Toshkent', 'Ташкент', 'Tashkent'),
  'store.workingHours': L('Du–Sha: 9:00–19:00', 'Пн–Сб: 9:00–19:00', 'Mon–Sat: 9:00–19:00'),
  'store.map': { lat: 41.3111, lng: 69.2797, zoom: 14 },
  'store.footerAbout': L(),
  'social.telegram': '',
  'social.telegramBot': '',
  'social.instagram': '',
  'social.facebook': '',
  'social.youtube': '',
  'social.tiktok': '',
  'installment.enabled': true,
  'installment.minAmount': 1_000_000,
  'installment.plans': [
    { months: 3, markupPercent: 0 },
    { months: 6, markupPercent: 7 },
    { months: 12, markupPercent: 15 },
  ],
  'order.autoCancelUnpaidMinutes': 30,
  'inventory.lowStockThreshold': 5,
  'payments.enabledMethods': [...PAYMENT_METHODS],
  'seo.title': L('OCKEAN — professional asboblar', 'OCKEAN — профессиональные инструменты', 'OCKEAN — professional tools'),
  'seo.description': L(),
  'home.advantages': [],
  'product.trustBullets': [],
  'notifications.telegramNewOrders': true,
  'notifications.emailOrderStatus': true,
  'notifications.smsOrderStatus': false,
  'delivery.defaultFreeThreshold': 1_000_000,
};

const PUBLIC_KEYS = new Set<SettingKey>(
  (Object.keys(DEFAULT_SETTINGS) as SettingKey[]).filter((k) => !k.startsWith('notifications.') && k !== 'order.autoCancelUnpaidMinutes'),
);

const CACHE_KEY = `${CacheTags.settings}all`;

export async function getSettings(): Promise<StoreSettingsValues> {
  return cache.wrap(CACHE_KEY, 120, async () => {
    const rows = await Setting.find().lean();
    const values = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
    for (const row of rows) if (row.key in DEFAULT_SETTINGS) values[row.key] = row.value;
    return values as unknown as StoreSettingsValues;
  });
}

export async function getSetting<K extends SettingKey>(key: K): Promise<StoreSettingsValues[K]> {
  return (await getSettings())[key];
}

export async function updateSettings(values: Partial<Record<string, unknown>>, userId?: Types.ObjectId): Promise<string[]> {
  const changed: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    await Setting.updateOne(
      { key },
      { $set: { value, group: SETTING_GROUPS[key as SettingKey], isPublic: PUBLIC_KEYS.has(key as SettingKey), updatedBy: userId } },
      { upsert: true },
    );
    changed.push(key);
  }
  await cache.invalidate(CacheTags.settings, CacheTags.home);
  return changed;
}

export async function listSettingsForAdmin() {
  const settings = await getSettings();
  const rows = await Setting.find().select('key updatedAt').lean();
  const updated = new Map(rows.map((r) => [r.key, r.updatedAt]));
  return (Object.keys(DEFAULT_SETTINGS) as SettingKey[]).map((key) => ({
    key,
    value: settings[key],
    group: SETTING_GROUPS[key],
    isPublic: PUBLIC_KEYS.has(key),
    updatedAt: updated.get(key)?.toISOString(),
  }));
}

export async function publicSettings(lang: Language, availableMethods: PaymentMethod[], freeThreshold: number): Promise<PublicSettings> {
  const s = await getSettings();
  return {
    store: {
      name: s['store.name'],
      legalName: loc(s['store.legalName'], lang),
      phone: s['store.phone'],
      phoneSecondary: s['store.phoneSecondary'] || undefined,
      email: s['store.email'],
      supportEmail: s['store.supportEmail'] || undefined,
      address: loc(s['store.address'], lang),
      workingHours: loc(s['store.workingHours'], lang),
      map: s['store.map'],
      footerAbout: loc(s['store.footerAbout'], lang) || undefined,
    },
    social: {
      telegram: s['social.telegram'] || undefined,
      telegramBot: s['social.telegramBot'] || undefined,
      instagram: s['social.instagram'] || undefined,
      facebook: s['social.facebook'] || undefined,
      youtube: s['social.youtube'] || undefined,
      tiktok: s['social.tiktok'] || undefined,
    },
    currency: 'UZS',
    installment: {
      enabled: s['installment.enabled'] && availableMethods.includes('installment'),
      minAmount: s['installment.minAmount'],
      plans: s['installment.plans'],
    },
    delivery: { freeThreshold },
    paymentMethods: availableMethods,
    advantages: s['home.advantages'].map((a) => ({ icon: a.icon, title: loc(a.title, lang), text: loc(a.text, lang) })),
    trustBullets: s['product.trustBullets'].map((b) => loc(b, lang)).filter(Boolean),
    seo: { title: loc(s['seo.title'], lang), description: loc(s['seo.description'], lang) },
    languages: [...LANGUAGES],
    defaultLanguage: DEFAULT_LANGUAGE,
  };
}

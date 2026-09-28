import type { SeedDeliveryZone, SeedPickupPoint } from './types';

/**
 * Delivery zones. Every UZ region code from @vero/config is covered exactly once.
 * Prices and free-delivery thresholds are in UZS; days are business days.
 * Higher priority = listed first.
 */
export const DELIVERY_ZONES: SeedDeliveryZone[] = [
  {
    code: 'tashkent-city',
    name: { uz: 'Toshkent shahri', ru: 'Ташкент', en: 'Tashkent city' },
    regions: ['tashkent-city'],
    price: 30000,
    freeThreshold: 1000000,
    minDays: 0,
    maxDays: 1,
    priority: 70,
  },
  {
    code: 'tashkent-region',
    name: { uz: 'Toshkent viloyati', ru: 'Ташкентская область', en: 'Tashkent region' },
    regions: ['tashkent-region'],
    price: 45000,
    freeThreshold: 1500000,
    minDays: 1,
    maxDays: 2,
    priority: 60,
  },
  {
    code: 'fergana-valley',
    name: {
      uz: "Farg'ona vodiysi: Andijon, Farg'ona va Namangan viloyatlari",
      ru: 'Ферганская долина: Андижанская, Ферганская и Наманганская области',
      en: 'Fergana Valley: Andijan, Fergana and Namangan regions',
    },
    regions: ['andijan', 'fergana', 'namangan'],
    price: 60000,
    freeThreshold: 2500000,
    minDays: 2,
    maxDays: 4,
    priority: 50,
  },
  {
    code: 'central',
    name: {
      uz: 'Samarqand, Jizzax va Sirdaryo viloyatlari',
      ru: 'Самаркандская, Джизакская и Сырдарьинская области',
      en: 'Samarkand, Jizzakh and Syrdarya regions',
    },
    regions: ['samarkand', 'jizzakh', 'syrdarya'],
    price: 60000,
    freeThreshold: 2500000,
    minDays: 2,
    maxDays: 4,
    priority: 40,
  },
  {
    code: 'bukhara-navoi',
    name: {
      uz: 'Buxoro va Navoiy viloyatlari',
      ru: 'Бухарская и Навоийская области',
      en: 'Bukhara and Navoi regions',
    },
    regions: ['bukhara', 'navoi'],
    price: 70000,
    freeThreshold: 3000000,
    minDays: 2,
    maxDays: 4,
    priority: 30,
  },
  {
    code: 'south',
    name: {
      uz: 'Qashqadaryo va Surxondaryo viloyatlari',
      ru: 'Кашкадарьинская и Сурхандарьинская области',
      en: 'Kashkadarya and Surkhandarya regions',
    },
    regions: ['kashkadarya', 'surkhandarya'],
    price: 75000,
    freeThreshold: 3000000,
    minDays: 3,
    maxDays: 5,
    priority: 20,
  },
  {
    code: 'west',
    name: {
      uz: "Xorazm viloyati va Qoraqalpog'iston Respublikasi",
      ru: 'Хорезмская область и Республика Каракалпакстан',
      en: 'Khorezm region and the Republic of Karakalpakstan',
    },
    regions: ['khorezm', 'karakalpakstan'],
    price: 90000,
    freeThreshold: 3500000,
    minDays: 3,
    maxDays: 6,
    priority: 10,
  },
];

/** Pickup points: 4 in Tashkent, 1 in Samarkand, 1 in Fergana. Pickup is free. */
export const PICKUP_POINTS: SeedPickupPoint[] = [
  {
    code: 'TAS-01',
    name: {
      uz: 'VERO TOOLS shourumi — Chilonzor',
      ru: 'Шоурум VERO TOOLS — Чиланзар',
      en: 'VERO TOOLS showroom — Chilanzar',
    },
    address: {
      uz: "Toshkent shahri, Chilonzor tumani, Bunyodkor shoh ko'chasi, 27-uy. Mo'ljal: «Chilonzor» metro bekati",
      ru: 'г. Ташкент, Чиланзарский район, проспект Бунёдкор, 27. Ориентир: станция метро «Чиланзар»',
      en: '27 Bunyodkor Avenue, Chilanzar district, Tashkent. Landmark: Chilanzar metro station',
    },
    region: 'tashkent-city',
    city: 'Toshkent',
    phone: '+998712000101',
    workingHours: {
      uz: 'Dushanba–shanba 09:00–19:00, yakshanba 10:00–17:00',
      ru: 'Пн–Сб 09:00–19:00, Вс 10:00–17:00',
      en: 'Mon–Sat 09:00–19:00, Sun 10:00–17:00',
    },
    location: { lat: 41.2748, lng: 69.2045 },
  },
  {
    code: 'TAS-02',
    name: {
      uz: 'Olib ketish punkti — Yunusobod',
      ru: 'Пункт выдачи — Юнусабад',
      en: 'Pickup point — Yunusabad',
    },
    address: {
      uz: "Toshkent shahri, Yunusobod tumani, Amir Temur shoh ko'chasi, 129-uy. Mo'ljal: Toshkent teleminorasi",
      ru: 'г. Ташкент, Юнусабадский район, проспект Амира Темура, 129. Ориентир: Ташкентская телебашня',
      en: '129 Amir Temur Avenue, Yunusabad district, Tashkent. Landmark: Tashkent TV Tower',
    },
    region: 'tashkent-city',
    city: 'Toshkent',
    phone: '+998712000102',
    workingHours: {
      uz: 'Dushanba–shanba 09:00–19:00, yakshanba — dam olish kuni',
      ru: 'Пн–Сб 09:00–19:00, Вс — выходной',
      en: 'Mon–Sat 09:00–19:00, Sun closed',
    },
    location: { lat: 41.3502, lng: 69.2871 },
  },
  {
    code: 'TAS-03',
    name: {
      uz: 'Olib ketish punkti — Sergeli',
      ru: 'Пункт выдачи — Сергели',
      en: 'Pickup point — Sergeli',
    },
    address: {
      uz: "Toshkent shahri, Sergeli tumani, Yangi Sergeli ko'chasi, 45-uy. Mo'ljal: Sergeli dehqon bozori",
      ru: 'г. Ташкент, Сергелийский район, ул. Янги Сергели, 45. Ориентир: Сергелийский дехканский рынок',
      en: '45 Yangi Sergeli Street, Sergeli district, Tashkent. Landmark: Sergeli farmers market',
    },
    region: 'tashkent-city',
    city: 'Toshkent',
    phone: '+998712000103',
    workingHours: {
      uz: 'Dushanba–juma 09:00–18:00, shanba 09:00–16:00, yakshanba — dam olish kuni',
      ru: 'Пн–Пт 09:00–18:00, Сб 09:00–16:00, Вс — выходной',
      en: 'Mon–Fri 09:00–18:00, Sat 09:00–16:00, Sun closed',
    },
    location: { lat: 41.2266, lng: 69.2205 },
  },
  {
    code: 'TAS-04',
    name: {
      uz: "Olib ketish punkti — Qo'yliq",
      ru: 'Пункт выдачи — Куйлюк',
      en: 'Pickup point — Kuyluk',
    },
    address: {
      uz: "Toshkent shahri, Farg'ona yo'li ko'chasi, 21-uy. Mo'ljal: «Qo'yliq» bozori",
      ru: 'г. Ташкент, ул. Фаргона йули, 21. Ориентир: рынок «Куйлюк»',
      en: '21 Fargona Yuli Street, Tashkent. Landmark: Kuyluk bazaar',
    },
    region: 'tashkent-city',
    city: 'Toshkent',
    phone: '+998712000104',
    workingHours: {
      uz: 'Har kuni 08:00–18:00',
      ru: 'Ежедневно 08:00–18:00',
      en: 'Daily 08:00–18:00',
    },
    location: { lat: 41.2412, lng: 69.3406 },
  },
  {
    code: 'SAM-01',
    name: {
      uz: 'Olib ketish punkti — Samarqand',
      ru: 'Пункт выдачи — Самарканд',
      en: 'Pickup point — Samarkand',
    },
    address: {
      uz: "Samarqand shahri, Spitamen shoh ko'chasi, 210-uy. Mo'ljal: qurilish mollari bozori",
      ru: 'г. Самарканд, проспект Спитамена, 210. Ориентир: рынок строительных материалов',
      en: '210 Spitamen Avenue, Samarkand. Landmark: building materials market',
    },
    region: 'samarkand',
    city: 'Samarqand',
    phone: '+998662000105',
    workingHours: {
      uz: 'Dushanba–shanba 09:00–18:00, yakshanba — dam olish kuni',
      ru: 'Пн–Сб 09:00–18:00, Вс — выходной',
      en: 'Mon–Sat 09:00–18:00, Sun closed',
    },
    location: { lat: 39.6689, lng: 66.9362 },
  },
  {
    code: 'FER-01',
    name: {
      uz: "Olib ketish punkti — Farg'ona",
      ru: 'Пункт выдачи — Фергана',
      en: 'Pickup point — Fergana',
    },
    address: {
      uz: "Farg'ona shahri, Al-Farg'oniy shoh ko'chasi, 45-uy. Mo'ljal: markaziy dehqon bozori",
      ru: 'г. Фергана, проспект Аль-Фаргани, 45. Ориентир: центральный дехканский рынок',
      en: '45 Al-Fargani Avenue, Fergana. Landmark: central farmers market',
    },
    region: 'fergana',
    city: "Farg'ona",
    phone: '+998732000106',
    workingHours: {
      uz: 'Dushanba–shanba 09:00–18:00, yakshanba — dam olish kuni',
      ru: 'Пн–Сб 09:00–18:00, Вс — выходной',
      en: 'Mon–Sat 09:00–18:00, Sun closed',
    },
    location: { lat: 40.3858, lng: 71.7893 },
  },
];

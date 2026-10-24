import type { L } from './types';

/** One card of the homepage "Why choose OCKEAN" block. */
export interface StoreAdvantage {
  /** lucide-react icon name in PascalCase */
  icon: string;
  title: L;
  text: L;
}

export interface InstallmentPlan {
  months: number;
  /** markup over the cash price for the whole term, % */
  markupPercent: number;
}

export interface StoreSettings {
  storeName: string;
  /** legal entity name (placeholder until real company details are entered in the admin panel) */
  legalName: L;
  website: string;
  phones: {
    /** call centre, +998XXXXXXXXX */
    primary: string;
    secondary: string;
  };
  email: string;
  supportEmail: string;
  /** showroom / head office address */
  address: L;
  workingHours: L;
  social: {
    telegram: string;
    telegramBot: string;
    instagram: string;
    facebook: string;
    youtube: string;
  };
  /** showroom location for the contacts map */
  map: { lat: number; lng: number; zoom: number };
  installment: {
    enabled: boolean;
    /** minimum order amount in UZS */
    minAmount: number;
    plans: InstallmentPlan[];
  };
  order: {
    /** unpaid orders with an online payment method are cancelled after this many minutes */
    autoCancelUnpaidMinutes: number;
  };
  inventory: {
    /** stock level at which a product is reported as "low stock" */
    lowStockThreshold: number;
  };
  seo: {
    title: L;
    description: L;
  };
  /** homepage "Why choose OCKEAN" advantages */
  advantages: StoreAdvantage[];
  /** short trust bullets shown next to the buy box on product pages */
  trustBullets: L[];
  footerAbout: L;
}

export const STORE_SETTINGS: StoreSettings = {
  storeName: 'OCKEAN',
  legalName: {
    uz: '"OCKEAN" MChJ',
    ru: 'ООО «OCKEAN»',
    en: 'OCKEAN LLC',
  },
  website: 'https://ockean.uz',
  phones: {
    primary: '+998712000000',
    secondary: '+998781200000',
  },
  email: 'info@ockean.uz',
  supportEmail: 'support@ockean.uz',
  address: {
    uz: "Toshkent shahri, Chilonzor tumani, Bunyodkor shoh ko'chasi, 27-uy",
    ru: 'г. Ташкент, Чиланзарский район, проспект Бунёдкор, 27',
    en: '27 Bunyodkor Avenue, Chilanzar district, Tashkent',
  },
  workingHours: {
    uz: 'Dushanba–shanba 09:00–19:00, yakshanba 10:00–17:00',
    ru: 'Пн–Сб 09:00–19:00, Вс 10:00–17:00',
    en: 'Mon–Sat 09:00–19:00, Sun 10:00–17:00',
  },
  // Left empty on purpose: accounts are never guessed (a handle like t.me/verotools may belong to someone else).
  // The store enters its real channels in Admin → Settings → Social media; empty links are not shown anywhere.
  social: {
    telegram: '',
    telegramBot: '',
    instagram: '',
    facebook: '',
    youtube: '',
  },
  map: { lat: 41.2748, lng: 69.2045, zoom: 16 },
  installment: {
    enabled: true,
    minAmount: 1000000,
    plans: [
      { months: 3, markupPercent: 0 },
      { months: 6, markupPercent: 7 },
      { months: 12, markupPercent: 15 },
    ],
  },
  order: { autoCancelUnpaidMinutes: 30 },
  inventory: { lowStockThreshold: 5 },
  seo: {
    title: {
      uz: "OCKEAN — professional asboblar va uskunalar internet-do'koni",
      ru: 'OCKEAN — интернет-магазин профессионального инструмента и оборудования',
      en: 'OCKEAN — online store for professional tools and equipment',
    },
    description: {
      uz: "Elektr va qo'l asboblari, generatorlar, kompressorlar, nasoslar, payvandlash va bog' texnikasi. Rasmiy kafolat, O'zbekiston bo'ylab yetkazib berish va muddatli to'lov.",
      ru: 'Электро- и ручной инструмент, генераторы, компрессоры, насосы, сварочная и садовая техника. Официальная гарантия, доставка по Узбекистану и рассрочка.',
      en: 'Power and hand tools, generators, compressors, pumps, welding and garden equipment. Official warranty, delivery across Uzbekistan and installment plans.',
    },
  },
  advantages: [
    {
      icon: 'ShieldCheck',
      title: { uz: 'Rasmiy kafolat', ru: 'Официальная гарантия', en: 'Official warranty' },
      text: {
        uz: "Har bir mahsulotga ishlab chiqaruvchining rasmiy kafolati beriladi. Kafolat muddati mahsulot sahifasida ko'rsatilgan.",
        ru: 'На каждый товар действует официальная гарантия производителя. Срок гарантии указан на странице товара.',
        en: "Every product comes with the manufacturer's official warranty. The warranty period is shown on each product page.",
      },
    },
    {
      icon: 'Truck',
      title: {
        uz: "O'zbekiston bo'ylab yetkazib berish",
        ru: 'Доставка по всему Узбекистану',
        en: 'Delivery across Uzbekistan',
      },
      text: {
        uz: "Toshkent bo'ylab o'z kuryerlarimiz, viloyatlarga esa ishonchli hamkor kuryerlik xizmatlari yetkazib beradi.",
        ru: 'По Ташкенту заказы привозят наши курьеры, в регионы — надёжные партнёрские курьерские службы.',
        en: 'Our own couriers deliver across Tashkent, and trusted partner courier services cover the regions.',
      },
    },
    {
      icon: 'CalendarClock',
      title: { uz: "Muddatli to'lov", ru: 'Рассрочка', en: 'Installment plans' },
      text: {
        uz: "Qimmatbaho uskuna narxini birdaniga to'lash shart emas: ariza tasdiqlangach, to'lovni bir necha oyga bo'lishingiz mumkin.",
        ru: 'Не обязательно платить за дорогое оборудование всю сумму сразу: после одобрения заявки оплату можно разделить на несколько месяцев.',
        en: 'No need to pay for costly equipment all at once: once your application is approved, you can spread the cost over several months.',
      },
    },
    {
      icon: 'Headset',
      title: { uz: 'Mutaxassis maslahati', ru: 'Консультация специалиста', en: 'Expert advice' },
      text: {
        uz: 'Konsultantlarimiz vazifangizga mos asbobni tanlashga yordam beradi — telefon, Telegram orqali yoki shourumda.',
        ru: 'Наши консультанты помогут подобрать инструмент под вашу задачу — по телефону, в Telegram или в шоуруме.',
        en: 'Our consultants help you pick the right tool for the job — by phone, on Telegram or in our showroom.',
      },
    },
    {
      icon: 'BadgeCheck',
      title: { uz: 'Original mahsulotlar', ru: 'Оригинальная продукция', en: 'Genuine products' },
      text: {
        uz: 'Mahsulotlarni faqat vakolatli yetkazib beruvchilar va rasmiy distribyutorlardan olamiz.',
        ru: 'Мы закупаем товары только у авторизованных поставщиков и официальных дистрибьюторов.',
        en: 'We source products only from authorised suppliers and official distributors.',
      },
    },
    {
      icon: 'RotateCcw',
      title: { uz: 'Oson qaytarish', ru: 'Простой возврат', en: 'Easy returns' },
      text: {
        uz: "Mos kelmagan, foydalanilmagan tovarni original qadog'ida qaytarish yoki almashtirish mumkin — shartlar oddiy va tushunarli.",
        ru: 'Неподошедший товар без следов использования можно вернуть или обменять в оригинальной упаковке — условия простые и понятные.',
        en: 'Unused items that do not suit you can be returned or exchanged in their original packaging, under simple and clear rules.',
      },
    },
  ],
  trustBullets: [
    {
      uz: 'Ishlab chiqaruvchining rasmiy kafolati',
      ru: 'Официальная гарантия производителя',
      en: "Official manufacturer's warranty",
    },
    {
      uz: "O'zbekiston bo'ylab yetkazib berish",
      ru: 'Доставка по всему Узбекистану',
      en: 'Delivery across Uzbekistan',
    },
    {
      uz: 'Qabul qilishda tovarni tekshirish imkoniyati',
      ru: 'Проверка товара при получении',
      en: 'Inspect the item before you accept it',
    },
    {
      uz: "Naqd, karta, Click, Payme yoki muddatli to'lov",
      ru: 'Наличные, карта, Click, Payme или рассрочка',
      en: 'Cash, card, Click, Payme or installments',
    },
    {
      uz: '14 kun ichida qaytarish yoki almashtirish',
      ru: 'Возврат или обмен в течение 14 дней',
      en: 'Returns and exchanges within 14 days',
    },
    {
      uz: 'Mutaxassisdan bepul maslahat',
      ru: 'Бесплатная консультация специалиста',
      en: 'Free expert advice',
    },
  ],
  footerAbout: {
    uz: "OCKEAN — professional asboblar va sanoat uskunalari internet-do'koni. Ustalar, quruvchilar, ustaxonalar va korxonalarga rasmiy kafolatli asbob-uskunalarni taklif etamiz va Toshkentdan butun O'zbekiston bo'ylab yetkazib beramiz.",
    ru: 'OCKEAN — интернет-магазин профессионального инструмента и промышленного оборудования. Предлагаем мастерам, строителям, мастерским и предприятиям инструмент с официальной гарантией и доставляем его из Ташкента по всему Узбекистану.',
    en: 'OCKEAN is an online store for professional tools and industrial equipment. We supply tradespeople, builders, workshops and businesses with officially warranted tools and deliver from Tashkent across Uzbekistan.',
  },
};

import type { SeedBanner } from './types';

/**
 * Storefront banners: 4 home_hero, 2 home_secondary, 3 home_middle, 3 catalog_top.
 * Higher priority = shown first within a placement. Banners that link to a promotion
 * end no later than that promotion.
 */
export const BANNERS: SeedBanner[] = [
  // -------------------------------------------------------------------------
  // home_hero
  // -------------------------------------------------------------------------
  {
    placement: 'home_hero',
    title: {
      uz: 'VERO PRO kunlari: 15% chegirma',
      ru: 'Дни VERO PRO: скидка 15%',
      en: 'VERO PRO days: 15% off',
    },
    subtitle: {
      uz: "Do'konimiz brendining rasmiy kafolatli asboblari — endi yanada arzon",
      ru: 'Инструмент нашего бренда с официальной гарантией — теперь выгоднее',
      en: 'Our own-brand tools with an official warranty — now for less',
    },
    buttonText: { uz: "Aksiyani ko'rish", ru: 'Смотреть акцию', en: 'View offer' },
    buttonUrl: '/promotions/vero-pro-days',
    art: 'power-tools',
    textTheme: 'dark',
    priority: 100,
    startsInDays: -7,
    endsInDays: 21,
    active: true,
  },
  {
    placement: 'home_hero',
    title: {
      uz: "Kuzgi bog' ishlari boshlandi",
      ru: 'Сезон осенних работ в саду',
      en: 'Autumn garden season is here',
    },
    subtitle: {
      uz: "Trimmerlar, zanjirli arralar va maysa o'rish mashinalariga 12% chegirma",
      ru: 'Скидка 12% на триммеры, цепные пилы и газонокосилки',
      en: '12% off grass trimmers, chainsaws and lawn mowers',
    },
    buttonText: { uz: 'Tanlash', ru: 'Выбрать', en: 'Shop now' },
    buttonUrl: '/promotions/autumn-garden-season',
    art: 'garden',
    textTheme: 'light',
    priority: 90,
    startsInDays: -10,
    endsInDays: 30,
    active: true,
  },
  {
    placement: 'home_hero',
    title: {
      uz: "12 oygacha muddatli to'lov",
      ru: 'Рассрочка до 12 месяцев',
      en: 'Installments up to 12 months',
    },
    subtitle: {
      uz: "Kerakli asbobni bugun oling, to'lovni 3, 6 yoki 12 oyga bo'ling",
      ru: 'Берите инструмент сегодня, а оплату разделите на 3, 6 или 12 месяцев',
      en: 'Get the tool you need today and split the cost over 3, 6 or 12 months',
    },
    buttonText: { uz: 'Asbob tanlash', ru: 'Выбрать инструмент', en: 'Choose a tool' },
    buttonUrl: '/catalog',
    art: 'sale',
    textTheme: 'dark',
    priority: 80,
    startsInDays: -20,
    endsInDays: 90,
    active: true,
  },
  {
    placement: 'home_hero',
    title: {
      uz: "O'zbekiston bo'ylab yetkazib beramiz",
      ru: 'Доставка по всему Узбекистану',
      en: 'Delivery across Uzbekistan',
    },
    subtitle: {
      uz: 'Toshkentda odatda shu kuni yoki ertasiga, viloyatlarga 2–5 ish kunida',
      ru: 'По Ташкенту — обычно в день заказа или назавтра, в регионы — 2–5 рабочих дней',
      en: 'Tashkent: usually same or next day. Other regions: 2–5 business days',
    },
    buttonText: { uz: 'Batafsil', ru: 'Подробнее', en: 'Learn more' },
    buttonUrl: '/delivery',
    art: 'delivery',
    textTheme: 'dark',
    priority: 70,
    startsInDays: -30,
    endsInDays: 120,
    active: true,
  },

  // -------------------------------------------------------------------------
  // home_secondary
  // -------------------------------------------------------------------------
  {
    placement: 'home_secondary',
    title: {
      uz: "Chiroq o'chsa ham — uyingiz yorug'",
      ru: 'Свет в доме даже при отключениях',
      en: 'Keep the lights on this winter',
    },
    subtitle: {
      uz: "Uy, do'kon va qurilish maydoni uchun ishonchli generatorlar",
      ru: 'Надёжные генераторы для дома, магазина и стройплощадки',
      en: 'Reliable generators for homes, shops and job sites',
    },
    buttonText: { uz: "Generatorlarni ko'rish", ru: 'Смотреть генераторы', en: 'Shop generators' },
    buttonUrl: '/catalog/generators',
    art: 'generators',
    textTheme: 'dark',
    priority: 100,
    startsInDays: -5,
    endsInDays: 60,
    active: true,
  },
  {
    placement: 'home_secondary',
    title: {
      uz: "Aniq o'lchov — 15% arzonroq",
      ru: 'Точные измерения на 15% дешевле',
      en: 'Precision measuring, 15% off',
    },
    subtitle: {
      uz: "Lazer nivelirlar, masofa o'lchagichlar, ruletkalar va multimetrlar aksiyada",
      ru: 'Лазерные нивелиры, дальномеры, рулетки и мультиметры по акции',
      en: 'Laser levels, rangefinders, tape measures and multimeters on sale',
    },
    buttonText: { uz: "Aksiyaga o'tish", ru: 'К акции', en: 'See the deals' },
    buttonUrl: '/promotions/precise-measuring',
    art: 'measuring',
    textTheme: 'light',
    priority: 90,
    startsInDays: -6,
    endsInDays: 25,
    active: true,
  },

  // -------------------------------------------------------------------------
  // home_middle
  // -------------------------------------------------------------------------
  {
    placement: 'home_middle',
    title: {
      uz: 'Weldora bilan mustahkam chok',
      ru: 'Weldora — уверенный сварочный шов',
      en: 'Weldora: welds you can trust',
    },
    subtitle: {
      uz: 'Invertorli payvandlash apparatlari va himoya niqoblari — uy va ustaxona uchun',
      ru: 'Сварочные инверторы и защитные маски для дома и мастерской',
      en: 'Inverter welders and welding helmets for home and workshop',
    },
    buttonText: { uz: "Brendni ko'rish", ru: 'Смотреть бренд', en: 'View brand' },
    buttonUrl: '/brands/weldora',
    art: 'welding',
    textTheme: 'dark',
    priority: 100,
    startsInDays: -3,
    endsInDays: 60,
    active: true,
  },
  {
    placement: 'home_middle',
    title: {
      uz: 'Ustaxonangizni jihozlang',
      ru: 'Оснастите свою мастерскую',
      en: 'Equip your workshop',
    },
    subtitle: {
      uz: "Asboblar to'plamlari, qo'l asboblari va dastgohlarga 10% chegirma",
      ru: 'Скидка 10% на наборы, ручной инструмент и станки',
      en: '10% off tool sets, hand tools and workshop machines',
    },
    buttonText: { uz: 'Batafsil', ru: 'Подробнее', en: 'Learn more' },
    buttonUrl: '/promotions/equip-your-workshop',
    art: 'hand-tools',
    textTheme: 'light',
    priority: 90,
    startsInDays: -4,
    endsInDays: 40,
    active: true,
  },
  {
    placement: 'home_middle',
    title: {
      uz: "Hydrostorm: 150 000 so'm chegirma",
      ru: 'Hydrostorm: скидка 150 000 сум',
      en: 'Hydrostorm: 150,000 UZS off',
    },
    subtitle: {
      uz: 'Avtomobil, hovli va fasad uchun yuqori bosimli yuvish apparatlari',
      ru: 'Мойки высокого давления для автомобиля, двора и фасада',
      en: 'Pressure washers for cars, yards and facades',
    },
    buttonText: { uz: "Aksiyani ko'rish", ru: 'Смотреть акцию', en: 'View offer' },
    buttonUrl: '/promotions/hydrostorm-clean-yard',
    art: 'water',
    textTheme: 'dark',
    priority: 80,
    startsInDays: -2,
    endsInDays: 25,
    active: true,
  },

  // -------------------------------------------------------------------------
  // catalog_top
  // -------------------------------------------------------------------------
  {
    placement: 'catalog_top',
    title: {
      uz: 'Qurilish maydoni uchun texnika',
      ru: 'Техника для стройплощадки',
      en: 'Machinery for the job site',
    },
    subtitle: {
      uz: 'Beton qorgichlar, plitka kesgichlar va boshqa qurilish uskunalari',
      ru: 'Бетономешалки, плиткорезы и другое строительное оборудование',
      en: 'Concrete mixers, tile cutters and other construction equipment',
    },
    buttonText: { uz: 'Katalogni ochish', ru: 'Открыть каталог', en: 'Open catalogue' },
    buttonUrl: '/catalog/construction-equipment',
    art: 'construction',
    textTheme: 'light',
    priority: 100,
    startsInDays: -14,
    endsInDays: 90,
    active: true,
  },
  {
    placement: 'catalog_top',
    title: {
      uz: 'Barcha aksiyalar bir sahifada',
      ru: 'Все акции на одной странице',
      en: 'All deals in one place',
    },
    subtitle: {
      uz: "Chegirmalar, hafta takliflari va brend aksiyalarini o'tkazib yubormang",
      ru: 'Не пропустите скидки, предложения недели и акции брендов',
      en: "Don't miss discounts, weekly deals and brand offers",
    },
    buttonText: { uz: "Aksiyalarni ko'rish", ru: 'Смотреть акции', en: 'See all deals' },
    buttonUrl: '/promotions',
    art: 'sale',
    textTheme: 'dark',
    priority: 90,
    startsInDays: 0,
    endsInDays: 120,
    active: true,
  },
  {
    // switched off: the summer season is over
    placement: 'catalog_top',
    title: {
      uz: 'Yozgi mavsum: suv nasoslari',
      ru: 'Летний сезон: насосы для воды',
      en: 'Summer season: water pumps',
    },
    subtitle: {
      uz: "Quduq, sug'orish va suv ta'minoti uchun chuqurlik va yer usti nasoslari",
      ru: 'Скважинные и поверхностные насосы для полива и водоснабжения',
      en: 'Borehole and surface pumps for irrigation and water supply',
    },
    buttonText: { uz: "Nasoslarni ko'rish", ru: 'Смотреть насосы', en: 'Shop pumps' },
    buttonUrl: '/catalog/water-pumps',
    art: 'water',
    textTheme: 'light',
    priority: 80,
    startsInDays: -60,
    endsInDays: 20,
    active: false,
  },
];

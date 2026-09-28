import type { L } from '../types';

/** Builds an L object. */
export const t = (uz: string, ru: string, en: string): L => ({ uz, ru, en });

/** Same text in every language (model codes, IP ratings, sizes). */
export const same = (s: string): L => ({ uz: s, ru: s, en: s });

/** Product description Markdown: intro paragraph, bullet list, use-case sentence. */
export const md = (intro: string, bullets: string[], outro: string): string =>
  [intro, bullets.map((b) => `- ${b}`).join('\n'), outro].join('\n\n');

// ─── Shared text-spec values (kept identical so catalogue filters group well) ──

export const COUNTRY = {
  cn: t('Xitoy', 'Китай', 'China'),
  de: t('Germaniya', 'Германия', 'Germany'),
  jp: t('Yaponiya', 'Япония', 'Japan'),
  us: t('AQSH', 'США', 'USA'),
  se: t('Shvetsiya', 'Швеция', 'Sweden'),
  it: t('Italiya', 'Италия', 'Italy'),
  tr: t('Turkiya', 'Турция', 'Turkey'),
  uz: t("O'zbekiston", 'Узбекистан', 'Uzbekistan'),
  kz: t("Qozog'iston", 'Казахстан', 'Kazakhstan'),
};

export const COLOR = {
  /** VERO PRO */
  orangeBlack: t("To'q sariq / qora", 'Оранжевый / чёрный', 'Orange / black'),
  /** Volkstark, Idrovia */
  blue: t("Ko'k", 'Синий', 'Blue'),
  /** Kaizentech */
  teal: t('Firuza', 'Бирюзовый', 'Teal'),
  /** Forgeline, Hydrostorm */
  yellowBlack: t('Sariq / qora', 'Жёлтый / чёрный', 'Yellow / black'),
  /** Nordvik, Aeroforce, Mezon */
  red: t('Qizil', 'Красный', 'Red'),
  /** Weldora */
  navy: t("To'q ko'k", 'Тёмно-синий', 'Navy blue'),
  /** Voltaris, Bog'bon */
  green: t('Yashil', 'Зелёный', 'Green'),
  /** Usta */
  navyOrange: t("To'q ko'k / to'q sariq", 'Тёмно-синий / оранжевый', 'Navy / orange'),
  /** Monolit */
  greyOrange: t("Kulrang / to'q sariq", 'Серый / оранжевый', 'Grey / orange'),
  black: t('Qora', 'Чёрный', 'Black'),
  silver: t('Kumush rang', 'Серебристый', 'Silver'),
};

export const LI_ION = same('Li-ion');

export const CHUCK = {
  keyless: t('Tez qisiladigan', 'Быстрозажимной', 'Keyless'),
  keyed: t('Kalitli', 'Ключевой', 'Keyed'),
  sdsPlus: same('SDS-plus'),
  sdsMax: same('SDS-max'),
  hex30: t('HEX 30 mm', 'HEX 30 мм', 'HEX 30 mm'),
  square12: t('Kvadrat 1/2"', 'Квадрат 1/2"', '1/2" square drive'),
  hex14: t('Olti qirrali 1/4"', 'Шестигранник 1/4"', '1/4" hex'),
};

export const FUEL = {
  petrol: t('Benzin AI-92', 'Бензин АИ-92', 'Petrol (RON 92)'),
  mix: t('Benzin va moy aralashmasi', 'Бензин с маслом (смесь)', 'Petrol/oil mix'),
  diesel: t("Dizel yoqilg'isi", 'Дизельное топливо', 'Diesel'),
};

export const START = {
  recoil: t("Qo'lda (shnurli starter)", 'Ручной (тросовый стартер)', 'Recoil (pull cord)'),
  electric: t('Elektr starter', 'Электростартер', 'Electric start'),
  recoilElectric: t("Qo'lda + elektr starter", 'Ручной + электростартер', 'Recoil + electric start'),
};

export const ENGINE = {
  fourStroke: t('4 taktli, OHV', '4-тактный, OHV', '4-stroke OHV'),
  twoStroke: t('2 taktli', '2-тактный', '2-stroke'),
  diesel: t(
    '4 taktli dizel, havo bilan sovutiladi',
    '4-тактный дизель, воздушное охлаждение',
    '4-stroke air-cooled diesel',
  ),
};

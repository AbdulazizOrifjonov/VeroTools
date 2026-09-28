import type { LocalizedText } from './constants';

export interface UzCity {
  code: string;
  name: LocalizedText;
}

export interface UzRegion {
  code: string;
  name: LocalizedText;
  cities: UzCity[];
}

const c = (code: string, uz: string, ru: string, en: string): UzCity => ({ code, name: { uz, ru, en } });

/** Administrative regions of Uzbekistan (12 regions + Tashkent city + Republic of Karakalpakstan). */
export const UZ_REGIONS: UzRegion[] = [
  {
    code: 'tashkent-city',
    name: { uz: 'Toshkent shahri', ru: 'г. Ташкент', en: 'Tashkent city' },
    cities: [
      c('bektemir', 'Bektemir tumani', 'Бектемирский район', 'Bektemir district'),
      c('chilonzor', 'Chilonzor tumani', 'Чиланзарский район', 'Chilanzar district'),
      c('mirobod', 'Mirobod tumani', 'Мирабадский район', 'Mirabad district'),
      c('mirzo-ulugbek', "Mirzo Ulug'bek tumani", 'Мирзо-Улугбекский район', 'Mirzo Ulugbek district'),
      c('olmazor', 'Olmazor tumani', 'Алмазарский район', 'Almazar district'),
      c('sergeli', 'Sergeli tumani', 'Сергелийский район', 'Sergeli district'),
      c('shayxontohur', 'Shayxontohur tumani', 'Шайхантахурский район', 'Shaykhantakhur district'),
      c('uchtepa', 'Uchtepa tumani', 'Учтепинский район', 'Uchtepa district'),
      c('yakkasaroy', 'Yakkasaroy tumani', 'Яккасарайский район', 'Yakkasaray district'),
      c('yangihayot', 'Yangihayot tumani', 'Янгихаётский район', 'Yangikhayot district'),
      c('yashnobod', 'Yashnobod tumani', 'Яшнабадский район', 'Yashnabad district'),
      c('yunusobod', 'Yunusobod tumani', 'Юнусабадский район', 'Yunusabad district'),
    ],
  },
  {
    code: 'tashkent-region',
    name: { uz: 'Toshkent viloyati', ru: 'Ташкентская область', en: 'Tashkent region' },
    cities: [
      c('nurafshon', 'Nurafshon', 'Нурафшан', 'Nurafshon'),
      c('chirchiq', 'Chirchiq', 'Чирчик', 'Chirchiq'),
      c('olmaliq', 'Olmaliq', 'Алмалык', 'Almalyk'),
      c('angren', 'Angren', 'Ангрен', 'Angren'),
      c('bekobod', 'Bekobod', 'Бекабад', 'Bekabad'),
      c('ohangaron', 'Ohangaron', 'Ахангаран', 'Akhangaran'),
      c('yangiyol', "Yangiyo'l", 'Янгиюль', 'Yangiyul'),
      c('zangiota', 'Zangiota', 'Зангиата', 'Zangiata'),
    ],
  },
  {
    code: 'andijan',
    name: { uz: 'Andijon viloyati', ru: 'Андижанская область', en: 'Andijan region' },
    cities: [
      c('andijon', 'Andijon', 'Андижан', 'Andijan'),
      c('asaka', 'Asaka', 'Асака', 'Asaka'),
      c('xonobod', 'Xonobod', 'Ханабад', 'Khanabad'),
      c('shahrixon', 'Shahrixon', 'Шахрихан', 'Shahrikhan'),
    ],
  },
  {
    code: 'bukhara',
    name: { uz: 'Buxoro viloyati', ru: 'Бухарская область', en: 'Bukhara region' },
    cities: [
      c('buxoro', 'Buxoro', 'Бухара', 'Bukhara'),
      c('kogon', 'Kogon', 'Каган', 'Kagan'),
      c('gijduvon', "G'ijduvon", 'Гиждуван', 'Gijduvan'),
      c('qorakol', "Qorako'l", 'Каракуль', 'Karakul'),
    ],
  },
  {
    code: 'fergana',
    name: { uz: "Farg'ona viloyati", ru: 'Ферганская область', en: 'Fergana region' },
    cities: [
      c('fargona', "Farg'ona", 'Фергана', 'Fergana'),
      c('qoqon', "Qo'qon", 'Коканд', 'Kokand'),
      c('margilon', "Marg'ilon", 'Маргилан', 'Margilan'),
      c('quvasoy', 'Quvasoy', 'Кувасай', 'Kuvasay'),
      c('rishton', 'Rishton', 'Риштан', 'Rishtan'),
    ],
  },
  {
    code: 'jizzakh',
    name: { uz: 'Jizzax viloyati', ru: 'Джизакская область', en: 'Jizzakh region' },
    cities: [
      c('jizzax', 'Jizzax', 'Джизак', 'Jizzakh'),
      c('gallaorol', "G'allaorol", 'Галляарал', 'Gallaaral'),
      c('dostlik', "Do'stlik", 'Дустлик', 'Dustlik'),
    ],
  },
  {
    code: 'khorezm',
    name: { uz: 'Xorazm viloyati', ru: 'Хорезмская область', en: 'Khorezm region' },
    cities: [
      c('urganch', 'Urganch', 'Ургенч', 'Urgench'),
      c('xiva', 'Xiva', 'Хива', 'Khiva'),
      c('hazorasp', 'Hazorasp', 'Хазарасп', 'Khazarasp'),
      c('xonqa', 'Xonqa', 'Ханка', 'Khanka'),
    ],
  },
  {
    code: 'namangan',
    name: { uz: 'Namangan viloyati', ru: 'Наманганская область', en: 'Namangan region' },
    cities: [
      c('namangan', 'Namangan', 'Наманган', 'Namangan'),
      c('chust', 'Chust', 'Чуст', 'Chust'),
      c('pop', 'Pop', 'Пап', 'Pap'),
      c('chortoq', 'Chortoq', 'Чартак', 'Chartak'),
    ],
  },
  {
    code: 'navoi',
    name: { uz: 'Navoiy viloyati', ru: 'Навоийская область', en: 'Navoi region' },
    cities: [
      c('navoiy', 'Navoiy', 'Навои', 'Navoi'),
      c('zarafshon', 'Zarafshon', 'Зарафшан', 'Zarafshan'),
      c('uchquduq', 'Uchquduq', 'Учкудук', 'Uchkuduk'),
      c('nurota', 'Nurota', 'Нурата', 'Nurata'),
    ],
  },
  {
    code: 'kashkadarya',
    name: { uz: 'Qashqadaryo viloyati', ru: 'Кашкадарьинская область', en: 'Kashkadarya region' },
    cities: [
      c('qarshi', 'Qarshi', 'Карши', 'Karshi'),
      c('shahrisabz', 'Shahrisabz', 'Шахрисабз', 'Shahrisabz'),
      c('kitob', 'Kitob', 'Китаб', 'Kitab'),
      c('guzor', "G'uzor", 'Гузар', 'Guzar'),
    ],
  },
  {
    code: 'samarkand',
    name: { uz: 'Samarqand viloyati', ru: 'Самаркандская область', en: 'Samarkand region' },
    cities: [
      c('samarqand', 'Samarqand', 'Самарканд', 'Samarkand'),
      c('kattaqorgon', "Kattaqo'rg'on", 'Каттакурган', 'Kattakurgan'),
      c('urgut', 'Urgut', 'Ургут', 'Urgut'),
      c('bulungur', "Bulung'ur", 'Булунгур', 'Bulungur'),
    ],
  },
  {
    code: 'syrdarya',
    name: { uz: 'Sirdaryo viloyati', ru: 'Сырдарьинская область', en: 'Syrdarya region' },
    cities: [
      c('guliston', 'Guliston', 'Гулистан', 'Gulistan'),
      c('yangiyer', 'Yangiyer', 'Янгиер', 'Yangiyer'),
      c('shirin', 'Shirin', 'Ширин', 'Shirin'),
      c('sirdaryo', 'Sirdaryo', 'Сырдарья', 'Syrdarya'),
    ],
  },
  {
    code: 'surkhandarya',
    name: { uz: 'Surxondaryo viloyati', ru: 'Сурхандарьинская область', en: 'Surkhandarya region' },
    cities: [
      c('termiz', 'Termiz', 'Термез', 'Termez'),
      c('denov', 'Denov', 'Денау', 'Denau'),
      c('sherobod', 'Sherobod', 'Шерабад', 'Sherabad'),
      c('boysun', 'Boysun', 'Байсун', 'Baysun'),
    ],
  },
  {
    code: 'karakalpakstan',
    name: { uz: "Qoraqalpog'iston Respublikasi", ru: 'Республика Каракалпакстан', en: 'Republic of Karakalpakstan' },
    cities: [
      c('nukus', 'Nukus', 'Нукус', 'Nukus'),
      c('xojayli', "Xo'jayli", 'Ходжейли', 'Khodjeyli'),
      c('tortkol', "To'rtko'l", 'Турткуль', 'Turtkul'),
      c('beruniy', 'Beruniy', 'Беруни', 'Beruni'),
      c('qongirot', "Qo'ng'irot", 'Кунград', 'Kungrad'),
    ],
  },
];

export const UZ_REGION_CODES = UZ_REGIONS.map((r) => r.code);

export function findRegion(code: string | undefined | null): UzRegion | undefined {
  if (!code) return undefined;
  return UZ_REGIONS.find((r) => r.code === code);
}

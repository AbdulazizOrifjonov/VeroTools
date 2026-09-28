import type { L, SeedPage } from './types';
import { STORE_SETTINGS as S } from './settings';
import { PICKUP_POINTS } from './delivery';

type Lang = keyof L;

/** "+998712000000" → "+998 71 200 00 00" */
const displayPhone = (p: string): string =>
  `${p.slice(0, 4)} ${p.slice(4, 6)} ${p.slice(6, 9)} ${p.slice(9, 11)} ${p.slice(11)}`;
const tel = (p: string): string => `[${displayPhone(p)}](tel:${p})`;
const mail = (e: string): string => `[${e}](mailto:${e})`;
const bare = (url: string): string => url.replace(/^https?:\/\//, '');
/** for values embedded mid-sentence ("... (dushanba–shanba 09:00–19:00, ...)") */
const lcFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);
const handle = (url: string): string => `@${(url.split('/').pop() ?? '').replace(/^@/, '')}`;

const PICKUP_LABELS: Record<Lang, { address: string; hours: string; phone: string }> = {
  uz: { address: 'Manzil', hours: 'Ish vaqti', phone: 'Telefon' },
  ru: { address: 'Адрес', hours: 'Время работы', phone: 'Телефон' },
  en: { address: 'Address', hours: 'Opening hours', phone: 'Phone' },
};

const pickupPoints = (lang: Lang): string =>
  PICKUP_POINTS.map((p) =>
    [
      `### ${p.name[lang]}`,
      '',
      `- ${PICKUP_LABELS[lang].address}: ${p.address[lang]}`,
      `- ${PICKUP_LABELS[lang].hours}: ${p.workingHours[lang]}`,
      `- ${PICKUP_LABELS[lang].phone}: ${tel(p.phone)}`,
    ].join('\n'),
  ).join('\n\n');

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

const about: SeedPage = {
  slug: 'about',
  title: { uz: 'Biz haqimizda', ru: 'О компании', en: 'About us' },
  content: {
    uz: `VERO TOOLS — Toshkentda joylashgan professional asboblar va sanoat uskunalari internet-do'koni. Buyurtmalarni butun O'zbekiston bo'ylab — Toshkent shahri va viloyatidan Qoraqalpog'istongacha yetkazib beramiz.

## Bizning vazifamiz

Ish sifati ko'p jihatdan asbobga bog'liq. Shuning uchun maqsadimiz — ustalar, quruvchilar, ustaxonalar, fermer xo'jaliklari va korxonalar uchun ishonchli asbob-uskunani tanlash va sotib olishni oson qilish hamda uning butun xizmat muddati davomida yordam berish.

## Katalogimizda nimalar bor

- **Elektr asboblar** — shurupovertlar, perforatorlar, burchak silliqlash mashinalari (bolgarkalar), arralar va gayka buragichlar
- **Qo'l asboblari va to'plamlar** — kalitlar, otvyortkalar, ombirlar, bolg'alar, kallaklar to'plamlari va asbob qutilari
- **Suv nasoslari** — quduq, sug'orish va suv ta'minoti uchun chuqurlik va yer usti nasoslari
- **Kompressorlar va generatorlar** — ustaxona, uy, do'kon va qurilish maydoni uchun
- **Payvandlash uskunalari** — invertorli payvandlash apparatlari, himoya niqoblari va elektrodlar
- **Qurilish va bog' texnikasi** — beton qorgichlar, plitka kesgichlar, maysa o'rish mashinalari, trimmerlar va zanjirli arralar
- **Yuqori bosimli yuvish apparatlari** va **o'lchov asboblari** — lazer nivelirlar, masofa o'lchagichlar, ruletkalar va multimetrlar
- **Aksessuarlar, sarf materiallari va ehtiyot qismlar** — disklar, parmalar, arra disklari, ko'mir cho'tkalar, patronlar va boshqalar
- **Sanoat uskunalari** — parmalash va charxlash dastgohlari

Barcha bo'limlar [katalogda](/catalog), brendlar esa [Brendlar](/brands) sahifasida jamlangan.

## Kimlar uchun ishlaymiz

- **Professional ustalar va brigadalar** — har kungi yuklamaga chidaydigan asboblar
- **Uy egalari** — ta'mirlash, hovli va bog' ishlari uchun
- **Ustaxonalar va servislar** — dastgohlar, kompressorlar va sarf materiallari
- **Korxonalar va tashkilotlar** — yuridik shaxslar uchun hisob-varaq va hisob-faktura rasmiylashtiramiz

## Biz nimalarga e'tibor beramiz

1. **Original mahsulot.** Tovarlarni faqat vakolatli yetkazib beruvchilar va rasmiy distribyutorlardan olamiz.
2. **Rasmiy kafolat.** Kafolat muddati har bir mahsulot sahifasida ko'rsatiladi, kafolat bo'yicha murojaatlarni esa servis markazlari bilan birgalikda ko'rib chiqamiz.
3. **Halol maslahat.** Konsultantlarimiz eng qimmat modelni emas, aynan vazifangizga mos keladiganini tavsiya qiladi.
4. **Qulay xizmat.** Toshkent bo'ylab kuryer orqali yetkazib berish, viloyatlarda hamkor kuryerlik xizmatlari, olib ketish punktlari, turli to'lov usullari va muddatli to'lov.

## VERO PRO — do'konimiz brendi

VERO PRO — VERO TOOLS do'konining xususiy brendi. Bu liniyaga kundalik professional ish uchun tanlangan asboblar kiradi. Ular rasmiy kafolat bilan sotiladi, mos sarf materiallari va ehtiyot qismlarni esa katalogimizdan topishingiz mumkin. Barcha modellar — [VERO PRO sahifasida](/brand/vero-pro).

## Biz bilan bog'laning

Savolingiz bo'lsa yoki asbob tanlashda yordam kerak bo'lsa, [Kontaktlar](/contacts) sahifasidagi istalgan usul orqali murojaat qiling. Ko'p beriladigan savollarga javoblarni [FAQ](/faq) bo'limida topasiz.`,
    ru: `VERO TOOLS — интернет-магазин профессионального инструмента и промышленного оборудования из Ташкента. Мы доставляем заказы по всему Узбекистану — от Ташкента и Ташкентской области до Каракалпакстана.

## Наша миссия

Качество работы во многом зависит от инструмента. Поэтому наша задача — сделать так, чтобы мастерам, строителям, мастерским, фермерским хозяйствам и предприятиям было просто выбрать и купить надёжное оборудование, а затем получать поддержку на протяжении всего срока его службы.

## Что есть в каталоге

- **Электроинструмент** — шуруповёрты, перфораторы, углошлифовальные машины (болгарки), пилы и гайковёрты
- **Ручной инструмент и наборы** — ключи, отвёртки, пассатижи, молотки, наборы головок и инструментальные кейсы
- **Насосы для воды** — скважинные и поверхностные насосы для полива и водоснабжения
- **Компрессоры и генераторы** — для мастерской, дома, магазина и стройплощадки
- **Сварочное оборудование** — сварочные инверторы, защитные маски и электроды
- **Строительная и садовая техника** — бетономешалки, плиткорезы, газонокосилки, триммеры и цепные пилы
- **Мойки высокого давления** и **измерительный инструмент** — лазерные нивелиры, дальномеры, рулетки и мультиметры
- **Аксессуары, расходные материалы и запчасти** — диски, свёрла, пильные диски, угольные щётки, патроны и многое другое
- **Промышленное оборудование** — сверлильные и заточные станки

Все разделы собраны в [каталоге](/catalog), а бренды — на странице [Бренды](/brands).

## Для кого мы работаем

- **Профессиональные мастера и бригады** — инструмент, рассчитанный на ежедневные нагрузки
- **Владельцы домов и квартир** — всё для ремонта, двора и сада
- **Мастерские и сервисы** — станки, компрессоры и расходные материалы
- **Компании и организации** — для юридических лиц оформляем счёт на оплату и счёт-фактуру

## Наши принципы

1. **Оригинальная продукция.** Закупаем товары только у авторизованных поставщиков и официальных дистрибьюторов.
2. **Официальная гарантия.** Срок гарантии указан на странице каждого товара, а гарантийные обращения мы рассматриваем вместе с сервисными центрами.
3. **Честная консультация.** Наши консультанты рекомендуют не самую дорогую модель, а ту, которая подходит именно под вашу задачу.
4. **Удобный сервис.** Курьерская доставка по Ташкенту, партнёрские курьерские службы в регионах, пункты выдачи, разные способы оплаты и рассрочка.

## VERO PRO — бренд нашего магазина

VERO PRO — собственная торговая марка VERO TOOLS. В линейку входит инструмент, отобранный для ежедневной профессиональной работы. Он продаётся с официальной гарантией, а подходящие расходники и запчасти можно найти в нашем каталоге. Все модели — на [странице VERO PRO](/brand/vero-pro).

## Свяжитесь с нами

Если у вас есть вопросы или нужна помощь с выбором инструмента, свяжитесь с нами любым способом со страницы [Контакты](/contacts). Ответы на частые вопросы собраны в разделе [FAQ](/faq).`,
    en: `VERO TOOLS is a Tashkent-based online store for professional tools and industrial equipment. We deliver orders across Uzbekistan — from Tashkent city and region all the way to Karakalpakstan.

## Our mission

Good work depends on good tools. Our goal is to make it easy for tradespeople, builders, workshops, farms and businesses to choose and buy reliable equipment — and to support them for as long as that equipment is in service.

## What you will find in our catalogue

- **Power tools** — cordless drills, rotary hammers, angle grinders, saws and impact wrenches
- **Hand tools and tool sets** — wrenches, screwdrivers, pliers, hammers, socket sets and tool cases
- **Water pumps** — borehole and surface pumps for irrigation and water supply
- **Compressors and generators** — for workshops, homes, shops and job sites
- **Welding equipment** — inverter welders, welding helmets and electrodes
- **Construction and garden equipment** — concrete mixers, tile cutters, lawn mowers, grass trimmers and chainsaws
- **Pressure washers** and **measuring tools** — laser levels, rangefinders, tape measures and multimeters
- **Accessories, consumables and spare parts** — discs, drill bits, saw blades, carbon brushes, chucks and more
- **Industrial equipment** — drill presses and bench grinders

Browse every section in the [catalogue](/catalog) and all brands on the [Brands](/brands) page.

## Who we work for

- **Professional tradespeople and crews** who need tools built for daily heavy use
- **Homeowners** tackling renovation, yard and garden work
- **Workshops and service centres** looking for machines, compressors and consumables
- **Companies and organisations** — we issue invoices and tax invoices for legal entities

## What we care about

1. **Genuine products.** We buy only from authorised suppliers and official distributors.
2. **Official warranty.** The warranty period is shown on every product page, and we handle warranty claims together with service centres.
3. **Honest advice.** Our consultants recommend the model that fits your task, not simply the most expensive one.
4. **Convenient service.** Courier delivery in Tashkent, partner courier services in the regions, pickup points, a choice of payment methods and installment plans.

## VERO PRO — our own brand

VERO PRO is the house brand of VERO TOOLS: a line of tools selected for everyday professional work. It is sold with an official warranty, and you can find matching consumables and spare parts in our catalogue. See all models on the [VERO PRO page](/brand/vero-pro).

## Get in touch

If you have a question or need help choosing a tool, contact us in any of the ways listed on the [Contacts](/contacts) page. Answers to common questions are collected in our [FAQ](/faq).`,
  },
  seoTitle: {
    uz: 'Biz haqimizda — VERO TOOLS',
    ru: 'О компании — VERO TOOLS',
    en: 'About us — VERO TOOLS',
  },
  seoDescription: {
    uz: "VERO TOOLS — Toshkentdagi professional asboblar va sanoat uskunalari internet-do'koni. Rasmiy kafolat, O'zbekiston bo'ylab yetkazib berish va mutaxassis maslahati.",
    ru: 'Интернет-магазин профессионального инструмента и оборудования в Ташкенте: официальная гарантия, доставка по всему Узбекистану и консультации специалистов.',
    en: 'VERO TOOLS is a Tashkent online store for professional tools and industrial equipment, offering official warranties, delivery across Uzbekistan and expert advice.',
  },
};

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

const delivery: SeedPage = {
  slug: 'delivery',
  title: { uz: 'Yetkazib berish', ru: 'Доставка', en: 'Delivery' },
  content: {
    uz: `Buyurtmalarni butun O'zbekiston bo'ylab yetkazib beramiz. Yetkazib berish narxi va muddati manzilingiz joylashgan hududga bog'liq: aniq summa va taxminiy sana buyurtmani rasmiylashtirishda, manzilni kiritganingizdan so'ng ko'rsatiladi.

## Yetkazib berish usullari

### Toshkent bo'ylab kuryer orqali

- Buyurtma odatda **shu kuni yoki keyingi ish kuni** yetkaziladi — bu buyurtma tasdiqlangan vaqt va tovarning omborda mavjudligiga bog'liq.
- Kuryer yetib borishidan oldin qo'ng'iroq qiladi va aniq vaqtni siz bilan kelishib oladi.

### Viloyatlarga — hamkor kuryerlik xizmatlari orqali

- Toshkent viloyatiga yetkazib berish odatda **1–2 ish kuni**, boshqa viloyatlarga **2–5 ish kuni** davom etadi.
- Uzoq tumanlar va qishloqlarga yetkazish biroz ko'proq vaqt olishi mumkin.
- Ayrim aholi punktlarida buyurtma eshikkacha emas, hamkor xizmatning eng yaqin bo'limigacha yetkaziladi — bu haqda operator oldindan xabar beradi.

### Olib ketish punktidan o'zi olib ketish

- Buyurtmani Toshkent, Samarqand va Farg'onadagi olib ketish punktlarimizdan **bepul** olib ketishingiz mumkin.
- Buyurtma punktga yetib kelgach, SMS yoki qo'ng'iroq orqali xabar beramiz. Saqlash muddati xabarnomada ko'rsatiladi.
- Buyurtmani olishda buyurtma raqamini va rasmiylashtirishda ko'rsatilgan telefon raqamini ayting.
- Punktlarning manzillari va ish vaqti [Kontaktlar](/contacts) sahifasida.

## Yetkazib berish narxi

- Narx **yetkazib berish hududiga** bog'liq: Toshkent shahri, Toshkent viloyati, Farg'ona vodiysi, markaziy, janubiy va g'arbiy viloyatlar uchun alohida tariflar amal qiladi.
- Belgilangan summadan oshgan buyurtmalar **bepul** yetkaziladi. Hududingiz uchun bepul yetkazib berish chegarasi savatda va buyurtmani rasmiylashtirish sahifasida ko'rsatiladi.
- Olib ketish punktidan olib ketish har doim bepul.
- Og'ir va katta hajmli tovarlar (masalan, beton qorgichlar, sanoat generatorlari va kompressorlar) uchun yetkazib berish va tushirish shartlari operator bilan alohida kelishilishi mumkin.

## Buyurtma qanday yetkaziladi

1. **Buyurtmani rasmiylashtirasiz** — saytda, mobil ilovada yoki telefon orqali.
2. **Operator qo'ng'iroq qiladi** va buyurtma tarkibi, narxi, manzil hamda to'lov usulini tasdiqlaydi.
3. **Buyurtma yig'iladi va jo'natiladi** — uning holati shaxsiy kabinetdagi «Buyurtmalarim» bo'limida yangilanib boradi.
4. **Kuryer bog'lanadi** — yetib borishdan oldin qo'ng'iroq qilib, vaqtni aniqlashtiradi.
5. **Tovarni tekshirib qabul qilasiz** va, agar oldindan to'lamagan bo'lsangiz, to'lovni amalga oshirasiz.

## Qabul qilishda tekshirish

Tovarni kuryer ishtirokida tekshiring:

- qadoq butunligi va tashqi ko'rinishi — yoriqlar, ezilgan yoki tirnalgan joylar yo'qligi;
- to'liq jamlanganligi — akkumulyatorlar, zaryadlovchi qurilma, kalitlar, yo'riqnoma va kafolat taloni;
- buyurtmangizga mosligi — model, rang va variant.

Nuqson yoki kamchilik aniqlansa, tovarni qabul qilmaslikka haqlisiz. Bu haqda kuryerga ayting va darhol biz bilan bog'laning — almashtirish yoki qayta yetkazib berishni tashkil qilamiz.

## Savollar bo'lsa

Buyurtma holatini bilish yoki yetkazib berish vaqtini o'zgartirish uchun [Kontaktlar](/contacts) sahifasidagi raqamlarga qo'ng'iroq qiling yoki Telegram-botimizga yozing.`,
    ru: `Мы доставляем заказы по всему Узбекистану. Стоимость и сроки доставки зависят от региона: точную сумму и ориентировочную дату вы увидите при оформлении заказа, после того как укажете адрес.

## Способы доставки

### Курьером по Ташкенту

- Как правило, заказ доставляется **в тот же или на следующий рабочий день** — в зависимости от времени подтверждения и наличия товара на складе.
- Перед приездом курьер позвонит и согласует с вами точное время.

### В регионы — партнёрскими курьерскими службами

- Доставка по Ташкентской области обычно занимает **1–2 рабочих дня**, в другие регионы — **2–5 рабочих дней**.
- В отдалённые районы и сёла доставка может занять немного больше времени.
- В некоторые населённые пункты заказ доставляется не до двери, а до ближайшего отделения партнёрской службы — оператор предупредит об этом заранее.

### Самовывоз из пункта выдачи

- Заказ можно **бесплатно** забрать в наших пунктах выдачи в Ташкенте, Самарканде и Фергане.
- Когда заказ поступит в пункт, мы сообщим об этом по SMS или звонком. Срок хранения указан в уведомлении.
- При получении назовите номер заказа и номер телефона, указанный при оформлении.
- Адреса и время работы пунктов — на странице [Контакты](/contacts).

## Стоимость доставки

- Стоимость зависит от **зоны доставки**: для Ташкента, Ташкентской области, Ферганской долины, центральных, южных и западных регионов действуют отдельные тарифы.
- Заказы на сумму выше установленного порога доставляются **бесплатно**. Порог бесплатной доставки для вашего региона показан в корзине и на странице оформления заказа.
- Самовывоз из пункта выдачи всегда бесплатный.
- Для тяжёлых и крупногабаритных товаров (например, бетономешалок, промышленных генераторов и компрессоров) условия доставки и разгрузки могут согласовываться с оператором отдельно.

## Как проходит доставка

1. **Вы оформляете заказ** — на сайте, в мобильном приложении или по телефону.
2. **Оператор звонит вам** и подтверждает состав заказа, цену, адрес и способ оплаты.
3. **Заказ собирают и отправляют** — статус обновляется в разделе «Мои заказы» в личном кабинете.
4. **Курьер связывается с вами** перед приездом и уточняет время.
5. **Вы проверяете товар** и оплачиваете заказ, если не оплатили его заранее.

## Проверка при получении

Осмотрите товар в присутствии курьера:

- целостность упаковки и внешний вид — нет ли трещин, вмятин и царапин;
- комплектность — аккумуляторы, зарядное устройство, ключи, инструкция и гарантийный талон;
- соответствие заказу — модель, цвет и вариант исполнения.

Если вы обнаружили дефект или недокомплект, вы вправе не принимать товар. Сообщите об этом курьеру и сразу свяжитесь с нами — мы организуем замену или повторную доставку.

## Остались вопросы?

Чтобы узнать статус заказа или перенести время доставки, позвоните нам по номерам со страницы [Контакты](/contacts) или напишите нашему Telegram-боту.`,
    en: `We deliver orders across Uzbekistan. Delivery cost and time depend on your region: you will see the exact price and an estimated delivery date at checkout once you enter your address.

## Delivery options

### Courier delivery in Tashkent

- Orders are usually delivered **the same or the next business day**, depending on when the order is confirmed and whether the item is in stock.
- The courier will call you before arriving to agree on the exact time.

### Regional delivery by partner courier services

- Delivery to Tashkent region usually takes **1–2 business days**, and to other regions **2–5 business days**.
- Remote districts and villages may take a little longer.
- In some localities the order is delivered to the nearest branch of the partner service rather than to your door — our operator will let you know in advance.

### Pickup

- You can collect your order **free of charge** from our pickup points in Tashkent, Samarkand and Fergana.
- We will let you know by SMS or phone when your order arrives at the pickup point. The storage period is stated in the notification.
- When collecting, give your order number and the phone number used at checkout.
- Addresses and opening hours are listed on the [Contacts](/contacts) page.

## Delivery cost

- The price depends on the **delivery zone**: Tashkent city, Tashkent region, the Fergana Valley, and the central, southern and western regions each have their own rates.
- Orders above a set amount ship **free**. The free-delivery threshold for your region is shown in the cart and at checkout.
- Collection from a pickup point is always free.
- For heavy and bulky items (such as concrete mixers, industrial generators and compressors), delivery and unloading terms may be agreed separately with our operator.

## How delivery works

1. **You place an order** on the website, in the mobile app or by phone.
2. **Our operator calls you** to confirm the items, price, address and payment method.
3. **We pick, pack and ship the order** — its status is updated under "My orders" in your account.
4. **The courier contacts you** before arriving to confirm the time.
5. **You inspect the goods** and pay, unless you have already paid online.

## Inspection on receipt

Check the item in the courier's presence:

- the packaging is intact and the item has no cracks, dents or scratches;
- the set is complete — batteries, charger, keys, manual and warranty card;
- the item matches your order — model, colour and version.

If you find a defect or something is missing, you have the right to refuse the item. Tell the courier and contact us straight away — we will arrange a replacement or a new delivery.

## Questions?

To check your order status or reschedule delivery, call us on the numbers listed on the [Contacts](/contacts) page or message our Telegram bot.`,
  },
  seoTitle: {
    uz: "Yetkazib berish — Toshkent va O'zbekiston bo'ylab | VERO TOOLS",
    ru: 'Доставка по Ташкенту и Узбекистану | VERO TOOLS',
    en: 'Delivery in Tashkent and across Uzbekistan | VERO TOOLS',
  },
  seoDescription: {
    uz: "Toshkent bo'ylab kuryer orqali odatda shu kuni yoki ertasi kuni, viloyatlarga 2–5 ish kunida yetkazib berish. Olib ketish punktlari va bepul yetkazib berish shartlari.",
    ru: 'Курьерская доставка по Ташкенту — обычно в день заказа или на следующий день, в регионы — за 2–5 рабочих дней. Пункты выдачи и условия бесплатной доставки.',
    en: 'Courier delivery in Tashkent, usually the same or next day, and 2–5 business days to other regions. Pickup points and free delivery conditions.',
  },
};

// ---------------------------------------------------------------------------
// Warranty
// ---------------------------------------------------------------------------

const warranty: SeedPage = {
  slug: 'warranty',
  title: { uz: 'Kafolat', ru: 'Гарантия', en: 'Warranty' },
  content: {
    uz: `VERO TOOLS do'konida sotiladigan barcha asbob va uskunalarga ishlab chiqaruvchining rasmiy kafolati beriladi. Kafolat davrida ishlab chiqarish nuqsoni aniqlansa, tovar bepul ta'mirlanadi yoki qonunchilikda belgilangan tartibda almashtiriladi.

## Kafolat muddati

- Kafolat muddati **har bir mahsulot sahifasida** va kafolat talonida ko'rsatilgan. U tovar turi va brendga qarab farq qiladi.
- Kafolat muddati tovar sizga topshirilgan kundan boshlab hisoblanadi.
- Ayrim qismlar (masalan, akkumulyatorlar) uchun asosiy tovardan farqli kafolat muddati belgilanishi mumkin — bu ham mahsulot sahifasida ko'rsatiladi.

## Qaysi hujjatlarni saqlash kerak

- to'lovni tasdiqlovchi chek yoki buyurtma raqami;
- to'ldirilgan kafolat taloni (agar u tovar bilan birga berilgan bo'lsa);
- iloji bo'lsa, original qadoq — u tovarni servis markaziga xavfsiz yetkazishga yordam beradi.

## Kafolat bo'yicha murojaat qilish tartibi

1. **Qo'llab-quvvatlash xizmatiga murojaat qiling** — telefon, Telegram yoki elektron pochta orqali. Buyurtma raqami, tovar nomi va nosozlikni qisqacha yozing, imkon bo'lsa, rasm yoki video yuboring.
2. **Dastlabki maslahat oling.** Ba'zan muammo sozlash yoki to'g'ri foydalanish bo'yicha maslahat bilan hal bo'ladi.
3. **Tovarni topshiring.** Tovarni hujjatlar bilan birga olib ketish punktiga yoki biz ko'rsatgan servis markaziga olib keling. Toshkentda tovarni kuryer orqali topshirish imkoniyatini operatordan so'rang.
4. **Diagnostika.** Servis markazi mutaxassislari nosozlik sababini aniqlaydi. Diagnostika natijasi va ta'mirlash muddati haqida sizga xabar beramiz.
5. **Natija.** Holat kafolatga kirsa, tovar bepul ta'mirlanadi. Ta'mirlashning iloji bo'lmasa, tovar almashtiriladi yoki pul qaytariladi — O'zbekiston Respublikasining iste'molchilarning huquqlarini himoya qilish to'g'risidagi qonunchiligiga muvofiq.

## Kafolat qamrab olmaydigan holatlar

- mexanik shikastlanishlar: yoriqlar, sinishlar, zarba izlari, deformatsiya;
- tovardan yo'riqnomaga zid ravishda yoki maqsadiga muvofiq bo'lmagan holda foydalanish, doimiy ortiqcha yuklama;
- noto'g'ri kuchlanishga ulash, sifatsiz yoqilg'i yoki moydan foydalanish, texnik xizmatni o'z vaqtida o'tkazmaslik;
- ichiga suyuqlik, chang yoki begona jismlar tushishi natijasida yuzaga kelgan nosozliklar (agar tovar bunday sharoitga mo'ljallanmagan bo'lsa);
- vakolatsiz shaxslar tomonidan ochilgan yoki ta'mirlangan, shuningdek, seriya raqami o'chirilgan yoki shikastlangan tovarlar;
- tabiiy eskiradigan qismlar: ko'mir cho'tkalar, patronlar, tasmalar, rezina zichlagichlar va shu kabilar;
- sarf materiallari: disklar, parmalar, arra disklari, elektrodlar, filtrlar, trimmer iplari va boshqalar.

## Kafolat muddati tugaganidan keyin

Kafolat tugagach ham tovarni pullik ta'mirlash uchun servis markaziga yo'naltirishda yordam beramiz. Ko'plab ehtiyot qismlar va sarf materiallarini [Ehtiyot qismlar](/catalog/spare-parts) va [Sarf materiallari](/catalog/consumables) bo'limlaridan topishingiz mumkin.`,
    ru: `На все инструменты и оборудование, которые продаются в VERO TOOLS, действует официальная гарантия производителя. Если в гарантийный период обнаружится производственный дефект, товар бесплатно отремонтируют или заменят в порядке, установленном законодательством.

## Срок гарантии

- Срок гарантии указан **на странице каждого товара** и в гарантийном талоне. Он зависит от типа товара и бренда.
- Гарантийный срок исчисляется со дня передачи товара покупателю.
- Для отдельных комплектующих (например, аккумуляторов) может действовать срок, отличный от срока основного товара, — он также указан на странице товара.

## Какие документы сохранить

- чек или номер заказа, подтверждающие покупку;
- заполненный гарантийный талон (если он входит в комплект);
- по возможности — оригинальную упаковку: в ней товар безопаснее доставить в сервисный центр.

## Как обратиться по гарантии

1. **Свяжитесь со службой поддержки** по телефону, в Telegram или по электронной почте. Укажите номер заказа, название товара и кратко опишите неисправность; по возможности приложите фото или видео.
2. **Получите первичную консультацию.** Иногда проблему удаётся решить настройкой или советом по правильной эксплуатации.
3. **Передайте товар.** Привезите его вместе с документами в пункт выдачи или в указанный нами сервисный центр. В Ташкенте уточните у оператора возможность передать товар через курьера.
4. **Диагностика.** Специалисты сервисного центра определят причину неисправности. О результатах диагностики и сроках ремонта мы вам сообщим.
5. **Результат.** Если случай гарантийный, товар отремонтируют бесплатно. Если ремонт невозможен, товар заменят или вернут деньги — в соответствии с законодательством Республики Узбекистан о защите прав потребителей.

## На что гарантия не распространяется

- механические повреждения: трещины, сколы, следы ударов, деформация;
- эксплуатация с нарушением инструкции или не по назначению, систематическая перегрузка;
- подключение к сети с неподходящим напряжением, использование некачественного топлива или масла, несвоевременное техобслуживание;
- неисправности из-за попадания внутрь жидкости, пыли или посторонних предметов (если товар не предназначен для работы в таких условиях);
- товары, вскрытые или отремонтированные неуполномоченными лицами, а также со стёртым или повреждённым серийным номером;
- быстроизнашивающиеся детали: угольные щётки, патроны, ремни, резиновые уплотнители и т. п.;
- расходные материалы: диски, свёрла, пильные диски, электроды, фильтры, леска для триммера и др.

## После окончания гарантии

Когда гарантийный срок истёк, мы поможем направить товар на платный ремонт в сервисный центр. Многие запчасти и расходные материалы можно найти в разделах [Запчасти](/catalog/spare-parts) и [Расходные материалы](/catalog/consumables).`,
    en: `All tools and equipment sold by VERO TOOLS come with the manufacturer's official warranty. If a manufacturing defect appears during the warranty period, the item is repaired free of charge or replaced in the manner prescribed by law.

## Warranty period

- The warranty period is shown **on each product page** and on the warranty card. It varies by product type and brand.
- The warranty period starts on the day the item is handed over to you.
- Some components (for example, batteries) may have a different warranty period from the main product; this is also stated on the product page.

## Documents to keep

- the receipt or order number confirming your purchase;
- the completed warranty card, if one is supplied with the product;
- the original packaging, if possible — it helps get the item to the service centre safely.

## How to make a warranty claim

1. **Contact our support team** by phone, on Telegram or by email. Include your order number, the product name and a short description of the fault, plus photos or a video if you can.
2. **Get initial advice.** Sometimes the issue can be solved with an adjustment or tips on correct use.
3. **Hand over the item.** Bring it with the documents to a pickup point or to the service centre we specify. In Tashkent, ask our operator whether the item can be handed over via a courier.
4. **Diagnostics.** Service centre technicians identify the cause of the fault. We will let you know the diagnostic result and the expected repair time.
5. **Outcome.** If the fault is covered, the item is repaired free of charge. If it cannot be repaired, it is replaced or your money is refunded in accordance with the legislation of the Republic of Uzbekistan on consumer rights protection.

## What the warranty does not cover

- mechanical damage: cracks, chips, impact marks, deformation;
- use contrary to the manual or for purposes other than intended, and constant overloading;
- connection to an unsuitable voltage, use of poor-quality fuel or oil, or missed routine maintenance;
- faults caused by liquid, dust or foreign objects getting inside (unless the product is designed for such conditions);
- items opened or repaired by unauthorised persons, or with a removed or damaged serial number;
- wear parts such as carbon brushes, chucks, belts and rubber seals;
- consumables such as discs, drill bits, saw blades, electrodes, filters and trimmer line.

## After the warranty expires

Once the warranty has ended, we can still help you arrange a paid repair at a service centre. Many spare parts and consumables are available in the [Spare parts](/catalog/spare-parts) and [Consumables](/catalog/consumables) sections.`,
  },
  seoTitle: {
    uz: 'Kafolat shartlari | VERO TOOLS',
    ru: 'Условия гарантии | VERO TOOLS',
    en: 'Warranty terms | VERO TOOLS',
  },
  seoDescription: {
    uz: "Asbob va uskunalarga ishlab chiqaruvchining rasmiy kafolati: muddatlar, kafolat bo'yicha murojaat qilish tartibi va kafolat qamrab olmaydigan holatlar.",
    ru: 'Официальная гарантия производителя на инструмент и оборудование: сроки, порядок гарантийного обращения и случаи, на которые гарантия не распространяется.',
    en: "The manufacturer's official warranty on tools and equipment: warranty periods, how to make a claim and what is not covered.",
  },
};

// ---------------------------------------------------------------------------
// Returns
// ---------------------------------------------------------------------------

const returns: SeedPage = {
  slug: 'returns',
  title: { uz: 'Qaytarish va almashtirish', ru: 'Возврат и обмен', en: 'Returns and exchanges' },
  content: {
    uz: `Tovar sizga mos kelmasa, uni qaytarishingiz yoki boshqasiga almashtirishingiz mumkin. Qaytarish shartlari O'zbekiston Respublikasining iste'molchilarning huquqlarini himoya qilish to'g'risidagi qonunchiligiga asoslanadi.

## Sifatli tovarni qaytarish yoki almashtirish

Foydalanilmagan tovarni **qabul qilgan kundan boshlab 14 kun ichida** qaytarish yoki almashtirish mumkin, agar:

- tovar ishlatilmagan va unda foydalanish izlari yo'q;
- original qadoq, tovar ko'rinishi, yorliqlar va plombalar saqlangan;
- tovar to'liq jamlangan — aksessuarlar, yo'riqnoma va kafolat taloni bilan;
- xaridni tasdiqlovchi hujjat (chek yoki buyurtma raqami) mavjud.

Narxi boshqacha bo'lgan tovarga almashtirilganda narxlar farqi qo'shimcha to'lanadi yoki sizga qaytariladi.

Ayrim tovarlar, masalan, xaridor o'lchamiga ko'ra kesib berilgan shlang va kabellar, sifatli bo'lsa qaytarib olinmasligi mumkin. Bunday hollarda buyurtmani tasdiqlashda oldindan ogohlantiramiz.

## Nuqsonli tovar

- Tovarni qabul qilishda nuqson aniqlasangiz, uni qabul qilmang va kuryerga ayting — almashtirishni tashkil qilamiz.
- Nuqson foydalanish jarayonida aniqlansa, murojaat [kafolat shartlari](/warranty) bo'yicha ko'rib chiqiladi: tovar servis markazida diagnostikadan o'tadi, so'ngra ta'mirlanadi, almashtiriladi yoki pul qaytariladi.
- Nuqsonli tovarni qaytarish bilan bog'liq yetkazib berish xarajatlarini do'kon o'z zimmasiga oladi.

## Qaytarish tartibi

1. [Kontaktlar](/contacts) sahifasidagi istalgan usul orqali biz bilan bog'laning va buyurtma raqamini ayting.
2. Qaytarish sababini tushuntiring — operator keyingi qadamlarni aytib beradi.
3. Tovarni olib ketish punktiga olib keling yoki uni qaytarib yuborish usulini operator bilan kelishing. Sifatli tovarni qaytarib yuborish xarajatlari xaridor zimmasida bo'ladi.
4. Mutaxassislarimiz tovarni ko'zdan kechiradi va uning qaytarish shartlariga mosligini tasdiqlaydi.
5. Pul qaytariladi yoki tovar almashtiriladi.

## Pulni qaytarish

Pul **to'lov amalga oshirilgan usulning o'ziga** qaytariladi:

- **naqd pul** bilan to'langan bo'lsa — olib ketish punktida naqd pulda;
- **bank kartasi, Click yoki Payme** orqali to'langan bo'lsa — o'sha karta yoki hisobga. Mablag' tushish muddati bank yoki to'lov tizimiga bog'liq;
- **muddatli to'lov** rasmiylashtirilgan bo'lsa — shartnoma uning shartlariga ko'ra bekor qilinadi va to'langan summa qaytariladi.`,
    ru: `Если товар вам не подошёл, его можно вернуть или обменять на другой. Условия возврата основаны на законодательстве Республики Узбекистан о защите прав потребителей.

## Возврат и обмен товара надлежащего качества

Неиспользованный товар можно вернуть или обменять **в течение 14 дней со дня получения**, если:

- товар не был в употреблении и на нём нет следов использования;
- сохранены оригинальная упаковка, товарный вид, ярлыки и пломбы;
- товар в полной комплектации — с аксессуарами, инструкцией и гарантийным талоном;
- есть документ, подтверждающий покупку (чек или номер заказа).

При обмене на товар с другой ценой разница доплачивается или возвращается вам.

Некоторые товары, например шланги и кабели, отрезанные по размеру покупателя, при надлежащем качестве могут не подлежать возврату. О таких случаях мы предупреждаем заранее при подтверждении заказа.

## Товар с недостатками

- Если дефект обнаружен при получении, не принимайте товар и сообщите курьеру — мы организуем замену.
- Если недостаток проявился в процессе эксплуатации, обращение рассматривается по [условиям гарантии](/warranty): товар проходит диагностику в сервисном центре, после чего его ремонтируют, заменяют или возвращают деньги.
- Расходы на доставку при возврате товара с недостатками магазин берёт на себя.

## Как оформить возврат

1. Свяжитесь с нами любым способом со страницы [Контакты](/contacts) и назовите номер заказа.
2. Расскажите о причине возврата — оператор объяснит дальнейшие шаги.
3. Привезите товар в пункт выдачи или согласуйте с оператором способ отправки. Расходы на отправку товара надлежащего качества несёт покупатель.
4. Наши специалисты осмотрят товар и подтвердят его соответствие условиям возврата.
5. Мы вернём деньги или обменяем товар.

## Возврат денег

Деньги возвращаются **тем же способом, которым была произведена оплата**:

- **наличные** — наличными в пункте выдачи;
- **банковская карта, Click или Payme** — на ту же карту или счёт. Срок зачисления зависит от банка или платёжной системы;
- **рассрочка** — договор рассрочки расторгается на его условиях, а уплаченная сумма возвращается.`,
    en: `If an item does not suit you, you can return it or exchange it for another one. Our return terms are based on the legislation of the Republic of Uzbekistan on consumer rights protection.

## Returning or exchanging items of proper quality

You can return or exchange an unused item **within 14 days of receiving it**, provided that:

- the item has not been used and shows no signs of use;
- the original packaging, appearance, labels and seals are intact;
- the item is complete, with all accessories, the manual and the warranty card;
- you have proof of purchase (a receipt or order number).

If you exchange it for an item with a different price, you pay the difference or we refund it to you.

Some goods, such as hoses and cables cut to a customer's length, may not be returnable if they are of proper quality. We always warn you about this in advance when confirming the order.

## Defective items

- If you notice a defect on delivery, do not accept the item — tell the courier, and we will arrange a replacement.
- If a defect appears during use, your request is handled under our [warranty terms](/warranty): the item is inspected at a service centre and then repaired, replaced or refunded.
- We cover the delivery costs of returning defective items.

## How to return an item

1. Contact us in any of the ways listed on the [Contacts](/contacts) page and give your order number.
2. Tell us why you are returning the item — the operator will explain the next steps.
3. Bring the item to a pickup point or agree on a shipping method with the operator. The cost of sending back items of proper quality is paid by the customer.
4. Our specialists inspect the item and confirm that it meets the return conditions.
5. We refund your money or exchange the item.

## Refunds

Refunds are made **to the original payment method**:

- **cash** — in cash at a pickup point;
- **bank card, Click or Payme** — to the same card or account. How long the money takes to arrive depends on your bank or payment system;
- **installment plan** — the installment agreement is cancelled under its terms, and the amount you have paid is refunded.`,
  },
  seoTitle: {
    uz: 'Tovarni qaytarish va almashtirish | VERO TOOLS',
    ru: 'Возврат и обмен товара | VERO TOOLS',
    en: 'Returns and exchanges | VERO TOOLS',
  },
  seoDescription: {
    uz: "Foydalanilmagan tovarni 14 kun ichida original qadog'ida qaytarish yoki almashtirish shartlari, nuqsonli tovarlar va pulni qaytarish tartibi.",
    ru: 'Условия возврата и обмена неиспользованного товара в оригинальной упаковке в течение 14 дней, товары с недостатками и порядок возврата денег.',
    en: 'How to return or exchange unused items in their original packaging within 14 days, what happens with defective goods and how refunds work.',
  },
};

// ---------------------------------------------------------------------------
// Privacy
// ---------------------------------------------------------------------------

const privacy: SeedPage = {
  slug: 'privacy',
  title: { uz: 'Maxfiylik siyosati', ru: 'Политика конфиденциальности', en: 'Privacy policy' },
  content: {
    uz: `Ushbu siyosat VERO TOOLS internet-do'koni (sayt va mobil ilova) foydalanuvchilarining shaxsga doir ma'lumotlari qanday to'planishi, foydalanilishi va himoya qilinishini tushuntiradi. Shaxsga doir ma'lumotlar O'zbekiston Respublikasining «Shaxsga doir ma'lumotlar to'g'risida»gi Qonuni va boshqa qonunchilik hujjatlariga muvofiq qayta ishlanadi.

## Qanday ma'lumotlarni to'playmiz

- **Aloqa ma'lumotlari:** ism, familiya, telefon raqami, elektron pochta manzili.
- **Yetkazib berish manzillari:** viloyat, shahar yoki tuman, ko'cha, uy va xonadon raqami.
- **Buyurtmalar tarixi:** xarid qilingan tovarlar, summalar, to'lov va yetkazib berish usullari, qaytarish va kafolat bo'yicha murojaatlar.
- **Hisob sozlamalari:** til, sevimlilar va taqqoslash ro'yxatlari, bildirishnomalar sozlamalari.
- **Texnik ma'lumotlar:** qurilma va brauzer turi, IP-manzil, cookie-fayllar — sayt to'g'ri va xavfsiz ishlashi uchun.
- **Murojaatlar va sharhlar:** qo'llab-quvvatlash xizmatiga yozgan xabarlaringiz va mahsulotlarga qoldirgan sharhlaringiz.

Bank kartalari ma'lumotlarini saqlamaymiz: onlayn to'lovlar Click va Payme to'lov tizimlarining himoyalangan sahifalarida amalga oshiriladi.

## Ma'lumotlardan qanday maqsadlarda foydalanamiz

- buyurtmalarni qabul qilish, tasdiqlash, to'lovni qayta ishlash va yetkazib berish;
- buyurtma holati haqida xabar berish va siz bilan bog'lanish;
- kafolat, qaytarish va almashtirish bo'yicha murojaatlarni ko'rib chiqish;
- shaxsiy kabinet ishini ta'minlash va xizmat sifatini yaxshilash;
- aksiyalar va yangiliklar haqida xabarlar yuborish — faqat roziligingiz bilan; obunani istalgan vaqtda bekor qilish mumkin;
- qonunchilikda belgilangan majburiyatlarni bajarish (masalan, buxgalteriya hisobini yuritish).

## Saqlash va himoya

- Ma'lumotlarga faqat ish vazifasi uchun zarur bo'lgan vakolatli xodimlargina kira oladi.
- Sayt va ilova bilan ma'lumot almashinuvi shifrlangan ulanish (HTTPS) orqali amalga oshiriladi, parollar ochiq ko'rinishda saqlanmaydi.
- Ma'lumotlar yuqorida ko'rsatilgan maqsadlar uchun zarur bo'lgan muddat davomida yoki qonunchilikda belgilangan muddatlarda saqlanadi.

## Ma'lumotlarni uchinchi shaxslarga berish

Shaxsga doir ma'lumotlaringizni sotmaymiz. Ular faqat buyurtmani bajarish uchun zarur hajmda beriladi:

- **yetkazib berish bo'yicha hamkorlarga** — ism, telefon raqami va manzil;
- **to'lov bo'yicha hamkorlarga** — to'lovlarni va muddatli to'lov arizalarini qayta ishlash uchun;
- **davlat organlariga** — faqat qonunchilikda nazarda tutilgan hollarda.

## Sizning huquqlaringiz

Siz quyidagi huquqlarga egasiz:

- ma'lumotlaringiz qanday qayta ishlanayotgani haqida ma'lumot olish;
- ma'lumotlaringizni aniqlashtirish va o'zgartirish — buni shaxsiy kabinetda o'zingiz qilishingiz mumkin;
- ma'lumotlarni qayta ishlashga bergan roziligingizni qaytarib olish va reklama xabarlaridan voz kechish;
- hisobingiz va ma'lumotlaringizni o'chirishni so'rash (qonunchilikka ko'ra saqlanishi shart bo'lgan ma'lumotlar bundan mustasno).

## Cookie-fayllar

Cookie-fayllar savatni saqlash, tanlangan tilni eslab qolish va sayt ishlashini tahlil qilish uchun ishlatiladi. Ularni brauzer sozlamalarida o'chirib qo'yishingiz mumkin, ammo bunda saytning ayrim funksiyalari to'g'ri ishlamasligi mumkin.

## Aloqa

Shaxsga doir ma'lumotlar bo'yicha savol va so'rovlaringizni ${mail(S.supportEmail)} manziliga yuboring yoki [Kontaktlar](/contacts) sahifasidagi raqamlarga qo'ng'iroq qiling.

## Siyosatga o'zgartirishlar

Ushbu siyosatni vaqti-vaqti bilan yangilashimiz mumkin. Yangi tahrir shu sahifada e'lon qilingan paytdan boshlab kuchga kiradi.`,
    ru: `Настоящая политика объясняет, как интернет-магазин VERO TOOLS (сайт и мобильное приложение) собирает, использует и защищает персональные данные пользователей. Персональные данные обрабатываются в соответствии с Законом Республики Узбекистан «О персональных данных» и иными актами законодательства.

## Какие данные мы собираем

- **Контактные данные:** имя, фамилия, номер телефона, адрес электронной почты.
- **Адреса доставки:** регион, город или район, улица, номер дома и квартиры.
- **История заказов:** купленные товары, суммы, способы оплаты и доставки, обращения по возврату и гарантии.
- **Настройки аккаунта:** язык, списки избранного и сравнения, настройки уведомлений.
- **Технические данные:** тип устройства и браузера, IP-адрес, файлы cookie — для корректной и безопасной работы сайта.
- **Обращения и отзывы:** ваши сообщения в службу поддержки и отзывы о товарах.

Данные банковских карт мы не храним: онлайн-оплата проходит на защищённых страницах платёжных систем Click и Payme.

## Для чего мы используем данные

- чтобы принимать, подтверждать, оплачивать и доставлять заказы;
- чтобы сообщать о статусе заказа и связываться с вами;
- чтобы рассматривать обращения по гарантии, возврату и обмену;
- чтобы обеспечивать работу личного кабинета и улучшать сервис;
- чтобы отправлять сообщения об акциях и новинках — только с вашего согласия; отписаться можно в любой момент;
- чтобы выполнять обязанности, установленные законодательством (например, вести бухгалтерский учёт).

## Хранение и защита

- Доступ к данным есть только у уполномоченных сотрудников, которым он необходим для работы.
- Обмен данными с сайтом и приложением происходит по защищённому соединению (HTTPS), пароли не хранятся в открытом виде.
- Данные хранятся столько, сколько необходимо для указанных целей, или в течение сроков, установленных законодательством.

## Передача данных третьим лицам

Мы не продаём ваши персональные данные. Они передаются только в объёме, необходимом для выполнения заказа:

- **партнёрам по доставке** — имя, номер телефона и адрес;
- **партнёрам по приёму платежей** — для обработки оплаты и заявок на рассрочку;
- **государственным органам** — только в случаях, предусмотренных законодательством.

## Ваши права

Вы вправе:

- получать информацию о том, как обрабатываются ваши данные;
- уточнять и изменять свои данные — это можно сделать самостоятельно в личном кабинете;
- отозвать согласие на обработку данных и отказаться от рекламных рассылок;
- запросить удаление аккаунта и данных (кроме сведений, которые мы обязаны хранить по закону).

## Файлы cookie

Файлы cookie используются, чтобы сохранять корзину, запоминать выбранный язык и анализировать работу сайта. Вы можете отключить их в настройках браузера, но тогда часть функций сайта может работать некорректно.

## Контакты

Вопросы и запросы, касающиеся персональных данных, направляйте на адрес ${mail(S.supportEmail)} или звоните по номерам со страницы [Контакты](/contacts).

## Изменения политики

Мы можем время от времени обновлять эту политику. Новая редакция вступает в силу с момента её публикации на этой странице.`,
    en: `This policy explains how the VERO TOOLS online store (website and mobile app) collects, uses and protects users' personal data. We process personal data in accordance with the Law of the Republic of Uzbekistan "On Personal Data" and other applicable legislation.

## What data we collect

- **Contact details:** first name, last name, phone number and email address.
- **Delivery addresses:** region, city or district, street, house and apartment number.
- **Order history:** items purchased, amounts, payment and delivery methods, return and warranty requests.
- **Account settings:** language, wishlist and comparison lists, notification preferences.
- **Technical data:** device and browser type, IP address and cookies, so the site works correctly and securely.
- **Messages and reviews:** what you write to our support team and the reviews you leave on products.

We do not store bank card details: online payments are made on the secure pages of the Click and Payme payment systems.

## How we use your data

- to accept, confirm, process payment for and deliver orders;
- to keep you informed about your order status and contact you;
- to handle warranty, return and exchange requests;
- to run your personal account and improve our service;
- to send news and offers — only with your consent, and you can unsubscribe at any time;
- to meet our legal obligations, such as accounting.

## Storage and protection

- Only authorised employees who need the data for their work can access it.
- Data exchanged with the website and app travels over an encrypted connection (HTTPS), and passwords are never stored in plain text.
- We keep data only for as long as needed for the purposes above or for the periods required by law.

## Sharing with third parties

We do not sell your personal data. We share it only to the extent needed to fulfil your order:

- with **delivery partners** — your name, phone number and address;
- with **payment partners** — to process payments and installment applications;
- with **government authorities** — only where required by law.

## Your rights

You have the right to:

- know how your data is processed;
- correct and update your data — you can do this yourself in your account;
- withdraw your consent to processing and opt out of marketing messages;
- ask us to delete your account and data (except information we are legally required to keep).

## Cookies

We use cookies to keep your cart, remember your language and analyse how the site performs. You can disable cookies in your browser settings, but some features may then stop working properly.

## Contact

Send questions and requests about personal data to ${mail(S.supportEmail)} or call us on the numbers listed on the [Contacts](/contacts) page.

## Changes to this policy

We may update this policy from time to time. The new version takes effect as soon as it is published on this page.`,
  },
  seoTitle: {
    uz: 'Maxfiylik siyosati | VERO TOOLS',
    ru: 'Политика конфиденциальности | VERO TOOLS',
    en: 'Privacy policy | VERO TOOLS',
  },
  seoDescription: {
    uz: "VERO TOOLS mijozlarning shaxsga doir ma'lumotlarini qanday to'playdi, ishlatadi va himoya qiladi, sizning huquqlaringiz va biz bilan bog'lanish usullari.",
    ru: 'Как VERO TOOLS собирает, использует и защищает персональные данные клиентов, какие у вас есть права и как с нами связаться.',
    en: "How VERO TOOLS collects, uses and protects customers' personal data, what rights you have and how to contact us.",
  },
};

// ---------------------------------------------------------------------------
// Terms (public offer)
// ---------------------------------------------------------------------------

const terms: SeedPage = {
  slug: 'terms',
  title: { uz: 'Ommaviy oferta', ru: 'Публичная оферта', en: 'Public offer (terms of sale)' },
  content: {
    uz: `Ushbu ommaviy oferta (keyingi o'rinlarda — «Oferta») VERO TOOLS internet-do'koni — verotools.uz sayti va mobil ilova (keyingi o'rinlarda — «Do'kon») orqali tovarlarni masofadan sotish shartlarini belgilaydi. ${S.legalName.uz} (keyingi o'rinlarda — «Sotuvchi») har qanday jismoniy yoki yuridik shaxsga (keyingi o'rinlarda — «Xaridor») quyidagi shartlarda oldi-sotdi shartnomasini tuzishni taklif qiladi.

## 1. Ofertani qabul qilish

1.1. Xaridor Do'kon orqali buyurtma rasmiylashtirgan va (yoki) uning haqini to'lagan paytdan boshlab Oferta shartlarini to'liq va so'zsiz qabul qilgan (aksept qilgan) hisoblanadi.

1.2. Buyurtma berish orqali Xaridor ushbu shartlar, shuningdek, [Yetkazib berish](/delivery), [Kafolat](/warranty) va [Qaytarish va almashtirish](/returns) sahifalaridagi qoidalar bilan tanishganini tasdiqlaydi.

## 2. Tovarlar, narxlar va mavjudlik

2.1. Tovarlar narxi so'mda ko'rsatiladi. Buyurtma narxi u tasdiqlangan paytda qayd etiladi va keyinchalik o'zgarmaydi.

2.2. Sotuvchi Do'kondagi narxlarni oldindan xabar bermasdan o'zgartirish huquqiga ega. Bu tasdiqlangan buyurtmalarga ta'sir qilmaydi.

2.3. Tovarlarning tavsifi, xususiyatlari va tasvirlari ma'lumot uchun berilgan. Ishlab chiqaruvchi tovar jamlanmasi yoki tashqi ko'rinishini o'zgartirishi mumkin; muhim farqlar haqida Xaridorga buyurtmani tasdiqlashda xabar beriladi.

2.4. Buyurtma qilingan tovar mavjud bo'lmay qolsa, Sotuvchi bu haqda Xaridorga xabar beradi va muqobil tovar taklif qiladi yoki buyurtmani bekor qilib, to'langan summani qaytaradi.

## 3. Buyurtmani rasmiylashtirish va tasdiqlash

3.1. Buyurtma Do'kon sayti, mobil ilova yoki telefon orqali rasmiylashtiriladi.

3.2. Buyurtma rasmiylashtirilgach, Sotuvchi operatori Xaridorga **telefon orqali** qo'ng'iroq qilib, buyurtma tarkibi, narxi, yetkazib berish manzili va muddati hamda to'lov usulini tasdiqlaydi.

3.3. Xaridor bilan u ko'rsatgan telefon raqami orqali bog'lanishning iloji bo'lmasa, Sotuvchi buyurtmani bekor qilishi mumkin.

3.4. Onlayn to'lov usuli tanlangan, biroq to'lov uchun ajratilgan vaqt ichida to'lanmagan buyurtmalar avtomatik ravishda bekor qilinishi mumkin.

## 4. To'lov

4.1. To'lov quyidagi usullarda amalga oshiriladi: yetkazib berishda naqd pul bilan, kuryer terminali orqali Uzcard yoki Humo kartasi bilan, Click yoki Payme orqali, Uzcard va Humo kartalari bilan onlayn, shuningdek, muddatli to'lov orqali (ariza tasdiqlangan taqdirda).

4.2. Yuridik shaxslar uchun hisob-varaq bo'yicha to'lov shartlari alohida kelishiladi.

4.3. To'lov usullari haqida batafsil ma'lumot «To'lov usullari» sahifasida keltirilgan.

## 5. Yetkazib berish va tovarni qabul qilish

5.1. Tovar Xaridor ko'rsatgan manzilga yetkaziladi yoki olib ketish punktida topshiriladi. Muddatlar va narxlar [Yetkazib berish](/delivery) sahifasida va buyurtmani rasmiylashtirishda ko'rsatiladi.

5.2. Xaridor tovarni qabul qilishda uning tashqi ko'rinishi, jamlanganligi va buyurtmaga mosligini tekshiradi. Tovarning tasodifan yo'qolishi yoki shikastlanishi xavfi tovar Xaridorga topshirilgan paytdan boshlab Xaridorga o'tadi.

## 6. Buyurtmani bekor qilish

6.1. Xaridor buyurtmani jo'natilgunga qadar bepul bekor qilishi mumkin. Jo'natilgan buyurtma [qaytarish qoidalari](/returns) bo'yicha qaytariladi.

6.2. Sotuvchi quyidagi hollarda buyurtmani bekor qilishi mumkin: tovar mavjud bo'lmasa, narxda texnik xato aniqlansa, Xaridor bilan bog'lanishning iloji bo'lmasa yoki buyurtmada firibgarlik alomatlari bo'lsa.

6.3. Oldindan to'langan summa to'lov amalga oshirilgan usulning o'ziga qaytariladi.

## 7. Kafolat va qaytarish

Tovarlarga kafolat xizmati ko'rsatish, ularni qaytarish va almashtirish [Kafolat](/warranty) va [Qaytarish va almashtirish](/returns) sahifalaridagi shartlar hamda O'zbekiston Respublikasining iste'molchilarning huquqlarini himoya qilish to'g'risidagi qonunchiligiga muvofiq amalga oshiriladi.

## 8. Javobgarlik

8.1. Tomonlar Oferta bo'yicha majburiyatlarni bajarmaganlik yoki lozim darajada bajarmaganlik uchun O'zbekiston Respublikasi qonunchiligiga muvofiq javobgar bo'ladi.

8.2. Sotuvchi tovardan yo'riqnomaga zid ravishda foydalanish natijasida yetkazilgan zarar uchun javobgar emas.

8.3. Tomonlar yengib bo'lmaydigan kuch (fors-major) holatlari sababli majburiyatlarni bajarmaganlik uchun javobgarlikdan ozod qilinadi.

## 9. Nizolarni hal qilish

9.1. Nizolar avvalo muzokaralar yo'li bilan hal qilinadi. Xaridor o'z talabnomasini [Kontaktlar](/contacts) sahifasida ko'rsatilgan manzillar orqali yozma ravishda yuborishi mumkin.

9.2. Kelishuvga erishilmasa, nizo O'zbekiston Respublikasi qonunchiligiga muvofiq sudda ko'rib chiqiladi.

## 10. Yakuniy qoidalar

10.1. Sotuvchi Oferta shartlarini bir tomonlama o'zgartirish huquqiga ega. Yangi tahrir Do'konda e'lon qilingan paytdan boshlab kuchga kiradi va shundan keyin rasmiylashtirilgan buyurtmalarga nisbatan qo'llaniladi.

10.2. Ofertada nazarda tutilmagan masalalar O'zbekiston Respublikasi qonunchiligi bilan tartibga solinadi.

## Sotuvchi ma'lumotlari

- **Sotuvchi:** ${S.legalName.uz}
- **Manzil:** ${S.address.uz}
- **Telefon:** ${tel(S.phones.primary)}
- **Elektron pochta:** ${mail(S.email)}
- **Sayt:** [${bare(S.website)}](${S.website})`,
    ru: `Настоящая публичная оферта (далее — «Оферта») определяет условия дистанционной продажи товаров через интернет-магазин VERO TOOLS — сайт verotools.uz и мобильное приложение (далее — «Магазин»). ${S.legalName.ru} (далее — «Продавец») предлагает любому физическому или юридическому лицу (далее — «Покупатель») заключить договор купли-продажи на изложенных ниже условиях.

## 1. Акцепт оферты

1.1. Покупатель считается полностью и безоговорочно принявшим (акцептовавшим) условия Оферты с момента оформления заказа в Магазине и (или) его оплаты.

1.2. Оформляя заказ, Покупатель подтверждает, что ознакомился с настоящими условиями, а также с правилами на страницах [Доставка](/delivery), [Гарантия](/warranty) и [Возврат и обмен](/returns).

## 2. Товары, цены и наличие

2.1. Цены на товары указаны в сумах. Цена заказа фиксируется в момент его подтверждения и в дальнейшем не меняется.

2.2. Продавец вправе изменять цены в Магазине без предварительного уведомления. Это не влияет на уже подтверждённые заказы.

2.3. Описания, характеристики и изображения товаров носят информационный характер. Производитель может изменить комплектацию или внешний вид товара; о существенных отличиях Покупателю сообщают при подтверждении заказа.

2.4. Если заказанного товара не оказалось в наличии, Продавец сообщает об этом Покупателю и предлагает замену либо отменяет заказ и возвращает уплаченную сумму.

## 3. Оформление и подтверждение заказа

3.1. Заказ оформляется на сайте Магазина, в мобильном приложении или по телефону.

3.2. После оформления заказа оператор Продавца **звонит Покупателю** и подтверждает состав заказа, цену, адрес и срок доставки, а также способ оплаты.

3.3. Если связаться с Покупателем по указанному им номеру телефона не удаётся, Продавец вправе отменить заказ.

3.4. Заказы с выбранной онлайн-оплатой, не оплаченные в отведённое для оплаты время, могут быть отменены автоматически.

## 4. Оплата

4.1. Оплата производится следующими способами: наличными при получении, картой Uzcard или Humo через терминал курьера, через Click или Payme, картами Uzcard и Humo онлайн, а также в рассрочку (при одобрении заявки).

4.2. Для юридических лиц условия оплаты по счёту согласовываются отдельно.

4.3. Подробнее о способах оплаты — на странице «Способы оплаты».

## 5. Доставка и приёмка товара

5.1. Товар доставляется по адресу, указанному Покупателем, или выдаётся в пункте выдачи. Сроки и стоимость указаны на странице [Доставка](/delivery) и при оформлении заказа.

5.2. При получении Покупатель проверяет внешний вид, комплектность и соответствие товара заказу. Риск случайной гибели или повреждения товара переходит к Покупателю с момента передачи ему товара.

## 6. Отмена заказа

6.1. Покупатель может бесплатно отменить заказ до его отправки. Отправленный заказ возвращается по [правилам возврата](/returns).

6.2. Продавец вправе отменить заказ, если товара нет в наличии, в цене обнаружена техническая ошибка, с Покупателем невозможно связаться или заказ имеет признаки мошенничества.

6.3. Предоплата возвращается тем же способом, которым была произведена оплата.

## 7. Гарантия и возврат

Гарантийное обслуживание, возврат и обмен товаров осуществляются на условиях страниц [Гарантия](/warranty) и [Возврат и обмен](/returns), а также в соответствии с законодательством Республики Узбекистан о защите прав потребителей.

## 8. Ответственность

8.1. За неисполнение или ненадлежащее исполнение обязательств по Оферте стороны несут ответственность в соответствии с законодательством Республики Узбекистан.

8.2. Продавец не несёт ответственности за ущерб, возникший в результате эксплуатации товара с нарушением инструкции.

8.3. Стороны освобождаются от ответственности за неисполнение обязательств вследствие обстоятельств непреодолимой силы (форс-мажор).

## 9. Разрешение споров

9.1. Споры разрешаются прежде всего путём переговоров. Покупатель может направить письменную претензию по контактам, указанным на странице [Контакты](/contacts).

9.2. Если договориться не удалось, спор рассматривается в суде в соответствии с законодательством Республики Узбекистан.

## 10. Заключительные положения

10.1. Продавец вправе в одностороннем порядке изменять условия Оферты. Новая редакция вступает в силу с момента её публикации в Магазине и применяется к заказам, оформленным после этого.

10.2. Вопросы, не урегулированные Офертой, регулируются законодательством Республики Узбекистан.

## Сведения о продавце

- **Продавец:** ${S.legalName.ru}
- **Адрес:** ${S.address.ru}
- **Телефон:** ${tel(S.phones.primary)}
- **Электронная почта:** ${mail(S.email)}
- **Сайт:** [${bare(S.website)}](${S.website})`,
    en: `This public offer (the "Offer") sets out the terms for the remote sale of goods through the VERO TOOLS online store — the verotools.uz website and mobile app (the "Store"). ${S.legalName.en} (the "Seller") offers to conclude a sale contract on the terms below with any individual or legal entity (the "Buyer").

## 1. Acceptance of the Offer

1.1. The Buyer is deemed to have fully and unconditionally accepted the terms of the Offer from the moment they place an order in the Store and/or pay for it.

1.2. By placing an order, the Buyer confirms that they have read these terms and the rules on the [Delivery](/delivery), [Warranty](/warranty) and [Returns and exchanges](/returns) pages.

## 2. Goods, prices and availability

2.1. Prices are shown in Uzbek so'm (UZS). The order price is fixed when the order is confirmed and does not change afterwards.

2.2. The Seller may change prices in the Store without prior notice. This does not affect orders that have already been confirmed.

2.3. Product descriptions, specifications and images are for information purposes. The manufacturer may change the contents of the set or the appearance of a product; the Buyer is informed of any significant differences when the order is confirmed.

2.4. If an ordered item turns out to be unavailable, the Seller informs the Buyer and offers an alternative, or cancels the order and refunds the amount paid.

## 3. Placing and confirming an order

3.1. Orders are placed on the Store website, in the mobile app or by phone.

3.2. After an order is placed, the Seller's operator **calls the Buyer** to confirm the items, price, delivery address and time, and the payment method.

3.3. If the Buyer cannot be reached on the phone number they provided, the Seller may cancel the order.

3.4. Orders with online payment that are not paid within the time allotted for payment may be cancelled automatically.

## 4. Payment

4.1. Payment can be made in cash on delivery, by Uzcard or Humo card via the courier's terminal, through Click or Payme, online with Uzcard and Humo cards, or by installments (subject to approval of the application).

4.2. Terms of payment by invoice for legal entities are agreed separately.

4.3. Details of the payment methods are given on the "Payment methods" page.

## 5. Delivery and acceptance of goods

5.1. Goods are delivered to the address specified by the Buyer or handed over at a pickup point. Delivery times and costs are shown on the [Delivery](/delivery) page and at checkout.

5.2. On receipt, the Buyer checks the appearance and completeness of the goods and that they match the order. The risk of accidental loss of or damage to the goods passes to the Buyer when the goods are handed over.

## 6. Cancellation

6.1. The Buyer may cancel an order free of charge before it is shipped. Orders that have been shipped are returned under the [returns rules](/returns).

6.2. The Seller may cancel an order if the item is unavailable, a technical error in the price is discovered, the Buyer cannot be reached, or the order shows signs of fraud.

6.3. Any prepayment is refunded to the original payment method.

## 7. Warranty and returns

Warranty service, returns and exchanges are carried out under the terms of the [Warranty](/warranty) and [Returns and exchanges](/returns) pages and in accordance with the legislation of the Republic of Uzbekistan on consumer rights protection.

## 8. Liability

8.1. The parties are liable for failure to perform, or improper performance of, their obligations under the Offer in accordance with the legislation of the Republic of Uzbekistan.

8.2. The Seller is not liable for damage resulting from use of the goods contrary to their manual.

8.3. The parties are released from liability for failure to perform their obligations due to force majeure.

## 9. Dispute resolution

9.1. Disputes are first resolved through negotiation. The Buyer may send a written claim using the contact details on the [Contacts](/contacts) page.

9.2. If no agreement is reached, the dispute is heard in court in accordance with the legislation of the Republic of Uzbekistan.

## 10. Final provisions

10.1. The Seller may amend the terms of the Offer unilaterally. The new version takes effect when it is published in the Store and applies to orders placed after that.

10.2. Matters not covered by the Offer are governed by the legislation of the Republic of Uzbekistan.

## Seller details

- **Seller:** ${S.legalName.en}
- **Address:** ${S.address.en}
- **Phone:** ${tel(S.phones.primary)}
- **Email:** ${mail(S.email)}
- **Website:** [${bare(S.website)}](${S.website})`,
  },
  seoTitle: {
    uz: 'Ommaviy oferta — onlayn xarid shartlari | VERO TOOLS',
    ru: 'Публичная оферта — условия покупки | VERO TOOLS',
    en: 'Public offer — terms of sale | VERO TOOLS',
  },
  seoDescription: {
    uz: "VERO TOOLS internet-do'konida buyurtma berish shartlari: narxlar, buyurtmani tasdiqlash, to'lov, yetkazib berish, bekor qilish, javobgarlik va nizolarni hal qilish.",
    ru: 'Условия заказа в интернет-магазине VERO TOOLS: цены, подтверждение заказа, оплата, доставка, отмена, ответственность и разрешение споров.',
    en: 'Terms for ordering from the VERO TOOLS online store: prices, order confirmation, payment, delivery, cancellation, liability and dispute resolution.',
  },
};

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

const payment: SeedPage = {
  slug: 'payment',
  title: { uz: "To'lov usullari", ru: 'Способы оплаты', en: 'Payment methods' },
  content: {
    uz: `Buyurtmangiz uchun o'zingizga qulay usulda to'lashingiz mumkin. To'lov usuli buyurtmani rasmiylashtirishda tanlanadi, uni operator tasdiqlash uchun qo'ng'iroq qilganda ham o'zgartirish mumkin.

## Yetkazib berishda naqd pul bilan

Tovarni tekshirib bo'lgach, buyurtma haqini kuryerga yoki olib ketish punktida naqd pulda to'laysiz. Sizga to'lovni tasdiqlovchi chek beriladi.

## Kuryer terminali orqali karta bilan

Toshkent bo'ylab yetkazib berishda Uzcard va Humo kartalari bilan kuryerning to'lov terminali orqali to'lash mumkin. Viloyatlardagi hamkor xizmatlarda terminal bo'lish-bo'lmasligini operatordan oldindan aniqlashtiring.

## Click

Buyurtmani rasmiylashtirishda «Click» usulini tanlang — siz Click to'lov sahifasiga yo'naltirilasiz. To'lovni Click ilovasi orqali yoki Uzcard/Humo kartasi ma'lumotlarini kiritib, SMS-kod bilan tasdiqlaysiz.

## Payme

«Payme» usulini tanlasangiz, Payme to'lov sahifasi ochiladi. To'lovni Payme ilovasida yoki karta ma'lumotlarini kiritib amalga oshirishingiz mumkin.

## Uzcard va Humo kartalari bilan onlayn

Uzcard va Humo kartalari bilan onlayn to'lov Click va Payme to'lov tizimlari orqali amalga oshiriladi. Karta ma'lumotlari faqat to'lov tizimining himoyalangan sahifasida kiritiladi — biz ularni ko'rmaymiz va saqlamaymiz.

Onlayn to'lov tanlangan buyurtma to'lov uchun ajratilgan vaqt ichida to'lanmasa, u avtomatik ravishda bekor qilinishi mumkin.

## Muddatli to'lov

Qimmatbaho uskunani sotib olishda to'lovni **3, 6 yoki 12 oyga** bo'lish mumkin.

**Shartlar:**

- muddatli to'lov belgilangan minimal summadan yuqori buyurtmalar uchun mavjud — bu summa buyurtmani rasmiylashtirishda ko'rsatiladi;
- har bir muddat uchun ustama va oylik to'lov miqdori ariza yuborishdan oldin ko'rsatiladi;
- muddatli to'lov ariza ko'rib chiqilib, **tasdiqlanganidan so'ng** rasmiylashtiriladi;
- ayrim hollarda **boshlang'ich to'lov** talab qilinishi mumkin.

**Odatda talab qilinadigan hujjatlar:**

- pasport yoki ID-karta;
- nomingizga ro'yxatdan o'tgan mobil telefon raqami;
- oylik to'lovlar uchun nomingizdagi Uzcard yoki Humo bank kartasi.

**Qanday rasmiylashtiriladi:**

1. Buyurtmani rasmiylashtirishda «Muddatli to'lov» usulini va muddatni tanlang.
2. Ariza ma'lumotlarini to'ldiring.
3. Operator siz bilan bog'lanib, qaror haqida xabar beradi va shartlarni tushuntiradi.
4. Shartnoma imzolangach, buyurtma yetkazib beriladi.
5. Keyingi to'lovlarni jadval bo'yicha amalga oshirasiz.

## Yuridik shaxslar uchun

Kompaniyalar va yakka tartibdagi tadbirkorlar buyurtma uchun hisob-varaq va hisob-faktura so'rashlari mumkin. Buning uchun buyurtmani rasmiylashtirishda kompaniya rekvizitlarini (nomi, STIR, bank rekvizitlari) ko'rsating yoki ularni menejerimizga yuboring. Pul o'tkazish yo'li bilan to'lash shartlari menejer bilan kelishiladi.

## Xavfsizlik

Operatorlarimiz hech qachon karta PIN-kodini yoki SMS orqali kelgan tasdiqlash kodini so'ramaydi. Bunday so'rov bo'lsa, ma'lumotlarni bermang va bizga xabar bering.`,
    ru: `Оплатить заказ можно любым удобным способом. Способ оплаты выбирается при оформлении заказа, а изменить его можно и во время звонка оператора.

## Наличными при получении

Вы оплачиваете заказ наличными курьеру или в пункте выдачи — после того как проверите товар. Вам выдадут чек, подтверждающий оплату.

## Картой через терминал курьера

При доставке по Ташкенту заказ можно оплатить картой Uzcard или Humo через платёжный терминал курьера. Наличие терминала у партнёрских служб в регионах уточняйте у оператора заранее.

## Click

Выберите «Click» при оформлении заказа — вы перейдёте на платёжную страницу Click. Оплатите заказ в приложении Click или введите данные карты Uzcard/Humo и подтвердите платёж SMS-кодом.

## Payme

При выборе «Payme» откроется платёжная страница Payme. Оплатить можно в приложении Payme или по данным карты.

## Онлайн картами Uzcard и Humo

Онлайн-оплата картами Uzcard и Humo проходит через платёжные системы Click и Payme. Данные карты вводятся только на защищённой странице платёжной системы — мы их не видим и не храним.

Если заказ с онлайн-оплатой не оплачен в отведённое время, он может быть отменён автоматически.

## Рассрочка

При покупке дорогостоящего оборудования оплату можно разделить на **3, 6 или 12 месяцев**.

**Условия:**

- рассрочка доступна для заказов от установленной минимальной суммы — она указывается при оформлении заказа;
- наценка и размер ежемесячного платежа для каждого срока показываются до отправки заявки;
- рассрочка оформляется после рассмотрения и **одобрения заявки**;
- в некоторых случаях может потребоваться **первоначальный взнос**.

**Какие документы обычно нужны:**

- паспорт или ID-карта;
- номер мобильного телефона, зарегистрированный на ваше имя;
- банковская карта Uzcard или Humo на ваше имя для ежемесячных платежей.

**Как оформить:**

1. При оформлении заказа выберите способ «Рассрочка» и срок.
2. Заполните данные заявки.
3. Оператор свяжется с вами, сообщит решение и объяснит условия.
4. После подписания договора заказ будет доставлен.
5. Дальнейшие платежи вносятся по графику.

## Для юридических лиц

Компании и индивидуальные предприниматели могут запросить счёт на оплату и счёт-фактуру. Для этого укажите реквизиты компании (название, ИНН, банковские реквизиты) при оформлении заказа или отправьте их нашему менеджеру. Условия оплаты перечислением согласовываются с менеджером.

## Безопасность

Наши операторы никогда не спрашивают ПИН-код карты или код подтверждения из SMS. Если вас об этом просят, не сообщайте данные и свяжитесь с нами.`,
    en: `You can pay for your order in whichever way suits you. Choose a payment method at checkout — you can still change it when our operator calls to confirm the order.

## Cash on delivery

Pay the courier, or pay at the pickup point, in cash once you have checked the goods. You will receive a receipt confirming the payment.

## Card via the courier's terminal

For deliveries in Tashkent you can pay with an Uzcard or Humo card using the courier's payment terminal. For regional deliveries by partner services, please check with our operator in advance whether a terminal will be available.

## Click

Choose "Click" at checkout and you will be taken to the Click payment page. Pay in the Click app, or enter your Uzcard/Humo card details and confirm the payment with an SMS code.

## Payme

If you choose "Payme", the Payme payment page opens. You can pay in the Payme app or with your card details.

## Uzcard and Humo cards online

Online payments with Uzcard and Humo cards are processed through the Click and Payme payment systems. Card details are entered only on the payment system's secure page — we never see or store them.

If an order with online payment is not paid within the allotted time, it may be cancelled automatically.

## Installments

When buying expensive equipment, you can spread the payment over **3, 6 or 12 months**.

**Conditions:**

- installments are available for orders above a set minimum amount, which is shown at checkout;
- the markup and monthly payment for each term are shown before you submit your application;
- the installment plan is arranged once your application has been reviewed and **approved**;
- in some cases a **first payment** may be requested.

**Documents usually required:**

- passport or ID card;
- a mobile phone number registered in your name;
- an Uzcard or Humo bank card in your name for the monthly payments.

**How to apply:**

1. At checkout, choose "Installments" as the payment method and select a term.
2. Fill in the application details.
3. Our operator will contact you, share the decision and explain the terms.
4. Once the agreement is signed, your order is delivered.
5. You make the remaining payments according to the schedule.

## For companies

Companies and sole proprietors can request an invoice for payment and an electronic tax invoice (hisob-faktura). Provide your company details (name, taxpayer ID (STIR) and bank details) at checkout or send them to our manager. Terms for payment by bank transfer are agreed with the manager.

## Security

Our operators will never ask for your card PIN or an SMS confirmation code. If someone asks you for them, do not share the details and let us know.`,
  },
  seoTitle: {
    uz: "To'lov usullari va muddatli to'lov | VERO TOOLS",
    ru: 'Способы оплаты и рассрочка | VERO TOOLS',
    en: 'Payment methods and installments | VERO TOOLS',
  },
  seoDescription: {
    uz: "Naqd pul, Uzcard va Humo kartalari, Click va Payme orqali to'lov hamda 3, 6 yoki 12 oyga muddatli to'lov shartlari.",
    ru: 'Оплата наличными, картами Uzcard и Humo, через Click и Payme, а также условия рассрочки на 3, 6 или 12 месяцев.',
    en: 'Pay in cash, by Uzcard or Humo card, with Click or Payme, or spread the cost over 3, 6 or 12 months with an installment plan.',
  },
};

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

const contacts: SeedPage = {
  slug: 'contacts',
  title: { uz: 'Kontaktlar', ru: 'Контакты', en: 'Contacts' },
  content: {
    uz: `Savolingiz bormi yoki asbob tanlashda yordam kerakmi? Biz bilan o'zingizga qulay usulda bog'laning — konsultantlarimiz yordam berishga tayyor.

## Telefon

- Call-markaz: ${tel(S.phones.primary)}
- Qo'shimcha raqam: ${tel(S.phones.secondary)}

Qo'ng'iroqlarni ish vaqtida qabul qilamiz (${lcFirst(S.workingHours.uz)}). Saytda va mobil ilovada buyurtmani istalgan vaqtda rasmiylashtirishingiz mumkin — operatorlar uni ish vaqtida tasdiqlaydi.

## Elektron pochta

- Umumiy savollar va hamkorlik: ${mail(S.email)}
- Buyurtmalar, kafolat va qaytarish: ${mail(S.supportEmail)}

## Shourum va ofis

- **Manzil:** ${S.address.uz}
- **Ish vaqti:** ${S.workingHours.uz}

Shourumda asboblarni jonli ko'rishingiz, konsultantdan maslahat olishingiz va buyurtmangizni olib ketishingiz mumkin.

## Olib ketish punktlari

${pickupPoints('uz')}

## Telegram va ijtimoiy tarmoqlar

- Telegram-kanal (yangiliklar va aksiyalar): [${bare(S.social.telegram)}](${S.social.telegram})
- Telegram-bot (buyurtma holati va savollar): [${handle(S.social.telegramBot)}](${S.social.telegramBot})
- Instagram: [${handle(S.social.instagram)}](${S.social.instagram})
- Facebook: [${bare(S.social.facebook)}](${S.social.facebook})
- YouTube: [${handle(S.social.youtube)}](${S.social.youtube})

## Yuridik shaxslar uchun

Korporativ buyurtmalar, hisob-varaq va hisob-fakturalar bo'yicha ${mail(S.email)} manziliga yozing — menejerimiz siz bilan bog'lanadi. ${S.legalName.uz} rekvizitlari so'rov bo'yicha taqdim etiladi.`,
    ru: `Есть вопрос или нужна помощь с выбором инструмента? Свяжитесь с нами любым удобным способом — наши консультанты с радостью помогут.

## Телефон

- Колл-центр: ${tel(S.phones.primary)}
- Дополнительный номер: ${tel(S.phones.secondary)}

Звонки принимаем в рабочее время (${S.workingHours.ru}). Оформить заказ на сайте и в мобильном приложении можно в любое время — операторы подтвердят его в рабочие часы.

## Электронная почта

- Общие вопросы и сотрудничество: ${mail(S.email)}
- Заказы, гарантия и возврат: ${mail(S.supportEmail)}

## Шоурум и офис

- **Адрес:** ${S.address.ru}
- **Время работы:** ${S.workingHours.ru}

В шоуруме можно вживую посмотреть инструмент, получить консультацию и забрать заказ.

## Пункты выдачи

${pickupPoints('ru')}

## Telegram и социальные сети

- Telegram-канал (новости и акции): [${bare(S.social.telegram)}](${S.social.telegram})
- Telegram-бот (статус заказа и вопросы): [${handle(S.social.telegramBot)}](${S.social.telegramBot})
- Instagram: [${handle(S.social.instagram)}](${S.social.instagram})
- Facebook: [${bare(S.social.facebook)}](${S.social.facebook})
- YouTube: [${handle(S.social.youtube)}](${S.social.youtube})

## Для юридических лиц

По корпоративным заказам, счетам и счетам-фактурам пишите на ${mail(S.email)} — менеджер свяжется с вами. Реквизиты ${S.legalName.ru} предоставляются по запросу.`,
    en: `Have a question or need help choosing a tool? Get in touch in whichever way suits you — our consultants are happy to help.

## Phone

- Call centre: ${tel(S.phones.primary)}
- Additional number: ${tel(S.phones.secondary)}

We take calls during business hours (${S.workingHours.en}). You can place an order on the website or in the mobile app at any time, and our operators will confirm it during business hours.

## Email

- General questions and partnerships: ${mail(S.email)}
- Orders, warranty and returns: ${mail(S.supportEmail)}

## Showroom and office

- **Address:** ${S.address.en}
- **Opening hours:** ${S.workingHours.en}

At the showroom you can see the tools in person, get advice from a consultant and collect your order.

## Pickup points

${pickupPoints('en')}

## Telegram and social media

- Telegram channel (news and offers): [${bare(S.social.telegram)}](${S.social.telegram})
- Telegram bot (order status and questions): [${handle(S.social.telegramBot)}](${S.social.telegramBot})
- Instagram: [${handle(S.social.instagram)}](${S.social.instagram})
- Facebook: [${bare(S.social.facebook)}](${S.social.facebook})
- YouTube: [${handle(S.social.youtube)}](${S.social.youtube})

## For companies

For corporate orders, invoices and tax invoices, email ${mail(S.email)} and our manager will get back to you. ${S.legalName.en} company details are available on request.`,
  },
  seoTitle: {
    uz: 'Kontaktlar — telefon, manzil va ish vaqti | VERO TOOLS',
    ru: 'Контакты — телефон, адрес и время работы | VERO TOOLS',
    en: 'Contacts — phone, address and opening hours | VERO TOOLS',
  },
  seoDescription: {
    uz: "VERO TOOLS bilan bog'lanish: telefon raqamlari, elektron pochta, Toshkentdagi shourum manzili, ish vaqti, olib ketish punktlari va ijtimoiy tarmoqlar.",
    ru: 'Как связаться с VERO TOOLS: телефоны, электронная почта, адрес шоурума в Ташкенте, время работы, пункты выдачи и социальные сети.',
    en: 'How to reach VERO TOOLS: phone numbers, email, our Tashkent showroom address, opening hours, pickup points and social media.',
  },
};

export const PAGES: SeedPage[] = [about, delivery, warranty, returns, privacy, terms, payment, contacts];

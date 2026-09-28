import type { SeedFaq } from './types';

export const FAQS: SeedFaq[] = [
  // -------------------------------------------------------------------------
  // Orders
  // -------------------------------------------------------------------------
  {
    category: 'orders',
    order: 1,
    question: {
      uz: 'Qanday qilib buyurtma beraman?',
      ru: 'Как оформить заказ?',
      en: 'How do I place an order?',
    },
    answer: {
      uz: "Kerakli mahsulotlarni savatga qo'shing, «Buyurtmani rasmiylashtirish» tugmasini bosing va yetkazib berish usuli, manzil hamda to'lov usulini tanlang. Shundan so'ng operatorimiz tafsilotlarni tasdiqlash uchun qo'ng'iroq qiladi. Buyurtmani telefon orqali ham berishingiz mumkin.",
      ru: 'Добавьте нужные товары в корзину, нажмите «Оформить заказ» и выберите способ доставки, адрес и способ оплаты. После этого оператор позвонит вам, чтобы подтвердить детали. Также заказ можно оформить по телефону.',
      en: `Add the items you need to the cart, click "Checkout" and choose the delivery method, address and payment method. Our operator will then call you to confirm the details. You can also place an order by phone.`,
    },
  },
  {
    category: 'orders',
    order: 2,
    question: {
      uz: "Buyurtma berish uchun ro'yxatdan o'tish shartmi?",
      ru: 'Нужно ли регистрироваться, чтобы сделать заказ?',
      en: 'Do I need an account to place an order?',
    },
    answer: {
      uz: "Mahsulotlarni ko'rish va savatga qo'shish uchun ro'yxatdan o'tish shart emas. Buyurtmani rasmiylashtirishda telefon raqamingiz so'raladi — buyurtma shu raqam orqali tasdiqlanadi. Shaxsiy kabinetda esa buyurtmalar holati va tarixini kuzatish hamda manzillarni saqlab qo'yish qulay.",
      ru: 'Чтобы смотреть товары и добавлять их в корзину, регистрироваться не нужно. При оформлении заказа мы попросим номер телефона — по нему заказ и подтверждается. А в личном кабинете удобно следить за статусом и историей заказов и хранить адреса доставки.',
      en: "You don't need an account to browse and add items to your cart. At checkout we ask for your phone number, which is used to confirm the order. With an account, though, it is easier to track your orders, see your order history and save delivery addresses.",
    },
  },
  {
    category: 'orders',
    order: 3,
    question: {
      uz: "Buyurtmadan keyin nega operator qo'ng'iroq qiladi?",
      ru: 'Зачем после заказа звонит оператор?',
      en: 'Why does an operator call me after I place an order?',
    },
    answer: {
      uz: "Operator buyurtma tarkibi, narxi, yetkazib berish manzili va vaqti hamda to'lov usulini tasdiqlaydi. Bu xatolarning oldini oladi, kerak bo'lsa, mos aksessuar yoki muqobil model bo'yicha maslahat berishga ham imkon beradi. Siz bilan bog'lana olmasak, buyurtma bekor qilinishi mumkin, shuning uchun telefon raqamingizni to'g'ri kiriting.",
      ru: 'Оператор подтверждает состав заказа, цену, адрес и время доставки, а также способ оплаты. Это помогает избежать ошибок, а при необходимости — подсказать подходящие аксессуары или альтернативную модель. Если до вас не удастся дозвониться, заказ может быть отменён, поэтому указывайте актуальный номер телефона.',
      en: 'The operator confirms the items, price, delivery address and time, and the payment method. This helps avoid mistakes and gives us a chance to suggest suitable accessories or an alternative model if needed. If we cannot reach you, the order may be cancelled, so please make sure your phone number is correct.',
    },
  },
  {
    category: 'orders',
    order: 4,
    question: {
      uz: 'Buyurtmamni qanday kuzatishim mumkin?',
      ru: 'Как отследить заказ?',
      en: 'How can I track my order?',
    },
    answer: {
      uz: "Shaxsiy kabinetdagi «Buyurtmalarim» bo'limida buyurtma holati real vaqtda yangilanadi: tasdiqlandi, yig'ilmoqda, jo'natildi, yetkazildi. Holat o'zgarganda bildirishnoma ham yuboramiz. Viloyatlarga jo'natilgan buyurtmalar uchun odatda hamkor kuryerlik xizmatining kuzatuv raqami beriladi. Savollar bo'lsa, buyurtma raqami bilan qo'ng'iroq qiling yoki Telegram-botimizga yozing.",
      ru: 'В разделе «Мои заказы» личного кабинета статус заказа обновляется в реальном времени: подтверждён, собирается, отправлен, доставлен. При смене статуса мы также отправляем уведомление. Для заказов в регионы обычно выдаётся трек-номер партнёрской курьерской службы. Если остались вопросы, позвоните нам, назвав номер заказа, или напишите нашему Telegram-боту.',
      en: `The order status is updated in real time under "My orders" in your account: confirmed, being packed, shipped, delivered. We also send a notification whenever the status changes. For regional orders you will usually get a tracking number from the partner courier service. If you have questions, call us with your order number or message our Telegram bot.`,
    },
  },
  {
    category: 'orders',
    order: 5,
    question: {
      uz: "Buyurtma berganimdan keyin manzil yoki tarkibini o'zgartirsam bo'ladimi?",
      ru: 'Можно ли изменить адрес или состав заказа после оформления?',
      en: 'Can I change the address or items after placing an order?',
    },
    answer: {
      uz: "Ha, buyurtma jo'natilmaguncha manzilni, yetkazib berish vaqtini va buyurtma tarkibini o'zgartirish mumkin — operatorga qo'ng'iroq qiling yoki tasdiqlash qo'ng'irog'i paytida ayting. Buyurtma jo'natilgandan keyin o'zgartirish imkoniyati kuryerlik xizmatiga bog'liq. Tarkib o'zgarsa, buyurtma summasi va yetkazib berish narxi qayta hisoblanadi.",
      ru: 'Да, пока заказ не отправлен, можно изменить адрес, время доставки и состав — позвоните оператору или скажите об этом во время звонка-подтверждения. После отправки возможность изменений зависит от курьерской службы. При изменении состава сумма заказа и стоимость доставки пересчитываются.',
      en: 'Yes. Until the order has shipped, you can change the address, delivery time and items — call our operator or mention it during the confirmation call. Once the order has shipped, whether changes are possible depends on the courier service. If the items change, the order total and delivery cost are recalculated.',
    },
  },
  {
    category: 'orders',
    order: 6,
    question: {
      uz: 'Buyurtmani qanday bekor qilaman?',
      ru: 'Как отменить заказ?',
      en: 'How do I cancel an order?',
    },
    answer: {
      uz: "Jo'natilmagan buyurtmani shaxsiy kabinetda yoki operatorga qo'ng'iroq qilib bepul bekor qilishingiz mumkin. Buyurtma oldindan to'langan bo'lsa, pul to'lov amalga oshirilgan usulning o'ziga qaytariladi. Jo'natib bo'lingan buyurtma esa qaytarish qoidalari bo'yicha rasmiylashtiriladi.",
      ru: 'Неотправленный заказ можно бесплатно отменить в личном кабинете или позвонив оператору. Если заказ был оплачен заранее, деньги вернутся тем же способом, которым вы платили. Уже отправленный заказ оформляется как возврат по общим правилам.',
      en: 'You can cancel an order free of charge before it ships, either in your account or by calling our operator. If you paid in advance, the money is refunded to the original payment method. Orders that have already shipped are handled as returns under our standard rules.',
    },
  },
  {
    category: 'orders',
    order: 7,
    question: {
      uz: "Promokodni qanday qo'llash mumkin?",
      ru: 'Как применить промокод?',
      en: 'How do I use a promo code?',
    },
    answer: {
      uz: "Savatda yoki buyurtmani rasmiylashtirish sahifasida promokodni maxsus maydonga kiriting va «Qo'llash» tugmasini bosing — chegirma darhol hisoblanadi. Har bir promokodning o'z shartlari bor: amal qilish muddati, minimal buyurtma summasi, tegishli toifa yoki brendlar. Odatda bitta buyurtmaga bitta promokod qo'llanadi.",
      ru: 'Введите промокод в специальное поле в корзине или на странице оформления заказа и нажмите «Применить» — скидка пересчитается сразу. У каждого промокода свои условия: срок действия, минимальная сумма заказа, категории или бренды, на которые он распространяется. Как правило, к одному заказу можно применить один промокод.',
      en: `Enter the code in the promo code field in the cart or at checkout and click "Apply" — the discount is calculated straight away. Each code has its own conditions: validity period, minimum order amount and the categories or brands it applies to. As a rule, one promo code can be used per order.`,
    },
  },

  // -------------------------------------------------------------------------
  // Delivery
  // -------------------------------------------------------------------------
  {
    category: 'delivery',
    order: 8,
    question: {
      uz: 'Yetkazib berish qancha vaqt oladi?',
      ru: 'Сколько времени занимает доставка?',
      en: 'How long does delivery take?',
    },
    answer: {
      uz: "Toshkent bo'ylab buyurtma odatda shu kuni yoki keyingi ish kuni yetkaziladi. Toshkent viloyatiga yetkazib berish odatda 1–2 ish kuni, boshqa viloyatlarga 2–5 ish kuni davom etadi; uzoq tumanlarga biroz ko'proq vaqt ketishi mumkin. Manzilingiz uchun taxminiy muddat buyurtmani rasmiylashtirishda ko'rsatiladi.",
      ru: 'По Ташкенту заказ обычно доставляется в тот же или на следующий рабочий день. В Ташкентскую область — как правило, за 1–2 рабочих дня, в другие регионы — за 2–5 рабочих дней; в отдалённые районы доставка может занять чуть больше времени. Ориентировочный срок для вашего адреса показывается при оформлении заказа.',
      en: 'In Tashkent, orders are usually delivered the same or the next business day. Delivery to Tashkent region typically takes 1–2 business days and to other regions 2–5 business days; remote districts may take a little longer. You will see the estimated time for your address at checkout.',
    },
  },
  {
    category: 'delivery',
    order: 9,
    question: {
      uz: 'Yetkazib berish qancha turadi? Bepul yetkazib berish bormi?',
      ru: 'Сколько стоит доставка? Есть ли бесплатная доставка?',
      en: 'How much does delivery cost? Is there free delivery?',
    },
    answer: {
      uz: "Yetkazib berish narxi hududga bog'liq va buyurtmani rasmiylashtirishda avtomatik hisoblanadi. Belgilangan summadan oshgan buyurtmalar bepul yetkaziladi — hududingiz uchun bu chegara savatda va buyurtmani rasmiylashtirish sahifasida ko'rsatiladi. Olib ketish punktidan olib ketish esa har doim bepul.",
      ru: 'Стоимость доставки зависит от региона и рассчитывается автоматически при оформлении заказа. Заказы выше установленной суммы доставляются бесплатно — порог для вашего региона указан в корзине и на странице оформления заказа. Самовывоз из пункта выдачи всегда бесплатный.',
      en: 'The delivery cost depends on your region and is calculated automatically at checkout. Orders above a set amount ship free — the threshold for your region is shown in the cart and at checkout. Collection from a pickup point is always free.',
    },
  },
  {
    category: 'delivery',
    order: 10,
    question: {
      uz: 'Tuman va qishloqlarga ham yetkazib berasizmi?',
      ru: 'Доставляете ли вы в районы и сёла?',
      en: 'Do you deliver to districts and villages?',
    },
    answer: {
      uz: "Ha, hamkor kuryerlik xizmatlari orqali O'zbekistonning barcha viloyatlariga, jumladan, tuman markazlari va qishloqlarga yetkazib beramiz. Ayrim aholi punktlarida buyurtma eshikkacha emas, hamkor xizmatning eng yaqin bo'limigacha yetkaziladi — operator bu haqda oldindan xabar beradi.",
      ru: 'Да, через партнёрские курьерские службы мы доставляем во все регионы Узбекистана, включая районные центры и сёла. В некоторые населённые пункты заказ доставляется не до двери, а до ближайшего отделения партнёрской службы — оператор предупредит об этом заранее.',
      en: 'Yes. Through our partner courier services we deliver to every region of Uzbekistan, including district centres and villages. In some localities the order is delivered to the nearest branch of the partner service rather than to your door — our operator will let you know in advance.',
    },
  },
  {
    category: 'delivery',
    order: 11,
    question: {
      uz: "Buyurtmani o'zim olib ketsam bo'ladimi?",
      ru: 'Можно ли забрать заказ самостоятельно?',
      en: 'Can I collect my order myself?',
    },
    answer: {
      uz: "Ha. Toshkent, Samarqand va Farg'onadagi olib ketish punktlarimizdan buyurtmani bepul olib ketishingiz mumkin. Buyurtmani rasmiylashtirishda «Olib ketish» usulini va o'zingizga qulay punktni tanlang. Buyurtma tayyor bo'lgach, SMS yoki qo'ng'iroq orqali xabar beramiz. Punktlarning manzillari va ish vaqti «Kontaktlar» sahifasida ko'rsatilgan.",
      ru: 'Да. Заказ можно бесплатно забрать в наших пунктах выдачи в Ташкенте, Самарканде и Фергане. При оформлении выберите способ «Самовывоз» и удобный пункт. Когда заказ будет готов, мы сообщим по SMS или звонком. Адреса и время работы пунктов указаны на странице «Контакты».',
      en: `Yes. You can collect your order free of charge from our pickup points in Tashkent, Samarkand and Fergana. At checkout, choose "Pickup" and the point that suits you. We will let you know by SMS or phone when the order is ready. Addresses and opening hours are listed on the Contacts page.`,
    },
  },
  {
    category: 'delivery',
    order: 12,
    question: {
      uz: "Tovarni qabul qilishda tekshirsam bo'ladimi?",
      ru: 'Можно ли проверить товар при получении?',
      en: 'Can I inspect the item when it is delivered?',
    },
    answer: {
      uz: "Albatta. Kuryer ishtirokida qadoq butunligini, tovarning tashqi ko'rinishini, to'liq jamlanganligini (akkumulyator, zaryadlovchi, aksessuarlar, hujjatlar) va buyurtmaga mosligini tekshiring. Nuqson yoki kamchilik aniqlansa, tovarni qabul qilmaslikka haqlisiz — biz almashtirish yoki qayta yetkazib berishni tashkil qilamiz.",
      ru: 'Конечно. В присутствии курьера проверьте целостность упаковки, внешний вид товара, комплектность (аккумуляторы, зарядное устройство, аксессуары, документы) и соответствие заказу. Если вы обнаружили дефект или недокомплект, вы вправе не принимать товар — мы организуем замену или повторную доставку.',
      en: "Of course. In the courier's presence, check that the packaging is intact, the item looks undamaged, the set is complete (batteries, charger, accessories, documents) and it matches your order. If you find a defect or something is missing, you can refuse the item — we will arrange a replacement or a new delivery.",
    },
  },
  {
    category: 'delivery',
    order: 13,
    question: {
      uz: "Og'ir va katta hajmli tovarlar qanday yetkaziladi?",
      ru: 'Как доставляются тяжёлые и крупногабаритные товары?',
      en: 'How are heavy and bulky items delivered?',
    },
    answer: {
      uz: "Generatorlar, kompressorlar, beton qorgichlar va dastgohlar kabi tovarlar yuk avtomobilida yetkaziladi. Operator siz bilan yetkazib berish vaqti, kirish yo'li va tushirish shartlarini oldindan kelishib oladi. Tovarni qavatga ko'tarish kerak bo'lsa, buni buyurtmani tasdiqlashda ayting.",
      ru: 'Генераторы, компрессоры, бетономешалки, станки и другие подобные товары доставляются грузовым транспортом. Оператор заранее согласует с вами время доставки, подъезд и условия разгрузки. Если товар нужно поднять на этаж, сообщите об этом при подтверждении заказа.',
      en: 'Items such as generators, compressors, concrete mixers and machine tools are delivered by truck. Our operator will agree the delivery time, access and unloading arrangements with you in advance. If the item needs to be carried upstairs, mention it when the order is confirmed.',
    },
  },

  // -------------------------------------------------------------------------
  // Payment
  // -------------------------------------------------------------------------
  {
    category: 'payment',
    order: 14,
    question: {
      uz: "Qanday to'lov usullari mavjud?",
      ru: 'Какие способы оплаты доступны?',
      en: 'What payment methods are available?',
    },
    answer: {
      uz: "Quyidagi usullarda to'lash mumkin: yetkazib berishda naqd pul bilan, kuryer terminali orqali Uzcard yoki Humo kartasi bilan, Click va Payme orqali, Uzcard va Humo kartalari bilan onlayn (Click yoki Payme orqali), shuningdek, 3, 6 yoki 12 oyga muddatli to'lov bilan. Viloyatlarga yetkazib berishda karta bilan to'lash imkoniyatini operatordan aniqlashtiring.",
      ru: 'Оплатить заказ можно наличными при получении, картой Uzcard или Humo через терминал курьера, через Click и Payme, картами Uzcard и Humo онлайн (через Click или Payme), а также в рассрочку на 3, 6 или 12 месяцев. При доставке в регионы возможность оплаты картой уточняйте у оператора.',
      en: "You can pay in cash on delivery, by Uzcard or Humo card via the courier's terminal, with Click or Payme, online with Uzcard and Humo cards (through Click or Payme), or in installments over 3, 6 or 12 months. For regional deliveries, please check with our operator whether card payment on delivery is available.",
    },
  },
  {
    category: 'payment',
    order: 15,
    question: {
      uz: "Muddatli to'lov qanday ishlaydi?",
      ru: 'Как работает рассрочка?',
      en: 'How do installment plans work?',
    },
    answer: {
      uz: "Buyurtmani rasmiylashtirishda «Muddatli to'lov» usulini va muddatni — 3, 6 yoki 12 oy — tanlang. Har bir muddat uchun ustama va oylik to'lov miqdori oldindan ko'rsatiladi. Ariza ko'rib chiqiladi va tasdiqlangandan so'ng shartnoma rasmiylashtiriladi. Odatda pasport yoki ID-karta, nomingizga ro'yxatdan o'tgan telefon raqami va Uzcard/Humo kartasi talab qilinadi; ayrim hollarda boshlang'ich to'lov so'ralishi mumkin. Muddatli to'lov belgilangan minimal summadan yuqori buyurtmalar uchun mavjud.",
      ru: 'При оформлении заказа выберите способ «Рассрочка» и срок — 3, 6 или 12 месяцев. Наценка и размер ежемесячного платежа для каждого срока показываются заранее. Заявка рассматривается, и после одобрения оформляется договор. Обычно нужны паспорт или ID-карта, номер телефона, оформленный на вас, и карта Uzcard/Humo; в некоторых случаях может потребоваться первоначальный взнос. Рассрочка доступна для заказов от установленной минимальной суммы.',
      en: `At checkout, choose "Installments" and a term of 3, 6 or 12 months. The markup and monthly payment for each term are shown upfront. Your application is reviewed, and once it is approved an agreement is drawn up. You will usually need a passport or ID card, a phone number registered in your name and an Uzcard/Humo card; in some cases a first payment may be requested. Installments are available for orders above a set minimum amount.`,
    },
  },
  {
    category: 'payment',
    order: 16,
    question: {
      uz: "Onlayn to'lov xavfsizmi?",
      ru: 'Безопасна ли онлайн-оплата?',
      en: 'Is online payment secure?',
    },
    answer: {
      uz: "Ha. Onlayn to'lov Click va Payme to'lov tizimlarining himoyalangan sahifalarida amalga oshiriladi va SMS-kod bilan tasdiqlanadi. Karta ma'lumotlari bizga uzatilmaydi va bizda saqlanmaydi. Operatorlarimiz hech qachon PIN-kod yoki SMS-kodni so'ramaydi.",
      ru: 'Да. Онлайн-оплата проходит на защищённых страницах платёжных систем Click и Payme и подтверждается SMS-кодом. Данные карты нам не передаются и у нас не хранятся. Наши операторы никогда не спрашивают ПИН-код или код из SMS.',
      en: 'Yes. Online payments are made on the secure pages of the Click and Payme payment systems and confirmed with an SMS code. Your card details are never passed to us or stored by us. Our operators will never ask for your PIN or SMS code.',
    },
  },
  {
    category: 'payment',
    order: 17,
    question: {
      uz: 'Kompaniyalar uchun hisob-faktura beriladimi?',
      ru: 'Выдаёте ли вы счёт-фактуру для компаний?',
      en: 'Do you issue invoices for companies?',
    },
    answer: {
      uz: "Ha, yuridik shaxslar va yakka tartibdagi tadbirkorlar hisob-varaq va hisob-faktura so'rashlari mumkin. Buyurtma berishda kompaniya nomi, STIR va bank rekvizitlarini ko'rsating yoki ularni menejerimizga yuboring. Pul o'tkazish yo'li bilan to'lash shartlari menejer bilan kelishiladi; tovarni qabul qilishda ishonchnoma talab qilinishi mumkin.",
      ru: 'Да, юридические лица и индивидуальные предприниматели могут запросить счёт на оплату и счёт-фактуру. При оформлении заказа или в письме менеджеру укажите название компании, ИНН и банковские реквизиты. Условия оплаты перечислением согласовываются с менеджером; при получении товара может потребоваться доверенность.',
      en: 'Yes. Legal entities and sole proprietors can request an invoice for payment and an electronic tax invoice (hisob-faktura). Send us the company name, taxpayer ID (STIR) and bank details at checkout or by email to our manager. Terms for payment by bank transfer are agreed with the manager, and a power of attorney may be required when receiving the goods.',
    },
  },
  {
    category: 'payment',
    order: 18,
    question: {
      uz: "Kartadan pul yechildi, lekin buyurtma to'lanmagan deb ko'rsatilmoqda. Nima qilish kerak?",
      ru: 'Деньги списались, а заказ отображается как неоплаченный. Что делать?',
      en: 'Money was debited from my card, but the order still shows as unpaid. What should I do?',
    },
    answer: {
      uz: "Ba'zan to'lov tizimidan tasdiq bir necha daqiqa kechikib keladi — sahifani biroz vaqtdan keyin yangilang. Holat o'zgarmasa, buyurtma raqami va to'lov chekining skrinshoti bilan qo'llab-quvvatlash xizmatiga murojaat qiling. To'lovni tekshirib, buyurtmani to'langan deb belgilaymiz yoki mablag'ni kartangizga qaytaramiz.",
      ru: 'Иногда подтверждение от платёжной системы приходит с задержкой в несколько минут — обновите страницу чуть позже. Если статус не изменился, напишите в службу поддержки, указав номер заказа и приложив скриншот чека об оплате. Мы проверим платёж и отметим заказ как оплаченный или вернём деньги на карту.',
      en: "Sometimes confirmation from the payment system arrives a few minutes late, so refresh the page after a short while. If the status still hasn't changed, contact our support team with your order number and a screenshot of the payment receipt. We will check the payment and either mark the order as paid or refund the money to your card.",
    },
  },

  // -------------------------------------------------------------------------
  // Warranty & returns
  // -------------------------------------------------------------------------
  {
    category: 'warranty',
    order: 19,
    question: {
      uz: 'Mahsulotlarga qanday kafolat beriladi?',
      ru: 'Какая гарантия на товары?',
      en: 'What warranty do your products have?',
    },
    answer: {
      uz: "Barcha mahsulotlarga ishlab chiqaruvchining rasmiy kafolati beriladi. Kafolat muddati tovar turi va brendga bog'liq bo'lib, har bir mahsulot sahifasida ko'rsatilgan. Kafolat tovar sizga topshirilgan kundan boshlab amal qiladi.",
      ru: 'На все товары действует официальная гарантия производителя. Её срок зависит от типа товара и бренда и указан на странице каждого товара. Гарантия действует со дня передачи товара покупателю.',
      en: "All products come with the manufacturer's official warranty. The period depends on the product type and brand and is shown on each product page. The warranty starts on the day the item is handed over to you.",
    },
  },
  {
    category: 'warranty',
    order: 20,
    question: {
      uz: 'Kafolat davrida asbob buzilsa, nima qilishim kerak?',
      ru: 'Что делать, если инструмент сломался во время гарантии?',
      en: 'What should I do if a tool breaks during the warranty period?',
    },
    answer: {
      uz: "Asbobdan foydalanishni to'xtating va qo'llab-quvvatlash xizmatiga murojaat qiling: buyurtma raqamini ayting va nosozlikni tasvirlab bering, imkon bo'lsa, rasm yoki video yuboring. So'ngra tovarni chek va kafolat taloni bilan olib ketish punktiga yoki servis markaziga topshirasiz. Servis markazi diagnostika o'tkazadi; holat kafolatga kirsa, tovar bepul ta'mirlanadi yoki qonunchilikka muvofiq almashtiriladi.",
      ru: 'Прекратите пользоваться инструментом и обратитесь в службу поддержки: назовите номер заказа и опишите неисправность, по возможности приложите фото или видео. Затем передайте товар с чеком и гарантийным талоном в пункт выдачи или сервисный центр. Сервисный центр проведёт диагностику; если случай гарантийный, товар бесплатно отремонтируют или заменят в соответствии с законодательством.',
      en: 'Stop using the tool and contact our support team: give your order number and describe the fault, with photos or a video if possible. Then hand the item over with the receipt and warranty card at a pickup point or service centre. The service centre runs diagnostics, and if the fault is covered, the item is repaired free of charge or replaced in accordance with the law.',
    },
  },
  {
    category: 'warranty',
    order: 21,
    question: {
      uz: 'Kafolat qanday holatlarga tatbiq etilmaydi?',
      ru: 'В каких случаях гарантия не действует?',
      en: 'What does the warranty not cover?',
    },
    answer: {
      uz: "Kafolat mexanik shikastlanishlar, yo'riqnomaga zid foydalanish va ortiqcha yuklama, noto'g'ri kuchlanish yoki sifatsiz yoqilg'i ishlatish, shuningdek, vakolatsiz shaxslar tomonidan ta'mirlash oqibatlariga tatbiq etilmaydi. Tabiiy eskiradigan qismlar (ko'mir cho'tkalar, tasmalar, zichlagichlar) va sarf materiallari (disklar, parmalar, arra disklari, elektrodlar, trimmer iplari) ham kafolatga kirmaydi. To'liq ro'yxat «Kafolat» sahifasida.",
      ru: 'Гарантия не распространяется на механические повреждения, эксплуатацию с нарушением инструкции и перегрузку, подключение к неподходящему напряжению или использование некачественного топлива, а также на последствия ремонта неуполномоченными лицами. Кроме того, в гарантию не входят быстроизнашивающиеся детали (угольные щётки, ремни, уплотнители) и расходные материалы (диски, свёрла, пильные диски, электроды, леска для триммера). Полный список — на странице «Гарантия».',
      en: 'The warranty does not cover mechanical damage, use contrary to the manual or overloading, connection to the wrong voltage or use of poor-quality fuel, or the consequences of repairs by unauthorised persons. Wear parts (carbon brushes, belts, seals) and consumables (discs, drill bits, saw blades, electrodes, trimmer line) are not covered either. The full list is on the Warranty page.',
    },
  },
  {
    category: 'warranty',
    order: 22,
    question: {
      uz: "Kafolat tugagach, asbobni qayerda ta'mirlash mumkin?",
      ru: 'Где отремонтировать инструмент после окончания гарантии?',
      en: 'Where can I get a tool repaired after the warranty expires?',
    },
    answer: {
      uz: "Bizga murojaat qiling — tovarni pullik ta'mirlash uchun servis markaziga yo'naltirishda yordam beramiz, ta'mirlash narxi esa oldindan kelishiladi. Ko'plab ehtiyot qismlar va sarf materiallari (ko'mir cho'tkalar, patronlar, disklar va boshqalar) katalogimizning «Ehtiyot qismlar» va «Sarf materiallari» bo'limlarida mavjud.",
      ru: 'Обратитесь к нам — мы поможем направить товар на платный ремонт в сервисный центр, а стоимость ремонта согласуем заранее. Многие запчасти и расходные материалы (угольные щётки, патроны, диски и другое) есть в разделах каталога «Запчасти» и «Расходные материалы».',
      en: 'Contact us and we will help you send the item to a service centre for a paid repair, with the cost agreed in advance. Many spare parts and consumables — carbon brushes, chucks, discs and more — are available in the Spare parts and Consumables sections of our catalogue.',
    },
  },
  {
    category: 'warranty',
    order: 23,
    question: {
      uz: "Mos kelmagan tovarni qaytarsam bo'ladimi?",
      ru: 'Можно ли вернуть товар, если он не подошёл?',
      en: "Can I return an item that doesn't suit me?",
    },
    answer: {
      uz: "Ha. Foydalanilmagan tovarni qabul qilgan kundan boshlab 14 kun ichida original qadog'ida, to'liq jamlanmasi va xarid hujjati bilan qaytarish yoki almashtirish mumkin. Pul to'lov amalga oshirilgan usulning o'ziga qaytariladi. Batafsil shartlar «Qaytarish va almashtirish» sahifasida.",
      ru: 'Да. Неиспользованный товар можно вернуть или обменять в течение 14 дней со дня получения — в оригинальной упаковке, в полной комплектации и с документом о покупке. Деньги возвращаются тем же способом, которым вы платили. Подробные условия — на странице «Возврат и обмен».',
      en: 'Yes. You can return or exchange an unused item within 14 days of receiving it, in its original packaging, complete and with proof of purchase. The refund goes back to your original payment method. See the Returns and exchanges page for full details.',
    },
  },

  // -------------------------------------------------------------------------
  // Account
  // -------------------------------------------------------------------------
  {
    category: 'account',
    order: 24,
    question: {
      uz: "Qanday ro'yxatdan o'tish yoki hisobga kirish mumkin?",
      ru: 'Как зарегистрироваться или войти в аккаунт?',
      en: 'How do I sign up or log in?',
    },
    answer: {
      uz: "Sayt yoki ilovaning yuqori qismidagi «Kirish» tugmasini bosing, telefon raqamingizni kiriting va ekrandagi ko'rsatmalarga amal qiling. Sayt va mobil ilova uchun hisob bitta: savat, sevimlilar va buyurtmalar barcha qurilmalaringizda sinxronlanadi.",
      ru: 'Нажмите «Войти» в верхней части сайта или приложения, введите номер телефона и следуйте подсказкам на экране. Аккаунт один для сайта и мобильного приложения: корзина, избранное и заказы синхронизируются на всех ваших устройствах.',
      en: `Tap "Log in" at the top of the website or app, enter your phone number and follow the on-screen steps. One account works on both the website and the mobile app, and your cart, wishlist and orders are synced across all your devices.`,
    },
  },
  {
    category: 'account',
    order: 25,
    question: {
      uz: "Shaxsiy ma'lumotlar va yetkazib berish manzillarini qanday o'zgartiraman?",
      ru: 'Как изменить личные данные и адреса доставки?',
      en: 'How do I update my personal details and delivery addresses?',
    },
    answer: {
      uz: "Shaxsiy kabinetning «Profil» bo'limida ism, elektron pochta va tilni o'zgartirishingiz, «Manzillar» bo'limida esa yetkazib berish manzillarini qo'shish, tahrirlash va o'chirishingiz mumkin. Bir nechta manzilni saqlab, ulardan birini asosiy qilib belgilang — buyurtma berishda u avtomatik tanlanadi.",
      ru: 'В личном кабинете в разделе «Профиль» можно изменить имя, email и язык, а в разделе «Адреса» — добавить, отредактировать или удалить адреса доставки. Сохраните несколько адресов и отметьте один как основной — он будет подставляться при оформлении заказа автоматически.',
      en: `In your account, go to "Profile" to change your name, email and language, and to "Addresses" to add, edit or delete delivery addresses. You can save several addresses and mark one as the default — it will be selected automatically at checkout.`,
    },
  },
  {
    category: 'account',
    order: 26,
    question: {
      uz: '«Sevimlilar» va «Taqqoslash» nima uchun kerak?',
      ru: 'Для чего нужны «Избранное» и «Сравнение»?',
      en: 'What are the Wishlist and Compare features for?',
    },
    answer: {
      uz: "«Sevimlilar»ga yoqqan mahsulotlarni saqlab, keyinroq ularga qaytishingiz mumkin. «Taqqoslash» esa 6 tagacha mahsulotning xususiyatlarini — quvvat, kuchlanish, og'irlik va boshqalarni — bitta jadvalda solishtirishga yordam beradi. Bu, ayniqsa, generator, kompressor yoki nasos tanlashda qulay.",
      ru: 'В «Избранное» можно сохранить понравившиеся товары и вернуться к ним позже. «Сравнение» помогает сопоставить характеристики до 6 товаров — мощность, напряжение, вес и другие — в одной таблице. Это особенно удобно при выборе генератора, компрессора или насоса.',
      en: 'Use the Wishlist to save products you like and come back to them later. Compare lets you put the specifications of up to 6 products — power, voltage, weight and more — side by side in one table, which is especially handy when choosing a generator, compressor or pump.',
    },
  },
  {
    category: 'account',
    order: 27,
    question: {
      uz: "Bildirishnomalardan qanday voz kechish yoki hisobni o'chirish mumkin?",
      ru: 'Как отказаться от уведомлений или удалить аккаунт?',
      en: 'How can I turn off notifications or delete my account?',
    },
    answer: {
      uz: "Reklama xabarlarini shaxsiy kabinetdagi bildirishnoma sozlamalarida o'chirib qo'yishingiz mumkin; buyurtma holati haqidagi xabarlar esa yetkazib berishni kuzatib borishingiz uchun yuborilaveradi. Hisob va shaxsga doir ma'lumotlarni o'chirish uchun qo'llab-quvvatlash xizmatiga murojaat qiling. Qonunchilikka ko'ra saqlanishi shart bo'lgan buyurtma ma'lumotlari belgilangan muddat davomida saqlanadi.",
      ru: 'Рекламные уведомления можно отключить в настройках уведомлений в личном кабинете; сообщения о статусе заказов продолжат приходить, чтобы вы могли следить за доставкой. Чтобы удалить аккаунт и персональные данные, обратитесь в службу поддержки. Сведения о заказах, которые мы обязаны хранить по закону, хранятся в течение установленного срока.',
      en: 'You can switch off marketing notifications in the notification settings of your account; order status messages are still sent so you can follow your delivery. To delete your account and personal data, contact our support team. Order records that we are legally required to keep are retained for the prescribed period.',
    },
  },

  // -------------------------------------------------------------------------
  // General
  // -------------------------------------------------------------------------
  {
    category: 'general',
    order: 28,
    question: {
      uz: 'Mahsulotlar originalmi?',
      ru: 'Продаёте ли вы оригинальную продукцию?',
      en: 'Are your products genuine?',
    },
    answer: {
      uz: "Ha. Mahsulotlarni faqat vakolatli yetkazib beruvchilar va rasmiy distribyutorlardan olamiz. Har bir tovar ishlab chiqaruvchining kafolati va zarur hujjatlar bilan sotiladi. Muayyan tovar haqida savolingiz bo'lsa, konsultantlarimiz batafsil ma'lumot beradi.",
      ru: 'Да. Мы закупаем товары только у авторизованных поставщиков и официальных дистрибьюторов. Каждый товар продаётся с гарантией производителя и необходимыми документами. Если у вас есть вопросы о конкретном товаре, наши консультанты всё подробно расскажут.',
      en: "Yes. We source products only from authorised suppliers and official distributors. Every item is sold with the manufacturer's warranty and the necessary documents. If you have questions about a particular product, our consultants will be happy to give you the details.",
    },
  },
  {
    category: 'general',
    order: 29,
    question: {
      uz: "Sotib olishdan oldin maslahat olsam bo'ladimi? Shourumingiz bormi?",
      ru: 'Можно ли получить консультацию перед покупкой? Есть ли у вас шоурум?',
      en: 'Can I get advice before buying? Do you have a showroom?',
    },
    answer: {
      uz: "Ha. Konsultantlarimiz telefon va Telegram orqali ish turingiz, yuklama va byudjetingizga mos asbobni tanlashga yordam beradi. Toshkentdagi shourumimizda esa asboblarni jonli ko'rib, qo'lda ushlab ko'rishingiz mumkin. Manzil va ish vaqti «Kontaktlar» sahifasida.",
      ru: 'Да. Наши консультанты по телефону и в Telegram помогут подобрать инструмент под ваш тип работ, нагрузку и бюджет. А в нашем шоуруме в Ташкенте инструмент можно посмотреть вживую и подержать в руках. Адрес и время работы — на странице «Контакты».',
      en: 'Yes. Our consultants can help you choose a tool for your type of work, workload and budget by phone or on Telegram. You can also see the tools in person and try them in your hand at our showroom in Tashkent. The address and opening hours are on the Contacts page.',
    },
  },
  {
    category: 'general',
    order: 30,
    question: {
      uz: 'Generator quvvatini qanday tanlash kerak?',
      ru: 'Как выбрать мощность генератора?',
      en: 'How do I choose the right generator power?',
    },
    answer: {
      uz: "Bir vaqtda ishlatiladigan barcha jihozlarning quvvatini qo'shing. Elektr dvigatelli jihozlar (muzlatgich, nasos, kompressor, konditsioner) ishga tushishda nominal quvvatidan 2–3 baravar ko'p quvvat talab qilishi mumkin — buni ham hisobga oling. Olingan summaga 20–30% zaxira qo'shing. Kompyuter, televizor va gaz qozoni avtomatikasi kabi sezgir elektronika uchun invertorli generator tanlagan ma'qul. Hisob-kitobda konsultantlarimiz yordam beradi.",
      ru: 'Сложите мощность всех приборов, которые будут работать одновременно. Техника с электродвигателем (холодильник, насос, компрессор, кондиционер) при запуске может потреблять в 2–3 раза больше номинальной мощности — учтите это. К полученной сумме добавьте запас 20–30%. Для чувствительной электроники — компьютеров, телевизоров, автоматики газового котла — лучше выбрать инверторный генератор. Наши консультанты помогут с расчётом.',
      en: 'Add up the power of all the appliances that will run at the same time. Anything with an electric motor (fridge, pump, compressor, air conditioner) can draw 2–3 times its rated power when starting, so factor that in. Then add a 20–30% reserve. For sensitive electronics such as computers, TVs and gas boiler controls, an inverter generator is the better choice. Our consultants will gladly help with the calculation.',
    },
  },
];

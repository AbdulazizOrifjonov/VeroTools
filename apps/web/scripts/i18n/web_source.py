# Storefront texts (namespace "web"). Order of values: (uz, ru, en).
# Reuse the shared namespaces (common, shop, validation, errors) whenever a key fits — only
# storefront-specific texts live here. Build: python3 apps/web/scripts/i18n/build.py


def P(uz, ru, en):
    return {'__plural__': True, 'uz': uz, 'ru': ru, 'en': en}


def same(text_uz, text_ru, text_en):
    """Plural entry whose wording does not change with the number (uz/ru abbreviations)."""
    return P({'one': text_uz, 'other': text_uz}, {'one': text_ru, 'few': text_ru, 'many': text_ru, 'other': text_ru}, text_en)


WEB = {
    # ------------------------------------------------------------------ header / layout
    "header.allInCategory": ("Barcha mahsulotlar ({{count}})", "Все товары ({{count}})", "All products ({{count}})"),
    "header.noSubcategories": ("Bu bo'limda ichki kategoriyalar yo'q", "В этом разделе нет подкатегорий", "This section has no subcategories"),
    "header.unread": P(
        {"one": "{{count}} ta o'qilmagan bildirishnoma", "other": "{{count}} ta o'qilmagan bildirishnoma"},
        {"one": "{{count}} непрочитанное уведомление", "few": "{{count}} непрочитанных уведомления", "many": "{{count}} непрочитанных уведомлений", "other": "{{count}} непрочитанного уведомления"},
        {"one": "{{count}} unread notification", "other": "{{count}} unread notifications"},
    ),
    "header.infoNavigation": ("Xaridorlar uchun ma'lumot", "Информация для покупателей", "Customer information"),
    "header.userNavigation": ("Xaridor menyusi", "Меню покупателя", "Customer menu"),
    "header.tabBar": ("Tezkor navigatsiya", "Быстрая навигация", "Quick navigation"),

    # ------------------------------------------------------------------ misc
    "countdown.readable": (
        "{{days}} kun {{hours}} soat {{minutes}} daqiqa qoldi",
        "Осталось {{days}} дн. {{hours}} ч {{minutes}} мин",
        "{{days}} d {{hours}} h {{minutes}} min left",
    ),
    "countdown.d": ("kun", "дн", "days"),
    "countdown.h": ("soat", "ч", "hrs"),
    "countdown.m": ("daq", "мин", "min"),
    "countdown.s": ("sek", "сек", "sec"),
    "countdown.daysShort": same("{{count}} kun", "{{count}} дн.", {"one": "{{count}} day", "other": "{{count}} days"}),
    "search.allResultsFor": ("«{{query}}» bo'yicha barcha natijalar", "Все результаты по запросу «{{query}}»", "All results for “{{query}}”"),
    "realtime.orderStatus": ("Buyurtma № {{number}} holati: {{status}}", "Статус заказа № {{number}}: {{status}}", "Order #{{number}} is now {{status}}"),
    "errorPage.title": ("Sahifani ochib bo'lmadi", "Не удалось открыть страницу", "This page could not be displayed"),
    "errorPage.text": (
        "Kutilmagan xatolik yuz berdi. Sahifani yangilab ko'ring — muammo takrorlansa, biz bilan bog'laning.",
        "Произошла непредвиденная ошибка. Обновите страницу — если проблема повторится, свяжитесь с нами.",
        "An unexpected error occurred. Reload the page — if it happens again, please contact us.",
    ),
    "errorPage.updatedTitle": ("Sayt yangilandi", "Сайт обновился", "The site has been updated"),
    "errorPage.updatedText": (
        "Saytning yangi versiyasi chiqdi. Davom etish uchun sahifani yangilang.",
        "Вышла новая версия сайта. Обновите страницу, чтобы продолжить.",
        "A new version of the site is available. Reload the page to continue.",
    ),
    "errorPage.reload": ("Sahifani yangilash", "Обновить страницу", "Reload page"),
    "notFound.popularCategories": ("Ommabop kategoriyalar", "Популярные категории", "Popular categories"),

    # ------------------------------------------------------------------ product card / cart actions
    "productCard.chooseOption": ("Variantni tanlash", "Выбрать вариант", "Choose option"),
    "cartActions.onlyAvailable": same("Omborda faqat {{count}} dona bor", "На складе только {{count}} шт.", {"one": "Only {{count}} item left in stock", "other": "Only {{count}} items left in stock"}),

    # ------------------------------------------------------------------ home
    "home.heroLabel": ("Aksiyalar va takliflar", "Акции и предложения", "Offers and promotions"),
    "home.slideOf": ("{{total}} tadan {{index}}-slayd", "Слайд {{index}} из {{total}}", "Slide {{index}} of {{total}}"),
    "home.playSlides": ("Slaydlarni ijro etish", "Запустить показ слайдов", "Play slideshow"),
    "home.pauseSlides": ("Slaydlarni to'xtatish", "Остановить показ слайдов", "Pause slideshow"),
    "home.featured": ("Tanlangan mahsulotlar", "Выбор VERO TOOLS", "Top picks"),

    # ------------------------------------------------------------------ promotions
    "promotions.startsOn": ("{{date}} dan boshlanadi", "Начнётся {{date}}", "Starts {{date}}"),

    # ------------------------------------------------------------------ catalog / listing
    "catalogPage.description": (
        "Elektr va qo'l asboblari, generatorlar, kompressorlar, nasoslar va boshqa uskunalar katalogi.",
        "Каталог электро- и ручного инструмента, генераторов, компрессоров, насосов и другого оборудования.",
        "Catalogue of power and hand tools, generators, compressors, pumps and other equipment.",
    ),
    "listing.view": ("Ko'rinish", "Вид", "View"),
    "listing.results": ("Mahsulotlar", "Товары", "Products"),
    "listing.filtersHint": ("Filtrlarni tanlang va natijalarni ko'ring", "Выберите фильтры и посмотрите результаты", "Choose filters and see the results"),
    "listing.showProducts": P(
        {"one": "{{count}} ta mahsulotni ko'rsatish", "other": "{{count}} ta mahsulotni ko'rsatish"},
        {"one": "Показать {{count}} товар", "few": "Показать {{count}} товара", "many": "Показать {{count}} товаров", "other": "Показать {{count}} товара"},
        {"one": "Show {{count}} product", "other": "Show {{count}} products"},
    ),

    # ------------------------------------------------------------------ product page
    "product.sections": ("Mahsulot bo'limlari", "Разделы товара", "Product sections"),
    "product.questionsCount": P(
        {"one": "{{count}} ta savol", "other": "{{count}} ta savol"},
        {"one": "{{count}} вопрос", "few": "{{count}} вопроса", "many": "{{count}} вопросов", "other": "{{count}} вопроса"},
        {"one": "{{count}} question", "other": "{{count}} questions"},
    ),
    "product.inCart": same("Savatda: {{count}} dona", "В корзине: {{count}} шт.", {"one": "In cart: {{count}} pc", "other": "In cart: {{count}} pcs"}),
    "product.allInCart": (
        "Mavjud miqdorning barchasi allaqachon savatingizda.",
        "Всё доступное количество уже в вашей корзине.",
        "The whole available quantity is already in your cart.",
    ),
    "product.saveOrCompare": ("Saqlash yoki taqqoslash", "Сохранить или сравнить", "Save or compare"),
    "product.galleryHint": (
        "Rasmlarni almashtirish uchun strelkalardan foydalaning, kattalashtirish uchun rasmni bosing.",
        "Листайте фото стрелками, нажмите на фото, чтобы увеличить.",
        "Use the arrow keys to switch photos, click a photo to zoom.",
    ),
    "product.zoomOut": ("Kichiklashtirish", "Уменьшить", "Zoom out"),
    "product.deliveryTo": ("Yetkazib berish hududi", "Регион доставки", "Delivery region"),
    "product.deliveryWindow": ("Taxminan {{from}} – {{to}}", "Ориентировочно {{from}} – {{to}}", "Estimated {{from}} – {{to}}"),
    "product.freeFrom": ("{{amount}} dan ortiq buyurtmalarga bepul", "Бесплатно при заказе от {{amount}}", "Free for orders over {{amount}}"),
    "product.pickupPoints": P(
        {"one": "{{count}} ta olib ketish punkti", "other": "{{count}} ta olib ketish punkti"},
        {"one": "{{count}} пункт самовывоза", "few": "{{count}} пункта самовывоза", "many": "{{count}} пунктов самовывоза", "other": "{{count}} пункта самовывоза"},
        {"one": "{{count}} pickup point", "other": "{{count}} pickup points"},
    ),
    "product.filterByStars": (
        "{{count}} yulduzli sharhlarni ko'rsatish ({{reviews}})",
        "Показать отзывы с оценкой {{count}} ({{reviews}})",
        "Show {{count}}-star reviews ({{reviews}})",
    ),
    "specGroup.main": ("Asosiy xususiyatlar", "Основные характеристики", "Key specifications"),
    "specGroup.power": ("Quvvat va energiya", "Питание и мощность", "Power"),
    "specGroup.performance": ("Unumdorlik", "Производительность", "Performance"),
    "specGroup.dimensions": ("O'lchamlar va vazn", "Размеры и вес", "Dimensions and weight"),
    "specGroup.equipment": ("Jihozlanishi", "Комплектация и функции", "Features and equipment"),
    "specGroup.general": ("Umumiy ma'lumotlar", "Общие сведения", "General"),
    "specGroup.overview": ("Asosiy ko'rsatkichlar", "Обзор", "Overview"),

    # ------------------------------------------------------------------ cart
    "cart.moveToWishlist": ("Sevimlilarga o'tkazish", "Перенести в избранное", "Move to wishlist"),
    "cart.movedToWishlist": ("Mahsulot sevimlilarga o'tkazildi", "Товар перенесён в избранное", "Moved to your wishlist"),
    "cart.freeDeliveryProgress": ("Bepul yetkazib berishgacha", "До бесплатной доставки", "Progress to free delivery"),
    "cart.freeDeliveryNote": (
        "Toshkent bo'ylab kuryerlik yetkazib berish uchun. Boshqa hududlar uchun narx rasmiylashtirishda hisoblanadi.",
        "Для курьерской доставки по Ташкенту. Для других регионов стоимость рассчитывается при оформлении.",
        "For courier delivery within Tashkent. For other regions the cost is calculated at checkout.",
    ),

    # ------------------------------------------------------------------ checkout
    "checkout.moreItems": P(
        {"one": "va yana {{count}} ta mahsulot", "other": "va yana {{count}} ta mahsulot"},
        {"one": "и ещё {{count}} товар", "few": "и ещё {{count}} товара", "many": "и ещё {{count}} товаров", "other": "и ещё {{count}} товара"},
        {"one": "and {{count}} more item", "other": "and {{count}} more items"},
    ),
    "checkout.installmentFor": same("Muddatli to'lov, {{count}} oy", "Рассрочка на {{count}} мес.", {"one": "Installments, {{count}} month", "other": "Installments, {{count}} months"}),
    "checkout.courierHint": ("Ko'rsatilgan manzilgacha, eshikkacha", "До двери по указанному адресу", "To your door at the address you enter"),
    "checkout.choosePayment": ("To'lov usulini tanlang", "Выберите способ оплаты", "Choose a payment method"),
    "checkout.stockAvailable": (
        "omborda {{available}} dona, buyurtmada {{requested}} dona",
        "в наличии {{available}} шт., в заказе {{requested}} шт.",
        "{{available}} in stock, {{requested}} in your order",
    ),
    "legal.acceptTerms": (
        "<terms>Ommaviy oferta</terms> va <privacy>maxfiylik siyosati</privacy> shartlariga roziman",
        "Я принимаю условия <terms>публичной оферты</terms> и <privacy>политики конфиденциальности</privacy>",
        "I accept the <terms>public offer</terms> and the <privacy>privacy policy</privacy>",
    ),
    "checkout.stepDone": ("Tayyor", "Готово", "Done"),
    "checkout.stepCompleted": ("bajarildi", "выполнено", "completed"),

    # ------------------------------------------------------------------ order success / payment
    "success.orderNotFound": ("Buyurtma topilmadi", "Заказ не найден", "Order not found"),
    "success.orderNotFoundText": (
        "Havolani tekshiring yoki buyurtmalaringiz ro'yxatini oching.",
        "Проверьте ссылку или откройте список ваших заказов.",
        "Check the link or open the list of your orders.",
    ),
    "payment.onReceiptCourier": (
        "To'lov buyurtmani qabul qilganingizda kuryerga amalga oshiriladi.",
        "Оплата курьеру при получении заказа.",
        "You'll pay the courier when you receive the order.",
    ),
    "payment.onReceiptPickup": (
        "To'lov olib ketish punktida buyurtmani olganingizda amalga oshiriladi.",
        "Оплата в пункте самовывоза при получении заказа.",
        "You'll pay at the pickup point when you collect the order.",
    ),
    "payment.checking": ("To'lov holati tekshirilmoqda…", "Проверяем статус оплаты…", "Checking the payment status…"),
    "payment.notConfirmedYet": (
        "To'lov tasdig'i hali kelmadi. Agar to'lagan bo'lsangiz, holat bir necha daqiqada avtomatik yangilanadi.",
        "Подтверждение оплаты ещё не поступило. Если вы уже оплатили заказ, статус обновится автоматически в течение нескольких минут.",
        "We haven't received the payment confirmation yet. If you've already paid, the status will update automatically within a few minutes.",
    ),
    "payment.unavailableNow": (
        "Onlayn to'lov vaqtincha mavjud emas. Boshqa to'lov usulini tanlash uchun biz bilan bog'laning.",
        "Онлайн-оплата временно недоступна. Свяжитесь с нами, чтобы выбрать другой способ оплаты.",
        "Online payment is temporarily unavailable. Contact us to choose another way to pay.",
    ),
    "payment.failedHint": (
        "To'lov amalga oshmadi. Biz bilan bog'laning — yordam beramiz:",
        "Оплата не прошла. Свяжитесь с нами — мы поможем:",
        "The payment didn't go through. Contact us and we'll help:",
    ),
    "payment.paidAt": ("to'langan: {{date}}", "оплачено {{date}}", "paid on {{date}}"),
    "payment.refreshStatus": ("Holatni yangilash", "Обновить статус", "Refresh status"),
    "order.reason": ("Sabab: {{reason}}", "Причина: {{reason}}", "Reason: {{reason}}"),

    # ------------------------------------------------------------------ auth
    "auth.benefitOrders": ("Buyurtmalar holatini real vaqtda kuzating", "Следите за статусом заказов в реальном времени", "Follow your order status in real time"),
    "auth.benefitLists": ("Sevimlilar va taqqoslash ro'yxati barcha qurilmalarda", "Избранное и сравнение — на всех устройствах", "Wishlist and compare list on all your devices"),
    "auth.benefitCheckout": ("Saqlangan manzillar bilan tez rasmiylashtirish", "Быстрое оформление с сохранёнными адресами", "Faster checkout with saved addresses"),
    "auth.checkSpam": (
        "Xat kelmadimi? «Spam» papkasini tekshiring yoki bir necha daqiqadan so'ng qayta urinib ko'ring.",
        "Письмо не пришло? Проверьте папку «Спам» или повторите попытку через несколько минут.",
        "No e-mail? Check your spam folder or try again in a few minutes.",
    ),
    "auth.tryAnother": ("Boshqa manzilni kiritish", "Указать другой адрес", "Use a different address"),
    "auth.requestNewLink": ("Yangi havola so'rash", "Запросить новую ссылку", "Request a new link"),
    "auth.changeNumber": ("Raqamni o'zgartirish", "Изменить номер", "Change number"),
    "auth.verifying": ("Email manzili tasdiqlanmoqda…", "Подтверждаем email…", "Verifying your email…"),
    "auth.sendNewLink": ("Yangi havolani yuborish", "Отправить новую ссылку", "Send a new link"),
    "auth.signInToResend": (
        "Yangi tasdiqlash havolasini olish uchun hisobingizga kiring.",
        "Войдите в аккаунт, чтобы получить новую ссылку для подтверждения.",
        "Sign in to get a new verification link.",
    ),

    # ------------------------------------------------------------------ account
    "profile.avatarHint": ("JPG, PNG, WebP yoki GIF, 3 MB gacha", "JPG, PNG, WebP или GIF, до 3 МБ", "JPG, PNG, WebP or GIF, up to 3 MB"),
    "profile.phoneHint": (
        "Telefon raqami hisobga kirish uchun ishlatiladi. Uni o'zgartirish uchun biz bilan bog'laning.",
        "Номер телефона используется для входа. Чтобы изменить его, свяжитесь с нами.",
        "Your phone number is used to sign in. To change it, please contact us.",
    ),
    "order.keepOrder": ("Bekor qilmaslik", "Не отменять", "Keep order"),
    "notifications.markRead": ("O'qilgan deb belgilash", "Отметить как прочитанное", "Mark as read"),
    "myReviews.emptyHint": (
        "Yetkazib berilgan buyurtmalardagi mahsulotlarga sharh qoldiring — bu boshqa xaridorlarga tanlashda yordam beradi.",
        "Оставляйте отзывы о товарах из доставленных заказов — это помогает другим покупателям с выбором.",
        "Review the products from your delivered orders — it helps other customers choose.",
    ),
    "settings.notificationsHint": (
        "Bildirishnomalar hisobingizda doim ko'rinadi — ularni yana qayerda olishni tanlang.",
        "Уведомления всегда доступны в личном кабинете — выберите, куда ещё их получать.",
        "Notifications are always available in your account — choose where else to receive them.",
    ),
    "settings.channels": ("Kanallar", "Каналы", "Channels"),
    "settings.topics": ("Mavzular", "Темы", "Topics"),
    "settings.pushHint": ("VERO TOOLS mobil ilovasida", "В мобильном приложении VERO TOOLS", "In the VERO TOOLS mobile app"),
    "settings.noEmail": ("Profilda email manzilini qo'shing", "Добавьте email в профиле", "Add an email address in your profile"),
    "settings.passwordSignOutNote": (
        "Parol o'zgartirilgach, barcha qurilmalardagi seanslar yakunlanadi — yangi parol bilan qayta kirasiz.",
        "После смены пароля сеансы на всех устройствах будут завершены — войдите снова с новым паролем.",
        "After the change you'll be signed out on all devices — sign in again with the new password.",
    ),
    "settings.passwordChangedRelogin": (
        "Parol o'zgartirildi. Yangi parol bilan qayta kiring.",
        "Пароль изменён. Войдите снова с новым паролем.",
        "Password changed. Please sign in with your new password.",
    ),

    # ------------------------------------------------------------------ lists / brands / promotions / content
    "wishlist.guestNote": (
        "Sevimlilar shu brauzerda saqlanadi. Ularni barcha qurilmalarda ko'rish uchun hisobingizga kiring.",
        "Избранное сохранено в этом браузере. Войдите, чтобы видеть его на всех устройствах.",
        "Your wishlist is saved in this browser. Sign in to see it on all your devices.",
    ),
    "brands.description": (
        "Professional va maishiy asbob-uskunalar ishlab chiqaruvchilari — rasmiy kafolat bilan.",
        "Производители профессионального и бытового инструмента — с официальной гарантией.",
        "Makers of professional and household tools — with an official warranty.",
    ),
    "brands.searchPlaceholder": ("Brend nomi", "Название бренда", "Brand name"),
    "brands.alphabet": ("Harf bo'yicha saralash", "Фильтр по букве", "Filter by letter"),
    "promotions.description": (
        "Joriy chegirmalar va maxsus takliflar. Aksiya narxlari mahsulot sahifasida va savatda avtomatik qo'llanadi.",
        "Текущие скидки и специальные предложения. Акционные цены применяются автоматически — на странице товара и в корзине.",
        "Current discounts and special offers. Promotional prices are applied automatically on the product page and in the cart.",
    ),
    "content.updated": ("Yangilangan: {{date}}", "Обновлено: {{date}}", "Updated: {{date}}"),
    "content.pagesNav": ("Ma'lumot sahifalari", "Информационные страницы", "Information pages"),
    "contacts.description": (
        "VERO TOOLS kontaktlari: telefon, email, do'kon manzili va olib ketish punktlari.",
        "Контакты VERO TOOLS: телефон, email, адрес магазина и пункты самовывоза.",
        "VERO TOOLS contacts: phone, e-mail, store address and pickup points.",
    ),
    "contacts.sendAnother": ("Yana xabar yuborish", "Отправить ещё одно сообщение", "Send another message"),
    "contacts.privacyNote": (
        "Ma'lumotlaringizni faqat so'rovingizga javob berish uchun ishlatamiz.",
        "Мы используем ваши данные только для ответа на обращение.",
        "We use your details only to reply to your request.",
    ),
    "contacts.showOnMap": ("Xaritada", "На карте", "On the map"),
    "contacts.openMap": ("Kattaroq xaritada ochish", "Открыть большую карту", "Open larger map"),
    "contacts.showStore": ("Do'kon manzilini ko'rsatish", "Показать адрес магазина", "Show the store address"),
    "contacts.legalName": ("Yuridik nomi", "Юридическое название", "Legal name"),
    "faq.description": (
        "Buyurtma, yetkazib berish, to'lov va kafolat haqidagi ko'p beriladigan savollarga javoblar.",
        "Ответы на частые вопросы о заказе, доставке, оплате и гарантии.",
        "Answers to common questions about orders, delivery, payment and warranty.",
    ),
    "faq.searchPlaceholder": ("Savol bo'yicha qidirish", "Поиск по вопросам", "Search the questions"),
    "faq.contactHint": (
        "Mutaxassislarimiz asbob tanlash, buyurtma va yetkazib berish bo'yicha maslahat beradi.",
        "Наши специалисты проконсультируют по выбору инструмента, заказу и доставке.",
        "Our specialists will help with choosing a tool, ordering and delivery.",
    ),

    # ------------------------------------------------------------------ address
    "address.apartmentShort": ("{{value}}-xonadon", "кв. {{value}}", "apt. {{value}}"),
    "address.regionFirst": ("Avval viloyatni tanlang", "Сначала выберите регион", "Select a region first"),
}

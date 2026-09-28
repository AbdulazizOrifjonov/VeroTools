import type { SeedReviewTemplate } from './types';

/**
 * Review templates for the development database. `fits` lists the illustration
 * types a review makes sense for; an empty array marks a generic review
 * (delivery, service, packaging, value for money) that fits any product.
 */
export const REVIEW_TEMPLATES: SeedReviewTemplate[] = [
  // --- cordless drills, impact wrenches, chargers -----------------------------
  {
    rating: 5,
    language: 'uz',
    title: 'Ikki akkumulyator bilan juda qulay',
    comment:
      "Shurupovertni oshxona mebelini yig'ish uchun oldim. Ikkita akkumulyator bilan kelgani katta qulaylik: biri ishlayotganda ikkinchisi zaryadlanib turadi, kun bo'yi ishlasam ham to'xtab qolmadim. Qo'lda yengil, patroni parmani mahkam ushlaydi.",
    pros: 'Yengil, ikki akkumulyator, qulay dastak',
    cons: 'Qutisi biroz tor',
    fits: ['drill_cordless'],
  },
  {
    rating: 5,
    language: 'ru',
    title: 'Аккумуляторы держат отлично',
    comment:
      'Беру уже второй шуруповёрт этой марки. Заряда хватает на целый день сборки каркаса из профиля, а заряжается аккумулятор быстро. Реверс переключается легко, две скорости — то, что нужно. За свои деньги очень достойно.',
    pros: 'Долго держит заряд, быстрая зарядка',
    fits: ['drill_cordless', 'battery_charger'],
  },
  {
    rating: 4,
    language: 'uz',
    comment:
      "Kuchi yetarli, uzun samorezlarni ham qiynalmay buraydi. Faqat uzoq ishlaganda qo'l biroz charchaydi — dastagi yanada qulayroq bo'lsa yaxshi bo'lardi. Umuman, narxiga arziydi.",
    pros: 'Kuchli, reversi qulay',
    cons: "Uzoq ishlaganda qo'l charchaydi",
    fits: ['drill_cordless', 'impact_wrench'],
  },
  {
    rating: 5,
    language: 'en',
    title: 'Great all-rounder',
    comment:
      'Bought it for general DIY around the flat: drilling tiles with the right bit, driving screws into studs and assembling furniture. The clutch settings are easy to read and it stops before stripping screws. The battery lasts longer than I expected.',
    pros: 'Light, well balanced, clear clutch settings',
    fits: ['drill_cordless'],
  },
  {
    rating: 3,
    language: 'ru',
    title: 'Хороший, но зарядка медленная',
    comment:
      'Сам шуруповёрт нормальный, крутящего момента для бытовых задач хватает. Но зарядное устройство в комплекте простое и заряжает долго — пришлось докупить второй аккумулятор. Советую сразу брать комплект с двумя батареями.',
    pros: 'Удобная рукоятка, быстрозажимной патрон',
    cons: 'Долгая зарядка',
    fits: ['drill_cordless', 'battery_charger'],
  },
  {
    rating: 5,
    language: 'uz',
    title: 'Shinomontaj uchun ajoyib',
    comment:
      "Gayka buragichni shinomontaj ustaxonasi uchun oldim. G'ildirak gaykalarini bir zumda bo'shatadi, hatto zanglab qolganlarini ham. Akkumulyatori bir kunlik ishga yetadi, mijozlarga xizmat ko'rsatish ancha tezlashdi.",
    pros: 'Kuchli zarb, tez ishlaydi',
    cons: "Biroz og'ir",
    fits: ['impact_wrench'],
  },
  {
    rating: 5,
    language: 'ru',
    comment:
      'Гайковёрт для гаража — то, что нужно. Колёса меняю за несколько минут, прикипевшие болты на подвеске тоже откручивает без проблем. Удобно лежит в руке, а аккумулятора хватает надолго.',
    fits: ['impact_wrench'],
  },
  {
    rating: 4,
    language: 'en',
    title: 'Fast charger, a bit noisy',
    comment:
      "Charges my batteries noticeably faster than the basic charger that came with the drill, and the indicator lights are clear. The only downside is the cooling fan: it's quite loud, so I don't leave it charging overnight in the flat.",
    cons: 'Noisy cooling fan',
    fits: ['battery_charger'],
  },
  {
    rating: 4,
    language: 'uz',
    comment:
      "Qo'shimcha zaryadlovchi va akkumulyator oldim — endi obyektda ish to'xtamaydi. Zaryad ko'rsatkichi aniq ishlaydi. Narxi biroz qimmatroq, lekin sifatiga arziydi.",
    fits: ['battery_charger', 'drill_cordless'],
  },

  // --- rotary hammers -----------------------------------------------------------
  {
    rating: 5,
    language: 'uz',
    title: 'Betonni bemalol teshadi',
    comment:
      "Perforatorni elektr montaj ishlari uchun oldim. Beton devorda kabel uchun ariqcha ochish va rozetka qutilari uchun teshik parmalash oson bo'ldi. Zarb rejimini o'chirib, oddiy parmalash ham mumkin. To'plamda qo'shimcha dastak va chuqurlik cheklagichi bor.",
    pros: 'Kuchli zarb, bir necha rejim, mustahkam quti',
    cons: 'Tebranish sezilarli',
    fits: ['rotary_hammer'],
  },
  {
    rating: 4,
    language: 'ru',
    comment:
      'Перфоратор мощный, бетон берёт уверенно, а в режиме долбления легко снимает старую плитку. Минус — ощутимая вибрация при долгой работе, без перчаток руки устают. В остальном покупкой доволен.',
    pros: 'Мощный, есть режим долбления',
    cons: 'Вибрация',
    fits: ['rotary_hammer'],
  },
  {
    rating: 3,
    language: 'ru',
    title: 'Тяжеловат для потолка',
    comment:
      'Для сверления в потолке оказался тяжёлым — долго держать над головой неудобно. Сам инструмент работает нормально, но под мои задачи не подошёл. Обменял на более лёгкую модель: в магазине пошли навстречу и всё сделали быстро.',
    fits: ['rotary_hammer'],
  },

  // --- angle grinders -------------------------------------------------------------
  {
    rating: 5,
    language: 'uz',
    comment:
      "Bolgarka zo'r! Yumshoq ishga tushadi, qo'lda siltanib ketmaydi. Temir quvurlarni kesish va payvand choklarini tozalashda ishlatyapman. Himoya g'ilofini asbobsiz burish mumkin, bu juda qulay.",
    pros: "Yumshoq start, qulay himoya g'ilofi",
    cons: 'Kabeli qisqaroq',
    fits: ['angle_grinder'],
  },
  {
    rating: 4,
    language: 'ru',
    comment:
      'Болгарка тянет уверенно, металл толщиной 3–4 мм режет без проблем. В комплекте был только один диск, поэтому сразу докупил набор отрезных. Корпус тонкий, удобно держать даже одной рукой.',
    fits: ['angle_grinder', 'cutting_disc'],
  },
  {
    rating: 3,
    language: 'ru',
    title: 'Нормально, но дороговато',
    comment:
      'Товар хороший, претензий к качеству нет. Но цена чуть выше, чем на строительном рынке. С другой стороны, здесь официальная гарантия, чек и доставка до двери — для меня это в итоге перевесило.',
    pros: 'Гарантия, чек, доставка',
    cons: 'Цена выше рыночной',
    fits: [],
  },
  {
    rating: 3,
    language: 'uz',
    comment:
      "Umuman olganda yomon emas, lekin uzoq ishlaganda korpusi ancha qiziydi, shuning uchun har 15–20 daqiqada dam berib turaman. Uydagi kichik ishlar uchun yetarli, professional ish uchun esa kuchliroq model olgan ma'qul.",
    fits: ['angle_grinder'],
  },

  // --- saws -------------------------------------------------------------------------
  {
    rating: 5,
    language: 'ru',
    title: 'Ровный рез без сколов',
    comment:
      'Взял дисковую пилу для распила ламината и фанеры. С хорошим диском рез ровный, почти без сколов. Удобно, что есть параллельный упор и патрубок для пылесоса, а глубина пропила регулируется за секунды.',
    fits: ['circular_saw', 'saw_blade'],
  },
  {
    rating: 4,
    language: 'uz',
    comment:
      "Taxta va OSB plitalarni kesish uchun oldim. Kesimi tekis, kuchi yetarli. Chang ko'p chiqadi — changyutgich ulash kerak ekan. Umuman, pulga arziydi.",
    fits: ['circular_saw'],
  },
  {
    rating: 4,
    language: 'en',
    comment:
      "Handy jigsaw for curved cuts in plywood and worktops. The pendulum action speeds things up a lot, and blade changes are tool-free. Vibration is a bit higher than I'd like at full speed, but it's manageable.",
    fits: ['jigsaw'],
  },
  {
    rating: 5,
    language: 'uz',
    comment:
      "Elektr lobzik bilan oshxona stoleshnitsasida rakovina uchun teshik kesdim — juda oson bo'ldi. Tig'ini almashtirish bir soniyalik ish. Tezligini sozlash mumkin, plastik va yupqa metallni ham kesadi.",
    fits: ['jigsaw'],
  },

  // --- hand tools and sets ------------------------------------------------------------
  {
    rating: 5,
    language: 'uz',
    title: 'Mustahkam kalitlar',
    comment:
      "Kalitlar to'plami qo'lda ushlashga qulay, po'lati sifatli. Avtomobil ta'mirida bir necha oydan beri ishlataman — birortasi ham egilmadi, qirralari yeyilmadi. Qutida har bir kalitning o'z joyi bor, hech narsa yo'qolmaydi.",
    fits: ['wrench', 'socket_set'],
  },
  {
    rating: 5,
    language: 'ru',
    comment:
      'Набор головок с трещоткой — для гаража лучше и не надо. Кейс крепкий, замки не болтаются, каждая головка на своём месте. Трещотка с мелким шагом, удобно работать в тесных местах под капотом.',
    fits: ['socket_set', 'tool_case'],
  },
  {
    rating: 2,
    language: 'ru',
    title: 'Долго ждал подтверждения',
    comment:
      'Оформил заказ утром, но звонка оператора так и не дождался — пришлось звонить самому ближе к вечеру. Дальше всё прошло нормально, к товару претензий нет. Но хотелось бы, чтобы заказы подтверждали быстрее.',
    cons: 'Долгое подтверждение заказа',
    fits: [],
  },
  {
    rating: 4,
    language: 'uz',
    comment:
      "Otvyortkalar to'plami yaxshi: uchlari magnitli, dastagi rezinali — qo'l sirpanmaydi. Faqat eng kichik otvyortkalar biroz yumshoqroq tuyuldi. Uy uchun juda mos.",
    fits: ['screwdriver_set'],
  },
  {
    rating: 4,
    language: 'ru',
    comment:
      'Пассатижи удобные: рукоятки не скользят, губки смыкаются плотно, проволоку перекусывают легко. Для профессиональной электрики я бы взял модель с диэлектрическими ручками, но для бытовых задач — отлично.',
    fits: ['pliers'],
  },
  {
    rating: 5,
    language: 'uz',
    comment:
      "Bolg'a qo'lda juda yaxshi turadi, dastagi zarbni yumshatadi. Mix sug'uradigan qismi ham mustahkam. Oddiy asbob, lekin sifati sezilib turadi.",
    fits: ['hammer'],
  },
  {
    rating: 1,
    language: 'ru',
    title: 'Некомплект в наборе',
    comment:
      'В наборе не хватало двух головок — в кейсе просто пустые гнёзда. Пришлось ехать в пункт выдачи за заменой и потратить полдня. Набор в итоге заменили, но впечатление испорчено: такие вещи нужно проверять перед отправкой.',
    cons: 'Некомплект, потерянное время',
    fits: ['socket_set', 'tool_case'],
  },

  // --- water pumps ----------------------------------------------------------------------
  {
    rating: 5,
    language: 'uz',
    title: "Quduqdagi suv muammosi hal bo'ldi",
    comment:
      "Chuqurlik nasosini hovlidagi quduqqa o'rnatdik. Suv bosimi yaxshi, ikki qavatli uyga bemalol yetadi, ishlaganda umuman eshitilmaydi. Konsultant quduq chuqurligiga qarab to'g'ri modelni tanlab berdi, rahmat.",
    fits: ['pump_submersible'],
  },
  {
    rating: 2,
    language: 'uz',
    title: 'Yetkazib berish kechikdi',
    comment:
      "Buyurtma ertasi kuni kelishi kerak edi, lekin ikki kun kechikdi, kuryer ham oldindan qo'ng'iroq qilmadi. Tovarning o'zi yaxshi, ammo xizmatdan ko'nglim to'lmadi.",
    pros: 'Tovar sifati yaxshi',
    cons: "Kechikish, kuryer qo'ng'iroq qilmadi",
    fits: [],
  },
  {
    rating: 4,
    language: 'uz',
    comment:
      "Yer usti nasosini tomorqani sug'orish uchun oldim. Ariqdan suvni yaxshi tortadi, bosimi shlang bilan sug'orishga yetarli. Biroz shovqin qiladi, shuning uchun uni omborxonaga o'rnatdim.",
    fits: ['pump_surface'],
  },
  {
    rating: 3,
    language: 'ru',
    comment:
      'Насос качает нормально, но оказался шумнее, чем я ожидал: ставить его рядом с домом не вариант, пришлось делать отдельный короб. По производительности претензий нет.',
    fits: ['pump_surface'],
  },
  {
    rating: 5,
    language: 'en',
    comment:
      'The consultant asked about well depth, pipe length and how many taps we have before recommending a model — that saved us from buying an oversized pump. Installed last month, the pressure is steady and it runs quietly.',
    fits: ['pump_submersible', 'pump_surface'],
  },

  // --- compressors ------------------------------------------------------------------------
  {
    rating: 5,
    language: 'uz',
    comment:
      "Kompressorni avtoservis uchun oldik. Shinalarga havo berish va pnevmatik gayka buragich bilan ishlash uchun yetarli. Resiveri tez to'ladi, avtomatikasi o'zi o'chirib-yoqadi.",
    fits: ['compressor'],
  },
  {
    rating: 4,
    language: 'ru',
    comment:
      'Для покраски в гараже — хороший вариант. Давление держит стабильно, влагоотделитель лучше докупить сразу. Шумноват, но для компрессора это ожидаемо.',
    fits: ['compressor'],
  },
  {
    rating: 3,
    language: 'en',
    comment:
      "Does the job for inflating tyres and blowing dust off parts, but it's loud and the tank takes a while to refill when spray painting. Fine for occasional use; for a busy workshop I'd choose a bigger model.",
    fits: ['compressor'],
  },

  // --- generators -------------------------------------------------------------------------
  {
    rating: 5,
    language: 'uz',
    title: "Chiroq o'chganda asqatdi",
    comment:
      "Generatorni qishki elektr uzilishlaridan keyin oldim. Muzlatgich, qozon nasosi va chiroqlarni bemalol tortadi, birinchi urinishdayoq o't oladi. Og'ir bo'lsa ham, kuryer uni hovligacha olib kirib berdi.",
    fits: ['generator_open'],
  },
  {
    rating: 4,
    language: 'ru',
    comment:
      'Генератор запускается с первого-второго раза и держит нагрузку: холодильник, насос и освещение работают одновременно. Шумный, поэтому поставил его под навес подальше от окон. Расход топлива умеренный.',
    fits: ['generator_open'],
  },
  {
    rating: 2,
    language: 'uz',
    title: 'Birinchi ishga tushirishda muammo',
    comment:
      "Generator birinchi kuniyoq yaxshi o't olmadi. Qo'llab-quvvatlash xizmatiga murojaat qildim, servis markazida karbyuratorni sozlab berishdi va endi ishlayapti. Muammo hal bo'ldi, lekin bunga bir necha kun ketdi.",
    fits: ['generator_open'],
  },
  {
    rating: 5,
    language: 'en',
    title: 'Quiet enough for the balcony',
    comment:
      "Bought the inverter generator mainly for my computer and router during power cuts. Clean power, no flickering, and in eco mode it's quiet enough that the neighbours don't complain. Light enough to carry with one hand.",
    fits: ['generator_inverter'],
  },
  {
    rating: 5,
    language: 'ru',
    comment:
      'Брал инверторный генератор для газового котла: автоматика капризная, от обычного генератора её выбивало. С этим проблем нет, котёл работает стабильно. Тихий, экономичный, легко переносить.',
    fits: ['generator_inverter'],
  },

  // --- welding ------------------------------------------------------------------------------
  {
    rating: 5,
    language: 'uz',
    title: 'Past kuchlanishda ham payvandlaydi',
    comment:
      "Qishlog'imizda kuchlanish ko'pincha past bo'ladi, oldingi apparatim umuman ishlamasdi. Bu invertor bemalol payvandlaydi: yoyi barqaror, elektrod yopishib qolmaydi. Darvoza va panjara yasashda ishlatyapman.",
    fits: ['welder_inverter'],
  },
  {
    rating: 5,
    language: 'ru',
    comment:
      'Сварочный инвертор лёгкий, дугу держит стабильно, поджиг мягкий. Варю «тройкой» навес во дворе — швы аккуратные даже у новичка. Вместе с аппаратом взял электроды, консультант подсказал подходящие.',
    fits: ['welder_inverter', 'welding_electrodes'],
  },
  {
    rating: 4,
    language: 'en',
    comment:
      'Compact welder that handles 3 mm electrodes easily; hot start and anti-stick work as described. The earth clamp that comes with it is basic, so I replaced it with a heavier one.',
    fits: ['welder_inverter'],
  },
  {
    rating: 5,
    language: 'uz',
    comment:
      "Xameleon niqob — ko'zlar uchun katta qulaylik. Yoy yonishi bilan darhol qorayadi, niqobni ko'tarib-tushirib o'tirish shart emas. Boshga yaxshi o'rnashadi, uzoq ishlaganda ham bosmaydi.",
    fits: ['welding_helmet'],
  },
  {
    rating: 4,
    language: 'ru',
    comment:
      'Маска-хамелеон удобная: затемнение срабатывает быстро, а регулировка чувствительности выручает при сварке на улице. Оголовье могло бы быть мягче, но в целом отличная маска за свои деньги.',
    fits: ['welding_helmet'],
  },
  {
    rating: 4,
    language: 'uz',
    comment:
      "Elektrodlar yaxshi yonadi, shlak oson ajraladi. Qadog'i germetik, namlik tegmagan. Faqat bitta qutidagi bir nechta elektrodning qoplamasi biroz ko'chgan ekan.",
    fits: ['welding_electrodes'],
  },

  // --- construction -----------------------------------------------------------------------
  {
    rating: 5,
    language: 'ru',
    comment:
      'Бетономешалка выручила при заливке фундамента под баню. Мешает равномерно, барабан опрокидывается легко. Собрали вдвоём по инструкции примерно за час. Привезли на грузовой машине прямо на участок.',
    fits: ['concrete_mixer'],
  },
  {
    rating: 4,
    language: 'uz',
    comment:
      "Beton qorgich yaxshi ishlayapti, qorishma bir xil chiqadi, dvigateli qizib ketmaydi. Yig'ish uchun biroz vaqt ketdi — yo'riqnoma o'zbek tilida ham bo'lsa yaxshi bo'lardi.",
    fits: ['concrete_mixer'],
  },
  {
    rating: 5,
    language: 'en',
    comment:
      'Clean, straight cuts on porcelain tiles with barely any chipping. The guide rail is rigid and the breaking foot works well. Saved us a lot of time on the bathroom renovation.',
    fits: ['tile_cutter'],
  },
  {
    rating: 1,
    language: 'uz',
    title: "Yetkazib berish ikki marta ko'chirildi",
    comment:
      "Buyurtmam ikki marta boshqa kunga ko'chirildi, har safar oxirgi daqiqada xabar berishdi. Oxiri o'zim olib ketish punktiga borib oldim. Tovar yaxshi, lekin yetkazib berishni tashkil qilishni yaxshilash kerak.",
    cons: "Yetkazib berish sanasi ikki marta o'zgardi",
    fits: [],
  },

  // --- garden -------------------------------------------------------------------------------
  {
    rating: 5,
    language: 'uz',
    comment:
      "Maysa o'rish mashinasi hovlidagi gazon uchun ideal. O'rish balandligini sozlash oson, o't yig'gichi tez to'lmaydi. Turmush o'rtog'im ham bemalol ishlatadi.",
    fits: ['lawn_mower'],
  },
  {
    rating: 4,
    language: 'ru',
    comment:
      'Газонокосилка косит ровно, травосборник вместительный. На неровных участках колёса иногда проскальзывают, но для дачи это отличный вариант.',
    fits: ['lawn_mower'],
  },
  {
    rating: 5,
    language: 'uz',
    title: "Ariq bo'ylari endi toza",
    comment:
      "Trimmer bilan ariq bo'yidagi va daraxt tagidagi o'tlarni o'rish juda oson. Yelka kamari og'irlikni yaxshi taqsimlaydi. Ipi tugab qolsa, almashtirish ham qiyin emas.",
    fits: ['grass_trimmer'],
  },
  {
    rating: 4,
    language: 'en',
    comment:
      "Cuts through thick weeds along the fence without bogging down, and the shoulder harness makes a big difference. It's a bit loud, so ear protection is a must.",
    fits: ['grass_trimmer'],
  },
  {
    rating: 5,
    language: 'ru',
    comment:
      'Бензопила заводится легко, цепь с завода острая. Распилил старые яблони и заготовил дрова на зиму. Тормоз цепи срабатывает чётко, вибрация умеренная.',
    fits: ['chainsaw'],
  },
  {
    rating: 3,
    language: 'uz',
    comment:
      "Zanjirli arra kuchli, lekin og'ir ekan, uzoq ishlash qiyin. Zanjirni tez-tez tortib turish kerak. Katta daraxtlar uchun yaxshi, kichik bog' ishlari uchun esa yengilroq model kerak edi.",
    fits: ['chainsaw'],
  },
  {
    rating: 3,
    language: 'en',
    title: 'Good on flat lawns only',
    comment:
      "Cuts evenly on our flat front lawn, but it struggles with tall or wet grass and the collection bag fills up quickly. Fine for a small, well-kept garden; for a bigger plot I'd look at a more powerful model.",
    fits: ['lawn_mower'],
  },

  // --- pressure washers --------------------------------------------------------------------
  {
    rating: 5,
    language: 'uz',
    comment:
      'Yuvish apparati bilan mashinani uyda yuvaman, avtomoykaga borish shart emas. Hovlidagi plitkalar va darvozani ham yangidek qildi. Bosimi kuchli, nasadkalarini almashtirish oson.',
    fits: ['pressure_washer'],
  },
  {
    rating: 4,
    language: 'ru',
    comment:
      'Мойка высокого давления отлично отмывает брусчатку и забор. Напор сильный, насадки меняются легко. Шланг хотелось бы подлиннее — приходится переносить мойку с места на место.',
    fits: ['pressure_washer'],
  },
  {
    rating: 2,
    language: 'en',
    title: 'Hose too short for my needs',
    comment:
      'The washer itself works, but the supplied hose is short and quite stiff, so I kept moving the unit around the car. Support suggested an extension hose, but I exchanged it for a different model instead. The exchange itself went smoothly.',
    cons: 'Short, stiff hose',
    fits: ['pressure_washer'],
  },

  // --- measuring tools ----------------------------------------------------------------------
  {
    rating: 5,
    language: 'uz',
    title: 'Plitka terish uchun ajoyib',
    comment:
      "Lazer nivelir chiziqlari yorqin, xonada kunduzi ham yaxshi ko'rinadi. O'zini o'zi tekislaydi, qiyalik katta bo'lsa signal beradi. Plitka va gipsokarton montajida ancha vaqtni tejadi.",
    fits: ['laser_level'],
  },
  {
    rating: 5,
    language: 'ru',
    comment:
      'Линии яркие, видно даже при дневном свете, самовыравнивание быстрое. Брал вместе со штативом — удобно размечать потолки и перегородки. Работаю им на объектах каждый день.',
    fits: ['laser_level'],
  },
  {
    rating: 4,
    language: 'en',
    comment:
      'Accurate enough for hanging kitchen cabinets and laying tiles, and self-levelling is quick. The lines are harder to see outdoors in bright sun, which is to be expected.',
    fits: ['laser_level'],
  },
  {
    rating: 5,
    language: 'uz',
    comment:
      "Lazer masofa o'lchagich bilan xonalarni o'lchash bir necha daqiqa oldi. Maydon va hajmni o'zi hisoblaydi, ruletka bilan ovora bo'lish shart emas. Mijozlarga smeta tuzish ancha tezlashdi.",
    fits: ['rangefinder'],
  },
  {
    rating: 4,
    language: 'ru',
    comment:
      'Рулетка крепкая: лента широкая и не ломается при вытягивании, фиксатор надёжный, крючок не болтается. Корпус прорезиненный — пару раз роняла её со стремянки, ничего не случилось.',
    fits: ['tape_measure'],
  },
  {
    rating: 4,
    language: 'uz',
    comment:
      "Multimetr elektr montajda kerakli narsa. Kuchlanish va qarshilikni aniq o'lchaydi, ekrani katta. Probnik simlari biroz ingichka, ehtiyot bo'lib ishlatish kerak.",
    fits: ['multimeter'],
  },

  // --- accessories, consumables, spare parts --------------------------------------------------
  {
    rating: 5,
    language: 'ru',
    comment:
      'Набор свёрл в удобном кейсе: по металлу, бетону и дереву. Свёрла по металлу острые, даже нержавейку берут на малых оборотах. Кейс закрывается плотно, ничего не высыпается.',
    fits: ['drill_bit_set'],
  },
  {
    rating: 4,
    language: 'uz',
    comment:
      "Parmalar to'plami uy uchun juda qulay — beton, metall va yog'och uchun kerakli o'lchamlarning hammasi bor. Kichik o'lchamdagi parmalar tez o'tmaslashdi, qolganlari yaxshi.",
    fits: ['drill_bit_set'],
  },
  {
    rating: 5,
    language: 'uz',
    comment:
      'Kesish disklari sifatli: metallni tez va toza kesadi, uchquni kam. Bitta disk bilan ancha profil quvur kesdim. Keyingi safar ham shularni olaman.',
    fits: ['cutting_disc'],
  },
  {
    rating: 4,
    language: 'ru',
    comment:
      'Пильный диск режет ламинированное ДСП чисто, сколов почти нет. Для продольного распила массива лучше взять диск с меньшим количеством зубьев.',
    fits: ['saw_blade'],
  },
  {
    rating: 5,
    language: 'uz',
    title: 'Aynan mos keldi',
    comment:
      "Eski perforatorim uchun ko'mir cho'tkalar oldim — o'lchami aynan mos keldi. Konsultant model raqami bo'yicha tekshirib berdi. Almashtirganimdan keyin asbob yangidek ishlayapti.",
    fits: ['carbon_brushes'],
  },
  {
    rating: 5,
    language: 'ru',
    comment:
      'Заменил патрон на старой дрели — подошёл идеально, биения нет. Хорошо, что в карточке товара указаны резьба и диапазон зажима: подобрать нужный было легко.',
    fits: ['drill_chuck'],
  },

  // --- industrial equipment -------------------------------------------------------------------
  {
    rating: 5,
    language: 'en',
    comment:
      'Sturdy drill press for our small workshop. The table is solid, the depth stop is precise and changing speeds is straightforward. Holes come out perfectly perpendicular every time.',
    fits: ['drill_press'],
  },
  {
    rating: 4,
    language: 'uz',
    comment:
      "Charxlash dastgohida pichoq, parma va keskichlarni charxlayman. Ishlaganda tebranmaydi, himoya ekrani bor. Toshlari o'rtacha, keyinchalik sifatliroq charx toshi olsam kerak.",
    fits: ['bench_grinder'],
  },
  {
    rating: 5,
    language: 'ru',
    comment:
      'Взяли станок в мастерскую: работает тихо, без вибрации, стоит устойчиво. Доставили аккуратно, в заводской упаковке, всё целое.',
    fits: ['bench_grinder', 'drill_press'],
  },

  // --- generic: delivery, service, packaging, value -------------------------------------------
  {
    rating: 5,
    language: 'uz',
    title: 'Tez yetkazib berishdi',
    comment:
      "Ertalab buyurtma berdim, kechqurun kuryer olib keldi. Operator oldindan qo'ng'iroq qilib, hamma narsani aniqlashtirdi. Qadoq butun, hammasi joyida. Rahmat!",
    fits: [],
  },
  {
    rating: 5,
    language: 'ru',
    title: 'Отличная консультация',
    comment:
      'Долго не мог определиться с выбором и позвонил в магазин. Консультант подробно расспросил о задачах и честно посоветовал модель дешевле той, что я хотел, — и она полностью подошла. Буду обращаться ещё.',
    fits: [],
  },
  {
    rating: 4,
    language: 'uz',
    comment:
      "Viloyatga uch kunda yetib keldi. Qadoqlash juda puxta — ko'pikli plyonka va karton burchaklar bilan. Narxi bozordagidan unchalik farq qilmaydi, lekin kafolat va chek bor.",
    fits: [],
  },
  {
    rating: 5,
    language: 'ru',
    comment:
      'Оформил рассрочку на полгода — заявку одобрили в тот же день, договор подписали при доставке. Удобно, что платёж разбит на равные части и всё прозрачно.',
    fits: [],
  },
  {
    rating: 5,
    language: 'en',
    title: 'Smooth order from start to finish',
    comment:
      "Ordered online, got a confirmation call within the hour, and the courier arrived the next morning. Everything was well packed and matched the description. I'll be ordering from here again.",
    fits: [],
  },
];

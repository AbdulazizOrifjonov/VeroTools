import type { SeedCategory } from './types';

/**
 * Catalogue tree: 15 top-level categories, each with leaf subcategories.
 * `key` === `slug` everywhere. `specKeys` lists only filterable spec keys;
 * children inherit the keys of their parent.
 */
export const CATEGORIES: SeedCategory[] = [
  // 1 ─────────────────────────────────────────────────────────────────────
  {
    key: 'power-tools',
    slug: 'power-tools',
    name: { uz: 'Elektr asboblar', ru: 'Электроинструмент', en: 'Power Tools' },
    description: {
      uz: "Tarmoqdan va akkumulyatordan ishlaydigan drellar, perforatorlar, bolgarkalar va arralar — ta'mirlash, qurilish va ustaxona ishlari uchun.",
      ru: 'Сетевые и аккумуляторные дрели, перфораторы, болгарки и пилы для ремонта, стройки и мастерской.',
      en: 'Corded and cordless drills, rotary hammers, grinders and saws for renovation, construction and workshop jobs.',
    },
    icon: 'Drill',
    illustration: 'drill_cordless',
    specKeys: ['power_w', 'voltage_v', 'brushless', 'weight_kg', 'color'],
    children: [
      {
        key: 'drills-drivers',
        slug: 'drills-drivers',
        name: { uz: 'Drel-shurupovertlar', ru: 'Дрели-шуруповёрты', en: 'Drills & Drivers' },
        description: {
          uz: "Akkumulyatorli drel-shurupovertlar, zarbli va tarmoqli drellar: parmalash, burash va yig'ish ishlari uchun.",
          ru: 'Аккумуляторные дрели-шуруповёрты, ударные и сетевые дрели для сверления, закручивания крепежа и сборки.',
          en: 'Cordless drill drivers, combi drills and corded drills for drilling, driving fasteners and assembly work.',
        },
        icon: 'Drill',
        illustration: 'drill_cordless',
        specKeys: [
          'battery_capacity_ah',
          'battery_included',
          'torque_nm',
          'chuck_size_mm',
          'chuck_type',
          'case_included',
        ],
      },
      {
        key: 'rotary-hammers',
        slug: 'rotary-hammers',
        name: { uz: 'Perforatorlar', ru: 'Перфораторы', en: 'Rotary Hammers' },
        description: {
          uz: "SDS-plus va SDS-max patronli perforatorlar beton va g'ishtda teshik ochish hamda yengil buzish ishlari uchun.",
          ru: 'Перфораторы с патроном SDS-plus и SDS-max для сверления бетона и кирпича и лёгкого долбления.',
          en: 'SDS-plus and SDS-max rotary hammers for drilling concrete and brick and for light chiselling.',
        },
        icon: 'BrickWall',
        illustration: 'rotary_hammer',
        specKeys: ['impact_energy_j', 'chuck_type', 'battery_included', 'case_included'],
      },
      {
        key: 'angle-grinders',
        slug: 'angle-grinders',
        name: {
          uz: 'Burchakli silliqlash mashinalari (bolgarkalar)',
          ru: 'Угловые шлифмашины (болгарки)',
          en: 'Angle Grinders',
        },
        description: {
          uz: '125 va 230 mm diskli bolgarkalar metall va toshni kesish, silliqlash va zangdan tozalash uchun.',
          ru: 'Болгарки под диск 125 и 230 мм для резки металла и камня, шлифовки и зачистки.',
          en: '125 and 230 mm grinders for cutting metal and stone, grinding and surface cleaning.',
        },
        icon: 'Disc3',
        illustration: 'angle_grinder',
        specKeys: ['disc_diameter_mm', 'battery_included'],
      },
      {
        key: 'circular-saws',
        slug: 'circular-saws',
        name: { uz: 'Diskli arralar', ru: 'Циркулярные пилы', en: 'Circular Saws' },
        description: {
          uz: "Yog'och, DSP va fanerni to'g'ri va qiya kesish uchun qo'l diskli arralari.",
          ru: 'Ручные циркулярные пилы для прямого и углового реза древесины, ДСП и фанеры.',
          en: 'Hand-held circular saws for straight and bevel cuts in timber, chipboard and plywood.',
        },
        icon: 'CircleDashed',
        illustration: 'circular_saw',
        specKeys: ['disc_diameter_mm', 'cutting_depth_mm', 'teeth_count'],
      },
      {
        key: 'jigsaws',
        slug: 'jigsaws',
        name: { uz: 'Elektr lobziklar', ru: 'Электролобзики', en: 'Jigsaws' },
        description: {
          uz: "Yog'och, laminat, plastik va yupqa metallda egri va to'g'ri kesish uchun mayatnikli lobziklar.",
          ru: 'Маятниковые лобзики для фигурного и прямого реза дерева, ламината, пластика и тонкого металла.',
          en: 'Pendulum jigsaws for curved and straight cuts in wood, laminate, plastic and thin metal.',
        },
        icon: 'Spline',
        illustration: 'jigsaw',
        specKeys: ['cutting_depth_mm'],
      },
      {
        key: 'impact-wrenches',
        slug: 'impact-wrenches',
        name: { uz: 'Zarbli gaykovyortlar', ru: 'Ударные гайковёрты', en: 'Impact Wrenches' },
        description: {
          uz: "Avtoservis, shinomontaj va metall konstruksiyalarni yig'ishda gayka va boltlarni tez burash uchun gaykovyortlar.",
          ru: 'Гайковёрты для быстрого закручивания и откручивания гаек и болтов в автосервисе, шиномонтаже и монтаже металлоконструкций.',
          en: 'Impact wrenches for fast fastening and loosening of nuts and bolts in car service, tyre fitting and steelwork.',
        },
        icon: 'Bolt',
        illustration: 'impact_wrench',
        specKeys: ['torque_nm', 'chuck_type', 'battery_capacity_ah', 'battery_included'],
      },
    ],
  },

  // 2 ─────────────────────────────────────────────────────────────────────
  {
    key: 'hand-tools',
    slug: 'hand-tools',
    name: { uz: "Qo'l asboblari", ru: 'Ручной инструмент', en: 'Hand Tools' },
    description: {
      uz: "Bolg'alar, kalitlar, otvyortkalar va ombirlar — har kungi ta'mirlash va professional ustalar uchun.",
      ru: 'Молотки, гаечные ключи, отвёртки и шарнирно-губцевый инструмент для ежедневного ремонта и профессиональной работы.',
      en: 'Hammers, spanners, screwdrivers and pliers for everyday repairs and professional trades.',
    },
    icon: 'Hammer',
    illustration: 'hammer',
    specKeys: ['weight_kg', 'color'],
    children: [
      {
        key: 'hammers',
        slug: 'hammers',
        name: { uz: "Bolg'alar", ru: 'Молотки', en: 'Hammers' },
        description: {
          uz: "Chilangar va duradgor bolg'alari, rezina kiyankalar va kuvaldalar.",
          ru: 'Слесарные и столярные молотки, резиновые киянки и кувалды.',
          en: "Engineer's and claw hammers, rubber mallets and sledgehammers.",
        },
        icon: 'Hammer',
        illustration: 'hammer',
      },
      {
        key: 'wrenches-spanners',
        slug: 'wrenches-spanners',
        name: { uz: 'Kalitlar', ru: 'Гаечные ключи', en: 'Wrenches & Spanners' },
        description: {
          uz: 'Kombinatsiyalangan kalitlar to\'plamlari, sozlanadigan (razvodnoy) kalitlar va quvur kalitlari.',
          ru: 'Наборы комбинированных ключей, разводные и трубные ключи.',
          en: 'Combination spanner sets, adjustable wrenches and pipe wrenches.',
        },
        icon: 'Wrench',
        illustration: 'wrench',
        specKeys: ['pieces_count'],
      },
      {
        key: 'screwdrivers',
        slug: 'screwdrivers',
        name: { uz: 'Otvyortkalar', ru: 'Отвёртки', en: 'Screwdrivers' },
        description: {
          uz: 'Shlitsli, krestsimon va dielektrik otvyortkalar hamda almashtiriladigan bitli otvyortka to\'plamlari.',
          ru: 'Шлицевые, крестовые и диэлектрические отвёртки, наборы отвёрток со сменными битами.',
          en: 'Slotted, cross-head and insulated screwdrivers plus screwdriver sets with interchangeable bits.',
        },
        icon: 'CirclePlus',
        illustration: 'screwdriver_set',
        specKeys: ['pieces_count'],
      },
      {
        key: 'pliers',
        slug: 'pliers',
        name: { uz: 'Ombirlar va passatijlar', ru: 'Плоскогубцы и клещи', en: 'Pliers' },
        description: {
          uz: "Passatijlar, yon kesgichlar, uzun tumshuqli va sozlanadigan ombirlar elektr va santexnika ishlari uchun.",
          ru: 'Пассатижи, бокорезы, длинногубцы и переставные клещи для электромонтажа и сантехники.',
          en: 'Combination pliers, side cutters, long-nose and groove-joint pliers for electrical and plumbing work.',
        },
        icon: 'Scissors',
        illustration: 'pliers',
      },
    ],
  },

  // 3 ─────────────────────────────────────────────────────────────────────
  {
    key: 'water-pumps',
    slug: 'water-pumps',
    name: { uz: 'Suv nasoslari', ru: 'Водяные насосы', en: 'Water Pumps' },
    description: {
      uz: "Quduq, yer usti va drenaj nasoslari hamda nasos stansiyalari — xonadonni suv bilan ta'minlash, sug'orish va suvni chiqarish uchun.",
      ru: 'Скважинные, поверхностные и дренажные насосы и насосные станции для водоснабжения дома, полива и откачки воды.',
      en: 'Borehole, surface and drainage pumps plus pumping stations for home water supply, irrigation and dewatering.',
    },
    icon: 'Droplets',
    illustration: 'pump_submersible',
    specKeys: ['power_w', 'max_head_m', 'max_flow_m3h', 'weight_kg'],
    children: [
      {
        key: 'submersible-pumps',
        slug: 'submersible-pumps',
        name: {
          uz: "Cho'kma va quduq nasoslari",
          ru: 'Погружные и скважинные насосы',
          en: 'Submersible & Borehole Pumps',
        },
        description: {
          uz: "Quduq va skvajinalardan toza suv ko'tarish uchun 3 va 4 dyuymli cho'kma nasoslar.",
          ru: 'Погружные насосы 3 и 4 дюйма для подъёма чистой воды из колодцев и скважин.',
          en: '3- and 4-inch submersible pumps for lifting clean water from wells and boreholes.',
        },
        icon: 'WavesArrowDown',
        illustration: 'pump_submersible',
      },
      {
        key: 'surface-pumps',
        slug: 'surface-pumps',
        name: { uz: 'Yer usti nasoslari', ru: 'Поверхностные насосы', en: 'Surface Pumps' },
        description: {
          uz: "Idish, ariq va sayoz quduqlardan suv olib, bog'ni sug'orish va bosimni oshirish uchun o'zi so'ruvchi nasoslar.",
          ru: 'Самовсасывающие насосы для забора воды из ёмкостей, арыков и неглубоких колодцев, полива и повышения давления.',
          en: 'Self-priming pumps that draw water from tanks, canals and shallow wells for irrigation and pressure boosting.',
        },
        icon: 'Droplet',
        illustration: 'pump_surface',
      },
      {
        key: 'pumping-stations',
        slug: 'pumping-stations',
        name: { uz: 'Nasos stansiyalari', ru: 'Насосные станции', en: 'Pumping Stations' },
        description: {
          uz: "Gidroakkumulyator va bosim relesi bilan jihozlangan, uy va dala hovlini avtomatik suv bilan ta'minlovchi stansiyalar.",
          ru: 'Станции с гидроаккумулятором и реле давления для автоматического водоснабжения дома и дачи.',
          en: 'Stations with a pressure tank and pressure switch that supply a house or dacha with water automatically.',
        },
        icon: 'ShowerHead',
        illustration: 'pump_surface',
        specKeys: ['tank_volume_l', 'max_pressure_bar'],
      },
      {
        key: 'drainage-pumps',
        slug: 'drainage-pumps',
        name: { uz: 'Drenaj nasoslari', ru: 'Дренажные насосы', en: 'Drainage Pumps' },
        description: {
          uz: "Yerto'la, chuqur va hovuzlardan loyqa suvni chiqarish uchun qalqovichli nasoslar.",
          ru: 'Насосы с поплавком для откачки грязной воды из подвалов, котлованов и бассейнов.',
          en: 'Float-switch pumps for removing dirty water from basements, pits and pools.',
        },
        icon: 'Waves',
        illustration: 'pump_submersible',
      },
    ],
  },

  // 4 ─────────────────────────────────────────────────────────────────────
  {
    key: 'compressors',
    slug: 'compressors',
    name: { uz: 'Kompressorlar', ru: 'Компрессоры', en: 'Air Compressors' },
    description: {
      uz: "Pnevmoasboblar, bo'yash, shinalarni damlash va ustaxona ishlari uchun porshenli kompressorlar.",
      ru: 'Поршневые компрессоры для пневмоинструмента, покраски, подкачки шин и работы в мастерской.',
      en: 'Piston compressors for air tools, spray painting, tyre inflation and workshop use.',
    },
    icon: 'Gauge',
    illustration: 'compressor',
    specKeys: ['tank_volume_l', 'max_pressure_bar', 'air_output_l_min', 'power_w', 'noise_db', 'weight_kg'],
    children: [
      {
        key: 'oil-compressors',
        slug: 'oil-compressors',
        name: { uz: 'Moyli kompressorlar', ru: 'Масляные компрессоры', en: 'Oil-Lubricated Compressors' },
        description: {
          uz: "To'g'ridan-to'g'ri uzatmali moyli kompressorlar: uzoq resurs va barqaror bosim talab qilinadigan ishlar uchun.",
          ru: 'Масляные компрессоры с прямым приводом для работ, где важны ресурс и стабильное давление.',
          en: 'Direct-drive oil-lubricated compressors for jobs that need long service life and steady pressure.',
        },
        icon: 'CircleGauge',
        illustration: 'compressor',
      },
      {
        key: 'oil-free-compressors',
        slug: 'oil-free-compressors',
        name: { uz: 'Moysiz kompressorlar', ru: 'Безмасляные компрессоры', en: 'Oil-Free Compressors' },
        description: {
          uz: "Moy almashtirishni talab qilmaydigan yengil kompressorlar: shinalarni damlash, puflash va kichik bo'yash ishlari uchun.",
          ru: 'Лёгкие компрессоры, не требующие замены масла, для подкачки шин, продувки и небольших покрасочных работ.',
          en: 'Light compressors with no oil to change, for tyre inflation, blowing out and small painting jobs.',
        },
        icon: 'Wind',
        illustration: 'compressor',
      },
      {
        key: 'belt-compressors',
        slug: 'belt-compressors',
        name: { uz: 'Tasmali uzatmali kompressorlar', ru: 'Ременные компрессоры', en: 'Belt-Driven Compressors' },
        description: {
          uz: 'Avtoservis va ishlab chiqarish uchun past aylanishli, uzoq vaqt uzluksiz ishlaydigan tasmali kompressorlar.',
          ru: 'Низкооборотные ременные компрессоры для автосервиса и производства, рассчитанные на длительную работу.',
          en: 'Low-speed belt-driven compressors for car service and production, built for long working cycles.',
        },
        icon: 'Fan',
        illustration: 'compressor',
      },
    ],
  },

  // 5 ─────────────────────────────────────────────────────────────────────
  {
    key: 'generators',
    slug: 'generators',
    name: { uz: 'Generatorlar', ru: 'Генераторы', en: 'Generators' },
    description: {
      uz: "Uy, do'kon va qurilish maydoni uchun benzinli, invertorli va dizel elektr stansiyalari.",
      ru: 'Бензиновые, инверторные и дизельные электростанции для дома, магазина и стройплощадки.',
      en: 'Petrol, inverter and diesel generators for homes, shops and construction sites.',
    },
    icon: 'Zap',
    illustration: 'generator_open',
    specKeys: ['rated_power_kw', 'fuel_type', 'start_type', 'noise_db', 'weight_kg'],
    children: [
      {
        key: 'petrol-generators',
        slug: 'petrol-generators',
        name: { uz: 'Benzinli generatorlar', ru: 'Бензиновые генераторы', en: 'Petrol Generators' },
        description: {
          uz: "Elektr uzilishlarida uy va ofisni zaxira quvvat bilan ta'minlovchi ochiq ramali generatorlar.",
          ru: 'Генераторы открытого типа для резервного питания дома и офиса при отключениях электричества.',
          en: 'Open-frame generators that keep a home or office running during power cuts.',
        },
        icon: 'Fuel',
        illustration: 'generator_open',
      },
      {
        key: 'inverter-generators',
        slug: 'inverter-generators',
        name: { uz: 'Invertorli generatorlar', ru: 'Инверторные генераторы', en: 'Inverter Generators' },
        description: {
          uz: 'Kompyuter, qozon avtomatikasi va sezgir texnika uchun barqaror kuchlanish beruvchi past shovqinli generatorlar.',
          ru: 'Тихие генераторы со стабильным напряжением для компьютеров, автоматики котлов и чувствительной техники.',
          en: 'Quiet generators with clean, stable voltage for computers, boiler controls and sensitive electronics.',
        },
        icon: 'PlugZap',
        illustration: 'generator_inverter',
      },
      {
        key: 'diesel-generators',
        slug: 'diesel-generators',
        name: { uz: 'Dizel generatorlar', ru: 'Дизельные генераторы', en: 'Diesel Generators' },
        description: {
          uz: "Uzoq muddatli yuklama uchun tejamkor dizel generatorlar: fermer xo'jaliklari, sexlar va qurilish obyektlari uchun.",
          ru: 'Экономичные дизельные генераторы для длительной нагрузки на фермах, в цехах и на стройобъектах.',
          en: 'Fuel-efficient diesel generators for long-duration loads on farms, in workshops and on building sites.',
        },
        icon: 'Power',
        illustration: 'generator_open',
      },
    ],
  },

  // 6 ─────────────────────────────────────────────────────────────────────
  {
    key: 'welding-equipment',
    slug: 'welding-equipment',
    name: { uz: 'Payvandlash uskunalari', ru: 'Сварочное оборудование', en: 'Welding Equipment' },
    description: {
      uz: 'Invertorli va yarim avtomat payvandlash apparatlari hamda payvandchi niqoblari — uy ustaxonasidan sanoat ishlarigacha.',
      ru: 'Сварочные инверторы и полуавтоматы, сварочные маски — от домашней мастерской до производства.',
      en: 'Inverter and MIG welders plus welding helmets — from the home workshop to industrial jobs.',
    },
    icon: 'Flame',
    illustration: 'welder_inverter',
    specKeys: ['weight_kg'],
    children: [
      {
        key: 'mma-welders',
        slug: 'mma-welders',
        name: {
          uz: 'Invertorli payvandlash apparatlari (MMA)',
          ru: 'Сварочные инверторы MMA',
          en: 'MMA Inverter Welders',
        },
        description: {
          uz: 'Elektrod bilan payvandlash uchun ixcham invertorlar; past kuchlanishda ham barqaror yoy beradi.',
          ru: 'Компактные инверторы для сварки штучным электродом, держат дугу и при пониженном напряжении.',
          en: 'Compact inverters for stick welding that hold a stable arc even on low mains voltage.',
        },
        icon: 'Zap',
        illustration: 'welder_inverter',
        specKeys: ['welding_current_max_a', 'electrode_diameter_mm'],
      },
      {
        key: 'mig-welders',
        slug: 'mig-welders',
        name: {
          uz: 'Yarim avtomat payvandlash apparatlari (MIG/MAG)',
          ru: 'Сварочные полуавтоматы MIG/MAG',
          en: 'MIG/MAG Welders',
        },
        description: {
          uz: 'Himoya gazida va gazsiz kukunli simda payvandlash uchun yarim avtomatlar: kuzov, yupqa metall va konstruksiyalar uchun.',
          ru: 'Полуавтоматы для сварки в защитном газе и порошковой проволокой — кузова, тонкий металл, конструкции.',
          en: 'Semi-automatic welders for gas-shielded and flux-cored wire — car bodies, thin sheet and structures.',
        },
        icon: 'Cable',
        illustration: 'welder_inverter',
        specKeys: ['welding_current_max_a'],
      },
      {
        key: 'welding-helmets',
        slug: 'welding-helmets',
        name: { uz: 'Payvandchi niqoblari', ru: 'Сварочные маски', en: 'Welding Helmets' },
        description: {
          uz: "Avtomatik qorayadigan filtrli (xameleon) niqoblar ko'z va yuzni yoy nuridan himoya qiladi.",
          ru: 'Маски-хамелеоны с автоматически затемняющимся фильтром защищают глаза и лицо от излучения дуги.',
          en: 'Auto-darkening helmets that protect the eyes and face from arc radiation.',
        },
        icon: 'Shield',
        illustration: 'welding_helmet',
        specKeys: ['color'],
      },
    ],
  },

  // 7 ─────────────────────────────────────────────────────────────────────
  {
    key: 'construction-equipment',
    slug: 'construction-equipment',
    name: { uz: 'Qurilish uskunalari', ru: 'Строительное оборудование', en: 'Construction Equipment' },
    description: {
      uz: "Beton qorgichlar, plitka kesgichlar va buzish bolg'alari — qurilish maydoni va ta'mirlash ishlari uchun.",
      ru: 'Бетономешалки, плиткорезы и отбойные молотки для стройплощадки и ремонта.',
      en: 'Concrete mixers, tile cutters and demolition hammers for building sites and renovation.',
    },
    icon: 'Construction',
    illustration: 'concrete_mixer',
    specKeys: ['power_w', 'weight_kg'],
    children: [
      {
        key: 'concrete-mixers',
        slug: 'concrete-mixers',
        name: { uz: 'Beton qorgichlar', ru: 'Бетономешалки', en: 'Concrete Mixers' },
        description: {
          uz: 'Beton, qorishma va shtukaturka tayyorlash uchun elektr beton qorgichlar.',
          ru: 'Электрические бетономешалки для приготовления бетона, кладочного раствора и штукатурки.',
          en: 'Electric mixers for concrete, mortar and plaster.',
        },
        icon: 'Cylinder',
        illustration: 'concrete_mixer',
        specKeys: ['drum_volume_l'],
      },
      {
        key: 'tile-cutters',
        slug: 'tile-cutters',
        name: { uz: 'Plitka kesgichlar', ru: 'Плиткорезы', en: 'Tile Cutters' },
        description: {
          uz: "Keramik plitka va keramogranitni tekis kesish uchun qo'lda va elektr (suvli) plitka kesgichlar.",
          ru: 'Ручные и электрические (с водяным охлаждением) плиткорезы для ровного реза плитки и керамогранита.',
          en: 'Manual and electric wet tile cutters for clean cuts in ceramic tiles and porcelain stoneware.',
        },
        icon: 'Grid2x2',
        illustration: 'tile_cutter',
        specKeys: ['cutting_length_mm'],
      },
      {
        key: 'demolition-hammers',
        slug: 'demolition-hammers',
        name: { uz: "Buzish bolg'alari", ru: 'Отбойные молотки', en: 'Demolition Hammers' },
        description: {
          uz: "Beton, g'isht va asfaltni buzish hamda devorlarda ariqcha (shtroba) ochish uchun kuchli elektr bolg'alar.",
          ru: 'Мощные электрические молотки для демонтажа бетона, кирпича и асфальта и штробления стен.',
          en: 'Powerful electric breakers for demolishing concrete, brick and asphalt and cutting wall chases.',
        },
        icon: 'Pickaxe',
        illustration: 'rotary_hammer',
        specKeys: ['impact_energy_j'],
      },
    ],
  },

  // 8 ─────────────────────────────────────────────────────────────────────
  {
    key: 'garden-equipment',
    slug: 'garden-equipment',
    name: { uz: "Bog' texnikasi", ru: 'Садовая техника', en: 'Garden Equipment' },
    description: {
      uz: "Maysa o'rish mashinalari, trimmerlar va zanjirli arralar — hovli, bog' va dala hovli uchun.",
      ru: 'Газонокосилки, триммеры и цепные пилы для двора, сада и дачи.',
      en: 'Lawn mowers, trimmers and chainsaws for yards, orchards and country houses.',
    },
    icon: 'Trees',
    illustration: 'lawn_mower',
    specKeys: ['fuel_type', 'power_w', 'weight_kg'],
    children: [
      {
        key: 'lawn-mowers',
        slug: 'lawn-mowers',
        name: { uz: "Maysa o'rish mashinalari", ru: 'Газонокосилки', en: 'Lawn Mowers' },
        description: {
          uz: "Uy oldi maysazorlari va katta hovlilar uchun elektr va benzinli maysa o'rish mashinalari.",
          ru: 'Электрические и бензиновые газонокосилки для приусадебных газонов и больших участков.',
          en: 'Electric and petrol mowers for front lawns and large plots.',
        },
        icon: 'Sprout',
        illustration: 'lawn_mower',
        specKeys: ['cutting_width_cm', 'start_type'],
      },
      {
        key: 'grass-trimmers',
        slug: 'grass-trimmers',
        name: { uz: 'Trimmerlar', ru: 'Триммеры', en: 'Grass Trimmers' },
        description: {
          uz: "Ariq bo'yi, devor tagi va notekis joylarda o't o'rish uchun elektr va benzinli trimmerlar.",
          ru: 'Электрические и бензиновые триммеры для покоса вдоль арыков, заборов и на неровных участках.',
          en: 'Electric and petrol trimmers for cutting grass along ditches, fences and on uneven ground.',
        },
        icon: 'Leaf',
        illustration: 'grass_trimmer',
        specKeys: ['cutting_width_cm'],
      },
      {
        key: 'chainsaws',
        slug: 'chainsaws',
        name: { uz: 'Zanjirli arralar', ru: 'Цепные пилы', en: 'Chainsaws' },
        description: {
          uz: "Daraxt butash, o'tin tayyorlash va yog'och kesish uchun benzinli va elektr zanjirli arralar.",
          ru: 'Бензиновые и электрические цепные пилы для обрезки деревьев, заготовки дров и распила древесины.',
          en: 'Petrol and electric chainsaws for pruning trees, cutting firewood and sawing timber.',
        },
        icon: 'Axe',
        illustration: 'chainsaw',
        specKeys: ['bar_length_cm'],
      },
    ],
  },

  // 9 ─────────────────────────────────────────────────────────────────────
  {
    key: 'pressure-washers',
    slug: 'pressure-washers',
    name: {
      uz: 'Yuqori bosimli yuvish apparatlari',
      ru: 'Мойки высокого давления',
      en: 'Pressure Washers',
    },
    description: {
      uz: 'Avtomobil, hovli, fasad va texnikani yuvish uchun elektr va benzinli yuvish apparatlari.',
      ru: 'Электрические и бензиновые мойки для автомобиля, двора, фасада и техники.',
      en: 'Electric and petrol pressure washers for cars, yards, facades and machinery.',
    },
    icon: 'SprayCan',
    illustration: 'pressure_washer',
    specKeys: ['max_pressure_bar', 'power_w', 'weight_kg'],
    children: [
      {
        key: 'electric-pressure-washers',
        slug: 'electric-pressure-washers',
        name: { uz: 'Elektr yuvish apparatlari', ru: 'Электрические мойки', en: 'Electric Pressure Washers' },
        description: {
          uz: "Uy va avtomobil uchun 220 V tarmoqdan ishlaydigan yuvish apparatlari — ko'pik bilan yuvish imkoniyati bilan.",
          ru: 'Мойки от сети 220 В для дома и автомобиля с возможностью пенной мойки.',
          en: '220 V washers for home and car cleaning, with foam washing capability.',
        },
        icon: 'Plug',
        illustration: 'pressure_washer',
      },
      {
        key: 'petrol-pressure-washers',
        slug: 'petrol-pressure-washers',
        name: { uz: 'Benzinli yuvish apparatlari', ru: 'Бензиновые мойки', en: 'Petrol Pressure Washers' },
        description: {
          uz: "Elektr tarmog'i yo'q joylarda texnika, ferma va obyektlarni tozalash uchun avtonom yuvish apparatlari.",
          ru: 'Автономные мойки для очистки техники, ферм и объектов там, где нет электросети.',
          en: 'Self-contained washers for cleaning machinery, farms and sites where there is no mains power.',
        },
        icon: 'Fuel',
        illustration: 'pressure_washer',
      },
    ],
  },

  // 10 ────────────────────────────────────────────────────────────────────
  {
    key: 'measuring-tools',
    slug: 'measuring-tools',
    name: { uz: "O'lchov asboblari", ru: 'Измерительный инструмент', en: 'Measuring Tools' },
    description: {
      uz: "Lazerli nivelirlar, masofa o'lchagichlar, ruletkalar va multimetrlar — aniq belgilash va tekshirish uchun.",
      ru: 'Лазерные нивелиры, дальномеры, рулетки и мультиметры для точной разметки и проверки.',
      en: 'Laser levels, distance meters, tape measures and multimeters for accurate layout and testing.',
    },
    icon: 'Ruler',
    illustration: 'laser_level',
    specKeys: ['measuring_range_m', 'weight_kg'],
    children: [
      {
        key: 'laser-levels',
        slug: 'laser-levels',
        name: { uz: 'Lazerli nivelirlar', ru: 'Лазерные нивелиры', en: 'Laser Levels' },
        description: {
          uz: "Plitka yotqizish, gipsokarton va shiftlarni o'rnatishda gorizontal va vertikal chiziqlar tushiruvchi o'z-o'zini tekislovchi nivelirlar.",
          ru: 'Самовыравнивающиеся нивелиры, проецирующие горизонтальные и вертикальные линии при укладке плитки, монтаже гипсокартона и потолков.',
          en: 'Self-levelling lasers that project horizontal and vertical lines for tiling, drywall and ceiling installation.',
        },
        icon: 'Crosshair',
        illustration: 'laser_level',
        specKeys: ['laser_lines', 'laser_color'],
      },
      {
        key: 'laser-rangefinders',
        slug: 'laser-rangefinders',
        name: {
          uz: "Lazerli masofa o'lchagichlar",
          ru: 'Лазерные дальномеры',
          en: 'Laser Distance Meters',
        },
        description: {
          uz: "Masofa, maydon va hajmni bir tugma bilan o'lchaydigan lazerli ruletkalar.",
          ru: 'Лазерные рулетки, которые одной кнопкой измеряют расстояние, площадь и объём помещения.',
          en: 'Laser measures that calculate distance, area and volume at the press of a button.',
        },
        icon: 'Radar',
        illustration: 'rangefinder',
      },
      {
        key: 'tape-measures',
        slug: 'tape-measures',
        name: { uz: 'Ruletkalar', ru: 'Рулетки', en: 'Tape Measures' },
        description: {
          uz: "Qurilish, mebel va chilangarlik ishlari uchun magnitli ilgakli po'lat lentali ruletkalar.",
          ru: 'Рулетки со стальной лентой и магнитным крючком для стройки, мебельного и слесарного дела.',
          en: 'Steel-blade tape measures with magnetic hooks for construction, joinery and metalwork.',
        },
        icon: 'RulerDimensionLine',
        illustration: 'tape_measure',
        specKeys: ['tape_length_m'],
      },
      {
        key: 'multimeters',
        slug: 'multimeters',
        name: { uz: 'Multimetrlar', ru: 'Мультиметры', en: 'Multimeters' },
        description: {
          uz: "Kuchlanish, tok va qarshilikni o'lchash hamda elektr zanjirlarini tekshirish uchun raqamli multimetrlar.",
          ru: 'Цифровые мультиметры для измерения напряжения, тока и сопротивления и проверки электроцепей.',
          en: 'Digital multimeters for measuring voltage, current and resistance and checking circuits.',
        },
        icon: 'Activity',
        illustration: 'multimeter',
      },
    ],
  },

  // 11 ────────────────────────────────────────────────────────────────────
  {
    key: 'accessories',
    slug: 'accessories',
    name: { uz: 'Aksessuarlar', ru: 'Аксессуары', en: 'Accessories' },
    description: {
      uz: "Akkumulyatorlar, zaryadlash qurilmalari, parmalar va burlar — asboblaringizdan to'liq foydalanish uchun.",
      ru: 'Аккумуляторы, зарядные устройства, свёрла и буры, чтобы инструмент работал в полную силу.',
      en: 'Batteries, chargers, drill and masonry bits that keep your tools working at full capacity.',
    },
    icon: 'Package',
    illustration: 'battery_charger',
    children: [
      {
        key: 'batteries',
        slug: 'batteries',
        name: { uz: 'Akkumulyatorlar', ru: 'Аккумуляторы', en: 'Batteries' },
        description: {
          uz: '18 V platformali akkumulyatorli asboblar uchun Li-ion batareyalar.',
          ru: 'Литий-ионные аккумуляторы для инструмента платформы 18 В.',
          en: 'Li-ion battery packs for 18 V platform tools.',
        },
        icon: 'BatteryFull',
        illustration: 'battery_charger',
        specKeys: ['voltage_v', 'battery_capacity_ah'],
      },
      {
        key: 'chargers',
        slug: 'chargers',
        name: { uz: 'Zaryadlash qurilmalari', ru: 'Зарядные устройства', en: 'Chargers' },
        description: {
          uz: 'Brend akkumulyatorlari uchun standart va tez zaryadlash qurilmalari.',
          ru: 'Стандартные и быстрые зарядные устройства для аккумуляторов бренда.',
          en: "Standard and fast chargers for the brand's battery packs.",
        },
        icon: 'BatteryCharging',
        illustration: 'battery_charger',
        specKeys: ['voltage_v'],
      },
      {
        key: 'drill-bits',
        slug: 'drill-bits',
        name: { uz: 'Parmalar va burlar', ru: 'Свёрла и буры', en: 'Drill & Masonry Bits' },
        description: {
          uz: "Metall, yog'och va beton uchun parmalar hamda SDS-plus burlar to'plamlari.",
          ru: 'Наборы свёрл по металлу, дереву и бетону и буров SDS-plus.',
          en: 'Sets of metal, wood and concrete drill bits and SDS-plus masonry bits.',
        },
        icon: 'Diameter',
        illustration: 'drill_bit_set',
        specKeys: ['pieces_count'],
      },
    ],
  },

  // 12 ────────────────────────────────────────────────────────────────────
  {
    key: 'consumables',
    slug: 'consumables',
    name: { uz: 'Sarf materiallari', ru: 'Расходные материалы', en: 'Consumables' },
    description: {
      uz: 'Kesish disklari, payvandlash elektrodlari va arra disklari — doim zaxirada turishi kerak bo\'lgan mahsulotlar.',
      ru: 'Отрезные диски, сварочные электроды и пильные диски — то, что всегда должно быть в запасе.',
      en: 'Cutting discs, welding electrodes and saw blades — the supplies you should always keep in stock.',
    },
    icon: 'Disc',
    illustration: 'cutting_disc',
    children: [
      {
        key: 'cutting-discs',
        slug: 'cutting-discs',
        name: { uz: 'Kesish disklari', ru: 'Отрезные диски', en: 'Cutting Discs' },
        description: {
          uz: "Metall, zanglamaydigan po'lat va tosh uchun abraziv kesish disklari.",
          ru: 'Абразивные отрезные круги по металлу, нержавеющей стали и камню.',
          en: 'Abrasive cutting discs for steel, stainless steel and stone.',
        },
        icon: 'Disc',
        illustration: 'cutting_disc',
        specKeys: ['disc_diameter_mm', 'pieces_count'],
      },
      {
        key: 'welding-electrodes',
        slug: 'welding-electrodes',
        name: { uz: 'Payvandlash elektrodlari', ru: 'Сварочные электроды', en: 'Welding Electrodes' },
        description: {
          uz: "Uglerodli po'lat va quvurlarni payvandlash uchun rutil va asosiy qoplamali elektrodlar.",
          ru: 'Электроды с рутиловым и основным покрытием для сварки углеродистой стали и труб.',
          en: 'Rutile and basic-coated electrodes for welding carbon steel and pipes.',
        },
        icon: 'Sparkles',
        illustration: 'welding_electrodes',
        specKeys: ['electrode_diameter_mm'],
      },
      {
        key: 'saw-blades',
        slug: 'saw-blades',
        name: { uz: 'Arra disklari', ru: 'Пильные диски', en: 'Saw Blades' },
        description: {
          uz: "Diskli arralar va tortsovkalar uchun yog'och, laminat va alyuminiyga mo'ljallangan qattiq qotishmali disklar.",
          ru: 'Твердосплавные пильные диски по дереву, ламинату и алюминию для циркулярных и торцовочных пил.',
          en: 'Carbide-tipped blades for wood, laminate and aluminium on circular and mitre saws.',
        },
        icon: 'Disc2',
        illustration: 'saw_blade',
        specKeys: ['disc_diameter_mm', 'teeth_count'],
      },
    ],
  },

  // 13 ────────────────────────────────────────────────────────────────────
  {
    key: 'spare-parts',
    slug: 'spare-parts',
    name: { uz: 'Ehtiyot qismlar', ru: 'Запчасти', en: 'Spare Parts' },
    description: {
      uz: 'Asbobni tez tiklash uchun ko\'mir cho\'tkalar, patronlar va boshqa ehtiyot qismlar.',
      ru: 'Угольные щётки, патроны и другие запчасти для быстрого восстановления инструмента.',
      en: 'Carbon brushes, chucks and other parts to get your tools back to work quickly.',
    },
    icon: 'Cog',
    illustration: 'carbon_brushes',
    children: [
      {
        key: 'carbon-brushes',
        slug: 'carbon-brushes',
        name: { uz: "Ko'mir cho'tkalar", ru: 'Угольные щётки', en: 'Carbon Brushes' },
        description: {
          uz: "Bolgarka, perforator va drellar dvigatellari uchun grafit-mis cho'tkalar juftliklari.",
          ru: 'Пары графито-медных щёток для двигателей болгарок, перфораторов и дрелей.',
          en: 'Pairs of copper-graphite brushes for grinder, rotary hammer and drill motors.',
        },
        icon: 'Magnet',
        illustration: 'carbon_brushes',
      },
      {
        key: 'drill-chucks',
        slug: 'drill-chucks',
        name: { uz: 'Drel patronlari', ru: 'Патроны для дрелей', en: 'Drill Chucks' },
        description: {
          uz: 'Drel va shurupovertlar uchun tez qisiladigan va kalitli almashtiriladigan patronlar.',
          ru: 'Сменные быстрозажимные и ключевые патроны для дрелей и шуруповёртов.',
          en: 'Replacement keyless and keyed chucks for drills and drill drivers.',
        },
        icon: 'Aperture',
        illustration: 'drill_chuck',
        specKeys: ['chuck_size_mm', 'chuck_type'],
      },
    ],
  },

  // 14 ────────────────────────────────────────────────────────────────────
  {
    key: 'tool-sets',
    slug: 'tool-sets',
    name: { uz: "Asboblar to'plamlari", ru: 'Наборы инструментов', en: 'Tool Sets' },
    description: {
      uz: "Avtomobil, uy va ustaxona uchun keysga joylangan tayyor asboblar to'plamlari.",
      ru: 'Готовые наборы инструментов в кейсах для автомобиля, дома и мастерской.',
      en: 'Ready-made tool kits in cases for the car, home and workshop.',
    },
    icon: 'ToolCase',
    illustration: 'tool_case',
    specKeys: ['pieces_count', 'weight_kg'],
    children: [
      {
        key: 'socket-sets',
        slug: 'socket-sets',
        name: { uz: "Torts kallaklar to'plamlari", ru: 'Наборы торцевых головок', en: 'Socket Sets' },
        description: {
          uz: "Treshotkali torts kallaklar to'plamlari — avtomobil ta'miri va texnikaga xizmat ko'rsatish uchun.",
          ru: 'Наборы торцевых головок с трещоткой для ремонта автомобиля и обслуживания техники.',
          en: 'Ratchet and socket sets for car repair and machinery servicing.',
        },
        icon: 'Hexagon',
        illustration: 'socket_set',
      },
      {
        key: 'mechanic-tool-kits',
        slug: 'mechanic-tool-kits',
        name: {
          uz: "Chilangar asboblar to'plamlari",
          ru: 'Слесарные наборы инструментов',
          en: "Mechanic's Tool Kits",
        },
        description: {
          uz: "Kalitlar, kallaklar, otvyortka va ombirlarni bitta chamadonda jamlagan professional to'plamlar.",
          ru: 'Профессиональные наборы: ключи, головки, отвёртки и плоскогубцы в одном чемодане.',
          en: 'Professional kits that combine spanners, sockets, screwdrivers and pliers in one case.',
        },
        icon: 'Toolbox',
        illustration: 'tool_case',
      },
      {
        key: 'household-tool-kits',
        slug: 'household-tool-kits',
        name: {
          uz: "Uy uchun asboblar to'plamlari",
          ru: 'Бытовые наборы инструментов',
          en: 'Household Tool Kits',
        },
        description: {
          uz: "Mebel yig'ish, javon osish va mayda ta'mirlash uchun uy xo'jaligiga mo'ljallangan to'plamlar.",
          ru: 'Наборы для дома: сборка мебели, навеска полок и мелкий ремонт.',
          en: 'Home kits for assembling furniture, hanging shelves and small repairs.',
        },
        icon: 'Briefcase',
        illustration: 'tool_case',
      },
    ],
  },

  // 15 ────────────────────────────────────────────────────────────────────
  {
    key: 'industrial-equipment',
    slug: 'industrial-equipment',
    name: { uz: 'Sanoat uskunalari', ru: 'Промышленное оборудование', en: 'Industrial Equipment' },
    description: {
      uz: 'Ustaxona va ishlab chiqarish uchun parmalash va charxlash dastgohlari.',
      ru: 'Сверлильные и точильные станки для мастерских и производства.',
      en: 'Drill presses and bench grinders for workshops and production.',
    },
    icon: 'Factory',
    illustration: 'drill_press',
    specKeys: ['power_w', 'weight_kg'],
    children: [
      {
        key: 'drill-presses',
        slug: 'drill-presses',
        name: { uz: 'Parmalash dastgohlari', ru: 'Сверлильные станки', en: 'Drill Presses' },
        description: {
          uz: "Metall va yog'ochda aniq perpendikulyar teshiklar ochish uchun stol va kolonna tipidagi dastgohlar.",
          ru: 'Настольные и колонные станки для точного перпендикулярного сверления металла и дерева.',
          en: 'Bench and floor drill presses for accurate square holes in metal and wood.',
        },
        icon: 'Target',
        illustration: 'drill_press',
        specKeys: ['chuck_size_mm'],
      },
      {
        key: 'bench-grinders',
        slug: 'bench-grinders',
        name: { uz: 'Charxlash dastgohlari', ru: 'Точильные станки', en: 'Bench Grinders' },
        description: {
          uz: "Keskichlar, parmalar va bog' asboblarini charxlash uchun ikki toshli charxlar.",
          ru: 'Двухдисковые точила для заточки резцов, свёрл и садового инструмента.',
          en: 'Double-wheel grinders for sharpening chisels, drill bits and garden tools.',
        },
        icon: 'Anvil',
        illustration: 'bench_grinder',
        specKeys: ['disc_diameter_mm'],
      },
    ],
  },
];

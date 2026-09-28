/**
 * Seed data contracts. Seed files under ./data only contain plain data that
 * follows these interfaces; ../index.ts maps them onto Mongoose models and
 * creates media (illustrations) through the real media service.
 *
 * All customer-facing strings are multilingual: uz (Uzbek, Latin script), ru, en.
 */

export interface L {
  uz: string;
  ru: string;
  en: string;
}

/** Illustration keys implemented by ../assets (one SVG per key). */
export const TOOL_TYPES = [
  // power tools
  'drill_cordless',
  'rotary_hammer',
  'angle_grinder',
  'circular_saw',
  'jigsaw',
  'impact_wrench',
  // hand tools
  'hammer',
  'wrench',
  'screwdriver_set',
  'pliers',
  // pumps
  'pump_submersible',
  'pump_surface',
  // compressors
  'compressor',
  // generators
  'generator_open',
  'generator_inverter',
  // welding
  'welder_inverter',
  'welding_helmet',
  // construction
  'concrete_mixer',
  'tile_cutter',
  // garden
  'lawn_mower',
  'grass_trimmer',
  'chainsaw',
  // cleaning
  'pressure_washer',
  // measuring
  'laser_level',
  'rangefinder',
  'tape_measure',
  'multimeter',
  // accessories
  'battery_charger',
  'drill_bit_set',
  // consumables
  'cutting_disc',
  'welding_electrodes',
  'saw_blade',
  // spare parts
  'carbon_brushes',
  'drill_chuck',
  // sets
  'socket_set',
  'tool_case',
  // industrial
  'drill_press',
  'bench_grinder',
] as const;
export type ToolType = (typeof TOOL_TYPES)[number];

export type SpecGroup = 'main' | 'power' | 'performance' | 'dimensions' | 'equipment' | 'general';

export interface SeedSpecDefinition {
  /** machine key, snake_case, e.g. "power_w", "voltage_v", "weight_kg" */
  key: string;
  label: L;
  /** display unit, e.g. "W", "V", "kg", "mm", "rpm", "L", "bar", "m³/h", "Ah", "Nm", "A", "kW", "kVA", "m", "pcs" */
  unit?: string;
  type: 'number' | 'text' | 'boolean';
  /** shown as a filter in the catalog (numbers → range slider, text → checkbox list, boolean → toggle) */
  filterable: boolean;
  group: SpecGroup;
  /** order inside the specifications table (lower first) */
  order: number;
}

export interface SeedCategory {
  /** unique stable key used by other seed files, e.g. "power-tools", "drills" */
  key: string;
  /** URL slug (latin, kebab-case, unique across all categories) */
  slug: string;
  name: L;
  description: L;
  /** lucide icon name in PascalCase, e.g. "Drill", "Hammer", "Droplets" */
  icon: string;
  /** illustration used for the category image */
  illustration: ToolType;
  /** keys of SeedSpecDefinition that are filterable in this category (children inherit parent keys) */
  specKeys?: string[];
  children?: SeedCategory[];
}

export interface SeedBrand {
  key: string;
  slug: string;
  name: string;
  country: L;
  description: L;
  website?: string;
  /** hex colour of the brand's tools body, used to tint product illustrations */
  color: string;
  /** optional secondary hex colour for accents on illustrations */
  accent?: string;
  founded?: number;
}

export type SeedSpecValue = number | string | boolean | L;

export interface SeedVariant {
  sku: string;
  name: L;
  /** option name → value (both plain strings, short, e.g. { "kit": "2×4.0Ah" }) */
  attributes: Record<string, string>;
  price: number;
  oldPrice?: number;
  costPrice: number;
  stock: number;
}

export interface SeedProduct {
  sku: string;
  slug: string;
  brand: string; // SeedBrand.key
  category: string; // leaf SeedCategory.key
  illustration: ToolType;
  name: L;
  shortDescription: L;
  /** Markdown, 2–4 short paragraphs and/or bullet lists */
  description: L;
  /** current selling price in UZS (integer, realistic for Uzbekistan in 2026) */
  price: number;
  /** compare-at price in UZS (> price) when the product is discounted */
  oldPrice?: number;
  /** purchase cost in UZS (< price, typical margin 18–40%) */
  costPrice: number;
  stock: number;
  minStock: number;
  warrantyMonths: number;
  deliveryDays: { min: number; max: number };
  /** keys must exist in SPEC_DEFINITIONS; numeric specs as numbers; free text as L */
  specs: Array<{ key: string; value: SeedSpecValue }>;
  tags: string[];
  flags?: { featured?: boolean; isNew?: boolean; bestseller?: boolean };
  weightKg: number;
  variants?: SeedVariant[];
  seoTitle?: L;
  seoDescription?: L;
  /** optional YouTube video id(s) for product videos */
  videos?: string[];
}

export interface SeedCoupon {
  code: string;
  description: L;
  type: 'percent' | 'fixed';
  value: number;
  maxDiscount?: number;
  scope: 'all' | 'products' | 'categories' | 'brands';
  /** category/brand keys or product SKUs depending on scope */
  targets?: string[];
  minOrderAmount?: number;
  firstOrderOnly?: boolean;
  /** relative to seed time in days (negative = in the past) */
  startsInDays: number;
  expiresInDays: number;
  usageLimit?: number;
  perUserLimit?: number;
  active: boolean;
}

export interface SeedPromotion {
  slug: string;
  name: L;
  description: L;
  type: 'FLASH_SALE' | 'SEASONAL' | 'CATEGORY' | 'BRAND' | 'PRODUCT' | 'CAMPAIGN';
  discountType: 'percent' | 'fixed';
  discountValue: number;
  products?: string[]; // SKUs
  categories?: string[]; // category keys
  brands?: string[]; // brand keys
  startsInDays: number;
  endsInDays: number;
  priority: number;
  active: boolean;
  showOnHome: boolean;
  /** banner art style for the promotion card */
  art: BannerArt;
}

export type BannerArt =
  | 'power-tools'
  | 'garden'
  | 'welding'
  | 'measuring'
  | 'construction'
  | 'water'
  | 'generators'
  | 'hand-tools'
  | 'sale'
  | 'delivery';

export interface SeedBanner {
  placement: 'home_hero' | 'home_secondary' | 'home_middle' | 'catalog_top';
  title: L;
  subtitle: L;
  buttonText: L;
  /** relative storefront URL, e.g. "/catalog/power-tools" or "/promotions/spring-sale" */
  buttonUrl: string;
  art: BannerArt;
  /** 'dark' = light text on dark art, 'light' = dark text on light art */
  textTheme: 'dark' | 'light';
  priority: number;
  startsInDays: number;
  endsInDays: number;
  active: boolean;
}

export interface SeedPage {
  slug: 'about' | 'delivery' | 'warranty' | 'returns' | 'privacy' | 'terms' | 'payment' | 'contacts';
  title: L;
  /** Markdown */
  content: L;
  seoTitle: L;
  seoDescription: L;
}

export interface SeedFaq {
  category: 'orders' | 'delivery' | 'payment' | 'warranty' | 'account' | 'general';
  question: L;
  answer: L;
  order: number;
}

export interface SeedCustomer {
  firstName: string;
  lastName: string;
  /** +998XXXXXXXXX, unique */
  phone: string;
  email?: string;
  language: 'uz' | 'ru' | 'en';
  address: {
    label: string;
    region: string; // UZ region code from @vero/config
    city: string;
    district?: string;
    street: string;
    house: string;
    apartment?: string;
  };
}

export interface SeedReviewTemplate {
  rating: 1 | 2 | 3 | 4 | 5;
  language: 'uz' | 'ru' | 'en';
  title?: string;
  comment: string;
  pros?: string;
  cons?: string;
  /** illustration types this review makes sense for; empty = generic */
  fits?: ToolType[];
}

export interface SeedExpenseTemplate {
  /** ExpenseCategory code */
  category:
    | 'RENT'
    | 'SALARY'
    | 'DELIVERY'
    | 'MARKETING'
    | 'ADVERTISING'
    | 'UTILITIES'
    | 'WAREHOUSE'
    | 'PACKAGING'
    | 'EQUIPMENT'
    | 'MAINTENANCE'
    | 'TAXES'
    | 'OTHER';
  title: string;
  description?: string;
  /** UZS amount range; seed picks a value within it */
  amountMin: number;
  amountMax: number;
  /** how often it occurs */
  frequency: 'monthly' | 'weekly' | 'occasional';
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'click' | 'payme';
  responsible: string;
}

export interface SeedPickupPoint {
  code: string;
  name: L;
  address: L;
  region: string;
  city: string;
  phone: string;
  workingHours: L;
  location: { lat: number; lng: number };
}

export interface SeedDeliveryZone {
  code: string;
  name: L;
  regions: string[]; // UZ region codes
  price: number;
  freeThreshold: number;
  minDays: number;
  maxDays: number;
  priority: number;
}

import { LANGUAGES, type Language, type LocalizedText } from '@vero/config';

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  // Uzbek Cyrillic
  ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

/** Transliterates Russian / Uzbek Cyrillic into Latin (lower-case). */
export function transliterate(input: string): string {
  let out = '';
  for (const ch of input.toLowerCase()) {
    out += CYRILLIC_MAP[ch] ?? ch;
  }
  return out;
}

const APOSTROPHES = /['‘’ʻʼ`´]/g;

/**
 * Normalises text for search: lower-case, Cyrillic → Latin, unify Uzbek apostrophes (o' g'),
 * strip punctuation, collapse whitespace. Used both for indexing and for queries.
 */
export function normalizeSearch(input: string | null | undefined): string {
  if (!input) return '';
  return transliterate(input)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(APOSTROPHES, '')
    .replace(/[^a-z0-9.+×x/\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** URL-safe slug (latin, kebab-case). */
export function slugify(input: string, maxLength = 90): string {
  const s = transliterate(input)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(APOSTROPHES, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
  return s || 'item';
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Removes HTML tags and control characters from plain-text user input (XSS defence in depth). */
export function stripTags(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    // control characters are removed on purpose
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Picks a localised value with graceful fallbacks (requested → uz → ru → en → first non-empty). */
export function pickLocalized(
  value: Partial<LocalizedText> | string | null | undefined,
  lang: Language,
): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  const direct = value[lang];
  if (direct && direct.trim()) return direct;
  for (const l of LANGUAGES) {
    const v = value[l];
    if (v && v.trim()) return v;
  }
  return '';
}

export function emptyLocalized(): LocalizedText {
  return { uz: '', ru: '', en: '' };
}

export function isLocalizedComplete(value: Partial<LocalizedText> | undefined | null): boolean {
  return !!value && LANGUAGES.every((l) => !!value[l]?.trim());
}

/** Masks a name for public display: "Aziz Karimov" → "Aziz K." */
export function publicName(firstName?: string, lastName?: string): string {
  const f = (firstName ?? '').trim();
  const l = (lastName ?? '').trim();
  if (!f && !l) return '—';
  return l ? `${f} ${l[0]!.toUpperCase()}.` : f;
}

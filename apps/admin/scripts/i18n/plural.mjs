/**
 * Plural entry helper for the admin i18n sources.
 *   P("{{count}} ta mahsulot", { one: "{{count}} товар", few: "{{count}} товара", many: "{{count}} товаров" },
 *     { one: "{{count}} product", other: "{{count}} products" })
 * A plain string means "same text for every form" (Uzbek does not inflect nouns after numerals).
 */
export function P(uz, ru, en) {
  const forms = (value, keys) => {
    if (typeof value === 'string') return Object.fromEntries(keys.map((k) => [k, value]));
    const result = { ...value };
    if (keys.includes('other') && !result.other) result.other = result.many ?? result.one;
    return result;
  };
  return {
    __plural: true,
    uz: forms(uz, ['one', 'other']),
    ru: forms(ru, ['one', 'few', 'many', 'other']),
    en: forms(en, ['one', 'other']),
  };
}

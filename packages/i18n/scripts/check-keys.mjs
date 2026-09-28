// Verifies that every namespace has identical keys in uz/ru/en (plural suffixes normalised).
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'locales');
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [p + k] : flat(v, `${p}${k}.`)));
const norm = (k) => k.replace(/_(zero|one|two|few|many|other)$/, '');
let problems = 0;
const langs = ['uz', 'ru', 'en'];
const namespaces = new Set(langs.flatMap((l) => readdirSync(join(root, l)).filter((f) => f.endsWith('.json'))));
for (const ns of namespaces) {
  const sets = langs.map((l) => {
    try { return new Set(flat(JSON.parse(readFileSync(join(root, l, ns), 'utf8'))).map(norm)); } catch { return new Set(); }
  });
  const all = new Set(sets.flatMap((s) => [...s]));
  for (const key of all) {
    langs.forEach((l, i) => { if (!sets[i].has(key)) { problems++; console.log(`missing ${l}/${ns}: ${key}`); } });
  }
}
console.log(problems ? `${problems} problems` : 'all locales consistent');
process.exit(problems ? 1 : 0);

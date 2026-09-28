#!/usr/bin/env node
/**
 * Builds the admin namespace (packages/i18n/locales/{uz,ru,en}/admin.json) from ./source/*.mjs.
 *
 *   node apps/admin/scripts/i18n/build.mjs
 *
 * Every source module default-exports a tree whose leaves are
 *   ["uz", "ru", "en"]                         – a plain string in the three languages, or
 *   P(uzForms, ruForms, enForms)               – a plural (uz/en: one, other · ru: one, few, many, other).
 * Uzbek is Latin script with ASCII apostrophes (o', g'). Keys of all modules are merged; a key defined
 * twice is an error, so the three JSON files always have identical key sets.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, 'source');
const OUT = resolve(HERE, '../../../../packages/i18n/locales');
const LANGS = ['uz', 'ru', 'en'];
const FORMS = { uz: ['one', 'other'], ru: ['one', 'few', 'many', 'other'], en: ['one', 'other'] };

const out = { uz: {}, ru: {}, en: {} };
let count = 0;

function put(tree, path, value) {
  let node = tree;
  for (const part of path.slice(0, -1)) {
    if (node[part] !== undefined && typeof node[part] !== 'object') throw new Error(`key conflict at ${path.join('.')}`);
    node = node[part] ??= {};
  }
  const last = path[path.length - 1];
  if (node[last] !== undefined) throw new Error(`duplicate key ${path.join('.')}`);
  node[last] = value;
}

function check(text, where) {
  if (typeof text !== 'string' || !text.trim()) throw new Error(`empty text at ${where}`);
  if (/[‘’ʻʼ`]/.test(text) && where.includes('[uz]')) throw new Error(`non-ASCII apostrophe in Uzbek text at ${where}: ${text}`);
}

function walk(node, path) {
  if (Array.isArray(node)) {
    if (node.length !== 3) throw new Error(`${path.join('.')}: expected [uz, ru, en]`);
    LANGS.forEach((l, i) => {
      check(node[i], `${path.join('.')}[${l}]`);
      put(out[l], path, node[i]);
    });
    count += 1;
    return;
  }
  if (node && node.__plural) {
    for (const l of LANGS) {
      for (const form of FORMS[l]) {
        const text = node[l][form];
        check(text, `${path.join('.')}_${form}[${l}]`);
        put(out[l], [...path.slice(0, -1), `${path[path.length - 1]}_${form}`], text);
      }
    }
    count += 1;
    return;
  }
  if (!node || typeof node !== 'object') throw new Error(`${path.join('.')}: unsupported value ${JSON.stringify(node)}`);
  for (const [key, value] of Object.entries(node)) walk(value, [...path, key]);
}

const files = readdirSync(SOURCE).filter((f) => f.endsWith('.mjs')).sort();
for (const file of files) {
  const mod = await import(pathToFileURL(join(SOURCE, file)).href);
  walk(mod.default, []);
}

/** Stable key order: alphabetical at every level. */
function sortTree(tree) {
  return Object.fromEntries(
    Object.keys(tree)
      .sort()
      .map((k) => [k, typeof tree[k] === 'object' ? sortTree(tree[k]) : tree[k]]),
  );
}

for (const l of LANGS) {
  writeFileSync(join(OUT, l, 'admin.json'), `${JSON.stringify(sortTree(out[l]), null, 2)}\n`);
}
console.log(`admin.json: ${count} entries from ${files.length} source files → ${OUT}/{uz,ru,en}/admin.json`);

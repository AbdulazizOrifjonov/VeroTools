#!/usr/bin/env python3
"""Builds the storefront namespace `web` (packages/i18n/locales/{uz,ru,en}/web.json) from web_source.py.

Usage: python3 apps/web/scripts/i18n/build.py
Each entry is ("uz", "ru", "en") or P(uz_forms, ru_forms, en_forms) for plurals
(uz/en: one, other — ru: one, few, many, other). Uzbek uses Latin script with ASCII apostrophes (o', g')."""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from web_source import WEB  # noqa: E402

LANGS = ['uz', 'ru', 'en']
PLURAL_FORMS = {'uz': ['one', 'other'], 'ru': ['one', 'few', 'many', 'other'], 'en': ['one', 'other']}
OUT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..', 'packages', 'i18n', 'locales'))


def put(tree, dotted, value):
    parts = dotted.split('.')
    node = tree
    for p in parts[:-1]:
        if p in node and not isinstance(node[p], dict):
            raise SystemExit(f'key conflict at {dotted}')
        node = node.setdefault(p, {})
    if parts[-1] in node:
        raise SystemExit(f'duplicate key {dotted}')
    node[parts[-1]] = value


def main():
    out = {l: {} for l in LANGS}
    for key, val in WEB.items():
        if isinstance(val, dict) and val.get('__plural__'):
            for l in LANGS:
                forms = val[l]
                for f in PLURAL_FORMS[l]:
                    if not forms.get(f):
                        raise SystemExit(f'web:{key} missing plural form {l}/{f}')
                    put(out[l], f'{key}_{f}', forms[f])
        else:
            if not isinstance(val, tuple) or len(val) != 3 or any(not v for v in val):
                raise SystemExit(f'web:{key} must have 3 non-empty values')
            if "’" in val[0] or "‘" in val[0] or "ʻ" in val[0]:
                raise SystemExit(f'web:{key} uz text must use the ASCII apostrophe')
            for i, l in enumerate(LANGS):
                put(out[l], key, val[i])
    for l in LANGS:
        path = os.path.join(OUT, l, 'web.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(out[l], f, ensure_ascii=False, indent=2)
            f.write('\n')
    print(f'web: {len(WEB)} keys → {OUT}/*/web.json')


if __name__ == '__main__':
    main()

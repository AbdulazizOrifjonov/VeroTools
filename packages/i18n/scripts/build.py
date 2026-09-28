#!/usr/bin/env python3
"""Builds shared locale JSON (common, shop, validation, errors) for uz/ru/en from scripts/source/*.py.
App-specific namespaces (web, admin, mobile) are edited directly as JSON by each app."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'source'))
from common import COMMON
from shop import SHOP
from messages import VALIDATION, ERRORS

LANGS = ['uz', 'ru', 'en']
PLURAL_FORMS = {'uz': ['one', 'other'], 'ru': ['one', 'few', 'many', 'other'], 'en': ['one', 'other']}

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

def build(ns, source):
    out = {l: {} for l in LANGS}
    for key, val in source.items():
        if isinstance(val, dict) and val.get('__plural__'):
            for i, l in enumerate(LANGS):
                forms = val[l]
                for f in PLURAL_FORMS[l]:
                    if f not in forms:
                        raise SystemExit(f'{ns}:{key} missing plural form {l}/{f}')
                    put(out[l], f'{key}_{f}', forms[f])
        else:
            if len(val) != 3 or any(not v for v in val):
                raise SystemExit(f'{ns}:{key} must have 3 non-empty values')
            for i, l in enumerate(LANGS):
                put(out[l], key, val[i])
    for l in LANGS:
        d = os.path.join(HERE, '..', 'locales', l)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, f'{ns}.json'), 'w', encoding='utf-8') as f:
            json.dump(out[l], f, ensure_ascii=False, indent=2)
            f.write('\n')
    return len(source)

counts = {ns: build(ns, src) for ns, src in [('common', COMMON), ('shop', SHOP), ('validation', VALIDATION), ('errors', ERRORS)]}
print('built', counts)

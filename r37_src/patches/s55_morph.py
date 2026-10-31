"""R3.10 s55 - word forms: WQMorph (pure module, s55_morph.js) plus its wiring (s55_hook.js).
R3.26: s55_wordbank.js (open-dictionary headwords, picture emoji, irregular-form table) follows the hook.
Both go into the host closure just before the render anchor, after s50 (patch files are applied in file-name order), so
v20Dictionary / V20 / saveRange / save / imageFor are all the final versions. No CSS."""

ANCHOR = '\ninstallMediaEvents();\nrender();'


def apply(s, ctx):
    src = ctx.src
    import json, os
    bank = {k: json.loads((src / f'wordbank_{k}.json').read_text(encoding='utf8')) for k in ('ext', 'pics', 'forms', 'proper', 'phrase')}
    keep = src / 'wordbank_keep.json'
    if keep.exists() and not os.environ.get('WQ_FULL_BANK'):
        kept = set(json.loads(keep.read_text(encoding='utf8')))
        bank['ext'] = [e for e in bank['ext'] if e[0] in kept]
        bank['checked'] = True
    bank['img'] = sorted(f.stem for f in (ctx.root / 'app/assets/r326/words').glob('*.webp'))
    js = ((src / 's55_morph.js').read_text() + '\n' + (src / 's55_hook.js').read_text() + '\n'
          + 'const WQ_BANK=' + json.dumps(bank, ensure_ascii=False, separators=(',', ':')) + ';\n' + (src / 's55_wordbank.js').read_text())
    assert '</script' not in js.lower()
    return ctx.once(s, ANCHOR, '\n' + js + ANCHOR)

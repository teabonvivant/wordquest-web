"""Merge reviewer shards (_team_runs/r326/regloss/out_NN.json) into r37_src/wordbank_gloss_fix.json (only words whose gloss changed or were dropped)."""
import json
from pathlib import Path
R = Path(__file__).resolve().parents[1]
d = R / '_team_runs/r326/regloss'
fix, n_in = {}, 0
for f in sorted(d.glob('in_*.json')):
    o = d / f.name.replace('in_', 'out_')
    if not o.exists():
        continue
    a, b = json.loads(f.read_text()), json.loads(o.read_text())
    assert len(a) == len(b) and all(x['word'] == y['word'] for x, y in zip(a, b)), f.name
    for x, y in zip(a, b):
        n_in += 1
        g = '' if y.get('drop') else y['gloss'].strip()
        if y.get('drop') or (g and g != x['gloss']):
            assert y.get('drop') or all(':' in p for p in g.split('|')), (x['word'], g)
            fix[x['word']] = g
(R / 'r37_src/wordbank_gloss_fix.json').write_text(json.dumps(fix, ensure_ascii=False, sort_keys=True, separators=(',', ':')))
print('reviewed', n_in, 'changed/dropped', len(fix), 'dropped', sum(1 for v in fix.values() if not v))

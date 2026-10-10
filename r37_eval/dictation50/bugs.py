#!/usr/bin/env python3
"""Evidence digest for the bug list: python3 bugs.py [results.json] -> bugs.json + printed summary (post-processing only)."""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
RES = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'results.json'
res = json.loads(RES.read_text())
runs = {k: v for k, v in res['runs'].items() if len(k.split('|')) == 2}
sets = {f.stem: json.loads(f.read_text()) for f in (HERE / 'sets').glob('*.json')}
CJK = re.compile(r'[　-〿一-鿿＀-￯]')
NIB = '內置題庫沒有這個字'


def norm(s):
    s = (s or '').replace('’', "'").replace('‘', "'").strip().lower()
    s = re.sub(r'^[\s"\'(\[]+|[\s"\'.,;:!?)\]]+$', '', s)
    return re.sub(r'\s+', ' ', s)


D = {}
sid_of = lambda k: k.split('|')[0]  # noqa: E731

# 1. phrases split ------------------------------------------------------------------------------------------------
ph = defaultdict(lambda: {'n': 0, 'intact': 0, 'sets': set(), 'split_examples': Counter(), 'intact_examples': Counter()})
for k, v in runs.items():
    inp = k.split('|')[1]
    for m in v.get('match_default', []):
        t = m['target']
        if ' ' not in t.strip():
            continue
        ph[inp]['n'] += 1
        if m['status'] != 'missing':
            ph[inp]['intact'] += 1
            ph[inp]['intact_examples'][t] += 1
        else:
            ph[inp]['sets'].add(sid_of(k))
            ph[inp]['split_examples'][t] += 1
D['phrases'] = {i: {'n': x['n'], 'intact': x['intact'], 'split_or_lost': x['n'] - x['intact'], 'sets_with_split': len(x['sets']),
                    'intact_examples': dict(x['intact_examples'].most_common(30)), 'split_examples': list(x['split_examples'])[:25]}
                for i, x in ph.items()}

# 2. heading / label words preselected --------------------------------------------------------------------------
head = defaultdict(Counter)
cls_tot = defaultdict(Counter)
for k, v in runs.items():
    inp = k.split('|')[1]
    for r in v.get('noise_rows', []):
        if r['sel']:
            cls_tot[inp][r['cls']] += 1
            if r['cls'] == 'heading_or_other':
                head[inp][r['en'].lower()] += 1
D['noise_selected_by_class'] = {i: dict(c) for i, c in cls_tot.items()}
D['heading_words'] = {i: dict(c.most_common(25)) for i, c in head.items()}

# 3. Chinese glued into the English field / OCR of CJK ---------------------------------------------------------
cj = defaultdict(lambda: {'runs': 0, 'cards': 0, 'sets': set(), 'ex': []})
for k, v in runs.items():
    inp = k.split('|')[1]
    n = 0
    for it in v.get('items_default', []):
        if CJK.search(it['en']) and it['vis']:
            n += 1
            if len(cj[inp]['ex']) < 12:
                cj[inp]['ex'].append(it['en'])
    if n:
        cj[inp]['runs'] += 1
        cj[inp]['cards'] += n
        cj[inp]['sets'].add(sid_of(k))
D['cjk_in_english_card'] = {i: {'runs': x['runs'], 'cards': x['cards'], 'examples': x['ex']} for i, x in cj.items()}
zhsets = [sid for sid, S in sets.items() if S['target_zh']]
D['sets_with_source_chinese'] = len(zhsets)
# source Chinese vs shown Chinese
zhq = {'paste': Counter(), 'photo': Counter()}
for sid in zhsets:
    S = sets[sid]
    for inp in ('paste', 'photo'):
        v = runs.get(sid + '|' + inp)
        if not v:
            continue
        for t, z in S['target_zh'].items():
            card = None
            for it in v.get('items_default', []):
                n = norm(it['en'])
                if n == norm(t) or n.startswith(norm(t) + ' '):
                    card = it
                    break
            if not card:
                zhq[inp]['no_card'] += 1
            elif not card['zh']:
                zhq[inp]['card_without_zh'] += 1
            elif card['zh'] == z:
                zhq[inp]['same_as_sheet'] += 1
            else:
                zhq[inp]['different_from_sheet'] += 1
D['source_zh_vs_card'] = {i: dict(c) for i, c in zhq.items()}

# 4. short / basic words dropped from word lists ---------------------------------------------------------------
drop = defaultdict(lambda: {'sets': set(), 'n': 0, 'targets': 0, 'ex': Counter()})
for k, v in runs.items():
    inp = k.split('|')[1]
    S = sets[sid_of(k)]
    if S['type'] != 'list' and not S['list_items'] if 'list_items' in S else False:
        pass
    for m in v.get('match_default', []):
        drop[inp]['targets'] += 1
        if m['status'] == 'chip':
            drop[inp]['n'] += 1
            drop[inp]['sets'].add(sid_of(k))
            drop[inp]['ex'][m['target']] += 1
D['targets_hidden_as_skipped'] = {i: {'targets_total': x['targets'], 'hidden': x['n'], 'sets': sorted(s[:2] for s in x['sets']), 'examples': dict(x['ex'].most_common(30))}
                                  for i, x in drop.items()}

# 5. review burden ---------------------------------------------------------------------------------------------
rb = defaultdict(list)
for k, v in runs.items():
    d = v.get('default') or {}
    rb[k.split('|')[1]].append((sid_of(k)[:2], d.get('n_pending_selected', 0), d.get('n_selected', 0)))
D['pending_review'] = {i: {'mean_pending': round(sum(x[1] for x in l) / len(l), 1), 'max': max(l, key=lambda x: x[1]),
                            'runs_with_ge10': sum(1 for x in l if x[1] >= 10), 'runs_with_0': sum(1 for x in l if x[1] == 0)} for i, l in rb.items()}

# 6. edge punctuation / numbering remnants (photo) ---------------------------------------------------------------
ep = []
exa = []
for k, v in runs.items():
    if not k.endswith('|photo'):
        continue
    S = sets[sid_of(k)]
    tn = {norm(t) for t in S['targets']}
    c = 0
    for it in v.get('items_default', []):
        e = re.sub(r"^[^A-Za-z]+|[^A-Za-z]+$", '', it['en'])
        if norm(it['en']) not in tn and norm(e) in tn and e:
            c += 1
            if len(exa) < 15:
                exa.append([sid_of(k)[:2], it['en'], it['exWhy'] or ('visible' if it['vis'] else 'hidden')])
    if c:
        ep.append((sid_of(k)[:2], c))
D['photo_edge_punct_words'] = {'runs': len(ep), 'words': sum(c for _, c in ep), 'examples': exa}

# 7. photo outcomes ----------------------------------------------------------------------------------------------------
po = []
for k, v in runs.items():
    if k.endswith('|photo'):
        po.append({'id': sid_of(k)[:2], 'cond': (v.get('photo') or {}).get('condition'), 'failed': bool(v.get('ocr_failed')),
                   'n_items': (v.get('default') or {}).get('n_items'), 'found': None})
D['photo_conditions'] = Counter(p['cond'] for p in po)
D['photo_failed'] = [p['id'] for p in po if p['failed']]

# 8. apostrophes ---------------------------------------------------------------------------------------------------------
ap = {}
for k, v in runs.items():
    for it in v.get('items_default', []):
        if re.search(r"['’]", it['en']) and it['vis']:
            ap.setdefault(it['en'], set()).add(it['zh'] or '(blank)')
D['apostrophe_cards'] = {w: sorted(z) for w, z in sorted(ap.items())}

# 9. unknown (not in bank) classes ---------------------------------------------------------------------------------------
S_ = json.loads((HERE / 'summary.json').read_text()) if (HERE / 'summary.json').exists() else None
if S_:
    uc = defaultdict(Counter)
    ex = defaultdict(lambda: defaultdict(list))
    for k, m in S_['runs'].items():
        for r in m['unknown_rows']:
            uc[m['input']][r['cls']] += 1
            if len(ex[m['input']][r['cls']]) < 12:
                ex[m['input']][r['cls']].append(r['en'])
    D['unknown_classes'] = {i: dict(c) for i, c in uc.items()}
    D['unknown_examples'] = {i: {c: l for c, l in d.items()} for i, d in ex.items()}

# 10. forms not recognised ---------------------------------------------------------------------------------------------
if S_:
    fb = Counter()
    for k, m in S_['runs'].items():
        if m['input'] != 'paste':
            continue
        for f in m['form_detail']:
            if not (f['status'] != 'missing' and f['known'] and f['zh']):
                fb[(f['w'], f['base'], f['status'], f['known'])] += 1
    D['form_failures_paste'] = [[*k, c] for k, c in fb.most_common(60)]

# 11. layout -------------------------------------------------------------------------------------------------------------------
lay = defaultdict(list)
for k, v in runs.items():
    l = v.get('layout') or {}
    ct = l.get('centre_tap_hits') or {}
    lay[k.split('|')[1]].append({'id': sid_of(k)[:2], 'dock': l.get('dock_in_first_screen'), 'screens': l.get('content_screens'),
                                 'pend_cards': ct.get('pending'), 'pend_centre_on_edit': ct.get('pending_centre_on_edit'),
                                 'cards': ct.get('cards')})
D['layout'] = {i: {'dock_in_first_screen_runs': sum(1 for x in l if x['dock']), 'runs': len(l),
                   'max_screens': max((x['screens'] or 0) for x in l),
                   'pending_cards_total': sum(x['pend_cards'] or 0 for x in l),
                   'pending_centre_on_edit': sum(x['pend_centre_on_edit'] or 0 for x in l)} for i, l in lay.items()}
desk = {k: v for k, v in res['runs'].items() if k.endswith('|desktop')}
D['desktop_runs'] = {k: {'dock': (v.get('layout') or {}).get('dock_in_first_screen'), 'screens': (v.get('layout') or {}).get('content_screens'),
                         'cards_first_screen': (v.get('layout') or {}).get('cards_in_first_screen'), 'overflow': (v.get('layout') or {}).get('h_overflow_px'),
                         'console': v.get('console_A') or v.get('console_B') or []} for k, v in desk.items()}

# 12. blocked / unreviewable ------------------------------------------------------------------------------------------------
bl = []
for k, v in runs.items():
    for l in (v.get('accept_defaults') or {}).get('log', []) + (v.get('log') or []):
        bl.append((k, l))
D['logged_issues'] = bl[:40]
D['console'] = {k: (v.get('console_A') or []) + (v.get('console_B') or []) for k, v in runs.items() if (v.get('console_A') or v.get('console_B'))}
D['accept_not_savable'] = [k for k, v in runs.items() if not (v.get('accept_defaults') or {}).get('savable')]
D['repair_not_saved'] = [k for k, v in runs.items() if not ((v.get('repair') or {}).get('save') or {}).get('ok')]
D['unresolved_targets'] = {k: v['repair']['unresolved_targets'] for k, v in runs.items() if (v.get('repair') or {}).get('unresolved_targets')}

# 13. what "accept as is" would store ----------------------------------------------------------------------------------------
acc = []
for k, v in runs.items():
    a = v.get('accept_defaults') or {}
    sv = a.get('saved')
    if sv is None:
        continue
    S = sets[sid_of(k)]
    tn = {norm(t) for t in S['targets']}
    sn = [norm(x[0]) for x in sv]
    acc.append({'k': k, 'saved': len(sv), 'targets_hit': len(set(sn) & tn), 'n_targets': len(tn), 'extra': len([x for x in sn if x not in tn]),
                'cjk_in_en': sum(1 for x in sv if CJK.search(x[0])), 'no_zh': sum(1 for x in sv if not x[1])})
D['accept_saved'] = {'runs': len(acc),
                     'mean_precision': round(sum((a['saved'] - a['extra']) / a['saved'] for a in acc if a['saved']) / max(1, len(acc)), 3),
                     'mean_recall': round(sum(a['targets_hit'] / a['n_targets'] for a in acc) / max(1, len(acc)), 3),
                     'runs_with_cjk_in_saved_en': [a['k'] for a in acc if a['cjk_in_en']],
                     'mean_saved_without_zh': round(sum(a['no_zh'] for a in acc) / max(1, len(acc)), 1)}

(HERE / 'bugs.json').write_text(json.dumps(D, ensure_ascii=False, indent=1, default=lambda o: sorted(o) if isinstance(o, set) else str(o)))
print(json.dumps(D, ensure_ascii=False, indent=1, default=lambda o: sorted(o) if isinstance(o, set) else str(o))[:14000])

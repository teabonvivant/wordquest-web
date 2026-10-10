#!/usr/bin/env python3
"""results.json + sets/*.json -> summary.json (scores, breakdowns, evidence for the bug list).  Pure post-processing: no browser.

    python3 r37_eval/dictation50/analyze.py
"""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
NOT_IN_BANK = '內置題庫沒有這個字'
CJK = re.compile(r'[　-〿一-鿿＀-￯]')


def norm(s):
    s = (s or '').replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"').replace(' ', ' ')
    s = s.strip().lower()
    s = re.sub(r'^[\s"\'(\[]+|[\s"\'.,;:!?)\]]+$', '', s)
    return re.sub(r'\s+', ' ', s)


def strip_art(n):
    for a in ('a ', 'an ', 'the '):
        if n.startswith(a):
            return n[len(a):]
    return n


def toks(n):
    return re.findall(r"[a-z]+(?:'[a-z]+)?(?:-[a-z]+)*", n)


def clip(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))


def mean(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None


# ------------------------------------------------------------------------------------------------ per run
def oracle_base(w, head, run_eval):
    return run_eval.oracle_base(w, head)


def run_metrics(run, S, bank, head, oracle_fn):
    T = S['targets']
    n = len(T)
    m = {}
    mt = run['match_default']
    inp = run['input']
    found = [x for x in mt if x['status'] != 'missing']
    m['n_targets'] = n
    m['found_strict'] = len(found) / n
    ph = [x for x in mt if ' ' in x['target'].strip()]
    wd = [x for x in mt if ' ' not in x['target'].strip()]
    m['n_phrase_targets'] = len(ph)
    m['found_phrase'] = (sum(1 for x in ph if x['status'] != 'missing') / len(ph)) if ph else None
    m['found_word'] = (sum(1 for x in wd if x['status'] != 'missing') / len(wd)) if wd else None
    ctok = {t for it in run['items_default'] for t in toks(norm(it['en']))}
    rel = 0
    for x in mt:
        tt = toks(strip_art(norm(x['target'])))
        if tt and all(t in ctok for t in tt):
            rel += 1
    m['found_relaxed'] = rel / n
    # OCR token level (photo)
    if inp == 'photo':
        otext = (run.get('ocr') or {}).get('text', '')
        otoks = set(re.findall(r"[a-z]+(?:'[a-z]+)?", norm(otext).replace('-', ' ')))
        tset = {t for x in T for t in re.findall(r"[a-z]+(?:'[a-z]+)?", norm(x).replace('-', ' '))}
        miss = sorted(t for t in tset if t not in otoks)
        m['ocr_token_recall'] = 1 - len(miss) / len(tset) if tset else None
        m['ocr_tokens_missing'] = miss
        pairs = []
        import difflib
        for t in miss:
            near = difflib.get_close_matches(t, list(otoks), n=1, cutoff=0.6)
            pairs.append([t, near[0] if near else None])
        m['ocr_confusions'] = pairs
    # candidates that are a target once edge punctuation / numbering is stripped (e.g. ". shoes", "1.towel", "acap")
    def edge_strip(x):
        x = re.sub(r"^[^A-Za-z]+|[^A-Za-z.]+$", '', x)
        x = re.sub(r"^\d+[.)]?\s*", '', x)
        return norm(x)
    tn_set = {norm(t) for t in T}
    punct_rows = []
    for it in run['items_default']:
        if norm(it['en']) in tn_set:
            continue
        e = edge_strip(it['en'])
        if e in tn_set and e:
            punct_rows.append({'en': it['en'], 'as': e, 'vis': it['vis'], 'sel': it['sel'], 'excl': it['excl'], 'why': it['exWhy']})
    m['edge_punct_candidates'] = punct_rows
    m['n_edge_punct'] = len({r['as'] for r in punct_rows})
    # dictionary
    withzh = 0
    nz = 0
    for x in found:
        cs = x['cands']
        nz += 1
        if any(c['zh'] or c.get('ch', 0) >= 1 for c in cs):
            withzh += 1
    m['zh_cov_targets'] = withzh / nz if nz else 0.0
    vis_sel = [i for i in run['items_default'] if i['vis'] and i['sel']]
    m['zh_cov_selected'] = (sum(1 for i in vis_sel if i['zh']) / len(vis_sel)) if vis_sel else None
    # not-in-bank classes (visible, selected)
    src_tokens = set(toks(norm(S['raw_text'])))
    pn = {norm(x) for x in S.get('proper_nouns', [])}
    classes = Counter()
    unk_rows = []
    tnorm = {norm(t) for t in T}
    for it in vis_sel:
        if not any(NOT_IN_BANK in w for w in it['why']):
            continue
        en = it['en']
        nn = norm(en)
        if CJK.search(en):
            c = 'cjk'
        elif ' ' in nn:
            c = 'phrase'
        elif inp == 'photo' and not all(t in src_tokens for t in toks(nn)):
            c = 'ocr_error'
        elif nn in pn or (len(en) > 1 and en[0].isupper() and nn in {x for x in pn}):
            c = 'name'
        elif oracle_fn(nn, head):
            c = 'form_not_recognised'
        elif re.search(r"\d", nn) or not re.search(r'[a-z]', nn):
            c = 'number_punct'
        else:
            c = 'new_word'
        classes[c] += 1
        unk_rows.append({'en': en, 'cls': c, 'target': nn in tnorm})
    m['unknown_classes'] = dict(classes)
    m['unknown_rows'] = unk_rows
    m['n_unknown_selected'] = sum(classes.values())
    # forms
    forms = bank['forms_oracle']
    ft = [t for t in T if re.fullmatch(r'[A-Za-z]+', t) and t.lower() in forms]
    fdet = []
    for t in ft:
        x = next((y for y in mt if y['target'] == t), None)
        st = x['status'] if x else 'missing'
        c = x['cands'][0] if x and x['cands'] else None
        lem = (run.get('lemma') or {}).get(t) or (run.get('lemma') or {}).get(t.lower())
        base = forms[t.lower()]
        linked = bool(lem and lem[0] == base)
        known = bool(c and c['known'] and not any(NOT_IN_BANK in w for w in c['why']))
        zh = bool(c and (c['zh'] or c.get('ch', 0) >= 1))
        fdet.append({'w': t, 'base': base, 'status': st, 'known': known, 'zh': zh, 'linked': linked, 'zh_text': c['zh'] if c else ''})
    m['n_form_targets'] = len(ft)
    m['form_ok'] = (sum(1 for f in fdet if f['status'] != 'missing' and f['known'] and f['zh']) / len(ft)) if ft else None
    m['form_found'] = (sum(1 for f in fdet if f['status'] != 'missing') / len(ft)) if ft else None
    m['form_detail'] = fdet
    # preselection
    p = run['prf_default']
    m.update({'precision': p['precision'], 'recall': p['recall'], 'f1': p['f1'], 'r_precision': p['r_precision'], 'r_recall': p['r_recall'],
              'n_sel_default': p['n_sel']})
    m['fix_taps_default'] = run['fix_cost_default']['taps']
    m['fix_cost'] = run['fix_cost_default']
    # noise (a known multi-word phrase that really is in the text, e.g. "at last", is not noise)
    raw_n = norm(S['raw_text'])
    nsel = Counter()
    nall = Counter()
    for r_ in run.get('noise_rows', []):
        c_ = r_['cls']
        if c_ == 'heading_or_other' and ' ' in norm(r_['en']) and norm(r_['en']) in raw_n:
            c_ = 'phrase_in_text'
        nall[c_] += 1
        if r_['sel']:
            nsel[c_] += 1
    m['noise_all'] = dict(nall)
    m['noise_selected'] = dict(nsel)
    m['n_noise_selected'] = sum(v for k, v in nsel.items() if k != 'phrase_in_text')
    # phrase integrity
    pi = {'intact': 0, 'split': 0, 'lost': 0}
    for x in ph:
        if x['status'] != 'missing':
            pi['intact'] += 1
        else:
            tt = [t for t in toks(norm(x['target'])) if t not in ('a', 'an', 'the')]
            if tt and all(t in ctok for t in tt):
                pi['split'] += 1
            else:
                pi['lost'] += 1
    m['phrase_integrity'] = pi
    # taps / flows
    ad = run.get('accept_defaults') or {}
    m['accept_savable'] = bool(ad.get('savable')) and bool(ad.get('saved_ok'))
    m['accept_save_failed'] = bool(ad.get('savable')) and not ad.get('saved_ok')
    m['accept_save_error_cards'] = ad.get('save_error_cards')
    m['accept_taps_from_start'] = ad.get('taps_total_from_start')
    m['accept_pending_reviews'] = (ad.get('taps') or {}).get('review_open', 0)
    rp = run.get('repair') or {}
    m['repair_saved'] = bool((rp.get('save') or {}).get('ok'))
    m['repair_taps_total'] = rp.get('taps_total')
    m['repair_typed'] = rp.get('typed')
    m['repair_unresolved'] = rp.get('unresolved_targets')
    m['best_config'] = rp.get('best_config')
    m['final'] = rp.get('final')
    m['t_step2'] = run.get('t_to_step2_s')
    m['native_ocr_sec'] = (run.get('ocr') or {}).get('native_sec')
    lay = run.get('layout') or {}
    m['dock_in_view'] = lay.get('dock_in_first_screen')
    m['h_overflow'] = lay.get('h_overflow_px')
    m['content_screens'] = lay.get('content_screens')
    m['centre_tap'] = lay.get('centre_tap_hits')
    m['console_errors'] = len(run.get('console_A') or []) + len(run.get('console_B') or [])
    m['default'] = run['default']
    # ------------------ scoring (see REPORT.md section 4)
    s_ocr = 25 * m['found_strict']
    if m['form_ok'] is None:
        s_dict = 25 * m['zh_cov_targets']
    else:
        s_dict = 25 * (0.6 * m['zh_cov_targets'] + 0.4 * m['form_ok'])
    s_pre = 25 * m['f1']
    base_taps = 4 if inp == 'photo' else 5
    a = 10 * clip(1 - ((m['accept_taps_from_start'] or 999) - base_taps) / 40) if m['accept_savable'] else 0.0
    t = m['t_step2'] or 999
    if inp == 'paste':
        b = 5.0 if t <= 2 else 5 * clip(1 - (t - 2) / 28)
    else:
        sec = (m['native_ocr_sec'] or [t])[0]
        b = 5 * clip(1 - (sec - 5) / 25)
    c = (3 if m['dock_in_view'] else 0) + (1 if (m['h_overflow'] or 0) <= 0 else 0) + (1 if m['console_errors'] == 0 else 0)
    d = 5.0 if m['repair_saved'] else 0.0
    m['score'] = {'ocr': round(s_ocr, 2), 'dict': round(s_dict, 2), 'pre': round(s_pre, 2), 'ux': round(a + b + c + d, 2),
                  'ux_parts': {'taps': round(a, 2), 'time': round(b, 2), 'layout': c, 'completes': d}}
    m['score']['total'] = round(s_ocr + s_dict + s_pre + a + b + c + d, 2)
    return m


def main():
    sets = {}
    for f in sorted((HERE / 'sets').glob('*.json')):
        d = json.loads(f.read_text())
        sets[d['id']] = d
    res = json.loads((HERE / 'results.json').read_text())
    bank = res['bank']
    head = set(bank['head'])
    sys.path.insert(0, str(HERE))
    import os
    os.environ.setdefault('WQ33_APP', res['meta'].get('app', '/dev/null'))
    import importlib.util
    spec = importlib.util.spec_from_file_location('run_eval_mod', HERE / 'run_eval.py')
    # only oracle_base is needed; import without executing main()
    src = (HERE / 'run_eval.py').read_text()
    ns = {}
    start = src.index('IRREG = {')
    end = src.index('# ----------------------------------------------------------------------------------------------------- JS snippets')
    exec('import re\n' + src[start:end], ns)
    oracle = lambda w, h: ns['oracle_base'](w, h)  # noqa: E731

    runs = {}
    for key, run in res['runs'].items():
        parts = key.split('|')
        if len(parts) != 2 or run.get('errors'):
            continue
        sid, inp = parts
        if sid not in sets or 'match_default' not in run or run.get('repair') is None:
            continue
        runs[key] = run_metrics(run, sets[sid], bank, head, oracle)
        runs[key]['id'] = sid
        runs[key]['input'] = inp
        runs[key]['type'] = sets[sid]['type']
        runs[key]['level'] = sets[sid]['level']
    bad = [k for k, r in res['runs'].items() if len(k.split('|')) == 2 and (r.get('errors') or r.get('repair') is None)]
    out = {'n_runs': len(runs), 'incomplete_runs': bad, 'runs': runs}

    def agg(filter_fn):
        rs = [r for r in runs.values() if filter_fn(r)]
        if not rs:
            return None
        g = lambda k: round(mean([r['score'][k] for r in rs]), 2)  # noqa: E731
        return {'n': len(rs), 'ocr': g('ocr'), 'dict': g('dict'), 'pre': g('pre'), 'ux': g('ux'), 'total': g('total')}
    nz = {}
    for inp in ('paste', 'photo'):
        rs = [r for r in runs.values() if r['input'] == inp]
        cl = Counter()
        for r in rs:
            cl.update(r['noise_selected'])
        nz[inp] = {'mean_per_run': {k: round(v / len(rs), 2) for k, v in cl.items()}, 'total': dict(cl),
                   'runs_with_heading_selected': sum(1 for r in rs if r['noise_selected'].get('heading_or_other')),
                   'runs_with_name_selected': sum(1 for r in rs if r['noise_selected'].get('name')),
                   'runs_with_fragment_selected': sum(1 for r in rs if r['noise_selected'].get('target_fragment')),
                   'runs_with_any_noise': sum(1 for r in rs if r['n_noise_selected'] > 0)}
    out['noise'] = nz
    sv = {}
    for inp in ('paste', 'photo'):
        rs = [r for r in runs.values() if r['input'] == inp]
        sv[inp] = {'accept_save_failed': sum(1 for r in rs if r['accept_save_failed']),
                   'accept_saved_ok': sum(1 for r in rs if r['accept_savable']),
                   'repair_saved_ok': sum(1 for r in rs if r['repair_saved']),
                   'runs_pending_ge10': sum(1 for r in rs if r['default']['n_pending_selected'] >= 10),
                   'mean_pending_selected': round(mean([r['default']['n_pending_selected'] for r in rs]), 2),
                   'mean_selected_default': round(mean([r['default']['n_selected'] for r in rs]), 1),
                   'runs_dock_in_first_screen': sum(1 for r in rs if r['dock_in_view']),
                   'runs_with_phrases': sum(1 for r in rs if r['n_phrase_targets']),
                   'phrase_pooled': {k: sum(r['phrase_integrity'][k] for r in rs) for k in ('intact', 'split', 'lost')}}
    out['flow'] = sv
    out['by_input'] = {i: agg(lambda r, i=i: r['input'] == i) for i in ('paste', 'photo')}
    out['overall'] = agg(lambda r: True)
    out['by_type'] = {t: {i: agg(lambda r, t=t, i=i: r['type'] == t and r['input'] == i) for i in ('paste', 'photo')} for t in ('list', 'text', 'mixed')}
    out['by_type_all'] = {t: agg(lambda r, t=t: r['type'] == t) for t in ('list', 'text', 'mixed')}
    cond = {}
    for key, r in res['runs'].items():
        p = key.split('|')
        if len(p) == 2 and p[1] == 'photo' and key in runs:
            runs[key]['photo_condition'] = (r.get('photo') or {}).get('condition')
            runs[key]['photo_font'] = (r.get('photo') or {}).get('font')
    out['by_photo_condition'] = {c: agg(lambda r, c=c: r['input'] == 'photo' and r.get('photo_condition') == c) for c in ('good', 'fair', 'poor')}
    out['photo_condition_raw'] = {}
    for c in ('good', 'fair', 'poor'):
        rs = [r for r in runs.values() if r['input'] == 'photo' and r.get('photo_condition') == c]
        out['photo_condition_raw'][c] = {'n': len(rs), 'ocr_token_recall': round(mean([r.get('ocr_token_recall') for r in rs]), 3),
                                         'found_strict': round(mean([r['found_strict'] for r in rs]), 3),
                                         'found_relaxed': round(mean([r['found_relaxed'] for r in rs]), 3),
                                         'native_ocr_sec': round(mean([(r.get('native_ocr_sec') or [None])[0] for r in rs]), 2)}
    out['by_level'] = {lv: {i: agg(lambda r, lv=lv, i=i: r['level'] == lv and r['input'] == i) for i in ('paste', 'photo')} for lv in ('P1', 'P2', 'P3', 'P4', 'P5', 'P6')}
    out['by_level_all'] = {lv: agg(lambda r, lv=lv: r['level'] == lv) for lv in ('P1', 'P2', 'P3', 'P4', 'P5', 'P6')}
    # headline raw metrics
    def rawmean(key, inp=None, flt=None):
        rs = [r for r in runs.values() if (inp is None or r['input'] == inp) and (flt is None or flt(r))]
        v = mean([r[key] for r in rs if r.get(key) is not None])
        return round(v, 4) if v is not None else None
    out['raw'] = {}
    for inp in ('paste', 'photo'):
        out['raw'][inp] = {k: rawmean(k, inp) for k in ('found_strict', 'found_relaxed', 'found_phrase', 'found_word', 'zh_cov_targets', 'zh_cov_selected', 'form_ok',
                                                      'form_found', 'precision', 'recall', 'f1', 'r_precision', 'r_recall', 'fix_taps_default',
                                                      'accept_taps_from_start', 'repair_taps_total', 't_step2', 'ocr_token_recall',
                                                      'n_noise_selected', 'n_unknown_selected')}
    (HERE / 'summary.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print('runs scored:', len(runs), 'incomplete:', bad)
    print(json.dumps({k: out[k] for k in ('overall', 'by_input', 'by_type_all', 'by_level_all')}, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()

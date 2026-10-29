"""R3.13 t16 - the dictation upload (#range-new) on 50 real school ranges (pasted text) and synthetic phone photos.

    WQ33_APP=<app/index.html> python3 r37_tests/t16_dictation_real.py
        T16_ONLY=06,13        only these sets (two-digit ids)           T16_INPUTS=paste,photo   which inputs
        T16_NOREPAIR=1        skip the careful-parent flow (quicker)    T16_SHOTS=<dir>          screenshots (390x844 and 1440x900)
        T16_OUT=<file.json>   keep the per-run records

Uses the evaluation data and the measuring code of r37_eval/dictation50 (read only): sets/NN_*.json, mkphoto.py (synthetic photos,
NOT real phone photos; native tesseract, English only), run_eval.py (snapshot, matching, preselection precision / recall, noise
classes) and analyze.py (the same 100-point score as the 71.3 report).  Per run, in three fresh browsers:
  default state -> flow A: step 2, one tap on 儲存, nothing changed -> flow B: a careful parent makes the selection equal to the
  targets, adds what is missing by typing and saves.
Prints the score (paste / photo / by type), whole-item hits, phrase integrity, preselect precision / recall, taps to save, save
success, share of Chinese taken from the teacher's paper, heading noise per set; then checks the targets below."""
import json
import os
import re
import statistics
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
R = HERE.parent
EVAL = R / 'r37_eval' / 'dictation50'
if not (EVAL / 'sets').is_dir() or not (EVAL / 'results.json').exists():
    print('t16: r37_eval/dictation50 (sets, results.json) is not in this checkout - skipped')
    sys.exit(0)
os.environ.setdefault('WQ33_APP', str(R / 'app' / 'index.html'))
os.environ.setdefault('EVAL_WORK', '/tmp/t16_work')
Path(os.environ['EVAL_WORK']).mkdir(parents=True, exist_ok=True)
sys.path[:0] = [str(HERE), str(R / 'r35_tests'), str(EVAL)]
import lib37 as L  # noqa: E402
import run_eval as E  # noqa: E402
import analyze as A  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

C = L.Checker('t16 dictation real ranges')
ONLY = [x for x in os.environ.get('T16_ONLY', '').split(',') if x]
INPUTS = [x for x in os.environ.get('T16_INPUTS', 'paste,photo').split(',') if x]
NOREPAIR = os.environ.get('T16_NOREPAIR') == '1'
SHOTS = Path(os.environ.get('T16_SHOTS', '/home/.z/workspaces/con_EfO3MUQLdW6o7xbL/r313/shotsF'))
PHOTO_IDS = ['02', '03', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '36', '48', '04', '06', '28', '46']
VP = (390, 844)


def load_sets():
    sets = {}
    for f in sorted((EVAL / 'sets').glob('*.json')):
        d = json.loads(f.read_text())
        sets[d['id'][:2]] = d
    return sets


def norm_zh(s):
    return re.sub(r'[\s，,、；;。.（）()]', '', s or '')


def install_counter(pg):
    pg.evaluate("()=>{window.__clk=0;document.addEventListener('click',e=>{if(e.isTrusted)window.__clk++;},true);}")


def wait_saved(pg, ms=9000):
    try:
        pg.wait_for_function("()=>!!document.querySelector('#s50-saved')||(document.querySelector('#s50-err')&&!document.querySelector('#s50-err').hidden)", timeout=ms)
    except Exception:
        pass


def visible_error(pg):
    return pg.evaluate("()=>{const e=document.querySelector('#s50-err');return e&&!e.hidden?e.textContent:''}")


def saved_words(pg):
    return json.loads(E.js(pg, "(()=>{const r=latestRange();return r?JSON.stringify(rangeWords(r.id).map(w=>[w.en,w.zh])):'[]'})()"))


def flow_accept(p, S, inp):
    """step 2 reached, nobody touches a card: how many taps to a saved range, and what is saved"""
    d = E.prelude(p, S, inp, VP)
    out = {'savable': False, 'saved_ok': False, 'taps': {}, 'taps_total': None, 'taps_total_from_start': None, 'log': []}
    try:
        if not d['ok']:
            out['log'].append('step 2 not reached')
            return out, d['errs'][:5]
        pg = d['pg']
        pre = d['taps'].total()
        install_counter(pg)
        n_sel = E.js(pg, "v20Selected().length")
        invalid = json.loads(E.js(pg, "JSON.stringify(v20Selected().filter(c=>!validEnglish(c.en)).map(c=>c.en))"))
        out['invalid_selected'] = invalid
        out['n_selected'] = n_sel
        nr0 = E.js(pg, "db.ranges.length")
        out['savable'] = not pg.is_disabled('#v20-confirm-next')
        if out['savable']:
            pg.click('#v20-confirm-next')
            wait_saved(pg)
            pg.wait_for_timeout(300)
            out['clicks'] = pg.evaluate("()=>window.__clk")
            out['saved_ok'] = E.js(pg, "db.ranges.length") > nr0 and bool(pg.query_selector('#s50-saved'))
            out['error_text'] = visible_error(pg)
            if out['saved_ok']:
                out['saved'] = saved_words(pg)
                out['card'] = pg.inner_text('#s50-saved').replace('\n', ' ')[:80]
            else:
                out['save_error_cards'] = invalid
        out['taps'] = {'save': 1}
        out['taps_total'] = 1
        out['taps_total_from_start'] = pre + out.get('clicks', 1)
        return out, d['errs'][:5]
    finally:
        d['b'].close()


def finish_restore(pg, taps, log, en):
    """a restored (skipped) card opens the 核對 dialog; 保留 closes it. The tick itself is not shown any more."""
    if not pg.query_selector('#v20-edit-dialog[open]'):
        return True
    pg.click('[data-imp="save-edit"]')
    taps.add('restore_save')
    pg.wait_for_timeout(120)
    if pg.query_selector('#v20-edit-dialog[open]'):
        log.append('restore blocked: ' + en)
        E.close_dialogs(pg)
        return False
    return True


def flow_repair(p, S, inp):
    d = E.prelude(p, S, inp, VP)
    out = {'save': {'ok': False}, 'taps': {}, 'taps_total': None, 'typed': 0, 'unresolved_targets': list(S['targets']), 'best_config': None}
    try:
        if not d['ok']:
            return out, d['errs'][:5]
        pg, taps, log = d['pg'], d['taps'], []
        targets = S['targets']
        order = [('default(3+,basic skip)', 3, True, 0), ('any length', 0, True, 1), ('any length + basic words on', 0, False, 2)]
        cur = E.snap(pg)
        configs = {}
        # the page may already show 不限 (a list): measure the cost of what is on screen first
        base_cost = E.fix_cost(cur, targets)['taps']
        for name, ml, bs, _ in order:
            E.apply_config(pg, E.Taps(), ml, bs)
            configs[name] = E.fix_cost(E.snap(pg), targets)['taps']
        E.apply_config(pg, E.Taps(), cur['minLen'], cur['basic'])
        best = min(order, key=lambda o: (configs[o[0]] + o[3], o[3]))
        out['best_config'] = best[0] if configs[best[0]] + best[3] < base_cost else 'as shown'
        if out['best_config'] != 'as shown':
            E.apply_config(pg, taps, best[1], best[2])
        unresolved = E.do_selection_repair(pg, taps, targets, log)
        out['unresolved_targets'] = unresolved
        out['prf_after_repair'] = E.prf(E.snap(pg), targets)
        nr0 = E.js(pg, "db.ranges.length")
        pg.click('#v20-confirm-next')
        taps.add('save')
        wait_saved(pg)
        pg.wait_for_timeout(300)
        ok = E.js(pg, "db.ranges.length") > nr0
        out['save'] = {'ok': bool(ok)}
        if ok:
            saved = saved_words(pg)
            sn = {E.norm(x[0]) for x in saved}
            tn = {E.norm(t) for t in targets}
            out['final'] = {'saved_n': len(saved), 'hit': len(sn & tn), 'extra': len(sn - tn), 'missing': len(tn - sn),
                            'zh_saved': sum(1 for x in saved if x[1])}
        out['taps'] = dict(taps.c)
        out['taps_total'] = taps.total()
        out['typed'] = taps.c.get('typed', 0)
        out['log'] = log[:6]
        return out, d['errs'][:5]
    finally:
        d['b'].close()


def one_run(p, S, inp):
    t0 = time.time()
    rec = E.run_one(p, S, inp, VP, shots=False, full=False)
    if rec.get('errors') or 'match_default' not in rec:
        rec.setdefault('errors', []).append('default state failed')
    ad, ca = flow_accept(p, S, inp)
    rec['accept_defaults'] = ad
    rec['console_A'] = ca
    if NOREPAIR:
        rec['repair'] = {'save': {'ok': ad.get('saved_ok', False)}, 'taps': {}, 'taps_total': None}
        rec['console_B'] = []
    else:
        rp, cb = flow_repair(p, S, inp)
        rec['repair'] = rp
        rec['console_B'] = cb
    rec['wall'] = round(time.time() - t0, 1)
    return rec


def teacher_zh_share(S, rec):
    """of the targets the paper gives a Chinese meaning for: how many are stored with exactly that Chinese"""
    tz = S.get('target_zh') or {}
    saved = (rec.get('accept_defaults') or {}).get('saved')
    if not tz or saved is None:
        return None
    m = {E.norm(en): zh for en, zh in saved}
    n = hit = 0
    for t, z in tz.items():
        n += 1
        got = m.get(E.norm(t))
        if got is not None and norm_zh(got) == norm_zh(z):
            hit += 1
    return hit, n


def mean(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None


def pct(x):
    return 'n/a' if x is None else f'{100 * x:.1f}%'


def main():
    sets = load_sets()
    ids = ONLY or sorted(sets)
    bank = json.loads((EVAL / 'results.json').read_text())['bank']
    head = set(bank['head'])
    oracle = lambda w, h: E.oracle_base(w, h)  # noqa: E731
    E.finish_restore_dialog = finish_restore
    runs, metrics = {}, {}
    with sync_playwright() as p:
        for inp in INPUTS:
            for sid in ids:
                if inp == 'photo' and not ONLY and sid not in PHOTO_IDS:
                    continue
                S = sets[sid]
                try:
                    rec = one_run(p, S, inp)
                except Exception as e:  # noqa: BLE001
                    print(f'  {sid} {inp}: EXCEPTION {e!r}'[:200])
                    continue
                runs[(sid, inp)] = rec
                if rec.get('ocr_failed') or 'repair' not in rec or 'match_default' not in rec:
                    print(f'  {sid} {inp}: no result ({rec.get("ui_message", "")[:60]})')
                    continue
                rec['id'] = S['id']
                try:
                    m = A.run_metrics(rec, S, bank, head, oracle)
                except Exception as e:  # noqa: BLE001
                    print(f'  {sid} {inp}: scoring failed {e!r}'[:200])
                    continue
                m.update({'id': S['id'], 'input': inp, 'type': S['type'], 'level': S['level']})
                tz = teacher_zh_share(S, rec)
                m['teacher_zh'] = tz
                m['clicks'] = (rec['accept_defaults'] or {}).get('clicks')
                m['invalid_selected'] = (rec['accept_defaults'] or {}).get('invalid_selected') or []
                m['error_text'] = (rec['accept_defaults'] or {}).get('error_text', '')
                metrics[(sid, inp)] = m
                print(f"  {sid} {inp:5} {S['type']:5} score {m['score']['total']:5.1f}  found {pct(m['found_strict'])} P {m['precision']:.2f} R {m['recall']:.2f} "
                      f"save {'ok' if m['accept_savable'] and not m['accept_save_failed'] else 'FAIL'} clicks {m['clicks']} noise {m['noise_selected'].get('heading_or_other', 0)} "
                      f"zh {tz} ({rec['wall']}s)", flush=True)
    # ------------------------------------------------------------------------------------------------ report
    out_file = os.environ.get('T16_OUT')
    if out_file:
        Path(out_file).write_text(json.dumps({f'{k[0]}|{k[1]}': {kk: vv for kk, vv in v.items() if kk not in ('default',)} for k, v in metrics.items()}, ensure_ascii=False, default=str))
    print()
    summary = {}
    for inp in INPUTS:
        for typ in (None, 'list', 'text', 'mixed'):
            ms = [m for k, m in metrics.items() if k[1] == inp and (typ is None or m['type'] == typ)]
            if not ms:
                continue
            ph = [m['found_phrase'] for m in ms if m['found_phrase'] is not None]
            tzs = [(m['teacher_zh'][0], m['teacher_zh'][1]) for m in ms if m['teacher_zh']]
            row = {
                'n': len(ms),
                'score': mean([m['score']['total'] for m in ms]),
                'ocr': mean([m['score']['ocr'] for m in ms]), 'dict': mean([m['score']['dict'] for m in ms]),
                'pre': mean([m['score']['pre'] for m in ms]), 'ux': mean([m['score']['ux'] for m in ms]),
                'found': mean([m['found_strict'] for m in ms]), 'phrase': mean(ph),
                'precision': mean([m['precision'] for m in ms]), 'recall': mean([m['recall'] for m in ms]),
                'saved_ok': sum(1 for m in ms if m['accept_savable'] and not m['accept_save_failed']),
                'clicks_mean': mean([m['clicks'] for m in ms if m['clicks'] is not None]),
                'clicks_max': max([m['clicks'] for m in ms if m['clicks'] is not None] or [0]),
                'noise': mean([m['noise_selected'].get('heading_or_other', 0) for m in ms]),
                'teacher_zh': (sum(a for a, _ in tzs) / sum(b for _, b in tzs)) if tzs and sum(b for _, b in tzs) else None,
            }
            summary[(inp, typ or 'all')] = row
            f = lambda v: 'n/a' if v is None else f'{v:.1f}'  # noqa: E731
            print(f"[{inp:5} {typ or 'all':5}] n={row['n']:2} score {f(row['score'])} (ocr {f(row['ocr'])} dict {f(row['dict'])} pre {f(row['pre'])} ux {f(row['ux'])}) "
                  f"found {pct(row['found'])} phrase {pct(row['phrase'])} P {pct(row['precision'])} R {pct(row['recall'])} "
                  f"saved {row['saved_ok']}/{row['n']} clicks mean {f(row['clicks_mean'])} max {row['clicks_max']} heading-noise {row['noise']:.2f}/set zh-from-teacher {pct(row['teacher_zh'])}")
    both = [m['score']['total'] for m in metrics.values()]
    if both:
        print(f"overall mean score {mean(both):.1f}  (report 71.3: paste 70.1, photo 72.5; list 57.9, text 86.9, mixed 81.5)")
    # ------------------------------------------------------------------------------------------------ checks
    pa = {t: summary.get(('paste', t)) for t in ('all', 'list', 'text', 'mixed')}
    if pa['all'] and len(ids) == len(sets):
        C.ok(pa['all']['saved_ok'] == pa['all']['n'], f"paste: every range saves with one tap ({pa['all']['saved_ok']}/{pa['all']['n']})")
        C.ok(pa['all']['clicks_max'] <= 1, f"paste: clicks from step 2 to saved <= 1 (max {pa['all']['clicks_max']})")
        C.ok(pa['list'] and pa['list']['found'] >= 0.90, f"paste list ranges: whole-item hit >= 90% ({pct(pa['list']['found'])})")
        C.ok(pa['all']['phrase'] is not None and pa['all']['phrase'] >= 0.85, f"paste: phrases intact >= 85% ({pct(pa['all']['phrase'])})")
        C.ok(pa['all']['noise'] <= 0.5, f"paste: heading noise preselected <= 0.5 per set ({pa['all']['noise']:.2f})")
        C.ok(pa['text'] and pa['text']['found'] >= 0.98, f"paste text ranges: whole-item hit >= 98% ({pct(pa['text']['found'])})")
        C.ok(pa['all']['score'] > 71.3, f"paste score above the report's 70.1 ({pa['all']['score']:.1f})")
    bad_inv = [k for k, m in metrics.items() if m['invalid_selected']]
    C.ok(not bad_inv, f'no pre-selected card is invalid English (would fail to save): {bad_inv[:5]}')
    silent = [k for k, m in metrics.items() if m['accept_savable'] and m['accept_save_failed'] and not m['error_text']]
    C.ok(not silent, f'a failed save always says why on screen: {silent[:5]}')
    # ------------------------------------------------------------------------------------------------ pointer / card geometry
    dictionary_invariance()
    check_save_error(sets)
    check_cards(sets)
    if 'photo' in INPUTS:
        check_retry()
    if os.environ.get('T16_NOSHOTS') != '1':
        shots(sets)
    C.done()


def dictionary_invariance():
    """every built-in dictionary entry, typed as a one-line list: the layout reader, the cleaner and the word-form rules must hand it
    back with the same English and the same Chinese (a word that was found must not change); nothing may be re-linked to a base."""
    with sync_playwright() as p:
        b, ctx, pg, errs = E.open_page(p, VP[0], VP[1], True)
        try:
            E.boot(pg)
            E.go_new(pg)
            res = json.loads(E.js(pg, """(()=>{
              const keys=[...v20Dictionary.keys()];
              const bad=[];let n=0,heading=0;
              for(const k of keys){
                n++;
                const raw=s55RawGet.call(v20Dictionary,k);
                if(v20Dictionary.get(k)!==raw){bad.push(['get',k]);continue;}
                const L=s55Lemma(k);
                if(L!==null){bad.push(['lemma',k,L.base]);continue;}
                const want=V20.gloss(k,v20Dictionary);
                if(s50Tidy(k)!==k&&V20.fold(s50Tidy(k))!==k){bad.push(['tidy',k,s50Tidy(k)]);continue;}
                if(/[A-Za-z]/.test(k)&&/^[A-Za-z0-9\s'’\-./()]+$/.test(k)){
                  const typed=(raw&&typeof raw.en==='string'&&V20.fold(raw.en)===k)?raw.en:k;   // how the headword is written: I, not i
                  const doc=V20.fromText(typed,'inv'+n);
                  const old=V20.candidates(doc,{mode:'list',dictionary:v20Dictionary,common:v20.common});
                  const out=s50Rebuild(doc,old);
                  const nd=x=>V20.fold(x).replace(/\.$/,'');const hit=out.find(c=>nd(c.en)===nd(k));
                  if(!hit){
                    /* the core itself may split a spaced entry into words; then the rebuilt list may only keep it as one whole line */
                    bad.push(['lost',k,out.map(c=>c.en)]);continue;
                  }
                  if(hit.excludedReason)heading++;
                  const g=V20.gloss(hit.en,v20Dictionary);
                  if(!hit.excludedReason&&(hit.zh||'')!==(g.zh||'')){bad.push(['zh',k,hit.zh,g.zh]);continue;}
                }
              }
              return JSON.stringify({n,bad:bad.slice(0,40),nbad:bad.length,heading});
            })()"""))
            C.ok(res['n'] > 1000, f'dictionary invariance: {res["n"]} entries checked')
            C.ok(res['nbad'] == 0, f'dictionary invariance: no built-in entry is changed or re-linked by the cleaner / layout reader / word forms ({res["nbad"]}: {res["bad"][:6]})')
            print(f'  dictionary: {res["n"]} entries, {res["nbad"]} changed, {res["heading"]} read as a layout word (kept, un-selected)')
        finally:
            b.close()


def check_save_error(sets):
    """a save that fails says so inside the fixed bar (not only in a toast / a hidden line) and stores nothing"""
    S = sets.get('08') or next(iter(sets.values()))
    with sync_playwright() as p:
        d = E.prelude(p, S, 'paste', VP)
        try:
            pg = d['pg']
            C.ok(d['ok'], 't16 save error: step 2 reached')
            if not d['ok']:
                return
            n0 = E.js(pg, 'db.ranges.length')
            E.js(pg, 'save=function(){return false}')
            pg.click('#v20-confirm-next')
            pg.wait_for_timeout(500)
            vis = pg.evaluate("""()=>{const e=document.querySelector('#s50-err');if(!e||e.hidden)return null;const r=e.getBoundingClientRect(),d=document.querySelector('#v20-import-dock').getBoundingClientRect();
              return {text:e.textContent,inView:r.top>=0&&r.bottom<=innerHeight&&r.height>0,inDock:r.top>=d.top-2&&r.bottom<=d.bottom+2}}""")
            C.ok(vis and '儲存失敗' in vis['text'], f't16 save error: the message is on screen ({vis})')
            C.ok(vis and vis['inView'] and vis['inDock'], 't16 save error: inside the fixed bar and in view')
            C.ok(E.js(pg, 'db.ranges.length') == n0 and E.js(pg, 'v20Selected().length') > 0, 't16 save error: nothing stored, the selection is still there')
        finally:
            d['b'].close()


def check_retry():
    """a photo the engine cannot read: step 1 offers 加強對比再試 / 拉直再試; the first re-runs the recognition, the second opens the crop"""
    try:
        from PIL import Image, ImageFilter
    except Exception:
        print('  (PIL missing: retry check skipped)')
        return
    src = Path(os.environ['EVAL_WORK']) / 'photos'
    cands = sorted(src.glob('13_*.jpg')) or sorted(src.glob('*.jpg'))
    if not cands:
        print('  (no synthetic photo yet: retry check skipped)')
        return
    im = Image.open(cands[0]).convert('L')
    im = im.resize((im.width // 3, im.height // 3)).filter(ImageFilter.GaussianBlur(2.2))
    bad = Path(os.environ['EVAL_WORK']) / 'unreadable.jpg'
    im.save(bad, quality=40)
    with sync_playwright() as p:
        b, ctx, pg, errs = E.open_page(p, VP[0], VP[1], True)
        try:
            E.boot(pg)
            E.go_new(pg)
            E.OCRLOG.clear()
            pg.set_input_files('#ocr-upload', str(bad))
            t0 = time.time()
            while time.time() - t0 < 90:
                busy = pg.evaluate("()=>{try{return !!window.__r37('ocrBusy')}catch(e){return null}}")
                if E.OCRLOG and busy is False:
                    break
                pg.wait_for_timeout(300)
            pg.wait_for_timeout(900)
            box = pg.query_selector('#s50-retry')
            C.ok(box is not None and box.is_visible(), 't16 retry: an unreadable photo shows the 加強對比再試 / 拉直再試 line on step 1')
            if not box:
                return
            txt = pg.inner_text('#s50-retry')
            C.ok('加強對比再試' in txt and '拉直再試' in txt, f't16 retry: one line with both buttons ({txt!r})')
            h = pg.evaluate("()=>document.querySelector('#s50-retry').getBoundingClientRect().height")
            C.ok(h <= 60, f't16 retry: on a single row at 390 px ({h:.0f}px high)')
            n = len(E.OCRLOG)
            pg.click('[data-s50="retry-enh"]')
            t0 = time.time()
            while time.time() - t0 < 60 and len(E.OCRLOG) == n:
                pg.wait_for_timeout(300)
            C.ok(len(E.OCRLOG) >= n + 1, 't16 retry: 加強對比再試 runs the recognition again')   # R3.36: plus the one-block second reading
            pg.wait_for_timeout(1500)
            pg.click('[data-s50="retry-crop"]')
            pg.wait_for_timeout(500)
            C.ok(pg.evaluate("()=>!!document.querySelector('#v20-crop[open]')"), 't16 retry: 拉直再試 opens the straighten / crop box')
            C.ok(not errs, f't16 retry: no console errors {errs[:2]}')
        finally:
            b.close()


def check_cards(sets):
    """390 wide: a needs-check card's centre belongs to the card (toggle), the whole card is one tap; ? sits in the corner"""
    S = {'id': '99_cards', 'raw_text': 'zorpish\nblargen\npencil | 鉛筆\nruler | 間尺\nschool bag | 書包\nbanana\nhomework\nwindow\nelephant', 'targets': ['x'],
         'type': 'list', 'level': 'P1', 'proper_nouns': []}
    with sync_playwright() as p:
        d = E.prelude(p, S, 'paste', VP)
        try:
            pg = d['pg']
            C.ok(d['ok'], 't16 cards: step 2 reached')
            if not d['ok']:
                return
            geo = pg.evaluate("""()=>{const o=[];document.querySelectorAll('#word-editor .v20-candidate').forEach(a=>{a.scrollIntoView({block:'center'});
              const t=a.querySelector('[data-imp=toggle]'),e=a.querySelector('[data-imp=edit]');
              if(!t||!e)return;const r=t.getBoundingClientRect(),q=e.getBoundingClientRect();if(r.width===0)return;const cx=r.left+r.width/2,cy=r.top+r.height/2;
              const hit=document.elementFromPoint(cx,cy);o.push({review:a.classList.contains('is-review'),centreIsToggle:!!hit&&t.contains(hit),
              centreOnEdit:cx>=q.left&&cx<=q.right&&cy>=q.top&&cy<=q.bottom,editBottomRight:q.right>=r.right-2&&q.bottom>=r.bottom-2});});return o;}""")
            rev = [g for g in geo if g['review']]
            C.ok(len(geo) >= 8 and len(rev) >= 2, f't16 cards: there are needs-check cards to look at ({len(geo)} cards, {len(rev)} flagged)')
            C.ok(all(g['centreIsToggle'] and not g['centreOnEdit'] for g in geo), 't16 cards: the centre of every card (flagged or not) selects it; the 核對 button does not cover it')
            C.ok(all(g['editBottomRight'] for g in rev), 't16 cards: the ? sits in the corner of a flagged card')
            sel = pg.evaluate("""()=>{const a=document.querySelector('#word-editor .v20-candidate.is-review');
              a.scrollIntoView({block:'center'});const t=a.querySelector('[data-imp=toggle]'),r=t.getBoundingClientRect();
              return {id:a.dataset.candidateId,x:r.left+r.width/2,y:r.top+r.height/2};}""")
            before = E.js(pg, f"v20.items.find(c=>c.id==={json.dumps(sel['id'])}).selected")
            pg.mouse.click(sel['x'], sel['y'])
            pg.wait_for_timeout(150)
            after = E.js(pg, f"v20.items.find(c=>c.id==={json.dumps(sel['id'])}).selected")
            C.ok(before != after and not pg.query_selector('#v20-edit-dialog[open]'), 't16 cards: a tap on the middle of a flagged card toggles it and opens no dialog')
        finally:
            d['b'].close()


def shots(sets):
    """step 2 and the saved card of five ranges at 390x844 and 1440x900 (looked at by eye, not asserted)"""
    SHOTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        for sid in ('13', '15', '21', '41', '27'):
            S = sets.get(sid)
            if not S:
                continue
            for (w, h, touch) in ((390, 844, True), (1440, 900, False)):
                try:
                    d = E.prelude(p, S, 'paste', (w, h))
                    if not d['ok']:
                        continue
                    pg = d['pg']
                    pg.evaluate("()=>{const b=document.querySelector('.r37-legbody');if(b)b.scrollTop=0}")
                    pg.screenshot(path=str(SHOTS / f'{sid}_{w}_step2.png'))
                    if w == 390:
                        pg.click('#v20-confirm-next')
                        wait_saved(pg)
                        pg.wait_for_timeout(250)
                        pg.screenshot(path=str(SHOTS / f'{sid}_{w}_saved.png'))
                    d['b'].close()
                except Exception as e:  # noqa: BLE001
                    print('  (shot failed)', sid, w, str(e)[:80])


if __name__ == '__main__':
    main()

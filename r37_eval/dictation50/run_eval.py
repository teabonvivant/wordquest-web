#!/usr/bin/env python3
"""Evaluation harness: 50 real dictation ranges x {pasted text, SYNTHETIC phone photo} through the parent-side import flow (#range-new).

    WQ33_APP=<frozen index.html> python3 r37_eval/dictation50/run_eval.py [--only 01,12] [--inputs paste,photo] [--fresh]

* Never modifies the product: the page is served from the frozen build through Playwright route() (same bridge as r37_tests/lib37).
* Photo input = synthetic images from mkphoto.py (NOT real phone photos).  OCR = the stub of r35_tests/p40_lib35 that hands the
  image the app produced to NATIVE tesseract 5.x (not the WASM tesseract.js shipped in the app).
* Per run it records: default state of every candidate card, the OCR text, target matching, form/lemma checks, noise classes,
  a scripted "careful parent" repair (real taps) up to a saved range, and layout checks.  Raw data -> results.json.
"""
import argparse
import difflib
import hashlib
import json
import os
import re
import sys
import time
import traceback
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / 'r37_tests'))
sys.path.insert(0, str(ROOT / 'r35_tests'))
sys.path.insert(0, str(HERE))
APP = os.environ.get('WQ33_APP')
if not APP:
    sys.exit('WQ33_APP (path of the frozen index.html) is required')
import lib37 as L  # noqa: E402
import p40_lib35 as P  # noqa: E402
import mkphoto  # noqa: E402

WORK = Path(os.environ.get('EVAL_WORK', '/home/.z/workspaces/con_EfO3MUQLdW6o7xbL/r312/work'))
PHOTOS = WORK / 'photos'
PHOTOS.mkdir(parents=True, exist_ok=True)
SHOTS = HERE / 'shots'
SHOTS.mkdir(exist_ok=True)
RESULTS = HERE / 'results.json'
NOT_IN_BANK = '內置題庫沒有這個字'
SHOT_SETS = {'04', '15', '28', '37', '46'}  # five sets get phone + desktop screenshots

# ----------------------------------------------------------------------------------------------------- normalisation


def norm(s):
    s = (s or '').replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"').replace(' ', ' ')
    s = s.strip().lower()
    s = re.sub(r'^[\s"\'(\[]+|[\s"\'.,;:!?)\]]+$', '', s)
    s = re.sub(r'\s+', ' ', s)
    return s


ARTICLES = ('a ', 'an ', 'the ')


def strip_art(n):
    for a in ARTICLES:
        if n.startswith(a):
            return n[len(a):]
    return n


def tokens_of(n):
    return [t for t in re.findall(r"[a-z]+(?:'[a-z]+)?(?:-[a-z]+)*", n)]


CJK = re.compile(r'[　-〿一-鿿＀-￯]')

# ----------------------------------------------------------------------------------------------------- bank / oracle
IRREG = {
    'was': 'be', 'were': 'be', 'been': 'be', 'bore': 'bear', 'born': 'bear', 'beaten': 'beat', 'became': 'become', 'began': 'begin',
    'begun': 'begin', 'bent': 'bend', 'bit': 'bite', 'bitten': 'bite', 'bled': 'bleed', 'blew': 'blow', 'blown': 'blow', 'broke': 'break',
    'broken': 'break', 'brought': 'bring', 'built': 'build', 'burnt': 'burn', 'bought': 'buy', 'caught': 'catch', 'chose': 'choose',
    'chosen': 'choose', 'came': 'come', 'dug': 'dig', 'did': 'do', 'done': 'do', 'drew': 'draw', 'drawn': 'draw', 'dreamt': 'dream',
    'drank': 'drink', 'drunk': 'drink', 'drove': 'drive', 'driven': 'drive', 'ate': 'eat', 'eaten': 'eat', 'fell': 'fall', 'fallen': 'fall',
    'fed': 'feed', 'felt': 'feel', 'fought': 'fight', 'found': 'find', 'flew': 'fly', 'flown': 'fly', 'forgot': 'forget',
    'forgotten': 'forget', 'forgave': 'forgive', 'forgiven': 'forgive', 'froze': 'freeze', 'frozen': 'freeze', 'got': 'get', 'gave': 'give',
    'given': 'give', 'went': 'go', 'gone': 'go', 'grew': 'grow', 'grown': 'grow', 'had': 'have', 'has': 'have', 'hid': 'hide',
    'hidden': 'hide', 'kept': 'keep', 'left': 'leave', 'made': 'make', 'paid': 'pay', 'ran': 'run', 'rode': 'ride', 'ridden': 'ride',
    'said': 'say', 'saw': 'see', 'seen': 'see', 'sang': 'sing', 'sung': 'sing', 'sat': 'sit', 'taught': 'teach', 'thought': 'think',
    'took': 'take', 'taken': 'take', 'told': 'tell', 'wore': 'wear', 'worn': 'wear', 'won': 'win', 'wrote': 'write', 'written': 'write',
    'lost': 'lose', 'met': 'meet', 'swam': 'swim', 'swum': 'swim', 'slept': 'sleep', 'spoke': 'speak', 'spent': 'spend', 'stood': 'stand',
    'sold': 'sell', 'sent': 'send', 'read': 'read', 'knew': 'know', 'known': 'know', 'lay': 'lie', 'led': 'lead', 'learnt': 'learn',
    'children': 'child', 'men': 'man', 'women': 'woman', 'feet': 'foot', 'mice': 'mouse', 'teeth': 'tooth', 'geese': 'goose',
    'wives': 'wife', 'knives': 'knife', 'leaves': 'leaf', 'wolves': 'wolf', 'shelves': 'shelf',
}
VOW = 'aeiou'


def oracle_base(w, head):
    """independent (rule + irregular table) base form; None when w is itself a headword or no base is found."""
    w = w.lower()
    if w in head or not re.fullmatch(r'[a-z]+', w) or len(w) < 4:
        return None
    if w in IRREG and IRREG[w] in head:
        return IRREG[w]
    cands = []
    if w.endswith('ies'):
        cands.append(w[:-3] + 'y')
    if w.endswith('es'):
        cands.append(w[:-2])
    if w.endswith('s') and not w.endswith('ss'):
        cands.append(w[:-1])
    if w.endswith('ied'):
        cands.append(w[:-3] + 'y')
    if w.endswith('ed'):
        cands += [w[:-2], w[:-1], w[:-3] if len(w) > 4 and w[-3] == w[-4] else '']
    if w.endswith('ing'):
        cands += [w[:-3], w[:-3] + 'e', w[:-4] if len(w) > 5 and w[-4] == w[-5] else '']
    if w.endswith('ier') or w.endswith('iest'):
        cands.append(w[:-3] + 'y' if w.endswith('ier') else w[:-4] + 'y')
    for suf in ('er', 'est'):
        if w.endswith(suf):
            b = w[:-len(suf)]
            cands += [b, b + 'e', b[:-1] if len(b) > 2 and b[-1] == b[-2] else '']
    if w.endswith('ily'):
        cands.append(w[:-3] + 'y')
    if w.endswith('ly'):
        cands += [w[:-2], w[:-2] + 'le']
    for c in cands:
        if c and len(c) >= 3 and c in head:
            return c
    return None


# ----------------------------------------------------------------------------------------------------- JS snippets
SNAP = r"""(()=>{
 const g=(c)=>({id:c.id,en:c.en,zh:c.zh||'',kind:c.kind||'',known:!!c.known,sel:!!c.selected,
   vis:!!s50Shown(c),skip:!!(c.s50&&c.s50.skip&&!c.s50.dup),dup:!!(c.s50&&c.s50.dup),excl:!!s50HostExcluded(c),exWhy:c.excludedReason||'',
   manual:!!(c.s50&&c.s50.manual),pend:!!V20.pending(c),rev:!!c.reviewed,why:c.reviewReasons||[],common:!!c.common,
   ch:(c.choices||[]).length,line:c.lineId||'',src:(c.sourceText||'').slice(0,80)});
 const P=s50GetPrefs();
 return JSON.stringify({mode:v20.mode,minLen:P.minLen,basic:P.basic,items:v20.items.map(g),
   selected:v20Selected().map(c=>c.en),msg:(document.querySelector('#v20-message')||{}).textContent||'',
   pendTxt:(document.querySelector('#v20-pending-count')||{}).textContent||'',
   next:(()=>{const n=document.querySelector('#v20-confirm-next');return n?{dis:n.disabled,txt:n.textContent}:null})(),
   step:(document.querySelector('#import-v20')||{dataset:{}}).dataset.p40Step||''});
})()"""
LEMMAS = r"""((ws)=>JSON.stringify(ws.map(w=>{let l=null,i=null;try{l=s55Lemma(w);}catch(e){}
   return {w:w,lemma:l&&l.base||null,form:l&&l.form||null,has:(()=>{try{return v20Dictionary.has(w.toLowerCase())}catch(e){return null}})()};})))"""
SAME = r"""((ps)=>JSON.stringify(ps.map(p=>{try{return s55SameWord(p[0],p[1]);}catch(e){return null}})))"""


def js(pg, code, arg=None):
    if arg is None:
        return pg.evaluate('(c)=>window.__r37(c)', code)
    return pg.evaluate('(a)=>window.__r37(a[0])(a[1])', [code, arg])


def snap(pg):
    return json.loads(js(pg, SNAP))


# ----------------------------------------------------------------------------------------------------- page / OCR plumbing
OCRLOG = []


_OCR_CACHE = {}


def ocr_capture(dataurl, psm, lang='eng'):
    key = hashlib.sha1((dataurl or '').encode()).hexdigest() + ':' + str(psm) + ':' + lang
    if key in _OCR_CACHE:        # second flow of the same run: identical image -> identical native result (time kept from the first call)
        r, sec = _OCR_CACHE[key]
    else:
        t = time.time()
        r = P.native_ocr(dataurl, psm, lang)
        sec = round(time.time() - t, 2)
        _OCR_CACHE[key] = (r, sec)
    OCRLOG.append({'psm': psm, 'sec': sec, 'text': (r.get('data') or {}).get('text', '')})
    return r


def open_page(p, w, h, touch):
    b, ctx, pg, errs = L.open_page(p, w, h, touch)
    pg.add_init_script(P.STUB)
    pg.expose_function('__ocr', ocr_capture)
    return b, ctx, pg, errs


def boot(pg):
    L.register(pg)
    pg.wait_for_function('typeof window.__r37==="function"', timeout=15000)


def go_new(pg):
    L.go(pg, '#range-new', 900)
    if pg.query_selector('#v23-parent-password'):
        L.wq33.unlock_parent(pg)
    pg.wait_for_timeout(500)


def step(pg):
    return pg.evaluate("()=>document.querySelector('#import-v20')?.dataset.p40Step||''")


def wait_step(pg, n, ms=120000):
    try:
        pg.wait_for_function("(n)=>document.querySelector('#import-v20')?.dataset.p40Step===String(n)", arg=str(n), timeout=ms)
        return True
    except Exception:
        return False


class Taps:
    def __init__(self):
        self.c = {}

    def add(self, k, n=1):
        self.c[k] = self.c.get(k, 0) + n

    def total(self):
        return sum(v for k, v in self.c.items() if k != 'typed')   # typing is an input action, not a tap


# ----------------------------------------------------------------------------------------------------- matching
def match_targets(snapshot, targets):
    """status of each target in the current snapshot (strict: whole word / phrase, case-insensitive)"""
    idx = {}
    for it in snapshot['items']:
        idx.setdefault(norm(it['en']), []).append(it)
    out = []
    for t in targets:
        nt = norm(t)
        cs = idx.get(nt, [])
        if not cs:
            st = 'missing'
        elif any(c['sel'] for c in cs):
            st = 'selected'
        elif any(c['vis'] for c in cs):
            st = 'card_off'
        elif any(c['skip'] or c['excl'] for c in cs):
            st = 'chip'
        else:
            st = 'dup_hidden'
        out.append({'target': t, 'status': st, 'cands': [{k: c[k] for k in ('en', 'zh', 'ch', 'known', 'sel', 'vis', 'skip', 'pend', 'why')} for c in cs[:3]]})
    return out


def prf(snapshot, targets):
    tn = {norm(t) for t in targets}
    sel = [it for it in snapshot['items'] if it['sel'] and it['vis']]
    seln = [norm(it['en']) for it in sel]
    hit_cards = sum(1 for n in seln if n in tn)
    hit_targets = len({n for n in seln if n in tn})
    precision = hit_cards / len(sel) if sel else 0.0
    recall = hit_targets / len(tn) if tn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    # relaxed: word level, articles ignored
    ttok = {t for n in tn for t in tokens_of(strip_art(n))}
    stok = {t for n in seln for t in tokens_of(strip_art(n))}
    rp = sum(1 for n in seln if tokens_of(strip_art(n)) and all(t in ttok for t in tokens_of(strip_art(n)))) / len(sel) if sel else 0.0
    rr = sum(1 for n in tn if tokens_of(strip_art(n)) and all(t in stok for t in tokens_of(strip_art(n)))) / len(tn) if tn else 0.0
    return dict(n_sel=len(sel), n_targets=len(tn), precision=round(precision, 4), recall=round(recall, 4), f1=round(f1, 4),
                r_precision=round(rp, 4), r_recall=round(rr, 4))


def fix_cost(snapshot, targets):
    """taps a parent needs to turn this state into the target selection (taps only, typing counted apart)"""
    st = match_targets(snapshot, targets)
    tn = {norm(t) for t in targets}
    toggles_off = 0
    seen = {}
    for it in snapshot['items']:
        if it['sel'] and it['vis']:
            n = norm(it['en'])
            if n not in tn:
                toggles_off += 1
            else:
                seen[n] = seen.get(n, 0) + 1
    extra_dup = sum(v - 1 for v in seen.values() if v > 1)
    card_on = sum(1 for s in st if s['status'] == 'card_off')
    chip = sum(1 for s in st if s['status'] == 'chip')
    missing = sum(1 for s in st if s['status'] in ('missing', 'dup_hidden'))
    taps = toggles_off + extra_dup + card_on + chip + (1 if chip else 0) + 2 * missing
    return dict(toggles_off=toggles_off, extra_dup=extra_dup, card_on=card_on, chip=chip, missing=missing, typed=missing, taps=taps)


def classify_noise(snapshot, targets, raw_text, proper, common):
    """non-target visible cards -> class"""
    tn = {norm(t) for t in targets}
    ttok = {t for n in tn for t in tokens_of(n)}
    src_tokens = set(tokens_of(norm(raw_text)))
    pn = {norm(x) for x in proper}
    out = {}
    rows = []
    for it in snapshot['items']:
        if not it['vis']:
            continue
        n = norm(it['en'])
        if n in tn:
            continue
        toks = tokens_of(n)
        if CJK.search(it['en']):
            c = 'cjk'
        elif not re.search(r'[a-z]', n):
            c = 'number_punct' if re.search(r'\d', n) else 'punct'
        elif re.search(r'\d', n):
            c = 'number_punct'
        elif n in pn or (toks and all(t in pn for t in toks)):
            c = 'name'
        elif toks and all(t in ttok for t in toks):
            c = 'target_fragment'      # a piece of a phrase target (phrase split) or of a longer target
        elif toks and all(t in common or len(t) < 3 for t in toks):
            c = 'basic_word'
        elif toks and all(t in src_tokens for t in toks):
            c = 'heading_or_other'      # word that is on the sheet but is not a dictation item (labels, instructions, ...)
        else:
            c = 'ocr_or_parse_garbage'
        out[c] = out.get(c, 0) + 1
        rows.append({'en': it['en'], 'cls': c, 'sel': it['sel']})
    return out, rows


# ----------------------------------------------------------------------------------------------------- parent actions
def tap(pg, selector, taps, kind, timeout=6000):
    if selector.endswith('[data-imp="toggle"]'):
        pg.click(selector, timeout=timeout, position={'x': 16, 'y': 10})   # card top: the centre of a pending card is the 核對 button
    else:
        pg.click(selector, timeout=timeout)
    taps.add(kind)
    pg.wait_for_timeout(60)


def close_dialogs(pg):
    pg.evaluate("""()=>document.querySelectorAll('dialog[open]').forEach(d=>{try{d.close()}catch(e){}})""")


def finish_restore_dialog(pg, taps, log, en):
    """restoring an excluded item opens the 核對 dialog straight away: tick + 保留修改 (2 more taps)."""
    if not pg.query_selector('#v20-edit-dialog[open]'):
        return True
    pg.check('#v20-item-checked')
    taps.add('restore_tick')
    pg.click('[data-imp="save-edit"]')
    taps.add('restore_save')
    pg.wait_for_timeout(120)
    if pg.query_selector('#v20-edit-error .v20-error'):
        log.append('restore blocked (not valid English): ' + en)
        close_dialogs(pg)
        return False
    return True


def open_skipped(pg, taps):
    if not pg.evaluate("()=>document.querySelector('.s50-skipped')?.open"):
        pg.click('.s50-skipped>summary', timeout=4000)
        taps.add('open_skipped')
        pg.wait_for_timeout(100)


def apply_config(pg, taps, minlen, basic):
    """minlen label '不限'/'3+', basic True/False (target state)"""
    label = {0: '不限', 3: '3+', 4: '4+', 5: '5+'}[minlen]
    cur = snap(pg)
    if cur['minLen'] != minlen:
        tap(pg, f'.s50-seg button:has-text("{label}")', taps, 'config')
        pg.wait_for_timeout(120)
        cur = snap(pg)
    if cur['basic'] != basic:
        tap(pg, '.s50-sw', taps, 'config')
        pg.wait_for_timeout(120)


def review_pending(pg, taps, log, choose_meaning=False):
    """核對 every selected card that is still pending: ✎ -> tick -> 保留修改 (3 taps each)."""
    for _ in range(400):
        close_dialogs(pg)
        s = snap(pg)
        pend = [it for it in s['items'] if it['sel'] and it['vis'] and it['pend']]
        if not pend:
            return True
        it = pend[0]
        sel = f'.v20-candidate[data-candidate-id="{it["id"]}"] [data-imp="edit"]'
        if not pg.query_selector(sel):
            more = pg.query_selector('[data-imp="more"]')
            if more:
                tap(pg, '[data-imp="more"]', taps, 'more')
                continue
            log.append('review: card not reachable ' + it['en'])
            return False
        tap(pg, sel, taps, 'review_open')
        pg.wait_for_selector('#v20-item-checked', timeout=4000)
        if choose_meaning and it['ch'] > 1 and not (it['zh'] or '').strip():
            mb = pg.query_selector('#v20-edit-dialog [data-imp="meaning"]')
            if mb:
                mb.click()          # the app asks "請選今次的意思": a careful parent picks one (the first is taken; right/wrong is not judged)
                taps.add('choose_meaning')
                pg.wait_for_timeout(60)
        pg.check('#v20-item-checked')
        taps.add('review_tick')
        pg.click('[data-imp="save-edit"]')
        taps.add('review_save')
        pg.wait_for_timeout(120)
        err = pg.query_selector('#v20-edit-error .v20-error')
        if err:
            # the card text cannot be saved as English (e.g. holds Chinese): the parent can only drop it
            log.append('review blocked (not valid English): ' + it['en'])
            pg.keyboard.press('Escape')
            pg.wait_for_timeout(100)
            if pg.query_selector('#v20-edit-dialog[open]'):
                pg.evaluate("()=>{const d=document.querySelector('#v20-edit-dialog');if(d&&d.close)d.close()}")
            sel_t = f'.v20-candidate[data-candidate-id="{it["id"]}"] [data-imp="toggle"]'
            if pg.query_selector(sel_t):
                tap(pg, sel_t, taps, 'toggle_off')
    return False


def do_selection_repair(pg, taps, targets, log):
    """toggle off non-targets, add back / toggle on targets, add the missing by typing. Returns list of unresolved."""
    tn = {norm(t) for t in targets}
    for _ in range(3):
        close_dialogs(pg)
        s = snap(pg)
        # 1. switch off selected non-targets (and repeated targets)
        seen = set()
        todo_off = []
        for it in s['items']:
            if it['sel'] and it['vis']:
                n = norm(it['en'])
                if n not in tn or n in seen:
                    todo_off.append(it)
                seen.add(n)
        for it in todo_off:
            sel = f'.v20-candidate[data-candidate-id="{it["id"]}"] [data-imp="toggle"]'
            for attempt in range(2):
                if pg.query_selector(sel):
                    tap(pg, sel, taps, 'toggle_off')
                    break
                if pg.query_selector('[data-imp="more"]'):
                    tap(pg, '[data-imp="more"]', taps, 'more')
        s = snap(pg)
        st = match_targets(s, targets)
        # 2. cards that are shown but off, then chips
        for x in st:
            if x['status'] == 'card_off':
                c = next(it for it in s['items'] if norm(it['en']) == norm(x['target']) and it['vis'])
                sel = f'.v20-candidate[data-candidate-id="{c["id"]}"] [data-imp="toggle"]'
                for attempt in range(2):
                    if pg.query_selector(sel):
                        tap(pg, sel, taps, 'toggle_on')
                        break
                    if pg.query_selector('[data-imp="more"]'):
                        tap(pg, '[data-imp="more"]', taps, 'more')
        s = snap(pg)
        st = match_targets(s, targets)
        for x in st:
            if x['status'] == 'chip':
                c = next(it for it in s['items'] if norm(it['en']) == norm(x['target']) and (it['skip'] or it['excl']))
                open_skipped(pg, taps)
                sel = (f'.s50-chip[data-imp="restore"][data-id="{c["id"]}"]' if c['excl'] else f'.s50-chip[data-s50="addback"][data-id="{c["id"]}"]')
                if pg.query_selector(sel):
                    tap(pg, sel, taps, 'chip_add')
                    pg.wait_for_timeout(80)
                    if c['excl']:
                        finish_restore_dialog(pg, taps, log, c['en'])
        s = snap(pg)
        st = match_targets(s, targets)
        if all(x['status'] == 'selected' for x in st) and not [it for it in s['items'] if it['sel'] and it['vis'] and norm(it['en']) not in tn]:
            break
    # 3. type the ones that do not exist as cards
    s = snap(pg)
    st = match_targets(s, targets)
    unresolved = []
    for x in st:
        if x['status'] in ('missing', 'dup_hidden'):
            try:
                tap(pg, '[data-imp="add"]', taps, 'add_open')
                pg.fill('#v20-add-en', x['target'])
                taps.add('typed')
                pg.click('[data-imp="save-add"]')
                taps.add('add_save')
                pg.wait_for_timeout(120)
                if pg.query_selector('#v20-add-dialog[open]'):
                    unresolved.append(x['target'])
                    pg.evaluate("()=>{const d=document.querySelector('#v20-add-dialog');if(d&&d.close)d.close()}")
            except Exception as e:  # noqa: BLE001
                unresolved.append(x['target'])
                log.append('add failed %s: %s' % (x['target'], str(e)[:80]))
    return unresolved


def save_flow(pg, taps, log):
    nx = '#v20-confirm-next'
    if pg.is_disabled(nx):
        log.append('next disabled')
        return {'ok': False, 'why': 'next disabled'}
    tap(pg, nx, taps, 'next')
    pg.wait_for_timeout(500)
    if step(pg) != '3':
        return {'ok': False, 'why': 'step 3 not opened (step=%s)' % step(pg)}
    notice = pg.evaluate("()=>(document.querySelector('#v20-summary-content .v20-review-notice')||{}).textContent||''")
    if pg.query_selector('#confirm-import:not([disabled])'):
        pg.check('#confirm-import')
        taps.add('tick_confirm')
    else:
        return {'ok': False, 'why': 'confirm disabled: ' + notice}
    if pg.is_disabled('#v20-save-range'):
        return {'ok': False, 'why': 'save disabled: ' + notice}
    n_sel = js(pg, "v20Selected().length")
    nr0 = js(pg, "db.ranges.length")
    tap(pg, '#v20-save-range', taps, 'save')
    pg.wait_for_timeout(1500)
    rid = js(pg, "db.ranges.length") > nr0 and js(pg, "latestRange()&&latestRange().id")
    en = js(pg, "(()=>{const r=latestRange();return r?JSON.stringify(rangeWords(r.id).map(w=>[w.en,w.zh])):'[]'})()")
    return {'ok': bool(rid), 'saved': json.loads(en), 'n_selected': n_sel}


# ----------------------------------------------------------------------------------------------------- one run
def prelude(p, S, inp, vp):
    """fresh browser + account, first screen, input given, wait for step 2. Returns a dict with the live page."""
    sid = S['id']
    n = int(sid[:2])
    OCRLOG.clear()
    b, ctx, pg, errs = open_page(p, vp[0], vp[1], vp[0] < 600)
    d = {'b': b, 'pg': pg, 'errs': errs, 'taps': Taps(), 'inputs': 0, 'photo': None}
    boot(pg)
    go_new(pg)
    t0 = time.time()
    if inp == 'paste':
        if not pg.evaluate("()=>document.querySelector('#v20-text-details')?.open"):
            pg.click('#v20-text-details>summary')
            d['taps'].add('open_paste')
        pg.fill('#raw-words', S['raw_text'])
        d['inputs'] += 1
        pg.click('[data-imp="parse"]')
        d['taps'].add('parse')
        d['ok'] = wait_step(pg, 2, 20000)
    else:
        d['photo'] = mkphoto.make(n, sid, S['photo_text'], PHOTOS / (sid + '.jpg'))
        d['taps'].add('tap_upload_button')   # the parent taps 拍照 / 上傳圖片, then the phone's picker returns a file
        pg.set_input_files('#ocr-upload', str(PHOTOS / (sid + '.jpg')))
        d['inputs'] += 1
        d['ok'] = False
        end_seen = None
        while time.time() - t0 < 240:
            if step(pg) == '2':
                d['ok'] = True
                break
            busy = pg.evaluate("()=>{try{return !!window.__r37('ocrBusy')}catch(e){return null}}")
            if OCRLOG and busy is False:
                end_seen = end_seen or time.time()
                if time.time() - end_seen > 4:
                    break
            pg.wait_for_timeout(300)
        if not d['ok']:
            d['ui_message'] = pg.evaluate("""()=>[...document.querySelectorAll('#ocr-status,#v20-message,.p40-why,#p40-why1,.p40-empty,[role=status]')]
                .map(e=>e.textContent.trim()).filter(Boolean).join(' | ').slice(0,400)""")
    d['t_step2'] = round(time.time() - t0, 2)
    if d['ok']:
        pg.wait_for_timeout(400)
    return d


def flow_accept(pg, taps_pre, log, shot=None):
    """take the pre-selection as it is: review what blocks, 下一步, tick, is 儲存 possible?  (probe: nothing is saved)"""
    t = Taps()
    okr = review_pending(pg, t, log)
    info = {'blocked': '', 'savable': False}
    if not okr:
        info['blocked'] = 'review incomplete'
    elif pg.is_disabled('#v20-confirm-next'):
        info['blocked'] = 'next disabled'
    else:
        t.add('next')
        pg.click('#v20-confirm-next')
        pg.wait_for_timeout(500)
        if step(pg) != '3':
            info['blocked'] = 'step 3 not opened'
        else:
            info['blocked'] = pg.evaluate("()=>(document.querySelector('#v20-summary-content .v20-review-notice')||{}).textContent||''")
            pg.evaluate("()=>{const b=document.querySelector('.r37-legbody');if(b)b.scrollTop=0}")
            info['step3_save_in_first_screen'] = bool(L.fits(pg, '#v20-save-range'))
            info['step3_list_items'] = pg.evaluate("()=>document.querySelectorAll('#v20-summary-content .v20-summary-list li').length")
            if pg.query_selector('#confirm-import:not([disabled])'):
                pg.check('#confirm-import')
                t.add('tick_confirm')
                if not pg.is_disabled('#v20-save-range'):
                    info['savable'] = True
                    if shot:
                        pg.screenshot(path=str(shot))
                        info['shot'] = Path(shot).name
                    info['n_selected'] = js(pg, "v20Selected().length")
                    nr0 = js(pg, "db.ranges.length")
                    pg.click('#v20-save-range')
                    t.add('save')
                    pg.wait_for_timeout(350)
                    info['toast'] = pg.evaluate("()=>(document.querySelector('#toast')||{}).textContent||''")
                    pg.wait_for_timeout(1200)
                    info['saved_ok'] = js(pg, "db.ranges.length") > nr0
                    if info['saved_ok']:
                        en = js(pg, "(()=>{const r=latestRange();return r?JSON.stringify(rangeWords(r.id).map(w=>[w.en,w.zh])):'[]'})()")
                        info['saved'] = json.loads(en)
                    else:
                        info['save_error_cards'] = json.loads(js(pg, "JSON.stringify(v20Selected().filter(c=>!validEnglish(c.en)||c.zh.length>300).map(c=>c.en))"))
    info['taps'] = dict(t.c)
    info['taps_total'] = t.total()
    info['taps_total_from_start'] = t.total() + taps_pre.total()
    return info


def flow_repair(pg, taps, targets, log):
    """a careful parent: cheapest filter setting, selection made equal to the targets, pending cards reviewed, saved."""
    out = {}
    configs = {}
    order = [('default(3+,basic skip)', 3, True, 0), ('any length', 0, True, 1), ('any length + basic words on', 0, False, 2)]
    for name, ml, bs, _ in order:
        tmp = Taps()
        apply_config(pg, tmp, ml, bs)
        sc = snap(pg)
        c = fix_cost(sc, targets)
        c['prf'] = prf(sc, targets)
        configs[name] = c
    apply_config(pg, Taps(), 3, True)      # back to the default (probing is a measurement, not parent effort)
    out['configs'] = configs
    best = min(order, key=lambda o: (configs[o[0]]['taps'] + o[3], o[3]))
    out['best_config'] = best[0]
    if best[0] != 'default(3+,basic skip)':
        apply_config(pg, taps, best[1], best[2])
    unresolved = do_selection_repair(pg, taps, targets, log)
    out['prf_after_repair'] = prf(snap(pg), targets)
    out['unresolved_targets'] = unresolved
    out['review_ok'] = review_pending(pg, taps, log, choose_meaning=True)
    sv = save_flow(pg, taps, log)
    out['save'] = {k: v for k, v in sv.items() if k != 'saved'}
    out['taps'] = dict(taps.c)
    out['taps_total'] = taps.total()
    out['typed'] = taps.c.get('typed', 0)
    if sv.get('saved') is not None:
        saved = sv['saved']
        sn = {norm(x[0]) for x in saved}
        tn = {norm(t) for t in targets}
        out['final'] = {'saved_n': len(saved), 'hit': len(sn & tn), 'extra': len(sn - tn), 'missing': len(tn - sn),
                        'zh_saved': sum(1 for x in saved if x[1])}
        out['saved'] = saved
    return out


def run_one(p, S, inp, vp=(390, 844), shots=False, full=True):
    sid = S['id']
    targets = S['targets']
    rec = {'id': sid, 'input': inp, 'viewport': list(vp), 'type': S['type'], 'level': S['level'], 'n_targets': len(targets), 'errors': []}
    t_all = time.time()
    d = None
    try:
        # ---------- flow A: measure the default state, layout, and what "accept as is" costs
        d = prelude(p, S, inp, vp)
        pg, taps = d['pg'], d['taps']
        rec['t_to_step2_s'] = d['t_step2']
        rec['reached_step2'] = d['ok']
        if d['photo']:
            rec['photo'] = d['photo']
            rec['ocr'] = {'calls': len(OCRLOG), 'native_sec': [o['sec'] for o in OCRLOG], 'psm': [o['psm'] for o in OCRLOG],
                          'text': OCRLOG[-1]['text'] if OCRLOG else ''}
        if not d['ok']:
            # the recognised text never became a check list (nothing usable): a real outcome, scored as a failed run
            rec['ocr_failed'] = True
            rec['ui_message'] = d.get('ui_message', '')
            rec['taps_to_step2'] = dict(taps.c)
            rec['taps_to_step2_total'] = taps.total()
            rec['items_default'] = []
            rec['lemma'] = {}
            rec['default'] = {'n_items': 0, 'n_visible': 0, 'n_selected': 0, 'n_skip': 0, 'n_excl': 0, 'n_dup': 0, 'n_pending_selected': 0,
                              'n_unknown_selected': 0, 'msg': '', 'pendTxt': ''}
            rec['layout'] = {'dock_in_first_screen': False, 'h_overflow_px': 0, 'content_screens': None, 'cards_in_first_screen': 0, 'cards_total': 0}
            rec['match_default'] = [{'target': t, 'status': 'missing', 'cands': []} for t in targets]
            rec['prf_default'] = {'n_sel': 0, 'n_targets': len(targets), 'precision': 0.0, 'recall': 0.0, 'f1': 0.0, 'r_precision': 0.0, 'r_recall': 0.0}
            rec['fix_cost_default'] = {'toggles_off': 0, 'extra_dup': 0, 'card_on': 0, 'chip': 0, 'missing': len(targets), 'typed': len(targets),
                                       'taps': 2 * len(targets)}
            rec['noise_default'] = {}
            rec['noise_selected'] = {}
            rec['accept_defaults'] = {'savable': False, 'blocked': 'no check step (OCR produced no usable words)', 'taps_total': None,
                                      'taps_total_from_start': None, 'taps': {}}
            rec['repair'] = {'save': {'ok': False}, 'taps_total': None, 'taps': {}, 'unresolved_targets': list(targets), 'best_config': None}
            return rec
        rec['taps_to_step2'] = dict(taps.c)
        rec['taps_to_step2_total'] = taps.total()
        rec['inputs_to_step2'] = d['inputs']
        s0 = snap(pg)
        rec['mode'] = s0['mode']
        vis = [i for i in s0['items'] if i['vis']]
        rec['default'] = {'minLen': s0['minLen'], 'basic': s0['basic'], 'msg': s0['msg'], 'pendTxt': s0['pendTxt'], 'next': s0['next'],
                          'n_items': len(s0['items']), 'n_visible': len(vis),
                          'n_selected': sum(1 for i in vis if i['sel']),
                          'n_skip': sum(1 for i in s0['items'] if i['skip']), 'n_excl': sum(1 for i in s0['items'] if i['excl']),
                          'n_dup': sum(1 for i in s0['items'] if i['dup']),
                          'n_pending_selected': sum(1 for i in vis if i['sel'] and i['pend']),
                          'n_unknown_selected': sum(1 for i in vis if i['sel'] and any(NOT_IN_BANK in x for x in i['why']))}
        rec['items_default'] = s0['items']
        lw = sorted({i['en'] for i in s0['items'] if re.fullmatch(r"[A-Za-z][A-Za-z'’-]*", i['en'])})
        try:
            rec['lemma'] = {r['w']: [r['lemma'], r['form'], r['has']] for r in json.loads(js(pg, LEMMAS, lw))}
        except Exception as e:  # noqa: BLE001
            rec['lemma'] = {}
            rec['errors'].append('lemma probe: ' + str(e)[:80])
        pg.evaluate("()=>{const b=document.querySelector('.r37-legbody');if(b)b.scrollTop=0}")
        rec['layout'] = {
            'dock_in_first_screen': bool(L.fits(pg, '#v20-import-dock')),
            'h_overflow_px': pg.evaluate("()=>document.documentElement.scrollWidth-innerWidth"),
            'content_screens': pg.evaluate("()=>{const b=document.querySelector('.r37-legbody');return b?+(b.scrollHeight/b.clientHeight).toFixed(2):null}"),
            'cards_in_first_screen': pg.evaluate("""()=>{const v=innerHeight;return [...document.querySelectorAll('#word-editor .v20-candidate')]
                .filter(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=v}).length}"""),
            'cards_total': pg.evaluate("()=>document.querySelectorAll('#word-editor .v20-candidate').length"),
            'centre_tap_hits': pg.evaluate("""()=>{const o={cards:0,centre_on_edit:0,pending:0,pending_centre_on_edit:0};
                document.querySelectorAll('#word-editor .v20-candidate').forEach(a=>{const t=a.querySelector('[data-imp=toggle]'),e=a.querySelector('[data-imp=edit]');if(!t||!e)return;
                  const r=t.getBoundingClientRect(),q=e.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
                  const on=cx>=q.left&&cx<=q.right&&cy>=q.top&&cy<=q.bottom;o.cards++;if(on)o.centre_on_edit++;
                  if(a.classList.contains('is-review')){o.pending++;if(on)o.pending_centre_on_edit++;}});return o;}"""),
        }
        if shots:
            f = SHOTS / f'SYNTHETIC_{sid}_{inp}_{vp[0]}_step2.png'
            pg.screenshot(path=str(f))
            rec['shot_step2'] = f.name
        rec['match_default'] = match_targets(s0, targets)
        rec['prf_default'] = prf(s0, targets)
        rec['fix_cost_default'] = fix_cost(s0, targets)
        common = {norm(w) for w in json.loads((HERE / 'common_words.json').read_text())['common']}
        nz, rows = classify_noise(s0, targets, S['raw_text'], S['proper_nouns'], common)
        rec['noise_default'] = nz
        rec['noise_rows'] = rows[:80]
        rec['noise_selected'] = {}
        for r in rows:
            if r['sel']:
                rec['noise_selected'][r['cls']] = rec['noise_selected'].get(r['cls'], 0) + 1
        if not full:
            return rec
        log = []
        shot3 = (SHOTS / f'SYNTHETIC_{sid}_{inp}_{vp[0]}_step3.png') if (shots and vp[0] < 600) else None
        rec['accept_defaults'] = flow_accept(pg, taps, log, shot3)
        rec['accept_defaults']['log'] = log[:6]
        if shot3 and shot3.exists():
            rec['shot_step3'] = shot3.name
        rec['console_A'] = d['errs'][:5]
        d['b'].close()
        d = None
        # ---------- flow B (fresh page, same input): scripted careful parent
        OCRLOG.clear()
        d = prelude(p, S, inp, vp)
        pg, taps = d['pg'], d['taps']
        log = []
        if d['ok']:
            r = flow_repair(pg, taps, targets, log)
            rec['repair'] = r
            rec['taps_total_repair_from_start'] = r['taps_total'] + rec['taps_to_step2_total']
            rec['log'] = log[:12]
        else:
            rec['errors'].append('flow B: step 2 not reached')
        rec['console_B'] = d['errs'][:5]
    except Exception as e:  # noqa: BLE001
        rec['errors'].append('EXC ' + repr(e)[:300])
        rec['trace'] = traceback.format_exc()[-1500:]
    finally:
        rec['wall_s'] = round(time.time() - t_all, 1)
        try:
            if d:
                d['b'].close()
        except Exception:
            pass
    return rec


# ----------------------------------------------------------------------------------------------------- bank-level checks
def bank_checks(p, sets):
    """words/forms checked once: oracle forms vs the app's lemmatiser / dictionary (no UI)."""
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    boot(pg)
    go_new(pg)
    head = set(json.loads(js(pg, "JSON.stringify([...V20.dictIndex(sharedEntries).keys()])")))
    words = sorted({t for S in sets for t in S['targets'] if re.fullmatch(r"[A-Za-z]+", t)})
    lem = {r['w']: r for r in json.loads(js(pg, LEMMAS, words))}
    b.close()
    return head, lem


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    ap.add_argument('--inputs', default='paste,photo')
    ap.add_argument('--fresh', action='store_true')
    ap.add_argument('--no-full', action='store_true')
    ap.add_argument('--force', action='store_true', help='re-run the selected sets even if they already have a clean record')
    a = ap.parse_args()
    sets = [json.loads(f.read_text()) for f in sorted((HERE / 'sets').glob('*.json'))]
    if a.only:
        keep = set(a.only.split(','))
        sets = [S for S in sets if S['id'][:2] in keep]
    inputs = a.inputs.split(',')
    res = {}
    if RESULTS.exists() and not a.fresh:
        res = json.loads(RESULTS.read_text())
    res.setdefault('meta', {})
    res['meta'].update({'app': str(APP), 'app_sha256': hashlib.sha256(Path(APP).read_bytes()).hexdigest(),
                        'note': 'photos are SYNTHETIC; OCR is native tesseract via the r35 stub, not tesseract.js',
                        'started': time.strftime('%Y-%m-%d %H:%M:%S')})
    res.setdefault('runs', {})
    with L.sync_playwright() as p:
        if 'bank' not in res:
            allsets = [json.loads(f.read_text()) for f in sorted((HERE / 'sets').glob('*.json'))]
            head, lem = bank_checks(p, allsets)
            forms = {}
            for S in allsets:
                for t in S['targets']:
                    if re.fullmatch(r"[A-Za-z]+", t):
                        ob = oracle_base(t, head)
                        if ob:
                            forms[t.lower()] = ob
            res['bank'] = {'head_n': len(head), 'head': sorted(head), 'forms_oracle': forms, 'lemma': {w: lem[w] for w in lem}}
            RESULTS.write_text(json.dumps(res, ensure_ascii=False))
        for S in sets:
            for inp in inputs:
                key = S['id'] + '|' + inp
                if key in res['runs'] and not res['runs'][key].get('errors') and not a.fresh and not a.force:
                    continue
                print('RUN', key, flush=True)
                t = time.time()
                shots = S['id'][:2] in SHOT_SETS and inp == 'photo'
                r = run_one(p, S, inp, (390, 844), shots=shots, full=not a.no_full)
                res['runs'][key] = r
                print('   ->', 'ok' if not r['errors'] else r['errors'], round(time.time() - t, 1), 's',
                      (r.get('prf_default') or {}).get('f1'), flush=True)
                RESULTS.write_text(json.dumps(res, ensure_ascii=False))
                if shots:
                    r2 = run_one(p, S, inp, (1440, 900), shots=True, full=False)
                    res['runs'][S['id'] + '|' + inp + '|desktop'] = r2
                    RESULTS.write_text(json.dumps(res, ensure_ascii=False))
    print('done ->', RESULTS)


if __name__ == '__main__':
    main()

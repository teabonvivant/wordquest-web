"""Shared helpers for the R3.6 browser tests.

Builds on r35_tests/p20_lib.py (bridges `__p40` and `__ev`, lesson drivers). Extra here:
* a maths bridge `window.__mev(code)` (eval inside the maths module) spliced into the page text, test-only;
* `open_page36()`: page + console/page-error list + a dialog recorder (every window.confirm/alert is ACCEPTED and logged,
  so "the app asked nothing" can be checked as `pg.dialogs == []`);
* `play_lesson()`: walks an English lesson with real clicks (study cards, 20 quiz questions) with chosen wrong / hinted answers;
* helpers to read the maths shadow DOM and to scan visible text.

WQ33_APP picks the index.html under test (the same convention as every earlier suite). Browser suites must run one after the other.
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
R = HERE.parent
sys.path.insert(0, str(R / 'r35_tests'))
sys.path.insert(0, str(R / 'r33_tests'))
import p20_lib  # noqa: E402
from p20_lib import *  # noqa: E402,F401,F403
from p20_lib import APP, URL, Checker, boot, cur, ev, start, units, answer, clear, sync_playwright, new_page, register  # noqa: E402,F401

TITLE = '學霸星球 SmartQuest Planet'
SHOT_DIR = Path('/tmp/r36_shots')
SHOT_DIR.mkdir(exist_ok=True)

_orig_patched = p20_lib.patched_html
MATH_ANCHOR = "  root.WQMathApp=Object.freeze({version:'3.1.0'"


def _patched():
    s = _orig_patched()
    assert s.count(MATH_ANCHOR) == 1, 'maths test-bridge anchor must exist exactly once'
    return s.replace(MATH_ANCHOR, "  root.__mev=(c)=>eval(c);\n" + MATH_ANCHOR, 1)


p20_lib.patched_html = _patched


def open_page36(p, w=390, h=844, touch=True, suffix=''):
    """Returns (browser, ctx, page, errors). pg.dialogs lists the messages of every dialog the app opened (all accepted)."""
    b, ctx, pg, errs = p20_lib.open_page(p, w, h, touch)
    pg.dialogs = []
    pg.on('dialog', lambda d: (pg.dialogs.append(d.type + ': ' + d.message), d.accept()))
    if suffix:
        html = p20_lib.patched_html()
        pg.route(URL + suffix, lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html))
    return b, ctx, pg, errs


def text(pg):
    return pg.evaluate("document.body.innerText")


def route_to(pg, hash_, wait=600):
    pg.evaluate("(h)=>{location.hash=h}", hash_)
    pg.wait_for_timeout(wait)


def hear(pg):
    """Mark the current question's audio as heard (set-up through the bridge: a headless browser has no speech)."""
    ev(pg, "l30Commit(()=>{const t=l30Session();t.audioHeard=true;t.audioStatus='done';t.replays=1;})")


def coins(pg):
    return ev(pg, "activeChild().stars")


def play_lesson(pg, unit, wrong=(), hinted=(), mode='lesson', stop_after=None, hint_first=False):
    """Real clicks through one lesson / drill. `wrong`: quiz question numbers (0-based among graded questions) answered wrongly.
    `hinted`: graded question numbers answered right AFTER pressing 「需要提示」 (only where that button exists).
    Returns dict(c0, c1, result, hinted_done)."""
    start(pg, mode, unit)
    c0 = coins(pg)
    k = 0
    hinted_done = []
    for _ in range(160):
        info = cur(pg)
        if not info:
            break
        if stop_after is not None and k >= stop_after and info['mode'] != 'study' and not info['fb']:
            return dict(c0=c0, c1=coins(pg), result=None, hinted_done=hinted_done, stopped=True)
        if info['fb']:
            pg.click('[data-l30="next"]')
        elif info['mode'] == 'study':
            pg.click('[data-l30="submit"]')
        else:
            if info['mode'] in ('listenChoice', 'listenSpell'):
                hear(pg)
                pg.wait_for_timeout(80)
            ok = k not in wrong
            if (k in hinted or (hint_first and not hinted_done)) and pg.query_selector('[data-l30="hint"]'):
                pg.click('[data-l30="hint"]')
                pg.wait_for_timeout(120)
                hinted_done.append(k)
                ok = True
            answer(pg, ok)
            pg.click('[data-l30="submit"]')
            k += 1
        pg.wait_for_timeout(90)
    pg.wait_for_timeout(450)
    res = pg.evaluate("document.querySelector('.q36-result')?.innerText||null")
    return dict(c0=c0, c1=coins(pg), result=res, hinted_done=hinted_done, stopped=False)


def stars_on_result(pg):
    return pg.evaluate("document.querySelectorAll('.q36-result .q36-star.on').length")


# ---------------------------------------------------------------------------------------------------------------- maths
def sr(pg, code):
    """Run `code` (a function body with the maths shadow root as `root`) and return its value."""
    return pg.evaluate("(c)=>{const d=document.getElementById('wqm-dialog');const host=[...d.querySelectorAll('*')].find(e=>e.shadowRoot);"
                       "if(!host)return null;const root=host.shadowRoot;return (new Function('root',c))(root)}", code)


def mev(pg, code):
    return pg.evaluate("(c)=>window.__mev(c)", code)


def maths_open(pg, scope='normal'):
    """Open the maths dialog through the home tile (real click)."""
    pg.evaluate("(()=>{const d=document.getElementById('wqm-dialog');if(d&&d.open)d.close();})()")
    route_to(pg, '#p/' + ('olympiad' if scope == 'olympiad' else 'math'), 500)
    pg.click('[data-wqm-open="' + ('olympiad' if scope == 'olympiad' else 'home') + '"]')
    pg.wait_for_timeout(900)


def maths_actions(pg):
    return sr(pg, "return [...root.querySelectorAll('[data-action]')].map(b=>b.dataset.action)") or []


def maths_nav(pg):
    return sr(pg, "return [...root.querySelectorAll('.nav button')].map(b=>b.textContent.trim())") or []


def maths_click(pg, action, wait=450):
    sr(pg, "root.querySelector('[data-action=\"" + action + "\"]')?.click()")
    pg.wait_for_timeout(wait)


def maths_click_prefix(pg, prefix, wait=600):
    sr(pg, "root.querySelector('[data-action^=\"" + prefix + "\"]')?.click()")
    pg.wait_for_timeout(wait)


# ---------------------------------------------------------------------------------------------------------------- text scan
def visible_text_of_pages(pg, hashes, wait=700):
    """Visible text per route hash (the app is rendered into #app plus header/footer)."""
    out = {}
    for h in hashes:
        route_to(pg, h, wait)
        out[h] = text(pg)
    return out


def contains_any(s, needles):
    return [n for n in needles if n in s]


def sentences_dropped():
    """The sentences q60 removes from the program (the build fails when one is missing)."""
    sys.path.insert(0, str(R / 'r36_src' / 'patches'))
    import importlib
    mod = importlib.import_module('q60_notices')
    return list(mod.DROPS)


def walk(pg, until_index, right=True):
    """Real clicks through study cards and quiz questions (audio set-up through the bridge) until `until_index` is current."""
    for _ in range(120):
        info = cur(pg)
        if not info or (info['index'] >= until_index and not info['fb']):
            return info
        if info['fb']:
            pg.click('[data-l30="next"]')
        elif info['mode'] == 'study':
            pg.click('[data-l30="submit"]')
        else:
            if info['mode'] in ('listenChoice', 'listenSpell'):
                hear(pg)
                pg.wait_for_timeout(80)
            answer(pg, right)
            pg.click('[data-l30="submit"]')
        pg.wait_for_timeout(90)
    return cur(pg)


def l31_play(pg, wrong=None, hint_recall=False, group=None, max_steps=80):
    """Real clicks through a whole word-workshop round. `wrong`: None | 'meaning' | 'assemble' (first question of that step is
    answered wrongly once, then corrected). `hint_recall`: press 「需要提示」 before the first typed answer. Returns dict(c0,c1,text)."""
    info = l31_start(pg, group)
    c0 = coins(pg)
    did_wrong = False
    did_hint = False
    for _ in range(max_steps):
        info = pg.evaluate('__p40.l31()')
        if not info:
            break
        st = info['step']
        if info['fb']:
            nxt = pg.query_selector('[data-l31="next"]')
            cor = pg.query_selector('[data-l31="correct"]')
            if nxt and nxt.is_enabled():
                nxt.click()
            elif cor:
                fix = pg.query_selector('#l31-correction')
                if fix:
                    m = re.search(r'正確答案[：:]\s*(\S+)', text(pg))
                    pg.fill('#l31-correction', m.group(1) if m else '')
                cor.click()
            else:
                break
        elif st == 'notice':
            pg.click('[data-l31="submit"]')
        elif st == 'assemble':
            rec = pg.evaluate(f'__p40.l31Recipe("{info["rec"]}")')
            if wrong == 'assemble' and not did_wrong and rec['kind'] != 'blend' and len(rec['parts']) > 1:
                did_wrong = True
                parts = list(reversed(rec['parts'])) if rec['parts'][::-1] != rec['parts'] else rec['parts']
                if ''.join(parts) == ''.join(rec['parts']):
                    parts = rec['parts']
                    did_wrong = False
            else:
                parts = rec['parts']
            for part in parts:
                pg.click(f'[data-l31="piece"]:text-is("{part}")')
            pg.click('[data-l31="submit"]')
        elif st == 'meaning':
            rec = pg.evaluate(f'__p40.l31Recipe("{info["rec"]}")')
            if wrong == 'meaning' and not did_wrong:
                did_wrong = True
                vals = pg.evaluate("[...document.querySelectorAll('[data-l31=\"choice\"]')].map(b=>b.dataset.value)")
                pick = [v for v in vals if v != rec['meaning']][0]
            else:
                pick = rec['meaning']
            pg.click(f'[data-l31="choice"][data-value="{pick}"]')
            pg.click('[data-l31="submit"]')
        else:  # recall
            rec = pg.evaluate(f'__p40.l31Recipe("{info["rec"]}")')
            if hint_recall and not did_hint and pg.query_selector('[data-l31="hint"]'):
                did_hint = True
                pg.click('[data-l31="hint"]')
                pg.wait_for_timeout(150)
            pg.fill('#l31-answer', rec['form'])
            pg.click('[data-l31="submit"]')
        pg.wait_for_timeout(200)
    pg.wait_for_timeout(500)
    return dict(c0=c0, c1=coins(pg), text=text(pg), wrong=did_wrong, hint=did_hint)


def old_play(pg, wrong=(), hint=(), max_steps=40):
    """School-range practice from the home card 「今次默書練習 · 開始練習」 (the 8-question `#learn` page), real clicks.
    `wrong`: question numbers answered wrongly; `hint`: numbers where 「看提示」 is pressed before the right answer."""
    route_to(pg, '#p/dictation', 600)
    ev(pg, "(()=>{db.session=null;save();})()")
    pg.click('[data-act="start-practice"][data-type="fill"]')
    pg.wait_for_timeout(800)
    c0 = coins(pg)
    k = 0
    for _ in range(max_steps):
        if pg.query_selector('.finish-panel'):
            break
        if pg.query_selector('[data-act="next-task"]'):
            pg.click('[data-act="next-task"]')
        elif pg.query_selector('#answer') or pg.query_selector('[data-act="submit-answer"]'):
            t = ev(pg, "currentItem().type")
            if t in ('listenChoice', 'listenSpell', 'sentence'):
                ev(pg, "(()=>{db.session.played=true;save();render();})()")
            w = ev(pg, "currentWord().en")
            if k in hint and pg.query_selector('[data-act="show-help"]'):
                pg.click('[data-act="show-help"]')
                pg.wait_for_timeout(150)
            if pg.query_selector('#answer'):
                pg.fill('#answer', 'zzq' if k in wrong else w)
            pg.click('[data-act="submit-answer"]')
            k += 1
        else:
            break
        pg.wait_for_timeout(250)
    pg.wait_for_timeout(500)
    return dict(c0=c0, c1=coins(pg), text=text(pg), n=k)


def maths_answer_current(pg, correct=True, use_hint=False):
    """Answer the current maths question. Typed fields are filled through the real inputs; choice questions are set through the
    module bridge (the picker has no stable selector) and the real 「提交」 button is pressed."""
    q = json.loads(mev(pg, "JSON.stringify(currentQ())"))
    if use_hint:
        maths_click(pg, 'hint', 250)
    if q['type'] == 'choice':
        vals = [ch['value'] for ch in q['choices']]
        pick = q['answer'] if correct else [v for v in vals if v != q['answer']][0]
        mev(pg, "(()=>{save(n=>{n.current.picked=" + json.dumps(pick) + ";});render();})()")
    else:
        sr(pg, "const a=root.querySelector('#answer');if(a){a.value=" + json.dumps(str(q['answer']) if correct else '0.123') + ";a.dispatchEvent(new Event('input',{bubbles:true}));}"
                "const u=root.querySelector('#unit');if(u){u.value=" + json.dumps(q.get('unit') or '') + ";u.dispatchEvent(new Event('input',{bubbles:true}));}"
                "const e=root.querySelector('#expression');if(e){e.value=" + json.dumps(str(q.get('expression') or q['answer'])) + ";e.dispatchEvent(new Event('input',{bubbles:true}));}")
    maths_click(pg, 'submit', 500)
    return q


def maths_play(pg, scope='normal', wrong=(), hint=(), max_steps=80, lesson=None, nth=0):
    """One whole maths (or olympiad) lesson with real clicks. wrong / hint: question numbers (0-based among answered questions)."""
    maths_open(pg, scope)
    maths_click(pg, 'nav:normal' if scope == 'normal' else 'nav:olympiad', 400)
    c0 = coins(pg)
    pre = lesson or ('lesson:O-' if scope == 'olympiad' else 'lesson:')
    lessons = [a for a in maths_actions(pg) if a.startswith(pre)]
    lessons = list(dict.fromkeys(lessons))
    pick = lessons[nth] if len(lessons) > nth else None
    if pick:
        maths_click(pg, pick, 700)
    k = 0
    for _ in range(max_steps):
        acts = maths_actions(pg)
        if 'reflect:0' in acts and mev(pg, "current().reflection") is None:
            maths_click(pg, 'reflect:0', 400)
        elif 'submit' in acts:
            maths_answer_current(pg, k not in wrong, k in hint)
            k += 1
        elif 'nextq' in acts:
            maths_click(pg, 'nextq', 350)
        elif 'nextstage' in acts:
            maths_click(pg, 'nextstage', 300)
        elif 'finish' in acts:
            maths_click(pg, 'finish', 700)
            break
        elif 'self:good' in acts:
            maths_click(pg, 'self:good', 500)
        else:
            reflect = [a for a in acts if a.startswith(('reflect', 'method', 'strategy'))]
            if reflect:
                maths_click(pg, reflect[0], 300)
            else:
                break
    pg.wait_for_timeout(500)
    summary = sr(pg, "return root.querySelector('main')?.innerText||''")
    return dict(c0=c0, c1=coins(pg), summary=summary, n=k, acts=maths_actions(pg), lesson=pick, lessons=len(lessons))

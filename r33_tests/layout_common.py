"""Shared helpers for the R3.3 p10 layout tests (test_layout.py, hit_test.py).

Select the build under test with WQ33_APP (see wq33.py). Every check prints one line that starts with
PASS or FAIL (r33_tests/run_release.py counts those prefixes), and finish() prints "<N> PASS / <M> FAIL".

Scenario helpers (l30_*, l31_*, legacy_*, import_*) drive the app through the DOM for set-up only; the
interaction under test is always done with real pointer events at the element's centre co-ordinates
(page.mouse / page.touchscreen), never locator.click(), which would scroll and wait and hide layout bugs.
"""
import json
import re
import sys
import time
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wq33 import APP, PW, hit, new_page, register, sync_playwright, unlock_parent  # noqa: E402,F401

NAME, CHILD = 'tester', '小明'
WIDTHS_PHONE = [(320, 568), (360, 640), (390, 844), (412, 915)]

_counts = {'PASS': 0, 'FAIL': 0}


# ---------------------------------------------------------------- reporting
def check(name, ok, detail=''):
    """Print one PASS/FAIL line (line start is what the release runner counts)."""
    ok = bool(ok)
    _counts['PASS' if ok else 'FAIL'] += 1
    print(('PASS ' if ok else 'FAIL ') + name + (' | ' + str(detail) if detail != '' else ''), flush=True)
    return ok


def fail_exc(name, exc):
    """A scenario that throws is a FAIL (never silently skipped)."""
    tb = ''.join(traceback.format_exception_only(type(exc), exc)).strip().replace('\n', ' ')
    return check(name + ' [scenario error]', False, tb[:300])


def counts():
    return dict(_counts)


def finish():
    print(f"{_counts['PASS']} PASS / {_counts['FAIL']} FAIL", flush=True)
    sys.exit(1 if _counts['FAIL'] else 0)


# ---------------------------------------------------------------- browser / navigation
def start(p, w, h, touch=True):
    """Launch Chromium at w x h (touch=True emulates a phone), register tester/小明/R1testPass99 and stop on #kid."""
    b, ctx, pg, errs = new_page(p, w, h, touch=touch)
    pg.set_default_timeout(15000)
    register(pg, NAME, CHILD, PW)
    wait_for(pg, "(location.hash||'#kid')==='#kid'&&!!document.querySelector('#wq29-nav, #app')", 8000)
    return b, ctx, pg, errs


def wait_for(pg, js, timeout=6000):
    """Wait until the JS expression is truthy; returns True/False instead of raising."""
    try:
        pg.wait_for_function(js, timeout=timeout)
        return True
    except Exception:
        return False


def goto(pg, hash_, settle=500):
    """Navigate by hash (like a link tap) and let the router render."""
    h = hash_ if hash_.startswith('#') else '#' + hash_
    pg.evaluate("(h)=>{location.hash=h}", h)
    pg.wait_for_timeout(settle)


def hashnow(pg):
    return pg.evaluate("location.hash")


def rect(pg, sel):
    """Bounding rect of the first match of sel as {x,y,w,h,l,t,r,b}; None when missing or display:none."""
    return pg.evaluate("""(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();
      if(!r.width&&!r.height)return null;return {x:r.left,y:r.top,w:r.width,h:r.height,l:r.left,t:r.top,r:r.right,b:r.bottom};}""", sel)


def centre(pg, sel):
    r = rect(pg, sel)
    return None if r is None else (r['x'] + r['w'] / 2, r['y'] + r['h'] / 2)


def fmt(r):
    return None if r is None else [round(r['l']), round(r['t']), round(r['r']), round(r['b'])]


def overlap(a, b):
    """True when two rect dicts intersect with positive area."""
    if a is None or b is None:
        return False
    return min(a['r'], b['r']) - max(a['l'], b['l']) > 0.5 and min(a['b'], b['b']) - max(a['t'], b['t']) > 0.5


def overlap_area(a, b):
    if a is None or b is None:
        return 0.0
    w = min(a['r'], b['r']) - max(a['l'], b['l'])
    h = min(a['b'], b['b']) - max(a['t'], b['t'])
    return max(0.0, w) * max(0.0, h)


def top_at(pg, x, y):
    """Short description of the topmost element at a point."""
    return pg.evaluate("""([x,y])=>{const e=document.elementFromPoint(x,y);if(!e)return null;
      return e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'');}""", [x, y])


def hit_centre(pg, sel):
    """(ok, description): is the element itself (or a child of it) topmost at its own centre?"""
    r = rect(pg, sel)
    if r is None:
        return False, 'missing/hidden'
    x, y = r['x'] + r['w'] / 2, r['y'] + r['h'] / 2
    if x < 0 or y < 0 or x > pg.viewport_size['width'] or y > pg.viewport_size['height']:
        return False, f'centre ({round(x)},{round(y)}) off-screen'
    ok = pg.evaluate("""([s,x,y])=>{const e=document.querySelector(s);const t=document.elementFromPoint(x,y);
      return !!t&&(t===e||e.contains(t)||t.contains(e));}""", [sel, x, y])
    return ok, ('' if ok else f'topmost at ({round(x)},{round(y)}) is {top_at(pg, x, y)}')


def grid_hits(pg, sel, nx=8, ny=4, scroll=True):
    """Sample an nx*ny grid inside the element; returns (hit_count, total, first_blocker). Off-screen points count as misses."""
    if scroll:
        pg.evaluate("(s)=>{const e=document.querySelector(s);if(e)e.scrollIntoView({block:'center',inline:'nearest'});}", sel)
        pg.wait_for_timeout(120)
    return pg.evaluate("""([s,nx,ny])=>{const e=document.querySelector(s);if(!e)return [0,0,'missing'];
      const r=e.getBoundingClientRect();let n=0,t=0,blk='';
      for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const x=r.left+r.width*(i+.5)/nx,y=r.top+r.height*(j+.5)/ny;t++;
        if(x<0||y<0||x>=innerWidth||y>=innerHeight){if(!blk)blk='offscreen';continue;}
        const q=document.elementFromPoint(x,y);if(q&&(q===e||e.contains(q)||q.contains(e)))n++;
        else if(!blk)blk=(q?q.tagName.toLowerCase()+(q.id?'#'+q.id:''):'null');}
      return [n,t,blk];}""", [sel, nx, ny])


def tap(pg, x, y, how='mouse'):
    """Real pointer events at page co-ordinates. how: 'mouse' | 'touch'."""
    if how == 'touch':
        pg.touchscreen.tap(x, y)
    else:
        pg.mouse.click(x, y)


def tap_sel(pg, sel, how='mouse'):
    c = centre(pg, sel)
    if c is None:
        raise RuntimeError('tap target missing: ' + sel)
    tap(pg, c[0], c[1], how)
    return c


def visible(pg, sel):
    """True when the element exists, is displayed, and is not visibility:hidden."""
    return pg.evaluate("""(s)=>{const e=document.querySelector(s);if(!e)return false;const cs=getComputedStyle(e);
      const r=e.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0;}""", sel)


def nav_rects(pg):
    """Rects of the bottom/top nav tabs keyed by label."""
    return pg.evaluate("""()=>[...document.querySelectorAll('#wq29-nav a')].map(a=>{const r=a.getBoundingClientRect();
      return {label:a.textContent.trim(),href:a.getAttribute('href'),l:r.left,t:r.top,r:r.right,b:r.bottom,x:r.left,y:r.top,w:r.width,h:r.height};})""")


def contrast(fg, bg):
    """WCAG contrast ratio of two 'rgb(r, g, b)' strings."""
    def lum(c):
        v = [int(x) / 255 for x in re.findall(r'\d+(?:\.\d+)?', c)[:3]]
        v = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in v]
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
    a, b = lum(fg), lum(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def dom_sig(pg):
    """Cheap signature of what the app currently shows (used to wait for a re-render after a set-up click)."""
    return pg.evaluate("(()=>{const a=document.querySelector('#app');return a?a.innerText.length+'|'+a.innerText.slice(0,160)+'|'+a.innerText.slice(-80):''})()")


def wait_changed(pg, before, timeout=1500):
    """Wait until the app DOM differs from `before` (returns False on timeout, which callers may ignore)."""
    end = time.time() + timeout / 1000
    while time.time() < end:
        if dom_sig(pg) != before:
            return True
        pg.wait_for_timeout(40)
    return False


# ---------------------------------------------------------------- scenarios (DOM-driven set-up only)
def l30_to_study(pg):
    """#kid -> '開始今天的小課' -> first L30 step (study). Returns True when the lesson card shows."""
    goto(pg, '#kid', 600)
    pg.evaluate("document.querySelector('[data-l30=start]').click()")
    return wait_for(pg, "location.hash==='#learning'&&!!document.querySelector('.l30-quizactions')", 8000)


def l30_state(pg):
    return pg.evaluate("""()=>{const t=document.querySelector('.l30-eyebrow');return {mode:t&&t.textContent,
      submit:!!document.querySelector('[data-l30=submit]'),next:!!document.querySelector('[data-l30=next]'),
      answer:!!document.querySelector('#l30-answer:not([disabled])'),choice:!!document.querySelector('.l30-choice')};}""")


def l30_to_spell(pg, limit=24):
    """Advance the L30 lesson through study / choice steps until the typed '自己串字' question shows."""
    for _ in range(limit):
        s = l30_state(pg)
        if s['answer']:
            return True
        before = dom_sig(pg)
        if s['submit']:
            if s['choice']:
                pg.evaluate("document.querySelector('.l30-choice:not([disabled])')?.click()")
                pg.wait_for_timeout(60)
            pg.evaluate("document.querySelector('[data-l30=submit]').click()")
        elif s['next']:
            pg.evaluate("document.querySelector('[data-l30=next]').click()")
        else:
            pg.wait_for_timeout(200)
            continue
        wait_changed(pg, before)
        pg.wait_for_timeout(60)
    return l30_state(pg)['answer']


def l31_state(pg):
    """DOM-only view of the word-workshop step (the app keeps its state in closures, not globals)."""
    return pg.evaluate("""()=>{const st=document.querySelector('.l31-step');const fb=document.querySelector('.l31-feedback');
      const exp=fb&&fb.querySelector('b[lang=en],b');
      return {step:st?st.textContent.trim():null,fb:!!fb,expected:exp?exp.textContent:null,
        correction:!!document.querySelector('#l31-correction'),next:!!document.querySelector('[data-l31=next]'),
        recall:!!document.querySelector('#l31-answer:not([disabled])'),submit:!!document.querySelector('[data-l31=submit]')};}""")


def l31_to_recall(pg, limit=40, restart=True):
    """#kid -> '由 air 家族開始' (word workshop); advance to the typed recall step ('收起提示，自己串').

    restart=False continues the session that is already on screen (used for a second recall question).
    Wrong answers are fine: the correction box is filled from the displayed correct answer.
    """
    if restart:
        goto(pg, '#kid', 600)
        pg.evaluate("document.querySelector('[data-l31=start]').click()")
    if not wait_for(pg, "location.hash==='#assembly-learn'&&!!document.querySelector('.l31-actions')", 8000):
        return False
    for _ in range(limit):
        s = l31_state(pg)
        if s['recall'] and not s['fb']:
            return True
        before = dom_sig(pg)
        if s['fb']:
            if s['correction']:
                pg.fill('#l31-correction', s['expected'] or '')
                pg.evaluate("document.querySelector('[data-l31=correct]').click()")
                wait_changed(pg, before)
                before = dom_sig(pg)
            pg.evaluate("document.querySelector('[data-l31=next]')?.click()")
        elif s['step'] and s['step'].startswith('自己動手'):
            pg.evaluate("""()=>{const cards=[...document.querySelectorAll('.l31-source-card')];
              if(document.querySelector('.l31-cut')){cards.forEach(c=>c.querySelector('.l31-cut')?.click());}
              else{[...document.querySelectorAll('[data-l31=piece]')].sort((a,b)=>a.dataset.index-b.dataset.index).forEach(b=>b.click());}}""")
            pg.wait_for_timeout(120)
            before = dom_sig(pg)
            pg.evaluate("document.querySelector('[data-l31=submit]').click()")
        elif s['step'] and s['step'].startswith('理解新詞'):
            pg.evaluate("document.querySelector('[data-l31=choice]')?.click()")
            pg.wait_for_timeout(100)
            before = dom_sig(pg)
            pg.evaluate("document.querySelector('[data-l31=submit]').click()")
        else:
            pg.evaluate("document.querySelector('[data-l31=submit]')?.click()")
        wait_changed(pg, before)
        pg.wait_for_timeout(80)
    return False


def legacy_start(pg, mode='spell'):
    """#kid -> '我的默書範圍' source -> practice card `mode`; lands on the legacy #learn engine (demo range)."""
    goto(pg, '#kid', 600)
    pg.evaluate("document.querySelector('[data-l30=source][data-source=school]').click()")
    pg.wait_for_timeout(500)
    pg.evaluate("(m)=>document.querySelector('[data-l30=entry][data-mode='+m+']').click()", mode)
    return wait_for(pg, "location.hash==='#learn'&&document.body.classList.contains('quiz-active')", 8000)


def import_page(pg, text='apple\nbanana\ncat'):
    """Open #range-new through the parent gate, paste `text` and parse it so the bottom dock is armed."""
    goto(pg, '#range-new', 700)
    unlock_parent(pg)
    wait_for(pg, "!!document.querySelector('#raw-words')", 6000)
    if not pg.query_selector('#raw-words'):
        goto(pg, '#range-new', 700)
    pg.fill('#raw-words', text)
    pg.evaluate("document.querySelector('[data-imp=parse]').click()")
    pg.wait_for_timeout(500)
    return bool(wait_for(pg, "!document.querySelector('#v20-confirm-next').disabled", 4000))


# ---------------------------------------------------------------- shared probes
def same_rect(a, b, tol=1.0):
    return a is not None and b is not None and all(abs(a[k] - b[k]) <= tol for k in ('l', 't', 'r', 'b'))


def ensure_visible(pg, sel, block='nearest'):
    """Scroll the element into view the way a user would (no-op for fixed / sticky bars)."""
    pg.evaluate("([s,b])=>{const e=document.querySelector(s);if(e)e.scrollIntoView({block:b});}", [sel, block])
    pg.wait_for_timeout(120)


def typed_submit_probe(pg, input_sel, submit_sel, text='abc', how_focus='touch', how_submit='mouse', before_tap=None):
    """N1 probe. Measures the submit button while idle / focused / blurred, then taps it ONCE at the centre
    it has in the focused layout (what a user sees with the keyboard up). The caller checks the effect.
    The answer box is first scrolled to the middle of the screen (a sticky action bar may cover the lower part of a
    small screen at scroll 0). Output also says whether the tap really focused the box and the text arrived.
    before_tap: optional callable run in the typing state right before the tap (e.g. a grid hit check)."""
    ensure_visible(pg, input_sel, 'center')
    ensure_visible(pg, submit_sel)
    out = {'idle': rect(pg, submit_sel)}
    tap_sel(pg, input_sel, how_focus)
    pg.wait_for_timeout(350)
    out['focus_ok'] = bool(pg.evaluate("(s)=>document.activeElement===document.querySelector(s)", input_sel))
    out['focused'] = rect(pg, submit_sel)
    if text:
        pg.keyboard.type(text)
        pg.wait_for_timeout(150)
    out['typed_ok'] = (not text) or pg.evaluate("(s)=>document.querySelector(s)?.value", input_sel) == text
    pg.evaluate("document.activeElement&&document.activeElement.blur()")
    pg.wait_for_timeout(350)
    out['blurred'] = rect(pg, submit_sel)
    tap_sel(pg, input_sel, how_focus)  # refocus: typed text is kept, layout is the typing layout again
    pg.wait_for_timeout(350)
    out['refocused'] = rect(pg, submit_sel)
    if before_tap:
        before_tap()
    c = centre(pg, submit_sel)
    out['centre'] = c
    out['topmost'] = top_at(pg, c[0], c[1]) if c else None
    if c:
        tap(pg, c[0], c[1], how_submit)
    return out

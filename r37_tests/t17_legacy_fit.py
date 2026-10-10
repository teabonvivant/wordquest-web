"""R3.13 t17 - legacy pages fit the screen (s60 layer).

For the pages the UI audit flagged (all red ones + the busiest orange ones) at 390x844, 820x1180, 1180x820 and 1440x900:
  one top bar only (old site header hidden, one back control), no horizontal overflow, title + main action inside the first
  screen, everything outside a list container fits without scrolling (need_px_nolist), 44px targets, <=12px font floor,
  copy length (<=20 units, <=40 on parent settings pages), no console errors.
Plus the four defects: family lesson locked, parent gate unreadable, report title contrast, unit/learning floating bar over the word.
Measure = r37_tests/t17_measure.js (the audit measure.js with an extra need_px_nolist for [data-s60-list] containers)."""
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from lib37 import *  # noqa: E402,F401,F403
from wq33 import unlock_parent  # noqa: E402

MEASURE = (HERE / 't17_measure.js').read_text()
VPS = [(390, 844, 'phone', True), (820, 1180, 'tabP', True), (1180, 820, 'tabL', True), (1440, 900, 'desk', False)]
C = Checker('t17 legacy fit')
SHOTS_DIR = Path('/tmp/r313_t17'); SHOTS_DIR.mkdir(exist_ok=True)
PARENT_PL = {'game-settings', 'admin', 'settings', 'parent', 'offline', 'children', 'learning-help', 'learning-plan', 'learning-report', 'assembly-report', 'assembly-plan', 'credits'}

# id: (hash, primary selector that must be inside the first screen, extra click before measuring)
PAGES = {
    'classroom': ('#classroom', '#l30-unit-q', None),
    'library': ('#library', '#l30-word-q', None),
    'unit': ('#unit?id=U01', '.q36-start [data-l30="start"]', None),
    'report': ('#report', '.p40-next .btn,.stats', None),
    'settings': ('#settings', '#v25-version-panel [data-act="export-data"]', None),
    'parent': ('#parent', '.s60-colbox a.l30-card', None),
    'offline': ('#offline', '[data-act="prepare-media"]', None),
    'game-settings': ('#game-settings', '[data-a28="save-settings"]', None),
    'game': ('#game', '.p30-card [data-a28="intro"]', None),
    'assembly': ('#assembly', '#l31-q', None),
    'assembly-unit': ('#assembly-unit?id=air', '.l31-launch-actions button', None),
    'learning-help': ('#learning-help', '.s60-colbox a', None),
    'learning-plan': ('#learning-plan', '[data-l30="save-plan"]', None),
    'family-lesson': ('#family-lesson', '.fg-hero .btn', None),
    'phonics-lesson': ('#phonics-lesson', '.pc-course-actions button', None),
    'login-admin': ('#login', '[data-act="logout"]', None),
    'practice': ('#practice', '[data-l30="entry"]', None),
    'companions': ('#companions', '.wq32-roster button', None),
}
WQM = {'wqm-home': ('math', 'home', None, '[data-action="daily:normal"]'),
       'wqm-normal': ('math', 'home', '[data-action="nav:normal"]', '[data-action^="grade"]'),
       'wqm-tools': ('math', 'home', '[data-action="nav:tools"]', '[data-action^="selecttool"]'),
       'wqm-parent': ('math', 'home', '[data-action="nav:parent"]', '[data-action="export"]'),
       'wqm-olympiad': ('olympiad', 'olympiad', None, '[data-action^="olylevel"]'),
       'wqm-cards': ('olympiad', 'olympiad', '[data-action="nav:cards"]', '.badge-card')}


def admin(p, w, h, touch):
    b, ctx, pg, errs = open_page(p, w, h, touch, learn=True)
    html = patched_html()
    pg.route(URL + '?mode=admin-test', lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html))
    pg.goto(URL + '?mode=admin-test'); pg.wait_for_timeout(1200)
    go(pg, '#login', 300)
    pg.fill('#login-name', 'Admin'); pg.fill('#login-pin', '1234')
    pg.click('[data-act="login-submit"]'); pg.wait_for_timeout(1200)
    go(pg, '#kid', 400)
    return b, pg, errs


def measure(pg, pid, shadow=False, primary=None):
    return pg.evaluate(MEASURE, dict(shadow=shadow, primary=primary))


def in_first_screen(pg, sel, shadow=False):
    return pg.evaluate("""([sel,shadow])=>{const R=shadow?document.querySelector('#wqm-app-host').shadowRoot:document;
      const e=[...R.querySelectorAll(sel)].find(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1;});
      if(!e)return {found:false};const r=e.getBoundingClientRect();const nav=document.querySelector('.r37-nav');
      const lim=nav&&!shadow?nav.getBoundingClientRect().top:innerHeight;
      return {found:true,top:Math.round(r.top),bottom:Math.round(r.bottom),lim:Math.round(lim),ok:r.top>=-1&&r.bottom<=lim+1&&r.left>=-1&&r.right<=innerWidth+1};}""", [sel, shadow])


def check_page(pg, errs, pid, vp, shadow=False):
    name = vp[2]
    m = measure(pg, pid, shadow)
    tag = f'{pid}@{name}'
    C.ok(not (m['h_overflow_doc'] or m['h_overflow_elems']), f'{tag}: no horizontal overflow {m["h_overflow_sample"]}')
    C.ok(m['head_px'] == 0, f'{tag}: old site header is gone (head_px={m["head_px"]})')
    C.ok(len(m['back_controls']) <= 1, f'{tag}: at most one back control {m["back_controls"]}')
    C.ok(m['need_px_nolist'] <= 8, f'{tag}: everything outside list containers fits (need_px_nolist={m["need_px_nolist"]}, raw {m["need_px"]})')
    C.ok(m['tiny_count'] == 0, f'{tag}: touch targets >= 44px ({m["tiny_count"]} tiny {m["tiny_sample"][:3]})')
    C.ok(m['min_font'] is None or m['min_font'] >= 12, f'{tag}: font floor 12px (min {m["min_font"]})')
    lim = 40 if pid in PARENT_PL or pid.startswith('wqm-parent') else 20
    C.ok(m['text']['desc'] <= lim, f'{tag}: copy <= {lim} units (desc={m["text"]["desc"]} {[d["txt"][:24] for d in m["desc_top"][:2]]})')
    pg.screenshot(path=str(SHOTS_DIR / f'{pid}__{name}.jpg'), type='jpeg', quality=55)
    return m


def run():
    with sync_playwright() as p:
        for vp in VPS:
            w, h, name, touch = vp
            b, pg, errs = admin(p, w, h, touch)
            pg.set_default_timeout(8000)
            for pid, (hash_, primary, _) in PAGES.items():
                go(pg, '#kid', 250); go(pg, hash_, 700)
                m = check_page(pg, errs, pid, vp)
                r = in_first_screen(pg, primary)
                C.ok(r.get('found') and r.get('ok'), f'{pid}@{name}: main action {primary!r} inside the first screen {r}')
                hh = pg.evaluate("(()=>{const h=[...document.querySelectorAll('.r37-legbody h1,.r37-legbody h2,.r37-legt')].find(e=>e.getBoundingClientRect().height>0);if(!h)return null;const r=h.getBoundingClientRect();return {top:r.top,bottom:r.bottom}})()")
                C.ok(hh is not None and hh['top'] >= 0 and hh['bottom'] <= h, f'{pid}@{name}: title inside the first screen {hh}')
            # ---- maths / olympiad dialogs (shadow DOM)
            for pid, (planet, key, sub, primary) in WQM.items():
                pg.evaluate("document.querySelector('#wqm-dialog')?.close?.()")
                go(pg, '#p/' + planet, 450)
                pg.evaluate("(k)=>document.querySelector(`[data-wqm-open=\"${k}\"]`)?.click()", key); pg.wait_for_timeout(1100)
                if sub:
                    pg.evaluate("(a)=>{const r=document.querySelector('#wqm-app-host').shadowRoot;r.querySelector(a)?.click()}", sub); pg.wait_for_timeout(900)
                m = check_page(pg, errs, pid, vp, shadow=True)
                r = in_first_screen(pg, primary, shadow=True)
                C.ok(r.get('found') and r.get('ok'), f'{pid}@{name}: main action {primary!r} inside the first screen {r}')
            pg.evaluate("document.querySelector('#wqm-dialog')?.close?.()")
            C.ok(not [e for e in errs if 'favicon' not in e], f'{name}: no console / page errors {errs[:3]}')
            b.close()

        # ------------------------------------------------ defects
        w, h, name, touch = VPS[0]
        b, pg, errs = admin(p, w, h, touch)
        # 1. family lesson: was locked (content 1.5 screens, no scroll). Now inside the legacy frame, list scrolls inside itself.
        go(pg, '#family-lesson', 800)
        d = pg.evaluate("""()=>{const l=document.querySelector('.r37-legbody'),g=document.querySelector('.fg-family-grid');
          const b=getComputedStyle(document.body);return {leg:!!l,legOv:l&&getComputedStyle(l).overflowY,grid:!!g,gOv:g&&getComputedStyle(g).overflowY,
          gScroll:g?g.scrollHeight-g.clientHeight:0,last:g&&g.lastElementChild?g.lastElementChild.getBoundingClientRect().bottom:0,vh:innerHeight,bodyOv:b.overflowY}}""")
        C.ok(d['leg'] and d['grid'], f'defect 1: family lesson sits in the legacy frame {d}')
        C.ok(d['gOv'] in ('auto', 'scroll') or d['gScroll'] <= 0, f'defect 1: family cards scroll inside their container (or all visible) {d}')
        pg.evaluate("(()=>{const g=document.querySelector('.fg-family-grid');if(g)g.scrollTop=g.scrollHeight})()"); pg.wait_for_timeout(150)
        last = pg.evaluate("(()=>{const g=document.querySelector('.fg-family-grid');const e=g&&g.lastElementChild;if(!e)return null;const r=e.getBoundingClientRect(),n=document.querySelector('.r37-nav').getBoundingClientRect();return r.bottom<=n.top+1&&r.top>=0})()")
        C.ok(last, 'defect 1: the last family card can be reached')
        # 2. report title contrast
        go(pg, '#report', 700)
        col = pg.evaluate("""()=>{const h=document.querySelector('.r37-legbody h1');const c=getComputedStyle(h).color.match(/\\d+/g).map(Number);
          const lum=a=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(a[0])+0.7152*f(a[1])+0.0722*f(a[2])};
          return {color:c,lum:lum(c),text:h.textContent.trim()}}""")
        # page background is #161a5a..#0c1033 (luminance < 0.02): contrast = (L+0.05)/(0.02+0.05)
        C.ok((col['lum'] + 0.05) / (0.02 + 0.05) >= 4.5, f'defect 2: report title light on dark (contrast {(col["lum"]+0.05)/0.07:.1f}) {col}')
        b.close()

        # 3. parent gate (family account, not unlocked): title + hint readable on the white card
        b, ctx, pg, errs = open_page(p, 390, 844, True, learn=True)
        register(pg); pg.wait_for_timeout(600)
        go(pg, '#p/parent', 800)
        g = pg.evaluate("""()=>{const lum=a=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(a[0])+0.7152*f(a[1])+0.0722*f(a[2])};
          const card=document.querySelector('.r37-gate .card');if(!card)return null;
          const bg=getComputedStyle(card).backgroundColor.match(/[\\d.]+/g).map(Number);
          const out=[...card.querySelectorAll('h1,h2,p,label,small')].filter(e=>e.textContent.trim()&&e.getBoundingClientRect().height>0).map(e=>{
            const c=getComputedStyle(e).color.match(/[\\d.]+/g).map(Number);const L1=lum(c),L2=lum(bg);const hi=Math.max(L1,L2),lo=Math.min(L1,L2);
            return {t:e.textContent.trim().slice(0,14),ratio:(hi+0.05)/(lo+0.05)};});
          return {bg,out}}""")
        C.ok(g and g['out'] and min(x['ratio'] for x in g['out']) >= 4.5, f'defect 3: parent gate text contrast >= 4.5 {g}')
        # 4. unit/lesson floating action bar must not cover the word being studied
        go(pg, '#unit?id=U01', 600)
        pg.click('[data-l30="start"]'); pg.wait_for_timeout(900)
        cov = pg.evaluate("""()=>{const bar=document.querySelector('.l30-quizactions');if(!bar)return {bar:false};const br=bar.getBoundingClientRect();
          const els=[...document.querySelectorAll('.l30-qcard .l30-bigword,.l30-qcard .l30-prompt,.l30-qcard .l30-audio,.l30-qcard .l30-qimage')].filter(e=>e.getBoundingClientRect().height>0);
          const hits=els.filter(e=>{const r=e.getBoundingClientRect();return !(r.bottom<=br.top||r.top>=br.bottom||r.right<=br.left||r.left>=br.right)}).map(e=>e.className);
          return {bar:true,hits,barTop:br.top,barBottom:br.bottom,nav:document.querySelector('.r37-nav').getBoundingClientRect().top}}""")
        C.ok(cov['bar'] and not cov['hits'], f'defect 4: floating next-bar does not cover the word/meaning/audio {cov}')
        C.ok(cov['bar'] and cov['barBottom'] <= cov['nav'] + 1, f'defect 4: next-bar stays above the bottom nav {cov}')
        # one top bar: voice 🔊 in the bar, ⋯ menu opens with the old header actions
        vb = pg.evaluate("document.querySelectorAll('.r37-leg>.r37-bar [data-wq32=\"voice\"]').length")
        C.ok(vb == 1, f'one 🔊 button lives in the top bar ({vb})')
        pg.click('.s60-more'); pg.wait_for_timeout(150)
        mi = pg.evaluate("[...document.querySelectorAll('.s60-menu>*')].map(e=>e.textContent.trim().replace(/\\s+/g,' '))")
        C.ok(len(mi) >= 4 and any('聲音' in x for x in mi) and any('家長' in x for x in mi), f'⋯ menu holds child / sound / account / parent {mi}')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
        C.ok(pg.evaluate("!document.querySelector('.s60-menu')"), '⋯ menu closes on Escape')
        # settings: ⓘ + folded cards still operate (export button reachable, fold toggles)
        go(pg, '#settings', 700); unlock_parent(pg); pg.wait_for_timeout(500)
        fold = pg.evaluate("""()=>{const c=[...document.querySelectorAll('.s60-fold')];return {n:c.length,open:c.filter(x=>!x.classList.contains('s60-closed')).length,exp:!!document.querySelector('[data-act="export-data"]')}}""")
        C.ok(fold['n'] >= 4 and fold['open'] >= 1 and fold['exp'], f'settings cards fold, backup card open {fold}')
        C.ok(not [e for e in errs if 'favicon' not in e], f'defect pass: no console errors {errs[:3]}')
        b.close()
    C.done()


run()

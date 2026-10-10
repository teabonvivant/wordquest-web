"""Shared helpers for the R3.7 browser tests. The page is the build under test (WQ33_APP), served through Playwright route()
with one read-only bridge `window.__r37(code)` (eval inside the host closure). Behaviour is driven by real clicks and keys."""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
R = HERE.parent
sys.path.insert(0, str(R / 'r33_tests'))
sys.path.insert(0, str(R / 'r35_tests'))
import wq33  # noqa: E402
from wq33 import APP, URL, new_page, register, sync_playwright  # noqa: E402,F401

ANCHOR = '\ninstallMediaEvents();\nrender();'
SHOTS = Path('/tmp/r37_shots')
SHOTS.mkdir(exist_ok=True)
VIEWPORTS = [(390, 844, 'phone', True), (844, 390, 'landscape', True), (768, 1024, 'tablet', True), (1440, 900, 'desktop', False)]


def patched_html():
    import p20_lib
    s = p20_lib.patched_html()
    assert s.count(ANCHOR) == 1
    return s.replace(ANCHOR, '\nwindow.__r37=(c)=>eval(c);' + ANCHOR, 1)


def open_page(p, w=390, h=844, touch=True, learn=False):
    b, ctx, pg, errs = new_page(p, w, h, touch=touch)
    if not learn:  # R3.9 learning card off for the older flow tests; t11 covers it
        ctx.add_init_script("try{localStorage.setItem('wq37-nolearn','1')}catch(e){}")
    html = patched_html()
    pg.route(URL, lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html))
    pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    pg.emulate_media(reduced_motion='reduce')
    pg.set_default_timeout(12000)
    return b, ctx, pg, errs


def ev(pg, code):
    return pg.evaluate("(c)=>window.__r37(c)", code)


def go(pg, h, wait=350):
    pg.evaluate("(h)=>{location.hash=h}", h)
    pg.wait_for_timeout(wait)


class Checker:
    def __init__(self, name):
        self.name, self.n, self.fails = name, 0, []

    def ok(self, cond, msg):
        self.n += 1
        if not cond:
            self.fails.append(msg)
            print('  FAIL', msg)

    def done(self):
        print(f'{self.name}: {self.n - len(self.fails)}/{self.n} checks passed')
        if self.fails:
            sys.exit(1)


def fits(pg, sel):
    """True when every element matching sel is fully inside the viewport (nothing needs scrolling to reach it)."""
    return pg.evaluate("""(sel)=>{const els=[...document.querySelectorAll(sel)];if(!els.length)return false;
      const nav=document.querySelector('.r37-nav'),nt=nav?nav.getBoundingClientRect().top:innerHeight;
      return els.every(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);if(s.display==='none'||r.width===0)return true;const lim=nav&&!nav.contains(e)?Math.min(nt,innerHeight):innerHeight;return r.top>=-1&&r.left>=-1&&r.bottom<=lim+1&&r.right<=innerWidth+1;});}""", sel)

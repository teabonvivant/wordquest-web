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


def route_oly(pg):
    """R3.20: the merged Olympiad classroom loads host.js as a module; from file:// the browser blocks it (CORS) and logs a console error on every page.
    Serving those files through route() with an allow-origin header gives the page the same files the website serves - nothing is filtered or ignored.
    R3.30: a function of its own, so a second tab opened by a test (t19 new_tab) gets the same route as the first one."""
    def _oly(route):
        import mimetypes
        from urllib.parse import urlparse, unquote
        f = Path(unquote(urlparse(route.request.url).path))
        try:
            body = f.read_bytes()
        except OSError:
            return route.fallback()
        route.fulfill(status=200, body=body, content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream', headers={'access-control-allow-origin': '*'})
    pg.route('**/olympiad-classroom/**', _oly)


HTTPS_ORIGIN = 'https://wq37.test'
HTTPS_URL = HTTPS_ORIGIN + '/index.html'
_HTML = None


def serve_https(pg):
    """R3.30: serve the page under test (plus the files next to it: assets/, olympiad-classroom/) from a real https origin through route(), no network.
    Use it for tests about what the BROWSER STORAGE keeps (a reload, a second tab): in this headless Chromium a file:// page is not reliably given the same localStorage
    after a reload or in a second tab (probes _team_runs/r330/logs/t19_probe5/6.log: about half of the runs lost every key; the same flow over https lost none, 3/3 and then
    the whole of t19). The website is https, so this is also the closer model."""
    import mimetypes
    from urllib.parse import urlparse, unquote
    global _HTML
    if _HTML is None:
        _HTML = patched_html()
    appdir = wq33.APP.parent

    def h(route):
        path = unquote(urlparse(route.request.url).path)
        if path in ('/', '/index.html'):
            return route.fulfill(status=200, content_type='text/html; charset=utf-8', body=_HTML)
        f = appdir / path.lstrip('/')
        try:
            body = f.read_bytes()
        except OSError:
            return route.fulfill(status=404, body=b'')
        route.fulfill(status=200, body=body, content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
    pg.route(HTTPS_ORIGIN + '/**', h)


def open_https_page(p, w=390, h=844, touch=True, learn=False):
    """open_page, but on the https origin of serve_https; returns (browser, ctx, page, errs) with the app loaded and the bridge ready"""
    b, ctx, pg, errs = open_page(p, w, h, touch, learn)
    serve_https(pg)
    pg.goto(HTTPS_URL)
    pg.wait_for_function('typeof window.__r37==="function"', timeout=int(__import__("os").environ.get("WQ37_TIMEOUT", "60000")))
    pg.wait_for_timeout(700)
    return b, ctx, pg, errs


def register_form(pg, name='tester', child='小明', pw=None, remember=True):
    """create an account through the real form (like t19) on whatever origin the page is on"""
    pg.evaluate("location.hash='#login'")
    pg.wait_for_selector('#register-name')
    pg.fill('#register-name', name)
    pg.fill('#register-child', child)
    if pg.query_selector('#register-grade'):
        pg.select_option('#register-grade', '3')
    pg.fill('#register-pin', pw or wq33.PW)
    cb = pg.query_selector('#s52-rem-reg')
    if cb and cb.is_checked() != remember:
        cb.click()
    pg.click('[data-act="register-submit"]')
    pg.wait_for_function("()=>window.__r37('isLoggedIn()')", timeout=int(__import__("os").environ.get("WQ37_TIMEOUT", "60000")))
    pg.wait_for_timeout(1200)


def open_page(p, w=390, h=844, touch=True, learn=False):
    b, ctx, pg, errs = new_page(p, w, h, touch=touch)
    if not learn:  # R3.9 learning card off for the older flow tests; t11 covers it
        ctx.add_init_script("try{localStorage.setItem('wq37-nolearn','1')}catch(e){}")
    html = patched_html()
    pg.route(URL, lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html))
    route_oly(pg)
    pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    pg.emulate_media(reduced_motion='reduce')
    pg.set_default_timeout(int(__import__("os").environ.get("WQ37_TIMEOUT","60000")))
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


def tap_text(pg, text, avoid=''):
    """R3.31: fill-in answers are tapped from tiles. Taps the pad tile of each character; a character with no free tile taps a decoy that is not in `avoid` (a wrong answer stays wrong)."""
    pg.wait_for_selector('.wqp-t', timeout=10000); pg.wait_for_timeout(200)
    for ch in text:
        ch = '空格' if ch == ' ' else ch
        pg.evaluate("""([t,av])=>{const bs=[...document.querySelectorAll('.wqp-t:not(.back)')].filter(b=>!b.disabled);
          const b=bs.find(b=>b.textContent===t)||bs.find(b=>b.textContent.length===1&&!av.includes(b.textContent));if(b)b.click()}""", [ch, avoid])
        pg.wait_for_timeout(80)

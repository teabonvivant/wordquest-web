"""Shared Playwright helpers for R3.3 tests (read-only for module authors).

WQ33_APP  absolute path of the index.html under test (default: <repo>/app/index.html)
Chromium  /opt/pw-browsers/chromium (sandbox) or /usr/bin/chromium
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright  # noqa: F401  (re-exported for tests)

R = Path(__file__).resolve().parents[1]
APP = Path(os.environ.get('WQ33_APP') or (R / 'app/index.html')).resolve()
URL = APP.as_uri()
PW = 'R1testPass99'
CHROMIUM = next((p for p in ['/opt/pw-browsers/chromium', '/usr/bin/chromium'] if os.path.exists(p)), None)


def launch(p):
    return p.chromium.launch(executable_path=CHROMIUM, args=['--no-sandbox'])


def new_page(p, w=390, h=844, touch=False, accept_downloads=False, url_suffix='', legacy=True):
    """Returns (browser, context, page, errors). touch=True emulates a phone (is_mobile)."""
    b = launch(p)
    kw = dict(viewport={'width': w, 'height': h}, accept_downloads=accept_downloads)
    if touch:
        kw.update(has_touch=True, is_mobile=True, device_scale_factor=2)
    ctx = b.new_context(**kw)
    pg = ctx.new_page()
    if legacy:  # R3.38: keep the sealed arcade open and the learning gate off for tests written before them
        pg.add_init_script("try{localStorage.setItem('wq37-t-legacy','1')}catch(e){}")
    errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    return b, ctx, pg, errs


def register(pg, name='tester', child='小明', pw=PW, grade='3', url_suffix=''):
    """Register a family account and land on the child's home. Fills #register-grade if the form has it."""
    pg.goto(URL + url_suffix)
    pg.wait_for_timeout(800)
    pg.evaluate("location.hash='#login'")
    pg.wait_for_timeout(400)
    pg.fill('#register-name', name)
    pg.fill('#register-child', child)
    if pg.query_selector('#register-grade'):
        pg.select_option('#register-grade', grade)
    pg.fill('#register-pin', pw)
    pg.click('[data-act="register-submit"]')
    pg.wait_for_timeout(2500)


def unlock_parent(pg, pw=PW):
    """Pass the parent gate if it is showing."""
    if pg.query_selector('#v23-parent-password'):
        pg.fill('#v23-parent-password', pw)
        pg.click('[data-v23="parent-unlock"]')
        pg.wait_for_timeout(1500)


def hit(pg, selector):
    """True when the centre of `selector` is the topmost element there (i.e. a real tap would reach it)."""
    return pg.evaluate("""(sel)=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();
      const x=r.left+r.width/2,y=r.top+r.height/2;if(x<0||y<0||x>innerWidth||y>innerHeight)return 'offscreen';
      const t=document.elementFromPoint(x,y);return !!t&&(t===e||e.contains(t)||t.contains(e));}""", selector)


# R3.31: fill-in answers are tapped from tiles (WQPad); the inputs are read-only. Page.fill on such an input taps the tiles instead, so every older flow test still answers
# through the real UI. Characters that are not on the pad are skipped (a deliberately wrong answer stays wrong); a plain input is filled as before.
from playwright.sync_api import Page as _Page  # noqa: E402
_plain_fill = _Page.fill


def _tile_fill(self, selector, value, **kw):
    el = self.query_selector(selector)
    if not el or el.get_attribute('data-wqp') != '1':
        return _plain_fill(self, selector, value, **kw)
    self.evaluate("(el)=>{if(el.value){el.value='';el.dispatchEvent(new Event('input',{bubbles:true}))}}", el)
    sentence = el.evaluate("el=>el.tagName==='TEXTAREA'")
    for tok in (str(value).split(' ') if sentence else list(str(value))):
        if not sentence and tok == ' ':
            tok = '空格'
        hit_ = self.evaluate("""([el,t])=>{const pad=el._wqpG&&el._wqpG.pad;if(!pad)return false;if(el._wqpG.active!==el)el.click();
          const b=[...pad.querySelectorAll('.wqp-t')].find(b=>!b.disabled&&b.textContent===t);if(!b)return false;b.click();return true}""", [el, tok])
        if not hit_ and sentence:
            continue


_Page.fill = _tile_fill


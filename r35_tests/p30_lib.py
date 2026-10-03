"""Shared helpers for the p30 (arcade) browser tests of R3.5.

* WQ33_APP (see r33_tests/wq33.py) picks the index.html under test; run every suite against the new build and the
  `--base-only` build. Checks marked [B] must fail on the base and pass on the new build.
* Pages come from r34_tests/wq34_lib.open_page (diagnostics bridge window.__p40 plus console-error capture).
* `touch=True` is a phone (is_mobile + has_touch => pointer: coarse); `touch=False` is a desktop (pointer: fine).
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
R = HERE.parent
sys.path.insert(0, str(R / 'r33_tests'))
sys.path.insert(0, str(R / 'r34_tests'))
import wq33  # noqa: E402
from wq33 import APP, URL, sync_playwright  # noqa: E402,F401
from p40_lib import Checker, boot_account, st  # noqa: E402,F401
import wq34_lib  # noqa: E402
from wq34_lib import open_page, start_game  # noqa: E402,F401

SHOTS = Path('/home/claude/audit_r35/r35/p30')
SHOTS.mkdir(parents=True, exist_ok=True)

IDS = ['sky-rescue', 'forest-dash', 'moon-bells', 'bounce-basket', 'number-garden', 'forest-band', 'drift-path',
       'meadow-cricket', 'honey-delivery', 'color-workshop', 'forest-pong', 'juice-lines', 'honeycomb-puzzle',
       'valley-race', 'rolling-block', 'block-studio', 'star-rhythm', 'color-orbit', 'garden-paths',
       'little-engineer', 'sweet-studio', 'ruins-courier', 'cloud-island', 'star-patrol', 'lighthouse-well',
       'harbor-volley']
# words that only make sense with a keyboard / mouse; they must never be shown on a phone
KEYBOARD_WORDS = re.compile(r'方向鍵|WASD|W A S D|Space|空白鍵|鍵盤|Shift|Esc|滑鼠|按住 Space|Backspace|[←→↑↓]|\bQ E\b|按 [0-9A-Z]')
IS_NEW = 'wq35-p30-css' in APP.read_text(encoding='utf-8', errors='ignore')
TAG = 'new' if IS_NEW else 'base'

MEASURE_JS = r"""
(args) => {
  const sels = args.sels, minPx = args.minPx || 0;
  const parseColor = s => { s = (s||'').trim(); let m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m) { const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(x=>x.endsWith('%')?parseFloat(x)*2.55:parseFloat(x)); return {r:p[0],g:p[1],b:p[2],a:p.length>3?(p[3]>1?p[3]/100:p[3]):1}; }
    m = s.match(/^color\(srgb ([^)]+)\)$/);
    if (m) { const p = m[1].split(/[ \/]+/).map(parseFloat); return {r:p[0]*255,g:p[1]*255,b:p[2]*255,a:p.length>3?p[3]:1}; }
    return null; };
  const blend = (fg,bg) => ({r:fg.r*fg.a+bg.r*(1-fg.a),g:fg.g*fg.a+bg.g*(1-fg.a),b:fg.b*fg.a+bg.b*(1-fg.a),a:1});
  const lum = c => { const f = v => { v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b); };
  const ratio = (a,b) => { const la=lum(a), lb=lum(b); return (Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05); };
  function bases(e){
    const layers = [];
    for (let a=e; a; a=a.parentElement) {
      const cs = getComputedStyle(a), bc = parseColor(cs.backgroundColor), bi = cs.backgroundImage;
      if (bi && /gradient/.test(bi)) { const stops = [...bi.matchAll(/rgba?\([^)]+\)/g)].map(x=>parseColor(x[0])).filter(Boolean);
        if (stops.length) { layers.push({grad:stops}); if (stops.every(s=>s.a>=0.99)) break; } }
      if (bc && bc.a>0) { layers.push({solid:bc}); if (bc.a>=0.99) break; }
    }
    let out = [{r:255,g:255,b:255,a:1}];
    for (let i=layers.length-1; i>=0; i--) { const L = layers[i];
      if (L.solid) out = out.map(b=>blend(L.solid,b));
      else { const nb=[]; for (const s of L.grad) for (const b of out) nb.push(blend(s,b)); out = nb.slice(0,12); } }
    return out;
  }
  const vis = e => { const r=e.getBoundingClientRect(); if (r.width<=0||r.height<=0) return false;
    const sm = e.closest('summary');
    for (let a=e; a; a=a.parentElement) { const cs=getComputedStyle(a); if (cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)===0) return false;
      if (a.tagName==='DETAILS' && !a.open && !(sm && sm.parentElement===a)) return false; } return true; };
  const ownText = e => [...e.childNodes].some(n => n.nodeType===3 && n.nodeValue.trim());
  const rows = [];
  for (const sel of sels) for (const e of document.querySelectorAll(sel)) {
    if (!vis(e) || e.closest('[aria-hidden="true"], [role="img"]') || !ownText(e)) continue;
    const t = (e.innerText||'').replace(/\s+/g,' ').trim(); if (!t) continue;
    const cs = getComputedStyle(e), fg = parseColor(cs.color), op = parseFloat(cs.opacity);
    if (!fg) continue;
    let worst = 99;
    for (const b of bases(e)) { const f = blend({...fg, a:fg.a*(isNaN(op)?1:op)}, b); worst = Math.min(worst, ratio(f,b)); }
    rows.push({sel, text:t.slice(0,30), fs:parseFloat(cs.fontSize), ratio:Math.round(worst*100)/100, w:e.getBoundingClientRect().width, h:e.getBoundingClientRect().height});
  }
  return rows;
}
"""


# Test-only bridge for states the shared bridges cannot reach (round counter, parent block). Spliced in like __p40; not part of the app.
BRIDGE30 = r"""
window.__p30={
 used(n){const c=a28Child();c.batch.used=n;if(!save())throw Error('p30 used: save failed');render();return c.batch.used;},
 block(id){const c=a28Child();c.permissions[id]='blocked';if(!save())throw Error('p30 block: save failed');render();return c.permissions[id];},
 logged(){return isLoggedIn();}
};
"""


def open_page30(p, w, h, touch=True):
    """Like wq34_lib.open_page, plus window.__p30."""
    b, ctx, pg, errs = wq33.new_page(p, w, h, touch=touch)
    html = wq34_lib.patched_html().replace('\ninstallMediaEvents();\nrender();', '\n' + BRIDGE30 + '\ninstallMediaEvents();\nrender();', 1)
    pg.route(URL, lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html))
    pg.on('dialog', lambda d: d.accept())
    pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    return b, ctx, pg, errs


def measure(pg, sels):
    return pg.evaluate(MEASURE_JS, {'sels': sels})


def minmax(rows, key):
    vals = [r[key] for r in rows]
    return (min(vals), max(vals)) if vals else (None, None)


def goto_lobby(pg, filt=None, open_locked=True):
    pg.evaluate("location.hash='#game'")
    pg.wait_for_selector('[data-a28="filter"]', timeout=15000)
    if filt:
        pg.locator(f'[data-a28="filter"][data-filter="{filt}"]').click()
    pg.wait_for_selector('[data-cabinet]', state='attached', timeout=15000)
    if open_locked:
        pg.evaluate("document.querySelectorAll('details.p30-locked').forEach(d=>d.open=true)")
    pg.wait_for_timeout(2500)  # thumbnails are drawn after render


def open_intro(pg, gid):
    if not pg.query_selector(f'[data-cabinet="{gid}"]'):
        pg.locator('[data-a28="filter"][data-filter="全部"]').click()
        pg.wait_for_selector(f'[data-cabinet="{gid}"]', state='attached', timeout=15000)
    pg.evaluate(f"(()=>{{const d=document.querySelector('[data-cabinet=\"{gid}\"]').closest('details');if(d)d.open=true;}})()")
    loc = pg.locator(f'[data-cabinet="{gid}"] [data-a28="intro"]')
    loc.scroll_into_view_if_needed()
    loc.click()
    pg.wait_for_selector('#pg-dialog[open]', timeout=8000)
    pg.wait_for_timeout(500)


def close_intro(pg):
    pg.locator('#pg-dialog [data-a28="close"]').click()
    pg.wait_for_timeout(250)


def visible_text(pg, sel):
    return pg.evaluate("(s)=>{const e=document.querySelector(s);return e?e.innerText.trim():null}", sel)


# JS helper text for tests: is an element really on screen (closed <details> children are not)?
SHOWN = """const shown=e=>{const r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)return false;const sm=e.closest('summary');
  for(let a=e;a;a=a.parentElement){const cs=getComputedStyle(a);if(cs.display==='none'||cs.visibility==='hidden')return false;
    if(a.tagName==='DETAILS'&&!a.open&&!(sm&&sm.parentElement===a))return false;}return true;};"""

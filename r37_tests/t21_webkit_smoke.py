"""t21: Safari-engine (Playwright WebKit) smoke run over the main screens, iPhone + iPad + desktop.
Checks: no page errors, no horizontal overflow, key element of each screen rendered. Not a real-device test."""
import os
import subprocess
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

APP = Path(os.environ.get('WQ33_APP', Path(__file__).resolve().parents[1] / 'app/index.html')).resolve()
OUT = Path(__file__).resolve().parents[1] / '_team_runs/r317/webkit'
OUT.mkdir(parents=True, exist_ok=True)
# R3.20: ask the OS for a free port - the fixed 8791 is now answered by another project's preview server on this box (every page came back as a 404, 30/57)
import socket
_s = socket.socket(); _s.bind(('127.0.0.1', 0)); PORT = _s.getsockname()[1]; _s.close()
VPS = [('iphone', 390, 844, True), ('ipad', 820, 1180, True), ('desk', 1440, 900, False)]
SCREENS = [('home', '#kid', '.r37-planet,.r37-home'), ('english', '#p/english', '.r37-tile'),
           ('enlevels', '#lv/english', '.r37-node,.r37-lvnode,[data-lv]'), ('math', '#p/math', '[data-wqm-open]'),
           ('dictation', '#p/dictation', '.r37-tile'), ('games', '#p/games', '.r37-tile'),
           ('fpsmap', '#lv/fps', '.r37-node,.r37-lvnode,[data-lv]'), ('fps', '#fps', 'canvas'),
           ('runner', '#lv/runner', '.r37-node,.r37-lvnode,[data-lv],canvas')]
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', str(APP.parent)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
fails, n = [], 0
try:
    with sync_playwright() as p:
        b = p.webkit.launch()
        for name, w, h, touch in VPS:
            kw = dict(viewport={'width': w, 'height': h})
            if touch:
                kw.update(has_touch=True, is_mobile=True, device_scale_factor=2)
            ctx = b.new_context(**kw)
            ctx.add_init_script("try{localStorage.setItem('wq37-nolearn','1')}catch(e){}")
            pg = ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
            pg.goto(f'http://127.0.0.1:{PORT}/{APP.name}'); pg.wait_for_timeout(2500)
            for sid, hsh, sel in SCREENS:
                pg.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close())")
                pg.evaluate("(h)=>{location.hash=h}", hsh); pg.wait_for_timeout(1300)
                r = pg.evaluate("""(sel)=>{const vis=[...document.querySelectorAll(sel)].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0}).length;
                  return {vis, over: document.documentElement.scrollWidth-innerWidth}}""", sel)
                n += 2
                if not r['vis']: fails.append(f'{name}/{sid}: nothing visible for {sel}')
                if r['over'] > 1: fails.append(f'{name}/{sid}: horizontal overflow {r["over"]}px')
                pg.screenshot(path=str(OUT / f'{name}_{sid}.png'))
            n += 1
            if errs: fails.append(f'{name}: page errors {errs[:3]}')
            ctx.close()
        b.close()
finally:
    srv.terminate()
for f in fails: print('  FAIL', f)
print(f't21 webkit smoke: {n-len(fails)}/{n} checks passed')
sys.exit(1 if fails else 0)

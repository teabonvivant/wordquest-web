"""Shared helpers for the R3.4 browser tests (phone play layer, gestures, host rules).

Builds on r33_tests/p40_lib.py (same read-only diagnostics bridge idea): WQ33_APP picks the build under test,
the page is served through Playwright route() with an extra test-only bridge `window.__w34` spliced in just before
the injection anchor (it runs inside the host closure, so it can read the game state; it is NOT part of the app).
Real touch input goes through Chromium's DevTools Input.dispatchTouchEvent, so the pages see genuine pointer events.
"""
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'r33_tests'))
import p40_lib  # noqa: E402
from p40_lib import Checker, boot_account, st, sync_playwright, APP, URL, ANCHOR, osc, osc_mark, osc_since, freqs  # noqa: E402,F401
import wq33  # noqa: E402

BRIDGE34 = r"""
window.__w34={
 g(){return pgGame;},
 info(){const g=pgGame;return {id:pgMeta&&pgMeta.id||'',playing:!!pgPlaying,keys:g?[...g.keys]:[],score:g?Number(g.score)||0:null,
   health:g?g.health:null,level:g?g.level:null,done:g?!!g.done:null,reason:pgReason,error:pgError||'',
   imm:!!document.querySelector('.a28-play.r2-immersive'),fs:!!document.fullscreenElement,
   sources:[...a28Sources.keys()].filter(k=>a28Sources.get(k).size>0)};},
 pos(){const g=pgGame;if(!g)return null;const p=g.p||g.pos||null;return {x:p?Number(p.x):null,y:p?Number(p.y):null,lane:g.lane??null,dir:g.dir??null,
   rotation:g.rotation??null,moves:g.moves??null,jump:g.jump??null,slide:g.slide??null,shield:g.shield??null,vy:p?Number(p.vy):null};},
 // Records every change of the held-key set (with timestamps) until stopRec().
 startRec(){window.__w34rec=[];let last='';window.__w34int=setInterval(()=>{if(!pgGame)return;const k=[...pgGame.keys].sort().join(',');if(k!==last){last=k;window.__w34rec.push([performance.now(),k]);}},4);return performance.now();},
 stopRec(){clearInterval(window.__w34int);return window.__w34rec;},
 ready(){return typeof WQ34T==='object';},
 touchState(){return {auto:WQ34T.state.auto,dismissed:WQ34T.state.dismissed,heavy:WQ34T.state.heavy,taps:WQ34T.state.taps,swipes:WQ34T.state.swipes,steers:WQ34T.state.steers,autoEnter:WQ34T.state.autoEnter,ptr:WQ34T.state.ptr.size};},
 rules(){const r=a28Run()||{};return {phase:r.phase||'',lives:r.lives,success:r.success,result:r.result||'',winning:pgGame?a28Winning(pgGame):null};},
 end(msg){a28Fail(msg||'w34 test');return performance.now();},
 snapOk(){try{SNAP28.verify(SNAP28.capture(pgGame));return true;}catch(e){return String(e&&e.message||e);}},
 checkpoint(){return pgCheckpoint();},
 fxOn(){return WQFX.on();},
 audio(){const A=pgAudio;return {ctx:!!A.ctx,state:A.ctx&&A.ctx.state,sfx:sfxEnabled(),vol:A.volume('sfx'),sample:A.sample,epoch:A.epoch};},
 fxStats(){return {...WQFX.stats};},
 tool(id){a28Tool(id);}
};
"""


def patched_html():
    s = APP.read_text()
    assert s.count(ANCHOR) == 1, 'test-injection anchor must exist exactly once'
    return s.replace(ANCHOR, '\n' + p40_lib.BRIDGE + BRIDGE34 + ANCHOR, 1)


def open_page(p, w=844, h=390, touch=True, audio=False):
    b, ctx, pg, errs = wq33.new_page(p, w, h, touch=touch)
    html = patched_html()
    pg.route(URL, lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html))
    if audio:
        pg.add_init_script(p40_lib.AUDIO_SPY)
    pg.on('dialog', lambda d: d.accept())
    pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    return b, ctx, pg, errs


def start_game(pg, gid, play=True):
    pg.evaluate("location.hash='#game'")
    pg.wait_for_selector('[data-a28="filter"]', timeout=15000)
    if not pg.query_selector(f'[data-cabinet="{gid}"]'):
        pg.locator('[data-a28="filter"][data-filter="全部"]').click()
    pg.wait_for_selector(f'[data-cabinet="{gid}"]', timeout=15000)
    pg.locator(f'[data-cabinet="{gid}"]').scroll_into_view_if_needed()
    pg.locator(f'[data-cabinet="{gid}"] [data-a28="intro"]').click()
    pg.locator('#pg-dialog [data-a28="buy"]').click()
    pg.wait_for_selector('#pg-canvas', timeout=10000)
    pg.wait_for_function('__p40.state().game==="%s"' % gid, timeout=10000)
    if play:
        pg.locator('[data-a28="play"]').click()
        pg.wait_for_function('__p40.state().playing', timeout=10000)


def back_to_lobby(pg):
    pg.evaluate('__p40.reset(60)')
    pg.wait_for_selector('[data-cabinet]', timeout=10000)


class Touch:
    """Multi-finger touch through CDP. Coordinates are CSS pixels of the viewport."""

    def __init__(self, ctx, pg):
        self.cdp = ctx.new_cdp_session(pg)
        self.pts = {}

    def _send(self, kind):
        pts = [{'x': x, 'y': y, 'id': i, 'radiusX': 8, 'radiusY': 8, 'force': 1} for i, (x, y) in sorted(self.pts.items())]
        self.cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': pts})

    def down(self, i, x, y):
        self.pts[i] = (x, y)
        self._send('touchStart')

    def move(self, i, x, y):
        self.pts[i] = (x, y)
        self._send('touchMove')

    def up(self, i):
        # For touchEnd Chromium takes the list as "the points that end now" (not the ones that stay down).
        x, y = self.pts.pop(i, (0, 0))
        self.cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': [{'x': x, 'y': y, 'id': i}]})

    def cancel(self):
        self.cdp.send('Input.dispatchTouchEvent', {'type': 'touchCancel', 'touchPoints': []})
        self.pts.clear()

    def tap(self, x, y, ms=60, i=0):
        self.down(i, x, y)
        time.sleep(ms / 1000)
        self.up(i)

    def drag(self, i, x0, y0, x1, y1, steps=8, step_ms=16, hold=True):
        self.down(i, x0, y0)
        for s in range(1, steps + 1):
            time.sleep(step_ms / 1000)
            self.move(i, x0 + (x1 - x0) * s / steps, y0 + (y1 - y0) * s / steps)
        if not hold:
            self.up(i)


def canvas_rect(pg):
    return pg.evaluate("(()=>{const r=document.querySelector('#pg-canvas').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};})()")

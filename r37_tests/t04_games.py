"""R3.7 t04 - games planet: arcade still reachable, 字母獵場 (FPS) and 星際跑酷 (runner) mounted inside the app, mission and coin rules, clean tear-down."""
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t04')


def aim_fire(pg, correct=True):
    for _ in range(30):   # only a word not hidden behind a wall can be hit; wait for one to come into view
        if pg.evaluate("(want)=>{const d=WQ37FPS._debug;return d.state!=='play'||d.targets.some(t=>t.clear&&(t.word===d.correctWord)===want)}", correct):
            break
        pg.wait_for_timeout(100)
    ok = pg.evaluate("""(want)=>{const d=WQ37FPS._debug;if(d.state!=='play')return false;
      const i=d.targets.findIndex(t=>t.clear&&(t.word===d.correctWord)===want);if(i<0)return false;WQ37FPS._debugTurnTo(i);WQ37FPS._debugFire(0);return true;}""", correct)
    pg.wait_for_timeout(450)
    if not ok:
        raise AssertionError('no target')


with sync_playwright() as p:
    for w, h, name, touch in [(390, 844, 'phone', True), (1440, 900, 'desktop', False)]:
        b, ctx, pg, errs = open_page(p, w, h, touch)
        register(pg, 'r37games', '小明')
        go(pg, '#p/games', 500)
        C.ok(pg.evaluate("!!document.querySelector('a[href=\"#game\"]')"), f'{name}: arcade tile present')
        C.ok(pg.evaluate("!!document.querySelector('a[href=\"#lv/fps\"]')") and pg.evaluate("!!document.querySelector('a[href=\"#lv/runner\"]')"), f'{name}: FPS and runner tiles present')
        C.ok(pg.evaluate("document.documentElement.scrollHeight<=innerHeight+1"), f'{name}: games planet needs no page scroll')
        # arcade lobby from the planet still lists the 26-game catalogue (3 open + folded rest)
        go(pg, '#game', 900)
        C.ok(pg.evaluate("document.querySelectorAll('.p30-card').length") >= 3, f'{name}: arcade lobby renders cards')
        # FPS
        go(pg, '#fps', 700)
        C.ok(pg.evaluate("typeof WQ37FPS==='object'") and pg.evaluate("!!document.querySelector('#r37-fps-box canvas')"), f'{name}: FPS canvas mounted in the app')
        C.ok(pg.evaluate("!document.querySelector('.header')||getComputedStyle(document.querySelector('.header')).display==='none'"), f'{name}: app header hidden while playing (full screen)')
        pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
        C.ok(pg.evaluate('WQ37FPS._debug.state') == 'play', f'{name}: FPS starts')
        pg.wait_for_function("WQ37FPS._debug.targets.some(t=>t.clear&&t.word===WQ37FPS._debug.correctWord)", timeout=5000)
        s0 = pg.evaluate('WQ37FPS._debug.score')
        aim_fire(pg, True)
        try:
            pg.wait_for_function(f"WQ37FPS._debug.score>{s0}", timeout=3000); scored = True
        except Exception:
            scored = False
        C.ok(scored, f'{name}: shooting the right word scores')
        d0 = pg.evaluate('({h:WQ37FPS._debug.hearts,w:WQ37FPS._debug.wrong,s:WQ37FPS._debug.shield})')
        aim_fire(pg, False)
        d1 = pg.evaluate('({h:WQ37FPS._debug.hearts,w:WQ37FPS._debug.wrong,s:WQ37FPS._debug.shield})')
        C.ok(d1['w'] == d0['w'] + 1 and (d1['h'] == d0['h'] - 1 or (d0['s'] and not d1['s'] and d1['h'] == d0['h'])), f'{name}: shooting a wrong word costs a heart (or the shield) {d0}->{d1}')
        # leave through the app: no leftover canvas or loops
        go(pg, '#kid', 500)
        C.ok(pg.evaluate("document.querySelector('canvas')===null"), f'{name}: leaving the FPS removes the canvas')
        C.ok(pg.evaluate("WQ37FPS._debug")is None, f'{name}: FPS instance destroyed after leaving')
        C.ok(not errs, f'{name}: no console errors {errs[:3]}')
        b.close()

    # perfect FPS run: 5 stars -> 1 coin once per day cap, mission counter moves (difficulty 1: bugs are rare; retry if a bug still hurts)
    b, ctx, pg, errs = open_page(p, 1440, 900, False)
    register(pg, 'r37games2', '小明')
    ev(pg, 'r37Get().diff=1')
    c0 = ev(pg, 'r37Coins()'); f0 = ev(pg, 'r37Get().day.fps')
    res = None
    for attempt in range(3):
        go(pg, '#fps', 700); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
        t_end = time.time() + 60
        while time.time() < t_end and not pg.evaluate('WQ37FPS._debug.result'):
            if pg.evaluate("WQ37FPS._debug.state==='play'&&WQ37FPS._debug.targets.some(t=>t.clear&&t.word===WQ37FPS._debug.correctWord)"):
                aim_fire(pg, True)
            pg.wait_for_timeout(150)
        res = pg.evaluate('WQ37FPS._debug.result')
        if res and res['stars'] == 5:
            break
        go(pg, '#kid', 300)
    C.ok(res and res['stars'] == 5, f'perfect FPS run = 5 stars {res}')
    C.ok(ev(pg, 'r37Get().day.fps') >= f0 + 1, 'FPS finish counts for the daily mission')
    C.ok(ev(pg, 'r37Coins()') == c0 + 1, f'5-star FPS gives exactly 1 coin even after earlier tries ({c0}->{ev(pg, "r37Coins()")})')
    b.close()

    # ---- runner inside the app ----
    def rdbg(pg):
        return pg.evaluate('WQ37Run._debug')

    import test_runner as TR  # door, listen and spelling gates are solved the same way as the module test

    def rtake(pg, ok=True):
        TR.take(pg, ok)

    b, ctx, pg, errs = open_page(p, 390, 844, True)
    register(pg, 'r37run', '小明')
    go(pg, '#lv/runner', 500)
    C.ok(pg.evaluate("document.querySelectorAll('.r37-node').length") == 3 and pg.evaluate("document.querySelectorAll('.r37-node:not(.lock)').length") == 1, 'runner map: 3 stages per world, only the first open')
    C.ok(fits(pg, '.r37-node') and pg.evaluate("document.documentElement.scrollHeight<=innerHeight+1"), 'runner map fits the phone screen')
    pg.click('.r37-node.cur'); pg.wait_for_timeout(900)
    C.ok(pg.evaluate("!!document.querySelector('#r37-run-box canvas')") and ev(pg, 'location.hash') == '#rn/play', 'runner canvas mounted inside the app')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
    C.ok(rdbg(pg)['state'] in ('run', 'play', 'running'), f"runner starts ({rdbg(pg)['state']})")
    lane0 = rdbg(pg)['lane']
    pg.keyboard.press('ArrowUp'); pg.wait_for_timeout(200)
    C.ok(rdbg(pg)['lane'] != lane0 or lane0 == 0, 'ArrowUp changes lane')
    c0 = ev(pg, 'r37Coins()')
    n = 0
    while rdbg(pg)['state'] not in ('won', 'lost', 'result') and n < 12:
        rtake(pg, True); n += 1
    pg.wait_for_timeout(600)
    d = rdbg(pg)
    C.ok(d['stagePassed'] and n == 6, f'perfect scripted run clears the 6 gates ({n})')
    C.ok(ev(pg, "r37Entry('runner',0,0).passed") is True and ev(pg, "r37Entry('runner',0,0).best") == 5, 'runner result saved: passed with 5 stars')
    C.ok(ev(pg, 'r37Coins()') == c0 + 1, f"first 5-star runner stage pays 1 coin ({c0}->{ev(pg, 'r37Coins()')})")
    pg.wait_for_timeout(1800)
    go(pg, '#lv/runner', 500)
    C.ok(pg.evaluate("document.querySelectorAll('.r37-node:not(.lock)').length") == 2, 'passing runner stage 1 opens stage 2')
    go(pg, '#kid', 400)
    C.ok(pg.evaluate("document.querySelector('canvas')===null") and pg.evaluate("WQ37Run._debug")is None, 'leaving the runner destroys it')
    C.ok(not errs, f'no console errors {errs[:3]}')
    b.close()

    # games planet on small and landscape phones: the 今日任務 card must not squeeze the game tiles, every picture stays inside its tile
    for w, h, name in [(360, 640, 'small'), (844, 390, 'landscape')]:
        b, ctx, pg, errs = open_page(p, w, h, True)
        pg.goto(URL); pg.wait_for_timeout(1200); go(pg, '#p/games', 700)
        r = pg.evaluate("""()=>[...document.querySelectorAll('.r37-tiles .r37-tile')].map(t=>{const a=t.getBoundingClientRect(),i=t.querySelector('.r37-ti').getBoundingClientRect();return {h:Math.round(a.height),in:i.top>=a.top-1&&i.bottom<=a.bottom+1}})""")
        C.ok(len(r) == 4 and all(x['h'] >= 64 and x['in'] for x in r), f'{name}: 4 game tiles >= 64 px high with the picture inside {r}')
        C.ok(pg.evaluate("document.documentElement.scrollHeight<=innerHeight+1"), f'{name}: games planet needs no page scroll')
        b.close()
C.done()

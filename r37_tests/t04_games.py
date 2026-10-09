"""R3.7 t04 - games planet: arcade still reachable, 字母獵場 (FPS) and 星際跑酷 (runner) mounted inside the app, mission and coin rules, clean tear-down."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t04')


def aim_fire(pg, correct=True):
    ok = pg.evaluate("""(want)=>{const d=WQ37FPS._debug;if(d.state!=='play')return false;
      const i=d.targets.findIndex(t=>(t.word===d.correctWord)===want);if(i<0)return false;WQ37FPS._debugTurnTo(i);WQ37FPS._debugFire(0);return true;}""", correct)
    pg.wait_for_timeout(450)
    if not ok:
        raise AssertionError('no target')


with sync_playwright() as p:
    for w, h, name, touch in [(390, 844, 'phone', True), (1440, 900, 'desktop', False)]:
        b, ctx, pg, errs = open_page(p, w, h, touch)
        register(pg, 'r37games', '小明')
        go(pg, '#p/games', 500)
        C.ok(pg.evaluate("!!document.querySelector('a[href=\"#game\"]')"), f'{name}: arcade tile present')
        C.ok(pg.evaluate("!!document.querySelector('a[href=\"#fps\"]')") and pg.evaluate("!!document.querySelector('a[href=\"#lv/runner\"]')"), f'{name}: FPS and runner tiles present')
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
        s0 = pg.evaluate('WQ37FPS._debug.score')
        aim_fire(pg, True)
        C.ok(pg.evaluate('WQ37FPS._debug.score') > s0, f'{name}: shooting the right word scores')
        hearts = pg.evaluate('WQ37FPS._debug.hearts')
        aim_fire(pg, False)
        C.ok(pg.evaluate('WQ37FPS._debug.hearts') < hearts, f'{name}: shooting a wrong word costs a heart')
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
        for k in range(10):
            r0 = pg.evaluate('WQ37FPS._debug.round')
            for _try in range(12):
                if pg.evaluate('WQ37FPS._debug.state') != 'play' or pg.evaluate('WQ37FPS._debug.round') != r0:
                    break
                aim_fire(pg, True)
                pg.wait_for_timeout(250)
        for _ in range(30):
            if pg.evaluate('WQ37FPS._debug.result'):
                break
            pg.wait_for_timeout(250)
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

    def rtake(pg, ok=True):
        if not rdbg(pg)['armed']:
            pg.evaluate('WQ37Run._debugAdvanceToGate()')
        d = rdbg(pg)
        cl = [x['lane'] for x in d['doors'] if x['word'] == d['correctWord']][0]
        pg.evaluate('n=>WQ37Run._debugLane(n)', cl if ok else (cl + 1) % 3)
        pg.evaluate('WQ37Run._debugAdvanceToGate()')

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
C.done()

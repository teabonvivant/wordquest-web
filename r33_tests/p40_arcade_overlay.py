"""p40 / N5 - arcade settlement screen must never charge a second coin by accident.

    WQ33_APP=<index.html> python3 r33_tests/p40_arcade_overlay.py [--shots DIR]

Real Chromium, real keyboard / mouse. `[B]` checks fail on the frozen R3.2 base and must pass on the patched build.
Every scenario starts from a fresh finished screen so an accidental charge on the base build cannot cascade.
"""
import sys
import time
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from p40_lib import Checker, open_page, boot_account, st, sync_playwright  # noqa: E402

SHOTS = None
if '--shots' in sys.argv:
    SHOTS = Path(sys.argv[sys.argv.index('--shots') + 1])
    SHOTS.mkdir(parents=True, exist_ok=True)

C = Checker('p40 arcade overlay (N5)')
LOCK_WINDOW_MS = 560  # every "during the lock" action must start inside this window after the game ended


def start_game(pg, gid, play=True):
    pg.evaluate("location.hash='#game'")
    pg.wait_for_selector('[data-a28="filter"]', timeout=15000)
    if not pg.query_selector(f'[data-cabinet="{gid}"]'):
        pg.locator('[data-a28="filter"][data-filter="全部"]').click()   # the lobby opens on the 5 "新街機" only
    pg.wait_for_selector(f'[data-cabinet="{gid}"]', timeout=15000)
    pg.locator(f'[data-cabinet="{gid}"] [data-a28="intro"]').click()
    pg.locator('#pg-dialog [data-a28="buy"]').click()
    pg.wait_for_selector('#pg-canvas', timeout=10000)
    pg.wait_for_function('__p40.state().game==="%s"' % gid, timeout=10000)
    if play:
        pg.locator('[data-a28="play"]').click()
        pg.wait_for_function('__p40.state().playing', timeout=10000)


def active(pg):
    return pg.evaluate("""(()=>{const a=document.activeElement;if(!a)return null;
      return {tag:a.tagName,act:a.dataset&&a.dataset.a28||'',id:a.id||'',disabled:!!a.disabled,text:(a.textContent||'').trim()};})()""")


def buy_btn(pg):
    return pg.evaluate("""(()=>{const b=document.querySelector('#pg-overlay [data-a28="buy"]');if(!b)return null;
      const cs=getComputedStyle(b),af=getComputedStyle(b,'::after');
      return {text:b.textContent.trim(),disabled:b.disabled,locked:b.classList.contains('a33-locked'),
        barH:af.height,barAnim:af.animationName,cursor:cs.cursor};})()""")


def spent(before, after):
    return before['stars'] - after['stars'], after['used'] - before['used']


def finished_screen(pg, gid='ruins-courier', msg='p40 forced end'):
    """Start a game, end it at once; returns the performance.now() of the end. The overlay is up when this returns."""
    start_game(pg, gid)
    t_end = pg.evaluate('__p40.end(%r)' % msg)
    pg.wait_for_function('__p40.state().overlay', timeout=5000)
    return t_end


def in_window(pg, t_end):
    return pg.evaluate('__p40.now()') - t_end < LOCK_WINDOW_MS


def lobby(pg):
    pg.evaluate('__p40.reset(60)')
    pg.wait_for_selector('[data-cabinet]', timeout=10000)


def shot(pg, name):
    if SHOTS:
        pg.screenshot(path=str(SHOTS / name))


def scenario(name, fn, pg):
    """Run one scenario; an exception becomes a FAIL and the page is brought back to a clean lobby."""
    try:
        fn()
    except Exception as e:  # noqa: BLE001
        C.check(f'scenario "{name}" ran to the end', False, f'{type(e).__name__}: {str(e)[:160]}')
        traceback.print_exc(file=sys.stderr)
    try:
        lobby(pg)
    except Exception:  # noqa: BLE001
        pass


with sync_playwright() as p:
    b, ctx, pg, errs = open_page(p)
    try:
        boot_account(pg, coins=60)
        s0 = st(pg)
        C.check('fixture: 60 coins, nothing used', s0['stars'] == 60 and s0['used'] == 0, s0)

        # ============================================================ lobby flow is untouched
        def s_lobby():
            pg.evaluate("location.hash='#game'")
            pg.wait_for_selector('[data-cabinet="ruins-courier"]', timeout=15000)
            pg.locator('[data-cabinet="ruins-courier"] [data-a28="intro"]').click()
            dlg = pg.evaluate("""(()=>{const b=document.querySelector('#pg-dialog [data-a28="buy"]');
              return b?{text:b.textContent.trim(),disabled:b.disabled,locked:b.classList.contains('a33-locked')}:null;})()""")
            C.check('lobby: "用 3 枚金幣開始" present, enabled and not locked (R3.6: ruins-courier costs 3)',
                    bool(dlg) and '用 3 枚金幣開始' in dlg['text'] and not dlg['disabled'] and not dlg['locked'], dlg)
            pg.locator('#pg-dialog [data-a28="buy"]').click()
            pg.wait_for_selector('#pg-canvas', timeout=10000)
            pg.wait_for_function('__p40.state().game==="ruins-courier"')
            s1 = st(pg)
            C.check('lobby: confirm charges exactly the game price (3 coins, 1 play) and opens the ready screen',
                    spent(s0, s1) == (3, 1) and s1['title'] == '準備好了？', s1)
            rd = pg.evaluate("""(()=>{const b=document.querySelector('#pg-overlay [data-a28="play"]');
              return b?{text:b.textContent.trim(),disabled:b.disabled,locked:b.classList.contains('a33-locked')}:null;})()""")
            C.check('ready screen: "開始遊戲" is never locked', bool(rd) and not rd['disabled'] and not rd['locked'], rd)
            pg.locator('[data-a28="play"]').click()
            pg.wait_for_function('__p40.state().playing')
            C.check('playing: overlay hidden and no leftover lock',
                    not st(pg)['overlay'] and pg.evaluate("!document.querySelector('.a33-locked')"))
        scenario('lobby flow', s_lobby, pg)

        # ============================================================ natural death, Space mash (ruins-courier)
        def s_natural():
            start_game(pg, 'ruins-courier')
            t0 = time.time()
            ended = False
            while time.time() - t0 < 45:
                s = st(pg)
                if s['done'] or not s['playing']:
                    ended = s['done']
                    break
                pg.keyboard.down('Space')
                pg.wait_for_timeout(55)
                pg.keyboard.up('Space')
                pg.wait_for_timeout(55)
            dead = st(pg)
            C.check('ruins-courier: the bot died by itself while mashing Space', ended and dead['phase'] == 'finished',
                    f'{time.time() - t0:.1f}s {dead["phase"]}')
            a = active(pg)
            pg.keyboard.press('Space')            # the next press of the mash
            pg.wait_for_timeout(150)
            after = st(pg)
            C.check('ruins-courier natural death: default focus is 返回大堂', bool(a) and a['act'] == 'leave', a, base=True)
            C.check('ruins-courier natural death: the next Space does not spend a coin', spent(dead, after) == (0, 0),
                    f'coins -{spent(dead, after)[0]} used +{spent(dead, after)[1]} title={after["title"]!r}', base=True)
            C.check('ruins-courier natural death: the "這一局結束" result stays on screen',
                    after['title'] == '這一局結束' and after['phase'] == 'finished', after['title'], base=True)
        scenario('natural death', s_natural, pg)

        # ============================================================ static look of the finished screen + release timing
        def s_static():
            t_end = finished_screen(pg)
            pg.wait_for_timeout(20)
            a = active(pg)
            C.check('finished screen: default focus is 返回大堂', bool(a) and a['act'] == 'leave', a, base=True)
            C.check('finished screen: focus is not on a coin-spending button', bool(a) and a['act'] != 'buy', a, base=True)
            bb = buy_btn(pg)
            C.check('finished screen: "再投 3 枚金幣" text (R3.6: the price of the game)', bool(bb) and bb['text'].endswith('再投 3 枚金幣'), bb)
            C.check('lock: the coin button is natively disabled while locked', bool(bb) and bb['disabled'] and bb['locked'], bb, base=True)
            C.check('lock: a progress bar runs along the locked button', bool(bb) and bb['barH'] == '5px' and bb['barAnim'] == 'a33-lock', bb,
                    base=True)
            shot(pg, 'locked.png')
            before = st(pg)
            for key in ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'Digit1', 'Shift']:
                pg.keyboard.press(key)
            pg.wait_for_timeout(80)
            after = st(pg)
            C.check('game keys (arrows, WASD, Z, 1, Shift) on the finished screen never start a game or spend',
                    spent(before, after) == (0, 0) and after['phase'] == 'finished' and not after['playing'], after)
            if in_window(pg, t_end):
                pg.evaluate('__p40.overlay()')
                C.check('lock: re-rendering the screen during the lock keeps the button locked',
                        bool(buy_btn(pg)) and buy_btn(pg)['disabled'], buy_btn(pg), base=True)
            else:
                C.check('lock: re-render check started inside the timing window', False, 'machine too slow')
            pg.wait_for_timeout(max(0, 820 - int(pg.evaluate('__p40.now()') - t_end)))
            b3 = buy_btn(pg)
            C.check('lock: released after 700 ms (disabled and bar gone)',
                    bool(b3) and not b3['disabled'] and not b3['locked'] and b3['barH'] != '5px', b3)
            pg.evaluate('__p40.overlay()')
            b4 = buy_btn(pg)
            C.check('lock: the same screen locks only once (a re-render after the release stays unlocked)',
                    bool(b4) and not b4['disabled'] and not b4['locked'], b4)
            a2 = active(pg)
            C.check('after the lock: focus is still 返回大堂 (nothing steals it back)', bool(a2) and a2['act'] == 'leave', a2, base=True)
            shot(pg, 'unlocked.png')
            before = st(pg)
            pg.locator('#pg-overlay [data-a28="buy"]').click()
            pg.wait_for_function('__p40.state().title==="準備好了？"', timeout=8000)
            after = st(pg)
            C.check('after the lock: an explicit click on "再投 3 枚金幣" charges exactly the game price and opens a new run',
                    spent(before, after) == (3, 1) and after['run'] != before['run'] and after['phase'] == 'ready', after)
            note = pg.evaluate("document.querySelector('#pg-overlay small').textContent")
            C.check('new run: ready screen reports 2/5 coins used and "開始遊戲" is free', '2/5' in note and
                    not pg.evaluate("document.querySelector('#pg-overlay [data-a28=\"play\"]').disabled"), note)
        scenario('static screen', s_static, pg)

        # ============================================================ single presses inside the lock
        for key in ['Space', 'Enter']:
            def s_press(key=key):
                t_end = finished_screen(pg)
                before = st(pg)
                ok_win = in_window(pg, t_end)
                pg.keyboard.press(key)
                pg.wait_for_timeout(150)
                after = st(pg)
                C.check(f'lock: {key} right after the end does not spend a coin', spent(before, after) == (0, 0) and ok_win,
                        f'in_window={ok_win} coins -{spent(before, after)[0]} used +{spent(before, after)[1]}', base=True)
                C.check(f'lock: {key} right after the end leaves the result on screen',
                        after['title'] == '這一局結束' and after['route'] == 'playground', after['title'], base=True)
            scenario(f'press {key}', s_press, pg)

        def s_mouse():
            t_end = finished_screen(pg)
            before = st(pg)
            box = pg.evaluate("""(()=>{const r=document.querySelector('#pg-overlay [data-a28="buy"]').getBoundingClientRect();
              return {x:r.x+r.width/2,y:r.y+r.height/2};})()""")
            ok_win = in_window(pg, t_end)
            pg.mouse.click(box['x'], box['y'])
            pg.wait_for_timeout(150)
            after = st(pg)
            C.check('lock: a mouse click on the locked button does nothing', spent(before, after) == (0, 0) and ok_win and after['phase'] == 'finished',
                    f'in_window={ok_win} {spent(before, after)}', base=True)
        scenario('mouse in lock', s_mouse, pg)

        # ============================================================ keys that are already down when the screen appears
        def s_hold_through():
            start_game(pg, 'ruins-courier')
            pg.keyboard.down('Space')                      # the jump key, held on the canvas
            pg.wait_for_timeout(60)
            pg.evaluate('__p40.end("p40 hold through")')
            before = st(pg)
            for _ in range(3):
                pg.keyboard.down('Space')                  # auto-repeat now lands on the overlay
                pg.wait_for_timeout(30)
            pg.keyboard.up('Space')
            pg.wait_for_timeout(250)
            after = st(pg)
            C.check('hold-through: Space held across the game end, then released, spends nothing', spent(before, after) == (0, 0),
                    f'{spent(before, after)} {after["title"]}', base=True)
        scenario('hold through', s_hold_through, pg)

        def s_hold_screen():
            finished_screen(pg)
            before = st(pg)
            pg.keyboard.down('Space')
            pg.wait_for_timeout(120)
            pg.keyboard.up('Space')
            pg.wait_for_timeout(250)
            after = st(pg)
            C.check('hold on screen: Space pressed and released inside the lock spends nothing', spent(before, after) == (0, 0),
                    f'{spent(before, after)}', base=True)
        scenario('hold on screen', s_hold_screen, pg)

        def s_hold_past():
            finished_screen(pg)
            before = st(pg)
            pg.wait_for_timeout(450)
            pg.keyboard.down('Space')                      # pressed inside the lock ...
            pg.wait_for_timeout(450)                       # ... the lock ends while it is still down
            pg.keyboard.up('Space')                        # ... released after the lock
            pg.wait_for_timeout(250)
            after = st(pg)
            C.check('hold past the lock: Space pressed in the lock and released after it spends nothing',
                    spent(before, after) == (0, 0), f'{spent(before, after)}', base=True)
            pg.keyboard.press('Enter')                     # a fresh press after the lock hits the focused 返回大堂
            pg.wait_for_timeout(300)
            C.check('after the lock a fresh Enter on the focused 返回大堂 leaves to the lobby', st(pg)['route'] == 'game', st(pg)['route'],
                    base=True)
        scenario('hold past lock', s_hold_past, pg)

        def s_enter_hold():
            finished_screen(pg)
            before = st(pg)
            for _ in range(3):
                pg.keyboard.down('Enter')                  # 1st real, 2nd/3rd auto-repeat
            pg.keyboard.up('Enter')
            pg.wait_for_timeout(250)
            after = st(pg)
            C.check('Enter held (auto-repeat) inside the lock spends nothing', spent(before, after) == (0, 0), f'{spent(before, after)}',
                    base=True)
        scenario('enter hold', s_enter_hold, pg)

        # ============================================================ keyboard users: the coin button stays reachable
        for key in ['Enter', 'Space']:
            def s_tab(key=key):
                finished_screen(pg)
                pg.wait_for_timeout(850)
                before = st(pg)
                reached = False
                for k in ['Shift+Tab', 'Shift+Tab', 'Tab', 'Tab', 'Tab', 'Tab']:
                    a = active(pg)
                    if a and a['act'] == 'buy':
                        reached = True
                        break
                    pg.keyboard.press(k)
                a = active(pg)
                reached = reached or bool(a and a['act'] == 'buy')
                C.check(f'Tab path ({key}): the coin button can be focused with the keyboard after the lock', reached, a)
                if key == 'Enter':
                    for _ in range(3):
                        pg.keyboard.down('Enter')          # 1st real, 2nd/3rd auto-repeat
                    pg.keyboard.up('Enter')
                else:
                    pg.keyboard.press('Space')
                try:
                    pg.wait_for_function('__p40.state().title==="準備好了？"', timeout=6000)
                except Exception:  # noqa: BLE001
                    pass
                pg.wait_for_timeout(250)
                after = st(pg)
                C.check(f'Tab path ({key}): {key} on the focused coin button charges exactly the game price (3 coins, 1 play)',
                        spent(before, after) == (3, 1) and after['phase'] == 'ready', f'{spent(before, after)} {after["title"]}')
            scenario(f'tab path {key}', s_tab, pg)

        # ============================================================ the other bots (forced end, Space immediately)
        for gid in ['bounce-basket', 'meadow-cricket', 'star-rhythm', 'sweet-studio']:
            def s_bot(gid=gid):
                finished_screen(pg, gid, 'p40 bot')
                a = active(pg)
                before = st(pg)
                pg.keyboard.press('Space')
                pg.wait_for_timeout(200)
                after = st(pg)
                C.check(f'{gid}: finished screen focus is 返回大堂', bool(a) and a['act'] == 'leave', a, base=True)
                C.check(f'{gid}: Space right after the end does not spend a coin', spent(before, after) == (0, 0),
                        f'{spent(before, after)} {after["title"]}', base=True)
            scenario(gid, s_bot, pg)

        # ============================================================ drift-path: retry -> retry -> finished
        def s_retry_space():
            start_game(pg, 'drift-path')
            pg.evaluate('__p40.end("p40 life 1")')
            pg.wait_for_function('__p40.state().phase==="retry"')
            a = active(pg)
            before = st(pg)
            pg.keyboard.press('Space')
            pg.wait_for_timeout(250)
            after = st(pg)
            C.check('drift-path retry screen: "再試一次" stays the focused default (it costs no coin)', bool(a) and a['act'] == 'retry', a)
            C.check('drift-path retry screen: Space right after the end does not skip the result',
                    (not after['playing']) and after['phase'] == 'retry' and spent(before, after) == (0, 0),
                    f'playing={after["playing"]} phase={after["phase"]}', base=True)
        scenario('drift retry space', s_retry_space, pg)

        def s_retry_kb():
            start_game(pg, 'drift-path')
            pg.evaluate('__p40.end("p40 life 1")')
            pg.wait_for_function('__p40.state().phase==="retry"')
            pg.wait_for_timeout(850)
            pg.keyboard.press('Space')
            pg.wait_for_function('__p40.state().playing', timeout=6000)
            s = st(pg)
            C.check('drift-path retry screen: after the lock the keyboard still starts the retry without a coin',
                    s['playing'] and s['lives'] == 2 and s['used'] == 1, s)
        scenario('drift retry keyboard', s_retry_kb, pg)

        def s_retry_chain():
            start_game(pg, 'drift-path')
            for i in (1, 2):
                pg.evaluate('__p40.end("p40 life %d")' % i)
                pg.wait_for_function('__p40.state().phase==="retry"')
                pg.wait_for_timeout(850)
                pg.locator('#pg-overlay [data-a28="retry"]').click()
                pg.wait_for_function('__p40.state().playing', timeout=6000)
            pg.evaluate('__p40.end("p40 life 3")')
            pg.wait_for_function('__p40.state().phase==="finished"')
            a = active(pg)
            before = st(pg)
            pg.keyboard.press('Space')
            pg.wait_for_timeout(200)
            after = st(pg)
            C.check('drift-path retry -> finished: default focus is 返回大堂', bool(a) and a['act'] == 'leave', a, base=True)
            C.check('drift-path retry -> finished: Space right after the end does not spend a coin', spent(before, after) == (0, 0),
                    f'{spent(before, after)}', base=True)
            bb = buy_btn(pg)
            C.check('drift-path retry -> finished: the second settlement screen is locked again (new screen, new lock)',
                    bool(bb) and (bb['disabled'] or after['title'] != '這一局結束'), bb, base=True)
        scenario('drift chain', s_retry_chain, pg)

        # ============================================================ free-test mode: "重新測試"
        def s_free():
            start_game(pg, 'ruins-courier')
            pg.evaluate('__p40.setFree(true)')
            pg.evaluate('__p40.end("p40 free")')
            pg.wait_for_function('__p40.state().overlay')
            fb = pg.evaluate("""(()=>{const b=document.querySelector('#pg-overlay [data-a28="buy"]');return b?{text:b.textContent.trim(),disabled:b.disabled}:null;})()""")
            a = active(pg)
            before = st(pg)
            pg.keyboard.press('Space')
            pg.wait_for_timeout(200)
            after = st(pg)
            C.check('free-test screen: the button reads "重新測試"', bool(fb) and fb['text'] == '重新測試', fb)
            C.check('free-test screen: locked like the coin button, focus on 返回大堂',
                    bool(fb) and fb['disabled'] and bool(a) and a['act'] == 'leave', f'{fb} {a}', base=True)
            C.check('free-test screen: Space right after the end does not restart', spent(before, after) == (0, 0) and after['title'] != '準備好了？',
                    after['title'], base=True)
        scenario('free test', s_free, pg)

        C.check('no page errors', not errs, errs)
    finally:
        b.close()

sys.exit(C.finish())

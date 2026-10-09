"""R3.4 p30 - phone play layer in a real (emulated) phone: landscape dock layout, orientation helper, touch gestures.

    WQ33_APP=<index.html> python3 r34_tests/browser_touch.py [--shots DIR]

`[B]` marks checks that must FAIL on the R3.3 build (they prove the change; the whole file is expected to fail on R3.3).
Real Chromium, touch emulation (is_mobile), real DevTools touch events.
"""
import sys
import time
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wq34_lib import (Checker, open_page, boot_account, start_game, back_to_lobby, Touch, canvas_rect, sync_playwright)  # noqa: E402

SHOTS = None
if '--shots' in sys.argv:
    SHOTS = Path(sys.argv[sys.argv.index('--shots') + 1])
    SHOTS.mkdir(parents=True, exist_ok=True)

C = Checker('r34 p30 phone play layer')
GEOM_JS = """(()=>{const R=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,r:r.right,b:r.bottom};};
 const play=document.querySelector('.a28-play');const card=document.querySelector('#pg-overlay .a28-overlaycard');
 return {imm:!!document.querySelector('.a28-play.r2-immersive'),view:R(document.querySelector('.a28-viewport')),canvas:R(document.querySelector('#pg-canvas')),
  play:play?{sw:play.scrollWidth,cw:play.clientWidth,sh:play.scrollHeight,ch:play.clientHeight}:null,card:R(card),
  keys:[...document.querySelectorAll('.a28-touch-key')].map(b=>({k:b.dataset.a28key,...R(b)})),
  foot:[...document.querySelectorAll('.a28-game-footer .btn')].map(b=>({a:b.dataset.a28,s:b.dataset.wq34s||'',al:b.getAttribute('aria-label')||'',...R(b)})),
  tools:[...document.querySelectorAll('#pg-tools button')].length,
  dir:R(document.querySelector('.wq34-kg-dir')),act:R(document.querySelector('.wq34-kg-act')),stat:R(document.querySelector('.a28-playhead')),footer:R(document.querySelector('.a28-game-footer')),
  w:innerWidth,h:innerHeight};})()"""


def inside(r, W, H, pad=0):
    return r and r['x'] >= -pad and r['y'] >= -pad and r['r'] <= W + pad and r['b'] <= H + pad


def overlap(a, b):
    return a and b and a['w'] > 0 and b['w'] > 0 and a['x'] < b['r'] and b['x'] < a['r'] and a['y'] < b['b'] and b['y'] < a['b']


def shot(pg, name):
    if SHOTS:
        pg.screenshot(path=str(SHOTS / name))


# ------------------------------------------------------------------------------------------------------------------------------
def layout_suite(p):
    games = ['forest-dash', 'block-studio', 'star-patrol', 'honey-delivery', 'rolling-block', 'color-workshop', 'forest-band',
             'sweet-studio', 'drift-path', 'harbor-volley']
    for (W, H) in [(844, 390), (932, 430), (667, 375), (740, 360)]:
        b, ctx, pg, errs = open_page(p, W, H)
        try:
            boot_account(pg)
            bad = []
            small = []
            tight = []
            for gid in games:
                start_game(pg, gid, play=False)
                pg.wait_for_timeout(450)
                g = pg.evaluate(GEOM_JS)
                if not g['imm']:
                    bad.append(f'{gid}:not-immersive')
                    tight.append(f'{gid}:not-immersive')
                    back_to_lobby(pg)
                    continue
                side = min(134, max(98, 0.155 * W))
                exp_w = min((W - 16 - 2 * side - 12 - 6) / 800, (H - 14 - 6) / 560) * 800
                if g['canvas']['w'] < 0.88 * exp_w:
                    tight.append(f"{gid}:canvas {g['canvas']['w']:.0f}<{0.88 * exp_w:.0f}")
                if g['play']['sw'] > g['play']['cw'] + 1 or g['play']['sh'] > g['play']['ch'] + 1:
                    bad.append(f"{gid}:overflow {g['play']}")
                for k in g['keys'] + g['foot']:
                    if k['w'] > 0 and not inside(k, W, H, 1):
                        bad.append(f"{gid}:{k.get('k') or k.get('a')} outside")
                    if k['w'] > 0 and (k['w'] < 40 or k['h'] < 36):
                        small.append(f"{gid}:{k.get('k') or k.get('a')} {k['w']:.0f}x{k['h']:.0f}")
                for name in ('dir', 'act', 'stat', 'footer'):
                    if overlap(g[name], g['view']):
                        bad.append(f'{gid}:{name} overlaps screen')
                c = g['card']
                if c and not (c['x'] >= g['view']['x'] - 1 and c['r'] <= g['view']['r'] + 1 and c['y'] >= g['view']['y'] - 1 and c['b'] <= g['view']['b'] + 1):
                    bad.append(f"{gid}:ready card outside screen {c}")
                if gid == games[0]:
                    shot(pg, f'land_{W}x{H}_{gid}.png')
                back_to_lobby(pg)
            C.check(f'{W}x{H} every game opens enlarged, nothing overflows or overlaps the screen', not bad, '; '.join(bad[:6]), base=True)
            C.check(f'{W}x{H} canvas uses the freed height (>= 88% of the ideal size)', not tight, '; '.join(tight[:6]), base=True)
            C.check(f'{W}x{H} touch keys / system buttons >= 40x36 px', not small, '; '.join(small[:6]))
            C.check(f'{W}x{H} no page errors', not errs, '; '.join(errs[:3]))
        finally:
            b.close()


def orientation_suite(p):
    b, ctx, pg, errs = open_page(p, 390, 844)
    try:
        boot_account(pg)
        start_game(pg, 'forest-dash', play=False)
        pg.wait_for_timeout(400)
        g = pg.evaluate(GEOM_JS)
        chip = pg.evaluate("(()=>{const c=document.querySelector('.wq34-rotate');if(!c)return null;const r=c.getBoundingClientRect();return {w:r.width,h:r.height,vis:getComputedStyle(c).display!=='none',b:r.bottom};})()")
        C.check('portrait: not enlarged by itself', not g['imm'], base=False)
        C.check('portrait: "turn your phone" chip shown above the screen', bool(chip and chip['vis'] and chip['h'] > 20 and chip['w'] <= 390), str(chip), base=True)
        shot(pg, 'portrait_chip.png')
        pg.set_viewport_size({'width': 844, 'height': 390})
        pg.wait_for_function('document.querySelector(".a28-play.r2-immersive")!==null', timeout=3000)
        C.check('rotate to landscape: enlarged mode starts by itself', True, base=True)
        pg.set_viewport_size({'width': 390, 'height': 844})
        pg.wait_for_function('document.querySelector(".a28-play.r2-immersive")===null', timeout=3000)
        C.check('rotate back to portrait: leaves the enlarged mode by itself', True, base=True)
        pg.set_viewport_size({'width': 844, 'height': 390})
        pg.wait_for_function('document.querySelector(".a28-play.r2-immersive")!==null', timeout=3000)
        # manual exit keeps the normal view until the phone is turned again
        pg.locator('.a28-game-footer [data-a28="r2-full"]').click()
        pg.wait_for_timeout(500)
        C.check('manual 還原 in landscape stays in the normal view', pg.evaluate('!document.querySelector(".a28-play.r2-immersive")'), base=True)
        pg.set_viewport_size({'width': 390, 'height': 844})
        pg.wait_for_timeout(400)
        pg.set_viewport_size({'width': 844, 'height': 390})
        pg.wait_for_function('document.querySelector(".a28-play.r2-immersive")!==null', timeout=3000)
        C.check('turning the phone again re-enables the enlarged mode', True, base=True)
        # dismiss the chip: it stays away for the rest of the session
        pg.set_viewport_size({'width': 390, 'height': 844})
        pg.wait_for_timeout(400)
        pg.locator('.wq34-rotate button').click()
        pg.wait_for_timeout(200)
        back_to_lobby(pg)
        start_game(pg, 'ruins-courier', play=False)
        pg.wait_for_timeout(300)
        C.check('chip closed once stays closed in the session', pg.evaluate('!document.querySelector(".wq34-rotate")'), base=True)
        # heavy tool games: no "turn" chip (portrait is the better way to play them)
        pg.evaluate('sessionStorage.removeItem("wq34.rot")')
        back_to_lobby(pg)
        start_game(pg, 'color-workshop', play=False)
        pg.wait_for_timeout(300)
        C.check('tool-heavy game (color-workshop): no "turn your phone" chip', pg.evaluate('!document.querySelector(".wq34-rotate")'))
        # desktop-sized window: nothing changes
        C.check('no page errors', not errs, '; '.join(errs[:3]))
    finally:
        b.close()
    # a desktop browser (no touch) must not be pushed into the enlarged mode
    b, ctx, pg, errs = open_page(p, 900, 420, touch=False)
    try:
        boot_account(pg)
        start_game(pg, 'forest-dash', play=False)
        pg.wait_for_timeout(500)
        C.check('landscape window with a mouse (no touch): not enlarged by itself', pg.evaluate('!document.querySelector(".a28-play.r2-immersive")'))
        C.check('desktop: no rotate chip', pg.evaluate('!document.querySelector(".wq34-rotate")'))
    finally:
        b.close()


# ------------------------------------------------------------------------------------------------------------------------------
def rec_run(pg, fn, wait=0.12):
    pg.evaluate('__w34.startRec()')
    fn()
    time.sleep(wait)
    return pg.evaluate('__w34.stopRec()')


def keysets(rec):
    return [set(k.split(',')) - {''} for _, k in rec]


def pulses(rec, key):
    """(count, longest_ms) of press periods of one key in a recording."""
    n = 0
    longest = 0.0
    start = None
    for t, k in rec:
        on = key in k.split(',')
        if on and start is None:
            start = t
            n += 1
        elif not on and start is not None:
            longest = max(longest, t - start)
            start = None
    return n, longest


def gesture_suite(p):
    b, ctx, pg, errs = open_page(p, 844, 390)
    T = Touch(ctx, pg)
    try:
        boot_account(pg)

        def go(gid):
            back_to_lobby(pg)
            start_game(pg, gid, play=True)
            pg.wait_for_timeout(350)
            r = canvas_rect(pg)
            return r

        # --- lanes: ruins-courier (left / right = one lane step, tap = jump)
        r = go('ruins-courier')
        cx, cy = r['x'] + r['w'] / 2, r['y'] + r['h'] / 2
        lane0 = pg.evaluate('__w34.pos().lane')
        rec = rec_run(pg, lambda: (T.drag(0, cx - 20, cy, cx + 150, cy, steps=10), T.up(0)))
        lane1 = pg.evaluate('__w34.pos().lane')
        n_r, _ = pulses(rec, 'right')
        C.check('ruins-courier: sliding right changes lane (one step per stretch of drag)', lane1 != lane0 and n_r >= 1, f'lane {lane0}->{lane1}, right pulses={n_r}', base=True)
        pg.wait_for_timeout(900)
        pg.evaluate('__w34.startRec()')
        T.tap(cx, cy, 60)
        time.sleep(0.3)
        rec = pg.evaluate('__w34.stopRec()')
        n_a, ms_a = pulses(rec, 'up')
        C.check('ruins-courier: a tap is a jump (up pulse 100-300 ms)', n_a == 1 and 100 <= ms_a <= 300, f'pulses={n_a}, {ms_a:.0f} ms', base=True)
        rec = rec_run(pg, lambda: (T.drag(0, cx + 100, cy, cx + 100, cy + 4, steps=2), T.up(0)))
        C.check('ruins-courier: a small wobble is not a steer', pulses(rec, 'left')[0] + pulses(rec, 'right')[0] == 0, str(rec), base=False)
        # mouse click on the canvas: desktop behaviour unchanged
        time.sleep(0.4)
        pg.evaluate('__w34.startRec()')
        pg.mouse.click(cx, cy)
        time.sleep(0.25)
        rec = pg.evaluate('__w34.stopRec()')
        C.check('mouse click on the canvas does not press any key', len(rec) == 0, str(rec))
        shot(pg, 'ruins-courier_playing.png')

        # --- lanes + swipes: forest-dash
        r = go('forest-dash')
        cx, cy = r['x'] + r['w'] / 2, r['y'] + r['h'] / 2
        rec = rec_run(pg, lambda: (T.drag(0, cx, cy + 60, cx, cy - 70, steps=5, step_ms=10), T.up(0)), wait=0.45)
        n_u, ms_u = pulses(rec, 'up')
        C.check('forest-dash: swipe up = one jump', n_u == 1 and ms_u >= 150, f'pulses={n_u}, {ms_u:.0f} ms', base=True)
        pg.wait_for_timeout(1100)
        rec = rec_run(pg, lambda: (T.drag(0, cx, cy - 60, cx, cy + 70, steps=5, step_ms=10), T.up(0), time.sleep(0.5)))
        n_d, ms_d = pulses(rec, 'down')
        C.check('forest-dash: swipe down = one slide', n_d == 1 and ms_d >= 250, f'pulses={n_d}, {ms_d:.0f} ms', base=True)
        pg.wait_for_timeout(900)
        lane0 = pg.evaluate('__w34.pos().lane')
        rec = rec_run(pg, lambda: (T.drag(0, cx - 80, cy, cx + 110, cy, steps=9), T.up(0)))
        lane1 = pg.evaluate('__w34.pos().lane')
        C.check('forest-dash: sliding sideways changes lane and never jumps', lane1 != lane0 and pulses(rec, 'up')[0] == 0, f'lane {lane0}->{lane1}', base=True)
        # second finger = instant jump button while the first finger steers
        T.down(0, cx - 60, cy)
        time.sleep(0.05)
        pg.evaluate('__w34.startRec()')
        T.down(1, cx + 120, cy - 40)
        time.sleep(0.15)
        held = pg.evaluate('__w34.info().keys')
        T.up(1)
        time.sleep(0.1)
        after = pg.evaluate('__w34.info().keys')
        T.up(0)
        pg.evaluate('__w34.stopRec()')
        C.check('forest-dash: second finger holds jump while it stays down', 'up' in held and 'up' not in after, f'{held} -> {after}', base=True)

        # --- stick: star-patrol
        r = go('star-patrol')
        cx, cy = r['x'] + r['w'] / 2, r['y'] + r['h'] / 2
        T.down(0, cx, cy)
        sets = []
        for (dx, dy) in [(60, 0), (60, 60), (-60, 60), (-60, -60), (0, 0)]:
            T.move(0, cx + dx, cy + dy)
            time.sleep(0.12)
            sets.append(set(pg.evaluate('__w34.info().keys')))
        T.up(0)
        time.sleep(0.1)
        end_keys = pg.evaluate('__w34.info().keys')
        ok = 'right' in sets[0] and {'right', 'down'} <= sets[1] and 'down' in sets[2] and 'left' in sets[3]
        C.check('star-patrol: dragging steers in four directions', ok, str(sets), base=True)
        C.check('star-patrol: lifting the finger releases every key', end_keys == [], str(end_keys))
        pg.evaluate('__w34.startRec()')
        T.tap(cx, cy, 50)
        time.sleep(0.25)
        rec = pg.evaluate('__w34.stopRec()')
        C.check('star-patrol: tap = shield key', pulses(rec, 'action')[0] == 1, str(rec), base=True)

        # --- halves: color-orbit
        r = go('color-orbit')
        cx, cy = r['x'] + r['w'] / 2, r['y'] + r['h'] / 2
        rot0 = pg.evaluate('__w34.pos().rotation')
        T.tap(cx + r['w'] * .3, cy, 60)
        time.sleep(0.1)
        rot1 = pg.evaluate('__w34.pos().rotation')
        T.tap(cx - r['w'] * .3, cy, 60)
        time.sleep(0.1)
        rot2 = pg.evaluate('__w34.pos().rotation')
        C.check('color-orbit: right half turns right once, left half turns left once (no doubled input)', rot1 == (rot0 + 1) % 6 and rot2 == rot0, f'{rot0}->{rot1}->{rot2}')

        # --- hold: drift-path
        r = go('drift-path')
        cx, cy = r['x'] + r['w'] / 2, r['y'] + r['h'] / 2
        d0 = pg.evaluate('__w34.pos().dir')
        T.down(0, cx - 120, cy + 30)
        time.sleep(0.08)
        keys_held = pg.evaluate('__w34.info().keys')
        T.up(0)
        time.sleep(0.1)
        d1 = pg.evaluate('__w34.pos().dir')
        C.check('drift-path: touching anywhere turns (action while the finger is down)', 'action' in keys_held and d1 != d0, f'{keys_held} dir {d0}->{d1}', base=True)

        # --- rolling-block: the engine reads the swipe itself (one move per stretch of drag); the gesture layer must not add keys
        r = go('rolling-block')
        cx, cy = r['x'] + r['w'] / 2, r['y'] + r['h'] / 2
        m0 = pg.evaluate('__w34.pos().moves')
        rec = rec_run(pg, lambda: (T.drag(0, cx - 60, cy, cx + 90, cy, steps=8), T.up(0)))
        m1 = pg.evaluate('__w34.pos().moves')
        C.check('rolling-block: the engine\'s own swipe works and the gesture layer adds no keys', len(rec) == 0 and (m1 - m0) >= 1, f'moves {m0}->{m1}, keys {rec}')

        # --- held steering: valley-race
        r = go('valley-race')
        cx, cy = r['x'] + r['w'] / 2, r['y'] + r['h'] / 2
        T.down(0, cx, cy)
        T.move(0, cx + 70, cy)
        time.sleep(0.15)
        k1 = pg.evaluate('__w34.info().keys')
        T.move(0, cx - 10, cy)
        time.sleep(0.15)
        k2 = pg.evaluate('__w34.info().keys')
        T.up(0)
        time.sleep(0.1)
        k3 = pg.evaluate('__w34.info().keys')
        C.check('valley-race: drag right holds right, dragging back holds left, lift releases', 'right' in k1 and 'left' in k2 and 'right' not in k2 and k3 == [], f'{k1} {k2} {k3}', base=True)
        T.down(0, cx, cy - 40)
        for s in range(1, 5):
            T.move(0, cx, cy - 40 + 25 * s)
            time.sleep(0.01)
        time.sleep(0.12)
        kb = pg.evaluate('__w34.info().keys')
        T.up(0)
        time.sleep(0.1)
        ka = pg.evaluate('__w34.info().keys')
        C.check('valley-race: a downward flick holds the brake until the finger lifts', 'down' in kb and ka == [], f'{kb} -> {ka}', base=True)

        # --- tap keys on the remaining motion games
        for gid, tap_key in [('lighthouse-well', 'action'), ('harbor-volley', 'action'), ('cloud-island', 'up'), ('sky-rescue', 'action')]:
            r = go(gid)
            cx, cy = r['x'] + r['w'] / 2, r['y'] + r['h'] / 2
            rec = rec_run(pg, lambda: (T.tap(cx, cy, 55), time.sleep(0.2)))
            C.check(f'{gid}: tap = {tap_key}', pulses(rec, tap_key)[0] == 1, str(rec), base=True)
        # cloud-island: held steering moves the goat
        r = go('cloud-island')
        cx, cy = r['x'] + r['w'] / 2, r['y'] + r['h'] / 2
        x0 = pg.evaluate('__w34.pos().x')
        T.down(0, cx, cy)
        T.move(0, cx + 80, cy)
        time.sleep(0.6)
        x1 = pg.evaluate('__w34.pos().x')
        T.up(0)
        C.check('cloud-island: dragging right moves the goat right', x1 is not None and x0 is not None and x1 > x0 + 10, f'x {x0}->{x1}', base=True)

        # --- engines with their own finger support keep working
        r = go('moon-bells')
        cx, cy = r['x'] + r['w'] / 2, r['y'] + r['h'] / 2
        t0 = pg.evaluate('__w34.g().target')
        T.drag(0, cx, cy, cx + 120, cy, steps=6)
        time.sleep(0.1)
        t1 = pg.evaluate('__w34.g().target')
        T.up(0)
        C.check('moon-bells: native finger follow still works and adds no keys', t1 != t0 and pg.evaluate('__w34.info().keys') == [], f'target {t0}->{t1}')

        # --- hygiene: cancel, pause and end in the middle of a gesture never leave a key stuck
        r = go('star-patrol')
        cx, cy = r['x'] + r['w'] / 2, r['y'] + r['h'] / 2
        T.down(0, cx, cy)
        T.move(0, cx + 80, cy + 40)
        time.sleep(0.1)
        T.cancel()
        time.sleep(0.1)
        C.check('touch cancel releases the keys', pg.evaluate('__w34.info().keys') == [], pg.evaluate('JSON.stringify(__w34.info())'))
        T.down(0, cx, cy)
        T.move(0, cx + 80, cy)
        time.sleep(0.1)
        pg.locator('.a28-game-footer [data-a28="pause"]').click()
        time.sleep(0.2)
        T.up(0)
        time.sleep(0.1)
        info = pg.evaluate('__w34.info()')
        C.check('pause during a drag: no key stays held, no error', info['keys'] == [] and info['sources'] == [] and not info['playing'], str(info))
        pg.locator('#pg-overlay [data-a28="play"]').click()
        pg.wait_for_function('__p40.state().playing', timeout=5000)
        T.down(0, cx, cy)
        T.move(0, cx + 80, cy)
        time.sleep(0.15)
        C.check('after resuming, the next drag steers again', 'right' in pg.evaluate('__w34.info().keys'), base=True)
        pg.evaluate('__w34.end("w34 test end")')
        time.sleep(0.2)
        T.up(0)
        time.sleep(0.15)
        info = pg.evaluate('__w34.info()')
        C.check('game ends during a drag: nothing stays held', info['keys'] == [] and info['sources'] == [], str(info))
        C.check('no page errors during gestures', not errs, '; '.join(errs[:4]))
    finally:
        b.close()


def hint_suite(p):
    b, ctx, pg, errs = open_page(p, 844, 390)
    try:
        boot_account(pg)
        rows = {'ruins-courier': '滑動', 'forest-pong': '拖動', 'block-studio': '輕按畫面旋轉', 'drift-path': '輕按畫面'}
        for gid, frag in rows.items():
            start_game(pg, gid, play=False)
            pg.wait_for_timeout(350)
            how = pg.evaluate("(document.querySelector('.wq34-how')||{}).textContent||''")
            C.check(f'{gid}: ready card shows the touch hint', frag in how or frag.replace('畫面', '') in how, how, base=True)
            back_to_lobby(pg)
        # footer: short captions and full aria labels
        start_game(pg, 'forest-dash', play=False)
        pg.wait_for_timeout(300)
        g = pg.evaluate(GEOM_JS)
        ok = all(f['s'] and f['al'] for f in g['foot'] if f['a'] in ('pause', 'leave', 'help', 'r2-full'))
        C.check('footer buttons keep a full aria-label and get a short caption', ok, str(g['foot']), base=True)
        C.check('no page errors', not errs, '; '.join(errs[:3]))
    finally:
        b.close()


def main():
    with sync_playwright() as p:
        for name, fn in [('layout', layout_suite), ('orientation', orientation_suite), ('gestures', gesture_suite), ('hints', hint_suite)]:
            try:
                fn(p)
            except Exception:
                C.check(f'{name} suite ran to the end', False, traceback.format_exc().splitlines()[-1])
                traceback.print_exc()
    return C.finish()


if __name__ == '__main__':
    sys.exit(main())

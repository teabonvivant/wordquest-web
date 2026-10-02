"""R3.4 p10/p20 - host rules and the feel layer inside the real page (all 26 arcade games).

    WQ33_APP=<index.html> python3 r34_tests/browser_rules.py

* every game: opens, plays with random input, pauses (checkpoint) with no storage error, snapshot verifies
* a finished drift route / moon climb counts as a win; colour workshop gives two free checks; FX switch works
`[B]` checks are expected to FAIL on the R3.3 build.
"""
import random
import sys
import time
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wq34_lib import Checker, open_page, boot_account, start_game, back_to_lobby, st, sync_playwright  # noqa: E402

C = Checker('r34 host rules (browser)')
KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS']


def all_ids(pg):
    pg.evaluate("location.hash='#game'")
    pg.wait_for_selector('[data-a28="filter"]', timeout=15000)
    pg.locator('[data-a28="filter"][data-filter="全部"]').click()
    pg.wait_for_selector('[data-cabinet]', timeout=10000)
    return [c.get_attribute('data-cabinet') for c in pg.query_selector_all('[data-cabinet]')]


def main():
    random.seed(11)
    with sync_playwright() as p:
        b, ctx, pg, errs = open_page(p, 1100, 760, touch=False)
        try:
            boot_account(pg, coins=200)
            ids = all_ids(pg)
            C.check('lobby lists 26 games', len(ids) == 26, str(len(ids)))
            bad = []
            for gid in ids:
                back_to_lobby(pg)
                pg.evaluate('__p40.boost(200)')
                try:
                    start_game(pg, gid, play=True)
                except Exception as e:
                    bad.append(f'{gid}:start {str(e)[:60]}')
                    continue
                t0 = time.time()
                while time.time() - t0 < 1.4:
                    k = random.choice(KEYS)
                    pg.keyboard.down(k)
                    pg.wait_for_timeout(random.choice([40, 90, 160]))
                    pg.keyboard.up(k)
                info = pg.evaluate('__w34.info()')
                if info['playing']:
                    pg.locator('.a28-game-footer [data-a28="pause"]').click()
                    pg.wait_for_timeout(250)
                info = pg.evaluate('__w34.info()')
                snap = pg.evaluate('__w34.snapOk()')
                ok_ck = pg.evaluate('__w34.checkpoint()')
                if info['reason'] == 'error' or info['error']:
                    bad.append(f"{gid}:error {info['error'][:50]}")
                if snap is not True:
                    bad.append(f'{gid}:snapshot {str(snap)[:70]}')
                if ok_ck is not True:
                    bad.append(f'{gid}:checkpoint false')
            C.check('all 26 games: play, pause, checkpoint and snapshot verify without any storage error', not bad, '; '.join(bad[:8]))

            # drift-path / moon-bells: a finished route counts as a win
            back_to_lobby(pg)
            pg.evaluate('__p40.boost(200)')
            start_game(pg, 'drift-path', play=True)
            w0 = pg.evaluate('__w34.rules().winning')
            pg.evaluate("(()=>{const g=__w34.g();g.pos={x:g.nodes[g.nodes.length-1].x,y:g.nodes[g.nodes.length-1].y};})()")
            w1 = pg.evaluate('__w34.rules().winning')
            C.check('drift-path: standing on the last stone counts as a win (not before)', w0 is False and w1 is True, f'{w0}->{w1}', base=True)
            back_to_lobby(pg)
            pg.evaluate('__p40.boost(200)')
            start_game(pg, 'moon-bells', play=True)
            w0 = pg.evaluate('__w34.rules().winning')
            pg.evaluate("(()=>{const g=__w34.g();g.bells[g.bells.length-1].used=true;})()")
            w1 = pg.evaluate('__w34.rules().winning')
            C.check('moon-bells: stepping on the last bell counts as a win (not before)', w0 is False and w1 is True, f'{w0}->{w1}', base=True)

            # colour workshop: two free checks per ball
            back_to_lobby(pg)
            pg.evaluate('__p40.boost(200)')
            start_game(pg, 'color-workshop', play=True)
            lives0 = pg.evaluate('__w34.rules().lives')
            ready = pg.evaluate("(()=>{const g=__w34.g();return !g.colors.every((v,i)=>v===g.target[i]);})()")
            for _ in range(2):
                pg.locator('[data-a28tool="check"]').click()
                pg.wait_for_timeout(250)
            lives2 = pg.evaluate('__w34.rules().lives')
            playing2 = pg.evaluate('__w34.info().playing')
            pg.locator('[data-a28tool="check"]').click()
            pg.wait_for_timeout(500)
            lives3 = pg.evaluate('__w34.rules().lives')
            C.check('colour workshop: first two wrong checks are free, the third costs a chance',
                    ready and lives2 == lives0 and playing2 and lives3 < lives0, f'lives {lives0}->{lives2}->{lives3}', base=True)

            # FX switch in the settings panel
            back_to_lobby(pg)
            pg.evaluate('__p40.boost(200)')
            start_game(pg, 'forest-dash', play=False)
            pg.locator('details.r2-audio summary').click()
            tg = pg.locator('#wq34-fx-toggle')
            on0 = tg.is_checked()
            tg.uncheck()
            off_ok = pg.evaluate('__w34.fxOn()') is False
            tg.check()
            on_ok = pg.evaluate('__w34.fxOn()') is True
            C.check('FX switch (動感效果) turns the feel layer off and on', on0 and off_ok and on_ok, f'{on0},{off_ok},{on_ok}', base=True)

            # coin policy untouched: one coin per start
            back_to_lobby(pg)
            pg.evaluate('__p40.boost(50)')
            before = st(pg)['stars']
            start_game(pg, 'sky-rescue', play=False)
            after = st(pg)['stars']
            C.check('starting a game still costs exactly one coin', before - after == 1, f'{before}->{after}')
            C.check('no page errors', not errs, '; '.join(errs[:4]))
        finally:
            b.close()
    return C.finish()


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception:
        traceback.print_exc()
        C.check('rules suite ran to the end', False, traceback.format_exc().splitlines()[-1])
        sys.exit(C.finish())

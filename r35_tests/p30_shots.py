"""p30 screenshots at 320x568, 844x390 and 768x1024 (lobby at 0 coins and with coins, intro dialog, resume notice). Evidence only.

    WQ33_APP=<build> python3 r35_tests/p30_shots.py
Output: /home/claude/audit_r35/r35/p30/shots_<w>x<h>_<name>_<TAG>.png
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from p30_lib import (Checker, SHOTS, TAG, URL, boot_account, close_intro, goto_lobby, open_intro, open_page30, start_game, sync_playwright)


def main():
    C = Checker('p30 screenshots (evidence)')
    with sync_playwright() as p:
        for w, h in ((320, 568), (844, 390), (768, 1024)):
            b, ctx, pg, errs = open_page30(p, w, h, touch=True)
            pg.goto(URL)
            pg.wait_for_timeout(1000)
            boot_account(pg, coins=None)
            goto_lobby(pg, open_locked=False)
            pg.screenshot(path=str(SHOTS / f'shots_{w}x{h}_lobby0_{TAG}.png'))
            open_intro(pg, 'ruins-courier')
            pg.screenshot(path=str(SHOTS / f'shots_{w}x{h}_intro0_{TAG}.png'))
            close_intro(pg)
            pg.evaluate('__p40.reset(60)')
            goto_lobby(pg, open_locked=False)
            open_intro(pg, 'ruins-courier')
            pg.screenshot(path=str(SHOTS / f'shots_{w}x{h}_intro60_{TAG}.png'))
            close_intro(pg)
            if w == 320:
                # a paused game shows the resume notice in the lobby
                start_game(pg, 'forest-dash', play=True)
                pg.wait_for_timeout(500)
                pg.locator('[data-a28="pause"]').click()
                pg.wait_for_function('document.querySelector("#pg-overlay:not([hidden]) .a28-overlaycard")', timeout=8000)
                pg.locator('#pg-overlay [data-a28="leave"]').click()
                pg.wait_for_selector('.p30-lobby', timeout=10000)
                pg.wait_for_timeout(1500)
                pg.screenshot(path=str(SHOTS / f'shots_{w}x{h}_resume_{TAG}.png'))
                has = pg.evaluate("!!document.querySelector('.p30-lobby .a28-resume')")
                C.check('lobby after leaving a paused game shows the resume notice', has, has)
            C.check(f'{w}x{h}: no console errors', not errs, errs[:3])
            b.close()
    return C.finish()


if __name__ == '__main__':
    sys.exit(main())

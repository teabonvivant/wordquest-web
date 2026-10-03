"""R3.4 p10 - arcade feel layer in the real page: ready card, result card (stars, best, new record), result jingles, FX switch.

    WQ33_APP=<index.html> python3 r34_tests/browser_feel.py [--shots DIR]

`[B]` checks are expected to FAIL on the R3.3 build.
"""
import sys
import time
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wq34_lib import (Checker, open_page, boot_account, start_game, back_to_lobby, st, sync_playwright, osc_mark, osc_since)  # noqa: E402

SHOTS = None
if '--shots' in sys.argv:
    SHOTS = Path(sys.argv[sys.argv.index('--shots') + 1])
    SHOTS.mkdir(parents=True, exist_ok=True)
C = Checker('r34 feel layer (browser)')


def txt(pg, sel):
    return pg.evaluate("(s=>{const e=document.querySelector(s);return e?e.textContent.trim():null;})(%r)" % sel)


def wait_overlay(pg):
    pg.wait_for_function('__p40.state().overlay', timeout=5000)
    pg.wait_for_timeout(250)


def main():
    with sync_playwright() as p:
        b, ctx, pg, errs = open_page(p, 1100, 760, touch=False, audio=True)
        try:
            boot_account(pg, coins=200)
            # --- ready card
            start_game(pg, 'forest-dash', play=False)
            pg.wait_for_timeout(300)
            goal, how = txt(pg, '.wq34-goal'), txt(pg, '.wq34-how')
            C.check('ready card shows the goal and how to play', bool(goal and how), f'{goal!r} / {how!r}', base=True)
            if SHOTS:
                pg.screenshot(path=str(SHOTS / 'ready_card.png'))
            pg.locator('[data-a28="play"]').click()
            pg.wait_for_function('__p40.state().playing', timeout=5000)
            pg.wait_for_timeout(300)
            # --- a lost run: card shows the score and the best, plays the "fail" jingle
            pg.evaluate('(()=>{__w34.g().score=1234;})()')
            mark = osc_mark(pg)
            pg.evaluate('__w34.end("w34 test lose")')
            wait_overlay(pg)
            pg.wait_for_timeout(900)
            o = osc_since(pg, mark)
            C.check('a lost run plays the 3-note fail jingle (3 triangle tones)', len(o) == 3 and all(x['type'] == 'triangle' for x in o), str(o), base=True)
            res = txt(pg, '.wq34-result')
            C.check('result card shows the score and the best', bool(res) and '1,234' in res and '最高' in res, repr(res), base=True)
            C.check('a lost run shows no stars', pg.evaluate('!document.querySelector(".wq34-stars")'))
            if SHOTS:
                pg.screenshot(path=str(SHOTS / 'result_lost.png'))
            # --- a won run: stars, new record tag, win jingle
            back_to_lobby(pg)
            pg.evaluate('__p40.boost(200)')
            start_game(pg, 'drift-path', play=True)
            pg.wait_for_timeout(200)
            pg.evaluate("(()=>{const g=__w34.g();g.pos={x:g.nodes[g.nodes.length-1].x,y:g.nodes[g.nodes.length-1].y};g.score=900;})()")
            mark = osc_mark(pg)
            pg.evaluate("__w34.g().end('路線完成','完成')")
            wait_overlay(pg)
            pg.wait_for_timeout(1500)
            o = osc_since(pg, mark)
            C.check('a won run plays the 5-note win jingle (5 triangle tones)', sum(1 for x in o if x['type'] == 'triangle') >= 5, str(o), base=True)
            stars = pg.evaluate('document.querySelectorAll(".wq34-stars span.on").length')
            C.check('a won run shows 1-3 stars', 1 <= stars <= 3, str(stars), base=True)
            tag = txt(pg, '.wq34-new')
            C.check('the first score of a game is tagged as a record', bool(tag), repr(tag), base=True)
            C.check('result is finished (not an error state)', st(pg)['phase'] in ('finished', 'next') and st(pg)['reason'] != 'error', str(st(pg)), base=False)
            if SHOTS:
                pg.screenshot(path=str(SHOTS / 'result_win.png'))
            # --- FX switch: off = no pops / confetti / haptics counted
            back_to_lobby(pg)
            pg.evaluate('__p40.boost(200)')
            pg.evaluate('WQFX.setOn(false)')
            start_game(pg, 'sky-rescue', play=True)
            before = pg.evaluate('__w34.fxStats()')
            pg.evaluate("(()=>{__w34.g().score=400;})()")
            pg.wait_for_timeout(500)
            pg.evaluate('__w34.end("fx off")')
            wait_overlay(pg)
            after = pg.evaluate('__w34.fxStats()')
            quiet = all(after[k] == before[k] for k in ('pops', 'confetti', 'haptics', 'shakes', 'bursts'))
            C.check('FX switched off: no pops, confetti, shakes or haptics', quiet, f'{before} -> {after}', base=True)
            pg.evaluate('WQFX.setOn(true)')
            back_to_lobby(pg)
            pg.evaluate('__p40.boost(200)')
            start_game(pg, 'sky-rescue', play=True)
            before = pg.evaluate('__w34.fxStats()')
            pg.evaluate("(()=>{__w34.g().score=900;})()")
            for _ in range(12):  # up to 3 s: the game reads the score on its next frame, which comes late on a busy machine
                pg.wait_for_timeout(250)
                after = pg.evaluate('__w34.fxStats()')
                if after['pops'] > before['pops']:
                    break
            C.check('FX on: a score jump pops a number', after['pops'] > before['pops'], f'{before["pops"]} -> {after["pops"]}', base=True)
            # --- reduced motion: the card animations stop
            ctx.pages[0].emulate_media(reduced_motion='reduce')
            back_to_lobby(pg)
            pg.evaluate('__p40.boost(200)')
            start_game(pg, 'drift-path', play=True)
            pg.evaluate("(()=>{const g=__w34.g();g.pos={x:g.nodes[g.nodes.length-1].x,y:g.nodes[g.nodes.length-1].y};g.score=50;})()")
            pg.evaluate("__w34.g().end('路線完成','完成')")
            wait_overlay(pg)
            anim = pg.evaluate("(()=>{const e=document.querySelector('.wq34-stars span');return e?getComputedStyle(e).animationName:'none';})()")
            C.check('prefers-reduced-motion: stars do not animate', anim == 'none', anim, base=False)
            C.check('no page errors', not errs, '; '.join(errs[:4]))
        finally:
            b.close()
    return C.finish()


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception:
        traceback.print_exc()
        C.check('feel suite ran to the end', False, traceback.format_exc().splitlines()[-1])
        sys.exit(C.finish())

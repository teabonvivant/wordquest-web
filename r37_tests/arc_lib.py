"""R3.20 helpers for driving the legacy arcade games from tests (shared by t28 and the evidence scripts)."""
import sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

BOOST = "(()=>{const c=a28Child();for(const id of COIN28.ids)c.permissions[id]='open';c.batch.used=0;activeChild().stars=60;return save();})()"
LEAVE = "(()=>{const c=a28Child();if(c.run)COIN28.close(c);pgPlaying=false;pgGame=null;a28Epoch++;pgFree=false;for(const id of COIN28.ids)c.permissions[id]='open';c.batch.used=0;activeChild().stars=60;save();go('game');render();return 1;})()"
ALL_IDS = ['sky-rescue', 'forest-dash', 'moon-bells', 'drift-path', 'valley-race', 'ruins-courier', 'cloud-island', 'star-patrol', 'lighthouse-well',
           'bounce-basket', 'forest-pong', 'meadow-cricket', 'harbor-volley',
           'honey-delivery', 'rolling-block', 'juice-lines', 'color-workshop', 'little-engineer',
           'number-garden', 'block-studio', 'honeycomb-puzzle', 'color-orbit', 'garden-paths',
           'star-rhythm', 'forest-band', 'sweet-studio']


def new_session(p, w, h, touch, name='t28', learn=False, motion=True):
    b, ctx, pg, errs = open_page(p, w, h, touch, learn=learn)
    if motion:   # lib37.open_page forces prefers-reduced-motion for the older suites; the arcade effects are tested (and shown) with motion on
        pg.emulate_media(reduced_motion='no-preference')
    pg.set_default_timeout(45000)
    pg.on('dialog', lambda d: d.accept())
    register(pg, name, '小明')
    pg.evaluate("(c)=>window.__r37(c)", BOOST)
    pg.evaluate("(c)=>window.__r37(c)", TOLERANT)
    return b, ctx, pg, errs


def reduced(pg, on):
    pg.emulate_media(reduced_motion='reduce' if on else 'no-preference')


def start_game(pg, gid, play=True):
    """buy + (optionally) press play; returns once pgPlaying (retrying when the engine auto-pauses on a stalled frame)."""
    pg.evaluate("(c)=>window.__r37(c)", LEAVE)
    pg.wait_for_timeout(300)
    pg.evaluate("(c)=>window.__r37(c)", f"a28Buy('{gid}')")
    pg.wait_for_function(f"window.__r37('!!pgGame&&pgMeta&&pgMeta.id===\"{gid}\"')", timeout=30000)
    pg.wait_for_selector('#pg-canvas')
    if not play:
        return
    pg.wait_for_timeout(700)
    for attempt in range(6):
        pg.evaluate("(c)=>window.__r37(c)", "pgPlay()")
        pg.wait_for_timeout(900)
        if pg.evaluate("window.__r37('pgPlaying===true')"):
            return
    raise AssertionError('game did not start playing: ' + gid)


def ensure_playing(pg):
    if not pg.evaluate("window.__r37('pgPlaying===true')"):
        pg.evaluate("(c)=>window.__r37(c)", "pgPlay()")
        pg.wait_for_function("window.__r37('pgPlaying===true')", timeout=12000)


# the engine pauses on any frame gap > 250 ms; on a shared / throttled box that makes tests flaky, so the harness turns an over-long gap into one normal frame
TOLERANT = "(()=>{if(window.__apTol)return 1;window.__apTol=1;const ot=pgTick;pgTick=function(now){try{if(pgPlaying&&!window.__apStrict&&now-pgLast>250)pgLast=now-16;}catch(_){}return ot.apply(this,arguments);};return 1;})()"
KEEPALIVE = "(()=>{if(window.__apKeep)return 1;window.__apKeep=setInterval(()=>{try{const r=a28Run();if(pgGame&&!pgPlaying&&!pgGame.done&&(pgFree||(r&&r.phase==='paused'))&&!a28Busy&&!window.__apNoKeep)pgPlay();}catch(_){}},600);return 1;})()"


def keepalive(pg):
    """The engine auto-pauses on any frame stall > 250 ms (software rendering on a busy box does that); tests re-press 開始 like a child would."""
    pg.evaluate("(c)=>window.__r37(c)", KEEPALIVE)


def ensure_play(pg, tries=6):
    """press 開始 again until the game really runs (any frame stall > 250 ms pauses the legacy engine)"""
    for _ in range(tries):
        if pg.evaluate("window.__r37('pgPlaying===true')"):
            return True
        pg.evaluate("(c)=>window.__r37(c)", "pgPlay()")
        pg.wait_for_timeout(700)
    return pg.evaluate("window.__r37('pgPlaying===true')")


def game_ticks(pg, secs=0.12, cap=15):
    """wait until the game clock advanced by `secs` (a few ticks), pressing play again when paused"""
    import time
    t0 = pg.evaluate("window.__r37('pgGame.t')"); end = time.time() + cap
    while time.time() < end:
        ensure_play(pg)
        pg.wait_for_timeout(120)
        if pg.evaluate("window.__r37('pgGame.t')") - t0 >= secs:
            return True
    return False


def card_ticks(pg, secs=0.3, cap=15):
    """wait until the open learning card's own clock advanced (the game clock stands still while the wrong-answer card freezes it)"""
    import time
    c0 = pg.evaluate("window.__r37('(WQArcPlus._debug().card||{t:0}).t')"); end = time.time() + cap
    while time.time() < end:
        ensure_play(pg)
        pg.wait_for_timeout(150)
        c = pg.evaluate("window.__r37('WQArcPlus._debug().card')")
        if not c or c['t'] - c0 >= secs:
            return True
    return False

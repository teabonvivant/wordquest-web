"""R3.6 t04b - item 15 in the browser: every game shows and charges its own price (1 to 4 coins).

    WQ33_APP=/path/to/index.html python3 r36_tests/t04_games_ui.py

The wallet rules themselves (purchase / refund / validate) are in t04_econ.cjs.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib36 import *  # noqa: E402,F401,F403

c = Checker('t04b game prices in the arcade')
html = APP.read_text()

PRICE = {
    'sky-rescue': 1, 'forest-dash': 1, 'moon-bells': 1, 'bounce-basket': 1, 'number-garden': 1, 'forest-band': 1,
    'drift-path': 2, 'meadow-cricket': 2, 'honey-delivery': 2, 'color-workshop': 2, 'forest-pong': 2, 'juice-lines': 2,
    'honeycomb-puzzle': 3, 'valley-race': 3, 'rolling-block': 3, 'block-studio': 3, 'star-rhythm': 3,
    'color-orbit': 4, 'garden-paths': 4, 'little-engineer': 4, 'sweet-studio': 4,
    'ruins-courier': 3, 'cloud-island': 3, 'star-patrol': 4, 'lighthouse-well': 4, 'harbor-volley': 2,
}
SAMPLE = {1: 'sky-rescue', 2: 'drift-path', 3: 'valley-race', 4: 'color-orbit'}
OLD_TEXTS = ['每局 1 枚金幣', '投 1 枚金幣', '一枚金幣，換一局', '用 1 枚金幣開始', '再投 1 枚金幣', '按下去才會扣 1 枚金幣', '退回 1 枚金幣', '每局 1 枚金幣，沒有倒數計時']


def to_lobby(pg):
    route_to(pg, '#game', 800)
    pg.wait_for_selector('[data-a28="filter"]', timeout=15000)
    if pg.query_selector('[data-a28="filter"][data-filter="全部"]'):
        pg.locator('[data-a28="filter"][data-filter="全部"]').click()
        pg.wait_for_timeout(500)


def open_intro(pg, gid):
    to_lobby(pg)
    pg.locator(f'[data-cabinet="{gid}"] [data-a28="intro"]').scroll_into_view_if_needed()
    pg.locator(f'[data-cabinet="{gid}"] [data-a28="intro"]').click()
    pg.wait_for_selector('#pg-dialog .a28-dialog-content', timeout=8000)
    pg.wait_for_timeout(500)


def finish_run(pg):
    """Lose the lives one by one until the game is over and the end card offers the next round."""
    for _ in range(5):
        if not pg.evaluate("__p40.state().playing"):
            pg.locator('[data-a28="play"]').click()
        pg.wait_for_function('__p40.state().playing', timeout=10000)
        pg.evaluate("__p40.end('t04 end')")
        pg.wait_for_function('__p40.state().overlay', timeout=6000)
        pg.wait_for_timeout(900)
        if pg.query_selector('#pg-overlay [data-a28="buy"]') or not pg.query_selector('#pg-overlay [data-a28="retry"]'):
            return
        pg.locator('#pg-overlay [data-a28="retry"]').click()
        pg.wait_for_timeout(700)


def close_dialog(pg):
    ev(pg, "(()=>{const d=document.getElementById('pg-dialog');if(d&&d.open)d.close();})()")


def wallet(pg):
    return json.loads(ev(pg, "JSON.stringify({coins:activeChild().stars,used:a28Child().batch.used,last:a28Child().ledger.slice(-1)[0]||null,n:a28Child().ledger.length})"))


with sync_playwright() as p:
    c.check('A1 none of the old "1 枚金幣 per play" sentences is left in the program', not [t for t in OLD_TEXTS if t in html], repr([t for t in OLD_TEXTS if t in html]), base=True)

    b, ctx, pg, errs = open_page36(p, 390, 844)
    boot(pg)
    ev(pg, "(()=>{activeChild().stars=30;save();})()")

    # ============================================================================================ B. lobby
    to_lobby(pg)
    cards = pg.evaluate("[...document.querySelectorAll('[data-cabinet]')].map(e=>({id:e.dataset.cabinet,chip:(e.querySelector('.q36-cost')||{}).innerText||'',note:(e.querySelector('.p30-note')||{}).innerText||'',open:e.classList.contains('is-open')}))")
    ids = {x['id'] for x in cards}
    c.check('B1 the lobby lists all 26 games', ids == set(PRICE), f'{len(ids)} cards')
    bad = [(x['id'], x['chip']) for x in cards if not re.fullmatch(rf"[●\s]*{PRICE.get(x['id'], 0)}\s*枚\s*", x['chip'].replace('\n', ' '))]
    c.check('B2 every card carries a price tag with its own price (1 to 4)', not bad, repr(bad[:4]), base=True)
    bad = [(x['id'], x['note']) for x in cards if x['open'] and f"玩一次 {PRICE[x['id']]} 枚金幣" not in x['note']]
    c.check('B3 every open card says 「玩一次 N 枚金幣」 with the same N', not bad, repr(bad[:4]), base=True)
    c.check('B4 the price tags are not all the same', len({PRICE[x['id']] for x in cards}) == 4)
    pg.screenshot(path=str(SHOT_DIR / 't04_lobby_390.png'))
    hero = pg.evaluate("document.querySelector('#app').innerText.slice(0,400)")
    c.check('B5 the lobby wallet card shows the coin count with the new coin face', '30' in hero and '金幣' in hero, repr(hero[:80]))
    c.check('B6 no sideways scroll in the lobby (390)', pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth") <= 0)
    over = pg.evaluate("[...document.querySelectorAll('[data-cabinet]')].filter(e=>{const r=e.getBoundingClientRect(),t=e.querySelector('.q36-cost');if(!t)return false;const q=t.getBoundingClientRect();return q.right>r.right+0.5||q.left<r.left-0.5}).length")
    c.check('B7 no price tag sticks out of its card', over == 0, str(over))

    # ============================================================================================ C. intro + buy for one game of each price
    for n, gid in SAMPLE.items():
        ev(pg, f"(()=>{{const c=a28Child();if(c.run)COIN28.close(c);c.batch.used=0;activeChild().stars=30;save();}})()")
        open_intro(pg, gid)
        dlg = pg.evaluate("document.querySelector('#pg-dialog').innerText")
        buy = pg.evaluate("document.querySelector('#pg-dialog [data-a28=\"buy\"]').innerText.replace(/\\s+/g,' ').trim()")
        c.check(f'C{n}a the {n}-coin game ({gid}): the button and the notes all say {n} 枚', f'用 {n} 枚金幣開始' in buy and f'按下去才會扣 {n} 枚金幣' in dlg and (n == 1 or '1 枚金幣' not in dlg), repr(buy), base=(n != 1))
        if n == 4:
            pg.screenshot(path=str(SHOT_DIR / 't04_intro_4.png'))
        before = wallet(pg)
        pg.locator('#pg-dialog [data-a28="buy"]').click()
        pg.wait_for_selector('#pg-canvas', timeout=10000)
        after = wallet(pg)
        c.check(f'C{n}b buying takes exactly {n} coins, writes one -{n} line and uses 1 of the 5 plays', before['coins'] - after['coins'] == n and after['last']['amount'] == -n and after['used'] == before['used'] + 1 and after['n'] == before['n'] + 1, f'{before} -> {after}', base=(n != 1))
        eyebrow = pg.evaluate("document.querySelector('.a28-playhead .a28-eyebrow')?.innerText||''")
        c.check(f'C{n}c the play screen says how many coins this round cost', f'已投 {n} 枚金幣' in eyebrow, repr(eyebrow), base=(n != 1))
        # cancel before starting: the refund button names the price, the confirm names it, the coins come back
        pg.dialogs.clear()
        route_to(pg, '#game', 700)
        refund_txt = pg.evaluate("document.querySelector('[data-a28=\"refund\"]')?.innerText||''")
        rb = pg.query_selector('[data-a28="refund"]')
        if rb:
            rb.click()
            pg.wait_for_timeout(900)
        back = wallet(pg)
        c.check(f'C{n}d cancelling before the start gives back {n} coins; the button and the question both say {n}', f'退回 {n} 枚金幣' in refund_txt and any(f'退回 {n} 枚金幣' in d for d in pg.dialogs) and back['coins'] == before['coins'] and back['used'] == before['used'], f'{refund_txt!r} {pg.dialogs} {back}', base=(n != 1))

    # ============================================================================================ D. not enough coins
    for n, gid in SAMPLE.items():
        if n == 1:
            continue
        ev(pg, f"(()=>{{const c=a28Child();if(c.run)COIN28.close(c);c.batch.used=0;activeChild().stars={n - 1};save();}})()")
        open_intro(pg, gid)
        dlg = pg.evaluate("document.querySelector('#pg-dialog').innerText")
        nobuy = pg.evaluate("!document.querySelector('#pg-dialog [data-a28=\"buy\"]')")
        earn = pg.evaluate("!!document.querySelector('#pg-dialog [data-p30=\"earn\"]')")
        w0 = wallet(pg)
        c.check(f'D{n} with {n - 1} coins the {n}-coin game says what it costs, cannot be bought and offers the way to earn coins', nobuy and earn and f'這款要 {n} 枚金幣，你現在有 {n - 1} 枚' in dlg, f'nobuy={nobuy} earn={earn} {dlg[-160:]!r}', base=True)
        if n == 4:
            pg.screenshot(path=str(SHOT_DIR / 't04_intro_poor.png'))
        close_dialog(pg)
    ev(pg, "(()=>{activeChild().stars=3;save();})()")
    open_intro(pg, 'sky-rescue')
    dis = pg.evaluate("(()=>{const b=document.querySelector('#pg-dialog [data-a28=\"buy\"]');return b?b.disabled:null})()")
    c.check('D4 the same 3 coins are enough for a 1-coin game', dis is False)
    close_dialog(pg)

    # ============================================================================================ E. play again after a game
    ev(pg, "(()=>{const c=a28Child();if(c.run)COIN28.close(c);c.batch.used=0;activeChild().stars=9;save();})()")
    open_intro(pg, 'valley-race')
    pg.locator('#pg-dialog [data-a28="buy"]').click()
    pg.wait_for_selector('#pg-canvas', timeout=10000)
    w0 = wallet(pg)
    finish_run(pg)
    again = pg.evaluate("document.querySelector('#pg-overlay [data-a28=\"buy\"]')?.innerText.replace(/\\s+/g,' ').trim()||''")
    w1 = wallet(pg)
    c.check('E0 losing lives inside one paid round takes no more coins', w1['coins'] == w0['coins'] and w1['used'] == w0['used'], f'{w0}->{w1}')
    c.check('E1 after a 3-coin game the play-again button offers 再投 3 枚金幣', '再投 3 枚金幣' in again, repr(again), base=True)
    pg.locator('#pg-overlay [data-a28="buy"]').click()
    pg.wait_for_selector('#pg-canvas', timeout=10000)
    pg.wait_for_timeout(600)
    w2 = wallet(pg)
    c.check('E2 playing again takes another 3 coins and a second play of the round', w1['coins'] - w2['coins'] == 3 and w2['used'] == w1['used'] + 1, f'{w1}->{w2}', base=True)
    finish_run(pg)
    pg.locator('#pg-overlay [data-a28="buy"]').click()
    pg.wait_for_selector('#pg-canvas', timeout=10000)
    pg.wait_for_timeout(600)
    finish_run(pg)
    w3 = wallet(pg)
    nobuy = pg.evaluate("!document.querySelector('#pg-overlay [data-a28=\"buy\"]')")
    txt = pg.evaluate("document.querySelector('#pg-overlay')?.innerText||''")
    c.check('E3 with 0 coins left there is no play-again button, and the message points to full stars', w3['coins'] == 0 and nobuy, f'{w3} {txt[:160]!r}', base=True)
    earn = pg.evaluate("!!document.querySelector('#pg-overlay [data-p30=\"earn\"]')")
    c.check('E4 the end card then says 5 stars give a coin and offers a practice to earn one', earn and '5 顆星' in txt and '1 枚金幣' in txt, f'earn={earn} {txt[:200]!r}', base=True)
    pg.screenshot(path=str(SHOT_DIR / 't04_overlay_empty.png'))
    pg.evaluate("document.querySelector('#pg-overlay [data-a28=\"leave\"]')?.click()")

    # ============================================================================================ F. saved and reopened
    ev(pg, "(()=>{const c=a28Child();if(c.run)COIN28.close(c);activeChild().stars=12;save();})()")
    open_intro(pg, 'color-orbit')
    pg.locator('#pg-dialog [data-a28="buy"]').click()
    pg.wait_for_selector('#pg-canvas', timeout=10000)
    w0 = wallet(pg)
    pg.reload()
    pg.wait_for_function('typeof window.__p40==="object"', timeout=15000)
    pg.wait_for_timeout(800)
    w1 = wallet(pg)
    c.check('F1 after reopening the page the 4-coin spend, the balance and the play count are still the same', w0['coins'] == w1['coins'] and w0['used'] == w1['used'] and w1['last'] and w1['last']['amount'] == -4, f'{w0}->{w1}', base=True)
    ok = ev(pg, "(()=>{try{const x=JSON.parse(JSON.stringify(db.arcadeV28));WQArcade28.validate(x,db.children);return true}catch(e){return e.message}})()")
    c.check('F2 the saved wallet passes the app\'s own validator', ok is True, repr(ok))
    c.check('F3 no console or page errors', not errs, repr(errs[:3]))
    b.close()

    # ============================================================================================ G. other screen sizes
    for w, h, name in [(320, 568, 'small'), (844, 390, 'landscape'), (768, 1024, 'tablet')]:
        b, ctx, pg, errs = open_page36(p, w, h, touch=True)
        boot(pg)
        ev(pg, "(()=>{activeChild().stars=30;save();})()")
        to_lobby(pg)
        sc = pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
        over = pg.evaluate("[...document.querySelectorAll('[data-cabinet]')].filter(e=>{const r=e.getBoundingClientRect(),t=e.querySelector('.q36-cost');if(!t)return false;const q=t.getBoundingClientRect();return q.right>r.right+0.5||q.left<r.left-0.5}).length")
        c.check(f'G1 {name} {w}x{h}: price tags inside their cards and no sideways scroll', sc <= 0 and over == 0, f'scroll={sc} over={over}')
        open_intro(pg, 'color-orbit')
        pg.evaluate("document.querySelector('#pg-dialog [data-a28=\"buy\"]').scrollIntoView({block:'center'})")
        pg.wait_for_timeout(300)
        r = pg.evaluate("(()=>{const b=document.querySelector('#pg-dialog [data-a28=\"buy\"]');const q=b.getBoundingClientRect();return {h:q.height,l:q.left,r:q.right,vw:innerWidth,t:q.top,bt:q.bottom,vh:innerHeight}})()")
        c.check(f'G2 {name}: the 「用 4 枚金幣開始」 button is at least 44 px high and inside the screen', r['h'] >= 44 and r['l'] >= 0 and r['r'] <= r['vw'] and r['bt'] <= r['vh'] + 1, repr(r))
        pg.screenshot(path=str(SHOT_DIR / f't04_intro_{name}.png'))
        b.close()

import sys as _s
_s.exit(c.finish())

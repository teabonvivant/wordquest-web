"""R3.6 t06 - item 4: an Admin test account that opens everything.

    WQ33_APP=/path/to/index.html python3 r36_tests/t06_admin.py

* on file:// (and localhost) the log-in page links to the test area; in the test area the card has Admin / 1234 already filled in
* inside: 26 games open and free (no coins taken), every classroom unit startable, a test centre with links to every part,
  a switch back to the normal rules (coins are taken again)
* test data is kept apart from the family accounts
* on a normal https address none of this exists: no link, no test banner, Admin / 1234 does not log in, /#admin is "not found"
  (R3.7.1: with ?mode=admin-test the https test area opens with a private password; 1234 still never logs in - see r37_tests/t06_live_admin.py)
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib36 import *  # noqa: E402,F401,F403
import p20_lib  # noqa: E402
from wq33 import new_page  # noqa: E402

c = Checker('t06 admin test account')
SUFFIX = '?mode=admin-test'
GAMES = {1: 'sky-rescue', 2: 'drift-path', 3: 'valley-race', 4: 'color-orbit'}


def wallet(pg):
    return json.loads(ev(pg, "JSON.stringify({coins:activeChild().stars,used:a28Child().batch.used,n:a28Child().ledger.length})"))


def to_lobby(pg):
    route_to(pg, '#game', 800)
    pg.wait_for_selector('[data-a28="filter"]', timeout=15000)
    pg.locator('[data-a28="filter"][data-filter="全部"]').click()
    pg.wait_for_timeout(500)


def open_intro(pg, gid):
    to_lobby(pg)
    pg.locator(f'[data-cabinet="{gid}"] [data-a28="intro"]').scroll_into_view_if_needed()
    pg.locator(f'[data-cabinet="{gid}"] [data-a28="intro"]').click()
    pg.wait_for_selector('#pg-dialog .a28-dialog-content', timeout=8000)
    pg.wait_for_timeout(500)


def close_dialog(pg):
    ev(pg, "(()=>{const d=document.getElementById('pg-dialog');if(d&&d.open)d.close();})()")


with sync_playwright() as p:
    # ============================================================================================ A. file:// - normal log-in page
    b, ctx, pg, errs = open_page36(p, 390, 844, suffix=SUFFIX)
    pg.goto(URL)
    pg.wait_for_timeout(900)
    pg.evaluate("location.hash='#login'")
    pg.wait_for_timeout(800)
    entry = pg.evaluate("(()=>{const e=document.querySelector('#q36-admin-entry a[data-q36=\"admin-link\"]');return e?{href:e.getAttribute('href'),text:e.innerText}:null})()")
    c.check('A1 on file:// the normal log-in page links to the Admin test area', bool(entry) and 'mode=admin-test' in entry['href'] and 'Admin' in entry['text'], repr(entry), base=True)
    t = text(pg)
    c.check('A2 the normal page does not show the test password', '1234' not in t, repr(t[:60]))
    pg.screenshot(path=str(SHOT_DIR / 't06_login_normal.png'), full_page=True)
    over = pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
    c.check('A3 no sideways scroll on the normal log-in page', over <= 0, str(over))
    pg.evaluate("document.querySelector('#q36-admin-entry a').click()")
    pg.wait_for_timeout(1800)
    pg.wait_for_function('typeof window.__ev==="function"', timeout=30000)  # the 12 MB page may still be parsing
    inside = ev(pg, "WQ_TEST_MODE")
    c.check('A4 following the link opens the test area', inside is True, repr(inside), base=True)
    b.close()

    # ============================================================================================ B. the test area
    b, ctx, pg, errs = open_page36(p, 390, 844, suffix=SUFFIX)
    pg.goto(URL + SUFFIX)
    pg.wait_for_timeout(900)
    pg.evaluate("location.hash='#login'")
    pg.wait_for_timeout(800)
    vals = pg.evaluate("({n:document.querySelector('#login-name')?.value,p:document.querySelector('#login-pin')?.value,btn:[...document.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>b.innerText.trim())})")
    c.check('B1 in the test area the log-in card has Admin and 1234 filled in', vals['n'] == 'Admin' and vals['p'] == '1234', repr(vals), base=True)
    t = text(pg)
    c.check('B2 the old helper lines are gone (one log-in card only)', not any(x in t for x in ['你已在測試專用區。請輸入以上資料登入。', '在一般的 https 網站，也可以打開測試畫面。']) and t.count('以 Admin 登入') == 0, repr(t[:200]), base=True)
    pg.screenshot(path=str(SHOT_DIR / 't06_login_test.png'), full_page=True)
    pg.click('[data-act="login-submit"]')
    pg.wait_for_timeout(2500)
    st = ev(pg, "JSON.stringify({admin:isTestAdmin(),unlock:adminUnlocks(),coins:activeChild().stars,hash:location.hash})")
    st = json.loads(st)
    c.check('B3 one click logs in as Admin, with 50 test coins, and lands on the test centre', st['admin'] and st['unlock'] and st['coins'] == 50 and st['hash'] == '#admin', repr(st), base=True)
    t = text(pg)
    c.check('B4 the test centre links to the games, the lessons and the parent tools', all(x in t for x in ['進入遊戲街機', '80 個教學單元', '簡化家長工具', '全部 26 款遊戲']), repr(t[:120]))
    names = ['天空救援隊', '極速森林跑酷', '月光跳鈴', '海港排球', '燈塔深井', '甜點夢工場']
    c.check('B5 the test centre lists the games by name (all 26 are there)', all(n in t for n in names), '')
    pg.screenshot(path=str(SHOT_DIR / 't06_admin_centre.png'), full_page=True)
    foot = pg.evaluate("document.querySelector('.footer')?.innerText||''")
    c.check('B6 the footer says this is the test area, with the new name', '學霸星球 SmartQuest Planet' in foot and '測試專用' in foot, repr(foot))

    # games: all open, all free
    to_lobby(pg)
    cards = pg.evaluate("[...document.querySelectorAll('[data-cabinet]')].map(e=>({id:e.dataset.cabinet,open:e.classList.contains('is-open'),btn:(e.querySelector('[data-a28=\"intro\"]')||{}).innerText||''}))")
    c.check('B7 all 26 games are open for Admin', len(cards) == 26 and all(x['open'] for x in cards), f'{len(cards)} cards, closed: {[x["id"] for x in cards if not x["open"]]}', base=True)
    c.check('B8 the card buttons say "free test"', all('免費' in x['btn'] for x in cards), repr([x['btn'] for x in cards][:3]), base=True)
    for n, gid in GAMES.items():
        open_intro(pg, gid)
        buy = pg.evaluate("document.querySelector('#pg-dialog [data-a28=\"buy\"]')?.innerText.replace(/\\s+/g,' ').trim()||''")
        w0 = wallet(pg)
        pg.locator('#pg-dialog [data-a28="buy"]').click()
        pg.wait_for_selector('#pg-canvas', timeout=10000)
        w1 = wallet(pg)
        c.check(f'B9.{n} {gid} ({n}-coin game): Admin starts it without paying; the button says so', '不扣金幣' in buy and w1['coins'] == w0['coins'] and w1['n'] == w0['n'], f'{buy!r} {w0}->{w1}', base=True)
        ev(pg, "(()=>{const c=a28Child();if(c.run)COIN28.close(c);})()")
    # more than 5 plays in a row (no five-play cap for Admin)
    ev(pg, "(()=>{const c=a28Child();c.batch.used=5;save();})()")
    open_intro(pg, 'star-patrol')
    dis = pg.evaluate("(()=>{const b=document.querySelector('#pg-dialog [data-a28=\"buy\"]');return b?b.disabled:null})()")
    c.check('B10 Admin can still start a game when the round\'s 5 plays are used up (no 5-play cap)', dis is False, repr(dis), base=True)
    close_dialog(pg)
    ev(pg, "(()=>{const c=a28Child();c.batch.used=0;save();})()")

    # lessons: every unit, last one included
    us = units(pg)
    c.check('B11 the 80 classroom units are there for Admin', len(us) == 80, str(len(us)))
    route_to(pg, '#admin', 700)
    info = start(pg, 'lesson', us[-1], settle=900)
    c.check('B12 Admin starts the last classroom unit straight away', bool(info) and info.get('index') is not None, repr(info)[:120])
    route_to(pg, '#admin', 700)
    r = play_lesson(pg, us[0])
    c.check('B13 Admin can walk a whole lesson to the result page', bool(r['result']), repr(r['result'])[:100])
    clear(pg)

    # normal rules switch
    route_to(pg, '#admin', 900)
    sw = pg.evaluate("[...document.querySelectorAll('button')].filter(b=>b.innerText.includes('改用正常規則測試')).length")
    c.check('B14 the test centre has a switch to the normal rules', sw == 1, str(sw))
    pg.evaluate("[...document.querySelectorAll('button')].find(b=>b.innerText.includes('改用正常規則測試')).click()")
    pg.wait_for_timeout(700)
    pg.evaluate('__p40.boost(60)')
    ev(pg, "(()=>{const c=a28Child();if(c.run)COIN28.close(c);c.batch.used=0;activeChild().stars=20;save();})()")
    c.check('B15 after the switch the rules are normal again', ev(pg, "adminUnlocks()") is False)
    open_intro(pg, 'color-orbit')
    w0 = wallet(pg)
    buy = pg.evaluate("document.querySelector('#pg-dialog [data-a28=\"buy\"]')?.innerText.replace(/\\s+/g,' ').trim()||''")
    pg.locator('#pg-dialog [data-a28="buy"]').click()
    pg.wait_for_selector('#pg-canvas', timeout=10000)
    w1 = wallet(pg)
    c.check('B16 with the normal rules the 4-coin game takes 4 coins again', '用 4 枚金幣開始' in buy and w0['coins'] - w1['coins'] == 4, f'{buy!r} {w0}->{w1}', base=True)
    ev(pg, "(()=>{const c=a28Child();if(c.run)COIN28.close(c);try{sessionStorage.removeItem('wordquest-v29-admin-rules')}catch(e){}})()")

    # isolation from the family accounts
    keys = pg.evaluate("Object.keys(localStorage)")
    test_keys = [k for k in keys if k.startswith('wordquest-v29-test-')]
    fam_keys = [k for k in keys if k.startswith('wordquest-v10-') and 'accounts' in k]
    c.check('B17 the test data sits under its own keys, not the family keys', bool(test_keys) and not fam_keys, repr(keys)[:200])
    c.check('B18 no console or page errors in the test area', not errs, repr(errs[:3]))
    b.close()

    # the normal page, same browser profile, does not know the Admin account
    b, ctx, pg, errs = open_page36(p, 390, 844)
    pg.goto(URL)
    pg.wait_for_timeout(900)
    acc = pg.evaluate("localStorage.getItem('wordquest-v10-accounts')")
    c.check('B19 the normal (family) side has no Admin account', acc is None or 'Admin' not in acc, repr(acc)[:80])
    b.close()

    # ============================================================================================ C. a normal https address
    html = p20_lib.patched_html()
    host = 'https://smartquest.example/index.html'
    b, ctx, pg, errs = new_page(p, 390, 844, touch=True)
    pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' and 'ERR_' not in m.text and 'Failed to load resource' not in m.text else None)
    pg.set_default_timeout(12000)
    pg.route('https://smartquest.example/**', lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html))
    pg.goto(host)
    pg.wait_for_timeout(1200)
    pg.evaluate("location.hash='#login'")
    pg.wait_for_timeout(900)
    local = ev(pg, "JSON.stringify({allowed:WQ_LOCAL_TEST_ALLOWED,test:WQ_TEST_MODE})")
    c.check('C1 on a normal https address (no ?mode=admin-test) the test area stays off', json.loads(local) == {'allowed': False, 'test': False}, local)
    t = text(pg)
    foot = pg.evaluate("document.querySelector('.footer')?.innerText||''")
    c.check('C2 no Admin link, no test banner, no test password on the page', not pg.query_selector('#q36-admin-entry') and not pg.query_selector('#wq29-test-banner') and '1234' not in t and 'Admin' not in t and '測試專用' not in foot, repr(t[:160]))
    pg.screenshot(path=str(SHOT_DIR / 't06_login_https.png'), full_page=True)
    if pg.query_selector('#login-name'):
        pg.fill('#login-name', 'Admin')
        pg.fill('#login-pin', '1234')
        pg.click('[data-act="login-submit"]')
        pg.wait_for_timeout(1800)
    still_out = ev(pg, "!isLoggedIn()&&!isTestAdmin()")
    c.check('C3 typing Admin / 1234 on a normal https address does not log in', still_out is True, repr(still_out))
    route_to(pg, '#admin', 900)
    t = text(pg)
    c.check('C4 the #admin page is "not found" on a normal https address', '找不到這個頁面' in t and '測試中心' not in t, repr(t[:120]))
    pg.goto(host + SUFFIX)
    pg.wait_for_timeout(1200)
    pg.evaluate("location.hash='#login'")
    pg.wait_for_timeout(900)
    t = text(pg)
    if pg.query_selector('#login-name'):
        pg.fill('#login-name', 'Admin')
        pg.fill('#login-pin', '1234')
        pg.click('[data-act="login-submit"]')
        pg.wait_for_timeout(1800)
    c.check('C6 with ?mode=admin-test on https: 1234 is not shown and does not log in', '1234' not in t and ev(pg, "!isLoggedIn()&&!isTestAdmin()") is True, repr(t[:120]))
    c.check('C5 no console or page errors on the https address', not errs, repr(errs[:3]))
    b.close()

    # ============================================================================================ D. small phone
    b, ctx, pg, errs = open_page36(p, 320, 568, suffix=SUFFIX)
    pg.goto(URL + SUFFIX)
    pg.wait_for_timeout(900)
    pg.evaluate("location.hash='#login'")
    pg.wait_for_timeout(800)
    over = pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
    btn = pg.evaluate("(()=>{const b=document.querySelector('[data-act=\"login-submit\"]');if(!b)return null;const r=b.getBoundingClientRect();return {h:r.height,l:r.left,r:r.right,vw:innerWidth}})()")
    c.check('D1 320 px: the test log-in card fits and its button is tall enough', over <= 0 and btn and btn['h'] >= 44 and btn['l'] >= 0 and btn['r'] <= btn['vw'], f'over={over} {btn}')
    pg.screenshot(path=str(SHOT_DIR / 't06_login_test_320.png'), full_page=True)
    b.close()

sys.exit(c.finish())

"""R3.7 t06 - Admin test account on the public https site; trial parent gate; trial coin; games hub tiles; level word pictures.
The live Admin password is not in the repo: pass it as WQ_ADMIN_PW (the success checks are skipped without it)."""
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t06')
LIVE = 'https://wq-live.test/app/index.html'
PWD = os.environ.get('WQ_ADMIN_PW', '')


def live_page(p, suffix):
    b, ctx, pg, errs = new_page(p, 1440, 900, touch=False)
    html = patched_html()
    pg.route(LIVE + suffix, lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html))
    pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    pg.goto(LIVE + suffix); pg.wait_for_timeout(1500)
    return b, pg, errs


def try_login(pg, pw):
    go(pg, '#login', 400)
    pg.fill('#login-name', 'Admin'); pg.fill('#login-pin', pw)
    pg.click('[data-act="login-submit"]'); pg.wait_for_timeout(1500)
    return ev(pg, 'isTestAdmin()')


with sync_playwright() as p:
    # ---- public site without the test switch: no Admin at all ----
    b, pg, errs = live_page(p, '')
    C.ok(not ev(pg, 'WQ_TEST_MODE') and not ev(pg, 'WQ_LOCAL_TEST_ALLOWED'), 'public site: normal mode, not a local host')
    b.close()

    # ---- public site with ?mode=admin-test: the public 1234 is refused and never shown ----
    b, pg, errs = live_page(p, '?mode=admin-test')
    C.ok(ev(pg, 'WQ_TEST_MODE'), 'public site: ?mode=admin-test opens the separate test area')
    go(pg, '#login', 400)
    C.ok('1234' not in pg.inner_text('body') and pg.input_value('#login-pin') == '', 'public site: password 1234 is not shown or pre-filled')
    C.ok(not try_login(pg, '1234'), 'public site: Admin / 1234 is refused')
    C.ok(not try_login(pg, 'Star-wrong-password'), 'public site: a wrong long password is refused')
    if PWD:
        C.ok(try_login(pg, PWD), 'public site: Admin with the private password logs in')
        C.ok(ev(pg, "['english','math','olympiad'].every(t=>[0,1,2,3,4].every(w=>[...Array(10).keys()].every(s=>r37StageOpen(t,w,s))))"), 'public Admin: every level is open')
        go(pg, '#p/parent', 500)
        C.ok(pg.query_selector('.r37-df') is not None, 'public Admin: parent star opens without the parent password')
        go(pg, '#admin', 600)
        C.ok('測試中心' in pg.inner_text('body') or pg.query_selector('a[href="#admin"]') is not None, 'public Admin: test centre renders')
        C.ok(ev(pg, "localStorage.getItem('wordquest-v10-current-account')===null&&Object.keys(localStorage).every(k=>!k.startsWith('wordquest-v10-user-'))"), 'public Admin: nothing written to the family storage keys')
    else:
        print('  (WQ_ADMIN_PW not set - success checks skipped)')
    C.ok(not errs, f'public test area: no console errors {errs[:3]}')
    b.close()

    # ---- local file keeps Admin / 1234 ----
    b, ctx, pg, errs = open_page(p, 1440, 900, False)
    html = patched_html()
    pg.route(URL + '?mode=admin-test', lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html))
    pg.goto(URL + '?mode=admin-test'); pg.wait_for_timeout(1500)
    C.ok(try_login(pg, '1234'), 'local: Admin / 1234 still logs in for the test suites')
    b.close()

    # ---- trial child (not logged in): parent star asks to log in; coin shows 0 ----
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    pg.goto(URL); pg.wait_for_timeout(1200)
    go(pg, '#p/parent', 400)
    C.ok(pg.query_selector('.r37-df') is None and pg.query_selector('.r37-login a[href="#login"]') is not None, 'trial: parent settings are hidden behind a log-in card')
    C.ok(fits(pg, '.r37-login'), 'trial: log-in card inside the viewport')
    C.ok(pg.inner_text('.r37-coin').strip().endswith('0'), 'trial: coin counter shows 0, not a dash')
    # ---- games hub: tiles do not overlap on a phone ----
    go(pg, '#p/games', 400)
    hits = pg.evaluate("(()=>{const r=[...document.querySelectorAll('.r37-tile')].map(e=>e.getBoundingClientRect()),o=[];r.forEach((a,i)=>r.slice(i+1).forEach((b,j)=>{if(a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom)o.push([i,i+1+j])}));return {n:r.length,o}})()")
    C.ok(hits['n'] >= 4 and not hits['o'], f'phone: game tiles do not overlap {hits}')
    C.ok(fits(pg, '.r37-tile'), 'phone: game tiles inside the viewport')
    # ---- level words: most early words have a picture ----
    pics = ev(pg, "[0,1,2].map(w=>{let n=0,t=0;for(let s=0;s<10;s++)for(const x of r37EnStage(w,s)){t++;if(r37Emoji(x.en))n++;}return n/t})")
    C.ok(all(x >= .6 for x in pics), f'English worlds 1-3: at least 60% of words have a picture {pics}')
    C.ok(not errs, f'trial: no console errors {errs[:3]}')
    b.close()

C.done()

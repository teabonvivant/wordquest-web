"""R3.7 t05 - Admin test account sees every level; the English lesson (8 words + 20 questions, star rule) still works from the 英文星; maths/olympiad entries; routes outside the shell still render."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'r36_tests'))
import lib36  # noqa: E402

C = Checker('t05')
SUFFIX = '?mode=admin-test'

with sync_playwright() as p:
    b, ctx, pg, errs = open_page(p, 1440, 900, False)
    html = patched_html()
    pg.route(URL + SUFFIX, lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html))
    pg.goto(URL + SUFFIX); pg.wait_for_timeout(1500)
    ev(pg, "loginTestAdmin()"); pg.wait_for_timeout(1500)
    go(pg, '#kid', 500)
    C.ok(ev(pg, 'isTestAdmin()'), 'logged in as the Admin test account')
    C.ok(ev(pg, "[0,1,2,3,4].every(w=>[...Array(10).keys()].every(s=>r37StageOpen('english',w,s)))"), 'Admin: all 50 English stages are open')
    C.ok(ev(pg, "['math','olympiad'].every(t=>[...Array(6).keys()].every(w=>[...Array(10).keys()].every(s=>r37StageOpen(t,w,s))))"), 'Admin: all maths and olympiad stages are open')
    go(pg, '#lv/english', 400)
    C.ok(pg.evaluate("document.querySelectorAll('.r37-node.lock').length") == 0, 'Admin: no locked node on the map')
    go(pg, '#p/parent', 500)
    C.ok(pg.query_selector('.r37-df') is not None, 'Admin passes the parent gate in the test area')
    pg.click('.r37-ptab[data-k="data"]'); pg.wait_for_timeout(300)
    C.ok(pg.query_selector('a[href="#admin"]') is not None, 'parent star links to the test centre for Admin')
    C.ok(not errs, f'no console errors {errs[:3]}')
    b.close()

    # ---- a normal https-like page keeps locks (not the local test area) ----
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    register(pg, 'r37reg', '小明')
    C.ok(ev(pg, "r37StageOpen('english',0,1)") is False and ev(pg, "r37StageOpen('english',1,0)") is False, 'a family account has locked stages')

    # ---- English lesson through the 英文星 (single flow, real clicks) ----
    go(pg, '#p/english', 400)
    pg.click('a[href="#classroom"]'); pg.wait_for_timeout(700)
    C.ok(pg.evaluate("location.hash") == '#classroom', '課堂 tile opens the classroom')
    r = lib36.play_lesson(pg, 'U01', wrong=(), hinted=())
    res = r['result'] or ''
    C.ok('5' in res or pg.evaluate("document.querySelectorAll('.q36-result .q36-star.on').length") == 5, f'lesson finishes with a result screen: {res[:40]!r}')
    C.ok(r['c1'] == r['c0'] + 1, f"flawless 8-word lesson pays 1 coin ({r['c0']}->{r['c1']})")
    r2 = lib36.play_lesson(pg, 'U02', wrong=(3,), hinted=())
    C.ok(r2['c1'] == r2['c0'], f"one wrong answer in a lesson pays no coin ({r2['c0']}->{r2['c1']})")
    n = ev(pg, "L30.plan(LIB30,{uid:'U02',mode:'lesson',count:8,childId:'c1',sessionId:'zz'}).queue.filter(q=>q.mode==='study').length")
    C.ok(n == 8, f'a lesson still teaches 8 words ({n})')

    # ---- routes outside the shell still render and the nav leads back to the planets ----
    for h in ['#classroom', '#game', '#ranges', '#report', '#settings', '#library', '#children', '#learning', '#assembly']:
        go(pg, h, 500)
        C.ok(pg.evaluate("document.querySelector('#app').innerText.trim().length")>10 and not pg.evaluate("document.body.classList.contains('r37')"), f'{h} renders outside the shell')
    go(pg, '#game', 500)
    nav = pg.evaluate("[...document.querySelectorAll('#wq29-nav a')].map(a=>a.getAttribute('href')+'|'+a.textContent.trim()).join(' ')")
    C.ok('#p/english|英文' in nav and '#p/games' in nav and '#p/parent' in nav, f'old pages link back to the planets: {nav}')
    C.ok(not errs, f'no console errors {errs[:3]}')
    b.close()
C.done()

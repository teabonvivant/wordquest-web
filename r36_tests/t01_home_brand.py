"""R3.6 t01 - items 1, 10, 11, 12: big home tiles, the new name, maths split into normal / olympiad, a way home from maths.

    WQ33_APP=/path/to/index.html python3 r36_tests/t01_home_brand.py

`[B]` = expected to fail on the R3.5 build (the A/B runner proves it).
Superseded from R3.7 by r37_tests/t01_shell_levels.py: sections B-D test the retired R3.6 home tiles, bottom bar and maths dialog.
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib36 import *  # noqa: E402,F401,F403
from lib36 import TITLE  # noqa: E402

c = Checker('t01 home / brand / maths scopes')
html = APP.read_text()


def rects(pg, sel):
    return pg.evaluate("(s)=>[...document.querySelectorAll(s)].map(e=>{const r=e.getBoundingClientRect();return {t:e.textContent.trim(),x:r.left,y:r.top,w:r.width,h:r.height,b:r.bottom,r:r.right}})", sel)


def nav_top(pg):
    return pg.evaluate("(()=>{const n=document.querySelector('#wq29-nav');return n?n.getBoundingClientRect().top:innerHeight})()")


def hscroll(pg):
    return pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")


with sync_playwright() as p:
    # ============================================================================================= A. name and static strings
    c.check('A1 manifest and html carry the new name (title tag)', f'<title>{TITLE}</title>' in html, base=True)
    left = [x for x in re.findall(r"""['\"]WordQuest[-_][^'\"]{0,40}""", html) if not x.endswith('.html')]   # the two .html names are old-file redirects, not downloads
    c.check('A2 no download file name still says WordQuest', not left, repr(left[:4]), base=True)
    c.check('A3 the arcade hero and admin sandbox labels say SmartQuest', 'WORDQUEST · LEARN' not in html and 'WORDQUEST V32 · ADMIN' not in html, base=True)

    b, ctx, pg, errs = open_page36(p, 390, 844)
    boot(pg)
    route_to(pg, '#kid')
    c.check('A4 document.title is 學霸星球 SmartQuest Planet', pg.title() == TITLE, pg.title(), base=True)
    brand = pg.evaluate("document.querySelector('.brand')?.textContent.trim()||''")
    c.check('A5 header brand says 學霸星球', '學霸星球' in brand, repr(brand), base=True)
    foot = pg.evaluate("document.querySelector('.footer')?.textContent||''")
    c.check('A6 footer starts with the new name and has no WordQuest', foot.startswith(TITLE) and 'WordQuest' not in foot, repr(foot), base=True)

    # ============================================================================================= B. home tiles (item 1)
    tiles = rects(pg, '#app .p10-tile')
    labels = [re.sub(r'[^一-鿿]', '', t['t']) for t in tiles]
    c.check('B1 four tiles in order 英文 / 數學 / 奧數 / 遊戲', labels == ['英文', '數學', '奧數', '遊戲'], repr(labels), base=True)
    nt = nav_top(pg)
    c.check('B2 every tile is at least 150 x 110 px', bool(tiles) and all(t['w'] >= 150 and t['h'] >= 110 for t in tiles), repr([(round(t['w']), round(t['h'])) for t in tiles]), base=True)
    icon = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('#app .p10-ti')||document.body).fontSize)")
    c.check('B3 the tile picture is at least 52 px', icon >= 52, f'{icon}px', base=True)
    c.check('B4 all four tiles sit fully on the first screen above the bottom bar (390x844)', bool(tiles) and all(t['y'] >= 0 and t['b'] <= nt for t in tiles), f'nav top {nt} tiles {[round(t["b"]) for t in tiles]}')
    c.check('B5 no sideways scrolling on the home page (390)', hscroll(pg) <= 0, str(hscroll(pg)))
    gap = pg.evaluate("(()=>{const t=document.querySelector('#app .p10-tile');const i=t.querySelector('.p10-ti').getBoundingClientRect(),l=t.querySelector('.p10-tn').getBoundingClientRect();return Math.round(l.top-i.bottom)})()")
    c.check('B4b the tile name does not sit on top of the picture (390)', gap >= 0, f'gap {gap}px', base=False)
    pg.screenshot(path=str(SHOT_DIR / 't01_home_390.png'))

    nav = pg.evaluate("[...document.querySelectorAll('#wq29-nav a,#wq29-nav button')].map(e=>e.textContent.trim())")
    c.check('B6 bottom bar has six items 首頁 練習 數學 奧數 遊戲 家長', nav == ['首頁', '練習', '數學', '奧數', '遊戲', '家長'], repr(nav), base=True)
    navw = pg.evaluate("[...document.querySelectorAll('#wq29-nav a,#wq29-nav button')].map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height),r.bottom<=innerHeight+1]})")
    c.check('B7 every bottom-bar item is at least 44 px high and inside the screen', all(h >= 44 and ok for w, h, ok in navw), repr(navw))

    # tile targets
    pg.click('.p10-tile.en')
    pg.wait_for_timeout(600)
    h_en = pg.evaluate('location.hash')
    c.check('B8 the 英文 tile opens the English classroom', 'practice' in h_en or 'classroom' in h_en, h_en)
    route_to(pg, '#kid')
    pg.click('.p10-tile.game')
    pg.wait_for_timeout(700)
    h_g = pg.evaluate('location.hash')
    c.check('B9 the 遊戲 tile opens the arcade', 'game' in h_g, h_g)

    # ============================================================================================= C. maths split (item 11)
    maths_open(pg, 'normal')
    n_nav = maths_nav(pg)
    n_act = maths_actions(pg)
    c.check('C1 數學 shows only the normal-maths tabs (no 奧數 tab)', n_nav == ['數學首頁', '數學群島', '教具工房', '家長與進度'], repr(n_nav), base=True)
    c.check('C2 normal scope shows no olympiad level or mock cards', not any(a.startswith(('olylevel', 'mock:', 'lesson:O-')) for a in n_act), repr([a for a in n_act if 'oly' in a or 'mock' in a][:5]))
    c.check('C3 normal scope offers the daily normal-maths round', 'daily:normal' in n_act, repr(n_act[:12]))
    pg.screenshot(path=str(SHOT_DIR / 't01_maths_normal.png'))
    top = sr(pg, "return root.querySelector('.topbar')?.textContent||''")
    c.check('C4 the maths header names 數學 (not 數學與奧數)', '奧數' not in (top or ''), repr(top))

    pg.evaluate("document.getElementById('wqm-dialog').close()")
    maths_open(pg, 'olympiad')
    o_nav = maths_nav(pg)
    o_act = maths_actions(pg)
    c.check('C5 奧數 shows only the olympiad tabs 思維之塔 / 策略卡 / 家長與進度', o_nav == ['思維之塔', '策略卡', '家長與進度'], repr(o_nav), base=True)
    c.check('C6 olympiad scope has levels and a mock paper, and no normal daily round', any(a.startswith('olylevel') for a in o_act) and 'daily:normal' not in o_act, repr(o_act[:10]), base=True)
    pg.screenshot(path=str(SHOT_DIR / 't01_maths_olympiad.png'))

    # ============================================================================================= D. way home from maths (item 12)
    hb = sr(pg, "const b=root.querySelector('.wq36-home');if(!b)return null;const r=b.getBoundingClientRect();return {t:b.textContent.trim(),h:r.height,w:r.width,top:r.top,vis:r.top>=0&&r.bottom<=innerHeight}")
    c.check('D1 the maths page has a 回首頁 button, at least 44 px high and on screen', bool(hb) and '回首頁' in hb['t'] and hb['h'] >= 44 and hb['vis'], repr(hb), base=True)
    # also inside a lesson
    maths_click_prefix(pg, 'lesson:O-', 700)
    hb2 = sr(pg, "const b=root.querySelector('.wq36-home,.wq36-home-small');if(!b)return null;const r=b.getBoundingClientRect();return {t:b.textContent.trim(),h:r.height,vis:r.top>=0&&r.bottom<=innerHeight&&r.right<=innerWidth}")
    c.check('D2 a 首頁 button is still there inside an olympiad lesson, at least 44 px high and on screen', bool(hb2) and '首頁' in hb2['t'] and hb2['h'] >= 44 and hb2['vis'], repr(hb2), base=True)
    pg.screenshot(path=str(SHOT_DIR / 't01_oly_lesson.png'))
    n_dialogs = len(pg.dialogs)
    sr(pg, "root.querySelector('.wq36-home,.wq36-home-small')?.click()")
    pg.wait_for_timeout(900)
    is_open = pg.evaluate("document.getElementById('wqm-dialog').open")
    c.check('D3 tapping 首頁 in a lesson closes the maths dialog and shows the child home', is_open is False and 'kid' in pg.evaluate('location.hash') and pg.query_selector('.p10-tile.en') is not None, f'open={is_open} hash={pg.evaluate("location.hash")}', base=True)
    c.check('D4 leaving a round half way asked nothing', len(pg.dialogs) == n_dialogs, repr(pg.dialogs[n_dialogs:]), base=True)

    # an unfinished olympiad round does not follow the child into normal maths (item 8 for maths)
    pg.click('.p10-tile.math')
    pg.wait_for_timeout(900)
    resume = sr(pg, "return root.querySelector('.wq36-resume')?.textContent||''")
    n_nav2 = maths_nav(pg)
    c.check('D5 opening normal maths after an unfinished olympiad round goes straight to normal maths, no question', n_nav2 == ['數學首頁', '數學群島', '教具工房', '家長與進度'] and resume == '' and len(pg.dialogs) == n_dialogs, f'nav={n_nav2} resume={resume!r} dialogs={pg.dialogs[n_dialogs:]}', base=True)
    pg.evaluate("document.getElementById('wqm-dialog').close()")

    # bottom bar entries open the right scope
    route_to(pg, '#kid')
    pg.click('#wq29-nav .q36-nav-oly') if pg.query_selector('#wq29-nav .q36-nav-oly') else None
    pg.wait_for_timeout(900)
    nn = maths_nav(pg)
    c.check('D6 bottom-bar 奧數 opens the olympiad pages', nn == ['思維之塔', '策略卡', '家長與進度'], repr(nn), base=True)
    pg.evaluate("document.getElementById('wqm-dialog').close()")
    route_to(pg, '#kid')
    pg.click('#wq29-nav [data-wqm-open]:not(.q36-nav-oly)')
    pg.wait_for_timeout(900)
    nn = maths_nav(pg)
    c.check('D7 bottom-bar 數學 opens the normal-maths pages', nn == ['數學首頁', '數學群島', '教具工房', '家長與進度'], repr(nn), base=True)
    pg.evaluate("document.getElementById('wqm-dialog').close()")
    c.check('D8 no console or page errors in this flow', not errs, repr(errs[:3]))
    b.close()

    # ============================================================================================= E. other screen sizes
    for w, h, name in [(320, 568, 'small'), (844, 390, 'landscape'), (768, 1024, 'tablet')]:
        b, ctx, pg, errs = open_page36(p, w, h, touch=True)
        boot(pg)
        route_to(pg, '#kid')
        tl = rects(pg, '#app .p10-tile')
        c.check(f'E1 {name} {w}x{h}: four tiles, none cut off at the sides, no sideways scroll',
                len(tl) == 4 and all(t['x'] >= -0.5 and t['r'] <= w + 0.5 for t in tl) and hscroll(pg) <= 0, repr([(round(t['x']), round(t['r'])) for t in tl]) + f' scroll={hscroll(pg)}')
        c.check(f'E2 {name}: the tiles are big (width >= 120 and height >= 88)', len(tl) == 4 and all(t['w'] >= 120 and t['h'] >= 88 for t in tl), repr([(round(t['w']), round(t['h'])) for t in tl]), base=True)
        if name == 'small':
            first_tile_visible = tl and tl[0]['b'] <= h
            c.check('E3 small phone: the first row of tiles is on the first screen', bool(first_tile_visible), repr(tl[0]['b']) if tl else '')
        maths_open(pg, 'olympiad')
        hb = sr(pg, "const b=root.querySelector('.wq36-home');if(!b)return null;const r=b.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom,w:innerWidth,h:innerHeight}")
        c.check(f'E4 {name}: the maths 回首頁 button is fully on screen', bool(hb) and hb['l'] >= 0 and hb['r'] <= hb['w'] and hb['t'] >= 0 and hb['b'] <= hb['h'], repr(hb), base=True)
        pg.screenshot(path=str(SHOT_DIR / f't01_maths_{name}.png'))
        b.close()

import sys as _s
_s.exit(c.finish())

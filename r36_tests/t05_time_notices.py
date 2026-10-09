"""R3.6 t05 - item 2 (no time limit on learning) and item 7 (no explanatory / "this is not ..." notices).

    WQ33_APP=/path/to/index.html python3 r36_tests/t05_time_notices.py

Part A  learning is never blocked by time: a tiny limit and hours of recorded use do not stop English lessons, the old school-range
        practice, maths or olympiad; the only cap left is the parent's "play time for games" and it stops games only
Part B  the parent panel has one time field (games) and says learning is unlimited; the shared daily plan card is gone
Part C  the rendered program (kid pages, parent pages, lesson screens, game dialogs, maths) carries none of the removed sentences,
        none of the "not a teacher recording" type of lines, no empty notice boxes, and no old brand / "not reviewed" footers
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib36 import *  # noqa: E402,F401,F403
from wq33 import unlock_parent  # noqa: E402

c = Checker('t05 time limit and notices')
html = APP.read_text()

LIMIT_JS = """(()=>{const id=activeChild().id,n=r3Clone(r3Settings());n.limitMinutes=%d;n.englishMinutes=0;n.mathMinutes=0;n.olympiadMinutes=0;n.usage[id]=n.usage[id]||{};
n.usage[id][F3.day()]={english:%d,math:%d,olympiad:%d,arcade:%d};r3SaveSettings(n);})()"""


def set_usage(pg, limit, english=0, math=0, olympiad=0, arcade=0):
    ev(pg, LIMIT_JS % (limit, english, math, olympiad, arcade))


def usage(pg):
    return json.loads(ev(pg, "JSON.stringify(r3Settings().usage[activeChild().id]?.[F3.day()]||{})"))


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


def alltext(pg):
    """Everything in the page body that a person could open: also the text inside closed <details> and open dialogs."""
    return pg.evaluate("[...document.querySelectorAll('#app, .footer, header, nav, dialog[open]')].map(e=>e.textContent.replace(/\\s+/g,' ')).join('\\n')")


def limit_dialog(pg):
    return pg.evaluate("(()=>{const d=document.getElementById('r3-time-limit');return d&&d.open?d.innerText:null})()")


def empty_boxes(pg):
    return pg.evaluate("""[...document.querySelectorAll('.notice,.small.muted,.muted,.l30-subtle,.l30-note,.l31-help,.wq32-subtle,.wq29-caption,.pc-follow-note')]
        .filter(e=>e.offsetParent&&e.getBoundingClientRect().height>0&&!e.textContent.trim()&&!e.querySelector('img,svg,canvas,button,input')&&!e.getAttribute('role')&&!e.getAttribute('aria-live'))
        .map(e=>e.className+'/'+e.tagName).slice(0,6)""")


def lesson_texts(pg, unit):
    """Text of every screen of one lesson (study cards, 20 questions with feedback, result), all answered right."""
    start(pg, 'lesson', unit)
    out = []
    for _ in range(160):
        info = cur(pg)
        if not info:
            break
        out.append(text(pg))
        if info['fb']:
            pg.click('[data-l30="next"]')
        elif info['mode'] == 'study':
            pg.click('[data-l30="submit"]')
        else:
            if info['mode'] in ('listenChoice', 'listenSpell'):
                hear(pg)
                pg.wait_for_timeout(80)
            answer(pg, True)
            pg.click('[data-l30="submit"]')
        pg.wait_for_timeout(90)
    pg.wait_for_timeout(450)
    out.append(text(pg))
    return out


KID_ROUTES = ['#kid', '#learn', '#game', '#companions', '#assembly', '#classroom', '#practice', '#learning', '#login']
PARENT_ROUTES = ['#parent', '#report', '#offline', '#settings', '#game-settings', '#range-new', '#ranges', '#children']
GENERIC = re.compile(r'不是[^，。！]{0,8}錄音|聲音由裝置|由裝置讀出|裝置語音|不代表|不等於|這不是|沒有教師|未經教師|還沒有教師|不是老師|不是教師|僅供參考|只供參考|尚未經')

with sync_playwright() as p:
    b, ctx, pg, errs = open_page36(p, 390, 844)
    boot(pg)

    # ============================================================================================ A. no time limit on learning
    set_usage(pg, 5, english=3600000, math=3600000, olympiad=3600000, arcade=0)
    u0 = usage(pg)
    c.check('A0 set-up: limit 5 minutes, three hours of English / maths / olympiad already recorded', u0.get('english') == 3600000 and ev(pg, "r3Settings().limitMinutes") == 5, repr(u0))
    can = json.loads(ev(pg, "JSON.stringify({study:WQR3.canStudy(),play:WQR3.canPlay()})"))
    c.check('A1 learning is allowed and games are still allowed (the games clock is at 0)', can == {'study': True, 'play': True}, repr(can), base=True)

    us = units(pg)
    info = start(pg, 'lesson', us[0], settle=700)
    c.check('A2 an English lesson starts although 3 hours were already used', bool(info) and limit_dialog(pg) is None, repr(info)[:80], base=True)
    t0 = usage(pg)
    pg.wait_for_timeout(4500)
    t1 = usage(pg)
    c.check('A3 staying in a lesson adds nothing to the clock and no limit box appears', t1.get('english') == t0.get('english') and limit_dialog(pg) is None, f'{t0} -> {t1}', base=True)
    r = play_lesson(pg, us[1])
    c.check('A4 a whole lesson runs to the result page and pays its coin', bool(r['result']) and r['c1'] == r['c0'] + 1, f"{r['c0']}->{r['c1']} {str(r['result'])[:50]!r}", base=True)
    clear(pg)

    ev(pg, "(()=>{db.session=null;save();})()")
    route_to(pg, '#p/dictation', 700)
    pg.click('[data-act="start-practice"][data-type="mcq"]')
    pg.wait_for_timeout(900)
    c.check('A5 the school-range practice starts (home card)', pg.query_selector('#answer') is not None or pg.query_selector('[data-act="submit-answer"]') is not None, repr(text(pg)[:80]), base=True)
    route_to(pg, '#kid', 500)

    for scope in ('normal', 'olympiad'):
        maths_open(pg, scope)
        mev(pg, "(()=>{save(n=>{n.usage[C.hkDay()]=80000000;n.settings.limit=5;});})()")
        m = maths_play(pg, scope, max_steps=60)
        bad = [x for x in ('今天的數學時間已用完', '先讓眼睛休息', '先休息一下') if x in m['summary']]
        c.check(f'A6.{scope} maths ({scope}) runs a whole lesson with the maths clock over its limit', m['n'] >= 3 and not bad, f"n={m['n']} bad={bad} {m['summary'][:60]!r}", base=True)
        pg.evaluate("(()=>{const d=document.getElementById('wqm-dialog');if(d&&d.open)d.close();})()")
    c.check('A7 the maths app has no break screen to reach any more (no code path sets it)', 'awaitingBreak=true' not in html, '', base=True)
    c.check('A8 the maths parent settings no longer offer a daily time limit', '每天數學使用時限' not in html and 'id="limit"' not in html, '', base=True)

    # the games clock: only games are capped
    set_usage(pg, 5, english=0, math=0, olympiad=0, arcade=5 * 60000)
    ev(pg, "(()=>{const c=a28Child();if(c.run)COIN28.close(c);c.batch.used=0;activeChild().stars=20;save();})()")
    can = json.loads(ev(pg, "JSON.stringify({study:WQR3.canStudy(),play:WQR3.canPlay()})"))
    c.check('A9 with the games clock at its limit: games are blocked, learning is not', can == {'study': True, 'play': False}, repr(can), base=True)
    open_intro(pg, 'sky-rescue')
    w0 = wallet(pg)
    pg.evaluate("document.querySelector('#pg-dialog [data-a28=\"buy\"]')?.click()")
    pg.wait_for_timeout(900)
    w1 = wallet(pg)
    toast = pg.evaluate("[...document.querySelectorAll('.toast,#toast,[role=status]')].map(e=>e.innerText).join(' | ')")
    c.check('A10 pressing the game start button then takes no coin and says the games time is used', w1 == w0 and ('遊戲時間' in toast or limit_dialog(pg) is not None), f'{w0}->{w1} {toast!r}', base=True)
    pg.evaluate("(()=>{const d=document.getElementById('pg-dialog');if(d&&d.open)d.close();})()")
    info = start(pg, 'lesson', us[2], settle=700)
    c.check('A11 and a lesson still starts at that moment', bool(info) and limit_dialog(pg) is None, repr(info)[:60], base=True)
    clear(pg)

    # the limit arrives while a game is running
    set_usage(pg, 5, arcade=5 * 60000 - 1800)
    ev(pg, "(()=>{const c=a28Child();if(c.run)COIN28.close(c);c.batch.used=0;activeChild().stars=20;save();})()")
    open_intro(pg, 'sky-rescue')
    pg.locator('#pg-dialog [data-a28="buy"]').click()
    pg.wait_for_selector('#pg-canvas', timeout=10000)
    pg.locator('[data-a28="play"]').click()
    pg.wait_for_function('__p40.state().playing', timeout=10000)
    pg.wait_for_timeout(500)
    a0 = usage(pg).get('arcade', 0)
    try:
        pg.wait_for_function("(()=>{const d=document.getElementById('r3-time-limit');return d&&d.open})()", timeout=9000)
    except Exception:
        pass
    a1 = usage(pg).get('arcade', 0)
    dlg = limit_dialog(pg)
    c.check('A12 playing a game counts on the games clock', a1 > a0, f'{a0}->{a1}', base=True)
    c.check('A13 when it runs out the box says games time is over, learning goes on, parent can change it',
            bool(dlg) and '今天玩夠了' in dlg and '遊戲時間' in dlg and '去學習' in dlg and '英文、數學和遊戲一起計算' not in dlg, repr(dlg), base=True)
    pg.screenshot(path=str(SHOT_DIR / 't05_limit_box.png'))
    if dlg:
        pg.click('#r3-limit-home')
        pg.wait_for_timeout(700)
    c.check('A14 the button takes the child home', pg.evaluate("location.hash") == '#kid' and limit_dialog(pg) is None, pg.evaluate("location.hash"))
    info = start(pg, 'lesson', us[3], settle=700)
    c.check('A15 and from there a lesson starts', bool(info), repr(info)[:60], base=True)
    clear(pg)

    # ============================================================================================ B. parent panel
    set_usage(pg, 45)
    route_to(pg, '#parent', 800)
    unlock_parent(pg)
    pg.wait_for_timeout(500)
    pg.evaluate("[...document.querySelectorAll('button,a')].find(e=>e.innerText.includes('打開家庭管理'))?.click()")
    pg.wait_for_timeout(1000)
    dtxt = pg.evaluate("document.getElementById('r3-dialog')?.innerText||''")
    c.check('B1 the family panel has one time field: play time for games', '每日玩遊戲的時間上限' in dtxt and '學習沒有時間限制' in dtxt, repr(dtxt[:160]), base=True)
    gone = [x for x in ('英文建議分鐘', '普通數學建議分鐘', '奧數建議分鐘', '每日總時間上限') if x in dtxt]
    c.check('B2 the three per-subject minute fields and the "total time" field are gone', not gone, repr(gone), base=True)
    pg.screenshot(path=str(SHOT_DIR / 't05_parent_panel.png'))
    pg.fill('#r3-limit', '30')
    pg.click('[data-r3="save-plan"]')
    pg.wait_for_timeout(700)
    st = json.loads(ev(pg, "JSON.stringify({l:r3Settings().limitMinutes,e:r3Settings().englishMinutes,m:r3Settings().mathMinutes,o:r3Settings().olympiadMinutes})"))
    c.check('B3 saving stores the games limit (30) and no per-subject minutes', st == {'l': 30, 'e': 0, 'm': 0, 'o': 0}, repr(st), base=True)
    dtxt = pg.evaluate("document.getElementById('r3-dialog')?.innerText||''")
    c.check('B4 the panel reports today\'s games time, not "English, maths and games together"', '今天玩遊戲用了' in dtxt and '英文、數學和遊戲一共用了' not in dtxt, repr(dtxt[-200:]), base=True)
    pg.evaluate("document.getElementById('r3-dialog')?.close()")
    route_to(pg, '#kid', 600)
    t = text(pg)
    c.check('B5 the child home has no shared "today across subjects" plan card', not pg.query_selector('#r3-daily') and '跨科' not in t and '今天的任務' not in t, repr(t[:100]), base=True)

    # ============================================================================================ C. notices
    pages = {}
    for h in KID_ROUTES:
        route_to(pg, h, 800)
        pages[h] = text(pg) + '\n' + alltext(pg)
        e = empty_boxes(pg)
        c.check(f'C1 {h}: no empty notice box left behind', not e, repr(e))
    route_to(pg, '#kid', 500)
    unlock_parent(pg)
    for h in PARENT_ROUTES:
        route_to(pg, h, 800)
        if '家長確認' in text(pg):
            unlock_parent(pg)
            route_to(pg, h, 800)
        pages[h] = text(pg) + '\n' + alltext(pg)
        e = empty_boxes(pg)
        c.check(f'C1 {h}: no empty notice box left behind', not e, repr(e))
    # lesson screens
    lt = lesson_texts(pg, us[4])
    pages['lesson'] = '\n=====\n'.join(lt) + '\n' + alltext(pg)
    c.check('C2 a whole lesson (study cards, 20 questions, feedback, result) was read', len(lt) >= 40, str(len(lt)))
    # game dialog and end card
    ev(pg, "(()=>{const c=a28Child();if(c.run)COIN28.close(c);c.batch.used=0;activeChild().stars=20;save();})()")
    set_usage(pg, 45)
    open_intro(pg, 'drift-path')
    pages['game-intro'] = pg.evaluate("document.querySelector('#pg-dialog').textContent.replace(/\\s+/g,' ')")
    pg.locator('#pg-dialog [data-a28="buy"]').click()
    pg.wait_for_selector('#pg-canvas', timeout=10000)
    pages['game-ready'] = text(pg)
    pg.locator('[data-a28="play"]').click()
    pg.wait_for_function('__p40.state().playing', timeout=10000)
    pg.evaluate("__p40.end('t05')")
    pg.wait_for_function('__p40.state().overlay', timeout=6000)
    pg.wait_for_timeout(700)
    pages['game-end'] = text(pg)
    route_to(pg, '#kid', 400)
    # old practice
    ev(pg, "(()=>{db.session=null;save();})()")
    route_to(pg, '#p/dictation', 600)
    pg.click('[data-act="start-practice"][data-type="mcq"]')
    pg.wait_for_timeout(900)
    pages['old-practice'] = text(pg) + '\n' + alltext(pg)
    # maths
    for scope in ('normal', 'olympiad'):
        maths_open(pg, scope)
        view = []
        view.append(sr(pg, "return root.querySelector('main')?.innerText||''") or '')
        for a in [x for x in dict.fromkeys(maths_actions(pg)) if x.startswith('nav:') and x not in ('nav:profiles',)]:
            maths_click(pg, a, 500)
            view.append(sr(pg, "return root.querySelector('main')?.innerText||''") or '')
        pages['maths-' + scope] = '\n=====\n'.join(view)
        pg.evaluate("(()=>{const d=document.getElementById('wqm-dialog');if(d&&d.open)d.close();})()")
    m = maths_play(pg, 'normal', max_steps=60)
    pages['maths-lesson'] = m['summary']

    drops = sentences_dropped()
    found = {k: [d for d in drops if d in v] for k, v in pages.items()}
    found = {k: v for k, v in found.items() if v}
    c.check(f'C3 none of the {len(drops)} removed sentences shows up on any of the {len(pages)} page groups', not found, repr({k: [x[:20] for x in v] for k, v in found.items()}))
    user_words = ['聲音由裝置讀出', '不是老師錄音', '不是教師錄音', '由裝置讀出', '裝置語音', '裝置英式讀音', '裝置離線英式讀音', '已下載英式音檔', '尚未存成音檔', '未有固定音檔', '自選練習', 'V33', '舊版票券']
    hit = {k: [w for w in user_words if w in v] for k, v in pages.items()}
    hit = {k: v for k, v in hit.items() if v}
    c.check('C4 the sentence from the request (「聲音由裝置讀出，不是老師錄音。」) and its relatives are nowhere', not hit, repr(hit))
    kid_groups = ['#kid', '#learn', '#game', '#companions', '#assembly', '#classroom', '#practice', '#learning', 'lesson', 'game-intro', 'game-ready', 'game-end', 'old-practice', 'maths-lesson']
    gen = {k: sorted(set(GENERIC.findall(pages[k]))) for k in kid_groups if GENERIC.search(pages[k])}
    c.check('C5 kid-facing pages carry no "not a recording / does not mean / not an exam" type of line', not gen, repr(gen))
    foots = {k: re.findall(r'WordQuest[^\n]*|[^\n]*(?:教師逐題審核|AI 編輯)[^\n]*', v) for k, v in pages.items()}
    foots = {k: v for k, v in foots.items() if v}
    c.check('C6 no old brand name and no "not teacher-reviewed" footer on any page', not foots, repr({k: v[:1] for k, v in foots.items()}))
    flat = '\n'.join(pages.values())
    c.check('C7 the program says SmartQuest on its pages (title and footer)', '學霸星球 SmartQuest Planet' in flat and pg.title() == '學霸星球 SmartQuest Planet', pg.title())
    Path('/tmp/r36_t05_pages.json').write_text(json.dumps(pages, ensure_ascii=False, indent=1))
    c.check('C8 no console or page errors', not errs, repr(errs[:3]))
    b.close()

sys.exit(c.finish())

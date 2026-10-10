"""R3.8 t10 - FPS level mode integration: #lv/fps map (8 worlds x 10 English units), unlock rule, words per node, rewards (no double award),
🎯 射擊鞏固 entries (English result screen, classroom unit page), exit/next navigation, guests, Admin, no page scroll at 5 viewports.
WQ37FPS.start is replaced by a spy, so the engine itself is not exercised here (see test_fps.py / t04_games.py)."""
import json
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t10')
SHOTS_B = Path(os.environ.get('WQ_SHOTS_B', str(SHOTS)))
SHOTS_B.mkdir(parents=True, exist_ok=True)
SPY = "(()=>{window.__fps=[];WQ37FPS.start=function(b,o){window.__fps.push(o);return {destroy(){window.__fpsDestroyed=(window.__fpsDestroyed||0)+1;}};};})()"
LAST = "window.__fps[window.__fps.length-1]"


def spy(pg):
    ev(pg, SPY)


def last_words(pg):
    return pg.evaluate(f"({LAST}.words||[]).map(w=>w.en)")


def unit_words(pg, w, s):
    return ev(pg, f"r37EnStage({w},{s}).map(x=>x.en)")


def pass_en(pg, w, s, best=4):
    ev(pg, f"(()=>{{const o=r37Get();o.lv['english:{w}:{s}']={{best:{best},passed:true,at:new Date().toISOString()}};r37Save();}})();render();")


def play_english(pg, correct=True):
    """One English level through real clicks (learn screens, answers); correct=False drains the hearts."""
    pg.click('.r37-node.cur'); pg.wait_for_timeout(300)
    pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(200)
    total = ev(pg, 'r37P.qs.length'); hearts = ev(pg, 'r37P.hearts')
    n = total if correct else hearts
    for _ in range(n):
        if ev(pg, 'r37P.phase') == 'learn':
            pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(200)
        q = ev(pg, 'r37P.qs[r37P.i]')
        if correct:
            if q['mode'] == 'mcq':
                pg.evaluate("(a)=>[...document.querySelectorAll('.r37-opt')].find(b=>b.dataset.v===a).click()", q['answer'])
            else:
                pg.fill('#r37-in', q['answer']); pg.keyboard.press('Enter')
            pg.wait_for_timeout(950)
        else:
            if q['mode'] == 'mcq':
                pg.evaluate("(a)=>[...document.querySelectorAll('.r37-opt')].find(b=>b.dataset.v!==a).click()", q['answer'])
            else:
                pg.fill('#r37-in', 'zzzz'); pg.keyboard.press('Enter')
            pg.wait_for_timeout(250)
            pg.click('[data-r37="next"]'); pg.wait_for_timeout(250)
            if ev(pg, 'r37P.phase') == 'learn':
                pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(200)


def no_scroll(pg):
    return pg.evaluate("document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1")


with sync_playwright() as p:
    # ============================================================ family account, phone
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    register(pg, 'r37fpslv', '小明')
    spy(pg)
    go(pg, '#p/games', 500)
    C.ok(pg.evaluate("!!document.querySelector('a.r37-tile[href=\"#lv/fps\"]')") and not pg.evaluate("!!document.querySelector('a.r37-tile[href=\"#fps\"]')"), 'games hub: 字母獵場 tile opens #lv/fps')
    go(pg, '#lv/fps', 500)
    C.ok(pg.evaluate("document.querySelectorAll('.r37-wtab').length") == 8, 'FPS map: 8 world tabs')
    C.ok(ev(pg, "R37_TRACKS.english.worlds.map(w=>w.name)") and pg.evaluate("document.querySelector('.r37-wtitle h1').textContent") == '萌芽草原', 'FPS map: shows the English world name')
    C.ok(pg.evaluate("document.querySelectorAll('.r37-node').length") == 10 and pg.evaluate("document.querySelectorAll('.r37-node.boss').length") == 1, 'FPS map: 10 nodes per world, node 10 is the boss')
    titles = pg.evaluate("[...document.querySelectorAll('.r37-node .r37-nu')].map(s=>s.textContent)")
    exp = ev(pg, "Array.from({length:10},(_,s)=>LIB30.units.get(r37UnitId(0,s)).title)")
    C.ok(titles == exp and all(titles), f'FPS map: nodes are labelled with the English unit titles {titles[:2]}')
    C.ok(pg.evaluate("document.querySelectorAll('.r37-node.lock').length") == 10 and pg.evaluate("document.querySelectorAll('.r37-wtab:not([disabled])').length") == 0, 'fresh child: every FPS node and world tab is locked')
    C.ok(pg.evaluate("!!document.querySelector('a.r37-fhint[href=\"#lv/english\"]')"), 'locked nodes: hint icon links to #lv/english')
    C.ok(pg.evaluate("!!document.querySelector('a.r37-free[href=\"#fps\"]')"), 'map header has the 🎲 free practice chip')
    C.ok(pg.evaluate("document.querySelector('.r37-node.lock').disabled"), 'locked node is disabled')

    # unlock rule: FPS (0,0) opens when English (0,0) is passed; (0,1) stays locked; no FPS sequence gate
    pass_en(pg, 0, 0); pass_en(pg, 0, 2); go(pg, '#lv/fps', 400)
    st = pg.evaluate("[...document.querySelectorAll('.r37-node')].map(n=>n.classList.contains('lock')?'L':'o').join('')")
    C.ok(st == 'oLoLLLLLLL', f'unlock rule follows the English units passed (0 and 2): {st}')
    C.ok(pg.evaluate("document.querySelectorAll('.r37-node.cur').length") == 1 and pg.evaluate("document.querySelector('.r37-node.cur').dataset.s") == '0', 'exactly one current node: the first open unplayed one')
    C.ok(pg.evaluate("document.querySelectorAll('.r37-wtab:not([disabled])').length") == 1, 'only world 1 tab is open')
    # classroom completion counts as passed (r37Entry cls path)
    ev(pg, "window.__cd=r37ClassDone;r37ClassDone=u=>u==='U04'?{best:3}:null;render()")
    go(pg, '#lv/fps', 300)
    st = pg.evaluate("[...document.querySelectorAll('.r37-node')].map(n=>n.classList.contains('lock')?'L':'o').join('')")
    C.ok(st == 'oLooLLLLLL', f'classroom-completed unit (U04) opens its FPS node: {st}')
    ev(pg, "r37ClassDone=window.__cd;render()")

    # starting a node passes exactly that unit's words to the engine
    pg.click('.r37-node[data-s="0"]'); pg.wait_for_timeout(400)
    C.ok(ev(pg, 'location.hash') == '#fp/play', 'node opens #fp/play')
    o = pg.evaluate(f"(()=>{{const o={LAST};return {{mode:o.mode,boss:o.boss,diff:o.difficulty,title:o.title,n:o.words.length,w0:o.words[0],hasNext:typeof o.onNext,hasFin:typeof o.onFinish,hasExit:typeof o.onExit}}}})()")
    C.ok(last_words(pg) == unit_words(pg, 0, 0) and o['n'] == 8, f'w0s0 passes exactly r37EnStage(0,0) ({o["n"]} words)')
    C.ok(o['mode'] == 'level' and o['boss'] is None and o['diff'] == ev(pg, 'r37Get().diff'), f'level mode, default difficulty = parent setting {o["mode"]}/{o["diff"]}')
    C.ok(set(o['w0']) == {'en', 'zh', 'emoji'} and o['w0']['emoji'], f'words carry en/zh/emoji {o["w0"]}')
    C.ok(exp[0] in (o['title'] or ''), f'title names the unit {o["title"]!r}')
    C.ok(o['hasNext'] == 'undefined', 'no onNext while the next FPS node is locked')
    C.ok(pg.evaluate("!!document.querySelector('#r37-fps-box')") and pg.evaluate("document.body.classList.contains('r37-playing')"), 'play route is the full-screen game box')

    # rewards: first 4 stars -> entry, no coin; first 5 stars -> +1; replay -> 0
    c0 = ev(pg, 'r37Coins()'); f0 = ev(pg, 'r37Get().day.fps')
    r = ev(pg, f"{LAST}.onFinish({{stars:4,passed:true,accuracy:.9}})")
    e = ev(pg, "r37Get().lv['fps:0:0']")
    C.ok(r == 0 and e['best'] == 4 and e['passed'] is True and e['at'], f'first pass with 4 stars saves {{best,passed,at}} and no coin {e} coins={r}')
    C.ok(ev(pg, 'r37Get().day.fps') == f0 + 1, 'FPS finish counts for the daily mission')
    r = ev(pg, f"{LAST}.onFinish({{stars:5,passed:true}})")
    C.ok(r == 1 and ev(pg, 'r37Coins()') == c0 + 1 and ev(pg, "r37Get().lv['fps:0:0'].best") == 5, f'first 5-star pays 1 coin ({c0}->{ev(pg, "r37Coins()")})')
    r = ev(pg, f"{LAST}.onFinish({{stars:5,passed:true}})")
    r2 = ev(pg, f"{LAST}.onFinish({{stars:2,passed:false}})")
    C.ok(r == 0 and r2 == 0 and ev(pg, 'r37Coins()') == c0 + 1, 'replays never pay again')
    C.ok(ev(pg, "r37Get().lv['fps:0:0'].best") == 5 and ev(pg, "r37Get().lv['fps:0:0'].passed") is True, 'a worse replay keeps best and passed')
    C.ok(ev(pg, "JSON.parse(localStorage.getItem(r37Key())).lv['fps:0:0'].best") == 5, 'FPS entry is persisted for the child')
    # fallback: passed undefined -> stars>=3
    ev(pg, "r37FpsPay(0,5,{stars:3})"); ev(pg, "r37FpsPay(0,6,{stars:2})")
    C.ok(ev(pg, "r37Get().lv['fps:0:5'].passed") is True and not ev(pg, "r37Get().lv['fps:0:6'].passed"), 'passed falls back to stars>=3 when the engine omits it')
    # engine does not touch English progress
    C.ok(ev(pg, "r37TrackProgress('english').done") == ev(pg, "[0,1,2,3,4,5,6,7].reduce((a,w)=>a+r37WorldDone('english',w),0)"), 'FPS entries do not count as English progress')

    # exit returns to the FPS map; the map now shows the node as done with 5 stars
    ev(pg, f"{LAST}.onExit()"); pg.wait_for_timeout(400)
    C.ok(ev(pg, 'location.hash') == '#lv/fps' and pg.evaluate("document.querySelector('.r37-node[data-s=\"0\"]').classList.contains('done')"), 'exit returns to #lv/fps; node shows done')
    C.ok(pg.evaluate("document.querySelectorAll('.r37-node[data-s=\"0\"] .r37-st i.on').length") == 5, 'node shows 5 stars')
    C.ok(ev(pg, '__fpsDestroyed') >= 1, 'engine handle destroyed on exit')

    # next: when the following English unit is passed, onNext starts that FPS level
    pass_en(pg, 0, 1); go(pg, '#lv/fps', 300)
    pg.click('.r37-node[data-s="0"]'); pg.wait_for_timeout(300)
    C.ok(ev(pg, f"typeof {LAST}.onNext") == 'function', 'onNext offered when the next unit is open')
    n0 = ev(pg, 'window.__fps.length')
    ev(pg, f"{LAST}.onNext()"); pg.wait_for_timeout(300)
    C.ok(ev(pg, 'window.__fps.length') == n0 + 1 and last_words(pg) == unit_words(pg, 0, 1) and ev(pg, 'location.hash') == '#fp/play', 'onNext starts the next unit (w0s1) with its own 8 words')
    ev(pg, f"{LAST}.onExit()"); pg.wait_for_timeout(300)
    C.ok(ev(pg, 'location.hash') == '#lv/fps', 'exit after next goes to the FPS map')

    # boss node = its own unit's 8 words, boss flag, +2 on first pass only
    pass_en(pg, 0, 9); go(pg, '#lv/fps', 300)
    pg.click('.r37-node.boss'); pg.wait_for_timeout(300)
    o = pg.evaluate(f"({{boss:{LAST}.boss,mode:{LAST}.mode}})")
    C.ok(last_words(pg) == unit_words(pg, 0, 9) and o['boss'] is True and o['mode'] == 'level', f'boss node: its own unit words, boss=true {last_words(pg)[:3]}')
    c0 = ev(pg, 'r37Coins()')
    r = ev(pg, f"{LAST}.onFinish({{stars:3,passed:true}})")
    C.ok(r == 2 and ev(pg, 'r37Coins()') == c0 + 2, f'boss first pass +2 ({c0}->{ev(pg, "r37Coins()")})')
    r = ev(pg, f"{LAST}.onFinish({{stars:3,passed:true}})")
    C.ok(r == 0, 'boss replay pays nothing')
    r = ev(pg, f"{LAST}.onFinish({{stars:5,passed:true}})")
    C.ok(r == 1, 'boss first 5 stars adds the 5-star coin once')
    ev(pg, f"{LAST}.onExit()"); pg.wait_for_timeout(300)
    # failed first try does not pass nor pay
    pass_en(pg, 0, 3); go(pg, '#lv/fps', 300)
    pg.click('.r37-node[data-s="3"]'); pg.wait_for_timeout(300)
    c0 = ev(pg, 'r37Coins()')
    r = ev(pg, f"{LAST}.onFinish({{stars:1,passed:false}})")
    C.ok(r == 0 and not ev(pg, "r37Get().lv['fps:0:3'].passed") and ev(pg, 'r37Coins()') == c0, 'failed attempt: saved best only, not passed, no coin')
    ev(pg, f"{LAST}.onExit()"); pg.wait_for_timeout(300)

    # free practice chip keeps the #fps route working
    pg.click('a.r37-free'); pg.wait_for_timeout(400)
    C.ok(ev(pg, 'location.hash') == '#fps' and ev(pg, f"{LAST}.mode") != 'level' and len(last_words(pg)) >= 4, 'free practice chip starts the learned-words mode on #fps')
    ev(pg, f"{LAST}.onExit()"); pg.wait_for_timeout(300)
    C.ok(ev(pg, 'location.hash') == '#p/games', 'free mode exit still returns to the games planet')
    go(pg, '#fp/play', 400)
    C.ok(ev(pg, 'location.hash') == '#lv/fps' or ev(pg, 'r37FpsSel') is not None, 'direct #fp/play without a selection is not a dead end')
    C.ok(not errs, f'phone: no console errors {errs[:3]}')
    b.close()

    # ============================================================ English result screen -> 🎯 (real play-through)
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    register(pg, 'r37fpslv2', '小明')
    spy(pg)
    go(pg, '#lv/english', 500)
    play_english(pg, correct=False)
    C.ok(pg.evaluate("!!document.querySelector('.r37-result.lose')") and not pg.evaluate("!!document.querySelector('.r37-fpsgo')"), 'failed English level: no 🎯 button')
    pg.click('[data-r37="exit"]'); pg.wait_for_timeout(300)
    play_english(pg, correct=True)
    C.ok(pg.evaluate("!!document.querySelector('.r37-result.win')") and pg.evaluate("!!document.querySelector('.r37-fpsgo[data-w=\"0\"][data-s=\"0\"]')"), 'passed English level: 🎯 射擊鞏固 button for the same unit')
    txt = pg.evaluate("document.querySelector('.r37-fpsgo').textContent")
    C.ok('🎯' in txt and '射擊鞏固' in txt, f'button label {txt!r}')
    C.ok(fits(pg, '.r37-fpsgo') and no_scroll(pg), 'result screen with 🎯 fits the phone')
    pg.screenshot(path=str(SHOTS_B / 'en_result_fps_390x844.png'))
    pg.click('.r37-fpsgo'); pg.wait_for_timeout(400)
    C.ok(ev(pg, 'location.hash') == '#fp/play' and last_words(pg) == unit_words(pg, 0, 0) and ev(pg, f'{LAST}.mode') == 'level', 'result 🎯 launches the FPS level of the same unit')
    ev(pg, f"{LAST}.onExit()"); pg.wait_for_timeout(400)
    C.ok(ev(pg, 'location.hash') == '#lv/english', 'FPS exit from the English result returns to #lv/english')
    # from the FPS map the exit returns to the FPS map
    go(pg, '#lv/fps', 300)
    pg.click('.r37-node.cur'); pg.wait_for_timeout(300)
    ev(pg, f"{LAST}.onExit()"); pg.wait_for_timeout(300)
    C.ok(ev(pg, 'location.hash') == '#lv/fps', 'FPS exit from the FPS map returns to #lv/fps')

    # classroom unit page
    go(pg, '#unit?id=U01', 600)
    C.ok(pg.evaluate("!!document.querySelector('.r37-leg .r37-ufps[data-r37=\"fps-level\"][data-w=\"0\"][data-s=\"0\"]')"), 'unit page of a done unit shows 🎯 射擊鞏固')
    pg.screenshot(path=str(SHOTS_B / 'unit_page_fps_390x844.png'))
    pg.click('.r37-ufps'); pg.wait_for_timeout(400)
    C.ok(ev(pg, 'location.hash') == '#fp/play' and last_words(pg) == unit_words(pg, 0, 0), 'unit page 🎯 launches that unit')
    ev(pg, f"{LAST}.onExit()"); pg.wait_for_timeout(500)
    C.ok(ev(pg, 'location.hash') == '#unit?id=U01', 'FPS exit from the unit page returns to that unit page')
    go(pg, '#unit?id=U02', 600)
    C.ok(not pg.evaluate("!!document.querySelector('.r37-ufps')"), 'unit page of an unfinished unit has no 🎯')
    C.ok(not errs, f'result flow: no console errors {errs[:3]}')
    b.close()

    # ============================================================ Admin: everything open, 80 nodes
    b, ctx, pg, errs = open_page(p, 1440, 900, False)
    html = patched_html()
    pg.route(URL + '?mode=admin-test', lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html))
    pg.goto(URL + '?mode=admin-test'); pg.wait_for_timeout(1500)
    ev(pg, 'loginTestAdmin()'); pg.wait_for_timeout(1500)
    spy(pg)
    go(pg, '#lv/fps', 500)
    C.ok(ev(pg, 'isTestAdmin()') and pg.evaluate("document.querySelectorAll('.r37-wtab:not([disabled])').length") == 8, 'Admin: all 8 world tabs open')
    total, locked, titled, bosses = 0, 0, 0, 0
    for w in range(8):
        pg.click(f'.r37-wtab[data-w="{w}"]'); pg.wait_for_timeout(120)
        total += pg.evaluate("document.querySelectorAll('.r37-node').length")
        locked += pg.evaluate("document.querySelectorAll('.r37-node.lock').length")
        titled += pg.evaluate("[...document.querySelectorAll('.r37-node .r37-nu')].filter(s=>s.textContent.trim()).length")
        bosses += pg.evaluate("document.querySelectorAll('.r37-node.boss').length")
    C.ok(total == 80 and locked == 0 and titled == 80 and bosses == 8, f'Admin: 8 worlds x 10 nodes = {total}, locked {locked}, titled {titled}, bosses {bosses}')
    C.ok(ev(pg, "(()=>{let ok=true;for(let w=0;w<8;w++)for(let s=0;s<10;s++){const a=r37FpsUnitWords(w,s),b=r37EnStage(w,s);if(a.length<8||a.length!==b.length||a.some((x,i)=>x.en!==b[i].en||x.zh!==b[i].zh||!x.emoji))ok=false;}return ok})()"), 'every one of the 80 units hands the engine its whole classroom unit (8 words; the 20 T-units have 12)')
    C.ok(pg.evaluate("!document.querySelector('.r37-fhint')"), 'Admin: no lock hint when nothing is locked')
    # last node: no next
    pg.click('.r37-node.boss'); pg.wait_for_timeout(300)
    C.ok(last_words(pg) == unit_words(pg, 7, 9) and ev(pg, f'typeof {LAST}.onNext') == 'undefined' and ev(pg, f'{LAST}.boss') is True, 'Admin: last boss (w7s9) has its own words and no onNext')
    ev(pg, f"{LAST}.onExit()"); pg.wait_for_timeout(300)
    pg.click('.r37-wtab[data-w="3"]'); pg.wait_for_timeout(150)
    pg.click('.r37-node[data-s="4"]'); pg.wait_for_timeout(300)
    C.ok(last_words(pg) == unit_words(pg, 3, 4) and ev(pg, f'typeof {LAST}.onNext') == 'function', 'Admin: w3s4 plays without any English progress, its own words, onNext available')
    ev(pg, f"{LAST}.onNext()"); pg.wait_for_timeout(300)
    C.ok(last_words(pg) == unit_words(pg, 3, 5), 'Admin: next goes to w3s5')
    # world boundary: w2s9 -> w3s0
    ev(pg, "r37FpsSel={w:2,s:9,from:'#lv/fps'};render()"); pg.wait_for_timeout(300)
    ev(pg, f"{LAST}.onNext()"); pg.wait_for_timeout(300)
    C.ok(last_words(pg) == unit_words(pg, 3, 0), 'next after a boss opens the first unit of the next world')
    C.ok(not errs, f'admin: no console errors {errs[:3]}')
    b.close()

    # ============================================================ guest (not logged in): plays, nothing paid, no errors
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    pg.goto(URL); pg.wait_for_timeout(1200)
    spy(pg)
    C.ok(not ev(pg, 'isLoggedIn()'), 'guest: not logged in')
    pass_en(pg, 0, 0)
    go(pg, '#lv/fps', 400)
    C.ok(pg.evaluate("document.querySelectorAll('.r37-node:not(.lock)').length") == 1, 'guest: map follows the in-session English progress')
    pg.click('.r37-node.cur'); pg.wait_for_timeout(300)
    r = ev(pg, f"{LAST}.onFinish({{stars:5,passed:true}})")
    C.ok(r == 0 and ev(pg, 'r37Coins()') == 0, 'guest: no coins')
    ev(pg, f"{LAST}.onExit()"); pg.wait_for_timeout(300)
    C.ok(pg.evaluate("document.querySelector('.r37-node[data-s=\"0\"]').classList.contains('done')"), 'guest: result still shown on the map in this session')
    C.ok(not errs, f'guest: no console errors {errs[:3]}')
    b.close()

    # ============================================================ layout at the five viewports
    for w, h, name, touch in [(390, 844, 'phone', True), (360, 640, 'small', True), (768, 1024, 'tablet', True), (1440, 900, 'desktop', False), (844, 390, 'landscape', True)]:
        b, ctx, pg, errs = open_page(p, w, h, touch)
        register(pg, 'r37fpslay', '小明')
        for s in (0, 1, 2):
            pass_en(pg, 0, s)
        pass_en(pg, 0, 9)
        ev(pg, "r37Mem._fw=0")
        go(pg, '#lv/fps', 500)
        C.ok(no_scroll(pg), f'{name}: FPS map needs no scroll')
        C.ok(fits(pg, '.r37-node') and fits(pg, '.r37-wtab') and fits(pg, '.r37-wtitle'), f'{name}: map nodes, tabs and title inside the screen')
        C.ok(pg.evaluate("""()=>{const bar=document.querySelector('.r37-bar'),k=document.querySelector('.r37-coin').getBoundingClientRect(),h=document.querySelector('.r37-fhint').getBoundingClientRect();return k.right<=innerWidth+1&&h.right<=k.left+1&&h.width>=30;}"""), f'{name}: top bar (hint icon + coins) not squeezed')
        C.ok(pg.evaluate("""()=>[...document.querySelectorAll('.r37-wtitle .r37-lk,.r37-wtitle .r37-dchip')].every(e=>{const r=e.getBoundingClientRect();return r.right<=innerWidth+1&&r.width>0})"""), f'{name}: header chips inside the width')
        if name in ('phone', 'desktop'):
            pg.screenshot(path=str(SHOTS_B / f'lv_fps_{w}x{h}.png'))
        # English result screen with the 🎯 button (state set directly: the play-through is covered above)
        ev(pg, "(()=>{r37StartLevel('english',0,3);})()"); pg.wait_for_timeout(300)
        ev(pg, "(()=>{r37P.phase='result';r37P.result={stars:5,passed:true,correct:r37P.qs.length,coins:1};render();})()"); pg.wait_for_timeout(300)
        C.ok(pg.evaluate("!!document.querySelector('.r37-fpsgo')") and fits(pg, '.r37-fpsgo') and fits(pg, '.r37-ra button') and no_scroll(pg), f'{name}: result screen with 🎯 fits, no scroll')
        if name in ('phone', 'desktop'):
            pg.screenshot(path=str(SHOTS_B / f'en_result_fps_{w}x{h}.png'))
        go(pg, '#unit?id=U01', 500)
        C.ok(pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1") and pg.evaluate("!!document.querySelector('.r37-ufps')"), f'{name}: unit page 🎯 button present, no horizontal overflow')
        C.ok(not errs, f'{name}: no console errors {errs[:3]}')
        b.close()
C.done()

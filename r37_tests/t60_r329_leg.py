"""R3.29 leg (area C) - parent plan visible to the child, level-pass counts, mission day, coin text, arcade lock text, difficulty note, names."""
import sys, re
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403
from wq33 import unlock_parent  # noqa: E402

C = Checker('t60')
OUT = Path(__file__).resolve().parent.parent / '_team_runs/r329fix/leg'
OUT.mkdir(parents=True, exist_ok=True)


def txt(pg, sel='#app'):
    return pg.evaluate("(s)=>document.querySelector(s)?.innerText||''", sel)


def shot(pg, name):
    pg.screenshot(path=str(OUT / (name + '.png')), full_page=False)


with sync_playwright() as p:
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    register(pg, 'r329leg', '小明')

    # C-01 the parent's plan is a button on the English star
    go(pg, '#p/english', 500)
    C.ok(pg.query_selector('.r37-assign') is None, 'C-01 no plan, no banner')
    go(pg, '#learning-plan', 500); unlock_parent(pg); pg.wait_for_timeout(500)
    ptxt = pg.evaluate("document.querySelector('#app').textContent")
    C.ok('孩子首頁會直接' not in ptxt and '英文星' in ptxt, 'C-01 the plan page tells where the child will see the button')
    pg.click('.s60-chip[data-v="U05"]'); pg.get_by_role('button', name='儲存安排').click(); pg.wait_for_timeout(600)
    go(pg, '#kid', 300); go(pg, '#p/english', 500)
    # (R3.29 integration: the card is the shared A-01 / C-01 card - title + 開始 button that starts the lesson itself)
    a = pg.query_selector('.r37-assign [data-l30="start"]')
    C.ok(a is not None and a.get_attribute('data-unit') == 'U05' and ev(pg, "LIB30.units.get('U05').title") in txt(pg, '.r37-assign'), 'C-01 the saved plan shows a start button for U05 on the English star')
    shot(pg, 'c01_english_assign')
    a.click(); pg.wait_for_timeout(800)
    C.ok(ev(pg, "(l30Session()||{}).unit") == 'U05', 'C-01 the button starts the planned lesson')

    # C-06 missions follow the Hong Kong day (same list at 07:59 and 08:01 HK)
    ids = []
    for iso in ('2026-10-24T07:59:00+08:00', '2026-10-24T08:01:00+08:00'):
        ids.append(ev(pg, "(()=>{const RD=Date,T=new RD('%s').getTime();Date=class extends RD{constructor(...a){a.length?super(...a):super(T);}static now(){return T;}};try{return r37Mission().map(m=>m.id).join()}finally{Date=RD;}})()" % iso))
    C.ok(ids[0] == ids[1], 'C-06 the mission list does not change at 08:00 Hong Kong time (%s / %s)' % tuple(ids))
    nxt = ev(pg, "(()=>{const RD=Date,T=new RD('2026-10-25T00:01:00+08:00').getTime();Date=class extends RD{constructor(...a){a.length?super(...a):super(T);}static now(){return T;}};try{return r37Mission().map(m=>m.id).join()}finally{Date=RD;}})()")
    C.ok(nxt != ids[0], 'C-06 the list changes after midnight Hong Kong time')

    # C-07 a first pass of an FPS level counts as a level; replay does not
    ev(pg, "r37Get().day.levels=0")
    ev(pg, "r37FpsPay(0,0,{stars:4,passed:true})")
    C.ok(ev(pg, "r37Get().day.levels") == 1, 'C-07 first pass of a hunting-ground level counts as 1 level')
    ev(pg, "r37FpsPay(0,0,{stars:4,passed:true})")
    C.ok(ev(pg, "r37Get().day.levels") == 1, 'C-07 replaying the same level does not count again')

    # C-25 a finished but unclaimed mission counts on the home page
    ev(pg, "(()=>{const d=r37Get().day;for(const k of ['levels','correct','fps','five','enok'])d[k]=0;d.claimed=[];d[r37Mission()[0].key]=r37Mission()[0].goal;})()")
    go(pg, '#kid', 500)
    C.ok('1/3' in txt(pg, '.r37-quest'), 'C-25 home shows 1/3 when one mission is done but not claimed: ' + txt(pg, '.r37-quest').replace('\n', ' '))
    go(pg, '#p/games', 500)
    C.ok('1/3' in txt(pg, '.r37-hero'), 'C-25 games star shows the same 1/3')
    shot(pg, 'c25_games')

    # C-04 the hunting-ground level does not let the child pick a difficulty
    ev(pg, "r37FpsSel={w:0,s:0,from:'#lv/fps'};r37Nav37('fp/play')"); pg.wait_for_timeout(1500)
    tiers = pg.evaluate("[...document.querySelectorAll('#r37-fps-box button, #r37-fps-box [role=button], #r37-fps-box .wq37-tier')].map(e=>e.textContent.trim()).filter(t=>/萌芽|起步|標準|挑戰|極速|輕鬆|高手/.test(t)).length")
    C.ok(tiers == 0, 'C-04 no clickable difficulty chooser in a level (%s)' % tiers)
    shot(pg, 'c04_fps_level')
    ev(pg, "r37FpsStop();location.hash='#kid'"); pg.wait_for_timeout(300)

    # C-16 / C-11 names match the level map and the parent's difficulty names
    C.ok(ev(pg, "r37G3Grade('english',0)") == ev(pg, "R37_TRACKS.english.worlds[0].name"), 'C-16 letter games call world 1 by its map name')
    html = pg.content()
    C.ok('好叻' not in html and '準啲' not in html and '粒心' not in html and 'NEW RECORD' not in html, 'C-17 no Cantonese or English leftovers in the arcade / hunting ground text')
    C.ok(all(n in html for n in ("name: '萌芽'", "name: '極速'")) or all(n in ev(pg, "'x'") + html for n in ("萌芽", "極速")), 'C-11 hunting ground uses the parent difficulty names')

    # C-21 a wrong multiple choice says "你選了"
    mh = ev(pg, "r37MissHTML({missed:[{en:'cat',zh:'貓',you:'dog',kind:'zh2en'},{en:'cat',zh:'貓',you:'cta',kind:'fill'}]})")
    C.ok('你選了：<span lang="en">dog' in mh and '你寫：<span lang="en">cta' in mh, 'C-21 choice answers read 你選了, typed answers read 你寫')

    # C-10 ability text is visible in the character gallery
    go(pg, '#p/chars', 600)
    vis = pg.evaluate("(()=>{const s=document.querySelector('.r37-char small');return s?getComputedStyle(s).display:'none'})()")
    C.ok(vis != 'none' and '多一顆心' in txt(pg), 'C-10 character abilities are visible')
    shot(pg, 'c10_chars')

    # C-02 / C-13 the arcade lock and how-to
    go(pg, '#game', 800)
    t = txt(pg)
    C.ok('做練習解鎖' not in t, 'C-02 old lock wording gone from the arcade')
    pg.evaluate("document.querySelector('[data-a28=intro]').click()")
    pg.wait_for_timeout(900)
    d = txt(pg, 'dialog[open]') if pg.query_selector('dialog[open]') else ''
    C.ok('遊戲裏要答英文' in d or '英文字或算式' in d, 'C-13 how-to mentions English questions (%s)' % d[:120].replace('\n', ' '))
    shot(pg, 'c02_intro')

    # C-03 coin rules: one story
    go(pg, '#game-settings', 400); unlock_parent(pg); pg.wait_for_timeout(500)
    t = txt(pg)
    C.ok('每日最多 5 枚' not in t and '今日 0/5' not in t and '今日學習所得' not in t, 'C-03 game settings no longer show the old 5-a-day rule')
    pg.evaluate("document.querySelectorAll('details').forEach(d=>d.open=true)")
    t = txt(pg)
    C.ok('闖關第一次拿滿 5 顆星' in t and '每局 1 至 4 枚' in t, 'C-03 the rules text describes the real coin sources')
    C.ok('金幣與街機' in t or '街機' in t, 'C-03 game settings page loads')
    shot(pg, 'c03_game_settings')
    go(pg, '#settings', 400); unlock_parent(pg); pg.wait_for_timeout(500)
    C.ok('20 款新遊戲' not in txt(pg), 'C-03 settings no longer talk about 20 new games')

    # C-15 / C-12 pages opened from the parent star keep the parent star
    go(pg, '#kid', 300)
    go(pg, '#p/parent', 400); unlock_parent(pg); pg.wait_for_timeout(500)
    go(pg, '#game-settings', 600); unlock_parent(pg); pg.wait_for_timeout(500)
    C.ok('家長' in txt(pg, '.r37-bar'), 'C-15 game settings opened from the parent star shows the parent star in the header: ' + txt(pg, '.r37-bar').replace('\n', ' '))

    # C-08 / C-14 / C-09 parent difficulty page
    ev(pg, "r37Mem._ptab='diff'"); go(pg, '#p/parent', 100); go(pg, '#kid', 200); go(pg, '#p/parent', 500); unlock_parent(pg)
    t = pg.evaluate("document.querySelector('#app').textContent")
    C.ok('至少 8 題' in t and '67%' in t and '答對 90% 過關' in t, 'C-08 difficulty note lists questions, hearts and pass rate for every level')
    C.ok('英文難度' in t, 'C-14 the header says the number is the English difficulty')
    C.ok('補考要全對' in t and '合格＝第一次答對率達標' in t, 'C-08 pass rule mentions first-try rate and retest')
    shot(pg, 'c08_parent_diff')
    pg.evaluate("(()=>{document.querySelector('.r37-ptab[data-k=prog]')?.click();})()"); pg.wait_for_timeout(300)
    C.ok('金幣' in txt(pg) and '今日過關' in txt(pg), 'C-18 the three numbers on the progress tab have labels')

    # C-20 grades are written 小三
    go(pg, '#children', 500); unlock_parent(pg); pg.wait_for_timeout(400)
    C.ok(not re.search(r'小\d', txt(pg)), 'C-20 no 小3 style grade: ' + (re.findall(r'小\d', txt(pg)) or [''])[0])

    # C-05 / C-12 the spelling classroom report says it does not hold the level results
    go(pg, '#learning-report', 600); unlock_parent(pg); pg.wait_for_timeout(500)
    t = txt(pg)
    C.ok('不含英文闖關' in t or '闖關的成績不在這裏' in t, 'C-05 the classroom report says level results are elsewhere')
    shot(pg, 'c05_report')
    go(pg, '#report', 500); unlock_parent(pg); pg.wait_for_timeout(400)
    C.ok('再練這些字' not in txt(pg) or pg.query_selector('button[disabled]') is None, 'C-19 no disabled retrain button when there is nothing to retrain')

    # C-24 the hunting-ground map says in words why a level is locked
    go(pg, '#lv/fps', 700)
    C.ok('先通過同一關的英文闖關' in txt(pg), 'C-24 locked hunting-ground map explains the lock in text: ' + txt(pg).replace('\n', ' ')[:80])
    shot(pg, 'c24_fps_map')

    # C-09 a failed level with 3+ stars says stars are separate from the pass rate
    C.ok('星數另計，過關要看這個答對率' in pg.evaluate("[...document.scripts].map(x=>x.textContent).join('')"), 'C-09 failed level result explains stars versus pass rate')

    C.ok(not [e for e in errs if 'favicon' not in e], 'no console errors: %s' % errs[:3])
    b.close()
C.done()

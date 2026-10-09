"""R3.8: legacy pages live inside the planet shell, classroom and levels share progress, maths dialog themed, effects fire (motion on) and stay off (reduced motion)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *

C = Checker('t08')
PLANET = {'#classroom': 'english', '#library': 'english', '#assembly': 'english', '#practice': 'english', '#ranges': 'dictation', '#report': 'dictation', '#game': 'games'}
with sync_playwright() as p:
    for w, h, name, touch in [(390, 844, 'phone', True), (1440, 900, 'desktop', False)]:
        b, ctx, pg, errs = open_page(p, w, h, touch)
        pg.goto(URL); pg.wait_for_timeout(1200)
        for route, pl in PLANET.items():
            go(pg, route, 500)
            info = pg.evaluate("""()=>{const s=document.querySelector('#app>.r37-leg');if(!s)return null;const b=s.querySelector('.r37-legbody'),n=s.querySelector('.r37-nav').getBoundingClientRect();
              return {pl:s.dataset.pl,body:b.children.length,navBottom:Math.round(n.bottom),vh:innerHeight,scroll:getComputedStyle(b).overflowY,home:[...b.querySelectorAll('a')].some(a=>a.getAttribute('href')==='#kid'&&/返回首頁/.test(a.textContent))}}""")
            C.ok(info and info['pl'] == pl, f'{name} {route}: rendered inside the {pl} planet shell ({info})')
            C.ok(info and info['body'] > 0 and info['scroll'] == 'auto', f'{name} {route}: original content kept in a scrollable planet body')
            C.ok(info and abs(info['navBottom'] - info['vh']) <= 2, f'{name} {route}: planet nav pinned to the bottom')
            C.ok(info and not info['home'], f'{name} {route}: no "返回首頁" link left that leaves the planet')
        go(pg, '#classroom', 500)
        pg.click('.r37-leg .r37-back2'); pg.wait_for_timeout(500)
        C.ok(ev(pg, 'location.hash') == '#p/english', f'{name}: classroom back arrow returns to the English planet')
        go(pg, '#kid', 400)
        C.ok(pg.evaluate("!document.body.classList.contains('r37leg')&&!document.querySelector('.r37-leg')"), f'{name}: planet pages drop the legacy wrapper')
        # maths dialog themed
        go(pg, '#p/math', 500); pg.click('[data-wqm-open="home"]'); pg.wait_for_timeout(1200)
        th = pg.evaluate("(()=>{const r=document.getElementById('wqm-app-host')?.shadowRoot;if(!r)return null;const w=r.querySelector('.wqm'),h=r.querySelector('.wq36-home');return {style:!!r.querySelector('#r38-wqm'),bg:getComputedStyle(w).backgroundImage.includes('gradient'),home:getComputedStyle(h,'::after').content}})()")
        C.ok(th and th['style'] and th['bg'], f'{name}: maths dialog uses the planet space theme {th}')
        C.ok(th and '回星球' in th['home'] or (th and '星球' in th['home']), f'{name}: maths back button says it returns to the planet')
        C.ok(not errs, f'{name}: no runtime errors {errs[:2]}')
        b.close()
    # ---- effects with motion on ----
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    pg.emulate_media(reduced_motion='no-preference'); pg.goto(URL); pg.wait_for_timeout(1200)
    go(pg, '#kid', 600)
    C.ok(ev(pg, 'r37Sky.on'), 'motion on: living starfield runs behind the galaxy')
    pg.click('.r37-planet[data-pl=english]', force=True); pg.wait_for_timeout(120)
    C.ok(pg.evaluate("!!document.querySelector('.r37-planet.warp')") and ev(pg, 'location.hash') == '#kid', 'tapping a planet starts a warp before navigating')
    pg.wait_for_timeout(500)
    C.ok(ev(pg, 'location.hash') == '#p/english', 'warp finishes on the planet hub within ~0.3s')
    go(pg, '#lv/english', 500); pg.click('.r37-node.cur'); pg.wait_for_timeout(300); pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(300)
    b0 = ev(pg, 'r37Fx.st.bursts')
    for i in range(3):
        q = ev(pg, 'r37P.qs[r37P.i]')
        if q['mode'] == 'mcq':
            pg.evaluate("(a)=>[...document.querySelectorAll('.r37-opt')].find(b=>b.dataset.v===a).click()", q['answer'])
        else:
            pg.fill('#r37-in', q['answer']); pg.keyboard.press('Enter')
        pg.wait_for_timeout(950)
        if ev(pg, 'r37P.phase') == 'learn':
            pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(250)
    C.ok(ev(pg, 'r37Fx.st.bursts') - b0 == 3, 'each correct answer bursts once')
    C.ok(ev(pg, 'r37Fx.st.texts') >= 1 and ev(pg, 'r37Streak') == 3, 'three in a row shows the combo text')
    q = ev(pg, 'r37P.qs[r37P.i]')
    if q['mode'] == 'mcq':
        pg.evaluate("(a)=>[...document.querySelectorAll('.r37-opt')].find(b=>b.dataset.v!==a).click()", q['answer'])
    else:
        pg.fill('#r37-in', 'zzzz'); pg.keyboard.press('Enter')
    pg.wait_for_timeout(300)
    C.ok(ev(pg, 'r37Streak') == 0, 'a wrong answer resets the combo')
    c0 = ev(pg, 'r37Fx.st.confetti')
    ev(pg, "r37FxResult({stars:5,passed:true,coins:0})")
    C.ok(ev(pg, 'r37Fx.st.confetti') == c0 + 1, 'five stars throws confetti')
    ev(pg, "r37FxResult({stars:3,passed:true,coins:0})")
    C.ok(ev(pg, 'r37Fx.st.confetti') == c0 + 1, 'fewer than five stars: no confetti')
    C.ok(not errs, f'motion run: no runtime errors {errs[:2]}')
    b.close()
    # ---- reduced motion: nothing animates ----
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    pg.goto(URL); pg.wait_for_timeout(1200); go(pg, '#kid', 500)
    C.ok(not ev(pg, 'r37Sky.on'), 'reduced motion: no starfield animation')
    ev(pg, "r37Fx.burst(100,100);r37Fx.confetti()")
    C.ok(ev(pg, 'r37Fx.count') == 0, 'reduced motion: effects create no particles')
    pg.click('.r37-planet[data-pl=math]'); pg.wait_for_timeout(200)
    C.ok(ev(pg, 'location.hash') == '#p/math', 'reduced motion: planets navigate immediately')
    b.close()
C.done()

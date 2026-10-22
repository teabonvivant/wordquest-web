"""R3.23 t50 - 奧數路線: hub (A1), lesson cards at five sizes (A3), tools by pointer / keyboard / demo (A4), no voice (A8), reduced motion (A9), unlock flow, old progress, wrong book, strategy cards (A10).
Screenshots go to _team_runs/r323-oly/shots/. Run:  WQ33_APP=<app/index.html> python3 r37_tests/t50_oly_path.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t50')
SH = R / '_team_runs/r323-oly/shots'
SH.mkdir(parents=True, exist_ok=True)
SIZES = [(360, 640, 's360', True), (390, 844, 's390', True), (844, 390, 'land', True), (768, 1024, 'tab', True), (1440, 900, 'desk', False)]
DOC_FIT = "(()=>{const d=document.documentElement;return {sw:d.scrollWidth,iw:innerWidth,sh:d.scrollHeight,ih:innerHeight}})()"


def fit_report(pg, root_sel):
    return pg.evaluate("""(sel)=>{const root=document.querySelector(sel);if(!root)return {missing:true};
      const bad=[];for(const e of root.querySelectorAll('button,a,.r80-scene,.r80-sd,.r80-say,.r80-lh,.r80-lf,.r80-g,.r80-cont,.r80-sec,.r80-hd')){const r=e.getBoundingClientRect(),s=getComputedStyle(e);if(s.display==='none'||!r.width)continue;
        if(r.left<-1||r.right>innerWidth+1||r.top<-1||r.bottom>innerHeight+1)bad.push((e.className||e.tagName)+' '+Math.round(r.left)+','+Math.round(r.top)+','+Math.round(r.right)+','+Math.round(r.bottom));}
      const d=document.documentElement,sc=document.querySelector('.r80-scene'),sr=sc&&sc.getBoundingClientRect();
      return {bad:bad.slice(0,5),sw:d.scrollWidth,iw:innerWidth,sh:d.scrollHeight,ih:innerHeight,rootScroll:root.scrollHeight-root.clientHeight,scene:sr?Math.round(sr.width*sr.height)/(innerWidth*innerHeight):null};}""", root_sel)


def sentences(t):
    import re
    return [x for x in re.split(r'[。！？]', t) if x.strip()]


with sync_playwright() as p:
    # ------------------------------------------------------------------ A1 hub, A3 lesson cards (five sizes)
    for (w, h, tag, touch) in SIZES:
        b, ctx, pg, errs = open_page(p, w, h, touch)
        register(pg, 'olyt' + tag, '小明')
        go(pg, '#p/olympiad', 600)
        r = fit_report(pg, '.r80-hub')
        C.ok(not r.get('missing') and not r['bad'] and r['sw'] <= r['iw'] and r['sh'] <= r['ih'] + 1, f'A1 hub fits {tag}: {r}')
        C.ok(pg.evaluate("document.querySelectorAll('.r80-g').length") == 6, f'A1 six grade buttons {tag}')
        C.ok(pg.evaluate("!!document.querySelector('.r80-cont')&&!!document.querySelector('[data-r80=cards]')&&!!document.querySelector('[data-r80=wrong]')"), f'A1 continue / cards / wrong {tag}')
        C.ok(pg.evaluate("!document.querySelector('.r37-tile')&&!document.querySelector('[data-wqm-open],[data-oly-open]')&&!/思維之塔|圖解課堂|選擇題|填充題/.test(document.querySelector('.r80-hub').innerText)"), f'A1 old olympiad entries gone {tag}')
        C.ok(pg.evaluate("[...document.querySelectorAll('.r80-g,.r80-cont,.r80-sec')].every(e=>{const r=e.getBoundingClientRect();return r.height>=44&&r.width>=44})"), f'A1 touch targets >= 44px {tag}')
        pg.screenshot(path=str(SH / f't50_hub_{tag}.png'))
        go(pg, '#oly/2', 500)
        r = fit_report(pg, '.r80-map')
        C.ok(r['sw'] <= r['iw'], f'map has no horizontal overflow {tag}')
        pg.screenshot(path=str(SH / f't50_map_{tag}.png'))
        for (g, n) in [(int(u[1]), int(u[3])) for u in ev(pg, "WQOly.order")]:
            cards = ev(pg, f"WQOly.units['p{g}-{n}'].lesson.length")
            for k in range(1, cards + 1):
                go(pg, f'#oly/{g}/{n}/learn?c={k}', 330)
                r = fit_report(pg, '.r80-les')
                tag2 = f'A3 p{g}-{n} card {k} {tag}'
                C.ok(not r.get('missing'), tag2 + ' rendered')
                if r.get('missing'):
                    continue
                C.ok(not r['bad'], f'{tag2} controls inside viewport {r["bad"]}')
                C.ok(r['sw'] <= r['iw'] and r['sh'] <= r['ih'] + 1 and r['rootScroll'] <= 1, f'{tag2} no scroll {r}')
                C.ok(r['scene'] is not None and r['scene'] >= (0.5 if tag == 's360' else 0.55), f'{tag2} scene >= 55% of the screen (50% on 360x640) ({r["scene"]})')
                txt = pg.evaluate("document.querySelector('.r80-say')?.innerText||''")
                C.ok(len(sentences(txt)) <= 2 or '答對' in txt or '估' in txt or '差一點' in txt or '做到' in txt, f'{tag2} caption <= 2 sentences: {txt}')
                if tag == 's390' and ev(pg, f"WQOly.units['p{g}-{n}'].lesson[{k - 1}].t") == 'do':
                    C.ok(pg.evaluate("!!document.querySelector('#r80-next[disabled]')"), f'{tag2} do card starts locked')
                    pg.click('[data-r80=demo]')
                    for _ in range(40):
                        if not pg.evaluate("!!document.querySelector('#r80-next[disabled]')"):
                            break
                        pg.wait_for_timeout(250)
                    C.ok(not pg.evaluate("!!document.querySelector('#r80-next[disabled]')"), f'{tag2} demo completes the task and unlocks 下一步')
                    pg.screenshot(path=str(SH / f't50_do_p{g}-{n}_c{k}.png'))
                if k in (1, 3, cards) and tag in ('s360', 'land', 'desk'):
                    pg.screenshot(path=str(SH / f't50_les_p{g}-{n}_c{k}_{tag}.png'))
        C.ok(not errs, f'no console errors {tag}: {errs[:2]}')
        b.close()

    # ------------------------------------------------------------------ A4 tools: pointer drag, keyboard, demo
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    register(pg, 'olytool', '小明')
    go(pg, '#oly/4/4/learn?c=3', 500)
    chips = pg.query_selector_all('.r80-scene .r80-chip')
    for i in (0, 1):
        bb = chips[i].bounding_box(); pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.wait_for_timeout(250)
    C.ok(pg.evaluate("/握手 1 次/.test(document.querySelector('.r80-scene').textContent)"), 'A4 dotgraph: tap one person then another draws a handshake')
    go(pg, '#oly/1/2/learn?c=3', 500)
    nxt = "document.getElementById('r80-next')"
    C.ok(pg.evaluate(f"{nxt}.disabled&&!{nxt}.classList.contains('lit')"), 'A4 湊十 do: next is off before the goal')

    def drag_counter(pg_, src_sel_js, dst_xy):
        box = pg_.evaluate(f"(()=>{{const r={src_sel_js}.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}})()")
        pg_.mouse.move(box[0], box[1]); pg_.mouse.down(); pg_.mouse.move(box[0] + 5, box[1] + 5, steps=3); pg_.mouse.move(dst_xy[0], dst_xy[1], steps=8); pg_.mouse.up(); pg_.wait_for_timeout(120)

    # two counters dragged into the empty slots of the left frame (slot 8 and 9)
    for _ in range(2):
        dst = pg.evaluate("""(()=>{const f=document.querySelector('.r80-frame-A').getBoundingClientRect();const cs=[...document.querySelectorAll('.r80-chip')];
          const inA=cs.filter(c=>{const r=c.getBoundingClientRect();return r.top<f.bottom&&r.bottom>f.top});const n=inA.length;const cw=(f.width-12)/5;
          return [f.left+6+(n%5)*cw+cw/2, f.top+6+Math.floor(n/5)*cw+cw/2]})()""")
        drag_counter(pg, "[...document.querySelectorAll('.r80-chip')].sort((a,b)=>b.getBoundingClientRect().top-a.getBoundingClientRect().top)[0]", dst)
    C.ok(ev(pg, "r80L.w.check()") is True, 'A4 湊十: two pointer drags fill the ten-frame')
    C.ok(pg.evaluate(f"!{nxt}.disabled&&{nxt}.classList.contains('lit')"), 'A4 湊十: next lights up after the goal')
    pg.screenshot(path=str(SH / 't50_tenframe_done.png'))
    # keyboard: reset, then Tab-less focus + Enter on two right-frame counters
    pg.click('[data-r80=reset]'); pg.wait_for_timeout(150)
    C.ok(pg.evaluate(f"{nxt}.disabled"), 'A4 reset turns next off again')
    for _ in range(2):
        pg.evaluate("(()=>{const cs=[...document.querySelectorAll('.r80-chip')].sort((a,b)=>b.getBoundingClientRect().top-a.getBoundingClientRect().top);cs[0].focus()})()")
        pg.keyboard.press('Enter'); pg.wait_for_timeout(120)
    C.ok(ev(pg, "r80L.w.check()") is True, 'A4 湊十: keyboard (focus + Enter) completes it')
    pg.click('[data-r80=reset]'); pg.wait_for_timeout(100)
    pg.click('[data-r80=demo]'); pg.wait_for_timeout(300)
    C.ok(ev(pg, "r80L.w.check()") is True and pg.evaluate(f"{nxt}.classList.contains('lit')"), 'A4 湊十: 示範一次 reaches the goal')
    # 雞兔: drag an animal onto the table (below the animals), keyboard, demo
    go(pg, '#oly/4/1/learn?c=4', 500)
    C.ok(pg.evaluate(f"{nxt}.disabled"), 'A4 雞兔 do: next off at the start')
    for i in range(5):
        box = pg.evaluate("(()=>{const e=[...document.querySelectorAll('.r80-chip')].find(c=>c.textContent.includes('🐔'));const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
        tb = pg.evaluate("(()=>{const r=document.querySelector('.r80-wbox').getBoundingClientRect();return [r.left+r.width/2,r.bottom-30]})()")
        pg.mouse.move(*box); pg.mouse.down(); pg.mouse.move(box[0] + 4, box[1] + 4, steps=2); pg.mouse.move(*tb, steps=6); pg.mouse.up(); pg.wait_for_timeout(120)
    C.ok(ev(pg, "r80L.w.check()") is True, 'A4 雞兔: five pointer drags to the table make 26 legs')
    pg.click('[data-r80=reset]'); pg.wait_for_timeout(100)
    for i in range(5):
        pg.evaluate("[...document.querySelectorAll('.r80-chip')].find(c=>c.textContent.includes('🐔')).focus()"); pg.keyboard.press('Enter'); pg.wait_for_timeout(80)
    C.ok(ev(pg, "r80L.w.check()") is True, 'A4 雞兔: keyboard Enter on five animals')
    pg.click('[data-r80=reset]'); pg.click('[data-r80=demo]'); pg.wait_for_timeout(300)
    C.ok(ev(pg, "r80L.w.check()") is True, 'A4 雞兔: 示範一次')
    # a tool that is not a counter: number line + bars + array + pairing + dot graph + cycle + sort via the widget API with keys
    html = """<div id=t style="position:fixed;left:0;top:0;width:360px;height:420px"></div>"""
    pg.evaluate("(h)=>{const d=document.createElement('div');d.id='wlab';d.style.cssText='position:fixed;left:0;top:0;width:360px;height:420px;z-index:99999;background:#141a46';document.body.appendChild(d)}", html)
    labs = {
        'numline': ({'min': 0, 'max': 20, 'start': 8, 'target': 13}, "(()=>{const f=document.querySelector('#wlab .r80-frog');f.focus();return 1})()", ['ArrowRight'] * 5),
        'array': ({'cols': 12, 'rows': 7, 'cut': 10}, "(()=>{document.querySelector('#wlab .r80-handle').focus();return 1})()", ['ArrowLeft', 'ArrowLeft']),
        'bars': ({'rows': [{'label': '乙', 'segs': [{'u': 3, 'c': 'b', 'edit': True, 'target': 5, 'start': 3}]}]}, "(()=>{document.querySelector('#wlab .r80-handle').focus();return 1})()", ['ArrowRight', 'ArrowRight']),
        'cycle': ({'n': 7, 'steps': 3}, "(()=>{document.querySelector('#wlab .r80-tok').focus();return 1})()", ['ArrowRight'] * 3),
        'sortcards': ({'cards': [{'id': 'a', 'label': 'A'}, {'id': 'b', 'label': 'B'}, {'id': 'c', 'label': 'C'}], 'order': ['a', 'b', 'c'], 'start': ['b', 'a', 'c']}, "(()=>{[...document.querySelectorAll('#wlab .r80-chip')].find(e=>e.getAttribute('aria-label').startsWith('A')).focus();return 1})()", ['ArrowLeft']),
    }
    for name, (prm, focus_js, keys_) in labs.items():
        pg.evaluate("([n,p])=>{window.__w=WQOlyWidgets.mount(n,document.getElementById('wlab'),p,{reduced:true})}", [name, prm])
        pg.evaluate(focus_js)
        for k in keys_:
            pg.keyboard.press(k); pg.wait_for_timeout(80)
        C.ok(pg.evaluate("__w.check()") is True, f'A4 {name}: keyboard alone reaches the goal')
        pg.evaluate("__w.reset()")
        C.ok(pg.evaluate("__w.check()") is False, f'A4 {name}: reset clears')
        pg.evaluate("__w.demo()"); pg.wait_for_timeout(250)
        C.ok(pg.evaluate("__w.check()") is True, f'A4 {name}: demo reaches the goal')
    # pointer drag on three more tools
    pg.evaluate("()=>{window.__w=WQOlyWidgets.mount('array',document.getElementById('wlab'),{cols:12,rows:7,cut:10},{reduced:true})}")
    hb = pg.evaluate("(()=>{const r=document.querySelector('#wlab .r80-handle').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
    cell = pg.evaluate("(()=>{const c=document.querySelectorAll('#wlab rect')[0].getBoundingClientRect();return c.width})()")
    pg.mouse.move(*hb); pg.mouse.down(); pg.mouse.move(hb[0] - 3, hb[1], steps=2); pg.mouse.move(hb[0] - 2 * cell, hb[1], steps=6); pg.mouse.up(); pg.wait_for_timeout(100)
    C.ok(pg.evaluate("__w.check()") is True, 'A4 array: pointer drag of the cutter')
    pg.evaluate("()=>{window.__w=WQOlyWidgets.mount('rowplace',document.getElementById('wlab'),{segments:2,span:5},{reduced:true})}")
    for _ in range(3):
        a = pg.evaluate("(()=>{const t=[...document.querySelectorAll('#wlab .r80-chip')].filter(e=>e.getBoundingClientRect().top>250)[0];const r=t.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
        s = pg.evaluate("(()=>{const s=[...document.querySelectorAll('#wlab .r80-slot')].filter(e=>!e.__f);const e=[...document.querySelectorAll('#wlab .r80-slot circle')].find(c=>c.getAttribute('stroke')!=='#3ee6d0');const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
        pg.mouse.move(*a); pg.mouse.down(); pg.mouse.move(a[0], a[1] - 4, steps=2); pg.mouse.move(*s, steps=6); pg.mouse.up(); pg.wait_for_timeout(150)
    C.ok(pg.evaluate("__w.check()") is True, 'A4 rowplace: three pointer drags fill the road')
    pg.evaluate("()=>{window.__w=WQOlyWidgets.mount('pairing',document.getElementById('wlab'),{n:4},{reduced:true})}")
    for (i, j) in [(1, 4), (2, 3)]:
        pos = pg.evaluate(f"[...document.querySelectorAll('#wlab .r80-chip')].filter(e=>e.getAttribute('aria-label')==='{i}'||e.getAttribute('aria-label')==='{j}').map(e=>{{const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}})")
        pg.mouse.move(*pos[0]); pg.mouse.down(); pg.mouse.move(pos[0][0] + 3, pos[0][1], steps=2); pg.mouse.move(*pos[1], steps=5); pg.mouse.up(); pg.wait_for_timeout(120)
    C.ok(pg.evaluate("__w.check()") is True, 'A4 pairing: dragging each number onto its partner')
    pg.evaluate("()=>{window.__w=WQOlyWidgets.mount('dotgraph',document.getElementById('wlab'),{n:3},{reduced:true})}")
    for (i, j) in [(0, 1), (1, 2), (0, 2)]:
        pos = pg.evaluate(f"[...document.querySelectorAll('#wlab .r80-chip')].filter((e,k)=>k==={i}||k==={j}).map(e=>{{const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}})")
        pg.mouse.move(*pos[0]); pg.mouse.down(); pg.mouse.move(pos[0][0] + 6, pos[0][1] + 6, steps=2); pg.mouse.move(*pos[1], steps=5); pg.mouse.up(); pg.wait_for_timeout(100)
    C.ok(pg.evaluate("__w.check()") is True, 'A4 dotgraph: dragging links between the dots')
    pg.evaluate("document.getElementById('wlab').remove()")
    b.close()

    # ------------------------------------------------------------------ A8 no voice, A9 reduced motion
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    pg.add_init_script("window.__spk=0;try{const s=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=u=>{window.__spk++;};}catch(e){}")
    register(pg, 'olyvoice', '小明')
    seen_voice = False
    for hsh in ['#p/olympiad', '#oly/1', '#oly/cards', '#oly/wrong'] + [f'#oly/{g}/{n}/learn?c={k}' for (g, n) in [(1, 2), (4, 1)] for k in (1, 3, 5)]:
        go(pg, hsh, 300)
        if pg.evaluate("!!document.querySelector('[data-r37=speak],[data-r37=qspeak],.r37-spk,button[aria-label*=聽],button[aria-label*=朗讀]')") or '🔊' in pg.evaluate("document.getElementById('app').innerText"):
            seen_voice = True
    C.ok(not seen_voice, 'A8 no speech / listen buttons anywhere in the olympiad screens')
    C.ok(pg.evaluate("window.__spk||0") == 0, 'A8 no speechSynthesis call')
    src = pg.evaluate("[...document.scripts].map(s=>s.textContent).join('')")
    import re
    s80 = re.search(r'R3\.23 s80[\s\S]*?function r80Why', src)
    C.ok(s80 is not None and 'speechSynthesis' not in s80.group(0) and 'SpeechSynthesisUtterance' not in s80.group(0) and 'r37Speak' not in s80.group(0), 'A8 s80 code never touches TTS')
    # A9 reduced motion: demo jumps to the end; transitions <= 300 ms; no animation
    go(pg, '#oly/4/1/learn?c=4', 400)
    ev(pg, "r80L.w.reset()"); ev(pg, "r80L.w.demo()")
    C.ok(ev(pg, "r80L.w.check()") is True, 'A9 reduced motion: demo ends in the final state at once')
    go(pg, '#oly/1', 400)
    C.ok(pg.evaluate("[...document.querySelectorAll('.r80-isle,.r80-nd,.r80-cov,.r80-gtab')].every(e=>getComputedStyle(e).animationName==='none')"), 'A9 reduced motion: no looping animation on the map')
    pg.emulate_media(reduced_motion='no-preference')
    go(pg, '#oly/1', 300)
    go(pg, '#oly/4/1/learn?c=4', 400)
    ev(pg, "r80L.w.reset()"); ev(pg, "(r80L.w.demo(),0)")  # not awaited: the demo plays on
    C.ok(ev(pg, "r80L.w.check()") is False, 'A9 normal motion: demo is animated (not finished instantly)')
    pg.wait_for_timeout(6500)
    C.ok(ev(pg, "r80L.w.check()") is True, 'A9 normal motion: demo finishes')
    long_tr = pg.evaluate("""[...document.querySelectorAll('.r80-les *')].filter(e=>{const s=getComputedStyle(e);return s.transitionDuration.split(',').some(d=>parseFloat(d)>0.3)}).length""")
    C.ok(long_tr == 0, f'A9 UI transitions <= 300ms ({long_tr})')
    C.ok(not errs, f'no console errors: {errs[:2]}')
    b.close()

    # ------------------------------------------------------------------ A10 unlock flow, old progress, wrong book, strategy card
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    register(pg, 'olyflow', '小明')
    # old progress must not count: pretend the profile still has the old 6-world olympiad levels
    ev(pg, "(()=>{const o=r37Get();o.lv['olympiad:0:0']={passed:true,best:5};o.lv['olympiad:3:4']={passed:true,best:3};o.miss.push({t:'olympiad',sk:'gauss',q:'old',a:'1',at:1,w:0,s:0});o.olyV=1;r37Save();})()")
    C.ok(ev(pg, "(()=>{const o=r37Get();return !Object.keys(o.lv).some(k=>k.startsWith('olympiad:'))&&o.olyOld&&o.olyOld.n===2&&!o.miss.some(m=>m.t==='olympiad')})()"), 'A10 old olympiad levels are moved aside (not counted), old olympiad mistakes dropped')
    coins0 = ev(pg, "r37Coins()")
    go(pg, '#oly/1', 500)
    st = pg.evaluate("[...document.querySelectorAll('.r80-isle')].map(e=>[...e.querySelectorAll('.r80-nd')].map(n=>n.disabled?0:1))")
    C.ok(st[0] == [1, 0, 0, 0] and all(x[1:] == [0, 0, 0] for x in st), f'A10 fresh child: only unit 1 lesson is playable (lesson always open) {st}')
    C.ok(st[1][0] == 1, 'A10 lessons are open in every unit')
    # unit 1 level A is locked until the lesson is seen
    C.ok(ev(pg, "r37StageOpen('olympiad',0,0)") is False and ev(pg, "r37StageOpen('olympiad',0,2)") is False, 'A10 A locked before the lesson; unit 2 locked')
    go(pg, '#oly/1/1/learn', 400)
    pg.click('[data-r80=skip]'); pg.wait_for_timeout(500)
    C.ok(ev(pg, "r37P&&r37P.kind==='level'&&r37P.track==='olympiad'&&r37P.s===0"), 'A10 「我懂了，直接闖關」 starts level A of the unit')
    C.ok(ev(pg, "r80Seen('p1-1')") is True and ev(pg, "r37StageOpen('olympiad',0,1)") is False, 'A10 skip marks the lesson seen; B still locked')

    def play_all(correct=True, wrong_val=None):
        for _ in range(80):
            ph = ev(pg, 'r37P.phase')
            if ph in ('learn', 'example'):
                pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(120); continue
            if ph != 'quiz':
                break
            q = ev(pg, 'r37P.qs[r37P.i]')
            ans = q['answer'] if correct else (wrong_val(q) if wrong_val else '99999')
            if q['mode'] == 'mcq':
                pg.evaluate("([a])=>{const b=[...document.querySelectorAll('.r37-opt')].find(x=>x.dataset.v===a)||document.querySelector('.r37-opt');b.click()}", [ans])
            else:
                pg.fill('#r37-in', ans); pg.keyboard.press('Enter')
            pg.wait_for_timeout(900 if correct else 250)
            if not correct and pg.query_selector('[data-r37="next"]'):
                ev(pg, 'r37P.fb&&(r37P.fb.lock=0)'); pg.click('[data-r37="next"]'); pg.wait_for_timeout(150)

    # wrong first, to feed the wrong book and see the 錯因 hint
    def pick_why(q):
        w = ev(pg, 'r37P.qs[r37P.i].mq.why')
        return next(iter(w)) if w else '99999'
    # stage 0 of unit 1 is a drafts' borrowed template (no why); use unit 2 (p1-2 湊十) for the 錯因 test
    go(pg, '#oly/1', 400)
    ev(pg, "r37StartLevel('olympiad',0,0)"); pg.wait_for_timeout(300)
    play_all(True)
    C.ok(ev(pg, 'r37P.result.passed') is True, 'A10 level A (unit 1) passed')
    pg.click('[data-r37="exit"]'); pg.wait_for_timeout(400)
    C.ok(ev(pg, "r37StageOpen('olympiad',0,1)") is True and ev(pg, "r37StageOpen('olympiad',0,2)") is False, 'A10 passing A opens B; the next unit A still needs its lesson')
    C.ok(pg.evaluate("document.querySelectorAll('.r80-isle')[1].querySelector('.r80-nd.learn')&&!document.querySelectorAll('.r80-isle')[1].classList.contains('closed')"), 'A10 passing A opens the next unit (island)')
    # unit 2 (湊十): lesson -> A with a deliberate wrong answer carrying a 錯因
    go(pg, '#oly/1/2/learn', 300); pg.click('[data-r80=skip]'); pg.wait_for_timeout(500)
    C.ok(ev(pg, "r37P&&r37P.s===2"), 'A10 unit 2 level A starts after its lesson')
    ph = ev(pg, 'r37P.phase')
    if ph == 'example':
        pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(150)
    # find a question with a why and answer it with that wrong value
    for _ in range(12):
        q = ev(pg, 'r37P.qs[r37P.i]')
        w = ev(pg, 'r37P.qs[r37P.i].mq.why')
        if w and q['mode'] == 'mcq':
            wk = next(iter(w))
            pg.evaluate("([a])=>[...document.querySelectorAll('.r37-opt')].find(x=>x.dataset.v===a).click()", [wk]); pg.wait_for_timeout(300)
            hint = pg.evaluate("document.querySelector('.r80-whyb')?.innerText||''")
            C.ok(w[wk] in hint and len(hint) > 5, f'A6 wrong answer {wk} shows its 錯因: {hint}')
            pg.screenshot(path=str(SH / 't50_why.png'))
            break
        if q['mode'] == 'mcq':
            pg.evaluate("([a])=>[...document.querySelectorAll('.r37-opt')].find(x=>x.dataset.v===a).click()", [q['answer']])
        else:
            pg.fill('#r37-in', q['answer']); pg.keyboard.press('Enter')
        pg.wait_for_timeout(900)
    else:
        C.ok(False, 'no why-question found in 12 questions')
    # the lesson button on the level screen
    C.ok(pg.evaluate("!!document.querySelector('[data-r37=oly-lesson]')"), 'A10 level screen has a 課 button')
    # finish the level (answer the rest right, the missed one may trigger a retest)
    ev(pg, "r37P.fb&&(r37P.fb.lock=0)")
    if pg.query_selector('[data-r37="next"]'):
        pg.click('[data-r37="next"]'); pg.wait_for_timeout(150)
    play_all(True)
    # the wrong book lists the missed olympiad question and links to the unit's lesson
    go(pg, '#oly/wrong', 400)
    C.ok(pg.evaluate("document.querySelectorAll('.r80-wg li').length")>=1, 'A10 wrong book lists the olympiad mistake')
    C.ok(pg.evaluate("document.querySelector('.r80-wg header').innerText.includes('湊十')"), 'A10 wrong book groups by unit (湊十)')
    pg.screenshot(path=str(SH / 't50_wrong.png'))
    pg.click('[data-r80=wrong-lesson]'); pg.wait_for_timeout(400)
    C.ok(pg.evaluate("location.hash")=='#oly/1/2/learn' and pg.evaluate("!!document.querySelector('.r80-les')"), 'A10 wrong book -> that unit\'s lesson')
    # level B of unit 2 -> strategy card
    go(pg, '#oly/1', 400)
    C.ok(ev(pg, "r37StageOpen('olympiad',0,3)")  is (ev(pg, "r80Passed(1,2,0)")), 'B open exactly when A passed (unit 2)')
    if not ev(pg, "r80Passed(1,2,0)"):
        ev(pg, "r37StartLevel('olympiad',0,2)"); pg.wait_for_timeout(200); play_all(True)
    C.ok(ev(pg, "r80Passed(1,2,0)") is True, 'A10 unit 2 level A passed')
    ev(pg, "r37P=null"); go(pg, '#oly/1', 300)
    ev(pg, "r37StartLevel('olympiad',0,3)"); pg.wait_for_timeout(300); play_all(True)
    C.ok(ev(pg, 'r37P.result.passed') is True and ev(pg, 'r37P.result.card')=='p1-2', 'A10 level B pass awards the strategy card p1-2')
    C.ok(pg.evaluate("!!document.querySelector('.r80-got .r80-card')"), 'A10 result shows the card (flip)')
    pg.screenshot(path=str(SH / 't50_card_result.png'))
    go(pg, '#oly/cards', 400)
    C.ok(pg.evaluate("document.querySelectorAll('.r80-card:not(.lock)').length")==1 and pg.evaluate("document.querySelectorAll('.r80-card.lock').length")==29, 'A10 my cards: one collected, 29 silhouettes')
    pg.screenshot(path=str(SH / 't50_cards.png'))
    go(pg, '#oly/cards?u=p1-2', 400); pg.screenshot(path=str(SH / 't50_card_one.png'))
    # coins kept, difficulty still scales numbers
    C.ok(ev(pg, "r37Coins()") >= coins0, 'A10 coins are kept')
    ev(pg, "r37Get().diffs.olympiad=1")
    lo = ev(pg, "Math.max(...r37MathQuestions('olympiad',3,0,1,77).map(q=>+q.answer))")
    ev(pg, "r37Get().diffs.olympiad=5")
    hi = ev(pg, "Math.max(...[1,2,3,4,5,6].flatMap(s=>r37MathQuestions('olympiad',3,0,5,s+70).map(q=>+q.answer)))")
    C.ok(hi >= lo, f'A10 parent difficulty still changes the question numbers ({lo} -> {hi})')
    # hub continue goes to the next unfinished node
    go(pg, '#p/olympiad', 400)
    C.ok(pg.evaluate("document.querySelector('.r80-cont').innerText.includes('小一')"), 'A10 continue points at the next unit')
    C.ok(not errs, f'no console errors: {errs[:2]}')
    b.close()
C.done()

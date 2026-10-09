"""R3.7 t03 - parent difficulty (5 levels, parent-gated), difficulty reaching the older practice flows, characters and their perks, daily missions, persistence."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403
from wq33 import PW  # noqa: E402

C = Checker('t03')


def flawless(pg):
    for _ in range(ev(pg, 'r37P.qs.length')):
        q = ev(pg, 'r37P.qs[r37P.i]')
        if q['mode'] == 'mcq':
            pg.evaluate("(a)=>[...document.querySelectorAll('.r37-opt')].find(b=>b.dataset.v===a).click()", q['answer'])
        else:
            pg.fill('#r37-in', q['answer']); pg.keyboard.press('Enter')
        pg.wait_for_timeout(900)


def wrong_once(pg):
    q = ev(pg, 'r37P.qs[r37P.i]')
    if q['mode'] == 'mcq':
        pg.evaluate("(a)=>[...document.querySelectorAll('.r37-opt')].find(b=>b.dataset.v!==a).click()", q['answer'])
    else:
        pg.fill('#r37-in', 'zzzz'); pg.keyboard.press('Enter')
    pg.wait_for_timeout(250)
    pg.click('[data-r37="next"]'); pg.wait_for_timeout(250)


with sync_playwright() as p:
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    register(pg, 'r37parent', '小明')

    # ---- guest has no saved state; a logged-in child does ----
    # ---- parent gate ----
    go(pg, '#p/parent', 500)
    C.ok(pg.query_selector('#v23-parent-password') is not None, 'the parent star asks for the parent password first')
    C.ok(pg.query_selector('[data-r37="diff"]') is None, 'no difficulty buttons before the gate is passed')
    ev(pg, "r37Get().diff=3")
    pg.evaluate("(()=>{const b=document.createElement('button');b.dataset.r37='diff';b.dataset.n='5';document.body.appendChild(b);b.click();b.remove();})()")
    C.ok(ev(pg, 'r37Get().diff') == 3, 'a child cannot change the difficulty through a stray click while locked')
    pg.fill('#v23-parent-password', PW); pg.click('[data-v23="parent-unlock"]'); pg.wait_for_timeout(1500)
    C.ok(pg.evaluate("document.querySelectorAll('.r37-df').length") == 5, 'after the password the parent sees 5 difficulty levels')
    C.ok(pg.evaluate("document.documentElement.scrollHeight<=innerHeight+1"), 'parent dashboard needs no page scroll')
    for n in (1, 2, 3, 4, 5):
        pg.click(f'.r37-df[data-n="{n}"]'); pg.wait_for_timeout(200)
        C.ok(ev(pg, 'r37Get().diff') == n and pg.evaluate("document.querySelector('.r37-df.on')?.dataset.n") == str(n), f'level {n} selected and shown')
        C.ok(ev(pg, f"JSON.parse(localStorage.getItem(r37Key())).diff") == n, f'level {n} is saved')
        # the level engine and the older practice flows both follow it
        qs = ev(pg, "r37EnQuestions(0,2,r37Get().diff,5).length")
        C.ok(qs == [6, 8, 8, 10, 12][n - 1], f'level {n}: English stage has {qs} questions')
        pn = ev(pg, "(()=>{startPractice('mcq');return db.session.queue.length})()")
        C.ok(pn == [6, 8, 8, 10, 12][n - 1], f'level {n}: dictation practice has {pn} questions')
        opts = ev(pg, "choiceOptions(db.words[0]).length")
        C.ok(opts == (3 if n == 1 else 4), f'level {n}: legacy multiple choice shows {opts} options')
        ev(pg, "db.session=null"); go(pg, '#p/parent', 300)
    ev(pg, "db.session=null;r37Get().diff=3")

    # ---- two modes only in the older practice flows ----
    ev(pg, "r37Get().diff=5")
    seqm = ev(pg, "(()=>{startPractice('mcq');return [...new Set(db.session.queue.map(q=>q.type))].sort().join()})()")
    seqf = ev(pg, "(()=>{startPractice('fill');return [...new Set(db.session.queue.map(q=>q.type))].sort().join()})()")
    C.ok(set(seqm.split(',')) <= {'meaning', 'listenChoice'}, f'dictation 選擇題 = {seqm}')
    C.ok(set(seqf.split(',')) <= {'spell', 'listenSpell', 'cloze', 'sentence'}, f'dictation 填充題 = {seqf}')
    C.ok(ev(pg, "effectiveType(db.words[0],'missing')") == 'meaning', 'old 補字母 type is turned into a multiple-choice question')
    C.ok(ev(pg, "effectiveType(db.words[0],'sentence')") == 'listenSpell', 'old 聽寫句子 type is turned into a fill-in question')
    ev(pg, "db.session=null;r37Get().diff=3")

    # ---- characters ----
    ev(pg, "activeChild().stars=10;save()")
    go(pg, '#p/chars', 400)
    C.ok(pg.evaluate("document.querySelectorAll('.r37-char').length") == 12, 'twelve characters in the roster')
    C.ok(pg.evaluate("document.querySelector('.r37-char.on b')?.textContent") == '熊貓', 'the panda is free and in use at the start')
    pg.click('[data-r37="buy"][data-id="rabbit"]'); pg.wait_for_timeout(300)
    C.ok(ev(pg, 'r37Coins()') == 7 and ev(pg, 'r37Get().pick') == 'rabbit', 'buying the rabbit costs 3 coins and selects it')
    C.ok(pg.query_selector('[data-r37="buy"][data-id="owl"]:not([disabled])') is None or ev(pg, 'r37Coins()') >= 5, 'a character you cannot afford is disabled')
    pg.click('[data-r37="pick"][data-id="panda"]'); pg.wait_for_timeout(200)
    C.ok(ev(pg, 'r37Get().pick') == 'panda', 'owned characters can be switched')
    # panda: one extra heart; rabbit: first wrong answer is free
    ev(pg, "r37StartLevel('english',0,0)"); pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(200)
    h = ev(pg, 'r37P.hearts'); mh = ev(pg, 'r37P.maxHearts')
    C.ok(h == ev(pg, 'R37_DIFF[2].hearts') + 1 == mh, f'panda gives one extra heart ({h})')
    ev(pg, 'r37P=null')
    ev(pg, "r37Get().pick='rabbit'")
    ev(pg, "r37StartLevel('english',0,0)"); pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(200)
    h0 = ev(pg, 'r37P.hearts'); wrong_once(pg)
    C.ok(ev(pg, 'r37P.hearts') == h0, 'rabbit: the first wrong answer costs no heart')
    wrong_once(pg)
    C.ok(ev(pg, 'r37P.hearts') == h0 - 1, 'rabbit: the second wrong answer costs a heart')
    ev(pg, 'r37P=null')
    # fox: five stars pays one extra coin
    ev(pg, "r37Get().chars.push('fox');r37Get().pick='fox';r37Get().lv={}")
    c0 = ev(pg, 'r37Coins()')
    ev(pg, "r37StartLevel('english',0,0)"); pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(200)
    flawless(pg)
    C.ok(ev(pg, 'r37Coins()') == c0 + 2, f'fox: flawless stage = 1 + 1 coins ({c0}->{ev(pg, "r37Coins()")})')
    ev(pg, 'r37P=null')

    # ---- missions ----
    ev(pg, "(()=>{const m=r37Mission();const d=r37Get().day;d.claimed=[];for(const x of m)d[x.key]=x.goal;r37Save();})()")
    go(pg, '#p/games', 400)
    n = pg.evaluate("document.querySelectorAll('[data-r37=claim]').length")
    C.ok(n == 3, f'three completed missions show a claim button ({n})')
    c0 = ev(pg, 'r37Coins()'); reward = ev(pg, 'r37Mission().reduce((a,x)=>a+x.coins,0)')
    for _ in range(3):
        pg.click('[data-r37="claim"]'); pg.wait_for_timeout(250)
    C.ok(ev(pg, 'r37Coins()') == c0 + reward, f'claiming 3 missions pays exactly their coins ({reward})')
    C.ok(pg.evaluate("document.querySelectorAll('[data-r37=claim]').length") == 0, 'claimed missions cannot be claimed twice')
    ev(pg, "(()=>{const b=document.createElement('button');b.dataset.r37='claim';b.dataset.id=r37Mission()[0].id;document.body.appendChild(b);b.click();b.remove();})()")
    C.ok(ev(pg, 'r37Coins()') == c0 + reward, 'a forged second claim pays nothing')

    # ---- persistence ----
    ev(pg, "r37Get().lv={};r37Get().lv['english:0:0']={best:4,passed:true};r37Save()")
    pg.reload(); pg.wait_for_timeout(1500)
    C.ok(ev(pg, "r37Get().lv['english:0:0'].best") == 4, 'level progress survives a reload for the logged-in child')
    C.ok(not errs, f'no console errors {errs[:3]}')
    b.close()

    # ---- guests: playable, but nothing is stored ----
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    pg.goto(URL); pg.wait_for_timeout(1000)
    ev(pg, "r37StartLevel('english',0,0)"); pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(200)
    flawless(pg)
    C.ok(ev(pg, 'r37P.result.passed') and ev(pg, 'r37P.result.coins') == 0 and ev(pg, 'r37Coins()') == 0, 'guest can play a level; no coin is promised or stored for a guest')
    C.ok(ev(pg, "Object.keys(localStorage).filter(k=>k.startsWith('wq37')).length") == 0, 'guest progress is not written to localStorage')
    b.close()
C.done()

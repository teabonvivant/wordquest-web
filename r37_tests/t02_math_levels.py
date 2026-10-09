"""R3.7 t02 - 數學 and 奧數 level mode: 6 worlds x 10 stages from the generator, difficulty drives the questions, answers are checked, maths dialog still reachable and returns to the planet."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t02')


def play_all(pg, correct=True):
    n = ev(pg, 'r37P.qs.length')
    for _ in range(n):
        if ev(pg, 'r37P.phase') != 'quiz':
            break
        q = ev(pg, 'r37P.qs[r37P.i]')
        if q['mode'] == 'mcq':
            pg.evaluate("([a,ok])=>[...document.querySelectorAll('.r37-opt')].find(b=>ok?b.dataset.v===a:b.dataset.v!==a).click()", [q['answer'], correct])
        else:
            pg.fill('#r37-in', q['answer'] if correct else '99999'); pg.keyboard.press('Enter')
        pg.wait_for_timeout(900 if correct else 300)
        if not correct and ev(pg, 'r37P&&r37P.phase') == 'quiz' and pg.query_selector('[data-r37="next"]'):
            pg.click('[data-r37="next"]'); pg.wait_for_timeout(200)


with sync_playwright() as p:
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    register(pg, 'r37math', '小明')
    for track in ('math', 'olympiad'):
        d = ev(pg, f"""(()=>{{const W=r37TrackWorlds('{track}');const out={{worlds:W.length,names:W.map(w=>w.name)}};
          out.qs=[1,2,3,4,5].map(df=>r37MathQuestions('{track}',2,4,df,9).length);
          out.modes=[...new Set(r37MathQuestions('{track}',1,3,3,5).map(q=>q.mode))].sort().join();
          out.mcqOk=true;for(let w=0;w<6;w++)for(let s=0;s<10;s++)for(const q of r37MathQuestions('{track}',w,s,3,s+1)){{if(q.mode==='mcq'&&!(q.options.length===4&&new Set(q.options).size===4&&q.options.includes(q.answer)))out.mcqOk=false;if(!r37Check(q,q.answer))out.mcqOk=false;}}
          out.same=JSON.stringify(r37MathQuestions('{track}',3,5,3,7))===JSON.stringify(r37MathQuestions('{track}',3,5,3,7));
          out.stage=r37Entry?1:0;return out;}})()""")
        C.ok(d['worlds'] == 6, f'{track}: 6 worlds {d["names"]}')
        C.ok(d['qs'] == [6, 8, 8, 10, 12], f'{track}: question count follows parent difficulty {d["qs"]}')
        C.ok(d['modes'] == 'fill,mcq', f'{track}: exactly the two modes {d["modes"]}')
        C.ok(d['mcqOk'], f'{track}: every MCQ has 4 distinct options with the answer; check() accepts every answer')
        C.ok(d['same'], f'{track}: deterministic for the same seed')
        # stage open order
        go(pg, f'#lv/{track}', 400)
        C.ok(pg.evaluate("document.querySelectorAll('.r37-node:not(.lock)').length") == 1, f'{track}: only stage 1 open at the start')
        pg.click('.r37-node.cur'); pg.wait_for_timeout(300)
        C.ok(ev(pg, 'r37P.phase') == 'quiz', f'{track}: maths levels go straight to questions (no word cards)')
        C.ok(pg.evaluate("!!document.querySelector('.r37-opt, #r37-in')"), f'{track}: question UI visible')
        play_all(pg, True)
        C.ok(ev(pg, 'r37P.result.passed') and ev(pg, 'r37P.result.stars') == 5, f'{track}: all correct = passed with 5 stars')
        pg.click('[data-r37="exit"]'); pg.wait_for_timeout(300)
        C.ok(pg.evaluate("document.querySelectorAll('.r37-node:not(.lock)').length") == 2, f'{track}: pass unlocks the next stage')
        # failing run: wrong answers on a harder stage
        pg.click('.r37-node.cur'); pg.wait_for_timeout(300)
        play_all(pg, False)
        C.ok(ev(pg, 'r37P.phase') == 'result' and ev(pg, 'r37P.result.passed') is False, f'{track}: all wrong fails the stage')
        pg.click('[data-r37="exit"]'); pg.wait_for_timeout(300)
        C.ok(pg.evaluate("document.querySelectorAll('.r37-node:not(.lock)').length") == 2, f'{track}: failed stage does not unlock the next')

    # quizzes use only the two modes and the parent's difficulty
    go(pg, '#p/math')
    pg.click('[data-mode="fill"]'); pg.wait_for_timeout(300)
    C.ok(ev(pg, 'r37P.qs.length>=6&&r37P.qs.every(q=>q.mode==="fill")'), 'maths 填充題 quiz: fill-in only')
    pg.click('[data-r37="exit"]'); pg.wait_for_timeout(200)
    # parent difficulty changes the next quiz length
    ev(pg, 'r37Get().diff=5'); go(pg, '#p/olympiad')
    pg.click('[data-mode="mcq"]'); pg.wait_for_timeout(300)
    C.ok(ev(pg, 'r37P.qs.length>=10&&r37P.qs.every(q=>q.mode==="mcq")'), '奧數 選擇題 quiz at difficulty 5 has >=10 MCQ questions')
    pg.click('[data-r37="exit"]'); pg.wait_for_timeout(200)
    ev(pg, 'r37Get().diff=3')

    # the old maths dialog is still reachable from the planet, and 回首頁 lands on the galaxy
    go(pg, '#p/math')
    pg.click('[data-wqm-open="home"]'); pg.wait_for_timeout(1200)
    C.ok(pg.evaluate("!!document.getElementById('wqm-dialog')?.open||!!document.querySelector('#wqm-dialog[open]')"), 'maths island dialog opens from the 數學星')
    home = pg.evaluate("(()=>{const r=document.getElementById('wqm-app-host')?.shadowRoot;return !!r&&r.querySelectorAll('button').length>3})()")
    C.ok(home, 'maths dialog has content')
    pg.evaluate("(()=>{const d=document.getElementById('wqm-app-host');const root=d.shadowRoot;const b=[...root.querySelectorAll('button')].find(x=>x.textContent.includes('回首頁'));if(b)b.click();})()")
    pg.wait_for_timeout(900)
    C.ok(ev(pg, 'location.hash') == '#kid' and pg.evaluate("!!document.querySelector('.r37-gx')"), '回首頁 from maths lands on the planet home')
    C.ok(not errs, f'no console errors {errs[:3]}')
    b.close()
C.done()

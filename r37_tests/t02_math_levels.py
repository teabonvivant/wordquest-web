"""R3.7 t02 - 數學 and 奧數 level mode: 6 worlds x 10 stages from the generator, difficulty drives the questions, answers are checked, maths dialog still reachable and returns to the planet."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t02')


def play_all(pg, correct=True):
    # R3.18: a first-seen skill opens with an example card, and a wrong answer adds a retest question, so loop until the result page
    for _ in range(60):
        ph = ev(pg, 'r37P.phase')
        if ph in ('learn', 'example'):
            pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(150)
            continue
        if ph != 'quiz':
            break
        q = ev(pg, 'r37P.qs[r37P.i]')
        if q['mode'] == 'mcq':
            pg.evaluate("([a,ok])=>[...document.querySelectorAll('.r37-opt')].find(b=>ok?b.dataset.v===a:b.dataset.v!==a).click()", [q['answer'], correct])
        else:
            pg.fill('#r37-in', q['answer'] if correct else '99999'); pg.keyboard.press('Enter')
        pg.wait_for_timeout(900 if correct else 300)
        if not correct and ev(pg, 'r37P&&r37P.phase') == 'quiz' and pg.query_selector('[data-r37="next"]'):
            ev(pg, 'r37P.fb&&(r37P.fb.lock=0)')
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
        if track == 'olympiad':
            # R3.23: the olympiad map is the 奧數路線 star path (t50 covers the UI); here the shared level engine plays unit 1 level A, then level B fails and keeps the next locked
            ev(pg, "r80Mark('p1-1')")
            ev(pg, "r37StartLevel('olympiad',0,0)"); pg.wait_for_timeout(300)
            C.ok(ev(pg, 'r37P.phase') in ('quiz', 'example'), f'{track}: levels go straight to questions')
            if ev(pg, 'r37P.phase') == 'example':
                pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(200)
            play_all(pg, True)
            C.ok(ev(pg, 'r37P.result.passed') and ev(pg, 'r37P.result.stars') == 5, f'{track}: all correct = passed with 5 stars')
            pg.click('[data-r37="exit"]'); pg.wait_for_timeout(300)
            C.ok(ev(pg, "r37StageOpen('olympiad',0,1)") is True, f'{track}: pass unlocks level B of the unit')
            ev(pg, "r37StartLevel('olympiad',0,1)"); pg.wait_for_timeout(300)
            if ev(pg, 'r37P.phase') == 'example':
                pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(200)
            play_all(pg, False)
            C.ok(ev(pg, 'r37P.phase') == 'result' and ev(pg, 'r37P.result.passed') is False, f'{track}: all wrong fails the stage')
            pg.click('[data-r37="exit"]'); pg.wait_for_timeout(300)
            C.ok(ev(pg, "r37StageOpen('olympiad',0,2)") is False, f'{track}: failed stage does not unlock the next unit')
            continue
        # stage open order
        go(pg, f'#lv/{track}', 400)
        C.ok(pg.evaluate("document.querySelectorAll('.r37-node:not(.lock)').length") == 1, f'{track}: only stage 1 open at the start')
        pg.click('.r37-node.cur'); pg.wait_for_timeout(300)
        C.ok(ev(pg, 'r37P.phase') in ('quiz', 'example'), f'{track}: maths levels go straight to questions (no word cards; first skill may show one example card)')
        if ev(pg, 'r37P.phase') == 'example':
            pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(200)
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
    ev(pg, 'r37Get().diffs.olympiad=5'); go(pg, '#p/olympiad')
    ev(pg, "r37StartQuiz('olympiad','mcq')"); pg.wait_for_timeout(300)  # R3.23: the hub no longer lists the old quiz tiles; the engine still serves them
    C.ok(ev(pg, 'r37P.qs.length>=10&&r37P.qs.every(q=>q.mode==="mcq")'), '奧數 選擇題 quiz at difficulty 5 has >=10 MCQ questions')
    pg.click('[data-r37="exit"]'); pg.wait_for_timeout(200)
    ev(pg, 'r37Get().diffs.olympiad=3')

    # R3.17: 數學星 opens the HK-M4 classroom (course dialog) and keeps 闖關 next to it
    go(pg, '#p/math')
    C.ok(pg.evaluate("!!document.querySelector('a[href=\"#lv/math\"]')"), '數學星 has a 闖關 entry')
    pg.click('[data-wqm-open="normal"]'); pg.wait_for_timeout(1500)
    C.ok(pg.evaluate("!!document.querySelector('dialog#wq-course-dialog[open]')"), 'maths classroom dialog opens from the 數學星')
    C.ok(pg.evaluate("(()=>{const r=document.getElementById('wq-course-host')?.shadowRoot;return !!r&&r.querySelectorAll('button').length>3})()"), 'maths classroom has content')
    pg.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close())")
    C.ok(not errs, f'no console errors {errs[:3]}')
    b.close()
C.done()

"""R3.7 t01 - planet home, hubs, level maps fit the viewport; English level engine rules; level play, stars, unlock, coins, two test modes."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t01')
HUBS = ['p/english', 'p/math', 'p/olympiad', 'p/games', 'p/dictation', 'p/parent']

with sync_playwright() as p:
    # ---- layout: home, every hub, level maps show everything inside the viewport on four device shapes ----
    for w, h, name, touch in VIEWPORTS:
        b, ctx, pg, errs = open_page(p, w, h, touch)
        pg.goto(URL); pg.wait_for_timeout(1200)
        go(pg, '#kid')
        C.ok(pg.evaluate("document.querySelectorAll('.r37-planet').length") == 6, f'{name}: six planets on the home page')
        C.ok(fits(pg, '.r37-planet'), f'{name}: all planets inside the viewport')
        C.ok(fits(pg, '.r37-nav'), f'{name}: bottom navigation inside the viewport')
        C.ok(pg.evaluate("document.documentElement.scrollHeight<=innerHeight+1"), f'{name}: home needs no page scroll')
        pg.screenshot(path=str(SHOTS / f'home_{name}.png'))
        for hub in HUBS + ['lv/english', 'lv/math', 'lv/olympiad']:
            go(pg, '#' + hub)
            sel = '.r37-tile,.r37-wtab,.r37-node,.r37-ptab,.r37-df,.r37-login' if not hub.startswith('p/games') else '.r37-tile'
            C.ok(fits(pg, sel), f'{name}: {hub} controls inside the viewport')
            C.ok(pg.evaluate("document.documentElement.scrollHeight<=innerHeight+1"), f'{name}: {hub} needs no page scroll')
        pg.screenshot(path=str(SHOTS / f'lv_{name}.png'))
        C.ok(not errs, f'{name}: no console errors {errs[:2]}')
        b.close()

    b, ctx, pg, errs = open_page(p, 390, 844, True)
    register(pg, 'r37user', '小明')
    go(pg, '#kid', 600)
    # ---- clicking a planet enters its region ----
    pg.click('[data-pl="english"]'); pg.wait_for_timeout(300)
    C.ok(pg.evaluate("location.hash") == '#p/english', 'planet click opens the English region')
    C.ok(pg.evaluate("!!document.querySelector('[href=\"#lv/english\"]')"), 'English region has a level-mode tile')
    go(pg, '#p/dictation')
    C.ok(not pg.evaluate("!!document.querySelector('[href=\"#lv/dictation\"]')"), 'dictation region has no level mode')
    C.ok(pg.evaluate("document.querySelectorAll('[data-act=\"start-practice\"]').length") == 2, 'dictation region offers exactly 2 test modes')

    # ---- English level data rules ----
    d = ev(pg, """(()=>{const out={};
      out.pool=r37EnPool().length;
      out.bands=[0,1,2,3,4].map(w=>{const s=r37EnPool().slice(r37EnBand(w).a,r37EnBand(w).b);return s.reduce((a,x)=>a+x.sc,0)/s.length;});
      out.stage=r37EnStage(0,0).map(x=>x.en);out.stage2=r37EnStage(0,0).map(x=>x.en);
      out.nw=R37_TRACKS.english.worlds.length;
      out.unitMatch=R37_TRACKS.english.worlds.every((W,w)=>W.units.every((u,s)=>{const a=r37EnStage(w,s).map(x=>x.en).join(),b=LIB30.units.get(u).words.map(k=>LIB30.words.get(k).form).join();return a===b&&a.length>0;}));
      out.allUnits=R37_TRACKS.english.worlds.flatMap(W=>W.units).join()===D30.units.map(u=>u.id).join();
      out.chunks=r37EnChunks(r37EnStage(0,0)).map(c=>c.length);
      out.cover=(()=>{const q=r37EnQuestions(0,0,1,7),st=r37EnStage(0,0).map(x=>x.en);return st.every(e=>q.some(x=>x.word===e))&&q.every((x,i)=>i===0||x.ck>=q[i-1].ck);})();
      out.counts=[1,2,3,4,5].map(df=>r37EnQuestions(0,2,df,7).length);
      out.opts=[1,2,3,4,5].map(df=>r37EnQuestions(0,2,df,7).filter(q=>q.mode==='mcq').map(q=>q.options.length));
      out.modes=[1,2,3,4,5].map(df=>[...new Set(r37EnQuestions(1,3,df,7).map(q=>q.mode))].sort().join());
      out.inopts=[...Array(5).keys()].every(w=>[1,2,3,4,5].every(df=>r37EnQuestions(w,4,df,3).filter(q=>q.mode==='mcq').every(q=>q.options.includes(q.answer)&&new Set(q.options).size===q.options.length)));
      out.again=JSON.stringify(r37EnQuestions(2,5,3,11))===JSON.stringify(r37EnQuestions(2,5,3,11));
      out.diffSeed=JSON.stringify(r37EnQuestions(2,5,3,11))!==JSON.stringify(r37EnQuestions(2,5,3,12));
      const nearAvg=df=>{const qs=r37EnQuestions(2,5,df,5).filter(q=>q.kind==='zh2en');return qs.reduce((n,q)=>n+q.options.filter(o=>o!==q.answer).reduce((m,o)=>m+r37Edit(o,q.answer),0)/(q.options.length-1),0)/Math.max(1,qs.length);};
      out.near=[nearAvg(1),nearAvg(5)];
      out.boss=r37EnQuestions(0,9,3,1).length;
      return out;})()""")
    C.ok(d['pool'] > 3000, f"word pool is large ({d['pool']})")
    C.ok(all(d['bands'][i] < d['bands'][i + 1] for i in range(4)), f"worlds rise in difficulty {d['bands']}")
    C.ok(d['stage'] == d['stage2'] and len(d['stage']) == 8, 'a stage is one classroom unit (8 words), stable between calls')
    C.ok(d['nw'] == 8 and d['allUnits'], 'English worlds cover all 80 classroom units in course order (8 worlds x 10)')
    C.ok(d['unitMatch'], 'every stage uses exactly the words of its classroom unit')
    C.ok(d['chunks'] == [3, 3, 2], f"stage words are learned in 3+3+2 checkpoints {d['chunks']}")
    C.ok(d['cover'], 'every unit word is tested and questions follow checkpoint order')
    C.ok(d['counts'] == [8, 8, 8, 10, 12], f"question count = max(difficulty count, 8 unit words) {d['counts']}")
    C.ok(all(set(x) == {2} for x in d['opts'][:1]) and all(set(x) == {3} for x in d['opts'][1:]) or all(len(set(x)) == 1 for x in d['opts']), 'options per question constant within a level')
    C.ok(d['opts'][0][0] == 3 and d['opts'][2][0] == 4, f"difficulty 1 has 3 options, difficulty 3 has 4 ({d['opts'][0][:1]}, {d['opts'][2][:1]})")
    C.ok(all(m == 'fill,mcq' for m in d['modes']), f"only two test modes appear: {d['modes']}")
    C.ok(d['inopts'], 'every MCQ contains its answer once, no duplicate options')
    C.ok(d['again'] and d['diffSeed'], 'same seed gives same questions, other seed differs')
    C.ok(d['near'][1] < d['near'][0], f"difficulty 5 options are spelled closer to the answer than difficulty 1 {d['near']}")
    C.ok(d['boss'] >= 12, 'boss stage has at least 12 questions')

    # ---- play a level by real clicks: learn screen, then answer everything correctly ----
    go(pg, '#lv/english', 400)
    C.ok(pg.evaluate("document.querySelectorAll('.r37-node:not(.lock)').length") == 1, 'only stage 1 is open at the start')
    pg.click('.r37-node.cur'); pg.wait_for_timeout(300)
    C.ok(pg.evaluate("document.querySelectorAll('.r37-wc').length") == 3, 'learn screen shows the first 3 words of the unit')
    pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(250)
    coins0 = ev(pg, 'r37Coins()')
    total = ev(pg, 'r37P.qs.length')
    learns = 1
    for i in range(total):
        if ev(pg, 'r37P.phase') == 'learn':
            learns += 1; pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(200)
        q = ev(pg, 'r37P.qs[r37P.i]')
        if q['mode'] == 'mcq':
            pg.click(f'.r37-opt:has-text("{q["answer"]}")') if False else pg.evaluate("(a)=>[...document.querySelectorAll('.r37-opt')].find(b=>b.dataset.v===a).click()", q['answer'])
        else:
            pg.fill('#r37-in', q['answer']); pg.keyboard.press('Enter')
        pg.wait_for_timeout(950)
    C.ok(learns == 3, f'the stage shows 3 learning checkpoints ({learns})')
    C.ok(pg.evaluate("!!document.querySelector('.r37-result.win')"), 'all-correct run ends on the win screen')
    res = ev(pg, 'r37P.result')
    C.ok(res['stars'] == 5 and res['passed'], f'all correct without hints = 5 stars, passed {res}')
    C.ok(res['coins'] == 1 and ev(pg, 'r37Coins()') == coins0 + 1, f"5 stars gives exactly 1 coin ({coins0}->{ev(pg, 'r37Coins()')})")
    pg.click('[data-r37="exit"]'); pg.wait_for_timeout(300)
    C.ok(pg.evaluate("document.querySelectorAll('.r37-node:not(.lock)').length") == 2, 'passing stage 1 unlocks stage 2')
    C.ok(ev(pg, "JSON.parse(localStorage.getItem(r37Key())).lv['english:0:0'].best") == 5, 'level result is saved for the child')

    # ---- replay the same stage with 5 stars again: no second coin ----
    pg.click('.r37-node.done'); pg.wait_for_timeout(300); pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(200)
    total = ev(pg, 'r37P.qs.length')
    for i in range(total):
        if ev(pg, 'r37P.phase') == 'learn':
            pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(200)
        q = ev(pg, 'r37P.qs[r37P.i]')
        if q['mode'] == 'mcq':
            pg.evaluate("(a)=>[...document.querySelectorAll('.r37-opt')].find(b=>b.dataset.v===a).click()", q['answer'])
        else:
            pg.fill('#r37-in', q['answer']); pg.keyboard.press('Enter')
        pg.wait_for_timeout(950)
    C.ok(ev(pg, 'r37P.result.coins') == 0, 'repeating a 5-star stage gives no more coins')
    pg.click('[data-r37="exit"]'); pg.wait_for_timeout(200)

    # ---- fail path: wrong answers drain hearts, level fails, next stage stays locked ----
    pg.click('.r37-node:not(.lock):not(.done)'); pg.wait_for_timeout(300); pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(200)
    hearts0 = ev(pg, 'r37P.hearts')
    for i in range(hearts0):
        q = ev(pg, 'r37P.qs[r37P.i]')
        if q['mode'] == 'mcq':
            pg.evaluate("(a)=>[...document.querySelectorAll('.r37-opt')].find(b=>b.dataset.v!==a).click()", q['answer'])
        else:
            pg.fill('#r37-in', 'zzzz'); pg.keyboard.press('Enter')
        pg.wait_for_timeout(250)
        pg.click('[data-r37="next"]'); pg.wait_for_timeout(250)
        if ev(pg, 'r37P.phase') == 'learn':
            pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(200)
    C.ok(pg.evaluate("!!document.querySelector('.r37-result.lose')"), f'losing all {hearts0} hearts ends the level as failed')
    C.ok(ev(pg, 'r37P.result.passed') is False and ev(pg, 'r37P.result.coins') == 0, 'failed level: not passed, no coins')
    pg.click('[data-r37="exit"]'); pg.wait_for_timeout(300)
    C.ok(pg.evaluate("document.querySelectorAll('.r37-node:not(.lock)').length") == 2, 'failing stage 2 does not unlock stage 3')

    # ---- keyboard: digits answer multiple choice, Enter moves on ----
    pg.click('.r37-node:not(.lock):not(.done)'); pg.wait_for_timeout(300); pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
    q = ev(pg, 'r37P.qs[0]')
    if q['mode'] == 'mcq':
        idx = q['options'].index(q['answer']) + 1
        pg.keyboard.press(str(idx)); pg.wait_for_timeout(200)
        C.ok(ev(pg, 'r37P.res[0]') is True, 'keyboard digit picks the matching option')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    C.ok(ev(pg, 'r37P') is None and ev(pg, 'location.hash') == '#lv/english', 'Esc leaves the level without asking')

    # ---- quizzes: exactly the two modes ----
    go(pg, '#p/english')
    pg.click('[data-mode="mcq"]'); pg.wait_for_timeout(300)
    C.ok(ev(pg, 'r37P.qs.every(q=>q.mode==="mcq")') and ev(pg, 'r37P.qs.length') == 8, '選擇題 quiz = only multiple choice, 8 questions at difficulty 3')
    pg.click('[data-r37="exit"]'); pg.wait_for_timeout(200)
    pg.click('[data-mode="fill"]'); pg.wait_for_timeout(300)
    C.ok(ev(pg, 'r37P.qs.every(q=>q.mode==="fill")'), '填充題 quiz = only fill-in')
    pg.click('[data-r37="exit"]'); pg.wait_for_timeout(200)

    # ---- no leftover modes in the lesson quiz or practice ----
    go(pg, '#practice', 400)
    C.ok(pg.evaluate("[...document.querySelectorAll('[data-l30=entry]')].map(c=>c.dataset.mode).join()") == 'study,mcq,fill,review', 'practice page offers study, 選擇題, 填充題, review only')
    qm = ev(pg, "[...new Set(L30.plan(LIB30,{uid:'U01',mode:'lesson',count:8,childId:'c1',sessionId:'s1'}).queue.filter(q=>q.mode!=='study').map(q=>q.mode))].sort().join()")
    C.ok(set(qm.split(',')) <= {'meaning', 'listenChoice', 'spell', 'listenSpell', 'cloze'}, f'lesson quiz mixes only multiple-choice and fill-in question types: {qm}')
    n20 = ev(pg, "L30.plan(LIB30,{uid:'U01',mode:'lesson',count:8,childId:'c1',sessionId:'s1'}).queue.filter(q=>q.mode!=='study').length")
    C.ok(n20 == 20, f'lesson quiz is still 20 questions ({n20})')
    mq = ev(pg, "L30.plan(LIB30,{uid:'U01',mode:'mcq',count:8,childId:'c1',sessionId:'s2'}).queue.map(q=>q.mode)")
    fq = ev(pg, "L30.plan(LIB30,{uid:'U01',mode:'fill',count:8,childId:'c1',sessionId:'s3'}).queue.map(q=>q.mode)")
    C.ok(len(mq) == 8 and set(mq) <= {'meaning', 'listenChoice'}, f'選擇題 drill: 8 questions, choice types only {mq}')
    C.ok(len(fq) == 8 and set(fq) <= {'spell', 'listenSpell', 'cloze'}, f'填充題 drill: 8 questions, fill types only {fq}')
    C.ok(not errs, f'no console errors in the whole run {errs[:3]}')
    miss = ev(pg, "(()=>{const o=[];for(let w=0;w<8;w++)for(let s=0;s<10;s++)for(const x of r37EnStage(w,s))if(!r37Emoji(x.en))o.push(x.en);return o})()")
    C.ok(len(miss) <= 40, f'English level words (80 units x 8) nearly all have a picture, missing {len(miss)}: {miss[:8]}')
    # ---- classroom <-> level sync ----
    ev(pg, "(()=>{const o=r37Get();o.lv['english:0:4']={best:4,passed:true,at:new Date().toISOString()};r37Save();})()")
    C.ok(bool(ev(pg, "l30UnitDone('U05')")), 'a passed level stage marks its classroom unit as learned')
    go(pg, '#unit?id=U01', 500)
    C.ok(pg.evaluate("!!document.querySelector('.r37-leg .r37-ulv[data-r37=level][data-w=\"0\"][data-s=\"0\"]')"), 'classroom unit page has a level-challenge button for the same stage, inside the planet shell')
    C.ok(pg.evaluate("document.querySelector('.r37-leg .r37-back2').getAttribute('href')") == '#classroom', 'unit page back arrow returns to the classroom')
    go(pg, '#classroom', 500)
    C.ok(pg.evaluate("!!document.querySelector('#app>.r37-leg .r37-nav')"), 'classroom renders inside the planet shell with the planet nav')
    b.close()
C.done()

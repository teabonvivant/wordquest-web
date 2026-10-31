"""R3.38 t65 - the sealed arcade and the learning gate of the five kept games, run with the real game libraries in the real host (no legacy test switch)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t65')
GX = 'globalThis.WQ37GX'


def state(pg):
    return ev(pg, 'r38Load()')


def card(pg, sel='.r38-ov'):
    return pg.locator(sel).count() > 0


def right(pg, word):
    pg.locator(f'.r38-opt[data-w="{word}"]').click()
    pg.wait_for_timeout(120)


def timeout_fps(pg):
    pg.evaluate("WQ37FPS._debugStep(3000,1/60)")
    pg.wait_for_timeout(60)


def close_lc(pg):
    pg.evaluate("WQ37FPS._debugStep(150,1/60)")
    pg.locator('[data-lc="go"]').click()
    pg.wait_for_timeout(80)
    pg.evaluate("WQ37FPS._debugStep(2,1/60)")
    pg.wait_for_timeout(60)


def start_gx(pg):
    for _ in range(40):
        btn = pg.locator('.gx-card [data-r="ok"], .gx-card [data-r="go"], .gx-card [data-r="start"]')
        if not btn.count():
            pg.wait_for_timeout(150)
            if not btn.count():
                break
        btn.first.click()
        pg.wait_for_timeout(120)
    pg.wait_for_timeout(3800)


with sync_playwright() as p:
    b, ctx, pg, errs = open_page(p, 390, 844, True, learn=True, legacy=False)
    register(pg, 'r38gate', '小明')
    ev(pg, "(()=>{const o=r37Get();for(let s=0;s<3;s++)o.lv['english:0:'+s]={best:3,passed:true,at:'x'};r37Save();})()")
    coins0 = ev(pg, 'activeChild().stars=7;save();r37Coins()')

    # ---------------------------------------------------------------- seal
    go(pg, '#p/games', 500)
    C.ok(pg.locator('a.r37-tile[href="#game"]').count() == 0, 'seal: no arcade tile on the games planet')
    C.ok(pg.locator('.r37-tiles .r37-tile').count() == 6, 'seal: the five games and 角色 stay')
    for h, to in (('#game', '#p/games'), ('#playground', '#p/games'), ('#arcade', '#p/games'), ('#game-settings', '#p/parent')):
        go(pg, h, 450)
        C.ok(ev(pg, 'location.hash') == to, f'seal: {h} goes to {to}')
    for h in ('#kid', '#p/games', '#p/english', '#classroom', '#learning', '#assembly', '#library', '#companions', '#learn', '#report', '#settings', '#children', '#parent'):
        go(pg, h, 450)
        C.ok('街機' not in pg.evaluate("document.body.innerText"), f'seal: no 街機 text on {h}')
    C.ok(ev(pg, 'r37Coins()') == coins0, 'seal: coins untouched')

    # ---------------------------------------------------------------- mission
    C.ok(ev(pg, "!R37_MISSIONS.some(m=>m.key==='fps')&&R37_MISSIONS.some(m=>m.key==='fix')"), 'mission: 玩 1 局獵場 replaced by 改正錯處')

    # ---------------------------------------------------------------- learn logic
    r = pg.evaluate(f"""()=>{{const G={GX},ev=[];const L=G.Learn({{items:[{{id:'a',en:'cat',zh:'貓'}},{{id:'b',en:'dog',zh:'狗'}},{{id:'c',en:'pig',zh:'豬'}},{{id:'d',en:'hen',zh:'雞'}}],seed:1,onEvent:(k)=>ev.push(k)}});
      const it=id=>L.items.find(x=>x.id===id);L.answer(it('a'),false,0,true);L.answer(it('b'),false,0);L.answer(it('b'),true,0);L.assisted(it('c'));L.answer(it('c'),true,0);L.answer(it('d'),true,0);
      const R=L.result({{}}),by=Object.fromEntries(R.perItem.map(p=>[p.id,p.how]));return {{ev,by,lapses:R.lapses,hints:R.hints,missed:R.missed.map(p=>p.id),fa:R.firstTryCorrect}};}}""")
    C.ok(r['by'] == {'a': 'lapse', 'b': 'wrong', 'c': 'hint', 'd': 'ok'}, f'learn: no answer / wrong / hint / right are told apart: {r["by"]}')
    C.ok(r['ev'] == ['lapse', 'wrong', 'ok', 'fix', 'hint', 'ok', 'ok'], f'learn: events in order: {r["ev"]}')
    C.ok(r['lapses'] == 1 and r['hints'] == 1 and r['missed'] == ['b'] and r['fa'] == 1, f'learn: only an independent first try counts: {r}')
    r = pg.evaluate(f"""()=>{{const G={GX},alt={{q:'2+2',a:'4'}};const L=G.Learn({{items:[{{id:'m',kind:'math',q:'1+1',a:'2',alt}},{{id:'n',kind:'math',q:'3+3',a:'6'}},{{id:'o',kind:'math',q:'5+5',a:'10'}}],gapMin:0,gapMax:0,seed:2}});
      let m=L.take();while(m.id!=='m')m=L.take();const out=L.answer(m,false,0);const q=[];for(let k=0;L.peek(k);k++)q.push(L.peek(k));const back=q.find(x=>x.id==='m');return {{requeued:out.requeued,q:back&&back.q,a:back&&back.a}};}}""")
    C.ok(r == {'requeued': True, 'q': '2+2', 'a': '4'}, f'maths: a miss comes back as another sum: {r}')
    r = ev(pg, "(()=>{const o=r37Get();o.wrong=[];const it={id:'e:cat',en:'cat',zh:'貓'};r37G3Pay('td','english',0,0,{stars:1,passed:false,perItem:[{id:'e:cat',rv:false,en:'cat',zh:'貓',tries:1,firstOk:false,how:'lapse'}]},[it]);const a=o.wrong.length;r37G3Pay('td','english',0,0,{stars:1,passed:false,perItem:[{id:'e:cat',rv:false,en:'cat',zh:'貓',tries:1,firstOk:false,how:'wrong'}]},[it]);return [a,o.wrong.length];})()")
    C.ok(r == [0, 1], f'wrong bank: no answer stays out, a wrong answer goes in: {r}')

    # ---------------------------------------------------------------- FPS: two idle rounds stop the action, one right answer goes on
    go(pg, '#kid', 300)
    ev(pg, 'r37StartFps(0,0)')
    pg.wait_for_timeout(700)
    pg.locator('.wq37-go').first.click()
    pg.wait_for_timeout(300)
    timeout_fps(pg)
    C.ok(pg.locator('[data-lc="go"]').count() == 1 and not card(pg), 'fps: first idle round shows the learning card, no gate yet')
    pg.evaluate("WQ37FPS._debugStep(1800,1/60)")
    pg.wait_for_timeout(60)
    C.ok(pg.locator('[data-lc="go"]').count() == 1, 'fps: a wrong-answer card does not close by itself after 30 s')
    close_lc(pg)
    C.ok(ev(pg, 'r37Get().day.lapse') == 1, f"fps: one no-answer recorded: {ev(pg, 'r37Get().day.lapse')}")
    timeout_fps(pg)
    close_lc(pg)
    C.ok(card(pg) and state(pg)['idle'] == 2, f'fps: second idle round opens the gate: {state(pg)}')
    rnd = pg.evaluate('WQ37FPS._debug.round')
    pg.evaluate("WQ37FPS._debugStep(2000,1/60)")
    C.ok(pg.evaluate('WQ37FPS._debug.round') == rnd and card(pg), 'fps: the action stays stopped behind the gate, no clock runs')
    cw = pg.evaluate("[...document.querySelectorAll('.r38-opt')].map(b=>b.dataset.w)")
    target = ev(pg, "(()=>{const z=document.querySelector('.r38-q').textContent.replace(/[^\\u4e00-\\u9fff]/g,'');return (r37EnStage(0,0).find(x=>z&&x.zh.replace(/[^\\u4e00-\\u9fff]/g,'')===z)||{}).en;})()")
    C.ok(target in cw, f'fps: gate asks the word that was missed with three choices: {target} {cw}')
    wrong_w = [x for x in cw if x != target][0]
    pg.locator(f'.r38-opt[data-w="{wrong_w}"]').click()
    C.ok(card(pg), 'fps: a wrong choice keeps the gate open')
    right(pg, target)
    pg.evaluate("WQ37FPS._debugStep(2,1/60)")
    pg.wait_for_timeout(100)
    C.ok(not card(pg) and pg.evaluate('WQ37FPS._debug.round') == rnd + 1 and state(pg)['idle'] == 1, f'fps: right answer resumes with the next round; one more idle round asks again: {state(pg)}')
    C.ok(ev(pg, 'r37Get().day.gate') == 1, 'fps: the gate is counted for the parent')
    go(pg, '#kid', 300)

    # ---------------------------------------------------------------- runner: gates passed without steering stop the run; a right answer goes on
    ev(pg, "(()=>{const s=r38Load();s.idle=0;r38Save(s);})()")
    ev(pg, "r37RunSel={w:0,s:0};location.hash='#rn/play'")
    pg.wait_for_timeout(900)
    pg.locator('.wq37r-b').first.click()
    pg.wait_for_timeout(200)
    pg.evaluate("WQ37Run._debugGod(true)")
    hit = pg.evaluate("""()=>{for(let n=0;n<40;n++){WQ37Run._debugAdvanceToGate(30);WQ37Run._debugStep(200,false);if(document.querySelector('[data-lc="go"]'))WQ37Run._debugLearnSkip();WQ37Run._debugStep(2,false);if(document.querySelector('.r38-ov'))return n+1;}return 0;}""")
    C.ok(hit > 0 and card(pg), f'runner: unsteered gates open the gate: after {hit}')
    d0 = pg.evaluate('WQ37Run._debug.dist')
    pg.evaluate("WQ37Run._debugStep(300,false)")
    C.ok(pg.evaluate('WQ37Run._debug.dist') == d0, 'runner: the run stops behind the gate')
    pg.screenshot(path=str(SHOTS / 't65_gate_runner_phone.png'))
    go(pg, '#kid', 300)

    # ---------------------------------------------------------------- tower: a monster reaching the base with nothing typed
    ev(pg, "(()=>{const s=r38Load();s.idle=0;r38Save(s);})()")
    ev(pg, "r37G3Start('td','english',0,0)")
    pg.wait_for_timeout(900)
    start_gx(pg)
    pg.evaluate("WQ37TD._step(400)")
    l0 = ev(pg, 'r37Get().day.lapse')
    def td_idle():
        pg.evaluate("WQ37TD._cmd('spawn');WQ37TD._step(30);WQ37TD._cmd('timeout');WQ37TD._step(30)")
        pg.wait_for_timeout(2100)
        if pg.locator('.gx-learn [data-r="ok"]').count():
            pg.locator('.gx-learn [data-r="ok"]').click()
        pg.wait_for_timeout(120)
    td_idle()
    C.ok(ev(pg, 'r37Get().day.lapse') == l0 + 1 and not card(pg), 'tower: first monster at the base is one no-answer, no gate')
    td_idle()
    C.ok(card(pg), 'tower: second one opens the gate')
    pg.screenshot(path=str(SHOTS / 't65_gate_td_phone.png'))
    go(pg, '#kid', 300)

    # ---------------------------------------------------------------- maze: two rounds with no input ask a question instead of ending the game
    ev(pg, "(()=>{const s=r38Load();s.idle=0;s.runs=0;r38Save(s);})()")
    ev(pg, "r37G3Start('mz','english',0,0)")
    pg.wait_for_timeout(900)
    start_gx(pg)
    pg.wait_for_timeout(300)
    pg.evaluate("WQ37Maze._step(300)")
    for _ in range(14):
        pg.evaluate("(()=>{try{WQ37Maze._cmd('timeout');}catch(e){}WQ37Maze._step(10);})()")
        pg.wait_for_timeout(900)
        pg.evaluate("WQ37Maze._step(60)")
        if card(pg):
            break
    C.ok(card(pg) and not pg.evaluate("!!(WQ37Maze._debug&&WQ37Maze._debug.ended)"), f'maze: second silent round opens the gate, the game is not ended: {state(pg)}')
    go(pg, '#kid', 300)

    # ---------------------------------------------------------------- three empty runs: warm-up, a replay or reload does not clear it
    ev(pg, "(()=>{const s=r38Load();s.runs=0;s.got=0;s.idle=0;r38Save(s);})()")
    for i in range(3):
        ev(pg, "r37G3Start('cd','english',0,0)")
        pg.wait_for_timeout(600)
        C.ok(not card(pg), f'runs: start {i + 1} plays at once')
        go(pg, '#p/games', 300)
    C.ok(state(pg)['runs'] == 3, f'runs: three empty starts counted: {state(pg)}')
    pg.reload()
    pg.wait_for_timeout(1500)
    C.ok(state(pg)['runs'] == 3, 'runs: a reload does not clear the count')
    ev(pg, "r37G3Start('cd','english',0,0)")
    pg.wait_for_timeout(600)
    C.ok(card(pg) and pg.locator('.r38-n').inner_text() == '還有 3 題', 'runs: the fourth start asks for a warm-up')
    C.ok(pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"), 'warm-up: no sideways scroll on a phone')
    pg.screenshot(path=str(SHOTS / 't65_warm_phone.png'))
    for i in range(3):
        word = ev(pg, "(()=>{const z=document.querySelector('.r38-q').textContent.replace(/[^\\u4e00-\\u9fff]/g,'');const all=[...document.querySelectorAll('.r38-opt')].map(b=>b.dataset.w);const w=r37GameWords(0,400);return all.find(a=>(R37_TRACKS.english.worlds.flatMap((_,i)=>r37EnWorldPool(i)).find(x=>x.en===a)||{}).zh?.replace(/[^\\u4e00-\\u9fff]/g,'')===z)||all[0];})()")
        for w in [word] + pg.evaluate("[...document.querySelectorAll('.r38-opt')].map(b=>b.dataset.w)"):
            if pg.locator(f'.r38-opt[data-w="{w}"]').count() and not pg.locator(f'.r38-opt[data-w="{w}"]').is_disabled():
                n0 = pg.locator('.r38-n').count() and pg.locator('.r38-n').inner_text()
                pg.locator(f'.r38-opt[data-w="{w}"]').click()
                pg.wait_for_timeout(120)
                if not card(pg) or (pg.locator('.r38-n').count() and pg.locator('.r38-n').inner_text() != n0):
                    break
    C.ok(not card(pg) and state(pg)['runs'] == 1, f'runs: three right answers open the game and start a fresh count: {state(pg)}')
    pg.wait_for_timeout(300)
    C.ok(ev(pg, 'typeof r37G3Handle') == 'object' and ev(pg, '!!r37G3Handle'), 'runs: the game really starts after the warm-up')
    go(pg, '#p/games', 300)
    ev(pg, "(()=>{const s=r38Load();s.runs=3;s.got=2;r38Save(s);r38Ev('ok');})()")
    C.ok(state(pg)['runs'] == 0, 'runs: a run with three answers clears the count')
    ev(pg, "(()=>{const s=r38Load();s.runs=3;s.d='2000-01-01';r38Save(s);})()")
    C.ok(state(pg)['runs'] == 0, 'runs: a new Hong Kong day starts clean')

    # ---------------------------------------------------------------- parent view
    ev(pg, "(()=>{const d=r37Get().day;d.ans=12;d.lapse=3;d.hint=1;d.fix=2;d.gate=1;})()")
    ev(pg, "r37Mem._ptab='prog'")
    t = ev(pg, 'r37ParentHub()')
    C.ok('遊戲作答' in t and '沒作答' in t and '改正 2 處' in t, 'parent: today shows game answers and no-answers')
    C.ok(not errs, f'no page errors: {errs[:3]}')
    b.close()

    # ---------------------------------------------------------------- the unseal switch still reaches the arcade
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    register(pg, 'r38open', '小明')
    go(pg, '#p/games', 400)
    C.ok(pg.locator('a.r37-tile[href="#game"]').count() == 1, 'unseal: with the switch the arcade tile and route are back')
    b.close()
C.done()

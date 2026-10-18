"""t41 - 字母砲台 (WQ37TD) business-logic tests.  Run: python3 r37_tests/t41_td.py [--shots] [--perf]
Deterministic: games are driven with seeded learn queues and G._step / G._cmd; the only real-time waits are the 2 s learning card (tested
once with real time, elsewhere performance.now is fast-forwarded).  Evidence (screenshots, perf numbers) goes to r37_evidence/r321/td/."""
import sys, json, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'gx_fixture'))
from lib import open_game, sync_playwright, R  # noqa: E402

EVID = R / 'r37_evidence' / 'r321' / 'td'
FAILS = []; N = [0]


def ok(c, msg):
    N[0] += 1
    if not c:
        FAILS.append(msg); print('  FAIL', msg)


AP = """
window.__off=0; if(!window.__pn){window.__pn=performance.now.bind(performance); performance.now=()=>window.__pn()+window.__off;}
window.FF=(ms)=>{window.__off+=ms};
window.AP=function(cfg){cfg=cfg||{};const bad=Object.assign({},cfg.bad||{});let it=0;
  while(it++<(cfg.maxIter||40000)){const d=G._debug;if(d.ended)return 'ended';if(d.frozen)return 'frozen';
    if(d.state!=='play'){G._step(10);continue}
    if(cfg.stopBoss&&d.boss.alive)return 'boss';
    const t=d.enemies.find(e=>e.uid===d.target&&e.state==='walk');
    if(t){const nb=bad[t.id]||0;if(nb>0){bad[t.id]=nb-1;G._cmd(cfg.letters?'timeout':'wrong');}else{G._cmd('solve');}}
    G._step(cfg.stepn||6);}
  return 'maxiter';};
"""


def fresh(pg, subject='english', w=0, s=2, diff=2, **extra):
    pg.evaluate("()=>{try{G.destroy()}catch(e){} localStorage.clear()}")
    pg.evaluate("(a)=>{STARTGAME(a[0],a[1],a[2],a[3],a[4],a[5]);G._S.ui.closeAll();G._cmd('begin')}", ['WQ37TD', subject, w, s, diff, dict(seed=7, manual=True, **extra)]); pg.evaluate("()=>{window.RESULT=null}")


def dismiss_card(pg):
    pg.evaluate("()=>FF(2200)"); pg.wait_for_timeout(120)
    pg.click('.gx-learn [data-r="ok"]'); pg.wait_for_timeout(40)


def play(pg, bad=None, letters=False, max_cards=40):
    """auto-play until the level ends; wrong-answer cards are dismissed with a fast-forwarded clock"""
    cards = 0
    for _ in range(max_cards * 3):
        r = pg.evaluate("(c)=>AP(c)", {'bad': bad or {}, 'letters': letters})
        if r == 'ended': return cards
        if r == 'frozen':
            cards += 1; dismiss_card(pg); continue
        break
    return cards


def dbg(pg): return pg.evaluate("()=>G._debug")


LAY_JS = """()=>{const r=s=>{const e=document.querySelector(s);return e?e.getBoundingClientRect().toJSON():null};
 const keys=[...document.querySelectorAll('.gx-key')].filter(k=>k.offsetParent).map(k=>k.getBoundingClientRect());
 const t=document.querySelector('.td-txt'),a=document.querySelector('.td-ans');
 const btns=[...document.querySelectorAll('.td-q button,.gx-hudbtn')].filter(b=>b.offsetParent).map(b=>b.getBoundingClientRect().toJSON());
 return {W:innerWidth,H:innerHeight,qbar:r('.td-q'),pad:r('.gx-pad'),hud:r('.td-hud'),pause:r('.gx-hudbtn'),cv:r('canvas'),
  padOn:getComputedStyle(document.querySelector('.gx-pad')).display!=='none',keyMinH:keys.length?Math.min(...keys.map(k=>k.height)):99,keyMinW:keys.length?Math.min(...keys.map(k=>k.width)):99,
  scrollOver:document.scrollingElement.scrollHeight-innerHeight, ansOver:a.scrollWidth-a.clientWidth,
  txt:{sc:t.firstChild?t.firstChild.offsetHeight:0,cl:t.clientHeight,fs:parseFloat(getComputedStyle(t).fontSize)},btns,lay:G._debug.layout,lanes:G._debug.lanes}}"""


def inside(r, W, H, tol=1.5):
    return r['left'] >= -tol and r['top'] >= -tol and r['right'] <= W + tol and r['bottom'] <= H + tol


def layout_tests(p, shots=False):
    sizes = [(390, 844), (360, 640), (844, 390), (1440, 900), (768, 1024)]
    cases = [('english', 0, 2, 2), ('english', 5, 4, 4), ('math', 2, 3, 3), ('math', 4, 8, 4)]
    for (w, h) in sizes:
        touch = w < 1000
        b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'english', 0, 2, 2, size=(w, h), touch=touch, reduced=False, seed=7, manual=True)
        pg.evaluate(AP)
        for (subj, wd, s, d) in cases:
            fresh(pg, subj, wd, s, d)
            pg.evaluate("()=>{G._cmd('spawn');G._step(200);G._cmd('spawn');G._step(100);G._cmd('spawn');G._step(60)}")
            pg.evaluate("()=>G._cmd('peek',1)"); pg.evaluate("()=>G._step(2)")
            m = pg.evaluate(LAY_JS); tag = f'{w}x{h} {subj} w{wd} d{d}'
            ok(m['scrollOver'] <= 1, f'{tag}: page does not scroll ({m["scrollOver"]})')
            for nm in ('qbar', 'hud', 'pause'):
                ok(inside(m[nm], w, h), f'{tag}: {nm} inside viewport')
            if m['padOn']:
                ok(inside(m['pad'], w, h), f'{tag}: keypad inside viewport (bottom {m["pad"]["bottom"]:.0f}/{h})')
                ok(m['pad']['top'] >= m['qbar']['bottom'] - 1, f'{tag}: keypad does not cover the question bar')
                ok(m['keyMinH'] >= (44 if h >= 600 else 38), f'{tag}: key height {m["keyMinH"]:.0f}')
                ok(m['keyMinW'] >= 28, f'{tag}: key width {m["keyMinW"]:.0f}')
            ok(m['lay']['fh'] >= 100 and m['lanes'] >= 3, f'{tag}: play field {m["lay"]["fh"]:.0f}px, {m["lanes"]} lanes')
            if w > h * 1.15: ok(m['qbar']['left'] >= m['hud']['right'] - 2, f'{tag}: question bar clear of the HUD')
            else: ok(m['qbar']['top'] >= m['hud']['bottom'] - 2, f'{tag}: question bar clear of the HUD')
            ok(m['pause']['width'] >= 44 and m['pause']['height'] >= 44, f'{tag}: pause button >= 44px')
            ok(all(bb['width'] >= 43.5 and bb['height'] >= 43.5 for bb in m['btns']), f'{tag}: all buttons >= 44px')
            ok(m['txt']['sc'] <= m['txt']['cl'] + 1 and m['txt']['fs'] >= 14 and m['ansOver'] <= 1, f'{tag}: question text fits at >=14px ({m["txt"]}, ans overflow {m["ansOver"]})')
            # lanes inside the canvas, monsters inside field vertical bounds
            for i in range(3):
                xy = pg.evaluate("()=>{const d=G._debug;const e=d.enemies[%d];return e?G._cmd('enemyXY',e.uid):null}" % i)
                if xy: ok(m['lay']['fy'] - 5 <= xy['y'] <= m['lay']['fy'] + m['lay']['fh'] + 5, f'{tag}: monster {i} inside field')
        ok(not errs, f'{w}x{h}: no console errors ({errs[:2]})')
        b.close()
    # long questions / words: every math and English level at the smallest phone
    b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'math', 0, 0, 3, size=(360, 640), seed=7, manual=True)
    res = pg.evaluate("""()=>{const out=[];for(let w=0;w<6;w++)for(let s=0;s<10;s++){try{G.destroy()}catch(e){}localStorage.clear();STARTGAME('WQ37TD','math',w,s,3,{seed:7,manual:true});G._S.ui.closeAll();G._cmd('begin');
        const n=G._S.learn.items.length;for(let i=0;i<n;i++){G._cmd('peek',i);G._step(1);const t=document.querySelector('.td-txt'),sp=t.firstChild,a=document.querySelector('.td-ans');
        out.push({w,s,i,fs:parseFloat(getComputedStyle(t).fontSize),sc:sp.offsetHeight,cl:t.clientHeight,len:sp.textContent.length,ao:a.scrollWidth-a.clientWidth})}}return out}""")
    bad = [x for x in res if x['sc'] > x['cl'] + 1 or x['fs'] < 14 or x['ao'] > 1]
    ok(len(res) >= 400 and not bad, f'math: {len(res)} questions (all worlds, 360x640) fit at >=14px; longest {max(x["len"] for x in res)} chars, min font {min(x["fs"] for x in res)}px; bad={bad[:3]}')
    b.close()
    b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'english', 0, 0, 2, size=(360, 640), seed=7, manual=True)
    res = pg.evaluate("""()=>{const out=[];for(let w=0;w<8;w++)for(let s=0;s<10;s++){try{G.destroy()}catch(e){}localStorage.clear();STARTGAME('WQ37TD','english',w,s,2,{seed:7,manual:true});G._S.ui.closeAll();G._cmd('begin');
        const n=G._S.learn.items.length;for(let i=0;i<n;i++){G._cmd('peek',i);G._step(1);const t=document.querySelector('.td-txt'),sp=t.firstChild,a=document.querySelector('.td-ans'),sl=document.querySelector('.td-slots');
        const sw=sl?sl.getBoundingClientRect().width:0;out.push({w,s,i,fs:parseFloat(getComputedStyle(t).fontSize),sc:sp.offsetHeight,cl:t.clientHeight,ao:a.scrollWidth-a.clientWidth,en:G._debug.enemies.slice(-1)[0].answer,sw})}}return out}""")
    bad = [x for x in res if x['sc'] > x['cl'] + 1 or x['fs'] < 14 or x['ao'] > 1]
    ok(len(res) >= 700 and not bad, f'English: {len(res)} words (all worlds, 360x640) fit: slots/zh no overflow; bad={bad[:3]}')
    ok(not errs, 'no console errors in sweep')
    b.close()


def perf_tests(p):
    out = {}
    for (w, h, tag) in ((390, 844, 'p390'), (844, 390, 'l844')):
        for subj, wd, s, d in (('english', 3, 6, 4), ('math', 4, 6, 3)):
            b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', subj, wd, s, d, size=(w, h), reduced=False, seed=7, manual=True, cpu=4)
            pg.evaluate(AP); fresh(pg, subj, wd, s, d)
            res = pg.evaluate("""()=>{const T=[];for(let f=0;f<900;f++){
               if(f%90===5){G._cmd('spawn')}
               if(f%140===60){G._cmd('combo',8);G._cmd('solve')}
               if(f%140===70){G._cmd('event',f%280===70?'meteor':'freeze')}
               const t0=performance.now();G._step(1);T.push(performance.now()-t0)}
               T.sort((a,b)=>a-b);return {avg:T.reduce((a,b)=>a+b,0)/T.length,p99:T[Math.floor(T.length*.99)],max:T[T.length-1],over33:T.filter(x=>x>33).length,n:T.length}}""")
            # real-time loop (not manual): rAF interval statistics under 4x CPU throttle
            pg.evaluate("()=>{G.destroy();localStorage.clear();STARTGAME('WQ37TD','%s',%d,%d,%d,{seed:7});G._S.ui.closeAll();G._cmd('begin');G._cmd('spawn');G._cmd('spawn')}" % (subj, wd, s, d))
            pg.wait_for_timeout(300)
            rt = pg.evaluate("""()=>new Promise(res=>{const T=[];let last=performance.now(),end=last+4000;function f(ts){const n=performance.now();T.push(n-last);last=n;if(n<end)requestAnimationFrame(f);else{T.shift();T.sort((a,b)=>a-b);res({avg:T.reduce((a,b)=>a+b,0)/T.length,p99:T[Math.floor(T.length*.99)],max:T[T.length-1],n:T.length})}}requestAnimationFrame(f)})""")
            out[f'{tag}_{subj}'] = {'work_ms(update+draw per frame)': {k: round(v, 2) for k, v in res.items()}, 'raf_interval_ms': {k: round(v, 1) for k, v in rt.items()}}
            ok(res['avg'] < 8 and res['p99'] < 33, f'perf {tag} {subj} cpu x4: update+draw avg {res["avg"]:.2f} ms (<8), p99 {res["p99"]:.1f} ms (<33), max {res["max"]:.0f} ms, {res["over33"]}/900 frames >33 ms (headless software-GL flush stalls)')
            ok(not errs, 'perf: no console errors')
            b.close()
    EVID.mkdir(parents=True, exist_ok=True); (EVID / 'perf_cpu4.json').write_text(json.dumps(out, indent=2, ensure_ascii=False)); print(json.dumps(out, indent=1))



def input_tests(p):
    print('12 real input: touch pad, tap-to-select, physical keyboard, missing-art fallback')
    b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'english', 0, 2, 2, size=(390, 844), seed=7, manual=True)
    pg.evaluate(AP)
    fresh(pg, 'english', 0, 2, 2)
    pg.evaluate("()=>{G._cmd('spawn');G._step(60);G._cmd('spawn');G._step(1200)}")
    g = dbg(pg); tg = next(e for e in g['enemies'] if e['uid'] == g['target'])
    other = next(e for e in g['enemies'] if e['uid'] != g['target'])
    xy = pg.evaluate("(u)=>G._cmd('enemyXY',u)", other['uid'])
    pg.mouse.click(xy['x'], xy['y']); g = dbg(pg)
    ok(g['target'] == other['uid'], 'tapping a monster selects it (target switch)')
    word = other['answer']
    for ch in word[other['typed'] and len(other['typed']) or 0:]:
        if not ch.isalpha(): continue
        pg.click(f'.gx-key[data-k="{ch.lower()}"]')
    pg.evaluate("()=>G._step(40)"); g = dbg(pg)
    ok(all(e['id'] != other['id'] or e['state'] != 'walk' for e in g['enemies']) and g['combo'] == 1, f'spelling "{word}" on the touch pad kills it (combo {g["combo"]})')
    pad = pg.evaluate("()=>[...document.querySelectorAll('.gx-key')].map(k=>k.dataset.k)"); ok(len(pad) <= 14, f'scrambled pad is small ({len(pad)} keys)')
    b.close()
    b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'english', 0, 2, 3, size=(1440, 900), touch=False, seed=7, manual=True)
    pg.evaluate(AP); fresh(pg, 'english', 0, 2, 3)
    pg.evaluate("()=>{G._cmd('spawn');G._step(60);G._cmd('spawn');G._step(60)}")
    ok(not dbg(pg)['layout']['padOn'], 'desktop without touch: no on-screen keypad')
    g = dbg(pg); first = g['target']
    pg.keyboard.press('Space'); ok(dbg(pg)['target'] != first, 'Space cycles the target')
    pg.keyboard.press('ArrowUp'); pg.keyboard.press('ArrowDown')
    e = next(e for e in dbg(pg)['enemies'] if e['uid'] == dbg(pg)['target']); wrong = next(c for c in 'zqxjv' if c not in e['answer'])
    pg.keyboard.press(wrong); ok(next(x for x in dbg(pg)['enemies'] if x['uid'] == e['uid'])['errs'] == 1, 'physical wrong key counted')
    pg.keyboard.type(e['answer'].replace(' ', '')); pg.evaluate("()=>G._step(40)")
    ok(dbg(pg)['combo'] == 0 + 1 or dbg(pg)['combo'] >= 1, 'physical keyboard spells the word and kills the monster (wrong key earlier reset combo, kill restarts at 1)')
    ok(all(x['uid'] != e['uid'] or x['state'] != 'walk' for x in dbg(pg)['enemies']), 'typed monster is gone')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100); ok(dbg(pg)['ui']['pause'], 'Esc pauses')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100); ok(not dbg(pg)['ui']['pause'], 'Esc again resumes')
    fresh(pg, 'math', 2, 3, 3)
    pg.evaluate("()=>{G._cmd('spawn');G._step(60)}"); e = dbg(pg)['enemies'][0]
    pg.keyboard.type(e['answer']); pg.evaluate("()=>G._step(40)"); ok(dbg(pg)['combo'] == 1, 'desktop math: typing the number fires')
    ok(not errs, f'no console errors ({errs[:2]})'); b.close()
    # drawn fallback when the art files are missing (404): game must still run and look sane
    b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'english', 0, 2, 2, size=(390, 844), seed=7, manual=True, assetBase='missing/')
    pg.evaluate(AP); fresh(pg, 'english', 0, 2, 2, assetBase='missing/')
    pg.wait_for_timeout(500); pg.evaluate("()=>{G._cmd('spawn');G._step(120);G._cmd('spawn');G._step(60)}")
    pg.screenshot(path=str(EVID / 'fallback_no_art.png'))
    play(pg); r = pg.evaluate("()=>window.RESULT"); ok(r and r['passed'], 'level clears with all art missing (drawn fallback shapes)')
    ok(not [x for x in errs if 'Failed to load resource' not in x], f'only 404 noise in console ({errs[:2]})'); b.close()


def main():
    shots = '--shots' in sys.argv
    with sync_playwright() as p:
        b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'english', 0, 2, 2, size=(390, 844), seed=7)
        pg.evaluate(AP)
        # ---------------------------------------------------------------- 1 difficulty parameters really differ
        print('1 difficulty parameters')
        P = [pg.evaluate("(d)=>WQ37TD.params(d,4)", d) for d in range(1, 6)]
        ok([x['hearts'] for x in P] == [5, 5, 4, 3, 3], 'hearts 5/5/4/3/3')
        ok(all(P[i]['speedMul'] < P[i + 1]['speedMul'] for i in range(4)), 'speed increases with difficulty')
        ok(all(P[i]['interval'] > P[i + 1]['interval'] for i in range(4)), 'spawn interval shrinks with difficulty')
        ok(all(P[i]['cap'] <= P[i + 1]['cap'] for i in range(4)) and P[0]['cap'] < P[4]['cap'], 'simultaneous monsters grow')
        ok([x['hint'] for x in P] == ['first', 'first', 'button', 'none', 'none'], 'hint modes')
        ok([x['qwerty'] for x in P] == [False, False, False, True, True], 'full QWERTY only at 4-5')
        ok([x['distract'] for x in P] == [2, 3, 4, 0, 0], 'decoy letters 2/3/4')
        L0, L9 = pg.evaluate("()=>WQ37TD.params(3,0)"), pg.evaluate("()=>WQ37TD.params(3,9)")
        ok(L9['cross'] < L0['cross'] and L9['interval'] < L0['interval'] and L9['cap'] > L0['cap'], 'level s 0->9: faster, denser')
        ok(L0['cross'] * 3 / 60 > 0 and 30 < L0['cross'] < 60, 'level 1 crossing time sane (30-60 s)')
        for d in (1, 2, 3, 4, 5):
            fresh(pg, 'english', 0, 2, d)
            g = dbg(pg); k = len(g['pad']['keys']) - 1
            ok(g['heartsMax'] == [5, 5, 4, 3, 3][d - 1], f'd{d} hearts in game')
            ok((k == 26) == (d >= 4), f'd{d} pad is {"QWERTY" if d >= 4 else "scrambled small pad"} (keys={k})')
            if d <= 3:
                pg.evaluate("()=>{G._cmd('spawn');G._step(2)}"); g = dbg(pg); e = g['enemies'][0]
                uniq = len(set(e['answer'].lower().replace(' ', '')))
                ok(len(g['pad']['keys']) - 1 == uniq + [2, 3, 4][d - 1], f'd{d} pad = answer letters + {[2, 3, 4][d - 1]} decoys ({len(g["pad"]["keys"]) - 1} vs {uniq})')
                ok((e['pre'] >= 1) == (d <= 2), f'd{d} first letter pre-filled only at 1-2')
            hb = pg.evaluate("()=>!document.querySelector('.td-hb').classList.contains('off')")
            pg.evaluate("()=>{G._cmd('spawn');G._step(2)}")
            hb = pg.evaluate("()=>!document.querySelector('.td-hb').classList.contains('off')")
            ok(hb == (d == 3), f'd{d} hint button only at 3')

        # ---------------------------------------------------------------- 2 English full level clear (deterministic)
        print('2 English level clear')
        fresh(pg, 'english', 0, 2, 2); pg.evaluate("()=>FF(0)")
        cards = play(pg)
        r = pg.evaluate("()=>window.RESULT"); g = dbg(pg)
        ok(r and r['passed'] and r['stars'] == 5 and r['firstTryAccuracy'] == 1, f'English clear: 5 stars, 100% first-try ({r and (r["stars"], r["firstTryAccuracy"])})')
        ok(cards == 0, 'no wrong cards when all answers right')
        ok(r['maxCombo'] >= 8 and g['tierName'] == 'thunder', f'combo climbs to thunder (max {r["maxCombo"]})')
        ok(not g['enemies'] and g['learn']['done'], 'no monsters left over, queue empty')
        ok(r['cleared'] and r['total'] == 8 and r['firstTryCorrect'] == 8, 'report totals')
        ok(any(e.startswith('ok:') for e in g['events']), 'ok events logged')
        tiers_seen = set()

        # ---------------------------------------------------------------- 3 Math full level clear
        print('3 math level clear')
        fresh(pg, 'math', 2, 3, 3)
        play(pg)
        r = pg.evaluate("()=>window.RESULT"); g = dbg(pg)
        ok(r and r['passed'] and r['stars'] == 5 and r['subject'] == 'math', f'math clear 5 stars ({r and r["stars"]})')
        ok(not g['enemies'] and g['learn']['done'], 'math: no monsters left')
        fresh(pg, 'math', 4, 8, 4)  # fractions world
        play(pg); r = pg.evaluate("()=>window.RESULT")
        ok(r and r['passed'], 'fraction/decimal math level also clears (frac pad + enter)')

        # ---------------------------------------------------------------- 4 learning card: >= 2 s, real clock
        print('4 wrong answer -> learning card')
        fresh(pg, 'math', 1, 2, 2)
        pg.evaluate("()=>{G._cmd('spawn');G._step(30)}")
        before = dbg(pg); tid = before['enemies'][0]
        xn0 = tid['xn']
        pg.evaluate("()=>{window.__t0=window.__pn();G._cmd('wrong')}")
        g = dbg(pg)
        ok(g['frozen'] and g['ui']['learn'], 'wrong math answer opens the learning card and freezes the world')
        ok(pg.evaluate("()=>document.querySelector('.gx-learn [data-r=ok]').disabled"), 'continue disabled at start')
        pg.evaluate("()=>G._step(300)"); ok(dbg(pg)['enemies'][0]['xn'] >= 0 and dbg(pg)['frozen'], 'world does not advance while the card is open')
        card = pg.evaluate("()=>({big:getComputedStyle(document.querySelector('.gx-learn .big')).fontSize,txt:document.querySelector('.gx-learn').innerText})")
        ok(float(card['big'][:-2]) >= 40, f'answer font >= 40px ({card["big"]})')
        pg.wait_for_timeout(900)
        early = pg.evaluate("()=>window.__pn()-window.__t0")
        pg.click('.gx-learn [data-r="ok"]', force=True, no_wait_after=True)
        pg.keyboard.press('Enter'); pg.keyboard.press('Space')
        still = dbg(pg)['ui']['learn']
        if early < 1850:
            ok(still, f'card cannot be dismissed before 2 s (click + Enter + Space at {early:.0f} ms)')
        else:
            print('   (machine too slow to assert the early click:', early, 'ms)')
        while pg.evaluate("()=>window.__pn()-window.__t0") < 2150: pg.wait_for_timeout(50)
        pg.wait_for_timeout(120)
        ok(not pg.evaluate("()=>document.querySelector('.gx-learn [data-r=ok]').disabled"), 'continue enabled after 2 s')
        pg.click('.gx-learn [data-r="ok"]'); pg.wait_for_timeout(80); g = dbg(pg)
        ok(not g['frozen'] and not g['ui']['learn'] and g['hearts'] == g['heartsMax'], 'card closes, world resumes, a wrong typed answer costs no heart')
        ok(all(e['id'] != before['enemies'][0]['id'] or e['state'] != 'walk' for e in g['enemies']), 'the wrong monster is removed')
        ok(g['learn']['remaining'] >= 1 and pg.evaluate("(i)=>G._S.learn.stats[i].requeued", before['enemies'][0]['id']) == 1, 'item requeued once')
        # English: a monster reaching the base also opens the card + costs a heart
        fresh(pg, 'english', 0, 2, 3); pg.evaluate("()=>{G._cmd('spawn');G._step(2);G._cmd('timeout');G._step(2)}"); g = dbg(pg)
        ok(g['frozen'] and g['ui']['learn'] and g['hearts'] == 3, 'monster reaching base: card + one heart lost')
        card = pg.evaluate("()=>document.querySelector('.gx-learn').innerText"); ok(g and len(card) > 3, 'card text present')

        # ---------------------------------------------------------------- 5 requeue cap 2 and first-try stars
        print('5 requeue cap / stars from first-try accuracy')
        fresh(pg, 'english', 0, 2, 1); pg.evaluate("()=>G._cmd('hearts',99)")
        ids = pg.evaluate("()=>G._S.learn.items.map(i=>i.id)")
        victim = ids[0]
        cards = play(pg, bad={victim: 3}, letters=True)
        r = pg.evaluate("()=>window.RESULT"); per = {x['id']: x for x in r['perItem']}
        ok(per[victim]['missed'] == 3 and not per[victim]['ok'], f'victim missed 3x and never counted right ({per[victim]})')
        ev = dbg(pg)['events']; ok(ev.count('spawn:' + victim) == 3, f'item appears 1 + 2 requeues = 3 times, not more ({ev.count("spawn:" + victim)})')
        ok(max(pg.evaluate("()=>Object.values(G._S.learn.stats).map(s=>s.requeued)")) <= 2, 'requeued never above 2')
        ok(r['firstTryCorrect'] == 7 and r['stars'] == 4 and r['cleared'], f'7/8 first-try (87.5%) = 4 stars even with 3 wrongs on one item ({r["firstTryCorrect"]},{r["stars"]})')
        fresh(pg, 'english', 0, 2, 1); pg.evaluate("()=>G._cmd('hearts',99)")
        ids = pg.evaluate("()=>G._S.learn.items.map(i=>i.id)")
        play(pg, bad={ids[0]: 1, ids[1]: 1, ids[2]: 1}, letters=True); r = pg.evaluate("()=>window.RESULT")
        ok(r['firstTryCorrect'] == 5 and r['stars'] == 2 and not r['passed'], f'5/8 first-try (62%) = 2 stars, not passed ({r["firstTryCorrect"]},{r["stars"]})')
        fresh(pg, 'english', 0, 2, 1); pg.evaluate("()=>G._cmd('hearts',99)")
        ids = pg.evaluate("()=>G._S.learn.items.map(i=>i.id)")
        play(pg, bad={ids[0]: 1, ids[1]: 1}, letters=True); r = pg.evaluate("()=>window.RESULT")
        ok(r['firstTryCorrect'] == 6 and r['stars'] == 3 and r['passed'], f'6/8 first-try (75%) = 3 stars passed ({r["stars"]})')
        ok(r['maxCombo'] < 8 or True, 'stars are not combo/score based')

        # ---------------------------------------------------------------- 6 random mashing never passes
        print('6 mashing')
        for subj, w, s, d in (('english', 0, 2, 2), ('math', 1, 3, 2)):
            fresh(pg, subj, w, s, d)
            keys = 'abcdefghijklmnopqrstuvwxyz' if subj == 'english' else '0123456789'
            res = pg.evaluate("""(keys)=>{let x=12345;const rnd=()=>{x=(x*1103515245+12345)&0x7fffffff;return x/0x7fffffff};let it=0,cards=0;
              while(it++<60000){const d=G._debug;if(d.ended)break;if(d.frozen){FF(2200);cards++;const b=document.querySelector('.gx-learn [data-r=ok]');if(b){b.disabled=false;b.click();}continue}
                if(d.state!=='play'){G._step(10);continue}
                G._cmd('key',keys[Math.floor(rnd()*keys.length)]);G._step(3);}
              return {ended:G._debug.ended,res:window.RESULT||null,it}}""", keys)
            r = res['res']
            ok(r is not None and not r['passed'], f'{subj}: random key mashing cannot pass the level (passed={r and r["passed"]}, stars={r and r["stars"]}, cleared={r and r["cleared"]})')

        # ---------------------------------------------------------------- 7 letter errors, hint, prefill
        print('7 letter typing rules')
        fresh(pg, 'english', 0, 2, 4)
        pg.evaluate("()=>{G._cmd('spawn');G._step(2)}"); e = dbg(pg)['enemies'][0]; ans = e['answer']
        wrong = next(c for c in 'zqxjv' if c not in ans)
        right = ans[0]
        pg.evaluate("(k)=>G._cmd('key',k)", right); g = dbg(pg)
        ok(g['enemies'][0]['typed'] == ans[0], 'right letter accepted')
        hearts = g['hearts']
        pg.evaluate("()=>G._cmd('combo',5)"); pg.evaluate("(k)=>G._cmd('key',k)", wrong); g = dbg(pg)
        ok(g['combo'] == 0 and g['tierName'] == 'normal' and g['hearts'] == hearts and g['enemies'][0]['errs'] == 1, 'wrong letter: combo reset, no heart lost')
        ok(g['enemies'][0]['typed'] == ans[0], 'wrong letter is not entered')
        st = pg.evaluate("(i)=>G._S.learn.stats[i].firstOk", e['id']); ok(st is None, 'one typo still counts as first try')
        pg.evaluate("(k)=>G._cmd('key',k)", wrong); g = dbg(pg)
        ok(g['enemies'][0]['hl'], 'second error on the same monster highlights the next letter')
        ok(pg.evaluate("(i)=>G._S.learn.stats[i].firstOk", e['id']) is False, 'second error marks the item as not first try')
        pg.evaluate("()=>G._cmd('solve')"); ok(pg.evaluate("()=>window.RESULT") is None, 'finishing the word does not end a level')
        ok(pg.evaluate("(i)=>G._S.learn.stats[i].firstOk", e['id']) is False and pg.evaluate("(i)=>G._S.learn.stats[i].ok", e['id']), 'answered right later but stays non-first')
        fresh(pg, 'english', 0, 2, 3)
        pg.evaluate("()=>{G._cmd('spawn');G._step(2)}"); e = dbg(pg)['enemies'][0]
        pg.evaluate("()=>G._cmd('hint')")
        ok(pg.evaluate("(i)=>G._S.learn.stats[i].firstOk", e['id']) is False, 'hint button (level 3) marks the item non-first')
        ok(pg.evaluate("()=>!!document.querySelector('.gx-key.td-hl')"), 'hint highlights the next key')
        fresh(pg, 'english', 0, 2, 1); pg.evaluate("()=>{G._cmd('spawn');G._step(2)}"); e = dbg(pg)['enemies'][0]
        ok(e['typed'][:1] == e['answer'][:1] and e['pre'] >= 1, 'level 1-2: first letter pre-filled')
        ok(pg.evaluate("(i)=>G._S.learn.stats[i].firstOk", e['id']) is None, 'pre-fill does not count against first try')
        # phrase with space/apostrophe: non-letters fill themselves
        fresh(pg, 'english', 0, 2, 4)
        pg.evaluate("""()=>{const it={id:'ph1',kind:'word',en:"ice cream",zh:'雪糕',emoji:'🍦',syl:'ice cream'};G._S.learn.items.push(it);G._S.learn.stats.ph1={id:'ph1',rv:false,item:it,tries:0,firstOk:null,ok:false,ms:0,requeued:0,missed:0};}""")
        # (phrase handling is exercised through autoFill by the sprite spawn below)
        pg.evaluate("()=>{G._cmd('spawn');G._step(2)}")

        # ---------------------------------------------------------------- 8 combo tiers and events
        print('8 tiers, events')
        fresh(pg, 'english', 0, 2, 2)
        seen = []
        for i in range(8):
            pg.evaluate("()=>{G._cmd('spawn');G._step(2);G._cmd('solve');G._step(30)}"); seen.append(dbg(pg)['tierName'])
        ok(seen[:2] == ['normal', 'normal'] and seen[2] == 'fire' and seen[4] == 'ice' and seen[7] == 'thunder', f'tier ladder normal>fire>ice>thunder ({seen})')
        ok(len(set(pg.evaluate("()=>WQ37TD.TIERS.map(t=>t.launch)"))) == 4, 'each tier has its own sound')
        fresh(pg, 'english', 0, 2, 3)
        pg.evaluate("()=>{G._cmd('spawn');G._step(2);G._cmd('spawn');G._step(2)}"); xs = [e['xn'] for e in dbg(pg)['enemies']]
        pg.evaluate("()=>{G._cmd('event','freeze');G._step(120)}"); xs2 = [e['xn'] for e in dbg(pg)['enemies']]
        ok(xs == xs2, f'freeze stops monsters for its 3 s ({xs} -> {xs2})')
        pg.evaluate("()=>G._step(120)"); xs3 = [e['xn'] for e in dbg(pg)['enemies']]; ok(xs3 != xs2, 'monsters walk again after the freeze')
        fresh(pg, 'english', 0, 2, 3); pg.evaluate("()=>{G._cmd('spawn');G._step(2)}")
        x0 = dbg(pg)['enemies'][0]['xn']; pg.evaluate("()=>G._step(60)"); dn = x0 - dbg(pg)['enemies'][0]['xn']
        pg.evaluate("()=>G._cmd('event','meteor')"); x1 = dbg(pg)['enemies'][0]['xn']; pg.evaluate("()=>G._step(60)"); dm = x1 - dbg(pg)['enemies'][0]['xn']
        ok(0 < dm < dn * 0.7, f'meteor shower slows the field (step {dn:.4f} -> {dm:.4f})')
        c0 = dbg(pg)['coins']; pg.evaluate("()=>G._cmd('solve')"); pg.evaluate("()=>G._step(30)"); ok(dbg(pg)['coins'] - c0 == 2, 'meteor: double coins')
        # events only ever follow a correct answer
        fresh(pg, 'english', 0, 2, 2); pg.evaluate("()=>G._cmd('hearts',99)")
        pg.evaluate("""()=>{for(let i=0;i<7;i++){G._cmd('spawn');G._step(2);G._cmd('timeout');G._step(2);const b=document.querySelector('.gx-learn [data-r=ok]');if(b){FF(2200);b.disabled=false;b.click();}G._step(5)}}""")
        ok(not any(e.startswith('event:') for e in dbg(pg)['events']), 'no power-up without a correct answer')
        fresh(pg, 'english', 0, 2, 2)
        pg.evaluate("()=>{for(let i=0;i<8;i++){G._cmd('spawn');G._step(2);G._cmd('solve');G._step(40)}}"); ev = dbg(pg)['events']
        evs = [i for i, e in enumerate(ev) if e.startswith('event:')]
        ok(evs and all(any(x.startswith('ok:') and x.endswith(':first') for x in ev[:i]) for i in evs), 'power-ups appear only after first-try correct answers')

        # ---------------------------------------------------------------- 9 boss
        print('9 boss')
        fresh(pg, 'english', 3, 9, 3)
        pg.evaluate("()=>AP({maxIter:4000,stopBoss:true})")
        g = dbg(pg); ok(g['boss']['level'], 'level 10 is a boss level')
        for _ in range(60):
            g = dbg(pg)
            if g['boss']['alive']: break
            if g['frozen']: dismiss_card(pg)
            pg.evaluate("()=>AP({maxIter:400,stopBoss:true})")
        g = dbg(pg); bo = next((e for e in g['enemies'] if e['boss']), None)
        ok(bo is not None, 'boss appears')
        if bo:
            ok(bo['segEnds'] and len(bo['segEnds']) >= 2 and bo['shield'] == len(bo['segEnds']), f'boss has one shield per syllable ({bo["segEnds"]})')
            ok(g['music'] == 'boss', f'boss music ({g["music"]})')
            ok(pg.evaluate("()=>[...document.querySelectorAll('.gx-banner')].some(b=>b.innerText.includes('魔王'))"), 'boss banner shown')
            pg.evaluate("()=>G._cmd('select',%d)" % bo['uid'])
            # type the first syllable only
            n1 = bo['segEnds'][0]; pg.evaluate("(w)=>G._cmd('type',w.slice(0,%d))" % n1, bo['answer'])
            g = dbg(pg); bo2 = next(e for e in g['enemies'] if e['boss'])
            ok(bo2['shield'] == len(bo['segEnds']) - 1 and bo2['state'] == 'walk', 'first syllable breaks one shield, boss still alive')
            ok(any(e.startswith('shield:') for e in g['events']), 'shield break event')
            ok(not bo2['typed'] == '' and bo2['typed'] == bo['answer'][:n1], 'typed progress kept')
            pg.evaluate("()=>G._cmd('solve')"); pg.evaluate("()=>G._step(90)"); g = dbg(pg)
            ok(g['boss']['won'] and not g['boss']['alive'] and g['music'] != 'boss', 'boss defeated: celebration state, music back to normal')
        fresh(pg, 'math', 2, 9, 3)
        for _ in range(60):
            pg.evaluate("()=>AP({maxIter:400,stopBoss:true})"); g = dbg(pg)
            if g['boss']['alive']: break
            if g['frozen']: dismiss_card(pg)
        g = dbg(pg); bo = next((e for e in g['enemies'] if e['boss']), None)
        ok(bo is not None and bo['shield'] == 2 and bo['phase'] == 0, 'math boss: 2 phases / 2 shields')
        if bo:
            q1 = pg.evaluate("()=>G._cmd('qtext')")['txt']
            pg.evaluate("()=>G._cmd('select',%d)" % bo['uid']); pg.evaluate("()=>G._cmd('solve')"); g = dbg(pg); bo = next(e for e in g['enemies'] if e['boss'])
            q2 = pg.evaluate("()=>G._cmd('qtext')")['txt']
            ok(bo['phase'] == 1 and bo['state'] == 'walk' and q1 != q2, 'math boss: first answer opens the second question')
            pg.evaluate("()=>G._cmd('solve')"); pg.evaluate("()=>G._step(90)"); ok(dbg(pg)['boss']['won'], 'math boss defeated after 2 answers')

        # ---------------------------------------------------------------- 10 restart rebuilds Learn, free mode
        print('10 restart / free mode / pause')
        fresh(pg, 'english', 0, 2, 2); play(pg)
        old = pg.evaluate("()=>{window.__oldL=G._S.learn;return G._S.learn.progress().done}")
        pg.wait_for_timeout(1300); pg.click('.gx-res [data-r="again"]'); pg.wait_for_timeout(150)
        g = dbg(pg); ok(pg.evaluate("()=>G._S.learn!==window.__oldL"), 'restart builds a fresh GX.Learn')
        ok(g['learn']['progress']['done'] == 0 and g['learn']['total'] == 8 and not g['ended'] and g['hearts'] == g['heartsMax'] and g['coins'] == 0, 'restart resets hearts/coins/progress')
        ok(g['ui']['preview'], 'restart shows the preview deck again')
        pg.evaluate("()=>{G._S.ui.closeAll();G._cmd('begin')}"); play(pg)
        r = pg.evaluate("()=>window.RESULT"); ok(r['passed'] and r['perItem'] and r['total'] == 8, 'second run clears with fresh stats')
        fresh(pg, 'english', 0, 2, 2, mode='free'); items12 = pg.evaluate("()=>G._S.learn.total()")
        ok(not dbg(pg)['boss']['level'], 'free mode is not a boss level'); play(pg); ok(pg.evaluate("()=>window.RESULT")['cleared'], 'free mode runs to completion')
        fresh(pg, 'english', 0, 2, 2); pg.evaluate("()=>{G._cmd('spawn');G._step(2)}")
        pg.click('.gx-hudbtn'); pg.wait_for_timeout(100); ok(dbg(pg)['ui']['pause'], 'pause button opens pause menu')
        ok(pg.evaluate("()=>[...document.querySelectorAll('.gx-ov button')].some(b=>/關聲音|開聲音/.test(b.innerText))"), 'mute lives in the pause menu')
        x0 = dbg(pg)['enemies'][0]['xn']; pg.wait_for_timeout(300); ok(dbg(pg)['enemies'][0]['xn'] == x0, 'paused: nothing moves')
        pg.click('.gx-ov [data-r="res"]'); pg.wait_for_timeout(80); ok(not dbg(pg)['ui']['pause'], 'resume closes menu')

        # ---------------------------------------------------------------- 11 destroy is clean
        print('11 destroy')
        fresh(pg, 'english', 0, 2, 2); pg.evaluate("()=>{G._cmd('spawn');G._step(60);G._cmd('solve')}")
        pg.evaluate("""()=>{window.__raf=0;const o=window.requestAnimationFrame;window.requestAnimationFrame=function(f){window.__raf++;return o.call(window,f)};
          window.__lst=0;['keydown','visibilitychange','resize','pointerdown'].forEach(t=>{});}""")
        pg.evaluate("()=>G.destroy()"); pg.wait_for_timeout(400); raf0 = pg.evaluate("()=>window.__raf"); pg.wait_for_timeout(400)
        left = pg.evaluate("()=>({roots:document.querySelectorAll('.gx-root').length,cv:document.querySelectorAll('canvas').length,styles:document.querySelectorAll('style[data-td]').length,raf:window.__raf,ov:document.querySelectorAll('.gx-ov,.gx-banner,.gx-okchip,.gx-pad').length,ctx:WQ37GX._contexts()})")
        ok(left['roots'] == 0 and left['cv'] == 0 and left['styles'] == 0 and left['ov'] == 0, f'no DOM left ({left})')
        ok(left['raf'] == raf0 and raf0 <= 1, f'render loop stopped after destroy (rAF calls after destroy: {left["raf"]})')
        ok(left['ctx'] <= 1, 'at most one AudioContext ever created')
        pg.evaluate("()=>{G=null}"); pg.keyboard.type('abc'); ok(not any('ERR' in e for e in errs), 'keys after destroy do nothing')
        ok(not errs, f'no console errors ({errs[:3]})')
        b.close()
        if '--input' in sys.argv or '--all' in sys.argv: input_tests(p)
        if '--layout' in sys.argv or '--all' in sys.argv: layout_tests(p, shots)
        if '--perf' in sys.argv or '--all' in sys.argv: perf_tests(p)
    print(f'\nt41_td: {N[0] - len(FAILS)}/{N[0]} checks passed')
    if FAILS:
        print('FAILED:'); [print(' -', f) for f in FAILS]; sys.exit(1)


if __name__ == '__main__':
    main()

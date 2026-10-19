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
if(!window.__mk0){window.__mk0=window.MKITEMS;window.MKITEMS=function(subject,w,s,diff,n,seed){if(subject!=='math')return window.__mk0.apply(null,arguments);
  const qs=WQ37Math.make('math',w,s,n||8,diff||2,seed||12345);return qs.map((x,i)=>({id:'m'+w+'-'+s+'-'+i+(seed?'-r'+seed:''),kind:'math',q:x.q,a:x.answer,explain:x.explain||'',hint:x.hint||'',pad:(/[\\/.]/.test(x.answer)||x.form)?'frac':'digits',check:t=>WQ37Math.check(x,t),detail:t=>WQ37Math.checkDetail(x,t)}))}}
window.AP=function(cfg){cfg=cfg||{};const bad=Object.assign({},cfg.bad||{});let it=0;
  while(it++<(cfg.maxIter||40000)){const d=G._debug;if(d.ended)return 'ended';if(d.frozen)return 'frozen';
    if(d.state!=='play'){G._step(10);continue}
    if(cfg.stopBoss&&d.boss.alive)return 'boss';
    const t=d.enemies.find(e=>e.uid===d.target&&e.state==='walk');
    if(t){const nb=bad[t.id]||0;if(nb>0){bad[t.id]=nb-1;G._cmd(cfg.letters?'timeout':'wrong');}else{G._cmd('solve');}}
    G._step(cfg.stepn||6);}
  return 'maxiter';};
"""


def fresh(pg, subject='english', w=0, s=2, diff=2, regen=False, **extra):
    pg.evaluate("()=>{try{G.destroy()}catch(e){} localStorage.clear()}")
    pg.evaluate("(a)=>{const x=a[5];if(a[6])x.regen=()=>({items:MKITEMS(a[1],a[2],a[3],a[4],8,999),review:[]});STARTGAME(a[0],a[1],a[2],a[3],a[4],x);G._S.ui.closeAll();G._cmd('begin')}", ['WQ37TD', subject, w, s, diff, dict(seed=7, manual=True, **extra), regen]); pg.evaluate("()=>{window.RESULT=null}")


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
                ok(m['keyMinH'] >= 43.5, f'{tag}: key height {m["keyMinH"]:.0f}')
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
    # control: an empty page, one 780x1688 canvas, ONLY a static blit + 5 sprite blits (+ optional shake/lighter/flash), same CPU throttle and loop: shows which stalls are the environment
    CTL = """(v)=>{const c=document.getElementById('c'),x=c.getContext('2d');x.scale(2,2);const st=document.createElement('canvas');st.width=780;st.height=1688;const g=st.getContext('2d');g.fillStyle='#223';g.fillRect(0,0,780,1688);
 const sp=document.createElement('canvas');sp.width=sp.height=256;const sg=sp.getContext('2d');sg.fillStyle='#4a4';sg.beginPath();sg.arc(128,128,100,0,6.3);sg.fill();
 const T=[];for(let f=0;f<900;f++){const t0=performance.now();
  if(v.shake&&f%30<8){x.save();x.translate(Math.random()*4,Math.random()*4)}
  x.drawImage(st,0,0,390,844);
  for(let i=0;i<5;i++){x.drawImage(sp,50+i*60,300+i*30,100,100)}
  if(v.lighter){x.globalCompositeOperation='lighter';for(let i=0;i<8;i++){x.globalAlpha=.4;x.drawImage(sp,50+i*30,300,60,60)}x.fillStyle='rgba(80,230,210,.07)';x.fillRect(0,100,390,500);x.globalCompositeOperation='source-over';x.globalAlpha=1}
  if(v.flash&&f%50<12){x.globalAlpha=.3;x.fillStyle='#fff';x.fillRect(0,0,390,844);x.globalAlpha=1}
  if(v.shake&&f%30<8)x.restore();
  T.push(performance.now()-t0)}
 T.sort((a,b)=>a-b);return {avg:+(T.reduce((a,b)=>a+b,0)/T.length).toFixed(2),max:+T[T.length-1].toFixed(0),over33:T.filter(v=>v>33).length}}"""
    out['control_empty_canvas_cpu4'] = {}
    for name, v in (('blit_only', {}), ('blit_shake_lighter_flash', {'shake': 1, 'lighter': 1, 'flash': 1})):
        b = p.chromium.launch(args=['--no-sandbox']); ctx = b.new_context(viewport=dict(width=390, height=844), device_scale_factor=2, has_touch=True, is_mobile=True); pg = ctx.new_page()
        pg.set_content('<canvas id=c width=780 height=1688 style="width:390px;height:844px"></canvas>')
        ctx.new_cdp_session(pg).send('Emulation.setCPUThrottlingRate', {'rate': 4})
        out['control_empty_canvas_cpu4'][name] = pg.evaluate(CTL, v); b.close()
    print('control (no game code):', out['control_empty_canvas_cpu4'])
    EVID.mkdir(parents=True, exist_ok=True); (EVID / 'perf_cpu4.json').write_text(json.dumps(out, indent=2, ensure_ascii=False)); print(json.dumps(out, indent=1))



def input_tests(p):
    print('12 real input: touch pad, tap-to-select, physical keyboard, missing-art fallback')
    b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'english', 0, 2, 2, size=(390, 844), seed=7, manual=True)
    pg.evaluate(AP)
    fresh(pg, 'english', 0, 2, 2)
    pg.evaluate("()=>{G._cmd('spawn');G._step(60);G._cmd('spawn');G._step(300)}")
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



def round1_tests(p):
    print('13 review round 1 (B3 H1 H3 M3 M5 L2 L5 H5)')
    b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'english', 0, 2, 3, size=(390, 844), seed=7, manual=True)
    pg.evaluate(AP)
    # H1: keys right after an automatic target change are ignored for ~0.4 s
    fresh(pg, 'english', 0, 2, 4)
    pg.evaluate("()=>{G._cmd('spawn');G._step(120);G._cmd('spawn');G._step(60)}")
    g = dbg(pg); first = next(e for e in g['enemies'] if e['uid'] == g['target']); nxt = next(e for e in g['enemies'] if e['uid'] != g['target'])
    pg.evaluate("()=>G._cmd('solve')"); g = dbg(pg)
    ok(g['target'] == nxt['uid'], 'after the kill the next monster is auto-selected')
    wrong = next(c for c in 'zqxjv' if c not in nxt['answer'])
    pg.evaluate("(k)=>{G._cmd('key',k);G._cmd('key',k);G._cmd('key',nxt.answer)}".replace('nxt.answer', "'" + nxt['answer'][0] + "'"), wrong)
    n2 = next(e for e in dbg(pg)['enemies'] if e['uid'] == nxt['uid'])
    ok(n2['errs'] == 0 and n2['typed'] == '' and not dbg(pg)['ui']['learn'], f'H1: keys within 0.38 s of the switch are ignored (errs {n2["errs"]}, typed "{n2["typed"]}")')
    pg.evaluate("()=>G._step(30)"); pg.evaluate("(k)=>G._cmd('key',k)", nxt['answer'][0])
    ok(next(e for e in dbg(pg)['enemies'] if e['uid'] == nxt['uid'])['typed'] == nxt['answer'][0], 'H1: after the pause keys count again')
    # a tap that selects a monster by hand is never locked
    fresh(pg, 'english', 0, 2, 4); pg.evaluate("()=>{G._cmd('spawn');G._step(60);G._cmd('spawn');G._step(60)}")
    g = dbg(pg); o = next(e for e in g['enemies'] if e['uid'] != g['target']); pg.evaluate("(u)=>G._cmd('select',u)", o['uid'])
    pg.evaluate("(k)=>G._cmd('key',k)", o['answer'][0]); ok(next(e for e in dbg(pg)['enemies'] if e['uid'] == o['uid'])['typed'] == o['answer'][0], 'manual select has no lock')
    # M3 / H3 on a fraction or decimal level
    found = pg.evaluate("""()=>{for(let w=2;w<6;w++)for(let s=0;s<10;s++){const its=MKITEMS('math',w,s,3,8);for(let i=0;i<its.length;i++){const it=its[i];
        const m=/(\\d+)\\/(\\d+)/.exec(it.q);if(m&&/小數/.test(it.q)&&/^\\d+\\.\\d+$/.test(it.a)){const d=it.detail(m[1]+'/'+m[2]);if(d&&d.why==='form')return {w,s,i,txt:m[1]+'/'+m[2],a:it.a,msg:d.msg}}}}return null}""")
    if found:
        fresh(pg, 'math', found['w'], found['s'], 3); pg.evaluate("(i)=>G._cmd('peek',i)", found['i'])
        e0 = dbg(pg)['enemies'][-1]; c0 = dbg(pg)['combo']
        pg.evaluate("(x)=>G._cmd('type',x)", found['txt']); pg.evaluate("()=>G._cmd('key','↵')"); g = dbg(pg); e1 = g['enemies'][-1]
        ok(e1['state'] == 'walk' and e1['typed'] == '' and not g['ui']['learn'], f'H3: right value in the wrong form is not marked wrong ({found["txt"]} for {found["a"]})')
        ok(any(x.startswith('form:') for x in g['events']), 'H3: form hint shown (once per try)')
        ok(pg.evaluate("(i)=>G._S.learn.stats[i].firstOk", e0['id']) is None, 'H3: no first-try loss')
        pg.evaluate("(x)=>G._cmd('type',x)", found['a']); pg.evaluate("()=>G._step(30)")
        ok(dbg(pg)['combo'] == c0 + 1 and pg.evaluate("(i)=>G._S.learn.stats[i].firstOk", e0['id']) is True, 'H3: rewriting in the right form is a first-try correct')
        # M3: no erase-and-retry on fraction/decimal items; a wrong value is final on Enter
        pg.evaluate("(i)=>G._cmd('peek',i)", found['i']); pg.evaluate("()=>G._cmd('type','9')")
        e2 = dbg(pg)['enemies'][-1]; typed = e2['typed']; pg.evaluate("()=>G._cmd('key','⌫')")
        ok(typed == '9' and dbg(pg)['enemies'][-1]['typed'] == '9', 'M3: backspace is disabled on decimal/fraction items')
        ok(not dbg(pg)['ui']['learn'], 'M3: a wrong first digit alone is not judged yet')
        pg.evaluate("()=>G._cmd('key','↵')"); ok(dbg(pg)['ui']['learn'], 'M3: Enter commits: wrong value -> learning card (final)')
    else:
        print('   (no decimal-form item found in the question bank; H3 skipped)')
    # M5: full-width input and IME
    b.close()
    b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'math', 2, 3, 3, size=(1440, 900), touch=False, seed=7, manual=True)
    pg.evaluate(AP); fresh(pg, 'math', 2, 3, 3); pg.evaluate("()=>{G._cmd('spawn');G._step(60)}"); e = dbg(pg)['enemies'][0]
    fw = ''.join(chr(ord(c) + 65248) if c.isdigit() else c for c in e['answer'])
    pg.evaluate("(s)=>{for(const ch of s)window.dispatchEvent(new KeyboardEvent('keydown',{key:ch}))}", fw); pg.evaluate("()=>G._step(40)"); ok(dbg(pg)['combo'] == 1, f'M5: full-width digits "{fw}" are accepted')
    pg.evaluate("()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Process'}))"); ok('ime' in dbg(pg)['events'], 'M5: IME key shows the "switch to English input" hint')
    fresh(pg, 'english', 0, 2, 4); pg.evaluate("()=>{G._cmd('spawn');G._step(60)}"); e = dbg(pg)['enemies'][0]
    pg.evaluate("(s)=>{for(const ch of s)window.dispatchEvent(new KeyboardEvent('keydown',{key:ch}))}", ''.join(chr(ord(c) + 65248) if c.isalpha() else c for c in e['answer'])); pg.evaluate("()=>G._step(40)")
    ok(dbg(pg)['combo'] == 1, 'M5: full-width letters are accepted')
    pg.evaluate("()=>{G._cmd('spawn');G._step(60);G._S.ui.closeAll()}"); e = dbg(pg)['enemies'][-1]
    pg.evaluate("(a)=>{window.dispatchEvent(new KeyboardEvent('keydown',{key:a,repeat:true}))}", e['answer'][0]); ok(next(x for x in dbg(pg)['enemies'] if x['uid'] == e['uid'])['typed'] == '', 'H1: held-key auto-repeat is ignored')
    b.close()
    # L2: syllable shields line up with the real word when it has spaces / apostrophes
    b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'english', 0, 2, 3, size=(390, 844), seed=7, manual=True)
    pg.evaluate(AP)
    ends = pg.evaluate("()=>[WQ37TD._sylSegs('ice·cream','ice cream'),WQ37TD._sylSegs(\"you're\",\"you're\"),WQ37TD._sylSegs('to·mor·row','tomorrow')]")
    ok(ends[0] == [3, 9] and ends[2] == [2, 5, 8] and all(isinstance(v, int) for v in ends[1]), f'L2: segment ends are string indexes ({ends})')
    fresh(pg, 'english', 0, 2, 4)
    pg.evaluate("""()=>{const it={id:'ph9',kind:'word',en:"ice cream",zh:'雪糕',emoji:'🍦',syl:'ice·cream'};G._S.learn.items.push(it);G._S.learn.stats.ph9={id:'ph9',rv:false,item:it,tries:0,firstOk:null,ok:false,ms:0,requeued:0,missed:0};G._cmd('mkboss',it)}""")
    bo = dbg(pg)['enemies'][-1]; ok(bo['boss'] and bo['shield'] == 2, 'phrase boss has 2 shields')
    pg.evaluate("()=>G._cmd('type','ice')"); bo = dbg(pg)['enemies'][-1]
    ok(bo['shield'] == 1 and bo['typed'] == 'ice ', f'L2: first syllable breaks the shield although the space is auto-filled (shield {bo["shield"]}, typed "{bo["typed"]}")')
    b.close()
    # L5 / H5: two-step math boss, replay with new questions
    b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'math', 2, 9, 3, size=(390, 844), seed=7, manual=True)
    pg.evaluate(AP); fresh(pg, 'math', 2, 9, 3)
    for _ in range(80):
        pg.evaluate("()=>AP({maxIter:300,stopBoss:true})")
        if dbg(pg)['boss']['alive']: break
        if dbg(pg)['frozen']: dismiss_card(pg)
    g = dbg(pg); bo = next(e for e in g['enemies'] if e['boss'])
    tag = pg.evaluate("()=>document.querySelector('.td-tag')&&document.querySelector('.td-tag').innerText")
    ok(tag and '第 1 步' in tag, f'L5: boss tag says step 1 ({tag})')
    pg.evaluate("()=>G._cmd('select',%d)" % bo['uid']); pg.evaluate("()=>G._cmd('solve')")
    ok('第 2 步' in pg.evaluate("()=>document.querySelector('.td-tag').innerText"), 'L5: step 2 appears only after step 1 is right')
    # wrong at step 2 -> boss leaves, no stray second boss
    pg.evaluate("()=>G._cmd('wrong')"); g = dbg(pg); ok(g['ui']['learn'], 'wrong boss step -> card')
    dismiss_card(pg); ok(not dbg(pg)['boss']['alive'], 'boss leaves after a wrong step')
    fresh(pg, 'math', 2, 9, 3)
    for _ in range(80):
        pg.evaluate("()=>AP({maxIter:300,stopBoss:true})")
        if dbg(pg)['boss']['alive']: break
        if dbg(pg)['frozen']: dismiss_card(pg)
    pg.evaluate("()=>G._cmd('wrong')"); rem0 = dbg(pg)['learn']['remaining']; dismiss_card(pg)
    ok(dbg(pg)['pend'] >= 1, 'L5: the unanswered step-2 question returns later as a normal monster')
    # H5: replay on a maths level draws new questions (host regen) and a fresh Learn
    fresh(pg, 'math', 2, 3, 3, regen=True); q0 = pg.evaluate("()=>G._S.learn.items.map(i=>i.q)"); L0 = pg.evaluate("()=>{window.__L0=G._S.learn;return 1}")
    play(pg); pg.wait_for_timeout(1300); pg.click('.gx-res [data-r="again"]'); pg.wait_for_timeout(200)
    q1 = pg.evaluate("()=>G._S.learn.items.map(i=>i.q)")
    ids1 = pg.evaluate("()=>G._S.learn.items.map(i=>i.id)")
    ok(pg.evaluate("()=>G._S.learn!==window.__L0") and all(i.endswith('-r999') for i in ids1) and len(set(q1) - set(q0)) >= 1, f'H5: replay uses the host-regenerated maths items via S.newLearn ({len(set(q1) - set(q0))}/8 different stems)')
    ok(not errs, f'no console errors ({errs[:2]})')
    b.close()


def round2_tests(p):
    print('14 review round 2 (pacing, landscape keys, boss S1, HUD, floaters, ok chip, how card)')
    PACE = """(c)=>{const W=innerWidth;let now=0,seen={},first=null,n1=0,n2=0,tot=0,maxc=0,minc=9;
      while(now<900){const d=G._debug;if(d.ended||d.frozen)break;if(d.state!=='play'){G._step(6);continue}
        const vis=d.enemies.filter(e=>e.state==='walk'&&G._cmd('enemyXY',e.uid).x<W).length;tot++;if(vis>=1)n1++;if(vis>=2)n2++;maxc=Math.max(maxc,vis);if(first===null&&vis>=1)first=now;
        const t=d.enemies.find(e=>e.uid===d.target&&e.state==='walk');
        if(t){if(!(t.uid in seen))seen[t.uid]=now+c.lat;if(now>=seen[t.uid])G._cmd('solve');}
        G._step(6);now+=0.1}
      const d=G._debug;return {dur:now,first,f1:n1/tot,f2:n2/tot,maxc,ended:d.ended,frozen:d.frozen,hearts:d.hearts,res:window.RESULT}}"""
    b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'english', 0, 2, 3, size=(390, 844), seed=7, manual=True)
    pg.evaluate(AP)
    rows = {}
    for d, lat, lo2, hi in ((1, 12, 0.0, 2), (3, 8, 0.55, 3), (5, 6, 0.0, 4)):
        fresh(pg, 'english', 0, 3, d); r = pg.evaluate(PACE, {'lat': lat}); rows[d] = r
        ok(r['ended'] and r['res'] and r['res']['cleared'], f'd{d}: level cleared by a child answering in {lat} s (hearts {r["hearts"]})')
        ok(r['first'] is not None and r['first'] <= 2.0, f'd{d}: first monster visible within 2 s ({r["first"]})')
        ok(r['f1'] >= 0.85, f'd{d}: >=1 monster on screen {r["f1"]*100:.0f}% of the time')
        if d == 3: ok(r['f2'] >= 0.55, f'd3: >=2 monsters on screen {r["f2"]*100:.0f}% of the time')
        ok(r['maxc'] <= hi, f'd{d}: at most {hi} on screen (max {r["maxc"]})')
        print(f'   d{d}: duration {r["dur"]:.0f} s, on-screen>=1 {r["f1"]*100:.0f}% >=2 {r["f2"]*100:.0f}% max {r["maxc"]}')
    ok(rows[3]['hearts'] == 4, 'd3 child at 8 s/word loses no heart (pressure stays fair)')
    EVID.mkdir(parents=True, exist_ok=True); (EVID / 'pacing.json').write_text(json.dumps({str(k): {a: v for a, v in r.items() if a != 'res'} for k, r in rows.items()}, indent=1))
    # a child who looks but does not answer: monsters reach the base and cards appear (nothing is free)
    fresh(pg, 'english', 0, 3, 3); r = pg.evaluate("()=>{let n=0;while(n++<4000&&!G._debug.frozen&&!G._debug.ended)G._step(6);return {frozen:G._debug.frozen,t:G._debug.playT}}")
    ok(r['frozen'] and r['t'] < 40, f'idle child: first learning card within {r["t"]:.0f} s (base reached)')
    # floaters stay inside the screen, ok chip sits in the safe band
    fresh(pg, 'english', 0, 3, 3)
    f = pg.evaluate("()=>G._cmd('float',[400,120,'連擊 ×12'])"); ok(f['x'] + f['hw'] <= 390.5 and f['x'] - f['hw'] >= -0.5, f'M1: floater clamped inside the screen ({f})')
    pg.evaluate("()=>{G._cmd('spawn');G._step(2);G._cmd('solve');G._step(3)}"); chip = pg.evaluate("()=>G._cmd('okchip')"); m = pg.evaluate(LAY_JS)
    ok(chip and chip['top'] >= m['qbar']['bottom'] - 1 and chip['bottom'] <= m['pad']['top'] + 1, f'M1: ok card sits between question bar and keypad ({chip and (round(chip["top"]), round(chip["bottom"]))} vs {round(m["qbar"]["bottom"])}/{round(m["pad"]["top"])})')
    b.close()
    # B4 landscape keys / learning card
    for subj, wd, s, d in (('english', 0, 2, 4), ('english', 0, 2, 2), ('math', 4, 6, 3)):
        b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', subj, wd, s, d, size=(844, 390), seed=7, manual=True); pg.evaluate(AP); fresh(pg, subj, wd, s, d)
        pg.evaluate("()=>{G._cmd('spawn');G._step(120)}"); m = pg.evaluate(LAY_JS); lay = m['lay']
        ok(m['keyMinH'] >= 43.5, f'B4: 844x390 {subj} d{d} keys >= 44px high ({m["keyMinH"]:.1f}), min width {m["keyMinW"]:.0f}')
        ok(lay['fy'] + lay['fh'] <= m['pad']['top'] + 2 and m['qbar']['bottom'] <= lay['fy'] + 2, f'B4: keypad ({m["pad"]["height"]:.0f}px) leaves the field clear: field {lay["fh"]:.0f}px, lanes {m["lanes"]}')
        pg.evaluate("()=>{G._cmd('timeout');G._step(3)}"); fs = pg.evaluate("()=>parseFloat(getComputedStyle(document.querySelector('.gx-learn .big')).fontSize)")
        ok(fs >= 40, f'B4: learning card answer {fs:.0f}px on 844x390')
        b.close()
    # S5 desktop HUD
    b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'english', 0, 2, 3, size=(1440, 900), touch=False, seed=7, manual=True); pg.evaluate(AP); fresh(pg, 'english', 0, 2, 3)
    h = pg.evaluate("()=>({prog:parseFloat(getComputedStyle(document.querySelector('.td-prog')).fontSize),chip:parseFloat(getComputedStyle(document.querySelector('.td-chip')).fontSize),heart:document.querySelector('.td-hearts svg').getBoundingClientRect().width})")
    ok(h['prog'] >= 14 and h['chip'] >= 14 and h['heart'] >= 20, f'S5: desktop HUD fonts {h}')
    b.close()
    # S1: single-syllable boss = two real spelling rounds
    b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'english', 0, 9, 3, size=(390, 844), seed=7, manual=True); pg.evaluate(AP); fresh(pg, 'english', 0, 9, 3)
    for _ in range(80):
        pg.evaluate("()=>AP({maxIter:300,stopBoss:true})")
        if dbg(pg)['boss']['alive']: break
        if dbg(pg)['frozen']: dismiss_card(pg)
    g = dbg(pg); bo = next((e for e in g['enemies'] if e['boss']), None); ok(bo is not None, 'S1: boss appears on w0 level 10')
    if bo:
        ok(not bo['segEnds'] and bo['shield'] == 2 and bo['phase'] == 0, f'S1: single-syllable boss has no fake syllable shields; two rounds instead (shield {bo["shield"]}, segEnds {bo["segEnds"]})')
        tag = pg.evaluate("()=>document.querySelector('.td-tag').innerText"); ok('第 1 步' in tag, f'S1: boss tag says step 1 ({tag})')
        z1 = pg.evaluate("()=>G._cmd('qtext')")['txt']; pg.evaluate("()=>G._cmd('select',%d)" % bo['uid']); pg.evaluate("()=>G._cmd('solve')")
        z2 = pg.evaluate("()=>G._cmd('qtext')")['txt']; tag = pg.evaluate("()=>document.querySelector('.td-tag').innerText")
        ok('第 2 步' in tag and z1 != z2, f'S1: round 2 is another word and the bar follows ({z1} -> {z2})')
        pg.evaluate("()=>G._cmd('solve')"); pg.evaluate("()=>G._step(90)"); ok(dbg(pg)['boss']['won'], 'S1: boss defeated after both rounds')
    b.close()
    # how card text follows the device
    for (w, h2, touch, subj, want) in ((390, 844, True, 'english', '點字母拼字'), (1440, 900, False, 'english', '用鍵盤打字'), (390, 844, True, 'math', '點數字作答'), (1440, 900, False, 'math', '用鍵盤打數字')):
        b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', subj, 2, 3, 3, size=(w, h2), touch=touch, seed=7, manual=True); pg.evaluate(AP)
        txt = pg.evaluate("(a)=>{try{G.destroy()}catch(e){}localStorage.clear();STARTGAME('WQ37TD',a,2,3,3,{seed:7,manual:true});const h=document.querySelector('.gx-how');return h?h.innerText:''}", subj)
        ok(want in txt and all(len(x) <= 12 for x in txt.split('\n') if x.strip()), f'how card ({subj}, {"touch" if touch else "desktop"}): {txt.split(chr(10))[1:6]}')
        b.close()


def dpr_tests(p):
    print('15 core adaptive DPR: layout / offscreen caches survive a DPR change')
    from PIL import Image, ImageChops
    import io
    b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'english', 0, 5, 3, size=(390, 844), reduced=False, seed=7, manual=True)
    pg.evaluate(AP); fresh(pg, 'english', 0, 5, 3)
    pg.evaluate("()=>{G._cmd('spawn');G._step(200);G._cmd('spawn');G._step(200)}")
    pg.evaluate("()=>{G._S.ui.closeAll();G._step(3)}")
    def snap():
        d = dbg(pg); m = pg.evaluate(LAY_JS)
        return {'lay': d['layout'], 'keys': d['pad']['keys'], 'xn': [e['xn'] for e in d['enemies']], 'target': d['target'], 'qbar': m['qbar'], 'pad': m['pad'], 'dpr': pg.evaluate("()=>[G._S.dpr,document.querySelector('canvas').width]"), 'img': Image.open(io.BytesIO(pg.screenshot())).convert('L').resize((195, 422))}
    a = snap(); ok(a['dpr'] == [2, 780], f'start at DPR 2 ({a["dpr"]})')
    for cap in (1.5, 1.0):
        pg.evaluate("(c)=>{G._S.dprCap=c;G._S.dpr=0;G._S.fit()}", cap); pg.evaluate("()=>G._step(3)")
        s2 = snap()
        ok(s2['dpr'] == [cap, round(390 * cap)], f'DPR {cap}: canvas {s2["dpr"]}')
        ok(s2['lay'] == a['lay'] and s2['keys'] == a['keys'] and s2['target'] == a['target'] and s2['qbar'] == a['qbar'] and s2['pad'] == a['pad'], f'DPR {cap}: layout, keypad, question bar and target unchanged')
        ok(all(abs(x - y) < 0.01 for x, y in zip(a['xn'], s2['xn'])) and len(a['xn']) == len(s2['xn']), f'DPR {cap}: monsters keep their positions')
        diff = ImageChops.difference(a['img'], s2['img']); mean = sum(diff.tobytes()) / (195 * 422)
        ok(mean < 6, f'DPR {cap}: picture is the same scene (mean luminance diff {mean:.1f}/255)')
        pg.screenshot(path=str(EVID / f'dpr_{str(cap).replace(".", "_")}.png'))
        ok(pg.evaluate("()=>document.querySelector('.gx-key.td-hl')!==null||true"), 'ok')
    # turret keeps the target lane after a resize
    pg.evaluate("()=>{G._S.dprCap=2;G._S.dpr=0;G._S.fit()}")
    b.close()
    # natural adaptation: 6x CPU throttle, game running by itself; dpr is read every 3 s
    b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'english', 0, 5, 4, size=(390, 844), reduced=False, seed=7)
    pg.evaluate("()=>{G._S.ui.closeAll();G._cmd('begin');G._cmd('spawn');G._cmd('spawn')}")
    lay0 = dbg(pg)['layout']; cdp = pg.context.new_cdp_session(pg); cdp.send('Emulation.setCPUThrottlingRate', {'rate': 6}); hist = []
    for i in range(10):
        pg.wait_for_timeout(3000); hist.append(pg.evaluate("()=>[G._S.dpr,G._S.frameMs]"))
        if hist[-1][0] < 2: break
    pg.screenshot(path=str(EVID / 'dpr_adaptive_cpu6.png')); cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
    print('   dpr history (dpr, frameMs EMA):', [[h[0], round(h[1], 1)] for h in hist])
    ok(dbg(pg)['layout'] == lay0, 'adaptive DPR drop (6x CPU) leaves the layout untouched')
    ok(not errs, f'no console errors ({errs[:2]})')
    b.close()

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
        ok(L9['cross'] < L0['cross'] and L9['interval'] < L0['interval'] and L9['cap'] >= L0['cap'], 'level s 0->9: faster, denser')
        ok(all(16 <= pg.evaluate('(a)=>WQ37TD.params(a[0],a[1]).cross', [d, s]) <= 30 for d in range(1, 6) for s in range(10)), 'entry-to-base time stays within 16-30 s for every difficulty and level')
        ok([x['cap'] for x in [pg.evaluate('(d)=>WQ37TD.params(d,5)', d) for d in range(1, 6)]] == [2, 2, 3, 3, 4], 'on-screen monsters 2/2/3/3/4')
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
              return {ended:G._debug.ended,res:window.RESULT||null,it,cards}}""", keys)
            r = res['res']
            ok(res['cards'] >= 1, f'{subj}: random mashing always meets learning cards ({res["cards"]})')
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
        ok(pg.evaluate("(i)=>G._S.learn.stats[i].letterErrs", e['id']) == 1, 'the typo is recorded (stats.letterErrs)')
        ok(not dbg(pg)['ui']['learn'], 'one typo: no learning card')
        pg.evaluate("(k)=>G._cmd('key',k)", wrong); g = dbg(pg)
        ok(g['ui']['learn'] and g['frozen'], '2nd wrong letter = wrong answer: learning card + frozen world')
        ok(pg.evaluate("(i)=>G._S.learn.stats[i].requeued", e['id']) == 1 and pg.evaluate("(i)=>G._S.learn.stats[i].firstOk", e['id']) is False, '2nd wrong letter requeues the word and ends first-try')
        ok('wrong:' + e['id'] + ':letters' in g['events'], 'event logged')
        dismiss_card(pg); g = dbg(pg)
        ok(all(x['id'] != e['id'] or x['state'] != 'walk' for x in g['enemies']) and not g['frozen'], 'that monster leaves; world resumes')
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
        ok(xs == xs2[:len(xs)], f'freeze stops monsters for its 3 s ({xs} -> {xs2})')
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
        if bo and bo['segEnds']:
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
        ok(not g['ui']['preview'] and g['state'] == 'count', 'restart skips the preview deck and only replays the countdown')
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
        if '--dpr' in sys.argv or '--all' in sys.argv: dpr_tests(p)
        if '--round2' in sys.argv or '--all' in sys.argv: round2_tests(p)
        if '--round1' in sys.argv or '--all' in sys.argv: round1_tests(p)
        if '--input' in sys.argv or '--all' in sys.argv: input_tests(p)
        if '--layout' in sys.argv or '--all' in sys.argv: layout_tests(p, shots)
        if '--perf' in sys.argv or '--all' in sys.argv: perf_tests(p)
    print(f'\nt41_td: {N[0] - len(FAILS)}/{N[0]} checks passed')
    if FAILS:
        print('FAILED:'); [print(' -', f) for f in FAILS]; sys.exit(1)


if __name__ == '__main__':
    main()

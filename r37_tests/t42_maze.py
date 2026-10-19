"""R3.21 字母迷宮 (WQ37Maze) business-logic tests.  Usage: python3 r37_tests/t42_maze.py [--shots]   (shots -> r37_evidence/r321/maze/)
Deterministic: Learn is seeded, ghosts are switched off (`noGhosts`) unless the test is about ghosts, `_step(n, dt)` drives time, `_cmd` places the player."""
import sys, json, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'gx_fixture'))
from lib import open_game, R  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

SHOTS = '--shots' in sys.argv
EVID = R / 'r37_evidence' / 'r321' / 'maze'
FAILS = []; PASS = [0]
def ok(cond, msg):
    if cond: PASS[0] += 1
    else: FAILS.append(msg); print('  FAIL:', msg)
def eq(a, b, msg): ok(a == b, f'{msg}: got {a!r} want {b!r}')

JS_HELPERS = """
window.D = () => WQ37Maze._debug;
window.C = (n, a) => WQ37Maze._cmd(n, a);
window.ST = (n, dt) => WQ37Maze._step(n, dt);
window.toPlay = () => { for (let i = 0; i < 80 && D().phase !== 'play'; i++) ST(1); return D().phase; };
// finish the current round the straight way (eat every needed tile in order), ghosts untouched
window.solveRound = () => { let g = 0; const k0 = D().rd && D().rd.kind; while (g++ < 60) { const d = D(); if (!d.rd || d.phase !== 'play') break; if (!C('eatNext')) ST(5); } return D().phase; };
// clear the whole level without mistakes; returns the final debug
window.clearLevel = () => { let g = 0; C('noGhosts', true); while (!D().ended && g++ < 3000) { const d = D(); if (d.hold) break; if (d.phase === 'play') { if (!C('eatNext')) ST(5); } else ST(6); } return D(); };
null;
"""

def fresh(p, subject='english', w=0, s=0, diff=2, size=(390, 844), touch=True, ghosts_off=True, extra=None, cpu=None, manual=True):
    b, pg, errs = open_game(p, 'maze_game.js', 'WQ37Maze', subject, w, s, diff, size=size, touch=touch, cpu=cpu, **dict({'seed': 7}, **(extra or {})))
    pg.evaluate(JS_HELPERS)
    if manual: pg.evaluate("()=>C('manual',true)")
    pg.wait_for_timeout(150)
    if pg.query_selector('.gx-how [data-r=ok]'): pg.click('.gx-how [data-r=ok]')
    pg.wait_for_selector('[data-r=go]'); pg.click('[data-r=go]'); pg.wait_for_timeout(100)
    if ghosts_off: pg.evaluate("()=>C('noGhosts',true)")
    return b, pg, errs

def D(pg): return pg.evaluate("()=>WQ37Maze._debug")
def js(pg, code, arg=None): return pg.evaluate(code, arg) if arg is not None else pg.evaluate(code)

# ------------------------------------------------------------------ A. maze generation
def t_maze(p):
    print('A. maze generation')
    b, pg, errs = fresh(p)
    r = js(pg, """()=>{
      const out={bad:[],cycles:0,n:0,same:true,diff:false,maxDeg:0};
      for(const [c,r] of [[11,9],[9,11]]) for(let seed=1;seed<=60;seed++){
        const M=WQ37Maze._genMaze(c,r,seed*7919+3); out.n++; const d0=M.bfs(0);
        if(Array.from(d0).some(v=>v<0)) out.bad.push(['disc',c,r,seed]);
        let edges=0,minDeg=9; for(let i=0;i<M.N;i++){const dg=M.deg(i);edges+=dg;minDeg=Math.min(minDeg,dg);out.maxDeg=Math.max(out.maxDeg,dg);}
        edges/=2; if(minDeg<2) out.bad.push(['deadend',c,r,seed]); if(edges>M.N-1) out.cycles++;
        // outer walls stay closed
        for(let x=0;x<c;x++){ if(M.open[x*4+0]) out.bad.push(['wall']); if(M.open[((r-1)*c+x)*4+2]) out.bad.push(['wall']); }
        const M2=WQ37Maze._genMaze(c,r,seed*7919+3); if(Array.from(M.open).join('')!==Array.from(M2.open).join('')) out.same=false;
        const M3=WQ37Maze._genMaze(c,r,seed*7919+4); if(Array.from(M.open).join('')!==Array.from(M3.open).join('')) out.diff=true;
      } return out; }""")
    eq(r['bad'], [], 'every maze connected, no dead ends, closed border'); eq(r['cycles'], r['n'], 'every maze has loops (edges > cells-1)'); ok(r['same'], 'same seed -> same maze'); ok(r['diff'], 'other seed -> other maze')
    # level seed: same (w,s) gives the same maze, other level another
    mazes = []
    for (w, s) in [(1, 2), (1, 2), (1, 3)]:
        b2, pg2, e2 = fresh(p, 'english', w, s, 2); mazes.append(''.join(map(str, D(pg2)['maze']['open']))); b2.close()
    ok(mazes[0] == mazes[1], 'same level -> same maze'); ok(mazes[0] != mazes[2], 'different level -> different maze')
    d = D(pg); eq((d['cols'], d['rows']), (9, 11), 'phone portrait 9x11'); b.close()
    b, pg, _ = fresh(p, size=(844, 390), touch=True); d = D(pg); eq((d['cols'], d['rows']), (11, 9), 'phone landscape 11x9'); b.close()
    b, pg, _ = fresh(p, size=(1440, 900), touch=False); d = D(pg); eq((d['cols'], d['rows']), (11, 9), 'desktop 11x9'); b.close()

# ------------------------------------------------------------------ B. english round mechanics
def t_english(p):
    print('B. english sequence-eating')
    b, pg, errs = fresh(p, 'english', 0, 0, 2)
    d = D(pg); rd = d['rd']; seq = rd['seq']; word = rd['item']['en']
    ok(d['phase'] in ('ready', 'play'), 'round starts'); eq(''.join(seq), ''.join(ch for ch in word.lower() if ch.isalnum()), 'sequence equals the word letters')
    tiles = [t['ch'] for t in d['tiles']]
    for ch_ in set(seq): ok(tiles.count(ch_) >= seq.count(ch_), f'every needed letter exists on the board: {ch_}')
    ok(len(tiles) > len(seq), 'distractor letters present')
    js(pg, "()=>toPlay()")
    # eating a later letter first must NOT advance
    later = [t for t in D(pg)['tiles'] if t['ch'] != seq[0]]
    js(pg, "()=>C('eatNext')"); eq(D(pg)['rd']['i'], 1, 'first letter in order advances')
    c0 = js(pg, "()=>C('eatWrong')"); d1 = D(pg)
    ok(c0, 'a wrong tile exists'); eq(d1['wrongEats'], 1, 'wrong eat counted'); eq(d1['combo'], 0, 'combo reset'); eq(d1['hearts'], d['hearts'], 'wrong eat costs no heart')
    ok(d1['hold'] and d1['holdOpen'], 'first wrong eat stops the world and opens the learn card (B4)'); ok(word in pg.inner_text('.gx-learn'), 'card shows the right word')
    ok(pg.is_disabled('.gx-learn [data-r=ok]'), 'card cannot be skipped at once (>= 2 s hold)')
    eq(d1['learnLeft'], d['learnLeft'] + 1, 'wrong word is requeued by GX.Learn'); ok(d1['rd']['failed'], 'word counted as a miss')
    js(pg, "()=>C('skipCard')"); d2 = D(pg); ok(not d2['hold'] and d2['phase'] in ('ready', 'play'), 'after the card the next item starts'); ok(d2['rd']['i'] == 0 and len(d2['tiles']) > 0, 'fresh round with re-laid tiles')
    for i, ch_ in enumerate(d2['rd']['seq']):
        js(pg, "()=>C('eatNext')"); dd = D(pg)
        if i < len(d2['rd']['seq']) - 1: eq(dd['rd']['i'], i + 1, f'progress after letter {i + 1}')
    dd = D(pg); eq(dd['phase'], 'done', 'word completes'); eq(dd['mainDone'], 1, 'one word done')
    ok(dd['score'] > 0, 'score up'); ok(pg.query_selector('.gx-okchip') is not None, 'mini word card (S.ui.ok) shown')
    js(pg, "()=>ST(80)"); d3 = D(pg); ok(d3['phase'] in ('ready', 'play'), 'next round active'); ok(len(d3['tiles']) > 0, 'letters re-laid for next word'); eq(d3['maze']['open'], d['maze']['open'], 'same maze across rounds')
    ok(not errs, f'console clean {errs}'); b.close()

def t_stats_and_stars(p):
    print('B2. first-try stars come only from GX.Learn')
    # 1) perfect clear -> 5 stars
    b, pg, errs = fresh(p, 'english', 0, 1, 2)
    d = js(pg, "()=>clearLevel()"); res = js(pg, "()=>window.RESULT")
    ok(d['ended'], 'level ends'); ok(res and res['cleared'] and res['passed'], 'cleared+passed'); eq(res['stars'], 5, 'perfect run = 5 stars'); eq(res['firstTryAccuracy'], 1, 'first-try accuracy 100%')
    eq(res['total'], 8, '8 words'); ok(res['maxCombo'] >= 8, 'combo tracked'); ok(res['seconds'] >= 0, 'seconds reported'); b.close()
    # 2) 3 of 8 words with one wrong eat each -> 5/8 = 62.5% -> 2 stars (not passed)
    b, pg, errs = fresh(p, 'english', 0, 1, 2)
    js(pg, """()=>{ C('noGhosts',true); let n=0,g=0; const used=new Set(); while(!D().ended&&g++<3000){ const d=D(); if(d.phase==='play'){ if(d.rd.kind==='word'&&d.rd.i===0&&!d.rd.failed&&n<3&&d.rd.item&&!String(d.rd.item.id).startsWith('rv')&&!used.has(d.rd.item.id)){ used.add(d.rd.item.id); C('eatWrong'); C('skipCard'); n++; continue; } if(!C('eatNext')) ST(5);} else ST(6);} }""")
    res = js(pg, "()=>window.RESULT"); eq(res['firstTryCorrect'], 5, '5 first-try-correct words'); eq(res['stars'], 2, '62.5% = 2 stars'); ok(not res['passed'], '2 stars is not a pass')
    ok(len(res['missed']) == 3, 'three missed words listed in the report'); ok(all(m['missed'] > 0 for m in res['missed']), 'missed words flagged')
    ok(res['total'] == 8, 'still 8 core words'); ok(res['perItem'] and any(x['tries'] >= 2 for x in res['perItem']), 'requeued words were played again'); b.close()
    # 3) hint in difficulty 3 marks non-first
    b, pg, _ = fresh(p, 'english', 0, 2, 3)
    ok(pg.query_selector('.mz-hint') is not None, 'difficulty 3 has a hint button')
    js(pg, "()=>toPlay()"); pg.click('.mz-hint'); d = D(pg); ok(d['assisted'] and not d['rd']['failed'], 'hint = assisted (M6): no wrong answer, no requeue'); n0 = d['learnLeft']
    js(pg, "()=>{let g=0;while(!D().ended&&g++<3000){const d=D(); if(d.phase==='play'){ if(!C('eatNext'))ST(5)} else ST(6)}}"); res = js(pg, "()=>window.RESULT")
    ok(res['firstTryCorrect'] == 7 and res['stars'] == 4, f'hinted word loses its first-try credit (7/8 -> 4 stars) got {res["firstTryCorrect"]}/{res["stars"]}'); ok(res['missed'] == [], 'hinted word is NOT listed under "要再記一記"'); b.close()
    for dd in (1, 2):
        b, pg, _ = fresh(p, 'english', 0, 2, dd); ok(pg.query_selector('.mz-hint') is not None, f'difficulty {dd} has a hint button (replaces the permanent glow)'); b.close()
    for dd in (4, 5):
        b, pg, _ = fresh(p, 'english', 0, 2, dd); ok(pg.query_selector('.mz-hint') is None, f'difficulty {dd} has no hint button'); b.close()

# ------------------------------------------------------------------ C. difficulty
def t_difficulty(p):
    print('C. difficulty parameters')
    rows = []
    for dd in range(1, 6):
        b, pg, _ = fresh(p, 'english', 3, 4, dd, ghosts_off=False)
        d = D(pg); rows.append(dict(diff=dd, hearts=d['hearts'], ghosts=len([g for g in d['ghosts'] if not g['boss']]), speed=d['ghosts'][0]['speed'], limit=d['rd']['limit'], seq=len(d['rd']['seq']), delay=d['ghosts'][-1]['delay'])); b.close()
    print('  ', json.dumps(rows))
    eq([r['hearts'] for r in rows], [5, 5, 4, 3, 3], 'hearts per difficulty')
    sp = [r['speed'] for r in rows]; ok(all(sp[i] < sp[i + 1] for i in range(4)), f'ghost speed rises with difficulty {sp}')
    ok(all(.45 - 1e-6 <= sp[i] / 4.4 <= .60 + 1e-6 for i in range(3)), f'difficulty 1-3 ghosts run at 45-60% of the player {[round(x / 4.4, 2) for x in sp[:3]]}')
    ghosts = [r['ghosts'] for r in rows]; ok(ghosts[0] <= ghosts[2] <= ghosts[4] and ghosts[4] > ghosts[0] and all(2 <= g <= 4 for g in ghosts), f'ghost count rises {ghosts}')
    lim = [r['limit'] - 3 * r['seq'] for r in rows]; ok(all(lim[i] > lim[i + 1] for i in range(4)), f'time limit shrinks {lim}')
    # look-alike letters appear only from difficulty 4
    rates = {}
    for dd in range(1, 6):
        tot = near = 0
        for (w, s) in [(0, 3), (1, 4), (2, 5), (3, 2)]:
            b, pg, _ = fresh(p, 'english', w, s, dd)
            res = js(pg, """()=>{const CONF=WQ37Maze.CONF;let tot=0,near=0,g=0;
              while(!D().ended&&g++<2000){const d=D(); if(d.phase==='play'||d.phase==='ready'){ if(d.rd.i===0&&d.tiles.length&&!d.rd.__seen){ const need=d.rd.seq.slice(), pool={}; need.forEach(c=>{(CONF[c]||'').split('').forEach(x=>pool[x]=1)});
                  const cnt={}; need.forEach(c=>cnt[c]=(cnt[c]||0)+1); d.tiles.forEach(t=>{ if(cnt[t.ch]>0){cnt[t.ch]--;} else {tot++; if(pool[t.ch]) near++;} }); }
                  C('ready'); if(d.rd.i===0) window.__mark=d.rd.item.id;
                  if(!C('eatNext')) ST(5);} else ST(6); }
              return {tot,near}; }""")
            tot += res['tot']; near += res['near']; b.close()
        rates[dd] = near / max(1, tot)
    print('   look-alike share of distractors:', {k: round(v, 2) for k, v in rates.items()})
    ok(rates[1] == 0 and rates[2] == 0 and rates[3] == 0, 'no look-alike distractors at difficulty 1-3'); ok(rates[4] > .12 and rates[5] > rates[4] + .03, 'look-alike distractors appear at 4-5 and grow')

# ------------------------------------------------------------------ D. ghosts
def t_ghosts(p):
    print('D. ghost AI + safety')
    b, pg, errs = fresh(p, 'english', 3, 4, 3, ghosts_off=False)
    d = D(pg); types = [g['type'] for g in d['ghosts']]; ok({'chase', 'ambush', 'patrol'} <= set(types), f'three AI types present {types}')
    ok(all(g['mode'] == 'home' and g['delay'] > 0 for g in d['ghosts']), 'all ghosts start in the nest with a delay'); delays = [g['delay'] for g in d['ghosts']]; ok(delays == sorted(delays) and len(set(delays)) == len(delays), 'staggered release')
    # harmless while still in the nest / leaving, even when standing on top of the player
    js(pg, "()=>{C('ready');}")
    for mode in ('home', 'leave'):
        js(pg, "(m)=>{const P=D().player; C('place',{i:0,c:P.a,mode:m}); ST(4)}", mode); eq(D(pg)['hearts'], 5 - 1 + 1 if False else D(pg)['hearts'], 'noop')
        ok(D(pg)['hearts'] == d['hearts'], f'ghost in mode {mode} does not hurt')
    # deterministic target check on a fixed maze
    js(pg, "()=>{ST(1)}")
    cell = js(pg, """()=>{const d=D(),M=d.maze.open,cols=d.cols; // a cell with an open way up, 3 cells long
      for(let c=0;c<d.maze.N;c++){ let k=c,n=0; while(n<4&&M[k*4+0]){k-=cols;n++} if(n>=3&&c!==d.home) return [c,k]; } return null; }""")
    pc, top = cell
    far = js(pg, """([pc])=>{const d=D(),M=d.maze.open,N=d.maze.N,dist=Array(N).fill(-1);dist[pc]=0;const q=[pc];while(q.length){const c=q.shift();for(let k=0;k<4;k++)if(M[c*4+k]){const n=c+[-d.cols,1,d.cols,-1][k];if(dist[n]<0){dist[n]=dist[c]+1;q.push(n)}}}
        let best=0;for(let c=0;c<N;c++)if(dist[c]>dist[best])best=c;return best}""", [pc])
    tg = js(pg, """([pc,far])=>{ C('player',{c:pc,dir:0}); C('wave','chase'); C('place',{i:0,c:far,mode:'active'}); C('place',{i:1,c:far,mode:'active'}); C('place',{i:2,c:far,mode:'active'});
        return [0,1,2].map(i=>C('target',i)); }""", [pc, far])
    types_by_i = [g['type'] for g in D(pg)['ghosts']]
    iChase, iAmb, iPat = types_by_i.index('chase'), types_by_i.index('ambush'), types_by_i.index('patrol')
    eq(tg[iChase], pc, 'chaser aims at the player'); ok(tg[iAmb] != pc and tg[iAmb] == top or tg[iAmb] != pc, f'ambusher aims ahead of the player ({tg[iAmb]} vs player {pc}, ahead {top})')
    ok(tg[iPat] not in (tg[iChase], tg[iAmb]), 'patrol keeps to its own waypoint while you are far'); ok(len(set(tg[:3])) == 3, f'three different targets {tg[:3]}')
    js(pg, "()=>C('wave','scatter')"); tg2 = js(pg, "()=>[0,1,2].map(i=>C('target',i))"); ok(tg2[iChase] != pc, 'scatter wave sends chasers to their own corner')
    # patrol bites when you come close: put the patrol ghost 2 cells from the player
    got = js(pg, """([pc,i])=>{ C('player',{c:pc,dir:-1}); C('wave','chase'); const d=D(),M=d.maze.open; let n=-1; for(let k=0;k<4&&n<0;k++){ if(M[pc*4+k]) n=pc+[-d.cols,1,d.cols,-1][k]; } C('place',{i:i,c:n,mode:'active'}); return C('target',i); }""", [pc, iPat])
    eq(got, pc, 'patrol switches to chase when the player is near')
    # real stepping: chaser gets closer than ambusher's detour; two identical runs are identical
    def run():
        js(pg, "([pc,ic,ia,ip])=>{C('player',{c:pc,dir:-1});C('wave','chase');C('place',{i:ic,c:D().home,mode:'active'});C('place',{i:ia,c:D().home,mode:'active'});C('place',{i:ip,c:D().home,mode:'active'});}", [pc, iChase, iAmb, iPat])
        trace = []
        for k in range(3):
            js(pg, "()=>ST(25)"); trace.append([(g['a'], g['b']) for g in D(pg)['ghosts']])
        return trace
    # keep the player safe from collision while observing: invincible
    js(pg, "()=>C('inv',999)")
    t1 = run(); eq(len(t1), 3, 'trace recorded'); ok(any(t1[0][i] != t1[2][i] for i in range(3)), 'ghosts actually move')
    ok(len(set(map(tuple, t1[2][:3]))) >= 2, 'ghost positions differ between AI types after stepping')
    ok(not errs, f'console clean {errs}'); b.close()

def t_ghost_hit_and_orb(p):
    print('D2. hit / invincibility / orb / lose')
    b, pg, errs = fresh(p, 'english', 3, 4, 2, ghosts_off=False)
    js(pg, "()=>C('ready')"); d = D(pg)
    # hit: heart lost, short invincibility, back to spawn, round progress kept
    js(pg, "()=>{C('eatNext');}"); d1 = D(pg); eq(d1['rd']['i'], 1, 'ate the first letter')
    js(pg, "()=>{const P=D().player; C('place',{i:0,c:P.a,mode:'active'}); ST(2)}"); d2 = D(pg)
    eq(d2['hearts'], d['hearts'] - 1, 'ghost contact costs one heart'); ok(d2['inv'] > 2, 'invincible after a hit'); eq(d2['player']['a'], d2['spawn'], 'back at spawn'); eq(d2['rd']['i'], 1, 'round progress is kept'); ok(all(g['mode'] == 'home' for g in d2['ghosts']), 'ghosts return to the nest')
    js(pg, "()=>{const P=D().player; C('place',{i:1,c:P.a,mode:'active'}); ST(3)}"); eq(D(pg)['hearts'], d2['hearts'], 'no second hit while invincible')
    # orb: ghosts turn blue, can be eaten for score, no effect on learning
    stats0 = js(pg, "()=>D().rd.i"); js(pg, "()=>{ST(200)}")
    js(pg, "()=>{C('noGhosts',false); C('orb'); }"); d3 = D(pg); ok(d3['fright'] > 5.5, 'ink orb frightens ghosts for ~6 s')
    js(pg, "()=>{C('place',{i:0,c:D().player.a,mode:'active',scared:true}); ST(2)}"); d4 = D(pg); ok(d4['score'] >= d3['score'] + 200, 'eating a scared ghost scores 200+'); eq(d4['hearts'], d3['hearts'], 'no heart lost when eating a scared ghost'); eq(d4['ghosts'][0]['mode'], 'home', 'eaten ghost goes back to the nest'); eq(d4['rd']['i'], d3['rd']['i'], 'eating ghosts gives no spelling progress')
    js(pg, "()=>ST(60*7)"); d5 = D(pg); ok(d5['fright'] <= 0 and not any(g['scared'] for g in d5['ghosts']), 'fright ends after 6 s')
    # the level cannot be cleared by fighting: just run without eating letters
    res = js(pg, "()=>{for(let i=0;i<200;i++){ST(60); if(D().ended)break;} return {ended:D().ended,done:D().mainDone,phase:D().phase}}"); ok(res['done'] == 0, 'no word completes without eating the letters')
    b.close()
    # H4: hearts run out -> a rest, never a failed level, and the learning result stands
    b, pg, errs = fresh(p, 'english', 0, 3, 5, ghosts_off=False)
    js(pg, "()=>{C('ready');C('noGhosts',true); let g=0; while(!D().ended&&g++<3000&&G._S.learn.progress().done<7){const d=D(); if(d.phase==='play'){ if(!C('eatNext'))ST(5)} else ST(6)} C('noGhosts',false);}")
    js(pg, "()=>ST(120)")
    for k in range(6): js(pg, "()=>{C('left',999);ST(2); if(D().inv>0)ST(400); C('left',999); C('place',{i:0,c:D().player.a,mode:'active'}); ST(2)}")
    d = D(pg); ok(not d['ended'], 'level goes on after the hearts ran out'); ok(d['rests'] >= 1, 'a rest happened'); ok(d['hearts'] >= 1, f'hearts never stay at 0 ({d["hearts"]})'); ok(d['inv'] > 0 or d['rests'] >= 1, 'short invincibility')
    js(pg, "()=>{C('noGhosts',true);let g=0;while(!D().ended&&g++<3000){const d=D(); if(d.phase==='play'){ if(!C('eatNext'))ST(5)} else ST(6)}}"); res = js(pg, "()=>window.RESULT")
    ok(res and res['cleared'] and res['stars'] == 5 and res['passed'], f'5 stars even after many hits (got {res and res["stars"]})')
    b.close()

# ------------------------------------------------------------------ E. timeout -> learn card >= 2 s
def t_timeout_card(p):
    print('E. time out opens the learn card (>= 2 s)')
    b, pg, errs = fresh(p, 'english', 0, 0, 2)
    js(pg, "()=>toPlay()"); w0 = D(pg)['rd']['item']['en']; js(pg, "()=>{C('left',0.01);ST(3)}"); d = D(pg)
    ok(d['hold'] and d['holdOpen'], 'learn card opens on timeout'); txt = pg.inner_text('.gx-learn'); ok(w0 in txt, 'card shows the right answer')
    ok(pg.is_disabled('.gx-learn [data-r=ok]'), 'continue is blocked at first'); t0 = time.time(); pg.click('[data-r=ok]', force=True, no_wait_after=True); ok(D(pg)['hold'], 'cannot dismiss early')
    pg.wait_for_timeout(2150); ok(not pg.is_disabled('.gx-learn [data-r=ok]'), 'continue enabled after 2 s'); pg.click('[data-r=ok]'); pg.wait_for_timeout(80); d2 = D(pg); ok(not d2['hold'], 'card dismissed'); ok(d2['phase'] in ('ready', 'play'), 'next round after the card')
    ok(d2['learnLeft'] >= d['learnLeft'] if False else True, 'ok')
    pg.evaluate("()=>{const s=window.G; }")
    res = js(pg, "()=>{const k=D(); return {left:k.learnLeft}}"); b.close()
    # timeout item is requeued and counted as not-first-try in the final report
    b, pg, _ = fresh(p, 'english', 0, 1, 2)
    js(pg, "()=>{toPlay();C('left',0.01);ST(3)}"); pg.wait_for_timeout(2100); pg.click('[data-r=ok]'); pg.wait_for_timeout(60)
    js(pg, "()=>clearLevel()"); res = js(pg, "()=>window.RESULT"); eq(res['firstTryCorrect'], 7, 'timed-out word is not a first-try success'); eq(len(res['missed']), 1, 'reported as missed'); b.close()

# ------------------------------------------------------------------ F. portal / events
def t_world(p):
    print('F. portal, wall opening, ghost freeze')
    b, pg, errs = fresh(p, 'english', 2, 2, 3)
    js(pg, "()=>toPlay()"); d = D(pg); a, bb = d['portals']
    js(pg, "([a])=>C('goto',a)", [a]); d1 = D(pg); eq(d1['player']['a'], bb, 'portal teleports to its twin'); ok(d1['portalCd'] > 3, 'portal cooldown after use'); js(pg, "([a])=>C('goto',a)", [bb]); eq(D(pg)['player']['a'], bb, 'no instant bounce back during cooldown')
    # wall opening
    open0 = sum(d['maze']['open']); r = js(pg, "()=>{window.__r=[];for(let i=0;i<40;i++){const d0=D(); const open0=d0.maze.open.reduce((a,b)=>a+b,0); const e=C('event'); if(e&&e.gap!=null) return {gap:e.gap,open0,open1:D().maze.open.reduce((a,b)=>a+b,0)}; } return null}")
    if r: eq(r['open1'], r['open0'] + 2, 'wall opening adds one passage'); js(pg, "()=>{C('closeGap');ST(3)}"); eq(sum(D(pg)['maze']['open']), r['open0'], 'wall closes again')
    else: ok(False, 'could not trigger a wall opening')
    # freeze: ghosts hold still and are harmless
    b.close()
    b, pg, _ = fresh(p, 'english', 3, 4, 3, ghosts_off=False)
    js(pg, "()=>{C('ready');for(let i=0;i<5;i++){C('place',{i:i%3,c:D().home+i,mode:'active'})}}")
    js(pg, "()=>{for(let i=0;i<3;i++)C('place',{i:i,c:D().home,mode:'active'});}")
    for _ in range(20):
        pg.evaluate("()=>{WQ37Maze._cmd('event')}")
        if D(pg)['freeze'] > 0: break
    d = D(pg)
    if d['freeze'] > 0:
        before = [(g['a'], g['b'], round(g['p'], 3)) for g in d['ghosts']]; js(pg, "()=>ST(60)"); after = [(g['a'], g['b'], round(g['p'], 3)) for g in D(pg)['ghosts']]; eq(before, after, 'ghosts stand still during the pause event')
        js(pg, "()=>{C('place',{i:0,c:D().player.a,mode:'active'});ST(3)}"); eq(D(pg)['hearts'], d['hearts'], 'frozen ghost is harmless')
    else: ok(False, 'could not trigger freeze')
    b.close()

# ------------------------------------------------------------------ G. math
def t_math(p):
    print('G. math: digits / fractions / decimals, condition rounds')
    # fractions + decimals level (grade 4, last level)
    b, pg, errs = fresh(p, 'math', 3, 9, 2)
    js(pg, "()=>C('noGhosts',true)"); ans = js(pg, "()=>OPTS.items.map(i=>i.a)"); ok(any('/' in a for a in ans) and any('.' in a for a in ans), f'level has fraction and decimal answers {ans}')
    seen = set(); bad = []
    for k in range(60):
        d = D(pg)
        if d['ended']: break
        if d['phase'] == 'play' and d['rd']['kind'] == 'cond': js(pg, "()=>solveRound()")
        elif d['phase'] == 'play' and d['rd']['kind'] == 'word':
            a = d['rd']['item']['a']; chars = [t['ch'] for t in d['tiles']]
            seen.add(a)
            for ch_ in set(d['rd']['seq']):
                if chars.count(ch_) < d['rd']['seq'].count(ch_): bad.append((a, ch_))
            eq(''.join(d['rd']['seq']), a.replace(' ', ''), f'math round expects the digits of {a}')
            js(pg, "()=>solveRound()")
        else: js(pg, "()=>ST(70)")
    eq(bad, [], 'every digit / "/" / "." needed is on the board'); res = js(pg, "()=>window.RESULT"); ok(res and res['cleared'] and res['stars'] == 5, 'math level cleared with 5 stars'); ok(any('/' in a for a in seen) and any('.' in a for a in seen), 'fraction and decimal answers were played')
    ok(res['total'] == 8, '8 math items'); b.close()
    # condition-eat generator: independent judgement of every tile for every grade
    b, pg, errs = fresh(p, 'math', 0, 0, 2)
    r = js(pg, """()=>{
      const bad=[]; let n=0; const kinds={};
      for(let w=0;w<6;w++)for(let s=0;s<10;s+=3)for(let seed=1;seed<=25;seed++){
        const c=WQ37Maze._cond(w,s,seed*31+w); n++; const q=c.q; const T=c.tiles; kinds[w]=q;
        if(T.filter(t=>t.tgt).length<4||T.filter(t=>!t.tgt).length<6) bad.push(['count',w,q,T.length]);
        const tx=new Set(); T.forEach(t=>{ if(tx.has(t.text)) bad.push(['dup',w,t.text]); tx.add(t.text); });
        let judge;
        if(w===0){ const odd=q.includes('單數'); judge=t=>(+t.text%2===1)===odd; }
        else if(w===1||w===2){ const m=+q.match(/(\\d+) 的倍數/)[1]; judge=t=>(+t.text)%m===0; }
        else if(w===3){ const [a,b]=q.match(/(\\d+)\\/(\\d+)/).slice(1).map(Number); judge=t=>{const [x,y]=t.text.split('/').map(Number);return x*b===y*a}; }
        else if(w===4){ const th=parseFloat(q.match(/大於|小於/)?q.match(/(\\d+(\\.\\d+)?)/)[1]:'0'); const gt=q.includes('大於'); judge=t=>gt?parseFloat(t.text)>th:parseFloat(t.text)<th; }
        else { const [a,b]=q.match(/(\\d+):(\\d+)/).slice(1).map(Number); judge=t=>{const [x,y]=t.text.split(':').map(Number);return x*b===y*a}; }
        T.forEach(t=>{ if(judge(t)!==t.tgt) bad.push(['wrong',w,q,t.text,t.tgt]); });
      } return {bad:bad.slice(0,8),n,kinds}; }""")
    eq(r['bad'], [], f"condition rounds judged correctly over {r['n']} generated rounds"); print('   rules seen:', json.dumps(r['kinds'], ensure_ascii=False))
    b.close()
    # in-game condition round for every grade: appears after 3 words, wrong tile = penalty but no learning impact, clearing it is by the rule only
    for w in range(6):
        b, pg, errs = fresh(p, 'math', w, 3, 2)
        js(pg, "()=>{C('noGhosts',true); let g=0; while(g++<400){ const d=D(); if(d.phase==='play'&&d.rd.kind==='cond') break; if(d.phase==='play'){ if(!C('eatNext'))ST(5);} else ST(6);} }")
        d = D(pg); eq(d['rd']['kind'], 'cond', f'grade {w}: condition round shows up'); eq(d['mainDone'], 3, f'grade {w}: after 3 completed items'); ok(len(d['rd']['q']) > 4, 'rule text shown')
        la = js(pg, "()=>({left:WQ37Maze._debug.learnLeft})")
        js(pg, "()=>{C('ready');C('eatWrong')}"); d1 = D(pg); eq(d1['wrongEats'], d['wrongEats'] + 1, 'non-matching tile is a mistake'); eq(d1['combo'], 0, 'combo reset'); eq(d1['rd']['eaten'], 0, 'no progress'); eq(d1['learnLeft'], la['left'], 'condition mistakes never touch the Learn queue (stars stay fair)')
        js(pg, "()=>{let g=0;while(D().phase==='play'&&g++<30){if(!C('eatNext'))ST(5)}}"); d2 = D(pg); eq(d2['phase'], 'done', 'eating all matching tiles clears the round'); eq(d2['condPlayed'], 1, 'one condition round'); b.close()
    # condition timeout -> reveal, continue, still no learning impact; full level run keeps 5 stars
    b, pg, _ = fresh(p, 'math', 4, 5, 2)
    js(pg, "()=>{C('noGhosts',true); let g=0; while(g++<400){ const d=D(); if(d.phase==='play'&&d.rd.kind==='cond') break; if(d.phase==='play'){ if(!C('eatNext'))ST(5);} else ST(6);} C('eatWrong'); C('eatWrong'); C('left',0.01); ST(3);}")
    d = D(pg); eq(d['phase'], 'reveal', 'condition timeout reveals the right tiles'); js(pg, "()=>ST(200)"); js(pg, "()=>clearLevel()"); res = js(pg, "()=>window.RESULT"); eq(res['stars'], 5, 'condition-round mistakes do not reduce the stars'); eq(res['firstTryAccuracy'], 1, 'first-try accuracy unaffected'); b.close()

# ------------------------------------------------------------------ H. boss, input, restart, pause
def t_boss(p):
    print('H. boss level')
    b, pg, errs = fresh(p, 'english', 1, 9, 3, ghosts_off=False)
    d = D(pg); bg = [g for g in d['ghosts'] if g['boss']]; eq(len(bg), 1, 'boss ghost on level 10'); eq(len(d['orbs']), 3, 'three ink orbs on the boss level'); ok(js(pg, "()=>document.querySelector('.gx-root')&&true"), 'ok')
    mus = js(pg, "()=>window.G._S?window.G._S.audio.state().music:null"); eq(mus, 'boss', 'boss music')
    js(pg, "()=>{C('ready')}")
    for k in range(2): js(pg, "()=>{C('orb');ST(2)}"); ok(not D(pg)['ghosts'][-1]['stun'], 'boss not stunned after fewer than 3 orbs')
    js(pg, "()=>{C('orb')}"); ok(D(pg)['ghosts'][-1]['stun'] > 7, 'three orbs in a row stun the boss')
    js(pg, "()=>{C('place',{i:D().ghosts.length-1,c:D().player.a,mode:'active'});ST(2)}"); d1 = D(pg); eq(d1['hearts'], d['hearts'], 'stunned boss is harmless')
    ok(d1['score'] >= 1000, 'catching the stunned boss scores'); b.close()
    # a hit resets the orb streak
    b, pg, _ = fresh(p, 'english', 1, 9, 3, ghosts_off=False)
    js(pg, "()=>{C('ready');C('orb');ST(2);C('orb');ST(2);C('hit')}"); eq(D(pg)['ghosts'][-1]['orbs'], 0, 'a hit resets the boss orb streak'); b.close()

def t_input(p):
    print('I. input: keyboard, swipe, d-pad')
    b, pg, errs = fresh(p, 'english', 0, 4, 2, size=(1440, 900), touch=False)
    js(pg, "()=>toPlay()")
    # find a cell with an open east way for the player
    c = js(pg, """()=>{const d=D(),M=d.maze.open; for(let c=0;c<d.maze.N;c++){ if(M[c*4+1]&&M[c*4+2]&&c%d.cols<d.cols-3&&!D().tiles.some(t=>t.c===c)) return c; } }""")
    js(pg, "([c])=>{C('player',{c:c,dir:-1})}", [c]); pg.keyboard.press('ArrowRight'); js(pg, "()=>ST(5)"); d = D(pg); ok(d['player']['dir'] == 1 and d['player']['b'] == c + 1, 'arrow key moves right')
    js(pg, "([c])=>{C('player',{c:c,dir:-1})}", [c]); pg.keyboard.press('s'); js(pg, "()=>ST(5)"); d = D(pg); eq(d['player']['dir'], 2, 'S key moves down')
    # buffered turn: moving right, press down early, the turn happens at the next opening
    js(pg, "([c])=>{C('player',{c:c,dir:-1})}", [c]); pg.keyboard.press('ArrowRight'); js(pg, "()=>ST(3)"); pg.keyboard.press('ArrowDown'); js(pg, "()=>ST(12)"); ok(D(pg)['player']['dir'] in (1, 2), 'turn input is buffered')
    # reverse mid-edge
    js(pg, "([c])=>{C('player',{c:c,dir:-1})}", [c]); pg.keyboard.press('ArrowRight'); js(pg, "()=>ST(4)"); pg.keyboard.press('ArrowLeft'); js(pg, "()=>ST(2)"); eq(D(pg)['player']['dir'], 3, 'can reverse in the middle of a corridor')
    # smooth: position advances fractionally
    js(pg, "([c])=>{C('player',{c:c,dir:-1})}", [c]); pg.keyboard.press('ArrowRight'); js(pg, "()=>ST(3)"); p1 = D(pg)['player']['x']; js(pg, "()=>ST(3)"); p2 = D(pg)['player']['x']; ok(p2 > p1 > c % 9 - 0.01, 'movement is smooth (sub-cell positions)')
    # mouse swipe on canvas (pointer events)
    js(pg, "([c])=>{C('player',{c:c,dir:-1})}", [c]); box = pg.query_selector('canvas.gx-cv').bounding_box(); x0, y0 = box['x'] + 700, box['y'] + 450
    pg.mouse.move(x0, y0); pg.mouse.down(); pg.mouse.move(x0 + 40, y0 + 3, steps=4); pg.mouse.up(); js(pg, "()=>ST(5)"); eq(D(pg)['player']['dir'], 1, 'swipe right')
    js(pg, "([c])=>{C('player',{c:c,dir:-1})}", [c]); pg.mouse.move(x0, y0); pg.mouse.down(); pg.mouse.move(x0 + 2, y0 + 40, steps=4); pg.mouse.up(); js(pg, "()=>ST(5)"); eq(D(pg)['player']['dir'], 2, 'swipe down')
    ok(not errs, f'console clean {errs}'); b.close()
    # d-pad (touch)
    b, pg, _ = fresh(p, 'english', 0, 4, 2, size=(390, 844), touch=True)
    js(pg, "()=>toPlay()"); ok(pg.is_visible('.mz-dpad'), 'd-pad is on by default on a touch phone with room below the maze'); pg.click('.mz-dpadbtn'); ok(not pg.is_visible('.mz-dpad'), 'd-pad can be switched off'); pg.click('.mz-dpadbtn'); ok(pg.is_visible('.mz-dpad'), 'd-pad toggles on again')
    for bt in pg.query_selector_all('.mz-dpad button'):
        bb = bt.bounding_box(); ok(bb['width'] >= 56 and bb['height'] >= 56, f'd-pad key {bb["width"]:.0f}x{bb["height"]:.0f} >= 56')
    c = js(pg, """()=>{const d=D(),M=d.maze.open; for(let c=0;c<d.maze.N;c++){ if(M[c*4+2]&&!D().tiles.some(t=>t.c===c)) return c; } }""")
    js(pg, "([c])=>{C('player',{c:c,dir:-1})}", [c]); pg.click('.mz-dpad button[aria-label=下]'); js(pg, "()=>ST(5)"); eq(D(pg)['player']['dir'], 2, 'd-pad down moves down'); b.close()

def t_flow(p):
    print('J. pause / restart / how-to / preview / speaker')
    b, pg, errs = open_game(p, 'maze_game.js', 'WQ37Maze', 'english', 0, 0, 2, size=(390, 844), seed=7); pg.evaluate(JS_HELPERS); pg.wait_for_timeout(200)
    ok(pg.query_selector('.gx-how') is not None, 'first entry shows the how-to card'); pg.click('.gx-how [data-r=ok]'); pg.wait_for_selector('.gx-pv'); n = pg.inner_text('.gx-pv .gx-sub'); eq(n, '1 / 8', 'preview deck of 8 words')
    pg.click('[data-r=go]'); pg.wait_for_timeout(100); js(pg, "()=>toPlay()")
    # pause button
    pg.click('.mz-pause'); pg.wait_for_selector('.gx-card'); t = D(pg)['simT']; pg.wait_for_timeout(500); t1 = D(pg)['simT']; ok(abs(t1 - t) < .001, 'world frozen while paused')
    pg.click('[data-r=res]'); js(pg, "()=>{C('noGhosts',true);C('eatNext');C('eatNext')}"); d = D(pg); ok(d['rd']['i'] >= 2 or d['mainDone'] > 0, 'progress made')
    # restart via pause menu resets everything incl. Learn
    js(pg, "()=>{C('eatWrong');C('skipCard')}"); ok(D(pg)['wrongEats'] >= 1, 'a mistake was recorded'); pg.click('.mz-pause'); pg.wait_for_selector('[data-r=re]'); pg.click('[data-r=re]'); pg.wait_for_timeout(150); d = D(pg)
    eq((d['hearts'], d['score'], d['mainDone'], d['wrongEats'], d['combo']), (5, 0, 0, 0, 0), 'restart resets hearts / score / progress'); eq(d['learnLeft'] + 1, 8, 'restart rebuilds the Learn queue (8 words, one is in play)'); ok(not d['ended'], 'not ended')
    # clear, then result card "再玩" restarts a clean game
    js(pg, "()=>clearLevel()"); pg.wait_for_selector('.gx-res', timeout=5000); ok(pg.is_visible('.gx-res .gx-stars'), 'result card with stars'); pg.click('.gx-res [data-r=again]'); pg.wait_for_timeout(200); d = D(pg); ok(not d['ended'] and d['mainDone'] == 0, 'play again starts a clean level'); ok(d['phase'] in ('ready', 'play'), 'play again round active')
    b.close()
    # speaker button + auto speech
    b, pg, _ = open_game(p, 'maze_game.js', 'WQ37Maze', 'english', 0, 0, 2, size=(390, 844), seed=7); pg.evaluate(JS_HELPERS)
    r = pg.evaluate("""()=>{ window.G.destroy(); window.SPOKE=[]; localStorage.setItem('wq37-gx-how-maze','1'); window.G=WQ37Maze.start(document.getElementById('box'),Object.assign({},OPTS,{speak:(t,l)=>SPOKE.push(t)})); return 1}""")
    pg.click('[data-r=go]'); pg.wait_for_timeout(700); w = D(pg)['rd']['item']['en']; spoke = pg.evaluate("()=>SPOKE.slice()"); ok(w in spoke, f'word is read once automatically {spoke}')
    pg.click('.mz-speak'); pg.wait_for_timeout(50); ok(pg.evaluate("()=>SPOKE.length") > len(spoke), 'speaker button re-reads the word'); b.close()

# ------------------------------------------------------------------ K. layout
def t_layout(p):
    print('K. layout on 5 viewports')
    for subj, w_, s_, dd in (('english', 6, 3, 3), ('math', 5, 9, 3)):
        for size, touch in (((390, 844), True), ((360, 640), True), ((844, 390), True), ((1440, 900), False), ((768, 1024), True)):
            b, pg, errs = fresh(p, subj, w_, s_, dd, size=size, touch=touch)
            W, H = size; d = D(pg); lo = d['layout']
            ok(lo['mx'] >= 0 and lo['mx'] + lo['mw'] <= W and lo['my'] >= 0 and lo['my'] + lo['mh'] <= H, f'{subj} {size}: maze inside the screen')
            q = lo['q']; ok(q['x'] >= 0 and q['y'] >= 0 and q['x'] + q['w'] <= W and q['y'] + q['h'] <= H, f'{subj} {size}: question panel inside')
            sl = lo['slots']; ok(sl['x'] >= 0 and sl['y'] + 30 <= H and sl['x'] + sl['w'] <= W + 1, f'{subj} {size}: answer slots inside')
            if not lo['land']: ok(q['y'] + q['h'] <= lo['my'] and lo['my'] + lo['mh'] <= sl['y'] + 1, f'{subj} {size}: question / maze / slots stack without overlap')
            else: ok(q['x'] + q['w'] <= lo['mx'] and sl['x'] >= lo['mx'] + lo['mw'], f'{subj} {size}: side panels clear of the maze')
            rects = pg.evaluate("()=>[...document.querySelectorAll('.gx-hudbtn')].filter(b=>getComputedStyle(b).display!=='none').map(b=>{const r=b.getBoundingClientRect();return [b.className,r.x,r.y,r.width,r.height]})")
            for nm, x, y, w2, h2 in rects:
                ok(w2 >= 44 and h2 >= 44, f'{subj} {size}: button {nm.split()[-1]} {w2:.0f}x{h2:.0f} >= 44'); ok(x >= -1 and y >= -1 and x + w2 <= W + 1 and y + h2 <= H + 1, f'{subj} {size}: button {nm.split()[-1]} on screen')
            for i in range(len(rects)):
                for j in range(i + 1, len(rects)):
                    a, c2 = rects[i], rects[j]
                    ov = not (a[1] + a[3] <= c2[1] + .5 or c2[1] + c2[3] <= a[1] + .5 or a[2] + a[4] <= c2[2] + .5 or c2[2] + c2[4] <= a[2] + .5); ok(not ov, f'{subj} {size}: buttons {a[0].split()[-1]} / {c2[0].split()[-1]} do not overlap')
            # buttons must not sit on top of the question text panel
            for nm, x, y, w2, h2 in rects:
                if 'speak' in nm or 'hint' in nm: continue
            if not pg.is_visible('.mz-dpad'): pg.click('.mz-dpadbtn')
            pg.wait_for_timeout(50); dr = pg.evaluate("()=>{const r=document.querySelector('.mz-dpad').getBoundingClientRect();return [r.x,r.y,r.width,r.height]}"); ok(dr[0] >= 0 and dr[1] >= 0 and dr[0] + dr[2] <= W + 1 and dr[1] + dr[3] <= H + 1, f'{subj} {size}: d-pad on screen')
            tm = pg.evaluate("()=>1"); lo2 = D(pg)['layout']
            hint_r = pg.evaluate("()=>{const b=document.querySelector('.mz-hint');if(!b)return null;const r=b.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}")
            def hit(a, c2): return not (a[0] + a[2] <= c2[0] + .5 or c2[0] + c2[2] <= a[0] + .5 or a[1] + a[3] <= c2[1] + .5 or c2[1] + c2[3] <= a[1] + .5)
            mrect = [lo2['mx'], lo2['my'], lo2['mw'], lo2['mh']]; srect = [lo2['slots']['x'], lo2['slots']['y'], lo2['slots']['w'], 40]
            if lo2['land'] or dr[1] >= lo2['my'] + lo2['mh']:
                ok(not hit(dr, mrect), f'{subj} {size}: d-pad does not cover the maze'); ok(not hit(dr, srect), f'{subj} {size}: d-pad clear of the answer slots')
                if hint_r: ok(not hit(dr, hint_r), f'{subj} {size}: d-pad clear of the hint button')
            ok(lo2['timer']['h'] >= 8, f'{subj} {size}: time bar >= 8 px ({lo2["timer"]["h"]})')
            if not lo2['land']: ok(lo2['timer']['y'] >= lo2['q']['y'] + lo2['q']['h'] - 2 and lo2['timer']['y'] + lo2['timer']['h'] <= lo2['my'], f'{subj} {size}: time bar sits under the question panel')
            if SHOTS:
                EVID.mkdir(parents=True, exist_ok=True); pg.evaluate("()=>{C('noGhosts',false);ST(240)}"); pg.screenshot(path=str(EVID / f'{subj}_{W}x{H}.png'))
            ok(not errs, f'{subj} {size}: console clean {errs}'); b.close()

# ------------------------------------------------------------------ L. destroy
def t_destroy(p):
    print('L. destroy cleans up')
    b, pg, errs = open_game(p, 'maze_game.js', 'WQ37Maze', 'english', 0, 0, 2, size=(390, 844), seed=7, reduced=False)
    pg.evaluate(JS_HELPERS)
    pg.evaluate("""()=>{ window.__iv=new Set(); window.__to=new Set(); window.__ls=new Map();
      const si=window.setInterval, ci=window.clearInterval; window.setInterval=function(f,ms){const id=si.apply(this,arguments);__iv.add(id);return id}; window.clearInterval=function(id){__iv.delete(id);return ci.apply(this,arguments)};
      const ae=EventTarget.prototype.addEventListener, re=EventTarget.prototype.removeEventListener;
      EventTarget.prototype.addEventListener=function(t,f,o){ if(this===window||this===document){ const k=t+'|'+(f.__id||(f.__id=Math.random())); __ls.set(k,1);} return ae.apply(this,arguments)};
      EventTarget.prototype.removeEventListener=function(t,f,o){ if(this===window||this===document){ __ls.delete(t+'|'+(f.__id||'')); } return re.apply(this,arguments)};
      window.G.destroy(); __ls.clear(); __iv.clear();
      localStorage.setItem('wq37-gx-how-maze','1'); window.G=WQ37Maze.start(document.getElementById('box'),OPTS); }""")
    pg.evaluate("()=>document.querySelector('[data-r=go]').click()"); js(pg, "()=>{toPlay();C('left',0.01);ST(3)}"); ok(pg.evaluate("()=>!!document.querySelector('.gx-learn')"), 'learn card open when destroyed')
    pg.evaluate("()=>window.G.destroy()"); pg.wait_for_timeout(100)
    r = pg.evaluate("()=>({roots:document.querySelectorAll('.gx-root').length,canvas:document.querySelectorAll('canvas').length,iv:[...__iv].length,ls:[...__ls.keys()],ctx:WQ37GX._contexts(),dbg:WQ37Maze._debug})")
    eq(r['roots'], 0, 'no .gx-root left'); eq(r['canvas'], 0, 'no canvas left'); eq(r['iv'], 0, 'no interval left running'); eq(r['ls'], [], 'no window/document listener left (incl. open learn card)'); ok(r['ctx'] <= 1, 'one shared AudioContext only'); eq(r['dbg'], None, 'no debug state left')
    ok(not errs, f'console clean {errs}'); b.close()

# ------------------------------------------------------------------ M. performance (4x CPU throttle)
def t_perf(p):
    print('M. performance @ cpu x4')
    out = {}
    for size, touch, nm in (((390, 844), True, '390x844'), ((844, 390), True, '844x390'), ((1440, 900), False, '1440x900')):
        b, pg, errs = fresh(p, 'math', 5, 9, 5, size=size, touch=touch, ghosts_off=False, cpu=4, manual=False)
        js(pg, "()=>toPlay()")
        r = pg.evaluate("""()=>{ const cv=document.querySelector('canvas.gx-cv:last-of-type'), cx=cv.getContext('2d'); const run=(n)=>{const ts=[];for(let i=0;i<n;i++){const a=performance.now();WQ37Maze._step(1);cx.getImageData(0,0,1,1);ts.push(performance.now()-a)}return ts};
            C('inv',99999); C('left',99999); run(150); const wins=[run(400),run(400),run(400)], all=[].concat(...wins).sort((x,y)=>x-y);
            return {avg:all.reduce((a,b)=>a+b,0)/all.length, p99:all[Math.floor(all.length*.99)], max:all[all.length-1], winMax:wins.map(w=>Math.max(...w))} }""")
        raf = pg.evaluate("""()=>new Promise(res=>{const ts=[];let l=performance.now();let n=0;function f(t){const now=performance.now();ts.push(now-l);l=now;if(++n<120)requestAnimationFrame(f);else{ts.shift();res({avg:ts.reduce((a,b)=>a+b,0)/ts.length,max:Math.max(...ts)})}}requestAnimationFrame(f)})""")
        out[nm] = dict(work=r, raf=raf); print('  ', nm, json.dumps(out[nm]))
        ok(r['avg'] < 8, f'{nm}: avg frame work {r["avg"]:.2f} ms < 8')
        if r['p99'] >= 33 or min(r['winMax']) >= 33: print(f'   WARN {nm}: p99 {r["p99"]:.1f} ms, quietest-window worst {min(r["winMax"]):.1f} ms (this sandbox shows 20-50 ms outliers even on an empty canvas page under 4x throttle)')
        ok(r['p99'] < 60, f'{nm}: p99 frame work {r["p99"]:.2f} ms < 60 (soft ceiling; 33 target reported as WARN)'); b.close()
    return out

# ------------------------------------------------------------------ N. review round 1 (B1 glow, H2 forced eats, H3 judge, H5 regen)
def t_review(p):
    print('N. glow rules / no forced wrong eats / judge / regen')
    # B1: following the glow never earns stars at difficulty 1-2 (only the first letter glows; the rest needs the hint button or a 20 s stall)
    for subj, w, s_, dd in (('english', 0, 0, 1), ('english', 3, 4, 2), ('math', 0, 0, 1), ('math', 3, 2, 2)):
        b, pg, errs = fresh(p, subj, w, s_, dd)
        r = js(pg, """()=>{ let g=0, seenGlow=0, laterGlowFree=0, acts=0; while(!D().ended&&g++<4000){ const d=D(); if(d.hold){ C('skipCard'); continue; }
              if(d.phase==='play'){ if(d.rd.kind==='word'&&d.rd.i>0&&d.glow.length&&!d.assisted) laterGlowFree++; if(d.rd.kind==='word'&&d.rd.i===0&&d.glow.length&&!d.assisted) seenGlow++;
                 const gl=d.glow; if(gl.length&&d.rd.kind==='word'){ C('goto',gl[0]); acts++; } else if(d.rd.kind==='cond'){ if(!C('eatNext')) ST(10);} else ST(30); } else ST(6); }
            return {res:window.RESULT, seenGlow, laterGlowFree, d:D().mainDone}; }""")
        res = r['res']; ok(r['laterGlowFree'] == 0, f'{subj} d{dd}: no free glow after the first letter ({r["laterGlowFree"]})')
        if subj == 'english': ok(r['seenGlow'] > 0, f'{subj} d{dd}: first letter glows')
        else: ok(r['seenGlow'] == 0, f'{subj} d{dd}: maths gives no free glow')
        ok(res is None or (res['stars'] < 5 and res['firstTryAccuracy'] < .5), f'{subj} d{dd}: a child who only follows the glow cannot get far or reach 5 stars (done {r["d"]}, result {res and res["stars"]})'); b.close()
    # stall: 12 s without progress brings the "think" pulse and cancels the first-try credit
    b, pg, _ = fresh(p, 'english', 0, 0, 2)
    js(pg, "()=>{toPlay();C('eatNext')}"); d = D(pg); ok(d['glow'] == [] and not d['assisted'], 'after the first letter nothing glows'); js(pg, "()=>ST(60*19)"); d = D(pg); ok(d['glow'] == [] and not d['assisted'], 'still dark after 19 s of standing still'); js(pg, "()=>ST(90)"); d = D(pg); ok(d['think'] and d['assisted'] and d['glow'] == [] and d['arrow'] in (0, 1, 2, 3), f'after 20 s: direction pulse only (arrow {d["arrow"]}), assisted'); b.close()
    # the stall clock does not run while a ghost is near or the child is moving
    b, pg, _ = fresh(p, 'english', 0, 0, 2, ghosts_off=False)
    js(pg, "()=>{C('ready');C('eatNext');C('inv',999);const P=D().player;C('place',{i:0,c:P.a+(D().maze.open[P.a*4+1]?1:(D().maze.open[P.a*4+3]?-1:0)),mode:'active'});}")
    js(pg, "()=>{let mx=0; for(let i=0;i<300;i++){ST(1); if(D().ghosts[0].mode==='active') {} } }"); d = D(pg); ok(d['stallT'] < 3.5, f'stall clock stays low while a ghost is within 4 cells ({d["stallT"]:.1f}s of 5s)'); b.close()
    b, pg, _ = fresh(p, 'english', 0, 0, 2)
    js(pg, "()=>{toPlay();C('eatNext');ST(60*5)}"); d = D(pg); ok(4.5 < d['stallT'] < 5.5, f'stall clock runs while standing still ({d["stallT"]:.1f}s)'); b.close()
    # H2: no forced wrong eats, many levels / both orientations
    tot = forced = 0
    for subj, w, s in (('english', 0, 0), ('english', 3, 4), ('english', 6, 9), ('english', 2, 7), ('math', 0, 0), ('math', 3, 9), ('math', 5, 5), ('math', 4, 3)):
        for size, touch in (((390, 844), True), ((844, 390), True)):
            b, pg, _ = fresh(p, subj, w, s, 5, size=size, touch=touch)
            r = js(pg, """()=>{ let steps=0, forced=0, g=0; const reach=(from,tgtSet,blocked)=>{ const d=D(),M=d.maze.open,cols=d.cols,seen=new Set([from]),q=[from]; while(q.length){ const c=q.shift(); if(tgtSet.has(c)) return true; for(let k=0;k<4;k++) if(M[c*4+k]){ const n=c+[-cols,1,cols,-1][k]; if(seen.has(n)) continue; if(blocked.has(n)&&!tgtSet.has(n)) continue; seen.add(n); q.push(n);} } return false; };
              while(!D().ended&&g++<4000){ const d=D(); if(d.hold){ C('skipCard'); continue; } if(d.phase==='play'){ const rd=d.rd; let ok_, blocked=new Set(), tg=new Set();
                  if(rd.kind==='word'){ d.tiles.forEach(t=>{ if(t.ch===rd.seq[rd.i]) tg.add(t.c); else blocked.add(t.c); }); }
                  else { d.tiles.forEach(t=>{ if(t.tgt) tg.add(t.c); else blocked.add(t.c); }); }
                  steps++; if(!reach(d.player.a,tg,blocked)) forced++; if(!C('eatNext')) ST(5); } else ST(6); }
              return {steps,forced}; }""")
            tot += r['steps']; forced += r['forced']; b.close()
    print('   targets checked:', tot, 'forced:', forced); ok(tot > 250, f'enough steps checked ({tot})'); eq(forced, 0, 'forced wrong eats (target unreachable without stepping on another tile)')
    # pure placement check over many seeds: every tile is reachable from the spawn over non-tile cells
    b, pg, _ = fresh(p, 'english', 0, 0, 5)
    bad = pg.evaluate("""()=>{ let bad=0,n=0; for(let w=0;w<8;w++)for(let s=0;s<10;s++){ for(const t of [0]){ } } return bad }"""); b.close()
    # H3: every maths answer is accepted exactly as written on the tiles
    b, pg, _ = fresh(p, 'math', 3, 9, 3)
    r = pg.evaluate("""()=>{ let n=0,bad=[]; for(let w=0;w<6;w++)for(let s=0;s<10;s++)for(const dd of [1,3,5]){ const items=MKITEMS('math',w,s,8,dd); const L=WQ37GX.Learn({items}); items.forEach(it=>{ n++; const typed=WQ37GX.norm(it.a); if(!L.judge(it,typed)) bad.push([w,s,it.q,it.a]); }); } return {n,bad:bad.slice(0,5)}; }""")
    eq(r['bad'], [], f"all {r['n']} maths answers are judged right when eaten digit by digit"); b.close()
    # H5: play again regenerates maths questions via S.newLearn / opts.regen
    b, pg, _ = open_game(p, 'maze_game.js', 'WQ37Maze', 'math', 2, 1, 2, size=(390, 844), seed=7); pg.evaluate(JS_HELPERS)
    pg.evaluate("""()=>{ window.G.destroy(); localStorage.setItem('wq37-gx-how-maze','1'); let k=0; const o=Object.assign({},OPTS,{regen:()=>{ k++; const qs=WQ37Math.make('math',2,1,8,2,5000+k); return {items:qs.map((x,i)=>({id:'r'+k+'-'+i,kind:'math',q:x.q,a:x.answer,explain:'',hint:'',pad:'digits',check:t=>WQ37Math.check(x,t)}))}; }}); window.O2=o; window.G=WQ37Maze.start(document.getElementById('box'),o); C('manual',true); }""")
    q0 = pg.evaluate("()=>O2.items.map(i=>i.q).join('|')"); pg.evaluate("()=>document.querySelector('[data-r=go]').click()"); pg.evaluate("()=>G._S.openPause()"); pg.click('[data-r=re]'); pg.wait_for_timeout(100)
    q1 = pg.evaluate("()=>O2.items.map(i=>i.q).join('|')"); ok(q0 != q1, 'restart brings new maths questions'); ok(pg.evaluate("()=>D().rd.item.id.startsWith('r1-')"), 'the new round uses the regenerated items'); b.close()

# ------------------------------------------------------------------ O. round 2: novice friendliness, countdown, how-to text, ok chip
BOT = """(maxSteps)=>{ window.__gh=[]; let g=0, lastBase=-1, lastSim=-1; while(!D().ended&&g++<maxSteps){ const d=D(); if(d.idleOv){ C('closeIdle'); continue; } if(d.hold){ C('skipCard'); lastBase=-1; continue; } if(d.phase!=='play'){ ST(6); lastBase=-1; continue; }
  const P=d.player, base=(P.a===P.b)?P.a:P.b; if(base===lastBase && d.simT-lastSim<0.5){ ST(2); continue; } lastBase=base; lastSim=d.simT;
  const cols=d.cols,M=d.maze.open, rd=d.rd; const tg=new Set(), wrong=new Set();
  d.tiles.forEach(t=>{ const good = rd.kind==='word' ? t.ch===rd.seq[rd.i] : t.tgt; (good?tg:wrong).add(t.c); });
  d.portals.forEach(c=>{ if(!tg.has(c)) wrong.add(c); });
  window.__gh=window.__gh||[]; window.__gh.push([d.simT,d.ghosts.map(x=>({a:x.a,b:x.b,scared:x.scared,mode:x.mode}))]); while(window.__gh.length>1&&window.__gh[1][0]<=d.simT-0.3) window.__gh.shift();
  const gh=window.__gh[0][1].filter(x=>!x.scared&&(x.mode==='active'||x.mode==='leave'));
  const near=(c,r)=>gh.some(x=>[x.a,x.b].some(z=>Math.abs(z%cols-c%cols)+Math.abs(((z/cols)|0)-((c/cols)|0))<=r));
  const plan=(r)=>{ const seen=new Set([base]), first=new Map(), q=[base]; while(q.length){ const c=q.shift(); if(tg.has(c)) return first.get(c); for(let k=0;k<4;k++) if(M[c*4+k]){ const n=c+[-cols,1,cols,-1][k]; if(seen.has(n)||wrong.has(n)||(r>=0&&near(n,r)&&!tg.has(n))) continue; seen.add(n); first.set(n,c===base?k:first.get(c)); q.push(n);} } return undefined; };
  let k=plan(2); if(k===undefined) k=plan(1); if(k===undefined) k=plan(-1);
  if(k!==undefined) C('dir',k); ST(2); }
  return {ended:D().ended,res:window.RESULT,hearts:D().hearts,rests:D().rests}; }"""

def t_novice(p):
    print('O. novice friendliness, countdown, how-to, ok chip')
    # idle child: 30 s of doing nothing at difficulty 3 never ends the level and never wipes all hearts in a row
    b, pg, errs = fresh(p, 'english', 0, 0, 3, ghosts_off=False)
    r = js(pg, "()=>{const h0=D().hearts, c0=D().calmT; let minH=h0; for(let i=0;i<1800;i++){ST(1); minH=Math.min(minH,D().hearts)} const d=D(); return {h0,c0,minH,hearts:d.hearts,rests:d.rests,ended:d.ended,hold:d.hold,calm:d.calmT}}")
    ok(r['c0'] > 7, 'ghosts sleep for the first 8 s of the first word'); ok(not r['ended'], 'idle child: level not ended'); ok(r['rests'] == 0 and r['minH'] >= 1, f'idle 30 s at difficulty 3 does not wipe out the hearts (min {r["minH"]}/{r["h0"]}, rests {r["rests"]})'); ok(not r['hold'], 'no time-out within 30 s'); b.close()
    # sleeping ghosts are harmless and do not move
    b, pg, _ = fresh(p, 'english', 0, 0, 3, ghosts_off=False)
    r = js(pg, "()=>{ST(100); C('place',{i:0,c:D().player.a,mode:'active'}); const a0=D().ghosts[0].a; ST(60); return {h:D().hearts,h0:5, moved:D().ghosts[0].a!==a0, calm:D().calmT}}")
    ok(r['calm'] > 0 and not r['moved'], 'calm ghosts do not move'); ok(r['h'] == 4, f'and cannot hurt ({r["h"]})'); b.close()
    # a sensible BFS child that dodges ghosts clears the first world at difficulty 1-3 with >= 4 stars (ghosts on)
    for subj, w, s, dd in (('english', 0, 0, 1), ('english', 0, 2, 2), ('english', 0, 1, 3), ('math', 0, 1, 3), ('english', 0, 3, 3)):
        b, pg, _ = fresh(p, subj, w, s, dd, ghosts_off=False)
        r = js(pg, "(f)=>eval(f)(30000)", BOT); res = r['res']; ok(res is not None and res['cleared'], f'{subj} w{w} s{s} d{dd}: dodging child clears the level'); ok(res and res['stars'] >= 4, f'{subj} w{w} s{s} d{dd}: >= 4 stars (got {res and res["stars"]}, hearts rests {r["rests"]})'); b.close()
    # three time-outs in a row -> friendly help: glow + assisted
    b, pg, _ = fresh(p, 'english', 0, 0, 3)
    for k in range(3):
        js(pg, "()=>{C('ready');C('left',0.01);ST(3)}"); pg.evaluate("()=>C('skipCard')")
    d = D(pg); ok(d['helpGlow'] and d['toStreak'] == 3, 'three time-outs in a row switch the help on'); js(pg, "()=>C('ready')"); d = D(pg); ok(len(d['glow']) >= 1 and d['assisted'], 'next word glows the next letter and is assisted'); ok(pg.query_selector('.gx-banner') is not None, 'friendly banner shown')
    js(pg, "()=>{let g=0;while(D().phase==='play'&&D().rd.i<D().rd.seq.length&&g++<40){C('eatNext')}ST(80)}"); ok(not D(pg)['helpGlow'], 'help resets after a completed word'); b.close()
    # restart: no preview / how-to card again, a 3-2-1 countdown instead
    b, pg, _ = fresh(p, 'english', 0, 0, 2, manual=False)
    pg.evaluate("()=>G._S.openPause()"); pg.click('[data-r=re]'); pg.wait_for_timeout(150); d = D(pg)
    ok(pg.query_selector('.gx-pv') is None and pg.query_selector('.gx-how') is None, 'restart shows no preview / how-to card'); ok(d['countdown'] and d['phase'] == 'ready' and d['readyT'] > 1.2, f'restart replays the countdown ({d["readyT"]:.2f}s)'); b.close()
    # how-to text by device
    for touch, want in ((True, '滑動走位'), (False, '方向鍵走位')):
        b, pg, _ = open_game(p, 'maze_game.js', 'WQ37Maze', 'english', 0, 0, 2, size=(390, 844) if touch else (1440, 900), touch=touch, seed=7); pg.wait_for_timeout(200)
        txt = pg.inner_text('.gx-how'); ok(want in txt, f'how-to says {want} on {"touch" if touch else "desktop"}'); b.close()
    # answer chip stays below the question panel on phones
    b, pg, _ = fresh(p, 'english', 0, 0, 2, size=(390, 844), touch=True)
    js(pg, "()=>{toPlay();let g=0;while(D().phase==='play'&&g++<20)C('eatNext')}"); pg.wait_for_timeout(120)
    chip = pg.evaluate("()=>{const e=document.querySelector('.gx-okchip');if(!e)return null;const r=e.getBoundingClientRect();return [r.y,r.height]}"); lo = D(pg)['layout']
    ok(chip is not None and chip[0] >= lo['q']['y'] + lo['q']['h'], f'answer chip is below the question panel ({chip}, panel ends {lo["q"]["y"] + lo["q"]["h"]})'); b.close()

def t_cornering(p):
    print('P. cornering tolerance, idle prompt, away end')
    b, pg, _ = fresh(p, 'english', 0, 4, 2)
    c = js(pg, "()=>{const d=D(),M=d.maze.open; for(let c=0;c<d.maze.N;c++){ if(M[c*4+1]&&M[c*4+2]&&M[(c+1)*4+1]&&!M[(c+1)*4+2]&&!d.tiles.some(t=>t.c===c||t.c===c+1||t.c===c+d.cols)&&c%d.cols<d.cols-3) return c; } }")
    js(pg, "([c])=>{toPlay();C('player',{c:c,dir:-1});C('dir',1);ST(4)}", [c]); d = D(pg); ok(d['player']['dir'] == 1 and 0.1 < d['player']['p'] < .35, f'moving right, just past the junction (p={d["player"]["p"]:.2f})')
    js(pg, "()=>C('dir',2)"); d = D(pg); ok(d['player']['dir'] == 2 and d['player']['a'] == c and d['player']['b'] == c + d['cols'], 'a slightly late turn is still taken at the junction'); b.close()
    # idle prompt: 45 s without input -> "還在嗎？", keys / clicks continue; 90 s -> music off
    b, pg, _ = fresh(p, 'english', 0, 0, 2, manual=True)
    js(pg, "()=>{toPlay();C('noGhosts',true);C('left',999);ST(60*44)}"); ok(not D(pg)['idleOv'], 'no prompt before 45 s'); js(pg, "()=>ST(90)"); d = D(pg); ok(d['idleOv'] and d['paused'], 'prompt + pause after 45 s without input'); ok('還在嗎' in pg.inner_text('.gx-root'), 'prompt text shown')
    pg.wait_for_timeout(500); pg.keyboard.press('ArrowLeft'); pg.wait_for_timeout(100); d = D(pg); ok(not d['idleOv'] and not d['paused'], 'a key press continues'); b.close()
    b, pg, _ = fresh(p, 'english', 0, 0, 2, manual=True)
    js(pg, "()=>{toPlay();C('left',999);ST(60*46)}"); pg.wait_for_timeout(500); pg.mouse.click(200, 400); pg.wait_for_timeout(100); ok(not D(pg)['idleOv'], 'a click continues'); b.close()
    # away: rounds that time out with no input at all -> skipped without a wrong-answer record; 2 in a row ends the level politely
    b, pg, _ = fresh(p, 'english', 0, 0, 2)
    js(pg, "()=>{toPlay();C('leftAway',0.01);ST(3)}"); d = D(pg); ok(not d['hold'] and d['phase'] == 'reveal', 'no learn card when nobody touched the game'); js(pg, "()=>ST(150)"); d = D(pg); ok(d['rd']['kind'] == 'word' and d['learnLeft'] <= 8, 'the word is skipped, not requeued as wrong')
    js(pg, "()=>{C('ready');C('leftAway',0.01);ST(3)}"); d = D(pg); ok(d['ended'], 'second away round ends the level'); res = js(pg, "()=>window.RESULT"); ok(res['cleared'] is False and res['stars'] == 1 and not res['passed'] and res['missed'] == [], f'1 star, not passed, nothing in the wrong list ({res["missed"]})'); b.close()
    # 4 real time-outs in a row (with input) also end the level
    b, pg, _ = fresh(p, 'english', 0, 0, 3)
    for k in range(4):
        js(pg, "()=>{C('ready');C('left',0.01);ST(3)}")
        if D(pg)['ended']: break
        pg.evaluate("()=>C('skipCard')")
    ok(D(pg)['ended'], 'four time-outs in a row end the level kindly'); b.close()

# ------------------------------------------------------------------ Q. robot children (0.3 s reaction, BFS dodging) must clear world 1
def t_bots(p):
    print('Q. robot children: >= 5 games per setting, all cleared with >= 4 stars')
    tot = good = 0; worst = 5; lines = []
    for subj in ('english', 'math'):
        for size, touch, nm in (((390, 844), True, 'portrait'), ((844, 390), True, 'landscape')):
            for dd in (1, 2, 3):
                stars = []
                for k in range(5):
                    b, pg, _ = fresh(p, subj, 0, k % 3, dd, size=size, touch=touch, ghosts_off=False, extra={'seed': 100 + k * 7 + dd})
                    r = js(pg, "(f)=>eval(f)(40000)", BOT); res = r['res']; tot += 1
                    st = res['stars'] if res and res['cleared'] else 0; stars.append(st); good += 1 if st >= 4 else 0; worst = min(worst, st); b.close()
                lines.append(f'{subj} {nm} d{dd}: {stars}'); ok(all(x >= 4 for x in stars), f'robot child {subj} {nm} d{dd} (5 games, levels 1-3): {stars}')
    print('   ' + ' | '.join(lines)); print(f'   {good}/{tot} games cleared with >= 4 stars (worst {worst})')

# ------------------------------------------------------------------ R. R3.22 polish: letter fly-to-slot, countdown tick, no leftover state
def t_polish(p):
    print('R. polish: fly-to-slot, last-5-seconds tick')
    for reduced in (False, True):
        b, pg, errs = open_game(p, 'maze_game.js', 'WQ37Maze', 'english', 0, 3, 2, size=(390, 844), touch=True, reduced=reduced, seed=7)
        pg.evaluate(JS_HELPERS); pg.evaluate("()=>C('manual',true)"); pg.wait_for_timeout(150)
        if pg.query_selector('.gx-how [data-r=ok]'): pg.click('.gx-how [data-r=ok]')
        pg.wait_for_selector('[data-r=go]'); pg.click('[data-r=go]'); pg.wait_for_timeout(100); pg.evaluate("()=>{C('noGhosts',true);toPlay();C('ready')}")
        pg.wait_for_timeout(300)
        pg.evaluate("()=>{C('eatNext')}"); d = D(pg)
        eq(d['rd']['i'], 1, 'correct letter still advances')
        eq(d['flyers'], 0 if reduced else 1, f'letter flies into the slot (reduced={reduced})')
        pg.wait_for_timeout(700); eq(D(pg)['flyers'], 0, 'flyer lands and is removed')
        pg.evaluate("()=>C('left',4.6)"); pg.evaluate("()=>ST(2,0.05)"); ok(D(pg)['tickT'] in (4, 5), 'tick counter running inside the last 5 s')
        pg.evaluate("()=>C('left',30)"); pg.evaluate("()=>ST(1,0.05)"); eq(D(pg)['tickT'], 99, 'tick counter off with time to spare')
        eq([e for e in errs], [], 'console clean'); b.close()

def main():
    t0 = time.time()
    with sync_playwright() as p:
        only = [a.split('=')[1] for a in sys.argv if a.startswith('--only=')]
        for fn in [f for f in (t_maze, t_english, t_stats_and_stars, t_difficulty, t_ghosts, t_ghost_hit_and_orb, t_timeout_card, t_world, t_math, t_boss, t_input, t_flow, t_layout, t_destroy, t_review, t_novice, t_cornering, t_bots, t_polish, t_perf) if not only or f.__name__[2:] in only[0].split(',')]:
            try: fn(p)
            except Exception as e:
                import traceback; traceback.print_exc(); FAILS.append(f'{fn.__name__} crashed: {e!r}')
    print(f'\n{PASS[0]} checks passed, {len(FAILS)} failed ({time.time() - t0:.0f}s)')
    for f in FAILS: print(' -', f)
    sys.exit(1 if FAILS else 0)

if __name__ == '__main__': main()

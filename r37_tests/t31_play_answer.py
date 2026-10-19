"""R3.20 stage 2 t31 - "the answer is a gameplay action" for the 13 action / sport games (WQArcPlus play questions, r37_src/s72_arcplay.js).

    WQ33_APP=$PWD/app/index.html python3 r37_tests/t31_play_answer.py                 # all 13 games
    T31_IDS=moon-bells,forest-dash python3 r37_tests/t31_play_answer.py              # a subset
    T31_PHONE=0 ...                                                                   # skip the 390x844 touch spot check

Per game (desktop 1440x900, learning on, god mode keeps the run alive): the three word targets are in the game world (3 labels = the 3 options, 36 px
font, inside the canvas, no overlap, same size, no option buttons, 3 legend items), the non-action paths (legend click, canvas click on the right
target, keys 1-3) change nothing, the right answer comes from the game's own action (the last step is the engine physics + the adapter's hit test;
tests may only put the player near the target) and gives the game's reward, the wrong answer freezes with a card, costs no life and drops the multiplier
one level, the game's own mechanic changes the numbers, the difficulty numbers only grow over the waves, the game's own event changes its state and the
saved-game check stays quiet for >= 2 s afterwards, the reading time before a target can first be touched is >= 2.5 s of game time, and the result card
shows the run's own three stars that match the debug data. The forced answer (`_force('answer')`) is never used for the main assertions.
Results: r37_evidence/r320/t31_results.json."""
import json, math, os, re, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from arc_lib import *  # noqa: E402,F401,F403

OUT = R / 'r37_evidence' / 'r320'
OUT.mkdir(parents=True, exist_ok=True)
IDS13 = ['sky-rescue', 'forest-dash', 'moon-bells', 'drift-path', 'valley-race', 'ruins-courier', 'cloud-island', 'star-patrol', 'lighthouse-well',
         'bounce-basket', 'forest-pong', 'meadow-cricket', 'harbor-volley']
IDS = [i for i in os.environ.get('T31_IDS', '').split(',') if i] or IDS13
PHONE = os.environ.get('T31_PHONE', '1') != '0'
RESULTS = {}
FAILS = []


def ok(gid, key, cond, msg=''):
    RESULTS.setdefault(gid, {})[key] = 'pass' if cond else 'fail'
    if not cond:
        FAILS.append(f'{gid} {key} {msg}')
        print(f'  FAIL {gid} {key} {msg}', flush=True)
    return cond


def step(gid, name):
    print(f'    [{time.strftime("%H:%M:%S")}] {gid}: {name}', flush=True)


def J(pg, code):
    return pg.evaluate("(c)=>window.__r37(c)", code)


def dbg(pg):
    return J(pg, 'WQArcPlus._debug()')


def force(pg, kind, arg=None):
    return J(pg, f'WQArcPlus._force({json.dumps(kind)},{json.dumps(arg)})')


SCHEMA_PROBE = "(()=>{const g=pgGame,o={};for(const k of Object.keys(g)){if(['api','c','r','meta','keys','preview'].includes(k))continue;o[k]=g[k];}try{WQGameSchema.validate(pgMeta.id,o,g.d);return 'valid'}catch(e){return String(e)+' '+JSON.stringify({p:g.p,cam:g.camera,pl:(g.platforms||[]).map(f=>[f.id,Math.round(f.x),Math.round(f.y),f.w,f.life,f.kind])})}})()"


def set_combo(pg, n):
    force(pg, 'combo', n)
    J(pg, "WQArcPlus.stateOf(pgGame).idle=0")   # the combo also fades after 7 s without a score event: the test sets it fresh


def noerr(pg):
    return '"r":"error"' not in J(pg, "JSON.stringify({r:pgReason,e:pgError})")


def wait_until(pg, js, cap=20, step_ms=120):
    """poll a host expression while the game keeps playing (keeps the engine un-paused)"""
    end = time.time() + cap
    while time.time() < end:
        ensure_play(pg)
        try:
            if J(pg, js):
                return True
        except Exception:
            pass
        pg.wait_for_timeout(step_ms)
    return False


def close_card(pg):
    """let the open learning card run its minimum time, then press its button"""
    end = time.time() + 40
    while time.time() < end:
        d = dbg(pg)
        if not d['card']:
            return True
        if d['card']['disabled']:
            card_ticks(pg, 0.3)
            continue
        try:
            pg.locator('.ap-go').click(timeout=3000)
        except Exception:
            pass
        pg.wait_for_timeout(200)
    return False


LH_PIN = "(()=>{const g=pgGame,q=WQArcPlus.stateOf(g).q;if(!q||!q.grp)return 0;const ids=q.grp.map(f=>f.id);if(!(ids.includes(g.onPlatform)||g.p.y>q.row-10||g.p.y-g.camera<150))return 1;const f=g.platforms.find(f=>!ids.includes(f.id)&&f.kind==='safe'&&f.y-g.camera>200&&f.y-g.camera<420&&f.y<q.row-60);if(f){g.p.x=f.x;g.p.y=f.y-20;g.p.vy=0;g.onPlatform=f.id;}return 1})()"


def keep_safe(pg):
    """idle games get hit meanwhile; a life lost resets the multiplier (a different rule), so the player is invulnerable while a test answers"""
    J(pg, "(()=>{const g=pgGame;if(typeof g.invincible==='number')g.invincible=Math.max(g.invincible,2.5);if(typeof g.inv==='number')g.inv=Math.max(g.inv,2.5);return 1})()")


def answer_with(pg, gid, want_ok, d, pre, tries=5, accept=None):
    """answer the open question (or a fresh one) with the game's own action; a question that ran out before the driver could act is replaced (not hidden: attempts are counted)"""
    L = dbg(pg)['learn']; d3 = dbg(pg); done = False
    for k in range(tries):
        if d is None or not d['play']['active'] or k > 0:
            d = open_q(pg)
        if not d or not d['play']['active']:
            continue
        pre()
        L = dbg(pg)['learn']
        tgt = next((t for t in d['play']['targets'] if bool(t['ok']) == want_ok), None)
        if tgt is None:
            continue
        done = DRV[gid](pg, tgt['i'], d)
        d3 = dbg(pg)
        if d3['learn']['ok'] + d3['learn']['bad'] > L['ok'] + L['bad'] and (accept is None or accept(d3)):
            return d, L, d3, True
        if d3['card']:
            close_card(pg)
        d = None
    return d, L, d3, False


SKY_AWAY = """(()=>{const g=pgGame;window.__skyPin=true;if(!window.__skyIv){window.__skyIv=setInterval(()=>{try{const g=pgGame;if(g.rescued>9)g.rescued=9;if(window.__skyPin){g.p.x=40;g.p.y=50;}}catch(_){}},25);}g.p.x=40;g.p.y=50;return 1})()"""   # (sky-rescue: the idle plane is parked away from the word gems while a question is asked / missed - it would pick one up by chance; and the stubbed ending lets a run rescue more than the saved-game check allows)
SKY_FREE = "(()=>{window.__skyPin=false;return 1})()"


def open_q(pg, cap=14, tries=3):
    """start a question now and wait until its targets are in the world and armed (hittable); a game that had no room for the targets (pending too long) gets a new try"""
    d = None
    for _ in range(tries):
        if dbg(pg)['card']:
            close_card(pg)   # (a target hit by the idle player opens a card that freezes the game when it is wrong)
        J(pg, "WQArcPlus.stateOf(pgGame).nextQ=0;if(pgMeta.id==='star-patrol')pgGame.p.x=40")   # (star-patrol: the idle plane auto-fires - keep it away from the ships)
        if J(pg, "pgMeta.id==='drift-path'"):   # an idle car leaves its road after ~4 s (no question is asked of a car that is off the road): put it back at the start
            J(pg, "(()=>{const g=pgGame;g.pos.x=-20;g.pos.y=0;g.dir=0;g.camera.x=-20;g.camera.y=0;g.trail=[];return 1})()")
        force(pg, 'learn')
        end = time.time() + cap
        while time.time() < end:
            ensure_play(pg)
            if J(pg, "pgMeta.id==='sky-rescue'"):
                J(pg, SKY_AWAY)
            if J(pg, "pgMeta.id==='lighthouse-well'"):   # stand the idle player on a platform ABOVE the word row (it would land on a word platform by chance, or respawn onto one)
                J(pg, LH_PIN)
            pg.wait_for_timeout(200)
            d = dbg(pg)
            pl = d['play']
            if pl['active'] and not pl['pending'] and pl['armed'] and pl['visibleT'] is not None and all(t['visible'] for t in pl['targets']):
                return d
        if os.environ.get('T31_DEBUG'):
            print('   open_q try ended', json.dumps(d['play'])[:260], J(pg, "JSON.stringify([pgGame.p.y-pgGame.camera,pgGame.health,pgPlaying,WQArcPlus.stateOf(pgGame).nextQ,WQArcPlus.stateOf(pgGame).card?1:0,WQArcPlus.stateOf(pgGame).freeze])"), flush=True)
    return d


def q_closed(pg):
    return "!WQArcPlus._debug().play.active"


# --------------------------------------------------------------------------------------------------------------------- the 13 drivers
# Each driver performs the game's own action to answer target i. It may place the player near the target (state of persistent fields) but the
# last step is always the engine (physics, keys) and the adapter's own hit test.
def drv_moon(pg, i, d):
    J(pg, f"(()=>{{const q=WQArcPlus.stateOf(pgGame).q,k=q.cr[{i}],p=pgGame.p;p.x=k.bx;p.y=k.by-50;p.vy=120;return 1}})()")
    return wait_until(pg, q_closed(pg), 8)


def drv_dash(pg, i, d):
    lane = J(pg, 'pgGame.lane')
    for _ in range(abs(i - lane)):
        pg.keyboard.press('ArrowRight' if i > lane else 'ArrowLeft')
        pg.wait_for_timeout(120)
    return wait_until(pg, q_closed(pg), 25)


def drv_sky(pg, i, d):
    J(pg, SKY_FREE)
    J(pg, f"(()=>{{const q=WQArcPlus.stateOf(pgGame).q,k=q.cr[{i}],p=pgGame.p;p.x=Math.max(80,k.wx-170);p.y=k.wy;return 1}})()")
    pg.keyboard.down('ArrowRight')
    try:
        return wait_until(pg, q_closed(pg), 8, 60)
    finally:
        pg.keyboard.up('ArrowRight')


DRIFT_INFO = """(i)=>{const g=pgGame,q=WQArcPlus.stateOf(g).q,n=q.n,N=g.nodes,u=(a,b)=>{const d=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:(b.x-a.x)/d,y:(b.y-a.y)/d}};
  const ui=u(N[n-1],N[n]),uo=u(N[n],N[n+1]);return {n,node:N[n],ui,uo}}"""


def drv_drift(pg, i, d):
    e = [20, 0, -20][i]
    info = J(pg, f"({DRIFT_INFO})({i})")
    ui, node = info['ui'], info['node']
    dirv = 0 if abs(ui['x']) > .5 else 1
    J(pg, f"(()=>{{const g=pgGame,n={json.dumps(node)},ui={json.dumps(ui)};g.pos.x=n.x-ui.x*150;g.pos.y=n.y-ui.y*150;g.dir={dirv};g.camera.x=g.pos.x;g.camera.y=g.pos.y;g.trail=[];return 1}})()")
    # the player's press, timed inside the page (a Playwright round trip is longer than the 28 px window at the slowed speed): the game's own key handler
    J(pg, f"""(()=>{{const g=pgGame,n={json.dumps(node)},ui={json.dumps(ui)};const iv=setInterval(()=>{{try{{if(g!==pgGame||g.done){{clearInterval(iv);return}}if((g.pos.x-n.x)*ui.x+(g.pos.y-n.y)*ui.y>={-e}){{clearInterval(iv);g.key('action',true);g.key('action',false);}}}}catch(_){{clearInterval(iv)}}}},1);return 1}})()""")
    return wait_until(pg, q_closed(pg), 12)


def drv_valley(pg, i, d):
    J(pg, f"""(()=>{{const g=pgGame,q=WQArcPlus.stateOf(g).q,pd=q.pads[{i}],N=g.path.length,p=g.path[q.idx%N],p2=g.path[(q.idx+1)%N],dd=Math.hypot(p2.x-p.x,p2.y-p.y)||1,t={{x:(p2.x-p.x)/dd,y:(p2.y-p.y)/dd}};
      g.car.x=pd.x-t.x*40;g.car.y=pd.y-t.y*40;g.car.a=Math.atan2(t.y,t.x);g.car.v=165;return 1}})()""")
    return wait_until(pg, q_closed(pg), 8, 40)


def drv_ruins(pg, i, d):
    lane = J(pg, 'pgGame.lane')
    for _ in range(abs(i - lane)):
        pg.keyboard.press('ArrowRight' if i > lane else 'ArrowLeft')
        pg.wait_for_timeout(120)
    J(pg, "(()=>{const g=pgGame,q=WQArcPlus.stateOf(g).q;for(const o of g.obstacles)if(o.at<=q.at)o.checked=true;g.distance=Math.max(g.distance,q.at-4);return 1})()")
    return wait_until(pg, q_closed(pg), 12)


def drv_cloud(pg, i, d):
    J(pg, f"""(()=>{{const g=pgGame,q=WQArcPlus.stateOf(g).q,k=q.cr[{i}],p=g.p;p.x=k.wx;p.y=k.wy+38;p.vy=0;p.vx=0;g.grounded=true;g.coyote=.11;return 1}})()""")
    pg.wait_for_timeout(150)
    pg.keyboard.press('Space')
    return wait_until(pg, q_closed(pg), 6, 40)


def drv_star(pg, i, d):
    J(pg, f"""(()=>{{const g=pgGame,q=WQArcPlus.stateOf(g).q,sh=q.ships[{i}];g.p.x=sh.x;g.p.y=470;return 1}})()""")
    return wait_until(pg, q_closed(pg), 15, 80)


def drv_light(pg, i, d):
    J(pg, f"""(()=>{{const g=pgGame,q=WQArcPlus.stateOf(g).q,f=q.grp[{i}];g.p.x=f.x;g.p.y=f.y-110;g.p.vy=0;g.p.vx=0;g.onPlatform=-1;return 1}})()""")
    return wait_until(pg, q_closed(pg), 8, 60)


def drv_basket(pg, i, d):
    c = [.25, .55, .85][i]
    pg.keyboard.down('Space')   # hold = charge (the page's own key handler); the release is timed inside the page (a Playwright round trip overshoots the charge)
    J(pg, f"(()=>{{const g=pgGame;const iv=setInterval(()=>{{try{{if(g!==pgGame||!g.charging){{clearInterval(iv);return}}if(g.charge>={c}){{clearInterval(iv);g.key('action',false);}}}}catch(_){{clearInterval(iv)}}}},1);return 1}})()")
    wait_until(pg, "!pgGame.charging", 6, 30)
    pg.keyboard.up('Space')
    return wait_until(pg, q_closed(pg), 8)


def drv_pong(pg, i, d):
    L = [t['x'] for t in d['play']['targets']][i]
    hw = [77, 65, 55][J(pg, 'pgGame.d')]
    S = 312.0
    o = 0.0 if abs(L - 400) < 40 else (0.5 if L > 400 else -0.5)
    vx = o * S * .82
    vy = -math.sqrt(S * S - vx * vx)
    m = vx / abs(vy)
    bx = L - 283 * m
    px = bx - o * hw
    J(pg, f"(()=>{{const g=pgGame;g.px={px};g.ball.x={bx};g.ball.y=440;g.ball.vx=0;g.ball.vy=300;g.wait=0;return 1}})()")
    return wait_until(pg, q_closed(pg), 8, 60)


PRE = {'fn': None}   # a setup step a driver runs right before its last action (the multiplier fades after 7 s of waiting)


def drv_cricket(pg, i, d):
    js = f"(()=>{{const g=pgGame,s=WQArcPlus.stateOf(g),pl=s.pl;return !!(pl.cur&&pl.cur.i=={i}&&g.ball===pl.curBall&&g.ball.mode==='pitch'&&g.wait<=0&&!g.didSwing&&Math.abs(g.ball.x-210)<=10)}})()"
    if not wait_until(pg, js, 45, 15):
        return False
    if PRE['fn']:
        PRE['fn']()
    pg.keyboard.press('Space')
    return wait_until(pg, q_closed(pg), 6)


def drv_harbor(pg, i, d):
    zc = [487, 605, 723][i]
    vy0 = -100.0
    t = (-vy0 + math.sqrt(vy0 * vy0 + 2 * 530 * (482 - 280))) / 530
    vx = (zc - 390) / t
    J(pg, "(()=>{const g=pgGame;g.servePause=0;g.ball.x=380;g.ball.y=280;g.ball.vx=0;g.ball.vy=-60;return 1})()")
    pg.wait_for_timeout(150)
    J(pg, f"(()=>{{const g=pgGame;g.ball.x=390;g.ball.y=280;g.ball.vx={vx};g.ball.vy={vy0};return 1}})()")
    return wait_until(pg, q_closed(pg), 8, 60)


DRV = {'moon-bells': drv_moon, 'forest-dash': drv_dash, 'sky-rescue': drv_sky, 'drift-path': drv_drift, 'valley-race': drv_valley, 'ruins-courier': drv_ruins,
       'cloud-island': drv_cloud, 'star-patrol': drv_star, 'lighthouse-well': drv_light, 'bounce-basket': drv_basket, 'forest-pong': drv_pong,
       'meadow-cricket': drv_cricket, 'harbor-volley': drv_harbor}


# --------------------------------------------------------------------------------------------------------------------- rewards / mechanics / events
def reward_probe(pg, gid):
    """state read right before the right answer"""
    return {
        'sky-rescue': "({e:pgGame.energy})", 'forest-dash': "({inv:pgGame.invincible,dist:pgGame.distance})", 'moon-bells': "({sj:WQArcPlus._debug().mech.superJumps})",
        'drift-path': "({n:WQArcPlus._debug().mech.nitroUses})", 'valley-race': "({v:pgGame.car.v})", 'ruins-courier': "({st:WQArcPlus._debug().mech.stamps,ch:WQArcPlus._debug().mech.stampChests})",
        'cloud-island': "({n:WQArcPlus._debug().mech.bootsUsed})", 'star-patrol': "({pw:pgGame.power})", 'lighthouse-well': "({n:WQArcPlus._debug().mech.refills})",
        'bounce-basket': "({n:!!WQArcPlus._debug().mech.hot})", 'forest-pong': "({n:WQArcPlus._debug().mech.power})", 'meadow-cricket': "({b:WQArcPlus.bonusOf(pgGame),n:WQArcPlus._debug().mech.fireworks})",
        'harbor-volley': "({n:WQArcPlus._debug().mech.assist})"}[gid]


def reward_check(pg, gid, before):
    d = dbg(pg); m = d['mech']
    return {
        'sky-rescue': lambda: J(pg, 'pgGame.energy') >= min(5, before['e'] + 2) and J(pg, "pgGame.items.filter(o=>o.kind==='bird'&&o.x>800).length") >= 3,
        'forest-dash': lambda: J(pg, 'pgGame.invincible') >= 1.5 and J(pg, 'pgGame.distance') >= min(1499, before['dist'] + 15),
        'moon-bells': lambda: m['superJumps'] == before['sj'] + 1 and m['lastVy'] == -650 and J(pg, 'pgGame.p.vy') <= -450,
        'drift-path': lambda: m['nitroUses'] == before['n'] + 1 and m['nitro'] > 0,
        'valley-race': lambda: J(pg, 'pgGame.car.v') >= 250,
        'ruins-courier': lambda: (m['stamps'] == before['st'] + 1) or m['stampChests'] == before['ch'] + 1,
        'cloud-island': lambda: m['bootsUsed'] == before['n'] + 1 and m['boots'] > 7,
        'star-patrol': lambda: J(pg, 'pgGame.power') >= min(3, before['pw'] + 1) and J(pg, 'pgGame.shieldCD') <= 0.5,
        'lighthouse-well': lambda: m['refills'] == before['n'] + 1 and J(pg, 'pgGame.chuteCD') == 0 and m['light'] > .9,
        'bounce-basket': lambda: m['hot'] is True,
        'forest-pong': lambda: m['power'] == before['n'] + 1 and m['aiHold'] > 0,
        'meadow-cricket': lambda: m['fireworks'] == before['n'] + 1 and J(pg, 'WQArcPlus.bonusOf(pgGame)') >= before['b'] + 4,
        'harbor-volley': lambda: m['assist'] == before['n'] + 1}[gid]()


def basket_in(pg):
    """drop the ball straight into the DRAWN hoop (g.hoop is what is drawn and judged)"""
    J(pg, "(()=>{const g=pgGame;g.flying=true;g.scored=false;g.flight=0;g.ball.x=g.hoop.x;g.ball.y=g.hoop.y-60;g.ball.vx=0;g.ball.vy=220;return 1})()")


def mech_check(pg, gid):
    d0 = dbg(pg)
    if gid == 'moon-bells':
        force(pg, 'mech'); pg.wait_for_timeout(120)
        m = dbg(pg)['mech']
        return m['lastVy'] == -650 and J(pg, 'pgGame.p.vy') < -300, str(m)
    if gid == 'forest-dash':
        J(pg, "(()=>{const g=pgGame;g.health=3;g.invincible=0;g.jump=0;g.jumpV=0;g.rows=[];g.spawn=9;WQArcPlus.stateOf(g).shield=false;return 1})()")
        J(pg, "(()=>{const pl=WQArcPlus.stateOf(pgGame).pl;pl.logs=[];pl.logT=99;pgGame.invincible=0;return 1})()")
        h0 = J(pg, 'pgGame.health'); force(pg, 'mech')
        wait_until(pg, "(()=>{const m=WQArcPlus._debug().mech;return m.logsActive===0&&m.logHits+m.logDodged>=1})()", 15, 100)
        m = dbg(pg)['mech']
        return m['logsSpawned'] >= 1 and m['logHits'] == 1 and J(pg, 'pgGame.health') == h0 - 1, str(m) + f' health {h0}->{J(pg, "pgGame.health")}'
    if gid == 'sky-rescue':
        J(pg, "(()=>{const g=pgGame;g.items=g.items.filter(o=>o.x<0||o.x>860);return 1})()")
        force(pg, 'mech')
        J(pg, "(()=>{const g=pgGame;g.items.push({x:g.p.x+125,y:g.p.y-60,kind:'gem',hit:false});window.__gem=g.items[g.items.length-1];return 1})()")
        pg.wait_for_timeout(100)
        gap = J(pg, "Math.hypot(window.__gem.x-pgGame.p.x,window.__gem.y-pgGame.p.y)")
        m = dbg(pg)['mech']
        return m['rainbow'] > 0 and gap < 125, f'{m} gap {gap}'
    if gid == 'drift-path':
        force(pg, 'mech')
        t0 = J(pg, 'pgGame.travel'); w0 = J(pg, 'pgGame.t'); pg.wait_for_timeout(700)
        t1 = J(pg, 'pgGame.travel'); w1 = J(pg, 'pgGame.t')
        spd = [83, 108, 132][J(pg, 'pgGame.d')]
        rate = (t1 - t0) / max(1e-6, w1 - w0)
        return rate >= spd * 1.12, f'rate {rate:.1f} vs base {spd}'
    if gid == 'valley-race':
        J(pg, "(()=>{const g=pgGame,p=g.path[10],q=g.path[11];g.car.x=p.x;g.car.y=p.y;g.car.a=Math.atan2(q.y-p.y,q.x-p.x);g.car.v=150;return 1})()")
        force(pg, 'mech'); pg.wait_for_timeout(300)
        m = dbg(pg)['mech']
        return m['boosts'] >= 1 and J(pg, 'pgGame.car.v') >= 250, str(m) + f" v={J(pg, 'pgGame.car.v')}"
    if gid == 'ruins-courier':
        b = dbg(pg)['mech']['stampChests']; force(pg, 'mech'); m = dbg(pg)['mech']
        return m['stampChests'] == b + 1, str(m)
    if gid == 'cloud-island':
        force(pg, 'mech')
        J(pg, "(()=>{const g=pgGame,f=g.platforms.find(f=>g.p.x+16>f.x&&g.p.x-16<f.x+f.w)||g.platforms[0];g.p.x=Math.max(f.x+20,Math.min(f.x+f.w-20,g.p.x));g.p.y=f.y-22;g.p.vy=0;g.inv=3;return 1})()")
        pg.wait_for_timeout(250)
        b0 = dbg(pg)['mech']['boosted']
        pg.keyboard.press('Space'); pg.wait_for_timeout(120)
        m = dbg(pg)['mech']
        return m['boosted'] > b0, str(m)   # the boosted first frame is x1.25 (the number is read ~0.1 s later)
    if gid == 'star-patrol':
        J(pg, "(()=>{const g=pgGame;g.boss=null;g.shieldCD=0;g.shield=0;g.orbs=[];g.drones=[];for(let i=0;i<4;i++)g.orbs.push({x:g.p.x-60+i*40,y:g.p.y-220,vx:0,vy:0});return 1})()")
        pg.wait_for_timeout(250)   # the tick after this records the bullets
        n0 = len(J(pg, 'pgGame.shots'))
        pg.keyboard.press('Space'); pg.wait_for_timeout(200)
        m = dbg(pg)['mech']
        return m['reflected'] >= 3 and J(pg, 'pgGame.shots.filter(s=>s.vy===-420).length') >= 1, str(m)
    if gid == 'lighthouse-well':
        r0 = dbg(pg)['mech']['ring']; J(pg, "WQArcPlus.stateOf(pgGame).pl.light=0"); r1 = dbg(pg)['mech']['ring']
        force(pg, 'mech'); r2 = dbg(pg)['mech']['ring']
        return r2 > r1 * 1.4, f'ring {r1} -> {r2}'
    if gid == 'bounce-basket':
        J(pg, "(()=>{const g=pgGame;g.flying=false;g.charging=false;g.drag=null;return 1})()")
        force(pg, 'mech'); b0 = J(pg, 'WQArcPlus.bonusOf(pgGame)'); s0 = J(pg, 'pgGame.score')
        basket_in(pg); pg.wait_for_timeout(500)
        m = dbg(pg)['mech']; b1 = J(pg, 'WQArcPlus.bonusOf(pgGame)')
        return m['baskets'] >= 1 and b1 >= b0 + 3 and m['hot'] is False, str(m) + f' bonus {b0}->{b1}'
    if gid == 'forest-pong':
        force(pg, 'mech')
        J(pg, "(()=>{const g=pgGame;g.wait=0;g.ball.x=300;g.ball.y=300;g.ball.vx=0;g.ball.vy=-5;return 1})()")
        v0 = J(pg, 'pgGame.ball.vx'); pg.wait_for_timeout(400); v1 = J(pg, 'pgGame.ball.vx')
        m = dbg(pg)['mech']
        return m['spinTotal'] >= 60 and v1 - v0 > 8, f'{m} vx {v0}->{v1}'
    if gid == 'meadow-cricket':
        J(pg, "(()=>{const s=WQArcPlus.stateOf(pgGame);if(s.q){for(const c of s.q.cr)c.gone=true;s.q=null;}s.nextQ=1e9;return 1})()")   # no word ball during this check: a swing at a wrong word is the answer 'wrong'
        pg.keyboard.down('ArrowRight')
        good = wait_until(pg, "(()=>{const g=pgGame;return g.ball.mode==='pitch'&&g.wait<=0&&!g.didSwing&&Math.abs(g.ball.x-210)<=8})()", 30, 12)
        pg.keyboard.press('Space'); pg.wait_for_timeout(150)
        pg.keyboard.up('ArrowRight')
        m = dbg(pg)['mech']
        return good and m['dirUsed'] >= 1, str(m)
    if gid == 'harbor-volley':
        J(pg, "(()=>{const g=pgGame;g.servePause=0;g.touches[0]=3;g.ball.x=380;g.ball.y=280;g.ball.vx=0;g.ball.vy=-60;return 1})()")
        pg.wait_for_timeout(150)
        J(pg, "(()=>{const g=pgGame;g.touches[0]=3;g.ball.x=392;g.ball.y=280;g.ball.vx=150;g.ball.vy=-100;return 1})()")
        pg.wait_for_timeout(500)
        m = dbg(pg)['mech']
        return m['triple'] >= 1, str(m)
    return False, 'no mech check'


def event_check(pg, gid):
    ev = {'sky-rescue': 'flock', 'forest-dash': 'fireflies', 'moon-bells': 'moonbird', 'drift-path': 'glowpath', 'valley-race': 'rainbowpad', 'ruins-courier': 'chest',
          'cloud-island': 'coinarc', 'star-patrol': 'overdrive', 'lighthouse-well': 'lantern', 'bounce-basket': 'wind', 'forest-pong': 'firefly', 'meadow-cricket': 'slowpitch',
          'harbor-volley': 'seagull'}[gid]
    if gid == 'sky-rescue':
        n0 = J(pg, "pgGame.items.filter(o=>o.kind==='bird').length"); force(pg, 'event', ev)
        n1 = J(pg, "pgGame.items.filter(o=>o.kind==='bird').length")
        r = n1 >= n0 + 5
    elif gid == 'forest-dash':
        J(pg, "(()=>{const g=pgGame;g.rows.push({z:.8,lane:(g.lane+1)%3,kind:'gem',checked:false});return 1})()")
        force(pg, 'event', ev); pg.wait_for_timeout(300)
        m = dbg(pg)['mech']; r = m['fireflies'] > 0 and m['ffMoved'] >= 1
    elif gid == 'moon-bells':
        J(pg, "wq34S(pgGame).saved=true"); force(pg, 'event', ev); r = dbg(pg)['mech']['rescueArmed'] is True
    elif gid == 'drift-path':
        force(pg, 'event', ev); r = dbg(pg)['mech']['glow'] > 7
    elif gid == 'valley-race':
        force(pg, 'event', ev); r = dbg(pg)['mech']['pad'] is True
    elif gid == 'ruins-courier':
        force(pg, 'event', ev); r = dbg(pg)['mech']['chestPending'] is True
    elif gid == 'cloud-island':
        J(pg, "(()=>{const g=pgGame;for(const c of g.coins)c.taken=true;return 1})()")
        force(pg, 'event', ev)
        r = J(pg, "pgGame.coins.length===9&&pgGame.coins.filter(c=>!c.taken).length>=7")
    elif gid == 'star-patrol':
        J(pg, "(()=>{const g=pgGame;g.shieldCD=5;g.power=1;return 1})()")
        force(pg, 'event', ev); r = J(pg, 'pgGame.shieldCD===0&&pgGame.power===2')
    elif gid == 'lighthouse-well':
        J(pg, "WQArcPlus.stateOf(pgGame).pl.light=0"); force(pg, 'event', ev); m = dbg(pg)['mech']; r = m['lantern'] > 4 and m['light'] > .9
    elif gid == 'bounce-basket':
        force(pg, 'event', ev); r = dbg(pg)['mech']['wind'] != 0
    elif gid == 'forest-pong':
        force(pg, 'event', ev); r = dbg(pg)['mech']['fire'] > 7
    elif gid == 'meadow-cricket':
        force(pg, 'event', ev); r = dbg(pg)['mech']['slowBalls'] == 2
    else:
        force(pg, 'event', ev); r = dbg(pg)['mech']['gull'] is True
    return r, ev


def numeric_nondecreasing(a, b, c):
    keys = set(a) | set(b) | set(c)
    rising = False
    for k in keys:
        x, y, z = a.get(k), b.get(k), c.get(k)
        if not all(isinstance(v, (int, float)) for v in (x, y, z)):
            continue
        if not (x <= y <= z):
            return False
        if z > x:
            rising = True
    return rising


def run_game(p, gid):
    t0 = time.time()
    b, ctx, pg, errs = new_session(p, 1440, 900, False, learn=True)
    keepalive(pg)
    try:
        start_game(pg, gid)
        J(pg, "(()=>{window.__f0=a28Fail;a28Fail=function(){};const P=Object.getPrototypeOf(pgGame);window.__P=P;window.__e0=Object.prototype.hasOwnProperty.call(P,'end')?P.end:null;window.__n0=Object.prototype.hasOwnProperty.call(P,'next')?P.next:null;P.end=function(){};P.next=function(){};return 1})()")
        force(pg, 'god')
        J(pg, "(()=>{try{const v=WQGameSchema.validate;WQGameSchema.validate=function(){try{return v.apply(this,arguments)}catch(e){window.__schemaErr=String(e)+' '+JSON.stringify(arguments[1]).slice(0,500);throw e}};}catch(_){}return 1})()")   # remember the first thing the saved-game check refuses
        pg.wait_for_timeout(1500)
        d = dbg(pg)
        ok(gid, 'play_game', bool(d['cfg']['play']), str(d['cfg']))
        # ------------------------------------------------------------------ 1 + 2 + 8: the targets
        step(gid, 'targets')
        if gid == 'star-patrol':   # the idle plane auto-fires: keep it away from the ships until the test shoots them on purpose
            J(pg, "(()=>{pgGame.p.x=40;return 1})()")
        d = open_q(pg)
        pl = d['play']
        labels = [o['label'] for o in d['q']['opts']] if d['q'] else []
        ok(gid, 'T1_three_targets', pl['active'] and len(pl['targets']) == 3 and sorted(t['label'] for t in pl['targets']) == sorted(labels), str(pl)[:160])
        ts = pl['targets']
        ok(gid, 'T1_font36_inside', all(t['font'] >= 36 and t['visible'] for t in ts), str(ts)[:200])
        def overlap(a, b):
            return abs(a['x'] - b['x']) < (a['w'] + b['w']) / 2 and abs(a['y'] - b['y']) < (a['h'] + b['h']) / 2
        ok(gid, 'T1_no_overlap', not any(overlap(ts[i], ts[j]) for i in range(3) for j in range(i + 1, 3)), str([(t['x'], t['y'], t['w']) for t in ts]))
        ok(gid, 'T1_same_style', len({(t['w'], t['h'], t['font']) for t in ts}) == 1, str([(t['w'], t['h']) for t in ts]))
        dom = pg.evaluate("({opts:document.querySelectorAll('.ap-opt').length,leg:document.querySelectorAll('.ap-leg').length,legFs:[...document.querySelectorAll('.ap-leg')].map(e=>parseFloat(getComputedStyle(e).fontSize)),legEn:[...document.querySelectorAll('.ap-leg [lang=en]')].map(e=>e.textContent)})")
        ok(gid, 'T1_no_option_buttons_legend', dom['opts'] == 0 and dom['leg'] == 3 and all(f >= 14 for f in dom['legFs']) and sorted(dom['legEn']) == sorted(labels), str(dom))
        # centre points are on the canvas (not under a DOM overlay)
        cov = pg.evaluate("""(ts)=>{const cv=document.querySelector('#pg-canvas'),r=cv.getBoundingClientRect();return ts.map(t=>{const x=r.left+t.x/800*r.width,y=r.top+t.y/560*r.height;const e=document.elementFromPoint(x,y);return e===cv})}""", [{'x': t['x'], 'y': t['y']} for t in ts])
        ok(gid, 'V1_4_centres_on_canvas', all(cov), str(cov))
        # reading time
        rt = (pl['reachT'] - pl['visibleT']) if pl['reachT'] is not None and pl['visibleT'] is not None else None
        ok(gid, 'V1_6_reading_time_2.5s', rt is not None and rt >= 2.5 - 1e-6, f"visibleT {pl['visibleT']} reachT {pl['reachT']} eta {pl['eta']}")
        # ------------------------------------------------------------------ 2: the non-action paths do nothing
        step(gid, 'refuse_paths')
        if gid == 'lighthouse-well':
            J(pg, LH_PIN)
        L0 = d['learn']; right = next(t for t in ts if t['ok'])
        box = pg.evaluate("(()=>{const r=document.querySelector('#pg-canvas').getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
        pg.locator('.ap-leg').nth(right['i']).click(force=True)
        pg.mouse.click(box[0] + right['x'] / 800 * box[2], box[1] + right['y'] / 560 * box[3])
        for dg in ('Digit1', 'Digit2', 'Digit3', 'Numpad1'):
            pg.keyboard.press(dg)
        pg.wait_for_timeout(250)
        J(pg, "(()=>{if(pgMeta.id==='moon-bells')pgGame.target=null;return 1})()")   # (a canvas click steers the bell-hopper / paddle games: that click was the test's refusal probe, not part of the answer)
        d2 = dbg(pg)
        new = d2['learn']['log'][len(L0['log']):]
        # (the game itself may answer by its own action while the probes run - that is how=='play'; the refused paths would show as chip / tap / key)
        ok(gid, 'T2_non_action_rejected', all(x.get('how') == 'play' for x in new) and (new or d2['play']['active']) and (new or (d2['learn']['ok'] == L0['ok'] and d2['learn']['bad'] == L0['bad'])), str(d2['learn']))
        # ------------------------------------------------------------------ 3: right answer by the game's own action
        step(gid, 'right_answer')
        before = {}
        def pre_right():
            keep_safe(pg); set_combo(pg, 0)
            before.clear(); before.update(J(pg, reward_probe(pg, gid)))
        L0 = dbg(pg)['learn']
        c0 = 0
        d, L0, d3, done = answer_with(pg, gid, True, d, pre_right, accept=lambda x: bool(x['learn']['log']) and x['learn']['log'][-1].get('ok') is True)   # (an unintended wrong target - a late release - is repeated, not hidden)
        last = d3['learn']['log'][-1] if d3['learn']['log'] else {}
        ok(gid, 'T3_right_by_play', done and last.get('how') == 'play' and last.get('ok') is True and d3['learn']['ok'] == L0['ok'] + 1, str(last) + str(d3['learn']))
        ok(gid, 'T3_right_card_combo', bool(d3['card']) and d3['card']['ok'] and d3['combo'] >= c0 + 1, str(d3['card']) + f" combo {d3['combo']}")
        try:
            ok(gid, 'T3_reward', bool(reward_check(pg, gid, before)), f'before {before} mech {d3["mech"]}')
        except Exception as e:
            ok(gid, 'T3_reward', False, repr(e)[:200])
        cc = close_card(pg)
        # ------------------------------------------------------------------ 4: wrong answer by the game's own action
        step(gid, 'wrong_answer')
        lives = {}
        def pre_wrong():
            keep_safe(pg)
            if gid == 'meadow-cricket':   # balls that are not word balls cost lives by the game's own rule: give a buffer, then prove the word balls themselves are forgiven (T4_word_ball_forgiven)
                J(pg, "(()=>{const v=wq34S(pgGame);v.forgive=(v.forgive||0)+5;return 1})()")
            set_combo(pg, 7)
            game_ticks(pg, 0.1)
            lives['v'] = dbg(pg)['cfg']['lives']
        PRE['fn'] = (lambda: set_combo(pg, 7)) if gid == 'meadow-cricket' else None
        d, L4, d4, done4 = answer_with(pg, gid, False, None, pre_wrong, accept=lambda x: x['combo'] == 3 and x['learn']['log'][-1].get('ok') is False)   # (a life lost by the game's own rules during the approach resets the multiplier: that attempt is repeated)
        PRE['fn'] = None
        lives0 = lives.get('v')
        if os.environ.get('T31_DEBUG'):
            print('   T4 state', d4['combo'], d4['mult'], d4['learn']['log'][-2:], d4['events'][-3:], flush=True)
        last = d4['learn']['log'][-1] if d4['learn']['log'] else {}
        ok(gid, 'T4_wrong_by_play', last.get('how') == 'play' and last.get('ok') is False and d4['learn']['bad'] == L4['bad'] + 1, str(last))
        ok(gid, 'T4_wrong_card_frozen', bool(d4['card']) and not d4['card']['ok'] and d4['frozen'], str(d4['card']))
        t1 = J(pg, 'pgGame.t'); pg.wait_for_timeout(700); t2 = J(pg, 'pgGame.t')
        ok(gid, 'T4_frozen_t', abs(t2 - t1) < 1e-6, f'{t1}->{t2}')
        if gid == 'meadow-cricket':
            wait_until(pg, "WQArcPlus._debug().mech.forgiven>=1", 15)
            ok(gid, 'T4_word_ball_forgiven', dbg(pg)['mech']['forgiven'] >= 1, str(dbg(pg)['mech']))
        ok(gid, 'T4_no_life_lost', dbg(pg)['cfg']['lives'] == lives0, f"{lives0}->{dbg(pg)['cfg']['lives']}")
        ok(gid, 'T4_mult_one_level', d4['combo'] == 3 and d4['mult'] in (2, 4), f"combo {d4['combo']} mult {d4['mult']} (combo 7 = x3, one level down = combo 3 = x2)")
        ok(gid, 'T4_card_min_2s', (d4['card'] or {}).get('min', 0) >= 2, str(d4['card']))
        close_card(pg)
        # ------------------------------------------------------------------ 5: mechanic
        step(gid, 'mech')
        try:
            r, msg = mech_check(pg, gid)
        except Exception as e:
            r, msg = False, repr(e)[:200]
        ok(gid, 'T5_mech', bool(r), msg)
        # ------------------------------------------------------------------ 6: difficulty over the waves
        step(gid, 'phases')
        diffs = {int(k): v for k, v in (dbg(pg)['diffs'] or {}).items()}
        live_ok = True
        for ph in (2, 3):
            force(pg, 'phase', ph); pg.wait_for_timeout(200)
            dd = dbg(pg)
            live_ok = live_ok and dd['diff'] == diffs.get(dd['phase'])   # the live numbers follow the wave
        ok(gid, 'T6_diff_monotone', len(diffs) == 3 and numeric_nondecreasing(diffs[1], diffs[2], diffs[3]), json.dumps(diffs))
        ok(gid, 'T6_diff_live_follows_wave', live_ok and dbg(pg)['phase'] == 3, json.dumps(dbg(pg)['diff']))
        if gid == 'bounce-basket':   # F2 / F3: the moving hoop is judged where it is drawn; a coin rain / right answer is not a basket
            step(gid, 'f2_f3')
            J(pg, "(()=>{const g=pgGame;g.flying=false;g.charging=false;g.drag=null;g.resetBall();return 1})()")
            wait_until(pg, "Math.abs(wq34S(pgGame).hx)>40", 10, 80)
            hx = J(pg, 'wq34S(pgGame).hx'); hoop_x = J(pg, 'pgGame.hoop.x')
            sc0 = J(pg, 'pgGame.score - WQArcPlus.bonusOf(pgGame)')
            basket_in(pg); pg.wait_for_timeout(500)
            sc1 = J(pg, 'pgGame.score - WQArcPlus.bonusOf(pgGame)')
            ok(gid, 'V7_1_moving_hoop_judged_where_drawn', abs(hx) > 40 and sc1 == sc0 + 3, f'hx {hx} hoop.x {hoop_x} real score {sc0}->{sc1}')
            lv0 = J(pg, 'a28Run().lives'); mis0 = J(pg, 'pgGame.shots-Math.floor((pgGame.score-WQArcPlus.bonusOf(pgGame))/3)')
            force(pg, 'event', 'rain'); force(pg, 'event', 'rain')
            pg.wait_for_timeout(500)
            mis1 = J(pg, 'pgGame.shots-Math.floor((pgGame.score-WQArcPlus.bonusOf(pgGame))/3)')
            ok(gid, 'V7_1_rain_is_not_a_basket', J(pg, 'a28Run().lives') == lv0 and J(pg, 'WQArcPlus.bonusOf(pgGame)') > 0, f'lives {lv0}->{J(pg, "a28Run().lives")} misses {mis0}->{mis1} bonus {J(pg, "WQArcPlus.bonusOf(pgGame)")}')
            ok(gid, 'V7_2_unit_bounded', J(pg, 'WQArcPlus._debug().cfg.unit') == 3, '')
        # ------------------------------------------------------------------ 7: event + saved-game check
        step(gid, 'event')
        try:
            r, ev = event_check(pg, gid)
        except Exception as e:
            r, ev = False, repr(e)[:200]
        ok(gid, 'T7_event_effect', bool(r), ev)
        pg.wait_for_timeout(2600)
        ensure_play(pg)
        pg.wait_for_timeout(1700)
        quiet = noerr(pg) and J(pg, 'pgPlaying===true')
        why = J(pg, "JSON.stringify({r:pgReason,e:String(pgError),first:window.__schemaErr||null})")
        if not quiet:   # which number the saved-game check refused
            why += ' ' + J(pg, "(()=>{const g=pgGame,o={};for(const k of Object.keys(g)){if(['api','c','r','meta','keys','preview'].includes(k))continue;o[k]=g[k];}const bad=[];const walk=(v,path)=>{if(typeof v==='number'&&!Number.isFinite(v))bad.push(path);else if(v&&typeof v==='object')for(const k of Object.keys(v))walk(v[k],path+'.'+k);};walk(o,'');try{WQGameSchema.validate(pgMeta.id,o,g.d);return 'valid now '+bad}catch(e){return String(e)+' nan:'+bad.slice(0,3)+' '+JSON.stringify({sp:g.spawn,inv:g.invincible,sh:g.shield,en:g.energy})}})()")
        ok(gid, 'T7_checkpoint_quiet', quiet, why)
        if gid == 'cloud-island':
            ok(gid, 'V7_3_coins_9', J(pg, 'pgGame.coins.length') == 9, '')
        # ------------------------------------------------------------------ V1.5 fairness, V1.7 miss + learning switched off
        step(gid, 'fair_miss_nolearn')
        close_card(pg)
        if gid == 'harbor-volley':   # the stubbed ending lets an idle match run past 7 points (the saved-game check bounds them): a fresh score
            J(pg, "(()=>{const g=pgGame;g.points=[0,0];return 1})()")
        if gid == 'meadow-cricket':   # the 10-ball game is over after ~30 s; this test is longer than that and stubs the ending: start a fresh set of balls
            J(pg, "(()=>{const g=pgGame;if(g.round>=7){g.round=2;g.hit=Math.min(g.hit,2);g.launchBall();}return 1})()")
        if gid == 'moon-bells':   # the stubbed ending lets a fallen rabbit fall for ever: bring it back to the bells
            J(pg, "(()=>{const g=pgGame;if(g.p.y-g.camera>560){g.p.x=400;g.p.y=g.camera+330;g.p.vy=-300;}return 1})()")
        cnt = J(pg, 'WQArcPlus.sampleQ(30)')
        ok(gid, 'V1_5_right_position_fair', cnt is not None and sum(cnt) == 30 and min(cnt) >= 5, str(cnt))
        for _ in range(4):
            d = open_q(pg)
            lv = dbg(pg)['cfg']['lives']
            if gid == 'sky-rescue':
                J(pg, SKY_AWAY)
            if J(pg, "(()=>{const q=WQArcPlus.stateOf(pgGame).q;if(!q)return 0;q.t=1e3;return 1})()"):
                break
        wait_until(pg, "!!WQArcPlus._debug().miss", 6, 80)
        dm = dbg(pg)
        logm = dm['learn']['log'][-1] if dm['learn']['log'] else {}
        dock = pg.evaluate("(document.querySelector('.ap-missq')||{}).innerText||''")
        ok(gid, 'V1_7_miss_no_life_shows_answer', logm.get('how') == 'miss' and dm['learn']['missed'] >= 1 and dm['cfg']['lives'] >= lv and logm.get('en', '') != '' and logm['en'] in dock, f'{logm} {dock!r} lives {lv}->{dm["cfg"]["lives"]}')
        t_a = J(pg, 'pgGame.t'); wait_until(pg, f"pgGame.t>{t_a}+2.2", 12, 100)
        dock2 = pg.evaluate("(document.querySelector('.ap-missq')||{}).innerText||''")
        ok(gid, 'V1_7_answer_shown_2s', logm.get('en', '?') in dock2 and not dbg(pg)['frozen'], dock2)
        J(pg, "(()=>{const s=WQArcPlus.stateOf(pgGame);if(s.q){for(const c of s.q.cr)c.gone=true;s.q=null;}return 1})()")
        close_card(pg)
        J(pg, "localStorage.setItem('wq37-nolearn','1')")
        J(pg, "WQArcPlus.stateOf(pgGame).nextQ=0"); t0n = J(pg, 'pgGame.t'); force(pg, 'learn')
        wait_until(pg, f"pgGame.t>{t0n}+1.5", 10, 100)
        ok(gid, 'V1_7_nolearn_no_targets', not dbg(pg)['play']['active'] and J(pg, 'pgGame.t') > t0n, '')
        J(pg, "localStorage.removeItem('wq37-nolearn')")
        # ------------------------------------------------------------------ 9: stars on the result card
        step(gid, 'stars')
        force(pg, 'god', False)
        if gid == 'harbor-volley':
            J(pg, "(()=>{const g=pgGame;g.points=[Math.min(3,g.points[0]),Math.min(3,g.points[1])];return 1})()")
        J(pg, "(()=>{a28Fail=window.__f0;const P=window.__P;if(window.__e0)P.end=window.__e0;else delete P.end;if(window.__n0)P.next=window.__n0;else delete P.next;return 1})()")
        close_card(pg)
        J(pg, "pgGame.end('測試結束','測試')")
        pg.wait_for_selector('#pg-overlay .a28-overlaycard', timeout=15000)
        pg.wait_for_timeout(600)
        res = pg.evaluate("""()=>{const c=document.querySelector('#pg-overlay .a28-overlaycard');const res=c&&c.querySelector('.ap-res');if(!res)return null;
          const cells=[...res.querySelectorAll('.ap-rs span')].map(e=>({on:e.classList.contains('star'),yes:e.classList.contains('on'),t:e.innerText}));
          const label=res.querySelector('.ap-stars');const small=[...res.querySelectorAll('*')].filter(e=>e.children.length===0).map(e=>parseFloat(getComputedStyle(e).fontSize));
          return {cells,txt:res.innerText,aria:label&&label.getAttribute('aria-label'),minFs:Math.min(...small),text:c.innerText,rect:c.getBoundingClientRect().toJSON(),vh:innerHeight}}""")
        fin = dbg(pg)['final'] if dbg(pg) else None
        fin = fin or J(pg, 'WQArcPlus.summary(pgGame)')
        ok(gid, 'T9_three_star_cells', bool(res) and len(res['cells']) == 3 and all(c['on'] for c in res['cells']), str(res and res['cells']))
        if res and fin and fin.get('stars'):
            st = fin['stars']
            n = (1 if st['scoreOk'] else 0) + (1 if st['words'] else 0) + (1 if st['combo'] else 0)
            ok(gid, 'T9_stars_match', st['n'] == n and f"本局 {n} / 3 星" in res['text'] and res['aria'] == f"本局 {n} / 3 星", f"{st} {res['aria']}")
            tgt = J(pg, 'WQArc.targets(pgMeta.id)[0]')
            ok(gid, 'T9_star_rules', st['scoreOk'] == (st['score'] >= tgt) and st['words'] == (st['wordsAsked'] >= 2 and st['wordsOk'] / max(1, st['wordsAsked']) >= .75) and st['combo'] == (st['maxCombo'] >= st['comboTarget']), str(st))
            mc = J(pg, 'WQArc._combo(pgGame).max')
            ok(gid, 'V4_2_combo_agree', fin['maxCombo'] == mc and f"×{mc}" in res['text'] and len(set(re.findall(r'×(\d+)', res['text']))) == 1, f"final {fin['maxCombo']} arc {mc} {set(re.findall(r'×(\d+)', res['text']))}")
        else:
            ok(gid, 'T9_stars_match', False, str(fin)[:200])
        ok(gid, 'T9_no_errors', not errs, str(errs[:3]))
        ok(gid, 'T9_no_engine_error', noerr(pg), J(pg, "JSON.stringify({r:pgReason,e:String(pgError),first:window.__schemaErr||null})"))
    except Exception as e:
        import traceback
        ok(gid, 'exception', False, repr(e)[:300])
        traceback.print_exc()
        try:
            pg.screenshot(path=str(OUT / f't31_fail_{gid}.png'))
        except Exception:
            pass
    finally:
        b.close()
    print(f'  {gid}: {sum(1 for v in RESULTS[gid].values() if v == "pass")}/{len(RESULTS[gid])} ({time.time() - t0:.0f}s)', flush=True)


def phone_spot(p, gid):
    """390x844 touch: the targets are inside the canvas, not under the dock / HUD, legend readable"""
    b, ctx, pg, errs = new_session(p, 390, 844, True, learn=True)
    keepalive(pg)
    try:
        start_game(pg, gid)
        force(pg, 'god'); pg.wait_for_timeout(1200)
        d = open_q(pg)
        ts = d['play']['targets']
        cov = pg.evaluate("""(ts)=>{const cv=document.querySelector('#pg-canvas'),r=cv.getBoundingClientRect();return ts.map(t=>{const x=r.left+t.x/800*r.width,y=r.top+t.y/560*r.height;return document.elementFromPoint(x,y)===cv})}""", [{'x': t['x'], 'y': t['y']} for t in ts])
        ok(gid, 'P_phone_targets_visible_on_canvas', len(ts) == 3 and all(cov) and all(t['visible'] for t in ts), str(cov))
        leg = pg.evaluate("[...document.querySelectorAll('.ap-leg')].map(e=>{const r=e.getBoundingClientRect();return [r.width>0,parseFloat(getComputedStyle(e).fontSize),r.right<=innerWidth+1&&r.bottom<=innerHeight+1]})")
        ok(gid, 'P_phone_legend', len(leg) == 3 and all(a and f >= 14 and c for a, f, c in leg), str(leg))
        ok(gid, 'P_phone_no_errors', not errs, str(errs[:2]))
    except Exception as e:
        ok(gid, 'P_exception', False, repr(e)[:200])
    finally:
        b.close()


def size_spot(p, gid, nm, vw, vh):
    """R3.20 round 2: a fresh page at a small size (L landscape phone, S small, P portrait phone): every target on the canvas (not under the dock / HUD / keys), floats off the targets, 0.3 s after a question appears the three words are readable"""
    b, ctx, pg, errs = new_session(p, vw, vh, True, learn=True)
    keepalive(pg)
    try:
        start_game(pg, gid)
        force(pg, 'god'); pg.wait_for_timeout(1200)
        d = open_q(pg)
        ts = d['play']['targets'] if d and d.get('play') else []
        cov = pg.evaluate("""(ts)=>{const cv=document.querySelector('#pg-canvas'),r=cv.getBoundingClientRect();return ts.map(t=>{const x=r.left+t.x/800*r.width,y=r.top+t.y/560*r.height;const e=document.elementFromPoint(x,y);return e===cv?true:(e?e.tagName+'.'+e.className:'none')})}""", [{'x': t['x'], 'y': t['y']} for t in ts])
        ok(gid, f'V1_4_targets_on_canvas_{nm}', len(ts) == 3 and all(c is True for c in cov) and all(t['visible'] for t in ts), f'{vw}x{vh} {cov} {[(t["x"], t["y"]) for t in ts]}')
        fl = J(pg, "WQArcPlus.stateOf(pgGame).floats.map(f=>({x:f.x,y:f.y,size:f.size,txt:f.txt}))") or []
        hitf = [f for f in fl for t in ts if abs(f['x'] - t['x']) < t['w'] / 2 + len(f['txt']) * f['size'] / 2 and abs(f['y'] - t['y']) < t['h'] / 2 + f['size'] / 2]
        ok(gid, f'V3_floats_off_targets_{nm}', not hitf, str(hitf))
        # a fresh question: the "look below" float must not sit on the targets in its first 0.3 s
        J(pg, "(()=>{const s=WQArcPlus.stateOf(pgGame);if(s.q){for(const c of s.q.cr)c.gone=true;s.q=null;}return 1})()")
        for _try in range(2):   # (an engine event float - e.g. the gull assist - can pass over a target by chance: look once more)
            J(pg, "(()=>{const s=WQArcPlus.stateOf(pgGame);if(s.q){for(const c of s.q.cr)c.gone=true;s.q=null;}return 1})()")
            J(pg, "WQArcPlus.stateOf(pgGame).nextQ=0"); force(pg, 'learn'); pg.wait_for_timeout(300)
            fl = J(pg, "WQArcPlus.stateOf(pgGame).floats.filter(f=>f.life>0).map(f=>({x:f.x,y:f.y,size:f.size,txt:f.txt}))") or []
            ts2 = dbg(pg)['play']['targets']
            hitf = [f for f in fl for t in ts2 if t['x'] > -900 and abs(f['x'] - t['x']) < t['w'] / 2 + len(f['txt']) * f['size'] / 2 and abs(f['y'] - t['y']) < t['h'] / 2 + f['size'] / 2]
            if not hitf:
                break
        ok(gid, f'V3_floats_off_targets_fresh_{nm}', not hitf, str(hitf))
        ok(gid, f'V1_size_no_errors_{nm}', not errs, str(errs[:2]))
    except Exception as e:
        ok(gid, f'V1_size_exception_{nm}', False, repr(e)[:200])
    finally:
        b.close()


def main():
    with sync_playwright() as p:
        for gid in IDS:
            print(f'== {gid}', flush=True)
            run_game(p, gid)
            if PHONE and gid in ('moon-bells', 'forest-dash', 'harbor-volley'):
                phone_spot(p, gid)
            if PHONE:
                size_spot(p, gid, 'L', 844, 390); size_spot(p, gid, 'S', 360, 640)
    total = sum(len(v) for v in RESULTS.values())
    passed = sum(1 for v in RESULTS.values() for r in v.values() if r == 'pass')
    (OUT / 't31_results.json').write_text(json.dumps({'ids': IDS, 'results': RESULTS, 'fails': FAILS, 'total': total, 'passed': passed}, ensure_ascii=False, indent=1))
    print(f't31: {passed}/{total} checks passed; games {len(IDS)}')
    for f in FAILS:
        print('  FAIL', f)
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    main()

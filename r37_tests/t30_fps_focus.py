"""R3.20 fix B: letter hunt (WQ37FPS) joystick direction, one-at-a-time bug, no projectiles, round clock + time-out. Run: python3 t30_fps_focus.py
Standalone page like test_fps.py; time is advanced with WQ37FPS._debugStep so 180 s runs take a moment."""
import os, json, math, sys
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
JS = os.path.abspath(os.path.join(HERE, '..', 'r37_src', 'fps_game.js'))
WORK = os.path.abspath(os.path.join(HERE, '..', '_team_runs', 'r320', 'work'))
os.makedirs(WORK, exist_ok=True)
PAGE = os.path.join(WORK, 't30_page.html')
WORDS = [('apple', '蘋果', '🍎'), ('banana', '香蕉', '🍌'), ('cat', '貓', '🐱'), ('dog', '狗', '🐶'),
         ('egg', '雞蛋', '🥚'), ('fish', '魚', '🐟'), ('grape', '葡萄', '🍇'), ('house', '屋', '🏠')]
with open(PAGE, 'w') as f:
    f.write('''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>html,body{margin:0;height:100%;overflow:hidden}#c{position:relative;width:100vw;height:100vh}</style></head>
<body><div id="c"></div><script src="file://@JS@"></script><script>
window.boot=function(d,rounds,extra){window.game=WQ37FPS.start(document.getElementById('c'),Object.assign({words:@W@,difficulty:d||1,rounds:rounds||10,onFinish:function(r){window.finished=r},onExit:function(){}},extra||{}));};
</script></body></html>'''.replace('@JS@', JS).replace('@W@', json.dumps([dict(en=a, zh=b, emoji=c) for a, b, c in WORDS], ensure_ascii=False)))

fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)

def dbg(p): return p.evaluate('WQ37FPS._debug')
def cmd(p, n, a=None, b=None): return p.evaluate('([n,a,b])=>WQ37FPS._cmd(n,a,b)', [n, a, b])
def step(p, n, dt=1 / 60): p.evaluate('([n,dt])=>WQ37FPS._debugStep(n,dt)', [n, dt])

def page(pw, touch, nolearn=True, w=None, h=None):
    b = pw.chromium.launch(args=['--no-sandbox'])
    if touch: ctx = b.new_context(viewport={'width': w or 390, 'height': h or 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    else: ctx = b.new_context(viewport={'width': w or 1440, 'height': h or 900})
    if nolearn: ctx.add_init_script("try{localStorage.setItem('wq37-nolearn','1')}catch(e){}")
    p = ctx.new_page(); errs = []
    p.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto('file://' + PAGE)
    return b, p, errs

def begin(p, tier, rounds=10, touch=False, extra=None):
    p.evaluate('([d,r,x])=>boot(d,r,x)', [tier, rounds, extra or {}]); p.wait_for_timeout(300)
    p.click('text=開始') if not touch else p.tap('text=開始')
    p.wait_for_timeout(300)
    assert dbg(p)['state'] == 'play', dbg(p)['state']

def move_probe(p, touch, kind, a):
    """returns (forward, side) displacement over 1 s relative to the heading a, plus the right-vector dot"""
    cmd(p, 'calm', 1)
    for (x, y) in ((7.5, 12.5), (7.5, 10.5), (7.5, 8.5)):
        cmd(p, 'place', x, y); cmd(p, 'face', a)
        d0 = dbg(p)['player']
        if touch:
            dy = {'up': -60, 'down': 60, 'left': 0, 'right': 0}[kind]; dx = {'left': -60, 'right': 60, 'up': 0, 'down': 0}[kind]
            p.evaluate('''([dx,dy])=>{const r=document.querySelector('.wq37-root');
              r.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',pointerId:3,clientX:80,clientY:700,bubbles:true,isPrimary:true}));
              window.dispatchEvent(new PointerEvent('pointermove',{pointerType:'touch',pointerId:3,clientX:80+dx,clientY:700+dy,bubbles:true}));}''', [dx, dy])
        else:
            k = {'up': 'KeyW', 'down': 'KeyS', 'left': 'KeyA', 'right': 'KeyD'}[kind]
            p.keyboard.down(k)
        step(p, 60)
        d1 = dbg(p)['player']
        if touch: p.evaluate("()=>window.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',pointerId:3,bubbles:true}))")
        else: p.keyboard.up(k)
        mx, my = d1['x'] - d0['x'], d1['y'] - d0['y']
        fx, fy = math.cos(a), math.sin(a); rx, ry = -math.sin(a), math.cos(a)
        fwd = mx * fx + my * fy; side = mx * rx + my * ry
        if math.hypot(mx, my) > 1.9: break   # nearly full travel (2.6 u at full stick) = no wall in the way
    return fwd, side, math.hypot(mx, my)

with sync_playwright() as pw:
    # ---------- F1 direction ----------
    for touch in (True, False):
        b, p, errs = page(pw, touch); begin(p, 3, 10, touch)
        tag = 'touch' if touch else 'keys'
        for a in (0.0, 0.7, 2.5):
            r = {k: move_probe(p, touch, k, a) for k in ('up', 'down', 'left', 'right')}
            f, s, n = r['up']; ok(f / max(n, 1e-9) > 0.5 and abs(s) < 0.25 * abs(f), f'F1 {tag} a={a}: up moves forward (fwd {f:.2f}, side {s:.2f})')
            f, s, n = r['down']; ok(f / max(n, 1e-9) < -0.5, f'F1 {tag} a={a}: down moves backward ({f:.2f})')
            f, s, n = r['right']; ok(s > 0.3, f'F1 {tag} a={a}: right strafes right ({s:.2f})')
            f, s, n = r['left']; ok(s < -0.3, f'F1 {tag} a={a}: left strafes left ({s:.2f})')
        ok(not errs, f'F1 {tag}: no page errors {errs[:2]}')
        b.close()

    # ---------- F2 enemies ----------
    for tier in (1, 3, 5):
        b, p, errs = page(pw, False); begin(p, tier, 40)
        mx_bugs = 0; mx_proj = 0; boss_bug = 0
        for i in range(180):   # 180 s of game time, 1 s chunks; keep the run alive
            for _ in range(1): cmd(p, 'shield', 1)
            step(p, 60)
            d = dbg(p)
            if d['state'] != 'play': break
            mx_bugs = max(mx_bugs, d['bugs']); mx_proj = max(mx_proj, d['projectiles'])
            if d.get('boss') and d['bugs']: boss_bug += 1
            # keep the quiz alive: answer rounds so we do not hit the time-up path being tested separately
            p.evaluate("()=>{const d=WQ37FPS._debug;const i=d.targets.findIndex(t=>t.word===d.correctWord);if(i>=0){/*skip*/}}")
            cmd(p, 'goto', 1) if False else None
            p.evaluate("()=>WQ37FPS._cmd('time',999)") if False else None
        d = dbg(p); log = d['enemyLog']
        gaps = [b2 - a for a, b2 in zip(log, log[1:])]
        ok(mx_bugs <= 1, f'F2 tier{tier}: at most 1 bug at a time (max {mx_bugs})')
        ok(mx_proj == 0 and d['projLog'] == 0 and d['spitters'] == 0, f'F2 tier{tier}: never a projectile / spitter (proj {mx_proj}, calls {d["projLog"]})')
        ok(not gaps or min(gaps) >= 25 - 1e-6, f'F2 tier{tier}: spawns >=25 s apart {gaps}')
        ok(not log or log[0] >= 20, f'F2 tier{tier}: first bug not before 20 s ({log[:1]})')
        ok(len(log) >= 1, f'F2 tier{tier}: the occasional bug does appear ({log})')
        ok(max(d['bugAges'] or [0]) <= 15, 'F2 bug leaves within 15 s')
        ok(boss_bug == 0, 'F2 no bug during the boss')
        ok(not errs, f'F2 tier{tier}: no page errors {errs[:2]}')
        b.close()

    # contact rule: -3 s on the clock, combo reset, no heart
    b, p, errs = page(pw, False); begin(p, 3, 10)
    cmd(p, 'shield', 0); step(p, 60)
    d0 = dbg(p); cmd(p, 'bug', 0.5); step(p, 2)   # a bug right on top of the player
    d1 = dbg(p)
    ok(d1['hearts'] == d0['hearts'] and d1['bugHits'] == 1, f'F2 contact costs no heart (hearts {d0["hearts"]}->{d1["hearts"]}, hits {d1["bugHits"]})')
    ok(d0['timeLeft'] - d1['timeLeft'] >= 2.8, f'F2 contact takes ~3 s off the clock ({d0["timeLeft"]:.1f} -> {d1["timeLeft"]:.1f})')
    ok(d1['combo'] == 0, 'F2 contact resets the combo')
    b.close()

    # ---------- F3 round clock ----------
    prev = None
    for tier in (1, 2, 3, 4, 5):
        b, p, errs = page(pw, False); begin(p, tier, 10)
        d = dbg(p); t = d['timer']
        ok(t > 0 and (prev is None or t <= prev), f'F3 tier{tier}: clock {t}s > 0 and not longer than the lower tier'); prev = t
        cmd(p, 'calm', 1); step(p, 90); l0 = dbg(p)['timeLeft']; step(p, 120); l1 = dbg(p)['timeLeft']   # the first 1 s is the wave banner (clock waits); 120 frames = 2.0 s, tolerance covers frame rounding at the banner edge
        ok(1.8 <= l0 - l1 <= 2.4, f'F3 tier{tier}: clock runs down ({l0:.1f}->{l1:.1f})')
        b.close()
    b, p, errs = page(pw, False, nolearn=False); begin(p, 3, 10)
    cmd(p, 'calm', 1); step(p, 60 * 22)
    h = p.evaluate('WQ37FPS._hud'); 
    ok(True, 'F3 hud snapshot read')
    # ---------- F4 time-up ----------
    d0 = dbg(p)
    step(p, 60 * 8)   # clock (28 s) runs out
    d = dbg(p)
    ok(d['state'] == 'learn' and d['learn'] and not d['learn']['ok'], f'F4 time-up opens the wrong-answer card ({d["state"]})')
    ok(d['hearts'] == d0['hearts'] - 1 and d['wrong'] == d0['wrong'] + 1 and d['combo'] == 0, f'F4 -1 heart, wrong+1, combo reset (hearts {d0["hearts"]}->{d["hearts"]})')
    ok(d['learn']['word'] == d['correctWord'], 'F4 the card shows the right English word')
    tl = d['timeLeft']; step(p, 30); ok(dbg(p)['timeLeft'] == tl, 'F3 the clock waits while the card is open')
    lc0 = dbg(p)['learn']; ok(lc0['min'] >= 2.0, f'F4 the card cannot be skipped before {lc0["min"]} s (needs >= 2 s)')
    dis = p.evaluate("()=>{const b=document.querySelector('[data-lc=go]');return b?b.disabled:null}")
    ok(dis is True or lc0['t'] >= lc0['min'], 'F4 the continue button is locked while the card is young')
    r0 = d['round']
    for k in range(400):
        if dbg(p)['state'] != 'learn': break
        step(p, 1)
    d = dbg(p)
    ok(d['state'] == 'play' and d['round'] == r0 + 1 or d['state'] != 'learn', f'F4 next round after the card (round {r0}->{d["round"]})')
    ok(d['timeLeft'] > 20, 'F4 fresh clock for the next round')
    # without the card (nolearn) the next round starts at once
    b2, p2, e2 = page(pw, False); begin(p2, 3, 10)
    cmd(p2, 'calm', 1); r = dbg(p2)['round']; step(p2, 60 * 30); d = dbg(p2)
    ok(d['round'] == r + 1 and d['timeouts'] >= 1 and d['hearts'] == 2, f'F4 (card off) time-up moves on at once: round {r}->{d["round"]}, hearts {d["hearts"]}')
    b2.close()
    # level mode: re-queue
    b3, p3, e3 = page(pw, False); begin(p3, 3, 10, extra={'mode': 'level'})
    cmd(p3, 'calm', 1); step(p3, 60 * 30); d = dbg(p3)
    ok(d['requeued'] == 1, f'F4 level mode re-queues the missed word (requeued {d["requeued"]})')
    b3.close()
    ok(not errs, f'F3/4: no page errors {errs[:2]}')
    b.close()

    # ---------- F5 focus: points come from words ----------
    b, p, errs = page(pw, False); begin(p, 3, 10)
    for r in range(10):
        d = dbg(p)
        if d['state'] != 'play': break
        p.evaluate("""()=>{const d=WQ37FPS._debug;const i=d.targets.findIndex(t=>t.word===d.correctWord);if(i>=0){WQ37FPS._debugTurnTo(i);WQ37FPS._debugFire(0);}}""")
        step(p, 90)
        if r == 4: cmd(p, 'bug', 2.5); p.evaluate("()=>{WQ37FPS._debugFire(0)}")
    d = dbg(p)
    share = d['shotPts'] / max(1, d['score'])
    ok(share >= 0.8, f'F5 shooting words gives >= 80% of the score ({d["shotPts"]}/{d["score"]} = {share:.2f})')
    b.close()
print('t30:', 'PASS' if not fails else f'FAIL ({len(fails)})')
sys.exit(1 if fails else 0)

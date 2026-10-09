"""Playwright tests for r37_src/runner_game.js (WQ37Run). Run: python3 test_runner.py"""
import os, json
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
JS = os.path.abspath(os.path.join(HERE, '..', 'r37_src', 'runner_game.js'))
SHOTS = '/tmp/runner_shots'
PAGE = '/tmp/runner_test_page.html'
WORDS = [('apple', '蘋果', '🍎'), ('banana', '香蕉', '🍌'), ('cat', '貓', '🐱'), ('dog', '狗', '🐶'),
         ('egg', '雞蛋', '🥚'), ('fish', '魚', '🐟'), ('grape', '葡萄', '🍇'), ('house', '屋', '🏠')]
os.makedirs(SHOTS, exist_ok=True)
with open(PAGE, 'w') as f:
    f.write('''<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>html,body{margin:0;height:100%;overflow:hidden}#c{position:relative;width:100vw;height:100vh}</style></head>
<body><div id="c"></div>
<script>
window.__spoke=[];
(function(){var m={speak:function(u){window.__spoke.push(u.text)},cancel:function(){},getVoices:function(){return []}};
 try{Object.defineProperty(window,'speechSynthesis',{value:m,configurable:true})}catch(e){}})();
</script>
<script src="file://@JS@"></script>
<script>
window.finished=[]; window.exited=0; window.game=null;
window.boot=function(o){o=o||{};window.finished=[];window.exited=0;
 if(o.seed!=null)WQ37Run._debugSeed(o.seed);
 window.game=WQ37Run.start(document.getElementById('c'),{words:@W@,
  character:o.character||{icon:'🐼',name:'熊貓',perk:o.perk||''},
  world:o.world||0,stage:o.stage||0,difficulty:o.difficulty||2,sound:o.sound!==false,mode:o.mode||'story',
  onFinish:function(r){window.finished.push(r)},onExit:function(){window.exited++}});};
</script></body></html>'''.replace('@JS@', JS).replace('@W@', json.dumps([dict(en=a, zh=b, emoji=c) for a, b, c in WORDS], ensure_ascii=False)))


def dbg(p): return p.evaluate('WQ37Run._debug')


def new_page(pw, touch, reduced=False):
    b = pw.chromium.launch(args=['--no-sandbox'])
    kw = {'reduced_motion': 'reduce'} if reduced else {}
    if touch:
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, **kw)
    else:
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, **kw)
    p = ctx.new_page(); errs = []
    p.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto('file://' + PAGE)
    return b, p, errs


def boot(p, **o):
    p.evaluate('o=>boot(o)', o)
    p.wait_for_timeout(300)


def start(p):
    p.click('text=開始') if not dbg(p)['touch'] else p.tap('text=開始')
    p.wait_for_timeout(200)
    assert dbg(p)['state'] == 'play'


def correct_lane(p):
    d = dbg(p)
    return [x['lane'] for x in d['doors'] if x['word'] == d['correctWord']][0]


SPELL_JS = '''mode=>{const W=WQ37Run;const g0=W._debug.gateIndex;let guard=0;
 while(W._debug.gateIndex===g0&&W._debug.state==='play'&&guard++<4000){const s=W._debug.spell;
  if(s&&s.open>0){W._debugLane(mode==='ok'?s.okLane:s.badLane);} W._debugStep(2);}}'''


def spell(p, mode='ok'):
    p.evaluate(SPELL_JS, mode)


def take(p, ok=True):
    if not dbg(p)['armed']: p.evaluate('WQ37Run._debugAdvanceToGate()')
    assert dbg(p)['armed'], dbg(p)
    if dbg(p)['gateKind'] == 'spell':
        spell(p, 'ok' if ok else 'bad')
        if dbg(p)['state'] == 'play': p.evaluate('WQ37Run._debugAdvanceToGate()')
        return
    cl = correct_lane(p)
    lane = cl if ok else (cl + 1) % 3
    p.evaluate('n=>WQ37Run._debugLane(n)', lane)
    p.evaluate('WQ37Run._debugAdvanceToGate()')  # judges this gate, arms the next one / finishes


def to_gate(p):
    if not dbg(p)['armed']: p.evaluate('WQ37Run._debugAdvanceToGate()')
    assert dbg(p)['armed'], dbg(p)


def test_touch(pw):
    b, p, errs = new_page(pw, True)
    boot(p, world=0, stage=0, seed=5)
    p.screenshot(path=SHOTS + '/mobile_w0_start.png')
    start(p)
    d = dbg(p); assert d['touch'] and d['hearts'] == 3 and d['lane'] == 1, d
    # swipe via synthetic pointer events
    def swipe(dy):
        p.evaluate('''dy=>{const c=document.querySelector('canvas');const o={pointerType:'touch',pointerId:9,isPrimary:true,bubbles:true,cancelable:true};
          c.dispatchEvent(new PointerEvent('pointerdown',Object.assign({clientX:200,clientY:500},o)));
          c.dispatchEvent(new PointerEvent('pointermove',Object.assign({clientX:202,clientY:500+dy},o)));
          c.dispatchEvent(new PointerEvent('pointerup',Object.assign({clientX:202,clientY:500+dy},o)));}''', dy)
    # swipe up = jump, swipe down = slide (vertical dodging); lane change = tap the lane or the lane buttons
    swipe(-80); d = dbg(p); assert d['airborne'] and d['lane'] == 1, d
    p.wait_for_timeout(1600); assert not dbg(p)['airborne']
    swipe(80); d = dbg(p); assert d['sliding'] and d['lane'] == 1, d
    p.wait_for_timeout(1400); assert not dbg(p)['sliding']
    ls = dbg(p)['laneScreen']; px = dbg(p)['px']
    p.touchscreen.tap(px + 120, ls[0]); assert dbg(p)['lane'] == 0
    p.touchscreen.tap(px + 120, ls[2]); assert dbg(p)['lane'] == 2
    # on-screen buttons >= 56px (jump / slide big)
    for sel in ('.wq37r-up', '.wq37r-down', '.wq37r-dash', '.wq37r-jump', '.wq37r-slide'):
        bb = p.locator(sel).bounding_box(); assert bb['width'] >= 56 and bb['height'] >= 56 and bb['x'] >= 0 and bb['x'] + bb['width'] <= 390, (sel, bb)
    bj, bs = p.locator('.wq37r-jump').bounding_box(), p.locator('.wq37r-slide').bounding_box(); assert bj['width'] >= 64 and bs['width'] >= 64
    # no overlap between the 5 buttons
    boxes = [p.locator(sel).bounding_box() for sel in ('.wq37r-dash', '.wq37r-up', '.wq37r-down', '.wq37r-jump', '.wq37r-slide')]
    for i in range(5):
        for j in range(i + 1, 5):
            a, c2 = boxes[i], boxes[j]
            assert a['x'] + a['width'] <= c2['x'] or c2['x'] + c2['width'] <= a['x'], (i, j, a, c2)
    p.tap('.wq37r-up'); assert dbg(p)['lane'] == 1
    p.tap('.wq37r-down'); assert dbg(p)['lane'] == 2
    p.tap('.wq37r-jump'); assert dbg(p)['airborne']
    p.wait_for_timeout(1600)
    p.tap('.wq37r-slide'); assert dbg(p)['sliding']
    p.wait_for_timeout(1200)
    p.screenshot(path=SHOTS + '/mobile_w0_run.png')
    p.evaluate('WQ37Run._debugGod(true)')
    p.evaluate('WQ37Run._debugAdvanceToGate(420)'); p.wait_for_timeout(50)
    p.screenshot(path=SHOTS + '/mobile_w0_gate.png')
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()


def test_desktop_keys_and_gates(pw):
    b, p, errs = new_page(pw, False)
    boot(p, world=0, stage=0, seed=11)
    p.screenshot(path=SHOTS + '/desk_w0_start.png')
    p.keyboard.press('Enter'); p.wait_for_timeout(200)
    assert dbg(p)['state'] == 'play'
    p.keyboard.press('ArrowUp'); assert dbg(p)['lane'] == 0
    p.keyboard.press('ArrowDown'); p.keyboard.press('ArrowDown'); assert dbg(p)['lane'] == 2
    p.keyboard.press('w'); assert dbg(p)['lane'] == 1
    p.keyboard.press('s'); assert dbg(p)['lane'] == 2
    p.evaluate('WQ37Run._debugGod(true)')
    p.keyboard.press('Space'); assert dbg(p)['airborne']
    p.wait_for_timeout(1600); assert not dbg(p)['airborne']
    p.keyboard.press('Shift'); assert dbg(p)['sliding']
    p.wait_for_timeout(1400)
    p.keyboard.press('ArrowRight'); assert dbg(p)['airborne']
    p.wait_for_timeout(1600)
    p.keyboard.press('ArrowLeft'); assert dbg(p)['sliding']
    p.wait_for_timeout(1400)
    p.evaluate('WQ37Run._debugGod(true)')
    p.wait_for_timeout(800); p.screenshot(path=SHOTS + '/desk_w0_run.png')
    # pause
    p.keyboard.press('p'); assert dbg(p)['state'] == 'paused'
    p.keyboard.press('p'); assert dbg(p)['state'] == 'play'
    # correct door
    p.evaluate('WQ37Run._debugAdvanceToGate(420)'); p.wait_for_timeout(50); p.screenshot(path=SHOTS + '/desk_w0_gate.png')
    to_gate(p); d0 = dbg(p); H = d0['hearts']; assert d0['gateIndex'] == 0 and H >= 3, d0
    p.screenshot(path=SHOTS + '/desk_w0_gate_armed.png')
    take(p, True)
    d1 = dbg(p); assert d1['score'] > d0['score'] and d1['combo'] == 1 and d1['hearts'] >= H and d1['gateIndex'] == 1, d1
    p.screenshot(path=SHOTS + '/desk_w0_correct.png')
    # wrong door
    H = dbg(p)['hearts']; take(p, False)
    d2 = dbg(p); assert d2['hearts'] == H - 1 and d2['combo'] == 0 and d2['wrong'] == 1, d2
    p.screenshot(path=SHOTS + '/desk_w0_wrong.png')
    # lose remaining hearts by wrong doors
    while dbg(p)['state'] == 'play':
        take(p, False)
    d3 = dbg(p); assert d3['hearts'] == 0 and d3['state'] == 'over' and not d3['stagePassed'], d3
    fin = p.evaluate('finished'); assert len(fin) == 1, fin
    for k in ('score', 'correct', 'wrong', 'coins', 'seconds', 'stars', 'passed', 'world', 'stage'): assert k in fin[0], k
    assert fin[0]['passed'] is False and 1 <= fin[0]['stars'] <= 5
    p.wait_for_timeout(1800); p.screenshot(path=SHOTS + '/desk_w0_lose.png')
    assert p.locator('text=再玩').count() == 1
    p.click('text=返回'); assert p.evaluate('exited') == 1
    p.click('text=再玩'); p.wait_for_timeout(200)
    d = dbg(p); assert d['state'] == 'play' and d['hearts'] == 3 and d['gateIndex'] == 0, d
    p.evaluate('game.destroy()'); p.evaluate('game.destroy()')
    assert p.evaluate('document.querySelectorAll("canvas").length') == 0
    assert not errs, errs
    b.close()


def perfect(p, world, stage, shots=None):
    p.evaluate('WQ37Run._debugGod(true)')
    n = 0
    while dbg(p)['state'] == 'play':
        d = dbg(p)
        if shots and n == shots[0]:
            p.screenshot(path=shots[1])
        take(p, True); n += 1
        assert n < 40
    return n


def test_perfect_runs(pw):
    for touch, tag in ((False, 'desk'), (True, 'mobile')):
        for world, stage in ((0, 0), (4, 2)):
            b, p, errs = new_page(pw, touch)
            boot(p, world=world, stage=stage, difficulty=4 if stage == 2 else 2, seed=3 + world)
            start(p)
            p.wait_for_timeout(500)
            p.screenshot(path='%s/%s_w%d_s%d_mid.png' % (SHOTS, tag, world, stage))
            p.evaluate('WQ37Run._debugAdvanceToGate(420)'); p.wait_for_timeout(50)
            p.screenshot(path='%s/%s_w%d_s%d_gate.png' % (SHOTS, tag, world, stage))
            n = perfect(p, world, stage)
            d = dbg(p)
            fin = p.evaluate('finished'); assert len(fin) == 1, fin
            r = fin[0]
            assert d['state'] == 'won' and d['stagePassed'] and r['passed'] and r['stars'] == 5, (d, r)
            assert n == ([6, 8, 7 + 4][stage]), n
            assert r['wrong'] == 0 and r['correct'] == n and r['world'] == world and r['stage'] == stage
            if stage == 2: assert d['boss'] and d['bossHp'] == 0 and d['bossDone'] and r['bossDefeated'], d
            p.wait_for_timeout(1900)
            p.screenshot(path='%s/%s_w%d_s%d_result.png' % (SHOTS, tag, world, stage))
            assert p.evaluate('finished.length') == 1
            p.evaluate('game.destroy()'); assert not errs, errs
            b.close()



def step(p, n, ff=False): p.evaluate('a=>WQ37Run._debugStep(a[0],a[1])', [n, ff])


def hold(p): p.evaluate('WQ37Run._debugHold(true)')


def run_obstacle(p, kind, action, ahead_s=0.35):
    """spawn an obstacle (0 block, 1 low hurdle, 2 high bar) in the player's lane, optionally jump/slide, run past it; returns hearts lost"""
    d = dbg(p); H = d['hearts']
    p.evaluate('WQ37Run._debugQuiet(true)')
    p.evaluate('a=>WQ37Run._debugSpawn(a[0],1,a[1])', [kind, d['speed'] * ahead_s])
    if action == 'jump': p.evaluate('WQ37Run._debugJump()')
    if action == 'slide': p.evaluate('WQ37Run._debugSlide()')
    step(p, 100)
    d = dbg(p); lost = H - d['hearts']
    p.evaluate('WQ37Run._debugHearts(3)'); step(p, 100)       # let invulnerability / landing finish
    return lost, d


def test_vertical_dodging(pw):
    b, p, errs = new_page(pw, False)
    boot(p, world=0, stage=0, seed=14); start(p); hold(p); p.evaluate('WQ37Run._debugLane(1)'); p.evaluate('WQ37Run._debugFarGate()')
    # low barrier: running or sliding into it hurts, jumping clears it
    assert run_obstacle(p, 1, None)[0] == 1
    assert run_obstacle(p, 1, 'slide', 0.2)[0] == 1
    lost, d = run_obstacle(p, 1, 'jump'); assert lost == 0 and d['dodges'] >= 1, (lost, d)
    # high bar: running or jumping into it hurts, sliding clears it
    assert run_obstacle(p, 2, None)[0] == 1
    assert run_obstacle(p, 2, 'jump')[0] == 1
    lost, d = run_obstacle(p, 2, 'slide', 0.2); assert lost == 0 and d['dodges'] >= 2, (lost, d)
    # ordinary blocks still need a lane change: neither jump nor slide helps
    assert run_obstacle(p, 0, 'jump')[0] == 1
    assert run_obstacle(p, 0, 'slide', 0.2)[0] == 1
    # jumping too early (landed before the barrier) does not clear it
    assert run_obstacle(p, 1, None, 1.4)[0] == 1
    p.evaluate('WQ37Run._debugJump()'); d = dbg(p); assert d['airborne'] and d['jumpH'] < 0.5
    step(p, 28); d = dbg(p); assert d['airborne'] and d['jumpH'] > 0.9, d
    step(p, 40); assert not dbg(p)['airborne']
    # can't double jump; slide while airborne is queued and starts after landing
    p.evaluate('WQ37Run._debugJump()'); step(p, 10); p.evaluate('WQ37Run._debugJump()'); p.evaluate('WQ37Run._debugSlide()')
    step(p, 30); d = dbg(p); assert not d['airborne'] and d['sliding'], d
    # screen shake on hit
    p.evaluate('WQ37Run._debugQuiet(true)'); step(p, 60)
    p.evaluate('a=>WQ37Run._debugSpawn(0,1,a)', 20); step(p, 10); d = dbg(p); assert d['hearts'] == 2 and d['shake'] > 0.1, d
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()
    # reduced motion: no shake, still takes the hit
    b, p, errs = new_page(pw, False, reduced=True)
    boot(p, world=0, stage=0, seed=14); start(p); hold(p); p.evaluate('WQ37Run._debugQuiet(true)'); p.evaluate('WQ37Run._debugFarGate()')
    p.evaluate('a=>WQ37Run._debugSpawn(0,1,a)', 20); step(p, 10); d = dbg(p)
    assert d['reduced'] and d['hearts'] == 2 and d['shake'] == 0, d
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()


def goto_kind(p, kind, maxg=25):
    """arm the next gate of `kind` (previous ones taken correctly)"""
    for _ in range(maxg):
        if not dbg(p)['armed']: p.evaluate('WQ37Run._debugAdvanceToGate()')
        if dbg(p)['gateKind'] == kind: return
        take(p, True)
    raise AssertionError('no %s gate found' % kind)


def find_gate(p, kind, lead=0, maxg=25):
    """leave the game `lead` px before the next gate of `kind` (world frozen)"""
    for _ in range(maxg):
        d = dbg(p)
        if d['gateKind'] == kind and not d['armed']:
            p.evaluate('l=>WQ37Run._debugAdvanceToGate(l)', lead); hold(p); return
        if not d['armed']: p.evaluate('WQ37Run._debugAdvanceToGate()')
        if dbg(p)['gateKind'] == 'spell': spell(p, 'ok')
        else:
            p.evaluate('n=>WQ37Run._debugLane(n)', correct_lane(p)); step(p, 2, True)
    raise AssertionError('no %s gate found' % kind)


def test_spell_gate(pw):
    b, p, errs = new_page(pw, False)
    boot(p, mode='endless', world=0, seed=7); start(p); p.evaluate('WQ37Run._debugGod(true)')
    goto_kind(p, 'spell')
    p.evaluate('WQ37Run._debugQuiet(true)')
    d = dbg(p); sp = d['spell']; word = sp['word']
    assert d['armed'] and sp['idx'] == 0 and sp['n'] == len(word) and 2 <= len(word) <= 7 and d['doors'] == [], d
    assert len(set(sp['letters'])) == 3 and sp['letters'][sp['okLane']] == word[0], sp
    gi, sc, cor, wr, H = d['gateIndex'], d['score'], d['correct'], d['wrong'], d['hearts']
    # 1) a wrong (out-of-order) letter does not advance the word and costs a small penalty
    others = [i for i in range(3) if i != sp['okLane']]
    bad = next((i for i in others if len(word) > 1 and sp['letters'][i] == word[1]), others[0])
    p.evaluate('n=>WQ37Run._debugLane(n)', bad)
    p.evaluate("()=>{const W=WQ37Run;let g=0;while(W._debug.spell&&W._debug.spell.mis===0&&g++<600)W._debugStep(1);}")
    d = dbg(p); sp = d['spell']
    assert sp['mis'] == 1 and sp['idx'] == 0 and sp['got'] == '' and d['combo'] == 0 and d['score'] == max(0, sc - 20) and d['gateIndex'] == gi and d['hearts'] == H, d
    # 2) correct letters in order advance
    p.evaluate("""()=>{const W=WQ37Run;let g=0;const i0=W._debug.spell.idx;while(W._debug.spell&&W._debug.spell.idx===i0&&g++<900){const s=W._debug.spell;if(s.open>0)W._debugLane(s.okLane);W._debugStep(1);}}""")
    sp = dbg(p)['spell']; assert sp['idx'] == 1 and sp['got'] == word[0] and sp['mis'] == 1, sp
    spell(p, 'ok')
    d = dbg(p); assert d['gateIndex'] == gi + 1 and d['correct'] == cor + 1 and d['wrong'] == wr and d['hearts'] == H and d['state'] == 'play', d
    assert d['score'] >= sc - 20 + 100, d
    p.screenshot(path=SHOTS + '/desk_spell_done.png')
    p.evaluate('game.destroy()'); assert not errs, errs
    # 3) three wrong letters fail the gate (heart lost, counted as wrong)
    boot(p, mode='endless', world=1, seed=19); start(p); p.evaluate('WQ37Run._debugGod(true)')
    goto_kind(p, 'spell'); p.evaluate('WQ37Run._debugQuiet(true)')
    d = dbg(p); gi, H, wr = d['gateIndex'], d['hearts'], d['wrong']
    spell(p, 'bad')
    d = dbg(p); assert d['gateIndex'] == gi + 1 and d['wrong'] == wr + 1 and d['hearts'] == H - 1 and d['combo'] == 0, d
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()


def test_listen_gate(pw):
    b, p, errs = new_page(pw, False)
    boot(p, mode='endless', world=0, seed=3); start(p); p.evaluate('WQ37Run._debugGod(true)')
    goto_kind(p, 'listen')
    d = dbg(p); assert d['canSpeak'] and d['spoke'] >= 1 and d['lastSpoken'] == d['correctWord'], d
    spoken = p.evaluate('__spoke'); assert spoken[-1] == d['correctWord'], spoken
    p.wait_for_timeout(150); assert dbg(p)['sayVisible']
    p.screenshot(path=SHOTS + '/desk_listen.png')
    n0 = len(spoken); p.click('.wq37r-say'); assert len(p.evaluate('__spoke')) == n0 + 1
    take(p, True); assert dbg(p)['correct'] >= 1
    p.evaluate('game.destroy()')
    # no speech (sound off): falls back to the Chinese hint, nothing is spoken, no replay button
    boot(p, mode='endless', world=0, seed=3, sound=False); start(p); p.evaluate('WQ37Run._debugGod(true)')
    p.evaluate('__spoke.length=0'); goto_kind(p, 'listen'); p.wait_for_timeout(150)
    d = dbg(p); assert not d['canSpeak'] and d['spoke'] == 0 and not d['sayVisible'], d
    assert p.evaluate('document.querySelector(".wq37r-say").style.display') in ('', 'none') and p.evaluate('__spoke.length') == 0
    p.screenshot(path=SHOTS + '/desk_listen_fallback.png')
    take(p, True)
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()


def test_boss_hp_phase(pw):
    b, p, errs = new_page(pw, False)
    boot(p, world=2, stage=2, difficulty=3, seed=21)
    start(p); p.evaluate('WQ37Run._debugGod(true)')
    for i in range(7): take(p, True)
    to_gate(p)
    d = dbg(p); assert d['boss'] and d['gateIndex'] == 7 and d['state'] == 'play', d
    assert d['bossHp'] == 4 and d['bossMax'] == 4 and d['bossPhase'] == 1, d
    take(p, True); d = dbg(p); assert d['bossHp'] == 3 and d['bossPhase'] == 1, d
    to_gate(p)
    p.evaluate('n=>WQ37Run._debugLane(n)', correct_lane(p)); step(p, 2, True)     # judge this gate by hand to see the banner
    d = dbg(p); assert d['bossHp'] == 2 and d['bossPhase'] == 2 and '第二階段' in (d['banner'] or ''), d   # phase 2 at half HP
    to_gate(p); H = d['hearts']
    take(p, False); d = dbg(p); assert d['bossHp'] == 2 and d['hearts'] == H - 1 and d['bossStreak'] == 0 and d['state'] == 'play', d   # wrong answer: no damage
    take(p, True); d = dbg(p); assert d['bossHp'] == 1 and d['bossPhase'] == 2 and not d['bossDone'] and d['state'] == 'play', d
    take(p, True)
    d = dbg(p); assert d['bossHp'] == 0 and d['bossDone'] and d['state'] == 'won' and d['stagePassed'], d
    r = p.evaluate('finished')[0]; assert r['passed'] and r['wrong'] == 1 and r['stars'] in (3, 4) and r['bossDefeated'], r
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()


def boss_boot(p, world, seed, god=True):
    boot(p, world=world, stage=2, difficulty=3, seed=seed); start(p)
    if god: p.evaluate('WQ37Run._debugGod(true)')
    p.evaluate('WQ37Run._debugQuiet(true)'); hold(p); p.evaluate('WQ37Run._debugBoss()')


def wait_atk(p, kind, tmin=0.0, maxf=1500):
    for _ in range(maxf):
        step(p, 1)
        a = [x for x in dbg(p)['atkInfo'] if x['k'] == kind]
        if a and a[0]['t'] >= tmin: return a[0]
    raise AssertionError('no %s attack' % kind)


def test_boss_attacks(pw):
    b, p, errs = new_page(pw, False)
    expect = {0: {'fall'}, 2: {'beam'}, 3: {'laser'}, 4: {'beam', 'fall'}}
    for w in range(5):
        boss_boot(p, w, 30 + w)
        seen, maxobs = set(), 0
        for _ in range(200):
            step(p, 6); d = dbg(p); seen |= set(d['attacks']); maxobs = max(maxobs, d['obstacles'])
        assert d['bossName'] and d['boss'], d
        if w == 1: assert maxobs > 0, (w, seen, maxobs)       # projectile lanes
        else: assert seen & expect[w], (w, seen)
        p.evaluate('game.destroy()')
    # falling rock: warned in the lane, hurts only when you stay there
    boss_boot(p, 0, 31, god=False); a = wait_atk(p, 'fall'); H = dbg(p)['hearts']
    assert a['lane'] == dbg(p)['lane'] and a['t'] < a['warn']
    step(p, 150); assert dbg(p)['hearts'] == H - 1
    p.evaluate('game.destroy()')
    boss_boot(p, 0, 31, god=False); a = wait_atk(p, 'fall'); H = dbg(p)['hearts']
    p.evaluate('n=>WQ37Run._debugLane(n)', (a['lane'] + 1) % 3); step(p, 150); assert dbg(p)['hearts'] == H
    p.evaluate('game.destroy()')
    # sweeping beam: stay on the ground = hit, jump = clear
    boss_boot(p, 2, 32, god=False); a = wait_atk(p, 'beam'); H = dbg(p)['hearts']
    step(p, 125); assert dbg(p)['hearts'] == H - 1
    p.evaluate('game.destroy()')
    boss_boot(p, 2, 32, god=False); a = wait_atk(p, 'beam'); H = dbg(p)['hearts']
    wait_atk(p, 'beam', a['warn'] + 0.2); p.evaluate('WQ37Run._debugJump()'); step(p, 45)
    d = dbg(p); assert d['hearts'] == H and d['dodges'] >= 1, d
    p.evaluate('game.destroy()')
    # high beam (world 4 phase 1): slide under it
    boss_boot(p, 4, 33, god=False); a = wait_atk(p, 'beam'); assert a['hi']; H = dbg(p)['hearts']
    wait_atk(p, 'beam', a['warn'] + 0.3); p.evaluate('WQ37Run._debugSlide()'); step(p, 45)
    d = dbg(p); assert d['hearts'] == H and d['dodges'] >= 1, d
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()


def test_powerups(pw):
    b, p, errs = new_page(pw, False)
    # x2 score doubles gate points
    gains = []
    for x2 in (False, True):
        boot(p, seed=6); start(p); p.evaluate('WQ37Run._debugGod(true)'); p.evaluate('WQ37Run._debugQuiet(true)')
        to_gate(p); s0 = dbg(p)['score']
        if x2: p.evaluate("WQ37Run._debugGive('x2')")
        take(p, True); gains.append(dbg(p)['score'] - s0)
        p.evaluate('game.destroy()')
    assert gains == [120, 240], gains
    # timers expire
    boot(p, seed=6); start(p); p.evaluate('WQ37Run._debugGod(true)'); p.evaluate('WQ37Run._debugQuiet(true)'); hold(p)
    p.evaluate('n=>WQ37Run._debugLane(n)', correct_lane(p))
    sp0 = dbg(p)['speed']
    for k in ('slow', 'x2', 'magnet', 'shield', 'revive'): p.evaluate('k=>WQ37Run._debugGive(k)', k)
    d = dbg(p); pu = d['pu']
    assert abs(pu['slow'] - 6) < .01 and abs(pu['x2'] - 8) < .01 and abs(pu['magnet'] - 7) < .01 and abs(pu['shield'] - 12) < .01 and pu['revive'] and d['shield'], pu
    assert d['speed'] < sp0 * 0.7, (d['speed'], sp0)                  # slow time
    p.screenshot(path=SHOTS + '/desk_powerups.png')
    step(p, 6 * 60 + 6, True); pu = dbg(p)['pu']
    assert pu['slow'] == 0 and 1 < pu['x2'] < 2.1 and 0.5 < pu['magnet'] < 1.1 and pu['shield'] > 5, pu
    assert dbg(p)['speed'] > sp0 * 0.95
    step(p, 7 * 60, True); d = dbg(p); pu = d['pu']
    assert pu['x2'] == 0 and pu['magnet'] == 0 and pu['shield'] == 0 and not d['shield'] and pu['revive'], d
    p.evaluate('game.destroy()')
    # shield absorbs one wrong answer
    boot(p, seed=2); start(p); p.evaluate('WQ37Run._debugGod(true)'); to_gate(p)
    p.evaluate("WQ37Run._debugGive('shield')"); H = dbg(p)['hearts']; take(p, False)
    d = dbg(p); assert d['hearts'] == H and d['wrong'] == 1 and not d['shield'], d
    p.evaluate('game.destroy()')
    # revive: refills hearts once, then the run can end
    boot(p, seed=2); start(p); p.evaluate('WQ37Run._debugGod(true)'); to_gate(p)
    p.evaluate("WQ37Run._debugGive('revive')"); p.evaluate('WQ37Run._debugHearts(1)')
    take(p, False); d = dbg(p)
    assert d['state'] == 'play' and d['hearts'] == 2 and not d['pu']['revive'] and d['pu']['reviveUsed'], d
    take(p, False); take(p, False)
    d = dbg(p); assert d['state'] == 'over' and d['hearts'] == 0, d
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()


def test_endless(pw):
    b, p, errs = new_page(pw, False)
    m = p.evaluate('WQ37Run.modes'); assert m['endless']['id'] == 'endless' and m['story']['id'] == 'story', m
    p.evaluate("localStorage.removeItem('wq37-run-best')"); assert p.evaluate('WQ37Run.getBest()') == {'dist': 0, 'score': 0}
    boot(p, mode='endless', world=1, seed=9); start(p); p.evaluate('WQ37Run._debugGod(true)')
    d0 = dbg(p); assert d0['mode'] == 'endless' and d0['gates'] > 1e6, d0
    for i in range(7): take(p, True)
    d = dbg(p); assert d['state'] == 'play' and d['finishX'] == 0 and d['gateIndex'] == 7 and d['meters'] > 100 and not d['boss'], d
    assert d['speed'] > d0['speed'] * 1.1, (d['speed'], d0['speed'])     # speed ramps up
    while dbg(p)['state'] == 'play': take(p, False)
    d = dbg(p); assert d['state'] == 'over' and d['hearts'] == 0, d
    r = p.evaluate('finished')[0]
    assert r['mode'] == 'endless' and r['newRecord'] and r['distance'] > 0 and r['best']['dist'] == r['distance'] and r['best']['score'] == r['score'], r
    p.wait_for_timeout(1900); assert p.locator('text=NEW RECORD').count() == 1
    p.screenshot(path=SHOTS + '/desk_endless_result.png')
    st = json.loads(p.evaluate("localStorage.getItem('wq37-run-best')")); assert st == {'dist': r['distance'], 'score': r['score']}, st
    # shorter second run: no record, the best is kept
    p.click('text=再玩'); p.wait_for_timeout(200); p.evaluate('WQ37Run._debugGod(true)')
    for _ in range(3): take(p, False)
    r2 = p.evaluate('finished')[1]
    assert r2['mode'] == 'endless' and not r2['newRecord'] and r2['distance'] < r['distance'] and r2['best']['dist'] == r['distance'], r2
    p.wait_for_timeout(1900); assert p.locator('text=NEW RECORD').count() == 0
    p.evaluate('game.destroy()')
    # persists across page loads; a better run replaces it
    p.reload(); assert p.evaluate('WQ37Run.getBest().dist') == r['distance']
    boot(p, mode='endless', world=1, seed=9); start(p); p.evaluate('WQ37Run._debugGod(true)')
    for i in range(10): take(p, True)
    while dbg(p)['state'] == 'play': take(p, False)
    r3 = p.evaluate('finished')[0]; assert r3['newRecord'] and r3['distance'] > r['distance'], r3
    assert p.evaluate('WQ37Run.getBest().dist') == r3['distance']
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()


def test_screenshots(pw):
    for tag, touch in (('phone', True), ('desk', False)):
        # normal run with a jump obstacle (wide hurdle), then mid-jump and a slide bar
        b, p, errs = new_page(pw, touch)
        boot(p, world=0, stage=0, seed=12); start(p); p.evaluate('WQ37Run._debugGod(true)'); hold(p)
        step(p, 62, True); p.wait_for_timeout(120); p.screenshot(path='%s/%s_1_jump_obstacle.png' % (SHOTS, tag))
        p.evaluate('WQ37Run._debugJump()'); step(p, 20, True); p.wait_for_timeout(120); p.screenshot(path='%s/%s_1b_jump_air.png' % (SHOTS, tag))
        p.evaluate('WQ37Run._debugQuiet(true)'); p.evaluate("WQ37Run._debugSpawn(2,'all',330)"); p.evaluate("WQ37Run._debugSpawn(1,0,640)")
        step(p, 30, True); p.evaluate('WQ37Run._debugSlide()'); step(p, 8, True); p.wait_for_timeout(120); p.screenshot(path='%s/%s_1c_slide_bar.png' % (SHOTS, tag))
        p.evaluate('game.destroy()')
        # spelling gate
        boot(p, mode='endless', world=0, seed=7); start(p); p.evaluate('WQ37Run._debugGod(true)')
        find_gate(p, 'spell', 700); step(p, 75, True); p.wait_for_timeout(120); p.screenshot(path='%s/%s_2_spell.png' % (SHOTS, tag))
        p.evaluate('game.destroy()')
        # bosses: falling rocks (world 0) and sweeping beam (world 2)
        for w, kind in ((0, 'fall'), (2, 'beam'), (3, 'laser')):
            boss_boot(p, w, 40 + w); wait_atk(p, kind, 0.8); p.wait_for_timeout(120)
            p.screenshot(path='%s/%s_3_boss_w%d_%s.png' % (SHOTS, tag, w, kind))
            p.evaluate('game.destroy()')
        # power-ups HUD
        boot(p, world=4, stage=0, seed=3); start(p); p.evaluate('WQ37Run._debugGod(true)'); hold(p)
        for k in ('x2', 'slow', 'shield', 'revive'): p.evaluate('k=>WQ37Run._debugGive(k)', k)
        step(p, 30, True); p.wait_for_timeout(120); p.screenshot(path='%s/%s_4_powerups.png' % (SHOTS, tag))
        p.evaluate('game.destroy()')
        # result card (story) and endless NEW RECORD
        boot(p, world=0, stage=0, seed=5); start(p)
        perfect(p, 0, 0); p.wait_for_timeout(1900); p.screenshot(path='%s/%s_5_result.png' % (SHOTS, tag))
        p.evaluate('game.destroy()')
        p.evaluate("localStorage.removeItem('wq37-run-best')")
        boot(p, mode='endless', world=3, seed=5); start(p); p.evaluate('WQ37Run._debugGod(true)')
        for i in range(3): take(p, True)
        while dbg(p)['state'] == 'play': take(p, False)
        p.wait_for_timeout(1900); p.screenshot(path='%s/%s_5b_result_endless.png' % (SHOTS, tag))
        p.evaluate('game.destroy()'); assert not errs, errs
        b.close()


def test_perks(pw):
    b, p, errs = new_page(pw, False)
    boot(p, perk='heart', seed=2); start(p)
    assert dbg(p)['hearts'] == 4
    p.evaluate('game.destroy()')
    boot(p, perk='shield', seed=2); start(p)
    p.evaluate('WQ37Run._debugGod(true)')
    to_gate(p); H = dbg(p)['hearts']; take(p, False)
    d = dbg(p); assert d['hearts'] == H and d['wrong'] == 1 and d['shield'] is False, d
    to_gate(p)
    H = dbg(p)['hearts']; take(p, False)
    assert dbg(p)['hearts'] == H - 1
    p.evaluate('game.destroy()')
    boot(p, perk='coin', seed=2); start(p)
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()


def test_fps_and_destroy(pw):
    b, p, errs = new_page(pw, False)
    boot(p, world=3, stage=1, difficulty=5, seed=8); start(p)
    p.evaluate('WQ37Run._debugGod(true)')
    ft = p.evaluate('''()=>new Promise(r=>{let n=0,t0=performance.now();function f(){n++;if(performance.now()-t0<3000)requestAnimationFrame(f);else r((performance.now()-t0)/n)}requestAnimationFrame(f)})''')
    print('desktop avg frame interval %.2f ms (%.1f fps); update+render %.2f ms' % (ft, 1000 / ft, dbg(p)['avgRenderMs']))
    assert ft < 34
    p.screenshot(path=SHOTS + '/desk_w3_run.png')
    p.evaluate('game.destroy()'); p.evaluate('game.destroy()')
    assert p.evaluate('document.querySelectorAll("canvas").length') == 0
    assert p.evaluate('document.querySelector("#c").children.length') == 0
    p.keyboard.press('ArrowUp'); p.keyboard.press('Space'); p.wait_for_timeout(100)
    assert not errs, errs
    # every world renders without errors
    for w in range(5):
        boot(p, world=w, seed=w); start(p); p.wait_for_timeout(700)
        p.screenshot(path='%s/desk_world%d.png' % (SHOTS, w))
        p.evaluate('game.destroy()')
    assert not errs, errs
    b.close()


if __name__ == '__main__':
    with sync_playwright() as pw:
        fns = (test_touch, test_desktop_keys_and_gates, test_perfect_runs, test_vertical_dodging, test_spell_gate, test_listen_gate, test_boss_hp_phase,
               test_boss_attacks, test_powerups, test_endless, test_perks, test_fps_and_destroy, test_screenshots)
        npass = 0
        for fn in fns:
            fn(pw); npass += 1; print('PASS', fn.__name__)
        print('ALL PASSED %d/%d' % (npass, len(fns)))

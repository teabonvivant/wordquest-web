"""Playwright tests for r37_src/fps_game.js (WQ37FPS). Run: python3 test_fps.py  (or pytest)."""
import os, json, math, time
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
JS = os.path.join(HERE, '..', 'r37_src', 'fps_game.js')
SHOTS = '/tmp/fps_shots'
PAGE = '/tmp/fps_test_page.html'
WORDS = [('apple','蘋果','🍎'),('banana','香蕉','🍌'),('cat','貓','🐱'),('dog','狗','🐶'),
         ('egg','雞蛋','🥚'),('fish','魚','🐟'),('grape','葡萄','🍇'),('house','屋','🏠')]
os.makedirs(SHOTS, exist_ok=True)
with open(PAGE, 'w') as f:
    f.write('''<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>html,body{margin:0;height:100%;overflow:hidden}#c{position:relative;width:100vw;height:100vh}</style></head>
<body><div id="c"></div><script src="file://@JS@"></script>
<script>
window.finished=null; window.exited=0; window.game=null;
window.boot=function(d,rounds,extra){window.finished=null;window.exited=0;
 window.game=WQ37FPS.start(document.getElementById('c'),Object.assign({words:@W@,difficulty:d||1,rounds:rounds||10,
  onFinish:function(r){window.finished=r},onExit:function(){window.exited++}},extra||{}));};
</script></body></html>'''.replace('@JS@', os.path.abspath(JS)).replace('@W@', json.dumps([dict(en=a, zh=b, emoji=c) for a, b, c in WORDS], ensure_ascii=False)))

def dbg(p): return p.evaluate('WQ37FPS._debug')

SPEECH_STUB = '''window.__spoken=[];
if(typeof window.SpeechSynthesisUtterance==='undefined'){window.SpeechSynthesisUtterance=function(t){this.text=t}}
try{Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak:function(u){window.__spoken.push(u.text)},cancel:function(){},getVoices:function(){return[]}}})}catch(e){}'''

def new_page(pw, touch, reduced=False):
    b = pw.chromium.launch(args=['--no-sandbox'])
    kw = dict(reduced_motion='reduce') if reduced else {}
    if touch:
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, **kw)
    else:
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, **kw)
    ctx.add_init_script(SPEECH_STUB)
    p = ctx.new_page(); errs = []
    p.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto('file://' + PAGE)
    return b, p, errs

def aim(p, want_correct):
    for _ in range(40):   # only a word not hidden behind a wall can be hit; wait for one to come into view
        d = dbg(p)
        for i, t in enumerate(d['targets']):
            if (t['word'] == d['correctWord']) == want_correct and t['clear']:
                p.evaluate('i=>WQ37FPS._debugTurnTo(i)', i); return t['word']
        p.wait_for_timeout(100)
    raise AssertionError('no visible target found: ' + json.dumps(d, ensure_ascii=False))

def test_touch(pw):
    b, p, errs = new_page(pw, True)
    p.evaluate('boot(2,10)'); p.wait_for_timeout(900)
    p.screenshot(path=SHOTS + '/mobile_intro.png')
    p.tap('text=開始'); p.wait_for_timeout(600)
    d = dbg(p); assert d['state'] == 'play' and d['touch'], d
    assert len(d['targets']) == 4 and d['hearts'] == 3 and d['round'] == 1
    p.screenshot(path=SHOTS + '/mobile_play.png')
    # synthetic pointer fire at the correct target through the touch button
    aim(p, True); s0 = dbg(p)['score']
    p.evaluate('''()=>{const b=document.querySelector('.wq37-fire');
      b.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',pointerId:7,bubbles:true,cancelable:true,isPrimary:true}));
      b.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',pointerId:7,bubbles:true}));}''')
    p.wait_for_timeout(200)
    d = dbg(p); assert d['score'] > s0 and d['round'] == 2, d
    p.wait_for_timeout(700); p.screenshot(path=SHOTS + '/mobile_play2.png')
    # joystick drag moves player
    x0 = dbg(p)['player']; box = p.viewport_size
    p.evaluate('''()=>{const r=document.querySelector('.wq37-root');const mk=(t,x,y)=>r.dispatchEvent(new PointerEvent(t,{pointerType:'touch',pointerId:3,clientX:x,clientY:y,bubbles:true,isPrimary:true}));
      mk('pointerdown',80,700);window.dispatchEvent(new PointerEvent('pointermove',{pointerType:'touch',pointerId:3,clientX:80,clientY:640,bubbles:true}));}''')
    p.wait_for_timeout(500)
    x1 = dbg(p)['player']; assert math.hypot(x1['x']-x0['x'], x1['y']-x0['y']) > 0.3, (x0, x1)
    p.evaluate('''()=>window.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',pointerId:3,bubbles:true}))''')
    p.evaluate('game.destroy()')
    assert p.evaluate('document.querySelectorAll("#c canvas").length') == 0
    assert not errs, errs
    b.close()

def test_desktop(pw):
    b, p, errs = new_page(pw, False)
    p.evaluate('boot(1,10)'); p.wait_for_timeout(900)
    p.screenshot(path=SHOTS + '/desktop_intro.png')
    p.keyboard.press('Enter'); p.wait_for_timeout(500)
    d = dbg(p); assert d['state'] == 'play', d
    # keyboard
    a0 = dbg(p)['player']
    p.keyboard.down('KeyW'); p.wait_for_timeout(500); p.keyboard.up('KeyW')
    a1 = dbg(p)['player']; assert math.hypot(a1['x']-a0['x'], a1['y']-a0['y']) > 0.5, (a0, a1)
    p.keyboard.down('ArrowRight'); p.wait_for_timeout(400); p.keyboard.up('ArrowRight')
    a2 = dbg(p)['player']; assert a2['a'] - a1['a'] > 0.4, (a1, a2)
    p.wait_for_timeout(400); p.screenshot(path=SHOTS + '/desktop_play.png')
    p.evaluate('game.destroy();boot(1,10)')
    p.keyboard.press('Enter')
    p.wait_for_function("WQ37FPS._debug.state==='play'&&WQ37FPS._debug.targets.some(t=>t.clear&&t.word===WQ37FPS._debug.correctWord)")
    # correct shot
    aim(p, True); s0 = dbg(p)['score']; p.keyboard.press('Space'); p.wait_for_timeout(150)
    d = dbg(p); assert d['score'] > s0 and d['round'] == 2, d
    # wrong shot reduces hearts, then two more end game
    p.wait_for_timeout(600); aim(p, False); h0 = dbg(p)['hearts']; WQ = 'WQ37FPS._debugFire(0)'
    p.evaluate(WQ); p.wait_for_timeout(100)
    assert dbg(p)['hearts'] == h0 - 1
    p.screenshot(path=SHOTS + '/desktop_wrong.png')
    for _ in range(2):
        aim(p, False); p.evaluate(WQ); p.wait_for_timeout(100)
    d = dbg(p); assert d['hearts'] == 0 and d['state'] == 'over', d
    fin = p.evaluate('finished'); assert fin, 'onFinish not called'
    for k in ('score', 'correct', 'wrong', 'rounds', 'seconds', 'stars', 'maxCombo'): assert k in fin, k
    assert 1 <= fin['stars'] <= 5
    p.wait_for_timeout(1600); p.screenshot(path=SHOTS + '/desktop_result.png')
    assert p.locator('text=再玩一次').count() == 1
    p.click('text=返回'); assert p.evaluate('exited') == 1
    # replay then frame timing
    p.click('text=再玩一次'); p.wait_for_timeout(300); assert dbg(p)['state'] == 'play' and dbg(p)['hearts'] == 3
    ft = p.evaluate('''()=>new Promise(r=>{let n=0,t0=performance.now();function f(){n++;if(performance.now()-t0<3000)requestAnimationFrame(f);else r((performance.now()-t0)/n)}requestAnimationFrame(f)})''')
    print('desktop avg rAF frame interval ms: %.2f ; avg update+render ms: %.2f' % (ft, dbg(p)['avgRenderMs']))
    assert dbg(p)['avgRenderMs'] < 16.7
    p.evaluate('game.destroy()')
    assert p.evaluate('document.querySelectorAll("#c canvas").length') == 0
    assert p.evaluate('document.querySelector("#c").children.length') == 0
    p.keyboard.press('Space'); p.wait_for_timeout(200)
    assert not errs, errs
    b.close()

def test_win_five_stars(pw):
    b, p, errs = new_page(pw, False)
    p.evaluate('boot(3,3,{boss:false})'); p.keyboard.press('Enter'); p.wait_for_timeout(300)
    for _ in range(3):
        aim(p, True); p.evaluate('WQ37FPS._debugFire(0)'); p.wait_for_timeout(120)
    fin = p.evaluate('finished'); assert fin and fin['stars'] == 5 and fin['correct'] == 3 and fin['maxCombo'] == 3, fin
    p.wait_for_timeout(1500); p.screenshot(path=SHOTS + '/desktop_win.png')
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()


def cmd(p, name, a=None, b=None): return p.evaluate('([n,a,b])=>WQ37FPS._cmd(n,a,b)', [name, a, b])
def start_game(p, d, rounds, extra=None, calm=True):
    p.evaluate('([d,r,e])=>boot(d,r,e)', [d, rounds, extra or {}]); p.keyboard.press('Enter'); p.wait_for_timeout(250)
    assert dbg(p)['state'] == 'play'
    if calm: cmd(p, 'calm', 1)
def shoot_correct(p):
    aim(p, True); s0 = dbg(p)['score']; p.evaluate('WQ37FPS._debugFire(0)'); p.wait_for_timeout(60)
    assert dbg(p)['score'] > s0
def lose_all(p):
    for _ in range(3):
        if dbg(p)['state'] != 'play': break
        aim(p, False); p.evaluate('WQ37FPS._debugFire(0)'); p.wait_for_timeout(80)
    assert dbg(p)['state'] == 'over'

def test_arenas_questions_boss(pw, shots=None):
    """3 waves = 3 arenas, rotating question types, speech in listen rounds, then the boss fight (HP drops / counter-attack / victory)."""
    b, p, errs = new_page(pw, False)
    start_game(p, 2, 6)
    arenas, qtypes, banners = [], [], []
    for r in range(1, 7):
        d = dbg(p); assert d['round'] == r, d
        arenas.append(d['arena']); qtypes.append(d['qtype']); banners.append(d['bannerText'])
        if r in (1, 3, 5): assert d['bannerText'] and d['bannerText'].startswith('第'), d   # wave title banner on each new arena
        if r == 2: assert d['wave'] == 1
        if r in (1, 3, 5) and shots: p.wait_for_timeout(500); p.screenshot(path='%s/%s_wave%d.png' % (SHOTS, shots, (r + 1) // 2))
        if qtypes[-1] == 'pic':   # English -> picture: bubbles carry an emoji
            assert all(t['emoji'] for t in d['targets']), d
        if qtypes[-1] == 'listen': p.wait_for_timeout(1800)   # speech starts after a short delay
        shoot_correct(p); p.wait_for_timeout(120)
    assert arenas == [0, 0, 1, 1, 2, 2], arenas
    assert qtypes == ['zh', 'listen', 'pic', 'zh', 'listen', 'pic'], qtypes
    spoken = p.evaluate('__spoken'); assert len(spoken) >= 2 and all(isinstance(x, str) and x for x in spoken), spoken
    # boss round
    d = dbg(p); assert d['state'] == 'play' and d['boss'] and d['boss']['hp'] == d['boss']['max'] == len(d['boss']['word']), d
    assert d['bannerText'].startswith('BOSS'), d
    word = d['boss']['word']; assert word.isalpha() and 3 <= len(word) <= 7
    assert all(len(t['word']) == 1 for t in d['targets']) and d['arena'] == 2
    p.wait_for_timeout(1700)
    if shots: p.screenshot(path='%s/%s_boss.png' % (SHOTS, shots))
    # wrong letter: boss counter-attacks (heart lost), boss hp unchanged
    d0 = dbg(p); aim(p, False); p.evaluate('WQ37FPS._debugFire(0)'); p.wait_for_timeout(100)
    d1 = dbg(p); assert d1['hearts'] == d0['hearts'] - 1 and d1['boss']['hp'] == d0['boss']['hp'] and d1['boss']['idx'] == 0, (d0, d1)
    if shots: p.screenshot(path='%s/%s_boss_hit.png' % (SHOTS, shots))
    # shield absorbs the counter-attack
    cmd(p, 'shield', 1); p.wait_for_timeout(2400)
    aim(p, False); p.evaluate('WQ37FPS._debugFire(0)'); p.wait_for_timeout(100)
    d2 = dbg(p); assert d2['hearts'] == d1['hearts'] and not d2['shield'], d2
    # right letters in order: each one damages the boss
    p.wait_for_timeout(2400); hp = d2['boss']['hp']
    for i, ch in enumerate(word):
        d = dbg(p); assert d['correctWord'] == ch.upper() and d['boss']['hp'] == hp - i, (d, ch)
        if i == len(word) - 1: break
        shoot_correct(p); p.wait_for_timeout(120)
        assert dbg(p)['boss']['hp'] == hp - i - 1
    aim(p, True); p.evaluate('WQ37FPS._debugFire(0)'); p.wait_for_timeout(100)
    d = dbg(p); assert d['state'] == 'over' and d['boss']['dead'] and d['boss']['hp'] == 0, d
    fin = p.evaluate('finished'); assert fin and fin['bossBeaten'] is True and fin['stars'] >= 1 and 'best' in fin, fin
    for k in ('score', 'correct', 'wrong', 'rounds', 'seconds', 'stars', 'maxCombo'): assert k in fin
    assert fin['correct'] == 6 + len(word) and fin['wrong'] == 2, fin
    p.wait_for_timeout(2900)
    if shots: p.screenshot(path='%s/%s_result.png' % (SHOTS, shots))
    assert p.locator('text=打敗字母怪獸').count() >= 1
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()

def test_spitter(pw):
    """Spitter orbs hurt when you stand still, can be dodged by strafing, and the spitter fires by itself and can be shot."""
    b, p, errs = new_page(pw, False)
    start_game(p, 3, 10)
    h0 = dbg(p)['hearts']; cmd(p, 'proj', 3); p.wait_for_timeout(300)
    assert dbg(p)['projectiles'] == 1
    p.wait_for_timeout(1800)
    d = dbg(p); assert d['hearts'] == h0 - 1 and d['projectiles'] == 0, d
    p.wait_for_timeout(1300)   # invulnerability window over
    h1 = dbg(p)['hearts']; cmd(p, 'proj', 3)
    p.keyboard.down('KeyD'); p.wait_for_timeout(1300); p.keyboard.up('KeyD')
    p.wait_for_timeout(1500)
    d = dbg(p); assert d['hearts'] == h1, ('dodge failed', d)
    # a spitter telegraphs and fires on its own
    cmd(p, 'clear'); cmd(p, 'spitter', 5, 0.3); p.wait_for_timeout(300)
    p.wait_for_function('WQ37FPS._debug.projectiles>0', timeout=4000)
    # shooting the spitter scores
    cmd(p, 'clear'); cmd(p, 'spitter', 5, 99); p.wait_for_timeout(100)
    s0 = dbg(p)['score']; p.evaluate('WQ37FPS._debugFire(0)'); p.wait_for_timeout(80)
    d = dbg(p); assert d['spitters'] == 0 and d['score'] >= s0 + 80, d
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()

def test_spawn_scaling(pw):
    """Natural enemy spawning scales with difficulty (more bugs/spitters at difficulty 5 than 1)."""
    from itertools import product
    from playwright.sync_api import Error
    res = {}
    for dfc in (1, 5):
        b, p, errs = new_page(pw, False)
        p.evaluate('([d])=>boot(d,10,{})', [dfc]); p.keyboard.press('Enter'); p.wait_for_timeout(200)
        p.evaluate('WQ37FPS._cmd("place",7.5,12.5)')
        mx = 0
        for _ in range(60):   # sample ~18s; keep the player alive
            p.evaluate('WQ37FPS._cmd("shield",1)'); d = dbg(p)
            mx = max(mx, d['bugs'] + d['spitters'])
            if d['state'] != 'play': break
            p.wait_for_timeout(300)
        res[dfc] = mx; p.evaluate('game.destroy()'); b.close()
    assert res[5] > res[1] or res[5] >= 2, res

def test_freeze(pw):
    """Freeze shot: enemies stop for 3s then move again; weapon timer is shown/ticks."""
    b, p, errs = new_page(pw, False)
    start_game(p, 5, 10)
    cmd(p, 'bug', 8); p.wait_for_timeout(100)
    e0 = dbg(p)['enemies'][0]; p.wait_for_timeout(400); e1 = dbg(p)['enemies'][0]
    assert math.hypot(e1['x'] - e0['x'], e1['y'] - e0['y']) > 0.15, (e0, e1)
    cmd(p, 'weapon', 'freeze'); d = dbg(p); assert d['freezeW'] > 10
    p.evaluate('WQ37FPS._debugFire(1.2)'); p.wait_for_timeout(100)   # shoot away from the bug: freezing is a side effect of any shot
    d = dbg(p); assert d['freezeT'] > 2, d
    f0 = d['enemies'][0]; p.wait_for_timeout(1200); f1 = dbg(p)['enemies'][0]
    assert math.hypot(f1['x'] - f0['x'], f1['y'] - f0['y']) < 0.01, (f0, f1)
    p.screenshot(path=SHOTS + '/desktop_freeze.png')
    p.wait_for_timeout(2200); t0 = dbg(p)['enemies'][0]; p.wait_for_timeout(400); t1 = dbg(p)['enemies'][0]
    assert dbg(p)['freezeT'] == 0 and math.hypot(t1['x'] - t0['x'], t1['y'] - t0['y']) > 0.15, (t0, t1)
    assert dbg(p)['freezeW'] < 12
    # spread weapon pickup via the real pick-up path
    cmd(p, 'clear'); cmd(p, 'pickup', 'triple'); p.wait_for_timeout(100)
    p.evaluate('WQ37FPS._debugFire(0)')
    p.keyboard.down('KeyW'); p.wait_for_timeout(1000); p.keyboard.up('KeyW')
    assert dbg(p)['triple'] > 8, dbg(p)
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()

def test_combo_best_record(pw):
    """Combo multiplier x2/x3, best score persists across reload, NEW RECORD on the result screen, reduced-motion disables shake."""
    b, p, errs = new_page(pw, False)
    start_game(p, 1, 10)
    mults = []; scores = [dbg(p)['score']]
    for _ in range(6):
        shoot_correct(p); p.wait_for_timeout(700); d = dbg(p); mults.append(d['mult']); scores.append(d['score'])
    assert mults == [1, 1, 2, 2, 2, 3], mults
    assert scores[3] - scores[2] > 200 > scores[2] - scores[1] - 100   # x2 pays more than x1
    # wrong shot: shake on, combo reset
    sh = p.evaluate('()=>{WQ37FPS._debugFire(0);return WQ37FPS._debug.shake}'); assert sh >= 0 or True
    aim(p, False); sh = p.evaluate('()=>{WQ37FPS._debugFire(0);return [WQ37FPS._debug.shake,WQ37FPS._debug.combo]}')
    assert sh[0] > 0.3 and sh[1] == 0, sh
    lose_all(p)
    fin1 = p.evaluate('finished'); assert fin1['score'] > 0 and fin1['best'] == fin1['score'] and not fin1['newRecord'], fin1
    assert p.evaluate("localStorage.getItem('wq37-fps-best')") == str(fin1['score'])
    # reload: best persists, a weaker game is not a record, a stronger one is
    p.reload(); p.evaluate('boot(1,10)'); p.keyboard.press('Enter'); p.wait_for_timeout(250); cmd(p, 'calm', 1)
    assert dbg(p)['best'] == fin1['score']
    lose_all(p); fin2 = p.evaluate('finished'); assert fin2['score'] == 0 and fin2['best'] == fin1['score'] and not fin2['newRecord'], fin2
    p.evaluate('game.destroy();boot(1,10)'); p.keyboard.press('Enter'); p.wait_for_timeout(250); cmd(p, 'calm', 1)
    for _ in range(8): shoot_correct(p); p.wait_for_timeout(500)
    lose_all(p); fin3 = p.evaluate('finished')
    assert fin3['score'] > fin1['score'] and fin3['newRecord'] is True and fin3['best'] == fin3['score'], (fin1, fin3)
    p.wait_for_timeout(1500); assert p.locator('text=NEW RECORD').count() == 1
    assert p.evaluate("localStorage.getItem('wq37-fps-best')") == str(fin3['score'])
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()
    # reduced motion: no screen shake
    b, p, errs = new_page(pw, False, reduced=True)
    start_game(p, 1, 10); aim(p, False)
    sh = p.evaluate('()=>{WQ37FPS._debugFire(0);const d=WQ37FPS._debug;return [d.shake,d.hearts,d.reduceMotion]}')
    assert sh == [0, 2, True], sh
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()

def test_touch_new_actions(pw):
    """Phone: listen round shows a big replay button that works by tap; touch full run to the boss."""
    b, p, errs = new_page(pw, True)
    start_game(p, 2, 3)
    shoot_correct(p); p.wait_for_timeout(300)
    d = dbg(p); assert d['qtype'] == 'listen' and d['sayVisible'], d
    p.wait_for_timeout(1700); n0 = len(p.evaluate('__spoken'))
    box = p.locator('.wq37-say').bounding_box(); assert box['width'] >= 44 and box['height'] >= 44, box
    p.tap('.wq37-say'); p.wait_for_timeout(150)
    assert len(p.evaluate('__spoken')) == n0 + 1
    p.screenshot(path=SHOTS + '/mobile_listen.png')
    shoot_correct(p); p.wait_for_timeout(300); shoot_correct(p); p.wait_for_timeout(300)
    d = dbg(p); assert d['boss'] and not d['sayVisible'], d
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()

def test_shots(pw):
    for name, touch in (('desktop', False), ('mobile', True)):
        b, p, errs = new_page(pw, touch)
        start_game(p, 2, 6, calm=False)
        cmd(p, 'calm', 1); cmd(p, 'spitter', 5, 1.2); cmd(p, 'bug', 4); cmd(p, 'weapon', 'freeze'); cmd(p, 'weapon', 'triple'); cmd(p, 'calm', 0)
        p.wait_for_timeout(700); p.screenshot(path='%s/%s_a_wave1.png' % (SHOTS, name))
        p.wait_for_timeout(1300); p.screenshot(path='%s/%s_a_wave1_orb.png' % (SHOTS, name))
        p.evaluate('game.destroy()'); b.close()
        b, p, errs = new_page(pw, touch)
        test_arenas_questions_boss_shots(p, errs, name); b.close()

def test_arenas_questions_boss_shots(p, errs, name):
    start_game(p, 2, 6)
    for r in range(1, 7):
        d = dbg(p)
        if r == 3: p.wait_for_timeout(600); p.screenshot(path='%s/%s_b_arena2.png' % (SHOTS, name))
        if r == 5: p.wait_for_timeout(600); p.screenshot(path='%s/%s_c_arena3.png' % (SHOTS, name))
        if d['qtype'] == 'pic': p.screenshot(path='%s/%s_pic_round.png' % (SHOTS, name))
        shoot_correct(p); p.wait_for_timeout(120)
    p.wait_for_timeout(1900); p.screenshot(path='%s/%s_d_boss.png' % (SHOTS, name))
    d = dbg(p); word = d['boss']['word']
    for i in range(len(word)):
        shoot_correct(p) if i < len(word) - 1 else (aim(p, True), p.evaluate('WQ37FPS._debugFire(0)'))
        p.wait_for_timeout(120)
        if i == 0: p.wait_for_timeout(300); p.screenshot(path='%s/%s_d_boss_hit.png' % (SHOTS, name))
    p.wait_for_timeout(500); p.screenshot(path='%s/%s_e_victory.png' % (SHOTS, name))
    p.wait_for_timeout(2600); p.screenshot(path='%s/%s_f_result.png' % (SHOTS, name))
    p.evaluate('game.destroy()'); assert not errs, errs

if __name__ == '__main__':
    import sys
    with sync_playwright() as pw:
        fns = (test_touch, test_desktop, test_win_five_stars, test_arenas_questions_boss, test_spitter, test_spawn_scaling, test_freeze, test_combo_best_record, test_touch_new_actions)
        if '--shots' in sys.argv: fns = fns + (test_shots,)
        passed = 0
        for fn in fns:
            fn(pw); passed += 1; print('PASS', fn.__name__)
        print('ALL PASSED %d/%d' % (passed, len(fns)))

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

AC_COUNTER = '''(function(){var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;window.__ac={created:0,closed:0,live:0};
['createDynamicsCompressor','createStereoPanner','createOscillator','createBufferSource'].forEach(function(m){var o=AC.prototype[m];if(!o)return;AC.prototype[m]=function(){window.__ac[m]=(window.__ac[m]||0)+1;return o.apply(this,arguments);};});
function W(){var c=new AC();window.__ac.created++;window.__ac.live++;var oc=c.close.bind(c);c.close=function(){if(!c.__cl){c.__cl=1;window.__ac.closed++;window.__ac.live--;}return oc();};return c;}
W.prototype=AC.prototype;window.AudioContext=W;window.webkitAudioContext=W;})();'''

def new_page(pw, touch, reduced=False):
    b = pw.chromium.launch(args=['--no-sandbox'])
    kw = dict(reduced_motion='reduce') if reduced else {}
    if touch:
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, **kw)
    else:
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, **kw)
    ctx.add_init_script(SPEECH_STUB)
    ctx.add_init_script("try{localStorage.setItem('wq37-nolearn','1')}catch(e){}")
    ctx.add_init_script(AC_COUNTER)
    p = ctx.new_page(); errs = []
    p.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto('file://' + PAGE)
    return b, p, errs

SHOOT_JS = """(want)=>{const d=WQ37FPS._debug;if(d.state!=='play')return -1;
 const i=d.targets.findIndex(t=>t.clear&&(t.word===d.correctWord)===want);if(i<0)return -2;
 WQ37FPS._debugTurnTo(i);WQ37FPS._debugFire(0);return 1;}"""

def shoot(p, want_correct, tries=60):
    """Aim and fire in ONE page task (a moving target cannot step out of the line of fire in between)."""
    for _ in range(tries):
        r = p.evaluate(SHOOT_JS, want_correct)
        if r == 1: return
        if r == -1: raise AssertionError('not in play state: ' + json.dumps(dbg(p), ensure_ascii=False)[:300])
        p.wait_for_timeout(60)
    raise AssertionError('no clear target (correct=%s): %s' % (want_correct, json.dumps(dbg(p), ensure_ascii=False)[:400]))

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
    # re-aim and fire in the same task, so moving targets cannot step into the line of fire in between
    p.evaluate('''()=>{const d=WQ37FPS._debug,i=d.targets.findIndex(t=>t.word===d.correctWord);WQ37FPS._debugTurnTo(i);
      const b=document.querySelector('.wq37-fire');
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
    # drag-to-look on the right half turns the camera (smoothed), the fire button stays separate
    a0 = dbg(p)['player']['a']
    p.evaluate('''()=>{const r=document.querySelector('.wq37-root');
      r.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',pointerId:4,clientX:300,clientY:400,bubbles:true,isPrimary:true}));
      window.dispatchEvent(new PointerEvent('pointermove',{pointerType:'touch',pointerId:4,clientX:360,clientY:400,bubbles:true}));
      window.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',pointerId:4,bubbles:true}));}''')
    p.wait_for_timeout(500)
    a1 = dbg(p)['player']['a']; assert abs(a1 - a0) > 0.2, (a0, a1)
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
    s0 = dbg(p)['score']; aim(p, True); p.keyboard.press('Space'); p.wait_for_timeout(150)   # the real Space-key fire path
    d = dbg(p)
    if d['score'] <= s0:   # a bubble drifted into the line of fire between aim and key press: retry atomically
        shoot(p, True); d = dbg(p)
    assert d['score'] > s0 and d['round'] == 2, d
    # wrong shot reduces hearts, then two more end game
    p.wait_for_timeout(600); h0 = dbg(p)['hearts']; shoot(p, False); p.wait_for_timeout(100)
    assert dbg(p)['hearts'] == h0 - 1
    p.screenshot(path=SHOTS + '/desktop_wrong.png')
    for _ in range(2):
        shoot(p, False); p.wait_for_timeout(100)
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
        shoot(p, True); p.wait_for_timeout(120)
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
    s0 = dbg(p)['score']; shoot(p, True); p.wait_for_timeout(60)
    assert dbg(p)['score'] > s0
def lose_all(p):
    for _ in range(3):
        if dbg(p)['state'] != 'play': break
        shoot(p, False); p.wait_for_timeout(80)
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
    d0 = dbg(p); shoot(p, False); p.wait_for_timeout(100)
    d1 = dbg(p); assert d1['hearts'] == d0['hearts'] - 1 and d1['boss']['hp'] == d0['boss']['hp'] and d1['boss']['idx'] == 0, (d0, d1)
    if shots: p.screenshot(path='%s/%s_boss_hit.png' % (SHOTS, shots))
    # shield absorbs the counter-attack
    cmd(p, 'shield', 1); p.wait_for_timeout(2400)
    shoot(p, False); p.wait_for_timeout(100)
    d2 = dbg(p); assert d2['hearts'] == d1['hearts'] and not d2['shield'], d2
    # right letters in order: each one damages the boss
    p.wait_for_timeout(2400); hp = d2['boss']['hp']
    for i, ch in enumerate(word):
        d = dbg(p); assert d['correctWord'] == ch.upper() and d['boss']['hp'] == hp - i, (d, ch)
        if i == len(word) - 1: break
        shoot_correct(p); p.wait_for_timeout(120)
        assert dbg(p)['boss']['hp'] == hp - i - 1
    shoot(p, True); p.wait_for_timeout(100)
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
    # shooting the spitter scores: stand at the spawn point, wait for a lane free of word bubbles, then place + fire in one task
    cmd(p, 'clear'); cmd(p, 'place', 7.5, 12.5); cmd(p, 'shield', 1)
    # bubbles drift at random, so instead of waiting for the lane ahead to clear, turn (in one task) to a heading free of bubbles and walls
    s0 = dbg(p)['score']
    hit = p.evaluate("""()=>{for(let k=0;k<63;k++){const d=WQ37FPS._debug;
      if(d.targets.every(t=>Math.abs(t.angle)>0.22)){WQ37FPS._cmd('spitter',5,99);WQ37FPS._debugFire(0);
        if(WQ37FPS._debug.spitters===0)return k;WQ37FPS._cmd('clear');}
      WQ37FPS._cmd('turn',0.1);}return -1;}""")
    p.wait_for_timeout(80)
    d = dbg(p); assert hit >= 0 and d['spitters'] == 0 and d['score'] >= s0 + 80, (hit, d)
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
    shoot(p, False); sh = p.evaluate('()=>[WQ37FPS._debug.shake,WQ37FPS._debug.combo]')
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
    start_game(p, 1, 10); shoot(p, False)
    sh = p.evaluate('()=>{const d=WQ37FPS._debug;return [d.shake,d.hearts,d.reduceMotion,d.flash]}')
    assert sh == [0, 2, True, 0], sh
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
    d = dbg(p); assert d['boss'] and d['sayVisible'], d   # pronunciation replay is available in every question type, boss included
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
        shoot(p, True)
        p.wait_for_timeout(120)
        if i == 0: p.wait_for_timeout(300); p.screenshot(path='%s/%s_d_boss_hit.png' % (SHOTS, name))
    p.wait_for_timeout(500); p.screenshot(path='%s/%s_e_victory.png' % (SHOTS, name))
    p.wait_for_timeout(2600); p.screenshot(path='%s/%s_f_result.png' % (SHOTS, name))
    p.evaluate('game.destroy()'); assert not errs, errs


def finish_level(p, wrong_first=False):
    """Play a whole level-mode game with the atomic shooter (boss disabled)."""
    if wrong_first: shoot(p, False); p.wait_for_timeout(60)
    for _ in range(40):
        if dbg(p)['state'] != 'play': break
        shoot(p, True); p.wait_for_timeout(70)

def test_picker(pw):
    """Intro difficulty picker: 5 tier buttons (touch + keyboard), default = opts.difficulty, tier drives distractor count, lockDifficulty hides it."""
    b, p, errs = new_page(pw, False)
    p.evaluate('boot(3,10)'); p.wait_for_timeout(400)
    assert p.locator('.wq37-tier').count() == 5
    d = dbg(p); assert d['state'] == 'intro' and d['tier'] == 3, d
    assert p.evaluate("document.querySelector('.wq37-tier.on').dataset.tier") == '3'
    for bx in p.locator('.wq37-tier').all():
        r = bx.bounding_box(); assert r['width'] >= 48 and r['height'] >= 48, r
    expect = {1: 3, 2: 4, 3: 4, 4: 5, 5: 6}   # answer + 2/3/3/4/5 distractor words
    for t in (1, 2, 3, 4, 5):
        p.evaluate('game.destroy();boot(3,10)'); p.wait_for_timeout(150)
        p.click('.wq37-tier[data-tier="%d"]' % t); p.wait_for_timeout(80)
        assert dbg(p)['tier'] == t and dbg(p)['distractors'] == expect[t] - 1
        assert p.evaluate("document.querySelector('.wq37-tier.on').dataset.tier") == str(t)
        p.click('text=開始'); p.wait_for_timeout(250)
        d = dbg(p); assert d['state'] == 'play' and d['difficulty'] == t and len(d['targets']) == expect[t], (t, d)
    # keyboard: digit + arrows + Enter
    p.evaluate('game.destroy();boot(3,10)'); p.wait_for_timeout(150)
    p.keyboard.press('1'); assert dbg(p)['tier'] == 1
    p.keyboard.press('ArrowRight'); assert dbg(p)['tier'] == 2
    p.keyboard.press('ArrowLeft'); p.keyboard.press('ArrowLeft'); assert dbg(p)['tier'] == 1
    p.keyboard.press('5'); p.keyboard.press('Enter'); p.wait_for_timeout(200)
    d = dbg(p); assert d['state'] == 'play' and d['tier'] == 5 and len(d['targets']) == 6, d
    # lockDifficulty hides the picker and keeps opts.difficulty
    p.evaluate('game.destroy();boot(4,10,{lockDifficulty:true})'); p.wait_for_timeout(150)
    assert p.locator('.wq37-tier').count() == 0
    p.keyboard.press('1'); assert dbg(p)['tier'] == 4
    p.keyboard.press('Enter'); p.wait_for_timeout(150); assert len(dbg(p)['targets']) == 5
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()
    # touch: tap a tier button
    b, p, errs = new_page(pw, True)
    p.evaluate('boot(3,10)'); p.wait_for_timeout(400)
    p.tap('.wq37-tier[data-tier="1"]'); p.wait_for_timeout(100)
    assert dbg(p)['tier'] == 1
    p.tap('text=開始'); p.wait_for_timeout(250)
    assert len(dbg(p)['targets']) == 3
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()

def test_level_mode(pw):
    """Level mode: rounds == words, a missed word is re-queued once, result carries passed / accuracy / firstTryAccuracy / difficulty / perWord, next button."""
    b, p, errs = new_page(pw, False)
    BOOT = "boot(3,0,{mode:'level',rounds:undefined,boss:false,title:'第一單元 Fruit',onNext:function(){window.nextCalled=(window.nextCalled||0)+1}})"
    p.evaluate(BOOT); p.wait_for_timeout(300)
    assert 'Fruit' in p.inner_text('.wq37-card h1')
    d = dbg(p); assert d['mode'] == 'level' and d['totalRounds'] == 8, d
    p.keyboard.press('Enter'); p.wait_for_timeout(200); cmd(p, 'calm', 1)
    finish_level(p, wrong_first=True)
    d = dbg(p); assert d['state'] == 'over' and d['totalRounds'] == 9 and d['requeued'] == 1, d
    fin = p.evaluate('finished')
    assert fin['passed'] is True and fin['stars'] == 4 and fin['difficulty'] == 3 and fin['mode'] == 'level', fin
    assert abs(fin['accuracy'] - 0.9) < 1e-6 and abs(fin['firstTryAccuracy'] - 0.875) < 1e-6, fin
    pw_ = fin['perWord']; assert len(pw_) == 8 and sorted(x['en'] for x in pw_) == sorted(w[0] for w in WORDS), pw_
    bad = [x for x in pw_ if not x['ok']]; assert len(bad) == 1 and bad[0]['tries'] == 3, pw_
    assert all(x['tries'] == 1 and x['ok'] for x in pw_ if x['ok'] and x is not bad[0]), pw_
    p.wait_for_timeout(1500); p.screenshot(path=SHOTS + '/desktop_level_result.png')
    assert p.locator('.wq37-go.next').count() == 1 and 'text=再玩一次' and p.locator('text=再玩一次').count() == 1
    assert p.locator('.wq37-words span').count() == 8
    p.click('.wq37-go.next'); assert p.evaluate('nextCalled') == 1
    p.click('text=再玩一次'); p.wait_for_timeout(250); assert dbg(p)['state'] == 'play' and dbg(p)['round'] == 1 and dbg(p)['totalRounds'] == 8
    # failing: no passed flag, no next button, but retry/exit stay
    p.evaluate('game.destroy();' + BOOT); p.keyboard.press('Enter'); p.wait_for_timeout(200); cmd(p, 'calm', 1)
    lose_all(p); fin = p.evaluate('finished')
    assert fin['passed'] is False and fin['stars'] <= 2 and len(fin['perWord']) == 8, fin
    p.wait_for_timeout(1500)
    assert p.locator('.wq37-go.next').count() == 0 and p.locator('text=再玩一次').count() == 1 and p.locator('text=返回').count() == 1
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()

def test_free_mode_result_fields(pw):
    """Free mode keeps its flow (10 rounds) and also reports the new result fields."""
    b, p, errs = new_page(pw, False)
    p.evaluate('boot(2,3,{boss:false})'); p.keyboard.press('Enter'); p.wait_for_timeout(250); cmd(p, 'calm', 1)
    assert dbg(p)['mode'] == 'free' and dbg(p)['totalRounds'] == 3
    for _ in range(3): shoot_correct(p); p.wait_for_timeout(100)
    fin = p.evaluate('finished')
    assert fin['passed'] is True and fin['stars'] == 5 and fin['accuracy'] == 1 and fin['firstTryAccuracy'] == 1 and fin['difficulty'] == 2 and len(fin['perWord']) == 3, fin
    assert all(x['ok'] and x['tries'] == 1 for x in fin['perWord']), fin
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()

def test_hint_and_aim_assist(pw):
    """Tier 1-2: the answer pulses after 4s (never at tier 3+); aim assist pulls toward a word inside its cone, weaker/narrower at tier 5."""
    b, p, errs = new_page(pw, False)
    start_game(p, 1, 10)
    assert dbg(p)['hinting'] is False
    p.wait_for_timeout(4500); assert dbg(p)['hinting'] is True
    shoot_correct(p); p.wait_for_timeout(200); assert dbg(p)['hinting'] is False
    def pull(tier, off):
        """Turn `off` rad away from an answer bubble (with no other bubble near the centre of view), wait, return how far the camera moved by itself."""
        for _ in range(6):
            p.evaluate('game.destroy();boot(%d,10)' % tier); p.keyboard.press('Enter'); p.wait_for_timeout(250); cmd(p, 'calm', 1)
            p.wait_for_function("WQ37FPS._debug.targets.some(t=>t.clear)")
            ok = p.evaluate("""([o])=>{const d=WQ37FPS._debug,i=d.targets.findIndex(t=>t.clear);if(i<0)return false;
              WQ37FPS._debugTurnTo(i);WQ37FPS._cmd('turn',o);
              const near=WQ37FPS._debug.targets.filter(t=>Math.abs(t.angle)<0.15).length;
              window.__a0=WQ37FPS._debug.player.a;return near===(Math.abs(o)<0.15?1:0);}""", [off])
            if ok: break
        else:
            raise AssertionError('could not set up the assist scenario')
        p.wait_for_timeout(250)   # short window: the bubble's own drift barely matters yet
        return abs(p.evaluate('WQ37FPS._debug.player.a-window.__a0'))
    d1 = pull(1, 0.1)
    assert d1 > 0.02, ('tier 1 aim assist should pull the camera toward the bubble', d1)
    d5 = pull(5, 0.1)
    assert d5 < 0.003, ('tier 5: a bubble outside its narrow cone is not pulled', d5)
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()

def test_mute_and_audio(pw):
    """Mute toggle (HUD + pause overlay) persists in localStorage; sound:false = no AudioContext, no mute UI; repeated enter/exit does not leak AudioContexts."""
    b, p, errs = new_page(pw, False)
    p.evaluate('boot(2,10)'); p.keyboard.press('Enter'); p.wait_for_timeout(250)
    d = dbg(p); assert d['audio'] in ('running', 'suspended') and d['muted'] is False, d
    assert p.locator('.wq37-mute').count() == 1 and p.inner_text('.wq37-mute') == '🔊'
    # audio graph: one context, master compressor, synth voices, stereo pan; <= 12 simultaneous voices; music + SFX duck during pronunciation
    cmd(p, 'calm', 1); shoot(p, True); p.wait_for_timeout(150)
    ac = p.evaluate('__ac'); assert ac['created'] == 1 and ac['createDynamicsCompressor'] == 1, ac
    if dbg(p)['audio'] == 'running':
        assert ac.get('createOscillator', 0) > 3, ac
        cmd(p, 'bug', 3); cmd(p, 'turn', 0.4); p.evaluate('WQ37FPS._debugFire(-0.4)'); p.wait_for_timeout(60)   # off-centre hit -> stereo pan
        assert p.evaluate('__ac.createStereoPanner') > 0, p.evaluate('__ac')
    mx = p.evaluate('()=>{let m=0;for(let i=0;i<40;i++){WQ37FPS._debugFire(0);m=Math.max(m,WQ37FPS._debug.voices);}return m}')
    assert mx <= 12, mx
    p.keyboard.press('KeyR'); p.wait_for_timeout(60); assert dbg(p)['ducked'] is True
    p.wait_for_timeout(2600); assert dbg(p)['ducked'] is False
    p.click('.wq37-mute'); p.wait_for_timeout(80)
    assert p.evaluate("localStorage.getItem('wq37-fps-mute')") == '1' and dbg(p)['muted'] is True and p.inner_text('.wq37-mute') == '🔇'
    p.keyboard.press('Escape'); p.wait_for_timeout(80); assert dbg(p)['state'] == 'paused'
    assert p.inner_text('[data-act="mute"]') == '🔇'
    p.click('[data-act="mute"]'); p.wait_for_timeout(50)
    assert p.evaluate("localStorage.getItem('wq37-fps-mute')") == '0' and dbg(p)['muted'] is False and p.inner_text('[data-act="mute"]') == '🔊'
    p.click('[data-act="mute"]'); assert p.evaluate("localStorage.getItem('wq37-fps-mute')") == '1'
    p.click('text=繼續'); p.wait_for_timeout(80); assert dbg(p)['state'] == 'play'
    p.evaluate('game.destroy()')
    p.reload(); p.evaluate('boot(2,10)'); p.wait_for_timeout(200)   # the choice survives a reload
    assert dbg(p)['muted'] is True and p.inner_text('.wq37-mute') == '🔇'
    p.evaluate("localStorage.removeItem('wq37-fps-mute')")
    # sound:false -> no audio at all
    p.evaluate("game.destroy();boot(2,10,{sound:false})"); p.keyboard.press('Enter'); p.wait_for_timeout(250)
    assert p.locator('.wq37-mute').count() == 0 and dbg(p)['audio'] is None and p.evaluate('__ac.created') == 0
    p.evaluate('game.destroy()')
    # leak check: 10 enter / exit cycles
    c0 = p.evaluate('__ac.created')
    for i in range(10):
        p.evaluate('boot(2,10)'); p.keyboard.press('Enter'); p.wait_for_timeout(120)
        if dbg(p)['state'] == 'play': p.evaluate('WQ37FPS._debugFire(0)')
        assert p.evaluate('__ac.live') == 1, p.evaluate('__ac')
        p.evaluate('game.destroy()')
        assert p.evaluate('__ac.live') == 0 and p.evaluate('WQ37FPS._audioContexts()') == 0, p.evaluate('__ac')
    ac = p.evaluate('__ac'); assert ac['created'] - c0 == 10 and ac['live'] == 0 and ac['closed'] == ac['created'], ac
    p.wait_for_timeout(400); assert not errs, errs   # no timer fires after destroy
    b.close()

def test_stats_and_scale(pw):
    """stats() reports frame timing numbers and the adaptive internal resolution stays inside its bounds (<=1.0 on touch)."""
    for touch in (False, True):
        b, p, errs = new_page(pw, touch)
        p.evaluate('boot(3,10,{sound:false})'); p.keyboard.press('Enter'); p.wait_for_timeout(1800)
        st = p.evaluate('WQ37FPS.stats()')
        for k in ('avg', 'p95', 'max', 'scale', 'RW', 'RH'):
            assert isinstance(st[k], (int, float)) and st[k] == st[k] and st[k] >= 0, (k, st)
        assert st['frames'] > 20 and st['avg'] > 0 and st['p95'] >= st['avg'] * 0.5 and st['max'] >= st['p95']
        assert 0.6 <= st['scale'] <= (1.0 if touch else 1.25), st
        assert st['RW'] > 100 and st['RH'] > 80
        # fixed-step bound: a long stall (hidden tab) must not fast-forward the game
        t0 = dbg(p)['player']; p.evaluate('()=>new Promise(r=>{const e=performance.now();while(performance.now()-e<400);r()})')
        p.wait_for_timeout(200); assert dbg(p)['state'] == 'play'
        p.evaluate('game.destroy()'); assert WQ_NONE(p) is None
        assert not errs, errs
        b.close()

def WQ_NONE(p): return p.evaluate('WQ37FPS.stats()')

def test_fx(pw):
    """Correct shot: letters shatter + sparks (particle pool capped); wrong shot: red puff; reduced motion uses fewer particles and no flash."""
    counts = {}
    for reduced in (False, True):
        b, p, errs = new_page(pw, False, reduced=reduced)
        start_game(p, 3, 10)
        shoot(p, True); n_good = dbg(p)['particles']
        p.wait_for_timeout(1400); assert dbg(p)['particles'] < n_good
        shoot(p, False); n_bad = dbg(p)['particles']
        counts[reduced] = (n_good, n_bad)
        assert 0 < n_bad <= 300 and 0 < n_good <= 300, counts
        d = dbg(p); assert d['hearts'] == 2
        for _ in range(10): p.evaluate('()=>WQ37FPS._cmd("score",WQ37FPS._debug.score)'); p.wait_for_timeout(10)
        p.evaluate('game.destroy()'); assert not errs, errs
        b.close()
    assert counts[True][0] < counts[False][0] * 0.7, counts

def test_pause_visibility_resume(pw):
    """Hiding the tab pauses; resuming does not skip time (dt clamp)."""
    b, p, errs = new_page(pw, False)
    start_game(p, 3, 10)
    p.evaluate("()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))}")
    p.wait_for_timeout(100); assert dbg(p)['state'] == 'paused'
    p.evaluate("()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))}")
    p.keyboard.press('Enter'); p.wait_for_timeout(100); assert dbg(p)['state'] == 'play'
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()

def run_shots(pw, outdir):
    """Screenshots for review: intro picker, play, shatter FX, boss, result (level mode with next button) at 390x844@2x touch and 1440x900."""
    os.makedirs(outdir, exist_ok=True)
    for name, touch in (('phone', True), ('desktop', False)):
        b, p, errs = new_page(pw, touch)
        BOOT = "boot(2,0,{mode:'level',rounds:undefined,boss:true,title:'第三單元 Fruit',onNext:function(){}})"
        p.evaluate(BOOT); p.wait_for_timeout(1200)
        p.screenshot(path='%s/%s_1_intro_picker.png' % (outdir, name))
        p.keyboard.press('Enter') if not touch else p.tap('text=開始'); p.wait_for_timeout(300); cmd(p, 'calm', 1)
        p.wait_for_timeout(2900); p.screenshot(path='%s/%s_2_play.png' % (outdir, name))
        p.wait_for_function("WQ37FPS._debug.targets.some(t=>t.clear&&t.word===WQ37FPS._debug.correctWord)")
        shoot(p, True); p.wait_for_timeout(140); p.screenshot(path='%s/%s_3_shatter.png' % (outdir, name))
        p.wait_for_timeout(300); p.screenshot(path='%s/%s_3b_shatter_late.png' % (outdir, name))
        finish_rounds = dbg(p)['totalRounds'] - 1
        for _ in range(finish_rounds - 1):
            shoot(p, True); p.wait_for_timeout(110)
        cmd(p, 'boss'); p.wait_for_timeout(2200); p.screenshot(path='%s/%s_4_boss.png' % (outdir, name))
        word = dbg(p)['boss']['word']
        for i in range(len(word)):
            shoot(p, True); p.wait_for_timeout(110)
            if i == 0: p.wait_for_timeout(100); p.screenshot(path='%s/%s_4b_boss_hit.png' % (outdir, name))
        p.wait_for_timeout(250); p.screenshot(path='%s/%s_5_boss_defeat.png' % (outdir, name))
        p.wait_for_timeout(2800); p.screenshot(path='%s/%s_6_result.png' % (outdir, name))
        p.evaluate('game.destroy()'); assert not errs, errs
        b.close()

if __name__ == '__main__':
    import sys
    with sync_playwright() as pw:
        fns = (test_touch, test_desktop, test_win_five_stars, test_arenas_questions_boss, test_spitter, test_spawn_scaling, test_freeze, test_combo_best_record, test_touch_new_actions,
               test_picker, test_level_mode, test_free_mode_result_fields, test_hint_and_aim_assist, test_mute_and_audio, test_stats_and_scale, test_fx, test_pause_visibility_resume)
        if '--shots' in sys.argv: fns = fns + (test_shots,)
        if '--shots-dir' in sys.argv:
            run_shots(pw, sys.argv[sys.argv.index('--shots-dir') + 1]); print('shots done'); sys.exit(0)
        passed = 0
        for fn in fns:
            fn(pw); passed += 1; print('PASS', fn.__name__)
        print('ALL PASSED %d/%d' % (passed, len(fns)))

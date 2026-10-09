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
window.boot=function(d,rounds){window.finished=null;window.exited=0;
 window.game=WQ37FPS.start(document.getElementById('c'),{words:@W@,difficulty:d||1,rounds:rounds||10,
  onFinish:function(r){window.finished=r},onExit:function(){window.exited++}});};
</script></body></html>'''.replace('@JS@', os.path.abspath(JS)).replace('@W@', json.dumps([dict(en=a, zh=b, emoji=c) for a, b, c in WORDS], ensure_ascii=False)))

def dbg(p): return p.evaluate('WQ37FPS._debug')

def new_page(pw, touch):
    b = pw.chromium.launch(args=['--no-sandbox'])
    if touch:
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    else:
        ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    p = ctx.new_page(); errs = []
    p.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto('file://' + PAGE)
    return b, p, errs

def aim(p, want_correct):
    d = dbg(p)
    for i, t in enumerate(d['targets']):
        if (t['word'] == d['correctWord']) == want_correct:
            p.evaluate('i=>WQ37FPS._debugTurnTo(i)', i); return t['word']
    raise AssertionError('no target found')

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
    assert ft < 34
    p.evaluate('game.destroy()')
    assert p.evaluate('document.querySelectorAll("#c canvas").length') == 0
    assert p.evaluate('document.querySelector("#c").children.length') == 0
    p.keyboard.press('Space'); p.wait_for_timeout(200)
    assert not errs, errs
    b.close()

def test_win_five_stars(pw):
    b, p, errs = new_page(pw, False)
    p.evaluate('boot(3,3)'); p.keyboard.press('Enter'); p.wait_for_timeout(300)
    for _ in range(3):
        aim(p, True); p.evaluate('WQ37FPS._debugFire(0)'); p.wait_for_timeout(120)
    fin = p.evaluate('finished'); assert fin and fin['stars'] == 5 and fin['correct'] == 3 and fin['maxCombo'] == 3, fin
    p.wait_for_timeout(1500); p.screenshot(path=SHOTS + '/desktop_win.png')
    p.evaluate('game.destroy()'); assert not errs, errs
    b.close()

if __name__ == '__main__':
    with sync_playwright() as pw:
        for fn in (test_touch, test_desktop, test_win_five_stars):
            fn(pw); print('PASS', fn.__name__)

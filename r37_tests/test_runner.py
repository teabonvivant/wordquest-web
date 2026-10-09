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
<body><div id="c"></div><script src="file://@JS@"></script>
<script>
window.finished=[]; window.exited=0; window.game=null;
window.boot=function(o){o=o||{};window.finished=[];window.exited=0;
 if(o.seed!=null)WQ37Run._debugSeed(o.seed);
 window.game=WQ37Run.start(document.getElementById('c'),{words:@W@,
  character:o.character||{icon:'🐼',name:'熊貓',perk:o.perk||''},
  world:o.world||0,stage:o.stage||0,difficulty:o.difficulty||2,sound:true,
  onFinish:function(r){window.finished.push(r)},onExit:function(){window.exited++}});};
</script></body></html>'''.replace('@JS@', JS).replace('@W@', json.dumps([dict(en=a, zh=b, emoji=c) for a, b, c in WORDS], ensure_ascii=False)))


def dbg(p): return p.evaluate('WQ37Run._debug')


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


def take(p, ok=True):
    if not dbg(p)['armed']: p.evaluate('WQ37Run._debugAdvanceToGate()')
    assert dbg(p)['armed'], dbg(p)
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
    swipe(-80); assert dbg(p)['lane'] == 0
    swipe(80); swipe(80); assert dbg(p)['lane'] == 2
    # on-screen buttons >= 56px
    for sel in ('.wq37r-up', '.wq37r-down', '.wq37r-dash'):
        bb = p.locator(sel).bounding_box(); assert bb['width'] >= 56 and bb['height'] >= 56, (sel, bb)
    p.tap('.wq37r-up'); assert dbg(p)['lane'] == 1
    p.tap('.wq37r-down'); assert dbg(p)['lane'] == 2
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
            assert n == [6, 8, 10][stage], n
            assert r['wrong'] == 0 and r['correct'] == n and r['world'] == world and r['stage'] == stage
            if stage == 2: assert d['boss'] and d['bossStreak'] == 3
            p.wait_for_timeout(1900)
            p.screenshot(path='%s/%s_w%d_s%d_result.png' % (SHOTS, tag, world, stage))
            assert p.evaluate('finished.length') == 1
            p.evaluate('game.destroy()'); assert not errs, errs
            b.close()


def test_boss_needs_three_consecutive(pw):
    b, p, errs = new_page(pw, False)
    boot(p, world=2, stage=2, difficulty=3, seed=21)
    start(p); p.evaluate('WQ37Run._debugGod(true)')
    for i in range(7):
        take(p, True)
    d = dbg(p)
    to_gate(p)
    d = dbg(p); assert d['boss'] and d['gateIndex'] == 7 and d['state'] == 'play', d
    p.wait_for_timeout(100); p.screenshot(path=SHOTS + '/desk_boss_gate.png')
    take(p, True); take(p, True)
    d = dbg(p); assert d['bossStreak'] == 2 and d['state'] == 'play', d
    to_gate(p)
    take(p, False)                      # wrong resets the streak
    d = dbg(p); assert d['bossStreak'] == 0 and d['state'] == 'play' and d['hearts'] <= 3 + 2, d
    for _ in range(2):
        take(p, True)
    d = dbg(p); assert d['bossStreak'] == 2 and d['state'] == 'play', d   # not finished with 2 in a row
    take(p, True)
    d = dbg(p); assert d['state'] == 'won' and d['stagePassed'], d
    r = p.evaluate('finished')[0]; assert r['passed'] and r['wrong'] == 1 and r['stars'] in (3, 4), r
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
        for fn in (test_touch, test_desktop_keys_and_gates, test_perfect_runs, test_boss_needs_three_consecutive, test_perks, test_fps_and_destroy):
            fn(pw); print('PASS', fn.__name__)

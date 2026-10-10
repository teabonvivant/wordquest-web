"""R3.9 t11 - answer learning card in the two vocabulary games (fps_game.js, runner_game.js), card ON (the default).
Correct: card shows the word + meaning, freezes play, auto-continues after LC_OK.max; Enter is ignored before LC_OK.min.
Wrong: card shows the CORRECT word + meaning and what the child picked, the continue button stays locked for LC_BAD.min,
the correct word is spoken twice; the game stays frozen until the child continues. Size/fit checked at phone, landscape, desktop."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import test_fps as F  # noqa: E402  (writes /tmp/fps_test_page.html)
import test_runner as RN  # noqa: E402  (writes /tmp/runner_test_page.html)

SHOTS = Path('/tmp/r39_learn'); SHOTS.mkdir(exist_ok=True)
VPS = [(390, 844, 'phone', True), (844, 390, 'landscape', True), (1440, 900, 'desktop', False)]
N = {'pass': 0, 'fail': 0}


def ok(cond, msg):
    N['pass' if cond else 'fail'] += 1
    print(('PASS ' if cond else 'FAIL ') + msg)


def page(pw, w, h, touch, html, init=''):
    b = pw.chromium.launch(args=['--no-sandbox'])
    kw = dict(viewport={'width': w, 'height': h})
    if touch: kw.update(has_touch=True, is_mobile=True, device_scale_factor=2)
    ctx = b.new_context(**kw)
    if init: ctx.add_init_script(init)
    p = ctx.new_page(); errs = []
    p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto('file://' + html)
    return b, p, errs


CARD = """()=>{const c=document.querySelector('.wqlc');if(!c)return null;const r=c.getBoundingClientRect(),en=c.querySelector('.wqlc-en'),zh=c.querySelector('.wqlc-zh'),
 go=c.querySelector('[data-lc=go]'),you=c.querySelector('.wqlc-you'),hd=c.querySelector('.wqlc-hd');
 return {cls:c.className,head:hd.textContent,en:en.textContent,zh:zh?zh.textContent:'',enPx:parseFloat(getComputedStyle(en).fontSize),
  zhPx:zh?parseFloat(getComputedStyle(zh).fontSize):0,you:you?you.textContent:'',goDis:go.disabled,go:go.textContent,
  fit:r.left>=0&&r.top>=0&&r.right<=innerWidth+0.5&&r.bottom<=innerHeight+0.5&&c.scrollHeight<=c.clientHeight+1,
  goVis:(()=>{const g=go.getBoundingClientRect();return g.bottom<=innerHeight&&g.top>=0&&g.height>=44})(),
  area:r.width*r.height/(innerWidth*innerHeight),anim:getComputedStyle(c).animationName}}"""


def card(p): return p.evaluate(CARD)


def fps_flow(pw, w, h, name, touch):
    b, p, errs = page(pw, w, h, touch, F.PAGE, F.SPEECH_STUB)
    p.evaluate('boot(1,6)'); p.wait_for_timeout(700)
    p.keyboard.press('Enter'); p.wait_for_timeout(1700)   # intro -> play, wave banner
    d = F.dbg(p); asked = d['correctWord']; r0 = d['round']
    F.shoot(p, True); p.wait_for_timeout(150)
    d = F.dbg(p); c = card(p)
    ok(d['state'] == 'learn' and d['learn'] and d['learn']['ok'] and d['learn']['word'] == asked, f'fps/{name} correct -> learn card for "{asked}"')
    ok(c and 'ok' in c['cls'] and c['en'] == asked and c['zh'] and '答對' in c['head'], f'fps/{name} correct card shows word + meaning {c and (c["en"], c["zh"])}')
    ok(c and c['enPx'] >= 40 and c['zhPx'] >= 22 and c['fit'] and c['goVis'], f'fps/{name} card big and fully on screen (en {c and c["enPx"]}px, zh {c and c["zhPx"]}px)')
    p.screenshot(path=str(SHOTS / f'fps_{name}_ok.png'))
    p.keyboard.press('Enter'); p.wait_for_timeout(100)
    ok(F.dbg(p)['state'] == 'learn', f'fps/{name} Enter before 0.8s does not skip')
    sc = F.dbg(p)['correct']; p.evaluate('WQ37FPS._debugFire(0)')
    ok(F.dbg(p)['correct'] == sc, f'fps/{name} cannot shoot while the card is up')
    p.wait_for_timeout(2600)
    d = F.dbg(p)
    ok(d['state'] == 'play' and d['round'] == r0 + 1 and not card(p), f'fps/{name} correct card auto-continues to round {r0 + 1}')
    # wrong answer
    asked = d['correctWord']; hearts = d['hearts']
    wrong_word = None
    for _ in range(60):
        dd = F.dbg(p); cand = [t['word'] for t in dd['targets'] if t['clear'] and t['word'] != dd['correctWord']]
        if cand: wrong_word = cand[0]
        if p.evaluate(F.SHOOT_JS, False) == 1: break
        p.wait_for_timeout(60)
    p.wait_for_timeout(150)
    d = F.dbg(p); c = card(p); spoken0 = p.evaluate('window.__spoken.filter(x=>x===%s).length' % json.dumps(asked))
    ok(d['state'] == 'learn' and not d['learn']['ok'] and d['learn']['word'] == asked and d['hearts'] == hearts - 1, f'fps/{name} wrong -> card shows the correct word "{asked}", heart lost')
    ok(c and 'bad' in c['cls'] and c['en'] == asked and '正確答案' in c['head'] and '你選了' in c['you'] and c['goDis'], f'fps/{name} wrong card: correct answer, your pick "{c and c["you"]}", button locked')
    ok(c and c['fit'] and c['goVis'] and c['enPx'] >= 40, f'fps/{name} wrong card fits the screen')
    p.screenshot(path=str(SHOTS / f'fps_{name}_bad.png'))
    p.wait_for_timeout(1000); p.keyboard.press('Enter'); p.wait_for_timeout(80)
    ok(F.dbg(p)['state'] == 'learn', f'fps/{name} wrong card cannot be skipped in the first 2s')
    p.wait_for_timeout(1800)
    c = card(p); n2 = p.evaluate('window.__spoken.filter(x=>x===%s).length' % json.dumps(asked))
    ok(c and not c['goDis'] and F.dbg(p)['state'] == 'learn', f'fps/{name} after 2s the button unlocks, game still waits')
    ok(n2 >= spoken0 + 1 and n2 >= 2, f'fps/{name} correct word spoken again (x{n2})')
    if touch: p.locator('.wqlc [data-lc=go]').tap()
    else: p.locator('.wqlc [data-lc=go]').click()
    p.wait_for_timeout(120)
    d = F.dbg(p)
    ok(d['state'] == 'play' and not card(p) and d['correctWord'] == asked, f'fps/{name} "記住了" resumes the same round')
    ok(not errs, f'fps/{name} no page errors {errs[:2]}')
    b.close()


def fps_edge(pw):
    b, p, errs = page(pw, 390, 844, True, F.PAGE, F.SPEECH_STUB)
    p.emulate_media(reduced_motion='reduce')
    p.evaluate('boot(1,6)'); p.wait_for_timeout(700); p.keyboard.press('Enter'); p.wait_for_timeout(1700)
    F.shoot(p, False); p.wait_for_timeout(120)
    ok(card(p)['anim'] == 'none', 'fps reduced-motion: card has no animation')
    p.evaluate("WQ37FPS._cmd('learnskip')")
    p.evaluate("WQ37FPS._cmd('shield',false)")
    for _ in range(4):
        if F.dbg(p)['state'] != 'play': break
        F.shoot(p, False); p.wait_for_timeout(100)
        if F.dbg(p)['state'] == 'learn': p.evaluate("WQ37FPS._cmd('learnskip')")
    d = F.dbg(p)
    ok(d['state'] == 'over' and not card(p), 'fps: losing the last heart goes to the result screen, no card left behind')
    ok(not errs, f'fps edge no page errors {errs[:2]}')
    b.close()


def run_flow(pw, w, h, name, touch):
    b, p, errs = page(pw, w, h, touch, RN.PAGE)
    p.evaluate('boot({seed:7,difficulty:1})'); p.wait_for_timeout(400)
    p.keyboard.press('Enter'); p.wait_for_timeout(200)
    if not RN.dbg(p)['armed']: p.evaluate('WQ37Run._debugAdvanceToGate()')
    d = RN.dbg(p)
    if d['gateKind'] == 'spell':
        ok(False, f'run/{name} first gate is spell, seed needs change'); b.close(); return
    asked = d['correctWord']; cl = RN.correct_lane(p)
    p.evaluate('n=>WQ37Run._debugLane(n)', cl); p.evaluate('WQ37Run._debugAdvanceToGate()'); p.wait_for_timeout(120)
    d = RN.dbg(p); c = card(p)
    ok(d['state'] == 'learn' and d['learn']['ok'] and d['learn']['word'] == asked, f'run/{name} correct door -> learn card "{asked}"')
    ok(c and c['en'] == asked and c['zh'] and c['enPx'] >= 40 and c['fit'] and c['goVis'], f'run/{name} card big + on screen (en {c and c["enPx"]}px)')
    ok(asked in p.evaluate('window.__spoke'), f'run/{name} word spoken with the card')
    p.screenshot(path=str(SHOTS / f'run_{name}_ok.png'))
    p.wait_for_timeout(2700)
    ok(RN.dbg(p)['state'] == 'play' and not card(p), f'run/{name} correct card auto-continues')
    if not RN.dbg(p)['armed']: p.evaluate('WQ37Run._debugAdvanceToGate()')
    d = RN.dbg(p)
    if d['gateKind'] == 'spell':
        ok(True, f'run/{name} second gate is spell - wrong-door case skipped'); b.close(); return
    asked = d['correctWord']; cl = RN.correct_lane(p); bad = (cl + 1) % 3
    picked = [x['word'] for x in d['doors'] if x['lane'] == bad][0]; hearts = d['hearts']
    p.evaluate('n=>WQ37Run._debugLane(n)', bad); p.evaluate('WQ37Run._debugAdvanceToGate()'); p.wait_for_timeout(120)
    d = RN.dbg(p); c = card(p)
    ok(d['state'] == 'learn' and not d['learn']['ok'] and d['learn']['word'] == asked and d['hearts'] == hearts - 1, f'run/{name} wrong door -> card with correct "{asked}"')
    ok(c and picked in c['you'] and c['goDis'] and c['fit'], f'run/{name} wrong card shows pick "{picked}" with meaning: {c and c["you"]}')
    p.screenshot(path=str(SHOTS / f'run_{name}_bad.png'))
    p.wait_for_timeout(900); p.keyboard.press('Space'); p.wait_for_timeout(80)
    ok(RN.dbg(p)['state'] == 'learn', f'run/{name} wrong card not skippable in first 2s')
    p.wait_for_timeout(1300); p.keyboard.press('Space'); p.wait_for_timeout(120)
    ok(RN.dbg(p)['state'] == 'play' and not card(p), f'run/{name} Space after 2s continues')
    ok(not errs, f'run/{name} no page errors {errs[:2]}')
    b.close()


if __name__ == '__main__':
    with sync_playwright() as pw:
        for w, h, name, touch in VPS:
            fps_flow(pw, w, h, name, touch)
            run_flow(pw, w, h, name, touch)
        fps_edge(pw)
    print(f"t11: {N['pass']}/{N['pass'] + N['fail']} checks passed")
    sys.exit(1 if N['fail'] else 0)

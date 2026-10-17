"""R3.18 t22 - game screens polish: shooter (字母獵場), runner (星際跑酷) and arcade (遊戲街機) look and layout.

    WQ33_APP=$PWD/app/index.html python3 r37_tests/t22_game_polish.py          # screenshots go to /tmp/t22_shots
    T22_SHOTS=<dir> WQ33_APP=... python3 r37_tests/t22_game_polish.py          # or to a directory of your choice

Three sizes: 390x844 (phone, touch), 844x390 (landscape phone, touch), 1440x900 (desktop). Checks (per size):
  shooter  launch card is dark glass with a gold primary button and no emoji; HUD text >= 14 px (score >= 18 px); HUD inside the safe
           area; pause / replay buttons >= 44 px, not overlapping, replay sits inside the question capsule; no HUD sound switch
           (it lives in the pause menu); wave banner gone after ~1 s; touch: joystick ticks + fire ring.
  runner   launch card dark glass, character illustration loaded and drawn; HUD text >= 14 px, score >= 20 px, 16 px side margin;
           5 control buttons 64 px, no overlap (touch).
  arcade   lobby scrolls as a page (no inner scroll box, one summary strip, gold CTA); in play the old .header is hidden, text
           contrast >= 7:1, phone play zone >= 58 vh, hints collapse, the ⋯ sheet opens.
The machine may be busy with other jobs: every wait is generous (45 s default timeout).
"""
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t22')
SHOTS = Path(os.environ.get('T22_SHOTS', '/tmp/t22_shots'))
SHOTS.mkdir(parents=True, exist_ok=True)
SIZES = [(390, 844, 'phone', True), (844, 390, 'land', True), (1440, 900, 'desktop', False)]

BOOST = "(()=>{const c=a28Child();for(const id of COIN28.ids)c.permissions[id]='open';c.batch.used=0;activeChild().stars=60;return save();})()"
LEAVE = "(()=>{const c=a28Child();if(c.run)COIN28.close(c);pgPlaying=false;pgGame=null;a28Epoch++;pgFree=false;for(const id of COIN28.ids)c.permissions[id]='open';c.batch.used=0;activeChild().stars=60;save();go('game');render();return 1;})()"

GLASS_JS = """(sel)=>{const e=document.querySelector(sel);if(!e)return null;const cs=getComputedStyle(e);
  const m=cs.color.match(/[\\d.]+/g).map(Number);return {bgi:cs.backgroundImage,bg:cs.backgroundColor,color:cs.color,lum:(0.2126*m[0]+0.7152*m[1]+0.0722*m[2])/255,w:e.getBoundingClientRect().width,radius:cs.borderTopLeftRadius}}"""
EMOJI_JS = """(sel)=>{const e=document.querySelector(sel);return e?(e.textContent.match(/\\p{Extended_Pictographic}/gu)||[]).length:-1}"""

CONTRAST_JS = r"""(sels)=>{
  const lin=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};
  const L=c=>0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2]);
  const parse=s=>{const m=s&&s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(x=>parseFloat(x));return [p[0],p[1],p[2],p.length>3?p[3]:1];};
  const over=(top,bot)=>[top[0]*top[3]+bot[0]*(1-top[3]),top[1]*top[3]+bot[1]*(1-top[3]),top[2]*top[3]+bot[2]*(1-top[3])];
  const bodyC=(parse(getComputedStyle(document.body).backgroundColor)||[11,16,48,1]).slice(0,3);
  const out=[];
  for(const sel of sels){for(const e of document.querySelectorAll(sel)){
    const r=e.getBoundingClientRect(),cs=getComputedStyle(e);
    if(r.width<4||r.height<4||cs.visibility==='hidden'||cs.display==='none'||(cs.clip&&cs.clip!=='auto'&&r.width<=1))continue;
    const fg=parse(cs.color);let layers=[];
    for(let a=e;a;a=a.parentElement){const s=getComputedStyle(a);let c=parse(s.backgroundColor);
      if((!c||c[3]===0)&&s.backgroundImage&&s.backgroundImage.includes('gradient')){const m=s.backgroundImage.match(/rgba?\([^)]+\)/);c=m?parse(m[0]):null;}
      if(c&&c[3]>0){layers.push(c);if(c[3]>=0.99)break;}}
    let bg=bodyC;for(let i=layers.length-1;i>=0;i--)bg=over(layers[i],bg);
    const fgc=over(fg,bg),l1=L(fgc),l2=L(bg),ratio=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
    out.push({sel,text:(e.textContent||'').trim().slice(0,24),ratio:Math.round(ratio*10)/10,size:parseFloat(cs.fontSize)});
  }}
  return out;}"""


def rect_in(a, b, tol=1.0):
    """True when rect a=[x0,y0,x1,y1] lies inside rect b."""
    return a[0] >= b[0] - tol and a[1] >= b[1] - tol and a[2] <= b[2] + tol and a[3] <= b[3] + tol


def overlap(a, b):
    return not (a[2] <= b[0] or b[2] <= a[0] or a[3] <= b[1] or b[3] <= a[1])


def new(p, w, h, touch, name):
    b, ctx, pg, errs = open_page(p, w, h, touch)
    pg.set_default_timeout(45000)
    pg.on('dialog', lambda d: d.accept())
    register(pg, 't22' + name, '小明')
    return b, ctx, pg, errs


def shot(pg, size, name):
    pg.screenshot(path=str(SHOTS / f'{size}_{name}.png'))


# ------------------------------------------------------------------------------------------------ shooter
def shooter(p, w, h, touch, size):
    b, ctx, pg, errs = new(p, w, h, touch, 'f' + size)
    go(pg, '#fps', 1200)
    pg.wait_for_selector('.wq37-ov .wq37-card')
    pg.wait_for_timeout(600)
    g = pg.evaluate(GLASS_JS, '.wq37-card')
    C.ok(g and 'rgba(30, 38, 96' in g['bgi'] and g['lum'] > 0.85, f'{size} fps launch: card is dark glass with light text {g and (g["bgi"][:60], round(g["lum"], 2))}')
    C.ok(g and g['w'] <= (340 if (w < 800 or not touch) else 520) + 1, f'{size} fps launch: card width {g and g["w"]}')
    ov = pg.evaluate("(()=>{const e=document.querySelector('.wq37-ov');const s=getComputedStyle(e);return {bg:s.backgroundColor,bf:s.backdropFilter||s.webkitBackdropFilter}})()")
    C.ok('blur' in (ov['bf'] or '') and ov['bg'].startswith('rgba(11, 16, 48'), f'{size} fps launch: background dimmed and blurred {ov}')
    go_btn = pg.evaluate(GLASS_JS, '.wq37-go')
    C.ok(go_btn and go_btn['bg'] == 'rgb(255, 201, 74)' and go_btn['color'] == 'rgb(59, 38, 0)', f'{size} fps launch: gold primary button {go_btn and (go_btn["bg"], go_btn["color"])}')
    C.ok(pg.evaluate(EMOJI_JS, '.wq37-card') == 0, f'{size} fps launch: no emoji on the card')
    C.ok(pg.evaluate("document.querySelectorAll('.wq37-card svg').length") >= 8, f'{size} fps launch: vector icons (legend + tiers)')
    C.ok(pg.evaluate("[...document.querySelectorAll('.wq37-card button')].every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44})"), f'{size} fps launch: buttons >= 44 px')
    shot(pg, size, 'fps_launch')
    pg.keyboard.press('Enter') if not touch else pg.locator('.wq37-go').first.tap()
    pg.wait_for_timeout(250)
    d = pg.evaluate('WQ37FPS._debug')
    C.ok(d['state'] == 'play', f'{size} fps: playing')
    C.ok(d['bannerText'] is not None, f'{size} fps: wave banner shows at the start')
    pg.wait_for_timeout(1500)
    C.ok(pg.evaluate('WQ37FPS._debug.bannerText') is None, f'{size} fps: wave banner is gone after ~1 s')
    pg.wait_for_function("WQ37FPS._debug.targets.some(t=>t.clear)", timeout=20000)
    pg.wait_for_timeout(300)
    hud = pg.evaluate('WQ37FPS._hud')
    cw, ch = hud['cw'], hud['ch']
    labels = hud['labels']
    C.ok(len(labels) >= 3, f'{size} fps hud: labels drawn {[l["k"] for l in labels]}')
    small = [(l['k'], l['size']) for l in labels if l['size'] < 14]
    C.ok(not small, f'{size} fps hud: every HUD label >= 14 px {small}')
    score = next((l for l in labels if l['k'] == 'score'), None)
    C.ok(score and score['size'] >= 18, f'{size} fps hud: score >= 18 px ({score and score["size"]})')
    outside = [(l['k'], [round(v) for v in l['r']]) for l in labels if not rect_in(l['r'], [8, 4, cw - 8, ch - 4])]
    C.ok(not outside, f'{size} fps hud: labels inside the safe area {outside}')
    btn = hud['buttons']
    C.ok('pause' in btn and 'say' in btn, f'{size} fps hud: pause + replay buttons present {list(btn)}')
    for k in ('pause', 'say'):
        r = btn[k]
        C.ok(r[2] - r[0] >= 44 and r[3] - r[1] >= 44, f'{size} fps hud: {k} button >= 44 px ({round(r[2] - r[0])}x{round(r[3] - r[1])})')
        C.ok(rect_in(r, [0, 0, cw, ch]), f'{size} fps hud: {k} button inside the canvas')
    C.ok(not overlap(btn['pause'], btn['say']), f'{size} fps hud: the two buttons do not overlap')
    box = hud['boxes'].get('prompt')
    C.ok(box and rect_in(btn['say'], box, 3), f'{size} fps hud: replay button sits inside the question capsule {box} {btn["say"]}')
    clash = [l['k'] for l in labels if overlap(l['r'], btn['pause']) or overlap(l['r'], btn['say'])]
    C.ok(not clash, f'{size} fps hud: no label under a button {clash}')
    C.ok(pg.evaluate("document.querySelectorAll('.wq37-mute').length") == 0, f'{size} fps hud: no HUD sound switch')
    C.ok(pg.evaluate("document.querySelector('.wq37-say').textContent.includes('再聽')"), f'{size} fps hud: replay button says 再聽')
    if touch:
        C.ok(pg.evaluate("document.querySelectorAll('.wq37-joy .tk').length") == 4, f'{size} fps touch: joystick has 4 direction ticks')
        fr = btn['fire']
        C.ok(fr[2] - fr[0] >= 72, f'{size} fps touch: fire button {round(fr[2] - fr[0])} px')
        C.ok(pg.evaluate("!!document.querySelector('.wq37-fire svg.ring .fg') && !document.querySelector('.wq37-fire').textContent.trim()"), f'{size} fps touch: fire button = SVG gun + cooldown ring, no emoji')
    shot(pg, size, 'fps_play')
    # pause menu carries the sound switch
    pg.evaluate("document.querySelector('.wq37-pause').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'%s'}))" % ('touch' if touch else 'mouse'))
    pg.wait_for_timeout(300)
    C.ok(pg.evaluate("!!document.querySelector('.wq37-ov [data-act=\"mute\"]')"), f'{size} fps: pause menu has the sound switch')
    C.ok(not errs, f'{size} fps: no console errors {errs[:2]}')
    b.close()


# ------------------------------------------------------------------------------------------------ runner
def runner(p, w, h, touch, size):
    b, ctx, pg, errs = new(p, w, h, touch, 'r' + size)
    go(pg, '#lv/runner', 700)
    pg.click('.r37-node.cur')
    pg.wait_for_selector('.wq37r-card')
    pg.wait_for_timeout(800)
    g = pg.evaluate(GLASS_JS, '.wq37r-card')
    C.ok(g and 'rgba(30, 38, 96' in g['bgi'] and g['lum'] > 0.85, f'{size} runner launch: card is dark glass')
    C.ok(g and g['w'] <= (340 if w < 800 or not touch else 520) + 1, f'{size} runner launch: card width {g and g["w"]}')
    b0 = pg.evaluate(GLASS_JS, '.wq37r-b')
    C.ok(b0 and b0['bg'] == 'rgb(255, 201, 74)', f'{size} runner launch: gold start button')
    C.ok(pg.evaluate(EMOJI_JS, '.wq37r-card') == 0, f'{size} runner launch: no emoji on the card')
    img = pg.evaluate("(()=>{const i=document.querySelector('.wq37r-big img');return i?{ok:i.complete&&i.naturalWidth>0,src:i.getAttribute('src')}:null})()")
    C.ok(img and img['ok'], f'{size} runner launch: character illustration shown {img}')
    shot(pg, size, 'rn_launch')
    pg.locator('.wq37r-b').first.click()
    pg.wait_for_timeout(1500)
    d = pg.evaluate('WQ37Run._debug')
    C.ok(d['state'] in ('play', 'run', 'running'), f'{size} runner: playing ({d["state"]})')
    C.ok(d['char']['id'] and d['char']['loaded'] and d['char']['draws'] > 0, f'{size} runner: illustration loaded and drawn {d["char"]}')
    hud = d['hud']
    rc = pg.evaluate("(()=>{const r=document.querySelector('#r37-run-box canvas').getBoundingClientRect();return [r.width,r.height]})()")
    labs = hud['hud']
    C.ok(len(labs) >= 3, f'{size} runner hud: {len(labs)} labels')
    small = [(l['t'], round(l['size'], 1)) for l in labs if l['size'] < 13.9]
    C.ok(not small, f'{size} runner hud: every label >= 14 px {small}')
    sc = next((l for l in labs if l['t'].startswith('分數')), None)
    C.ok(sc and sc['size'] >= 19.9, f'{size} runner hud: score >= 20 px ({sc and round(sc["size"], 1)})')
    bad = [(l['t'], [round(v) for v in l['r']]) for l in labs if l['r'][0] < 15.5 or l['r'][2] > rc[0] - 15.5]
    C.ok(not bad, f'{size} runner hud: >= 16 px side margin {bad}')
    if touch:
        ids = ['.wq37r-up', '.wq37r-down', '.wq37r-dash', '.wq37r-jump', '.wq37r-slide']
        bx = [pg.locator(s).bounding_box() for s in ids]
        C.ok(all(abs(q['width'] - 64) < 1.5 and abs(q['height'] - 64) < 1.5 for q in bx), f'{size} runner touch: 5 buttons are 64 px {[(round(q["width"]), round(q["height"])) for q in bx]}')
        rects = [[q['x'], q['y'], q['x'] + q['width'], q['y'] + q['height']] for q in bx]
        C.ok(all(not overlap(rects[i], rects[j]) for i in range(5) for j in range(i + 1, 5)), f'{size} runner touch: no two buttons overlap')
        C.ok(all(rect_in(r, [0, 0, w, h]) for r in rects), f'{size} runner touch: buttons inside the screen')
        C.ok(pg.evaluate("[...document.querySelectorAll('.wq37r-ctl svg')].length")==5, f'{size} runner touch: SVG icons on the 5 buttons')
        C.ok(pg.evaluate("(()=>{const r=document.querySelector('.wq37r-pause').getBoundingClientRect();return r.width>=44&&r.height>=44})()"), f'{size} runner touch: pause >= 44 px')
    shot(pg, size, 'rn_play')
    C.ok(not errs, f'{size} runner: no console errors {errs[:2]}')
    b.close()


# ------------------------------------------------------------------------------------------------ arcade
def arcade(p, w, h, touch, size):
    b, ctx, pg, errs = new(p, w, h, touch, 'a' + size)
    pg.evaluate("(c)=>window.__r37(c)", BOOST)
    pg.evaluate("(c)=>window.__r37(c)", LEAVE)
    pg.wait_for_selector('[data-a28="filter"]')
    pg.locator('[data-a28="filter"][data-filter="全部"]').click()
    pg.wait_for_timeout(1000)
    lob = pg.evaluate("""()=>{const q=s=>document.querySelector(s),body=q('.r37-legbody[data-s60=game]'),cards=q('.p30-cards'),lobby=q('.p30-lobby');
      const cta=q('.p30-card [data-a28=intro]');
      return {scroll:body.scrollHeight>body.clientHeight+20,bodyOv:getComputedStyle(body).overflowY,cardsOv:getComputedStyle(cards).overflowY,
        cardsFit:cards.scrollHeight<=cards.clientHeight+2,lobbyOv:getComputedStyle(lobby).overflowY,wallet:getComputedStyle(q('.p30-top')).display,
        bars:document.querySelectorAll('.arx-bar').length,cta:cta?getComputedStyle(cta).backgroundColor:null,
        tabsMask:getComputedStyle(q('.a28-tabs')).maskImage||getComputedStyle(q('.a28-tabs')).webkitMaskImage}}""")
    # R3.19 D08: the lobby scrolls with the window (whole page), not inside the planet body
    pgs = pg.evaluate("document.scrollingElement.scrollHeight>innerHeight+20||document.querySelector('#app>.r37-leg').scrollHeight>innerHeight+20")
    C.ok(lob['scroll'] or pgs, f'{size} lobby: the page itself scrolls {lob["scroll"]} {pgs}')
    C.ok(lob['cardsOv'] == 'visible' and lob['cardsFit'] and lob['lobbyOv'] == 'visible', f'{size} lobby: no inner scroll box (cards {lob["cardsOv"]}, lobby {lob["lobbyOv"]})')
    C.ok(lob['wallet'] == 'none' and lob['bars'] == 1, f'{size} lobby: duplicate coin pill removed, one summary strip ({lob["wallet"]}, {lob["bars"]})')
    C.ok(lob['cta'] == 'rgb(255, 201, 74)', f'{size} lobby: card CTA is gold ({lob["cta"]})')
    C.ok('gradient' in (lob['tabsMask'] or ''), f'{size} lobby: category row fades out on the right')
    shot(pg, size, 'arc_lobby')
    # real launch of one game
    card = pg.locator('[data-cabinet="sky-rescue"]')
    card.scroll_into_view_if_needed()
    card.locator('[data-a28="intro"]').click()
    pg.locator('#pg-dialog [data-a28="buy"]').click()
    pg.wait_for_selector('#pg-canvas')
    pg.wait_for_selector('#pg-overlay .arx-pw')
    pg.wait_for_timeout(500)
    shot(pg, size, 'arc_ready')
    # the legacy engine auto-pauses when frames stall (a busy CI box does that): press 開始 / 繼續 again until it really runs
    for attempt in range(4):
        pg.locator('#pg-overlay [data-a28="play"]').first.click()
        try:
            pg.wait_for_function("window.__r37('pgPlaying===true')", timeout=12000)
            break
        except Exception:
            if attempt == 3:
                st = pg.evaluate("(c)=>window.__r37(c)", "JSON.stringify({p:pgPlaying,phase:a28Run()&&a28Run().phase,h:(document.querySelector('#pg-overlay h2')||{}).textContent,hash:location.hash})")
                shot(pg, size, 'arc_play_fail')
                raise AssertionError('play did not start: ' + st)
    pg.evaluate("(c)=>window.__r37(c)", "(()=>{pgGame.score=700;return 1;})()")   # a score > 0 keeps the result block even if the game ends by itself
    pg.wait_for_timeout(1200)
    hd = pg.evaluate("(()=>{const e=document.querySelector('.header');return e?getComputedStyle(e).display:'none'})()")
    C.ok(hd == 'none', f'{size} arcade play: old .header hidden ({hd})')
    # R3.20: the DOM HUD replaces the lives / score pills
    cr = pg.evaluate(CONTRAST_JS, ['.a28-playhead h1', '.a28-playhead .a28-eyebrow', '.a28-playhead p', '#a28-live-stat', '#pg-hint', '.a28-playstats > *', '.ap-hud .ap-score', '.ap-hud .ap-wave', '.ap-dock .ap-tip', '.r2-audio summary', '.wq32-gamebar strong'])
    low = [c for c in cr if c['ratio'] < 7]
    C.ok(len(cr) >= 3 and not low, f'{size} arcade play: text contrast >= 7:1 on {len(cr)} elements, low: {low}')
    tiny = [c for c in cr if c['size'] < 14 and c['sel'] != '.a28-playstats > *']
    C.ok(not tiny, f'{size} arcade play: text >= 14 px {tiny}')
    vh = pg.evaluate("(()=>{const v=document.querySelector('.a28-viewport').getBoundingClientRect();return [v.height,innerHeight,document.querySelector('.a28-play').classList.contains('r2-immersive')]})()")
    if w < 700:
        # R3.19 D07: canvas runs full width with the touch keys under it, so the zone is >= 380 px (t26) rather than 58vh
        C.ok(vh[0] >= 380, f'{size} arcade play: play zone {round(vh[0])} px >= 380')
        tk = pg.evaluate("[...document.querySelectorAll('.a28-touch-key')].every(k=>{const r=k.getBoundingClientRect();return r.height>=44&&r.width>=44&&r.bottom<=innerHeight})")
        C.ok(tk, f'{size} arcade play: touch keys >= 44 px and on screen')
        pg.wait_for_timeout(2600)
        C.ok(pg.evaluate("(()=>{const c=document.querySelector('.wq34-rotate'),b=document.querySelector('.wq32-gamebar');return [c,b].every(e=>!e||getComputedStyle(e).display==='none')})()"), f'{size} arcade play: companion + rotate hints collapse')
        ph = pg.evaluate("document.querySelector('.a28-playhead').getBoundingClientRect().height")
        C.ok(ph <= 70, f'{size} arcade play: head bar compact ({round(ph)} px)')
        pg.locator('.arx-more').click()
        pg.wait_for_timeout(300)
        sheet = pg.evaluate("(()=>{const d=document.querySelector('.a28-game-footer>div');const s=getComputedStyle(d);const r=d.getBoundingClientRect();return {disp:s.display,pos:s.position,btn:[...d.querySelectorAll('.btn')].filter(b=>b.getBoundingClientRect().height>=44).length,on:r.bottom<=innerHeight&&r.top>=0}})()")
        C.ok(sheet['disp'] == 'grid' and sheet['pos'] == 'fixed' and sheet['btn'] == 4 and sheet['on'], f'{size} arcade play: ⋯ opens the function sheet {sheet}')
        shot(pg, size, 'arc_menu')
        pg.locator('.arx-more').click(force=True) if False else pg.evaluate("document.querySelector('.arx-more').click()")
        pg.wait_for_timeout(200)
    shot(pg, size, 'arc_play')
    # finish a round -> result card: gold primary, no stray one-letter line, readable
    for _ in range(3):   # a stalled frame may have auto-paused the engine again: resume once more
        if pg.evaluate("(c)=>window.__r37(c)", "pgPlaying"):
            break
        btn = pg.locator('#pg-overlay [data-a28="play"]')
        if btn.count():
            btn.first.click()
            pg.wait_for_timeout(1500)
    pg.evaluate("(c)=>window.__r37(c)", "(()=>{if(pgPlaying){pgGame.score=700;a28Fail('x');}return 1;})()")
    try:
        pg.wait_for_selector('#pg-overlay .wq34-result', timeout=15000)
    except Exception:
        st = pg.evaluate("(c)=>window.__r37(c)", "JSON.stringify({p:pgPlaying,phase:a28Run()&&a28Run().phase,ov:document.querySelector('#pg-overlay').hidden,h:(document.querySelector('#pg-overlay h2')||{}).textContent,html:document.querySelector('#pg-overlay').innerHTML.replace(/src=\"data:[^\"]+\"/g,'').slice(0,400)})")
        shot(pg, size, 'arc_result_fail')
        raise AssertionError('no result block: ' + st)
    pg.wait_for_timeout(500)
    res = pg.evaluate("""()=>{const c=document.querySelector('#pg-overlay .a28-overlaycard'),h=c.querySelector('h2'),n=h&&h.nextElementSibling;
      const b=c.querySelector('.btn.primary');return {stray:!!(n&&n.tagName==='P'&&(n.textContent||'').trim().length<=2),
        primary:b?getComputedStyle(b).backgroundColor:null,card:getComputedStyle(c).backgroundImage.slice(0,40)}}""")
    C.ok(not res['stray'], f'{size} arcade result: no stray one-letter line under the title')
    C.ok(res['primary'] == 'rgb(255, 201, 74)', f'{size} arcade result: primary button is gold ({res["primary"]})')
    C.ok('rgba(30, 38, 96' in res['card'], f'{size} arcade result: dark glass card ({res["card"]})')
    shot(pg, size, 'arc_result')
    C.ok(not errs, f'{size} arcade: no console errors {errs[:2]}')
    b.close()


ONLY_SIZES = [x for x in os.environ.get('T22_SIZES', '').split(',') if x]   # e.g. T22_SIZES=phone,land
ONLY_FNS = [x for x in os.environ.get('T22_FNS', '').split(',') if x]       # e.g. T22_FNS=arcade
with sync_playwright() as p:
    for w, h, size, touch in SIZES:
        if ONLY_SIZES and size not in ONLY_SIZES:
            continue
        for fn in (shooter, runner, arcade):
            if ONLY_FNS and fn.__name__ not in ONLY_FNS:
                continue
            try:
                fn(p, w, h, touch, size)
            except Exception as e:   # one broken screen must not hide the others
                C.ok(False, f'{size} {fn.__name__}: crashed {type(e).__name__}: {str(e)[:300]}')
C.done()

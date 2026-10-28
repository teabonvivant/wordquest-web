"""R3.16 t20 - branded galaxy shell: planet pictures + fallback, orientation-only backdrop, duotone icons (no shell emoji), reduced motion, 48px targets, map trail and states."""
import re
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t20')
HUBS = ['p/english', 'p/math', 'p/olympiad', 'p/games', 'p/dictation', 'p/parent']
MAPS = ['lv/english', 'lv/math', 'lv/olympiad']
# the emoji the shell used to show, plus any other pictograph; ★ ❤ ▶ ✓ ✕ ↻ are text glyphs the shell keeps
BANNED = '🔒🌱🌳📚🧰🎁🪙🔥⭐🚀🧑‍🚀'
EMOJI_JS = r"""(()=>{
 const re=/\p{Extended_Pictographic}/u,ok=/^[★☆❤▶✓✔✕✖↻←]$/u,found=[];
 const root=document.querySelector('#app>.r37-gx,#app>.r37-hub');if(!root)return ['no shell root'];
 const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 for(let n=w.nextNode();n;n=w.nextNode()){
  if(n.parentElement.closest('.r37-av,.r37-cav,[data-r37="chars"],.r37-dchip:not(.r37-lk)'))continue;
  for(const ch of n.nodeValue)if(re.test(ch)&&!ok.test(ch))found.push(ch);}
 root.querySelectorAll('[aria-label],[title]').forEach(e=>{for(const ch of (e.getAttribute('aria-label')||'')+(e.getAttribute('title')||''))if(re.test(ch)&&!ok.test(ch))found.push('attr:'+ch);});
 return found;})()"""
MIN48 = """(()=>{const bad=[];
 for(const e of document.querySelectorAll('#app>.r37-gx a,#app>.r37-gx button,#app>.r37-hub a,#app>.r37-hub button')){
  const r=e.getBoundingClientRect(),s=getComputedStyle(e);if(s.display==='none'||r.width===0||e.disabled&&0)continue;
  if(e.closest('.s60-menu'))continue;
  if(r.width<47.5||r.height<47.5)bad.push((e.className||e.tagName)+':'+Math.round(r.width)+'x'+Math.round(r.height));}
 return bad;})()"""


def lum(rgb):
    def f(c):
        c /= 255
        return c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4
    r, g, b = rgb
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b)


def ratio(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + .05) / (min(la, lb) + .05)


def rgb(s):
    return tuple(int(float(x)) for x in re.findall(r'[\d.]+', s)[:3])


with sync_playwright() as p:
    for w, h, name, touch in VIEWPORTS:
        b, ctx, pg, errs = open_page(p, w, h, touch)
        reqs = []
        pg.on('request', lambda r: reqs.append(r.url))
        pg.goto(URL); pg.wait_for_timeout(1200)
        register(pg, 't20user', '小明')
        go(pg, '#kid', 700)
        # --- pictures ---
        n = pg.evaluate("[...document.querySelectorAll('.r37-planet .r37-img')].filter(i=>i.complete&&i.naturalWidth>0).length")
        C.ok(n == 6, f'{name}: six planet pictures loaded ({n})')
        C.ok(pg.evaluate("!!document.querySelector('.r37-sunimg')?(document.querySelector('.r37-sunimg').naturalWidth>0)||innerWidth<=700||innerHeight<=520||getComputedStyle(document.querySelector('.r37-sun')).display==='none':true"), f'{name}: sun picture loads when the sun is shown')
        C.ok(pg.evaluate("document.querySelectorAll('.r37-planet .r37-ring').length")==12 and pg.evaluate("document.querySelectorAll('.r37-planet .r37-badge .r37-ic').length")==6, f'{name}: each planet has a split ring and a duotone badge')
        C.ok(pg.evaluate("!!document.querySelector('.r37-bar .r37-back .r37-logo')"), f'{name}: brand mark in the top bar (still links home)')
        C.ok(pg.evaluate("document.querySelectorAll('.r37-pp').length")==0, f'{name}: no progress bar under planets at 0 progress')
        go(pg, '#p/english', 400)
        C.ok(pg.evaluate("!!document.querySelector('.r81-hub .r80-cont')&&document.querySelectorAll('.r81-hub .r80-g').length===8"), f'{name}: 英文星 uses the 奧數星 layout (8 worlds + 繼續)')  # R3.32
        go(pg, '#p/dictation', 400)  # R3.32: the tile hubs are now 默書星 / 遊戲星
        ti = pg.evaluate("(()=>{const i=document.querySelector('.r37-tile:not(.gold) .r37-ti .r37-ic').getBoundingClientRect();return Math.round(i.width)})()")
        C.ok(ti >= (64 if w >= 1024 else 52) - 1 or h <= 520, f'{name}: hub tile icon size {ti}px')
        if w >= 1024:
            nv = pg.evaluate("(()=>{const n=document.querySelector('.r37-nav').getBoundingClientRect(),i=document.querySelector('.r37-nav a .r37-ic').getBoundingClientRect();return {w:Math.round(n.width),icon:Math.round(i.width),left:Math.round(n.left)}})()")
            C.ok(nv['w'] <= 762 and nv['icon'] >= 26 and abs(nv['left'] - (w - nv['w']) / 2) < 2, f'{name}: desktop navigation is a centred capsule {nv}')
        C.ok(pg.evaluate("!!document.querySelector('.r37-tile.gold .r37-tpl')"), f'{name}: main action card carries its planet picture')
        go(pg, '#kid', 400)
        # --- backdrop: only the current orientation's picture is requested ---
        land = w > h
        bgs = [u for u in reqs if 'bg_land' in u or 'bg_port' in u]
        C.ok(bgs and all(('bg_land' in u) == land for u in bgs), f'{name}: only the {"landscape" if land else "portrait"} backdrop is requested')
        C.ok(pg.evaluate("getComputedStyle(document.querySelector('.r37-gx')).backgroundImage.includes('bg_%s')" % ('land' if land else 'port')), f'{name}: home uses the matching backdrop')
        # --- no shell emoji ---
        for route in ['kid'] + HUBS + MAPS:
            go(pg, '#' + route, 300)
            bad = pg.evaluate(EMOJI_JS)
            C.ok(not bad, f'{name}: {route} shows no emoji {bad[:4]}')
            C.ok(not any(c in pg.inner_text('#app') for c in ['🔒', '🪙', '🎁', '📚', '🧰', '🔥', '🌱', '🌳', '🚀']), f'{name}: {route} text has none of the old icons')
            m = pg.evaluate(MIN48)
            C.ok(not m, f'{name}: {route} controls are at least 48px {m[:3]}')
            C.ok(fits(pg, '.r37-nav'), f'{name}: {route} nav in view')
        go(pg, '#kid', 300)
        m = pg.evaluate(MIN48)
        C.ok(not m, f'{name}: home controls are at least 48px {m[:3]}')
        C.ok(not errs, f'{name}: no console errors {errs[:2]}')
        b.close()

    # --- reduced motion (lib default) ---
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    pg.goto(URL); pg.wait_for_timeout(1000); register(pg, 't20rm', '小明'); go(pg, '#kid', 600)
    C.ok(pg.evaluate("[...document.querySelectorAll('.r37-planet,.r37-sunimg,.r37-gx')].every(e=>getComputedStyle(e).animationName==='none')"), 'reduced motion: planets and sun do not animate')
    C.ok(pg.evaluate("!document.querySelector('.r37-sky')"), 'reduced motion: no twinkle layer')
    go(pg, '#lv/english', 500)
    C.ok(pg.evaluate("getComputedStyle(document.querySelector('.r37-node.cur'),'::after').animationName==='none'"), 'reduced motion: current node halo is static')
    C.ok(pg.evaluate("[...document.querySelectorAll('.r37-hub *')].every(e=>getComputedStyle(e).animationName==='none')"), 'reduced motion: nothing on the map animates')
    b.close()

    # --- motion on: twinkle layer is CSS only, no canvas loop; no meteors / parallax ---
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    pg.emulate_media(reduced_motion='no-preference')
    pg.goto(URL); pg.wait_for_timeout(1000); register(pg, 't20mo', '小明'); go(pg, '#kid', 700)
    C.ok(pg.evaluate("!!document.querySelector('.r37-sky')&&document.querySelector('.r37-sky').tagName==='DIV'&&!document.querySelector('canvas.r37-sky')"), 'motion on: light CSS twinkle layer, no canvas sky')
    C.ok(pg.evaluate("getComputedStyle(document.querySelector('.r37-planet')).animationName!=='none'"), 'motion on: planets float')
    b.close()

    # --- image failure: gradient balls remain and the layout holds ---
    for w, h, name, touch in [(390, 844, 'phone', True), (1440, 900, 'desktop', False)]:
        b, ctx, pg, errs = open_page(p, w, h, touch)
        pg.route('**/assets/r316/**', lambda r: r.abort())
        pg.goto(URL); pg.wait_for_timeout(1000); register(pg, 't20ab', '小明'); go(pg, '#kid', 700)
        C.ok(pg.evaluate("[...document.querySelectorAll('.r37-planet .r37-img')].every(i=>i.naturalWidth===0)"), f'{name}/offline pictures: images blocked')
        C.ok(pg.evaluate("[...document.querySelectorAll('.r37-orb')].every(o=>getComputedStyle(o).backgroundImage.includes('radial-gradient'))"), f'{name}/offline pictures: gradient ball remains under every planet')
        C.ok(fits(pg, '.r37-planet') and fits(pg, '.r37-nav') and pg.evaluate("document.documentElement.scrollHeight<=innerHeight+1"), f'{name}/offline pictures: layout intact')
        C.ok(pg.evaluate("getComputedStyle(document.querySelector('.r37-gx')).backgroundColor!=='rgba(0, 0, 0, 0)'"), f'{name}/offline pictures: backdrop colour remains')
        b.close()

    # --- level map: trail + three distinguishable node states ---
    for w, h, name, touch in [(390, 844, 'phone', True), (1440, 900, 'desktop', False), (844, 390, 'landscape', True)]:
        b, ctx, pg, errs = open_page(p, w, h, touch)
        pg.goto(URL); pg.wait_for_timeout(1000); register(pg, 't20map', '小明')
        ev(pg, "(()=>{const o=r37Get();o.lv['english:0:0']={best:4,passed:true,at:new Date().toISOString()};o.lv['english:0:1']={best:5,passed:true,at:new Date().toISOString()};r37Save();})()")
        go(pg, '#lv/english', 700)
        info = pg.evaluate("""()=>{const q=s=>document.querySelector(s),cs=e=>getComputedStyle(e);
          const vis=[...document.querySelectorAll('.r37-trail')].find(t=>cs(t).display!=='none');
          const d=q('.r37-node.done'),c=q('.r37-node.cur'),l=q('.r37-node.lock');
          const st=e=>({bg:cs(e).backgroundImage+cs(e).backgroundColor,bc:cs(e).borderColor,bs:cs(e).borderStyle});
          const nu=l&&l.querySelector('.r37-nu');
          return {trail:!!vis,segs:vis?vis.querySelectorAll('path').length:0,lit:vis?vis.querySelectorAll('path.lit').length:0,
            done:d?st(d):null,cur:c?st(c):null,lock:l?st(l):null,lockIcon:!!(l&&l.querySelector('svg.r37-ic')),
            doneStars:d?d.querySelectorAll('.r37-st3 i.on').length:0,
            nuColor:nu?cs(nu).color:null,lockBg:l?cs(l).backgroundColor:null,
            ndone:document.querySelectorAll('.r37-node.done').length,ncur:document.querySelectorAll('.r37-node.cur').length,nlock:document.querySelectorAll('.r37-node.lock').length,
            curColor:c?cs(c).color:null}}""")
        C.ok(info['trail'] and info['segs'] == 9, f'{name}: trail with 9 segments between the 10 stages')
        # every segment joins node i to node i+1 (centre to centre), in stage order, including the turns
        seg = pg.evaluate("""()=>{const p=document.querySelector('.r37-path'),ns=[...p.querySelectorAll(':scope>.r37-node')],ps=[...p.querySelectorAll(':scope>.r37-trail path')];
          const c=n=>[n.offsetLeft+n.offsetWidth/2,n.offsetTop+n.offsetHeight/2];
          return {n:ns.length,m:ps.length,ok:ps.every((e,i)=>{const d=(e.getAttribute('d')||'').match(/-?[\\d.]+/g);if(!d||d.length<4)return false;const a=c(ns[i]),b=c(ns[i+1]),L=d.length;
            return Math.abs(+d[0]-a[0])<2&&Math.abs(+d[1]-a[1])<2&&Math.abs(+d[L-2]-b[0])<2&&Math.abs(+d[L-1]-b[1])<2;})}}""")
        C.ok(seg['m'] == seg['n'] - 1 and seg['ok'], f'{name}: path segments = nodes-1, each (a cubic curve since R3.18) ends on its two stage centres {seg}')
        C.ok(info['lit'] == 2, f'{name}: finished stages light their outgoing segment ({info["lit"]})')
        C.ok(info['ndone'] == 2 and info['ncur'] == 1 and info['nlock'] == 7, f'{name}: 2 done / 1 current / 7 locked')
        C.ok(len({info['done']['bg'], info['cur']['bg'], info['lock']['bg']}) == 3, f'{name}: three states have different fills')
        C.ok(info['lockIcon'] and info['lock']['bs'].startswith('dashed') and info['doneStars'] >= 1, f'{name}: locked = lock icon + dashed edge; done shows stars')
        cr = ratio(rgb(info['nuColor']), rgb(info['lockBg']))
        C.ok(cr >= 4.5, f'{name}: locked label contrast {cr:.1f}:1')
        # focus ring + first-screen fit
        C.ok(fits(pg, '.r37-node') and fits(pg, '.r37-wtab') and fits(pg, '.r37-wtitle'), f'{name}: map fits')
        pg.screenshot(path=str(SHOTS / f't20_map_{name}.png'))
        b.close()

    # --- astronaut avatar is drawn, not an emoji ---
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    pg.goto(URL); pg.wait_for_timeout(800)
    C.ok(ev(pg, "r37Icon('🧑‍🚀').startsWith('<svg')&&r37Icon('🔒').startsWith('<svg')&&r37Icon('🌱').startsWith('<svg')"), 'icon family covers astronaut, lock, sprout')
    C.ok(ev(pg, "['🔒','🌱','🌳','📚','🧰','🎁','🪙','🔥','⭐','🚀','🧑‍🚀','🔤','🔢','🧩','🎮','✏️','👪','🏆','✅','🪐'].every(k=>r37Icon(k).startsWith('<svg'))"), 'all listed shell emoji have a duotone icon')
    b.close()

C.done()

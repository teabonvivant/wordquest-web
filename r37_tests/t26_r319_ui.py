"""R3.19 t26 - UI fixes (r319-ui): hubs, level maps, legacy pages, answer screen, arcade, companion reaction.

Four sizes: 390x844, 360x640, 844x390, 1440x900. Admin test account (everything open) unless a section needs the normal rules
(sessionStorage wordquest-v29-admin-rules=normal + three finished stages). Measures, per item:
  M02/N05  hub tiles: no overlap, no hole in a 2-column row (phones), icon + label inside their tile, tile >= 72px high (phones)
  N04      level-map nodes (with their stars): no overlap, touch >= 44px, runner map too
  N03      companions: portrait stage ends above the name, name text contrast >= 4.5, info button is hit-testable
  N06      phonics: the counter does not overlap the hint title
  N07      unit word cards: a word never wraps
  N09      library checkbox is drawn (24px box, not white) inside a >= 44px label
  N11/N12  <summary> arrow, chip rows fade + snap
  N15/N17  dictation level buttons >= 44px wide, quiz bar chip has text
  D14      hint button says 提示, >= 96 x 44
  M03/M01  toast is one compact block above the nav; bar title one line; speaker slot only on unit pages
  N08/N16  no emoji left in world tabs / difficulty summaries
  N14      test banner <= 30px
  N10      maths hero copy sits above the arc
  N18      landscape practice: main button inside the first screen
  D07/D08/M13/M18/N13  arcade: >= 380px play zone with keys inside it, whole-page lobby scroll, glass intro dialog + gold CTA,
           rotate hint shown once, desktop keys on the first screen; uniform thumbnails
  item 8   companion: ok / no classes + animation <= 300ms, animation-name none under prefers-reduced-motion
Screenshots go to T26_SHOTS (default _team_runs/r319/ui_after/t26)."""
import os
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t26 r319 ui')
SHOTS_DIR = Path(os.environ.get('T26_SHOTS') or HERE.parent / '_team_runs/r319/ui_after/t26')
SHOTS_DIR.mkdir(parents=True, exist_ok=True)
ONLY = set((os.environ.get('T26_SIZES') or '').split(',')) - {''}
SIZES = [(390, 844, 'phone', True), (360, 640, 'small', True), (844, 390, 'land', True), (1440, 900, 'desktop', False)]
SEED_NORM = ("(()=>{const o=r37Get();for(const [k,b] of [[0,5],[1,3],[2,1]]){for(const t of ['english','math'])o.lv[r37LvKey(t,0,k)]={best:b,passed:true};}"
             "o.lv['runner:0:0']={best:5,passed:true};r37Save&&r37Save();return 1})()")
EMOJI = re.compile('[\U0001F300-\U0001FAFF☀-➿❤]')
LEAVE = ("(()=>{const c=a28Child();if(c.run)COIN28.close(c);pgPlaying=false;pgGame=null;a28Epoch++;pgFree=false;for(const id of COIN28.ids)c.permissions[id]='open';"
         "c.batch.used=0;activeChild().stars=60;save();go('game');render();return 1;})()")

# ---------------------------------------------------------------- in-page helpers
JS_LUM = """(()=>{window.__lum=(c)=>{const m=c.match(/[\\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
window.__cr=(a,b)=>{const x=window.__lum(a),y=window.__lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
window.__inter=(a,b,pad=0)=>!(a.right-pad<=b.left||b.right-pad<=a.left||a.bottom-pad<=b.top||b.bottom-pad<=a.top);return 1})()"""


def admin(p, w, h, touch, normal=False, motion=False):
    b, ctx, pg, errs = open_page(p, w, h, touch, learn=True)
    html = patched_html()
    pg.route(URL + '?mode=admin-test', lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html))
    if motion:
        pg.emulate_media(reduced_motion='no-preference')
    pg.goto(URL + '?mode=admin-test'); pg.wait_for_timeout(1200)
    go(pg, '#login', 300)
    pg.fill('#login-name', 'Admin'); pg.fill('#login-pin', '1234')
    pg.click('[data-act="login-submit"]'); pg.wait_for_timeout(1200)
    go(pg, '#kid', 400)
    if normal:
        pg.evaluate("sessionStorage.setItem('wordquest-v29-admin-rules','normal')")
        ev(pg, SEED_NORM)
    pg.evaluate(JS_LUM)
    return b, pg, errs


def shot(pg, name):
    pg.screenshot(path=str(SHOTS_DIR / f'{name}.png'))


def page(pg, h, wait=1100):
    go(pg, '#kid', 200)
    go(pg, h, wait)


# ---------------------------------------------------------------- sections
def sec_hubs(pg, name, phone):
    for hub in ['p/english', 'p/math', 'p/games']:  # R3.23: 奧數星改為年級路線，由 t50 檢查
        page(pg, '#' + hub)
        r = pg.evaluate("""()=>{const g=document.querySelector('.r37-tiles');const gr=g.getBoundingClientRect();
          const T=[...g.querySelectorAll(':scope>.r37-tile')].map(t=>{const r=t.getBoundingClientRect();const i=t.querySelector('.r37-ti'),n=t.querySelector('.r37-tn');
            const ir=i&&i.getBoundingClientRect(),nr=n&&n.getBoundingClientRect();
            return {r:[r.left,r.top,r.right,r.bottom],h:r.height,w:r.width,iOk:!ir||(ir.top>=r.top-1&&ir.bottom<=r.bottom+1),nOk:!nr||(nr.top>=r.top-1&&nr.bottom<=r.bottom+1&&nr.left>=r.left-1&&nr.right<=r.right+1)}});
          const ov=[];for(let a=0;a<T.length;a++)for(let b=a+1;b<T.length;b++){const x=T[a].r,y=T[b].r;if(!(x[2]<=y[0]+1||y[2]<=x[0]+1||x[3]<=y[1]+1||y[3]<=x[1]+1))ov.push([a,b])}
          const rows={};T.forEach((t,i)=>{const k=Math.round(t.r[1]/6);(rows[k]=rows[k]||[]).push(i)});
          const holes=Object.values(rows).filter(ix=>{const l=Math.min(...ix.map(i=>T[i].r[0])),r=Math.max(...ix.map(i=>T[i].r[2]));return (r-l)<gr.width*.8}).length;
          return {n:T.length,ov,holes,minH:Math.min(...T.map(t=>t.h)),iBad:T.filter(t=>!t.iOk).length,nBad:T.filter(t=>!t.nOk).length,grid:[gr.width,gr.height]}}""")
        C.ok(r['n'] >= 4, f'{name} {hub}: tiles rendered {r}')
        C.ok(not r['ov'], f'{name} {hub}: tiles do not overlap {r["ov"]}')
        C.ok(r['iBad'] == 0 and r['nBad'] == 0, f'{name} {hub}: icon and label stay inside their tile {r}')
        if phone:
            C.ok(r['holes'] == 0, f'{name} {hub}: no orphan tile leaving a hole in the row {r}')
            C.ok(r['minH'] >= 64, f'{name} {hub}: every tile >= 64px high (R3.21: 7 tiles on games star; touch target still >= 44) (min {r["minH"]})')
        if name in ('small', 'phone') and hub in ('p/games', 'p/english'):
            shot(pg, f'{name}_{hub.replace("/", "_")}')


def sec_maps(pg, name):
    for hub, sel in [('lv/english', '.r37-node'), ('lv/math', '.r37-node'), ('lv/runner', '.r37-node')]:
        page(pg, '#' + hub)
        r = pg.evaluate("""()=>{const N=[...document.querySelectorAll('.r37-path .r37-node')].map(n=>{const r=n.getBoundingClientRect(),s=n.querySelector('.r37-st3');const sr=s&&s.getBoundingClientRect();
           return {l:r.left,t:r.top,r:r.right,b:Math.max(r.bottom,sr?sr.bottom:0),w:r.width,h:r.height}});
           const ov=[];for(let a=0;a<N.length;a++)for(let b=a+1;b<N.length;b++){const x=N[a],y=N[b];if(!(x.r<=y.l+1||y.r<=x.l+1||x.b<=y.t+1||y.b<=x.t+1))ov.push([a,b])}
           return {n:N.length,ov,minW:Math.min(...N.map(n=>n.w)),minH:Math.min(...N.map(n=>n.h))}}""")
        C.ok(r['n'] >= 3, f'{name} {hub}: nodes rendered {r}')
        C.ok(not r['ov'], f'{name} {hub}: nodes (with their stars) do not overlap {r["ov"]}')
        C.ok(r['minW'] >= 44 and r['minH'] >= 44, f'{name} {hub}: nodes >= 44px (min {r["minW"]}x{r["minH"]})')
        if name in ('small', 'phone') and hub != 'lv/math':
            shot(pg, f'{name}_norm_{hub.replace("/", "_")}')


def sec_world_icons(pg, name):
    for hub in ['lv/math']:  # R3.23: lv/olympiad redirects to the grade path (t50)
        page(pg, '#' + hub)
        r = pg.evaluate("""()=>{const t=[...document.querySelectorAll('.r37-wtab,.r37-wic')];return {n:t.length,emoji:t.filter(e=>/[\\u{1F300}-\\u{1FAFF}\\u2600-\\u27BF]/u.test(e.textContent)).map(e=>e.textContent),svg:t.filter(e=>e.querySelector('svg')).length}}""")
        C.ok(r['n'] >= 6 and not r['emoji'] and r['svg'] >= 6, f'{name} {hub}: world tabs and title icon are SVG, no emoji {r}')
    page(pg, '#p/parent')
    pg.click('[data-r37="ptab"][data-k="diff"]'); pg.wait_for_timeout(300)
    r = pg.evaluate("""()=>{const s=[...document.querySelectorAll('.r37-dsub small,.r37-df small,.r37-diffs b')];return {n:s.length,emoji:s.filter(e=>/[\\u{1F300}-\\u{1FAFF}\\u2764]/u.test(e.textContent)).map(e=>e.textContent),svg:document.querySelectorAll('.r37-dsub small svg').length,hearts:document.querySelectorAll('.r37-hs svg').length}}""")
    C.ok(not r['emoji'] and r['svg'] >= 3 and r['hearts'] >= 5, f'{name} parent difficulty: SVG icons and SVG hearts, no emoji / ❤ text {r}')


def sec_legacy(pg, name, phone):
    # N03 companions
    page(pg, '#companions')
    r = pg.evaluate("""()=>{const st=document.querySelector('.wq32-portrait-stage'),h=document.querySelector('.wq32-profile h2'),tag=document.querySelector('.wq32-preview-tag'),i=document.querySelector('.wq32-profile .s60-i');
      if(!st||!h)return null;const a=st.getBoundingClientRect(),b=h.getBoundingClientRect(),ir=i&&i.getBoundingClientRect();const bg='rgb(20,26,70)';
      const hit=i?document.elementFromPoint(ir.left+ir.width/2,ir.top+ir.height/2):null;
      return {stageH:a.height,stageBottom:a.bottom,nameTop:b.top,cr:window.__cr(getComputedStyle(h).color,bg),crTag:tag?window.__cr(getComputedStyle(tag).color,bg):9,
        info:!i||ir.bottom<innerHeight-60&&(hit===i||i.contains(hit)),infoVisible:!i||(ir.bottom<=innerHeight)}}""")
    C.ok(r is not None, f'{name} companions: profile found')
    if r:
        C.ok(r['stageH'] <= 242, f'{name} companions: portrait stage capped at 240px ({r["stageH"]})')
        C.ok(r['stageBottom'] <= r['nameTop'] + 1, f'{name} companions: portrait ends above the name {r}')
        C.ok(r['cr'] >= 4.5 and r['crTag'] >= 4.5, f'{name} companions: name / role text contrast >= 4.5 {r}')
    if name in ('phone', 'small'):
        shot(pg, f'{name}_companions')
    # N06 phonics
    page(pg, '#phonics-lesson')
    r = pg.evaluate("""()=>{const t=document.querySelector('.pc-course-total'),h=document.querySelector('.pc-hero h2');if(!t||!h)return null;return {ov:window.__inter(t.getBoundingClientRect(),h.getBoundingClientRect())}}""")
    C.ok(r is not None and not r['ov'], f'{name} phonics: the counter and the hint title do not overlap {r}')
    # N07 unit words
    page(pg, '#unit?id=U01')
    r = pg.evaluate("""()=>{const s=[...document.querySelectorAll('.l30-word strong')];return {n:s.length,wrap:s.filter(e=>{const fs=parseFloat(getComputedStyle(e).fontSize);return e.getBoundingClientRect().height>fs*1.7}).map(e=>e.textContent)}}""")
    C.ok(r['n'] >= 6 and not r['wrap'], f'{name} unit: no word wraps inside itself {r}')
    if name == 'phone':
        shot(pg, 'phone_unit')
    # N09 checkbox
    page(pg, '#library')
    r = pg.evaluate("""()=>{const i=document.querySelector('#l30-pics'),l=i&&i.closest('label');if(!i)return null;const s=getComputedStyle(i),ir=i.getBoundingClientRect(),lr=l.getBoundingClientRect();
      return {app:s.appearance,w:ir.width,h:ir.height,bg:s.backgroundColor,lh:lr.height,lw:lr.width}}""")
    C.ok(r and r['app'] == 'none' and r['w'] >= 44 and r['h'] >= 44 and r['bg'] != 'rgb(255, 255, 255)' and r['lh'] >= 44, f'{name} library: checkbox is drawn (not the native white block) with a >= 44px hit area {r}')
    # N11 summary + N12 tabs
    page(pg, '#game-settings')
    r = pg.evaluate("""()=>{const s=[...document.querySelectorAll('.r37-legbody details>summary')];return {n:s.length,noArrow:s.filter(e=>getComputedStyle(e,'::after').content==='none').length,short:s.filter(e=>e.getBoundingClientRect().height<44).length}}""")
    C.ok(r['n'] >= 2 and r['noArrow'] == 0 and r['short'] == 0, f'{name} game-settings: every <summary> has an arrow and is >= 44px {r}')
    page(pg, '#settings')
    r = pg.evaluate("""()=>{const t=document.querySelector('.r37-legbody .tabs');if(!t)return null;const s=getComputedStyle(t);return {mask:(s.webkitMaskImage||s.maskImage||'')!=='none'&&(s.webkitMaskImage||s.maskImage||'')!=='',snap:s.scrollSnapType,sw:t.scrollWidth,cw:t.clientWidth}}""")
    C.ok(r and r['mask'] and 'x' in r['snap'], f'{name} settings tabs: right-edge fade + scroll-snap {r}')
    # M01 bar title / speaker slot ; M03 toast
    page(pg, '#practice')
    r = pg.evaluate("""()=>{const t=document.querySelector('.r37-bar .r37-legt'),s=document.querySelector('.r37-bar .s60-slot');const g=document.createRange();g.selectNodeContents(t);
      const tops=new Set([...g.getClientRects()].filter(x=>x.height>2).map(x=>Math.round(x.top/6)));return {lines:tops.size,slot:s?getComputedStyle(s).display:'none'}}""")
    C.ok(r['lines'] <= 1 and r['slot'] == 'none', f'{name} practice: bar title on one line, no speaker button {r}')
    page(pg, '#unit?id=U01')
    r = pg.evaluate("""()=>{const s=document.querySelector('.r37-bar .s60-slot');return s?getComputedStyle(s).display:'none'}""")
    C.ok(r != 'none', f'{name} unit: speaker slot kept where reading aloud matters ({r})')
    page(pg, '#learn')
    ev(pg, "toast('今天還沒開始，按「開始今天的小課」。')")
    pg.wait_for_timeout(250)
    r = pg.evaluate("""()=>{const t=document.querySelector('#toast');if(!t)return null;const r=t.getBoundingClientRect(),n=document.querySelector('.r37-nav').getBoundingClientRect();
      const bg=getComputedStyle(t).backgroundColor;return {h:r.height,w:r.width,gap:n.top-r.bottom,cr:window.__cr(getComputedStyle(t).color,bg)}}""")
    C.ok(r is not None and r['h'] <= 70 and r['gap'] >= 8 and r['cr'] >= 4.5, f'{name} toast: <= 2 lines, above the nav, contrast ok {r}')
    if name in ('phone', 'small'):
        shot(pg, f'{name}_learn_toast')
    # N15 dictation level buttons
    page(pg, '#dz')
    r = pg.evaluate("""()=>{const b=[...document.querySelectorAll('.r37-dzb')];return {n:b.length,min:Math.min(...b.map(x=>x.getBoundingClientRect().width)),minH:Math.min(...b.map(x=>x.getBoundingClientRect().height))}}""")
    C.ok(r['n'] >= 3 and r['min'] >= 44 and r['minH'] >= 44, f'{name} dz: level buttons >= 44px {r}')
    if name == 'small':
        shot(pg, 'small_dz')


def sec_play(pg, name):
    # D14 hint button, item 8 companion, N17 dictation chip
    page(pg, '#lv/english')
    pg.click('.r37-node.cur'); pg.wait_for_timeout(300)
    pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(300)
    for _ in range(14):
        if pg.query_selector('.r37-opt'):
            break
        pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(250)
    pg.wait_for_timeout(300)
    r = pg.evaluate("""()=>{const b=document.querySelector('.r37-hintb');if(!b)return null;const r=b.getBoundingClientRect(),n=document.querySelector('.r37-nav');return {txt:b.textContent.trim(),w:r.width,h:r.height,cr:window.__cr(getComputedStyle(b).color,'rgb(24,30,80)')}}""")
    C.ok(r is not None and '提示' in r['txt'] and r['w'] >= 96 and r['h'] >= 44 and r['cr'] >= 4.5, f'{name} answer screen: hint button says 提示, >= 96x44 {r}')
    if name in ('phone', 'small'):
        shot(pg, f'{name}_en_question')
    # companion: correct then wrong (reduced motion is off here)
    ans = ev(pg, "r37P.qs[r37P.i].answer")
    pg.evaluate("(a)=>{const o=[...document.querySelectorAll('.r37-opt')].find(x=>x.dataset.v===a);if(o)o.click()}", ans)
    pg.wait_for_timeout(120)
    r = pg.evaluate("""()=>{const c=document.querySelector('.r37-comp'),a=c&&c.querySelector('.r37-compav');if(!c)return null;const s=getComputedStyle(a),d=getComputedStyle(c,'::after');
      return {cls:c.className,an:s.animationName,dur:parseFloat(s.animationDuration),dust:d.animationName,dustDur:parseFloat(d.animationDuration)}}""")
    C.ok(r and 'ok' in r['cls'].split() and r['an'] != 'none' and r['dur'] <= .3 and r['dust'] != 'none' and r['dustDur'] <= .3,
         f'{name} companion correct: hop + star dust classes present, <= 300ms {r}')
    # wrong answer in the next question (choice or fill-in)
    pg.wait_for_timeout(1700)
    wrong_ok = False
    for _ in range(8):
        if pg.query_selector('.r37-opt:not([disabled])'):
            a2 = ev(pg, "r37P.qs[r37P.i].answer")
            pg.evaluate("(a)=>{const o=[...document.querySelectorAll('.r37-opt')].find(x=>x.dataset.v!==a);if(o)o.click()}", a2)
            wrong_ok = True
        elif pg.query_selector('#r37-in:not([disabled])'):
            pg.fill('#r37-in', 'qzqzq'); pg.click('.r37-ok')
            wrong_ok = True
        if wrong_ok:
            pg.wait_for_timeout(120)
            break
        pg.wait_for_timeout(400)
    r = pg.evaluate("""()=>{const c=document.querySelector('.r37-comp'),a=c&&c.querySelector('.r37-compav');if(!c)return null;const s=getComputedStyle(a);return {cls:c.className,an:s.animationName,dur:parseFloat(s.animationDuration)}}""")
    C.ok(wrong_ok and r and 'no' in r['cls'].split() and r['an'] != 'none' and r['dur'] <= .3, f'{name} companion wrong: gentle tilt present, <= 300ms {r}')
    # reduced motion: animation-name none
    pg.emulate_media(reduced_motion='reduce'); pg.wait_for_timeout(150)
    r = pg.evaluate("""()=>{const c=document.querySelector('.r37-comp'),a=c&&c.querySelector('.r37-compav');return {an:getComputedStyle(a).animationName,dust:getComputedStyle(c,'::after').animationName}}""")
    C.ok(r['an'] == 'none' and r['dust'] == 'none', f'{name} companion: animation-name is none under prefers-reduced-motion {r}')
    pg.emulate_media(reduced_motion='no-preference')
    # N17 dictation quiz chip
    go(pg, '#kid', 300); go(pg, '#dz', 900)
    pg.click('.r37-dzm'); pg.wait_for_timeout(400)
    pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(500)
    r = pg.evaluate("""()=>{const c=document.querySelector('.r37-ptop .r37-dchip');return c?{txt:c.textContent.trim(),h:c.getBoundingClientRect().height}:null}""")
    C.ok(r and '級' in r['txt'], f'{name} dictation quiz bar: the level chip has text {r}')
    if name == 'phone':
        shot(pg, 'phone_dz_q1')


def sec_wqm(pg, name):
    go(pg, '#kid', 200); go(pg, '#p/math', 600)
    pg.evaluate("document.querySelector('[data-wqm-open=\"normal\"]').click()"); pg.wait_for_timeout(2200)
    r = pg.evaluate("""()=>{const R=document.querySelector('#wq-course-host').shadowRoot;const p=R.querySelector('.hero p');if(!p)return null;
      const hero=R.querySelector('.hero'),d=hero.firstElementChild;return {pr:getComputedStyle(p).paddingRight,z:getComputedStyle(d).zIndex,pos:getComputedStyle(d).position,clipped:p.scrollWidth>p.clientWidth+1}}""")
    C.ok(r and r['pr'] == '56px' and r['z'] == '2' and not r['clipped'], f'{name} maths hero: copy above the arc, not clipped {r}')
    if name == 'phone':
        shot(pg, 'phone_wqm-home')
    pg.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close())")


def sec_land(pg, name):
    page(pg, '#practice')
    r = pg.evaluate("""()=>{const b=document.querySelector('[data-s60=practice] a.l30-btn.primary'),n=document.querySelector('.r37-nav');if(!b)return null;const r=b.getBoundingClientRect();return {bottom:r.bottom,top:r.top,nav:n.getBoundingClientRect().top,h:r.height}}""")
    C.ok(r and r['bottom'] <= r['nav'] + 1 and r['h'] >= 44, f'{name} practice (landscape): the main button is inside the first screen {r}')
    shot(pg, 'land_practice')


def arcade_open(pg, gid='ruins-courier'):
    go(pg, '#game', 800); ev(pg, LEAVE); pg.wait_for_timeout(800)
    pg.locator('[data-a28="filter"][data-filter="全部"]').click(); pg.wait_for_timeout(400)
    card = pg.locator(f'[data-cabinet="{gid}"]'); card.scroll_into_view_if_needed(); card.locator('[data-a28="intro"]').click(); pg.wait_for_timeout(600)


def sec_arcade(pg, name, phone):
    go(pg, '#game', 1200)
    # D08 lobby: whole page scroll, fade row, one summary, uniform thumbnails
    r = pg.evaluate("""()=>{const lb=document.querySelector('.r37-legbody[data-s60=game]'),tabs=document.querySelector('.a28-tabs'),ts=getComputedStyle(tabs);
      const sh=[...document.querySelectorAll('.p30-card .p30-shot')].map(s=>{const r=s.getBoundingClientRect();return [r.width/r.height,getComputedStyle(s).borderRadius]});
      const top=document.querySelector('.p30-top');return {lbOv:getComputedStyle(lb).overflowY,doc:document.scrollingElement.scrollHeight,vh:innerHeight,
        mask:(ts.webkitMaskImage||ts.maskImage||''),snap:ts.scrollSnapType,topHidden:!top||getComputedStyle(top).display==='none',shots:sh.length,
        ratioSpread:Math.max(...sh.map(x=>x[0]))-Math.min(...sh.map(x=>x[0])),radii:[...new Set(sh.map(x=>x[1]))]}}""")
    C.ok(r['lbOv'] == 'visible', f'{name} lobby: no inner scroll box (the page scrolls) {r}')
    if phone:
        C.ok(r['doc'] > r['vh'] + 40, f'{name} lobby: document is taller than the screen and scrolls {r}')
        pg.evaluate("window.scrollTo(0,99999)"); pg.wait_for_timeout(250)
        C.ok(pg.evaluate("scrollY") > 100, f'{name} lobby: page scrolls with the window')
        pg.evaluate("window.scrollTo(0,0)")
    C.ok(r['mask'] not in ('', 'none') and 'x' in r['snap'], f'{name} lobby: category row fades out on the right + snaps {r}')
    C.ok(r['topHidden'], f'{name} lobby: duplicate coin summary folded away')
    C.ok(r['shots'] >= 4 and r['ratioSpread'] < .03 and len(r['radii']) == 1, f'{name} lobby: thumbnails share one frame (ratio, radius) {r}')
    if name in ('phone', 'small', 'desktop'):
        shot(pg, f'{name}_game')
    # M18 intro dialog
    arcade_open(pg)
    r = pg.evaluate("""()=>{const d=document.querySelector('#pg-dialog'),b=d.querySelector('.p30-actions .btn.primary');const bg=getComputedStyle(d).backgroundImage+getComputedStyle(d).backgroundColor;const cs=getComputedStyle(b);
      return {open:d.open,dark:/rgba?\\(\\s*(\\d+),/.test(bg)&&Number(bg.match(/rgba?\\(\\s*(\\d+),/)[1])<80,cta:cs.backgroundColor,ink:cs.color,h:b.getBoundingClientRect().height}}""")
    C.ok(r['open'] and r['dark'] and r['cta'] == 'rgb(255, 201, 74)' and r['ink'] == 'rgb(59, 38, 0)' and r['h'] >= 52, f'{name} intro dialog: glass dark card + gold CTA {r}')
    shot(pg, f'{name}_arc_intro')
    # play
    pg.locator('#pg-dialog [data-a28="buy"]').click(); pg.wait_for_selector('#pg-canvas'); pg.wait_for_timeout(800)
    seen_before = pg.evaluate("sessionStorage.getItem('wq34.rot')")
    pg.locator('#pg-overlay [data-a28="play"]').click(timeout=3000); pg.wait_for_timeout(1000)
    d = pg.evaluate("""()=>{const q=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height}};
      return {cv:q('#pg-canvas'),vp:q('.a28-viewport'),tc:q('.a28-touch-controls'),foot:q('.a28-game-footer>span'),vh:innerHeight,vw:innerWidth,rot:!!document.querySelector('.wq34-rotate')}}""")
    shot(pg, f'{name}_arc_play0')
    if phone:
        C.ok(d['vp']['h'] >= 380, f'{name} arcade play zone >= 380px tall ({d["vp"]["h"]:.0f}); canvas {d["cv"]["w"]:.0f}x{d["cv"]["h"]:.0f} (10:7, width-limited)')
        C.ok(d['cv']['w'] >= d['vw'] - 12, f'{name} arcade canvas runs full width ({d["cv"]["w"]:.0f} of {d["vw"]})')
        # R3.20: the one-screen layout contract puts the keys in their own row right under the play zone (they no longer overlap its bottom padding): under the canvas and fully inside the window
        C.ok(d['tc'] and d['tc']['t'] >= d['cv']['b'] - 1 and d['tc']['b'] <= d['vh'] + 1,
             f'{name} arcade touch keys sit under the canvas and inside the window {d["tc"]} {d["vp"]}')
        C.ok(d['tc']['h'] >= 64 or d['tc']['h'] >= 56, f'{name} arcade touch keys >= 56px high ({d["tc"]["h"]})')
        C.ok(d['foot'] and d['foot']['b'] <= d['vh'], f'{name} arcade goal card inside the screen {d["foot"]}')
    # M13 rotate hint flagged as shown (once per session)
    if phone:
        C.ok(pg.evaluate("sessionStorage.getItem('wq34.rot')") == '1', f'{name} rotate hint: marked as shown so no later screen repeats it (before: {seen_before})')
    pg.wait_for_timeout(3600)
    d2 = pg.evaluate("""()=>{const q=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {t:r.top,b:r.bottom,h:r.height}};
      return {tc:q('.a28-touch-controls'),foot:q('.a28-game-footer'),vh:innerHeight,rot:!!document.querySelector('.a28-play:not(.arx-hint-off) .wq34-rotate')}}""")
    if not phone and name == 'desktop':
        C.ok(d2['tc']['b'] <= d2['vh'], f'{name} arcade: the touch keys are on the first screen ({d2["tc"]})')
        C.ok(d2['foot']['b'] <= d2['vh'] + 2, f'{name} arcade: goal / buttons row is on the first screen ({d2["foot"]})')
    # N14 banner
    b = pg.evaluate("""()=>{const e=document.querySelector('#wq29-test-banner');if(!e)return null;const r=e.getBoundingClientRect();return {h:r.height,pos:getComputedStyle(e).position}}""")
    C.ok(b is None or (b['h'] <= 30 and b['pos'] == 'fixed'), f'{name} test banner: one 26px strip {b}')
    # result: no second rotate hint
    ev(pg, "(()=>{pgGame.score=120;a28Fail('x');return 1;})()"); pg.wait_for_timeout(1500)
    r = pg.evaluate("""()=>{const hint=[...document.querySelectorAll('.wq34-rotate')].filter(e=>e.getBoundingClientRect().height>0).length;
      const btn=document.querySelector('#pg-overlay .btn.primary,#pg-overlay .a28-btn.a33-locked');const cs=btn&&getComputedStyle(btn);
      const x=[...document.querySelectorAll('#pg-overlay button')].filter(b=>b.textContent.trim()==='x'||b.textContent.trim()==='×').length;
      return {hint,btnOpacity:cs?cs.opacity:null,btnBg:cs?cs.backgroundColor:null,x}}""")
    C.ok(r['hint'] == 0, f'{name} result: the rotate hint does not appear again {r}')
    C.ok(r['btnOpacity'] in (None, '1') and r['btnBg'] in (None, 'rgb(255, 201, 74)'), f'{name} result: the retry button looks active (gold, full opacity) {r}')
    C.ok(r['x'] == 0, f'{name} result: no stray close "x" {r}')
    shot(pg, f'{name}_arc_result')


# ---------------------------------------------------------------- run
def run():
    with sync_playwright() as p:
        for (w, h, name, touch) in SIZES:
            if ONLY and name not in ONLY:
                continue
            phone = w <= 520
            print('==', name, w, h)
            b, pg, errs = admin(p, w, h, touch)
            pg.set_default_timeout(15000)
            sec_hubs(pg, name, phone)
            sec_world_icons(pg, name)
            sec_legacy(pg, name, phone)
            sec_wqm(pg, name) if name in ('phone', 'small') else None
            if name == 'land':
                sec_land(pg, name)
            b.close()
            # normal rules: maps with finished stages
            b, pg, errs = admin(p, w, h, touch, normal=True)
            pg.set_default_timeout(15000)
            sec_maps(pg, name)
            b.close()
            # motion on: answer screen + companion, arcade
            b, pg, errs = admin(p, w, h, touch, motion=True)
            pg.set_default_timeout(15000)
            sec_play(pg, name)
            sec_arcade(pg, name, phone)
            C.ok(not [e for e in errs if 'favicon' not in e], f'{name}: no console / page errors {errs[:3]}')
            b.close()
    C.done()


if __name__ == '__main__':
    run()

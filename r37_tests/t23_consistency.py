"""R3.18 t23 - one consistent galaxy shell.

Four sizes (390x844, 844x390, 768x1024, 1440x900), a normal (non-Admin) family account with seeded progress, then every
legacy page (t17 page table), the six hubs, the level maps (english / math / runner / fps), the answer flow (learn card,
question, wrong feedback, result) and the maths dialogs (HK-M4 course, shadow DOM) and the 奧數路線 pages:
  - no light card surface (dark card token) except the listed paper / reading surfaces,
  - the only filled primary button colour is #ffc94a,
  - no system emoji used as an entrance icon (teaching content excluded),
  - no horizontal overflow, touch targets >= 44px, text contrast >= 4.5:1 (3:1 for large text),
  - map nodes carry stars, exactly one node is marked current (with the character), locked nodes are dashed,
  - the 12 character illustrations load.
Scan = r37_tests/t23_scan.js; overflow / touch targets = t17_measure.js."""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from lib37 import *  # noqa: E402,F401,F403
from wq33 import unlock_parent  # noqa: E402

SCAN = (HERE / 't23_scan.js').read_text()
MEASURE = (HERE / 't17_measure.js').read_text()
C = Checker('t23 consistency')
SIZES = [(390, 844, 'phone', True), (844, 390, 'landscape', True), (768, 1024, 'tablet', True), (1440, 900, 'desktop', False)]
LEGACY = {  # same pages as t17
    'classroom': '#classroom', 'library': '#library', 'unit': '#unit?id=U01', 'report': '#report', 'settings': '#settings', 'parent': '#parent',
    'offline': '#offline', 'game-settings': '#game-settings', 'game': '#game', 'assembly': '#assembly', 'assembly-unit': '#assembly-unit?id=air',
    'learning-help': '#learning-help', 'learning-plan': '#learning-plan', 'family-lesson': '#family-lesson', 'phonics-lesson': '#phonics-lesson',
    'login': '#login', 'practice': '#practice', 'companions': '#companions', 'learn': '#learn', 'ranges': '#ranges', 'range-new': '#range-new'}
HUBS = ['p/english', 'p/math', 'p/olympiad', 'p/games', 'p/dictation', 'p/parent']
MAPS = ['lv/english', 'lv/math', 'lv/olympiad', 'lv/runner', 'lv/fps']
# white reading surfaces that are allowed (one layer each): the course paper card and wqm lesson content
READ_COURSE = ['.wrap']
READ_WQM = ['.question-wrap', '.lesson-panel', '.toolbox', '.mini-board', '.feedback', '.hint', '.answer-sentence', '.scrolltable', '.report-row', '.parentview', '.cards .card.badge-card']
SEED = """(()=>{const o=r37Get(),at=new Date().toISOString();
 o.lv['english:0:0']={passed:true,best:5,at};o.lv['english:0:1']={passed:true,best:4,at};o.lv['english:0:2']={passed:true,best:3,at};
 o.lv['runner:0:0']={passed:true,best:5,at};o.lv['fps:0:0']={passed:true,best:5,at};
 for(const c of ['fox','cat','robot'])if(!o.chars.includes(c))o.chars.push(c);o.pick='fox';r37Save();return 1;})()"""


def gt(pg, url):
    for i in range(4):
        try:
            pg.goto(url, timeout=45000)
            return
        except Exception:
            pass
    pg.goto(url, timeout=60000)


def view(pg, tag, shadow=False, read=None, touch=True, tiny_ok=None):
    """scan + overflow + touch targets of what is on screen"""
    r = pg.evaluate(SCAN, {'shadow': shadow, 'readOk': read or []})
    m = pg.evaluate(MEASURE, dict(shadow=shadow, primary=None))
    C.ok(not r['light'], f'{tag}: no light card surface {r["light"][:3]}')
    bad = [x for x in r['filled'] if not x['ok']]
    C.ok(not bad, f'{tag}: primary buttons are only #ffc94a {bad[:3]}')
    C.ok(not r['emoji'], f'{tag}: no system emoji as an icon {r["emoji"][:4]}')
    C.ok(not r['contrast'], f'{tag}: text contrast >= 4.5:1 {r["contrast"][:3]}')
    C.ok(not (m['h_overflow_doc'] or m['h_overflow_elems']), f'{tag}: no horizontal overflow {m["h_overflow_sample"]}')
    tiny = [t for t in m['tiny_sample'] if not (tiny_ok and tiny_ok(t))] if m['tiny_count'] else []
    C.ok(not tiny, f'{tag}: touch targets >= 44px ({m["tiny_count"]}) {tiny[:3]}')
    return r, m


def session(p, w, h, touch):
    b, ctx, pg, errs = open_page(p, w, h, touch, learn=True)
    pg.set_default_timeout(10000)
    gt(pg, URL)
    pg.wait_for_timeout(900)
    register(pg, 't23user', '小明')
    ev(pg, SEED)
    pg.reload()
    pg.wait_for_timeout(900)
    return b, pg, errs


def open_dialog(pg, planet, key, sub=None):
    pg.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close())")
    go(pg, '#p/' + planet, 450)
    # R3.23: the olympiad hub no longer carries the 思維之塔 / 策略卡 tiles, so a temporary opener button stands in for them
    pg.evaluate("(k)=>{let b=document.querySelector(`[data-wqm-open=\"${k}\"]`);if(!b){b=document.createElement('button');b.dataset.wqmOpen=k;b.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0';document.body.appendChild(b);}b.click()}", key)
    pg.wait_for_timeout(1300)
    if sub:
        pg.evaluate("(a)=>{const r=document.querySelector('#wqm-app-host').shadowRoot;r.querySelector(a)?.click()}", sub)
        pg.wait_for_timeout(800)


def run():
    with sync_playwright() as p:
        for w, h, name, touch in SIZES:
            b, pg, errs = session(p, w, h, touch)
            # ---------------- hubs + home
            for r in ['kid'] + HUBS:
                go(pg, '#' + r, 600)
                view(pg, f'{name}/{r}', tiny_ok=lambda t: False)
            # ---------------- maps: stars, current marker, locked state, chars
            for r in MAPS:
                go(pg, '#' + r, 700)
                view(pg, f'{name}/{r}')
                if r == 'lv/olympiad':
                    continue  # R3.23: the olympiad map is the 奧數路線 star path (islands, not 10 nodes); t50 checks it
                d = pg.evaluate("""()=>{const n=[...document.querySelectorAll('.r37-path>.r37-node')];
                  return {n:n.length,st:n.filter(x=>x.querySelectorAll('.r37-st3 i').length===5).length,cur:n.filter(x=>x.classList.contains('cur')).length,
                  here:document.querySelectorAll('.r37-node.cur .r37-here img').length,lock:n.filter(x=>x.classList.contains('lock')).length,
                  curve:[...document.querySelectorAll('.r37-trail path')].filter(p=>/C/.test(p.getAttribute('d')||'')).length,
                  size:Math.round(n[0]?n[0].getBoundingClientRect().width:0)}}""")
                C.ok(d['n'] >= 3 and d['st'] == d['n'], f'{name}/{r}: every node shows five stars (R3.29 A-10: same scale as the result screen) {d}')
                C.ok(d['cur'] == 1 and d['here'] == 1, f'{name}/{r}: one current node with the character marker {d}')
                C.ok(d['curve'] >= d['n'] - 2, f'{name}/{r}: trail is a cubic curve {d}')
                if r in ('lv/english', 'lv/math', 'lv/olympiad', 'lv/fps'):
                    C.ok(d['lock'] >= 1, f'{name}/{r}: locked nodes are shown (normal account) {d}')
            go(pg, '#lv/english', 600)
            st = pg.evaluate("""()=>{const q=s=>document.querySelector(s);const dn=q('.r37-node.done');return {done:dn?dn.querySelectorAll('.r37-st3 i.on').length:-1,
              lock:!!q('.r37-node.lock')&&getComputedStyle(q('.r37-node.lock')).borderStyle.includes('dashed')}}""")
            C.ok(st['done'] >= 1 and st['lock'], f'{name}: done node has gold stars, locked node is dashed {st}')
            # ---------------- R3.23 奧數路線 pages (replaced the 思維之塔 / 策略卡 dialogs)
            for r in ['oly/1', 'oly/6', 'oly/cards', 'oly/wrong']:
                go(pg, '#' + r, 700)
                view(pg, f'{name}/{r}')
            # ---------------- characters
            go(pg, '#p/chars', 700)
            view(pg, f'{name}/p/chars')
            ch = pg.evaluate("""()=>({n:document.querySelectorAll('.r37-char .r37-cimg.full').length,ok:[...document.querySelectorAll('.r37-char .r37-cimg.full')].filter(i=>i.complete&&i.naturalWidth>0).length,
              own:document.querySelectorAll('.r37-char.own').length,top:[...document.querySelectorAll('.r37-av .r37-cimg')].filter(i=>i.complete&&i.naturalWidth>0).length})""")
            C.ok(ch['n'] == 12 and ch['ok'] == 12, f'{name}: 12 character illustrations loaded {ch}')
            C.ok(ch['own'] == 4 and ch['top'] >= 1, f'{name}: owned characters have the gold edge, the top bar shows the picked illustration {ch}')
            # ---------------- answer flow
            go(pg, '#lv/english', 600)
            pg.click('.r37-node.cur')
            pg.wait_for_timeout(450)
            view(pg, f'{name}/learn card')
            pg.click('[data-r37="learn-go"]')
            pg.wait_for_timeout(450)
            r, m = view(pg, f'{name}/question')
            C.ok(pg.evaluate("!!document.querySelector('.r37-pbar')&&!!document.querySelector('.r37-comp .r37-cimg')&&document.querySelectorAll('.r37-hearts .r37-ic').length>=3"), f'{name}/question: progress bar, companion and SVG hearts')
            ev(pg, "r37Answer(r37P.qs[r37P.i].options.find(o=>o!==r37P.qs[r37P.i].answer))")
            pg.wait_for_timeout(450)
            view(pg, f'{name}/wrong feedback')
            C.ok(pg.evaluate("(()=>{const f=document.querySelector('.r37-fb.bad');if(!f)return false;const c=getComputedStyle(f).backgroundImage+getComputedStyle(f).backgroundColor;return !/179, 48, 74|b3304a/i.test(c)&&/正確答案是/.test(f.textContent)})()"), f'{name}: wrong answer is nebula purple with a soft sentence (R3.29 A-07: states the answer), not a red bar')
            for _ in range(40):
                s = ev(pg, "r37P?r37P.phase:'none'")
                if s == 'result':
                    break
                if s == 'learn':
                    ev(pg, "r37P.phase='quiz';render()")
                elif ev(pg, "!!r37P.fb"):
                    ev(pg, "r37Next()")
                else:
                    ev(pg, "r37Answer(r37P.qs[r37P.i].answer)")
                pg.wait_for_timeout(50)
            pg.wait_for_timeout(900)
            view(pg, f'{name}/result')
            rs = pg.evaluate("""()=>({badge:[...document.querySelectorAll('.r37-badge-win')].filter(i=>i.complete&&i.naturalWidth>0).length,btn:[...document.querySelectorAll('.r37-ra button b')].map(b=>b.textContent),
              detail:(document.querySelector('.r37-rdetail')||{}).textContent||''})""")
            C.ok(rs['badge'] == 1 and len(rs['btn']) >= 2 and all(rs['btn']) and '正確' in rs['detail'], f'{name}/result: trophy, labelled buttons and the detail row {rs}')
            ev(pg, "r37Exit()")
            pg.wait_for_timeout(300)
            # ---------------- legacy pages
            for k, hh in LEGACY.items():
                go(pg, '#kid', 150)
                go(pg, hh, 800)
                unlock_parent(pg)
                pg.wait_for_timeout(250)
                view(pg, f'{name}/{k}')
                C.ok(pg.evaluate("!!document.querySelector('.r37-nav')&&!!document.querySelector('.r37-bar')"), f'{name}/{k}: shell bar and nav present')
            # ---------------- maths dialogs
            for planet, key, sub, nm in [('math', 'normal', None, 'course home'), ('math', 'assessment', None, 'course check'), ('math', 'review', None, 'course review')]:
                open_dialog(pg, planet, key, sub)
                course = pg.evaluate("!!document.querySelector('dialog#wq-course-dialog[open]')")
                tag = f'{name}/{nm}'
                r, m = view(pg, tag, shadow=True, read=READ_COURSE if course else READ_WQM, tiny_ok=lambda t: t.get('sel') in ('input', 'a') or True and False)
                sh = pg.evaluate("""()=>{const d=document.querySelector('dialog[open]');const s=d&&d.querySelector('.r37-dshell');return {bar:!!(s&&s.querySelector('.r37-bar .r37-back2')),coin:!!(s&&s.querySelector('.r37-coin')),nav:!!(s&&s.querySelectorAll('.r37-nav a').length===6),
                  bg:d?getComputedStyle(d).backgroundImage.includes('bg_'):false}}""")
                C.ok(all(sh.values()), f'{tag}: galaxy shell bar + nav + nebula around the dialog {sh}')
                pg.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close())")
            C.ok(not [e for e in errs if 'favicon' not in e], f'{name}: no console errors {errs[:3]}')
            b.close()
    C.done()


run()

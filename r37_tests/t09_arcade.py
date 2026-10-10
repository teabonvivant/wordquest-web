"""R3.8 t09 - Arcade+ (r37_src/s35_arcade.*): star targets, records, combo, achievements, vocab power-up, lobby, real game launches.

    WQ33_APP=$PWD/app/index.html python3 r37_tests/t09_arcade.py

Business rules are checked through the host closure bridge (lib37.ev); games are launched and finished with real clicks.
Screenshots (lobby + result card, 390x844 and 1440x900) go to /tmp/arc_shots.
"""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t09')
SHOTS = Path('/tmp/arc_shots')
SHOTS.mkdir(exist_ok=True)

BOOST = "(()=>{const c=a28Child();for(const id of COIN28.ids)c.permissions[id]='open';c.batch.used=0;activeChild().stars=60;return save();})()"
RESET_STORE = "(()=>{delete r37Mem[r37Key()];try{localStorage.removeItem(r37Key());}catch(_){}const o=r37Get();delete o.arc;return Object.keys(WQArc.state()).length})()"
LEAVE = "(()=>{const c=a28Child();if(c.run)COIN28.close(c);pgPlaying=false;pgGame=null;a28Epoch++;pgFree=false;const r=0;for(const id of COIN28.ids)c.permissions[id]='open';c.batch.used=0;activeChild().stars=60;save();go('game');render();return 1;})()"


def wait_ev(pg, code, timeout=10000):
    pg.wait_for_function("(c)=>window.__r37(c)", arg=code, timeout=timeout)


def lobby(pg, wait=700):
    ev(pg, LEAVE)
    pg.wait_for_selector('[data-a28="filter"]', timeout=15000)
    pg.locator('[data-a28="filter"][data-filter="全部"]').click()
    pg.wait_for_timeout(wait)


def launch(pg, gid):
    """Real clicks: lobby card -> 看玩法 -> 用金幣開始 -> ready card."""
    lobby(pg)
    card = pg.locator(f'[data-cabinet="{gid}"]')
    card.scroll_into_view_if_needed()
    card.locator('[data-a28="intro"]').click()
    pg.locator('#pg-dialog [data-a28="buy"]').click()
    pg.wait_for_selector('#pg-canvas', timeout=10000)
    wait_ev(pg, f"pgMeta&&pgMeta.id==='{gid}'")
    pg.wait_for_selector('#pg-overlay .arx-pw', timeout=8000)


def press_play(pg):
    pg.locator('#pg-overlay [data-a28="play"]').click()
    wait_ev(pg, 'pgPlaying===true')


def finish_round(pg, score):
    """Set the final score the way the engine would have, then end the round through the host's own failure path."""
    ev(pg, f"(()=>{{pgGame.score={score};a28Fail('t09');return 1;}})()")
    pg.wait_for_selector('#pg-overlay .wq34-result', timeout=8000)
    pg.wait_for_timeout(250)


def pw_run(pg, wrong_at=None):
    """Drive the 3-question power-up quiz by real clicks. wrong_at = index of a question to answer wrongly."""
    pg.locator('#pg-overlay .arx-pw').click()
    pg.wait_for_selector('#arx-pw-dlg[open] .arx-opt')
    for i in range(3):
        q = ev(pg, 'JSON.stringify({a:WQArc._pw().qs[WQArc._pw().i].ans,o:WQArc._pw().qs[WQArc._pw().i].opts})')
        q = json.loads(q)
        pick = next(o for o in q['o'] if (o != q['a'])) if wrong_at == i else q['a']
        pg.locator('#arx-pw-dlg .arx-opt', has_text=pick).first.click()
        pg.wait_for_selector('#arx-pw-dlg .arx-fb')
        pg.locator('#arx-pw-dlg [data-arx="pw-next"]').click()
        pg.wait_for_timeout(120)
    pg.wait_for_selector('#arx-pw-dlg .arx-go[data-arx="pw-done"]')


def oracle(ach_plays, st, recs, combo, shields, cats):
    """Independent re-statement of the 14 badge conditions."""
    got = set()
    if sum(ach_plays.values()) >= 1:
        got.add('first')
    if len([k for k, v in ach_plays.items() if v > 0]) >= 5:
        got.add('g5')
    if any(v >= 3 for v in st.values()):
        got.add('s3')
    tot = sum(st.values())
    if tot >= 10:
        got.add('st10')
    if tot >= 30:
        got.add('st30')
    if recs >= 3:
        got.add('rec3')
    if combo >= 5:
        got.add('combo5')
    if shields >= 1:
        got.add('shield')
    for c in ['動作', '運動', '解謎', '策略', '創作']:
        if any(v >= 1 and cats[k] == c for k, v in st.items()):
            got.add('cat_' + c)
    if all(('cat_' + c) in got for c in ['動作', '運動', '解謎', '策略', '創作']):
        got.add('allcat')
    return got


def logic_suite(p):
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    pg.on('dialog', lambda d: d.accept())
    register(pg, 't09logic', '小明')
    ev(pg, BOOST)
    ids = ev(pg, 'WQArc.gameIds()')
    C.ok(len(ids) == 26, f'26 arcade games registered ({len(ids)})')
    # ---- star thresholds
    tg = {i: ev(pg, f"WQArc.targets('{i}')") for i in ids}
    C.ok(all(len(t) == 3 and 0 < t[0] < t[1] < t[2] for t in tg.values()), 'every game has 3 increasing positive targets')
    bad = []
    for i, t in tg.items():
        for sc, want in [(0, 0), (t[0] - 1, 0), (t[0], 1), (t[1] - 1, 1), (t[1], 2), (t[2] - 1, 2), (t[2], 3), (t[2] * 5, 3)]:
            if ev(pg, f"WQArc.starsFor('{i}',{sc})") != want:
                bad.append((i, sc, want))
    C.ok(not bad, f'starsFor(): exact thresholds for all 26 games {bad[:3]}')
    C.ok(ev(pg, "WQArc.targets('no-such-game').length") == 3, 'unknown ids fall back to category defaults')
    # ---- result -> stars, persistence, never decrease, per child
    ev(pg, RESET_STORE)
    gid = 'sky-rescue'
    t = tg[gid]
    r1 = ev(pg, f"WQArc.record('{gid}',{t[0] + 5},null,{{celebrate:false}})")
    C.ok(r1['stars'] == 1 and r1['best'] == 1 and r1['gained'] == 1 and r1['first'] and not r1['record'], f'first result gives star 1, first record not a "new record" {r1}')
    C.ok(r1['next'] == {'star': 2, 'target': t[1], 'need': t[1] - t[0] - 5}, f'next target computed {r1["next"]}')
    r2 = ev(pg, f"WQArc.record('{gid}',{t[2]},null,{{celebrate:false}})")
    C.ok(r2['stars'] == 3 and r2['best'] == 3 and r2['gained'] == 2 and r2['record'] and r2['prevBest'] == t[0] + 5 and r2['next'] is None, f'3-star result + record with previous best {r2}')
    r3 = ev(pg, f"WQArc.record('{gid}',{t[0]},null,{{celebrate:false}})")
    C.ok(r3['stars'] == 1 and r3['best'] == 3 and r3['gained'] == 0 and not r3['record'], f'worse result never lowers stars {r3}')
    C.ok(ev(pg, f"WQArc.state().st['{gid}']") == 3 and ev(pg, f"WQArc.state().best['{gid}']") == t[2], 'stored stars/best unchanged by a worse round')
    raw = ev(pg, "localStorage.getItem(r37Key())")
    C.ok(raw and json.loads(raw)['arc']['st'][gid] == 3, 'stars are written to localStorage (wq37-<account>-<child>.arc)')
    ev(pg, "delete r37Mem[r37Key()]")
    C.ok(ev(pg, f"WQArc.state().st['{gid}']") == 3, 'stars survive a reload of the store')
    other = ev(pg, "(()=>{const keep=db.activeChildId;db.children.push({id:'t09other',name:'B',grade:3,stars:0,createdAt:new Date().toISOString()});db.activeChildId='t09other';const s=JSON.stringify(WQArc.state().st);db.activeChildId=keep;db.children.pop();return s;})()")
    C.ok(other == '{}', f'stars are stored per child (second child sees none) {other}')
    # ---- record detection
    ev(pg, RESET_STORE)
    g = 'bounce-basket'
    run = "{base:0,rec:false,counted:false}"
    a = ev(pg, f"WQArc.record('{g}',9,{run},{{celebrate:false}})")
    C.ok(a['first'] and not a['record'] and ev(pg, 'WQArc.state().recs') == 0, 'first ever score is a first record, not a new record')
    b2 = ev(pg, f"WQArc.record('{g}',9,null,{{celebrate:false}})")
    C.ok(not b2['record'] and ev(pg, 'WQArc.state().recs') == 0, 'equal score is not a record')
    c2 = ev(pg, f"WQArc.record('{g}',12,null,{{celebrate:false}})")
    C.ok(c2['record'] and c2['prevBest'] == 9 and ev(pg, 'WQArc.state().recs') == 1 and ev(pg, f"WQArc.bestOf('{g}')") == 12, f'higher score is a record (prev best 9) {c2}')
    r = ev(pg, "(()=>{const run={base:12,rec:false,counted:false};WQArc.record('bounce-basket',14,run,{celebrate:false});WQArc.record('bounce-basket',16,run,{celebrate:false});return WQArc.state().recs;})()")
    C.ok(r == 2, f'two completions of one run count one record ({r})')
    pl = ev(pg, "WQArc.state().plays['bounce-basket']")
    C.ok(pl == 4, f'plays counted once per run ({pl})')
    # ---- combo counter logic
    cmb = ev(pg, """(()=>{const c=WQArc.newCombo(),o=[];let t=0;
      WQArc.feed(c,0,t,16);o.push(c.n);
      t+=100;WQArc.feed(c,10,t,16);o.push(c.n);          // 1
      t+=300;WQArc.feed(c,20,t,16);o.push(c.n);          // 2 (within window)
      t+=600;WQArc.feed(c,35,t,16);o.push(c.n);          // 3
      t+=3000;WQArc.feed(c,36,t,16);o.push(c.n);         // gap > window -> restart at 1
      t+=200;WQArc.feed(c,36,t,16);o.push(c.n);          // no change
      t+=100;WQArc.feed(c,20,t,16);o.push(c.n);          // score went down (undo): ignored
      t+=100;WQArc.feed(c,30,t,16);o.push(c.n);          // +10 after the dip -> 2
      return {seq:o,max:c.max};})()""")
    C.ok(cmb['seq'] == [0, 1, 2, 3, 1, 1, 1, 2] and cmb['max'] == 3, f'combo counts rapid score jumps, restarts after the window {cmb}')
    drip = ev(pg, "(()=>{const c=WQArc.newCombo();let s=0,t=0;for(let i=0;i<300;i++){s+=0.25;t+=16;WQArc.feed(c,s,t,16);}return c.max;})()")
    C.ok(drip == 0, f'slow drip scoring (distance/time) never makes a combo ({drip})')
    # ---- achievements unlock exactly at their conditions
    ev(pg, RESET_STORE)
    cats = ev(pg, "Object.fromEntries(WQArc.gameIds().map(i=>[i,a28Meta(i).category]))")
    C.ok(set(cats.values()) == {'動作', '創作', '運動', '策略', '解謎'} and ev(pg, 'WQArc.ACH.length') == 14, 'five categories, 14 achievements')
    plays, st, recs, combo = {}, {}, 0, 0
    seq = [('bounce-basket', 0, 0), ('sky-rescue', tg['sky-rescue'][0], 0), ('forest-pong', tg['forest-pong'][0], 0), ('honey-delivery', tg['honey-delivery'][0], 0),
           ('number-garden', tg['number-garden'][0], 0), ('sweet-studio', tg['sweet-studio'][0], 0), ('sky-rescue', tg['sky-rescue'][2], 0),
           ('forest-pong', tg['forest-pong'][1], 4), ('honey-delivery', tg['honey-delivery'][1], 5), ('number-garden', tg['number-garden'][2] + 1, 0),
           ('sky-rescue', tg['sky-rescue'][2], 0), ('forest-dash', tg['forest-dash'][2], 0), ('ruins-courier', tg['ruins-courier'][2], 0),
           ('cloud-island', tg['cloud-island'][2], 0), ('star-patrol', tg['star-patrol'][2], 0), ('lighthouse-well', tg['lighthouse-well'][2], 0),
           ('drift-path', tg['drift-path'][2], 0), ('moon-bells', tg['moon-bells'][2], 0), ('valley-race', tg['valley-race'][2], 0)]
    mism, fin = [], None
    for k, (gid, sc, cb) in enumerate(seq):
        best_before = ev(pg, f"WQArc.bestOf('{gid}')")
        if best_before and sc > best_before:
            recs += 1
        ev(pg, f"WQArc.record('{gid}',{sc},null,{{combo:{cb},celebrate:false}})")
        plays[gid] = plays.get(gid, 0) + 1
        st[gid] = max(st.get(gid, 0), ev(pg, f"WQArc.starsFor('{gid}',{sc})"))
        combo = max(combo, cb)
        want = oracle(plays, st, recs, combo, 0, cats)
        have = set(ev(pg, "Object.keys(WQArc.state().ach)"))
        if want != have:
            mism.append((k, gid, sorted(want ^ have)))
    C.ok(not mism, f'achievements unlock exactly when the conditions are met (19 steps) {mism[:3]}')
    have = set(ev(pg, "Object.keys(WQArc.state().ach)"))
    C.ok({'first', 'g5', 's3', 'st10', 'rec3', 'combo5', 'cat_動作', 'cat_運動', 'cat_解謎', 'cat_策略', 'cat_創作', 'allcat'} <= have and 'shield' not in have, f'expected badges earned, shield not before the power-up {sorted(have)}')
    st_total = ev(pg, 'WQArc.totalStars()')
    C.ok(('st30' in have) == (st_total >= 30), f'30-star badge matches total stars ({st_total})')
    # more full-star games to reach exactly 30 total stars
    more = [i for i in ids if st.get(i, 0) < 3]
    for gid in more:
        if ev(pg, 'WQArc.totalStars()') >= 30:
            break
        ev(pg, f"WQArc.record('{gid}',{tg[gid][2]},null,{{celebrate:false}})")
    C.ok(ev(pg, 'WQArc.totalStars()') >= 30 and ev(pg, "!!WQArc.state().ach.st30"), '30-star badge unlocks once total >= 30')
    ach_no_dup = ev(pg, "Object.keys(WQArc.state().ach).length")
    ev(pg, f"WQArc.record('sky-rescue',1,null,{{celebrate:false}})")
    C.ok(ev(pg, "Object.keys(WQArc.state().ach).length") == ach_no_dup, 'badges are never re-awarded or lost')
    C.ok(not errs, f'logic: no console errors {errs[:3]}')
    b.close()


def flow_suite(p, w, h, touch, tag):
    b, ctx, pg, errs = open_page(p, w, h, touch)
    pg.on('dialog', lambda d: d.accept())
    register(pg, 't09' + tag, '小明')
    ev(pg, BOOST)
    ev(pg, RESET_STORE)
    # ---- lobby: star rows for all 26 games, best chip, reskin, achievements button
    go(pg, '#game', 900)
    pg.locator('[data-a28="filter"][data-filter="全部"]').click()
    pg.wait_for_timeout(900)
    rows = pg.evaluate("[...document.querySelectorAll('[data-cabinet]')].map(c=>({id:c.dataset.cabinet,stars:c.querySelectorAll('.arx-stars i').length,chip:!!c.querySelector('.arx-best'),tg:!!c.querySelector('.arx-tg')}))")
    C.ok(len(rows) == 26 and all(r['stars'] == 3 and r['chip'] and r['tg'] for r in rows), f'{tag}: lobby shows a 3-star row + best chip on all 26 cards ({len(rows)})')
    C.ok(len({r['id'] for r in rows}) == 26, f'{tag}: 26 distinct games')
    col = pg.evaluate("""()=>{const c=s=>{const e=document.querySelector(s);return e?getComputedStyle(e).color:''};const bg=e=>getComputedStyle(document.querySelector(e)).backgroundColor;
      return {h1:c('.p30-lobby>h1'),sec:c('.p30-sec h2'),card:bg('.p30-card')}}""")
    C.ok(col['h1'] == 'rgb(255, 255, 255)' and col['sec'] == 'rgb(255, 255, 255)', f'{tag}: lobby title and section heading are white on the dark planet {col}')
    C.ok(col['card'] == 'rgb(255, 255, 255)', f'{tag}: cards stay white')
    C.ok(pg.evaluate("!!document.querySelector('.r37-leg[data-pl=games] .arx-bar [data-arx=ach]')"), f'{tag}: achievements button in the lobby header')
    sizes = pg.evaluate("[...document.querySelectorAll('.arx-btn,.arx-chip')].map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]})")
    C.ok(all(wd >= 44 and ht >= 44 for wd, ht in sizes), f'{tag}: lobby controls >= 44px {sizes}')
    btns = pg.evaluate("[...document.querySelectorAll('[data-a28=filter],[data-a28=intro]')].filter(e=>e.getBoundingClientRect().width>0).every(e=>e.getBoundingClientRect().height>=44)")
    C.ok(btns, f'{tag}: existing lobby buttons keep >= 44px and still exist')
    pg.screenshot(path=str(SHOTS / f'lobby_{w}x{h}.png'))
    # achievements panel by keyboard
    pg.locator('.arx-btn').focus()
    pg.keyboard.press('Enter')
    pg.wait_for_selector('#arx-ach-dlg[open] .arx-ach')
    C.ok(pg.evaluate("document.querySelectorAll('#arx-ach-dlg .arx-ach').length") == 14 and pg.evaluate("document.querySelectorAll('#arx-ach-dlg .arx-ach.on').length") == 0, f'{tag}: panel lists 14 badges, none unlocked yet')
    pg.screenshot(path=str(SHOTS / f'achievements_{w}x{h}.png'))
    pg.keyboard.press('Escape')
    pg.wait_for_timeout(200)
    C.ok(pg.evaluate("!document.querySelector('#arx-ach-dlg[open]')"), f'{tag}: Escape closes the achievements panel')
    # existing lobby actions still work: intro dialog opens and closes, shows the star row
    pg.locator('[data-cabinet="bounce-basket"]').scroll_into_view_if_needed()
    pg.locator('[data-cabinet="bounce-basket"] [data-a28="intro"]').click()
    pg.wait_for_selector('#pg-dialog[open] .arx-row')
    C.ok(True, f'{tag}: 看玩法 dialog still opens (with the star targets)')
    pg.locator('#pg-dialog [data-a28="close"]').click()
    pg.wait_for_timeout(250)

    # ---- game 1: real launch, power-up answered wrongly, then play and finish (first record)
    launch(pg, 'bounce-basket')
    C.ok(pg.evaluate("(()=>{const c=document.querySelector('#pg-overlay .a28-overlaycard');return c.scrollHeight<=c.clientHeight+1&&c.getBoundingClientRect().bottom<=(document.querySelector('.a28-viewport').getBoundingClientRect().bottom+1)})()"), f'{tag}: ready card still fits (no inner scrolling)')
    pw = pg.evaluate("(()=>{const e=document.querySelector('#pg-overlay .arx-pw').getBoundingClientRect();return [e.width,e.height]})()")
    C.ok(pw[0] >= 44 and pw[1] >= 44, f'{tag}: power-up button >= 44px {pw}')
    C.ok(pg.evaluate("document.querySelectorAll('#pg-overlay .arx-row .arx-stars i').length") == 3, f'{tag}: ready card shows the star row')
    pg.locator('#pg-overlay .arx-pw').focus()
    pg.keyboard.press('Enter')
    pg.wait_for_selector('#arx-pw-dlg[open] .arx-opt')
    C.ok(pg.evaluate("document.querySelectorAll('#arx-pw-dlg .arx-opt').length") == 3, f'{tag}: quiz is 3-option multiple choice')
    sz = pg.evaluate("[...document.querySelectorAll('#arx-pw-dlg button')].map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height]})")
    C.ok(all(wd >= 44 and ht >= 44 for wd, ht in sz), f'{tag}: quiz controls >= 44px')
    pg.locator('#arx-pw-dlg [data-arx="pw-skip"]').click()
    pg.wait_for_timeout(200)
    C.ok(pg.evaluate("!document.querySelector('#arx-pw-dlg[open]')") and ev(pg, 'WQArc._pwState()') is None, f'{tag}: power-up is skippable (nothing granted, can reopen)')
    pw_run(pg, wrong_at=1)
    pg.locator('#arx-pw-dlg [data-arx="pw-done"]').click()
    st1 = ev(pg, 'WQArc._pwState()')
    C.ok(st1 and st1['tried'] and not st1['shield'] and st1['ok'] == 2, f'{tag}: 2/3 grants no shield {st1}')
    C.ok(ev(pg, "!!WQArc.state().ach.shield") is False and pg.evaluate("!document.querySelector('.arx-shield:not([hidden])')"), f'{tag}: no shield badge or achievement after 2/3')
    press_play(pg)
    C.ok(pg.evaluate("document.querySelector('#pg-overlay').hidden===true"), f'{tag}: game starts after a failed quiz (never blocked)')
    # ---- live combo in a real running game: three quick score jumps
    c0 = ev(pg, "(WQArc._combo()||{max:0}).max")
    for k in range(3):
        ev(pg, "(()=>{pgGame.score+=3;return pgGame.score;})()")
        pg.wait_for_timeout(120)
    pg.wait_for_timeout(120)
    vis = pg.evaluate("(()=>{const e=document.querySelector('.a28-viewport>.arx-combo');return e?{hidden:e.hidden,text:e.textContent,pe:getComputedStyle(e).pointerEvents,ah:e.getAttribute('aria-hidden')}:null})()")
    C.ok(vis and not vis['hidden'] and '×3' in vis['text'] and vis['pe'] == 'none' and vis['ah'] == 'true', f'{tag}: combo badge shows x3 over the viewport, pointer-events none {vis}')
    keys = ev(pg, "Object.keys(pgGame).join(',')")
    C.ok('combo' not in keys.split(',') and 'arx' not in keys, f'{tag}: game object untouched (no new own keys)')
    pg.wait_for_timeout(2100)
    C.ok(pg.evaluate("document.querySelector('.a28-viewport>.arx-combo').hidden"), f'{tag}: combo badge resets after the window')
    C.ok(ev(pg, "WQArc._combo().max") == 3 and c0 == 0, f'{tag}: combo max recorded ({ev(pg, "WQArc._combo().max")})')
    anim = pg.evaluate("document.querySelector('.a28-viewport>.arx-combo').classList.contains('hit')")
    C.ok(not anim, f'{tag}: reduced motion -> no combo animation class')
    # finish: score 7 (>= star 1 target 6), first record
    finish_round(pg, 7)
    C.ok(pg.evaluate("(()=>{const c=document.querySelector('#pg-overlay .a28-overlaycard');return c.scrollHeight<=c.clientHeight+1&&c.getBoundingClientRect().bottom<=(document.querySelector('.a28-viewport').getBoundingClientRect().bottom+1)})()"), f'{tag}: result card still fits (no inner scrolling)')
    res = pg.evaluate("(()=>{const r=document.querySelector('#pg-overlay .arx-res');return r?{txt:r.innerText,stars:r.dataset.arxStars,rec:r.dataset.arxRec}:null})()")
    C.ok(res and res['stars'] == '1' and res['rec'] == '0' and '首次紀錄' in res['txt'] and '連擊 ×3' in res['txt'], f'{tag}: result card: 1 star, first record, combo shown {res}')
    C.ok(ev(pg, "WQArc.state().st['bounce-basket']") == 1 and ev(pg, "WQArc.state().plays['bounce-basket']") == 1, f'{tag}: stars saved after a real round')
    C.ok(ev(pg, "!!WQArc.state().ach.first") and ev(pg, "!!WQArc.state().ach['cat_運動']"), f'{tag}: first-game and category badges unlocked by the real round')
    C.ok(pg.evaluate("document.querySelectorAll('.arx-toast').length") >= 1, f'{tag}: unlock toast shown')
    # ---- game 1 again: higher score -> new record fanfare with previous best
    pg.locator('#pg-overlay [data-a28="buy"]').click()
    pg.wait_for_selector('#pg-overlay .arx-pw', timeout=8000)
    pg.wait_for_timeout(300)
    press_play(pg)
    finish_round(pg, 13)
    res = pg.evaluate("(()=>{const r=document.querySelector('#pg-overlay .arx-res');return r?{txt:r.innerText,stars:r.dataset.arxStars,rec:r.dataset.arxRec,legacy:[...document.querySelectorAll('#pg-overlay .wq34-new')].every(e=>getComputedStyle(e).display==='none')}:null})()")
    C.ok(res and res['rec'] == '1' and '新紀錄' in res['txt'] and '上次最佳 7' in res['txt'] and res['stars'] == '2', f'{tag}: new record banner with previous best 7, now 2 stars {res}')
    C.ok(res and res['legacy'] and pg.evaluate("document.querySelectorAll('#pg-overlay .arx-rec').length") == 1, f'{tag}: single record banner')
    C.ok(ev(pg, "WQArc.state().recs") == 1 and ev(pg, "WQArc.state().best['bounce-basket']") == 13, f'{tag}: record counted once')
    pg.screenshot(path=str(SHOTS / f'result_{w}x{h}.png'))
    # lower score on a third run: no record, stars stay
    pg.locator('#pg-overlay [data-a28="buy"]').click()
    pg.wait_for_selector('#pg-overlay .arx-pw', timeout=8000)
    pg.wait_for_timeout(300)
    press_play(pg)
    finish_round(pg, 3)
    C.ok(pg.evaluate("document.querySelector('#pg-overlay .arx-res').dataset.arxStars") == '2' and ev(pg, "WQArc.state().st['bounce-basket']") == 2 and pg.evaluate("document.querySelectorAll('#pg-overlay .arx-rec').length") == 0, f'{tag}: a worse round shows no record and keeps 2 stars')

    # ---- game 2: power-up 3/3 with a missing life -> shield + life
    launch(pg, 'meadow-cricket')
    ev(pg, "(()=>{const r=a28Run();r.lives=2;pgCheckpoint();return r.lives;})()")
    pw_run(pg)
    pg.locator('#arx-pw-dlg [data-arx="pw-done"]').click()
    st2 = ev(pg, 'WQArc._pwState()')
    C.ok(st2 and st2['shield'] and st2['life'] and st2['ok'] == 3, f'{tag}: 3/3 grants shield and +1 life when the game has room {st2}')
    C.ok(ev(pg, 'a28Run().lives') == 3, f'{tag}: lives 2 -> 3 in the run state')
    C.ok(ev(pg, "!!WQArc.state().ach.shield"), f'{tag}: shield badge unlocked at 3/3')
    press_play(pg)
    C.ok(pg.evaluate("(()=>{const e=document.querySelector('.a28-viewport>.arx-shield');return !!e&&!e.hidden})()"), f'{tag}: shield badge visible in the viewport while playing')
    # ---- game 3: 3/3 at full lives -> shield but no extra life (schema max is 3)
    launch(pg, 'forest-pong')
    lives0 = ev(pg, 'a28Run().lives')
    pw_run(pg)
    pg.locator('#arx-pw-dlg [data-arx="pw-done"]').click()
    st3 = ev(pg, 'WQArc._pwState()')
    C.ok(st3 and st3['shield'] and not st3['life'] and ev(pg, 'a28Run().lives') == lives0 == 3, f'{tag}: full lives -> shield only, lives stay {lives0} {st3}')
    C.ok(pg.evaluate("!!document.querySelector('#pg-overlay .arx-pwstat')") and pg.evaluate("!document.querySelector('#pg-overlay .arx-pw')"), f'{tag}: status line replaces the button after the quiz')
    # reduced motion: no confetti
    cf0 = ev(pg, 'r37Fx.st.confetti')
    ev(pg, "WQArc.record('sky-rescue',99999,null)")
    C.ok(ev(pg, 'r37Fx.st.confetti') == cf0, f'{tag}: reduced motion -> no confetti on a new star')
    pg.emulate_media(reduced_motion='no-preference')
    ev(pg, RESET_STORE)
    ev(pg, "WQArc.record('sky-rescue',99999,null)")
    pg.wait_for_timeout(200)
    C.ok(ev(pg, 'r37Fx.st.confetti') > cf0, f'{tag}: normal motion -> confetti on a new star')
    C.ok(not errs, f'{tag}: no console/page errors {errs[:3]}')
    b.close()


with sync_playwright() as p:
    logic_suite(p)
    flow_suite(p, 390, 844, True, 'phone')
    flow_suite(p, 1440, 900, False, 'desktop')
C.done()

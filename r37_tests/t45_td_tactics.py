"""t45 - 字母砲台 R3.28 tactics layer: star energy, lane helpers (wall / ice / mine), rescue ships, monster kinds (fast / armour / listen), waves.
Run: python3 r37_tests/t45_td_tactics.py   (deterministic: G._step / G._cmd, seeded queues). Screenshots -> r37_evidence/r328/td/."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'gx_fixture'))
from lib import open_game, sync_playwright, R  # noqa: E402
sys.path.insert(0, str(Path(__file__).parent))
from t41_td import AP, ok, FAILS, N, fresh, dismiss_card, play, dbg  # noqa: E402

EVID = R / 'r37_evidence' / 'r328' / 'td'


def first(pg):
    return next(e for e in dbg(pg)['enemies'] if e['state'] == 'walk')


def spawn(pg, kind=None, steps=60):
    """spawn one monster (optionally of a forced kind), select it, and return its fresh state (natural spawns may happen meanwhile)"""
    uid = pg.evaluate("(a)=>{if(a[0]!==null)G._cmd('kind',a[0]);G._cmd('spawn');const d=G._debug;const u=d.enemies[d.enemies.length-1].uid;G._cmd('select',u);G._step(a[1]);G._cmd('select',u);return u}", [kind, steps])
    return next(e for e in dbg(pg)['enemies'] if e['uid'] == uid)


def logic_tests(p):
    b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'english', 0, 1, 2, manual=True, seed=7); pg.evaluate(AP)
    F = lambda s, d, m=False, c=False: pg.evaluate("(a)=>WQ37TD.feat(a[0],a[1],a[2],a[3])", [s, d, m, c])
    f0, f1, f3, f5, f6 = F(0, 2), F(1, 2), F(3, 2), F(5, 2), F(6, 2)
    ok(not f0['energy'] and f0['waves'] == 1 and not f0['helpers'], 'level 1 (s0) is the plain tutorial: no energy, no helpers, one wave')
    ok(f1['energy'] and f1['helpers'] == ['wall'] and f1['guard'] and not f1['fast'], f's1 unlocks energy + 星盾牆 + rescue ships ({f1})')
    ok(f3['helpers'] == ['wall', 'ice'] and f3['fast'] and f3['waves'] == 2 and not f3['armor'], f's3: + 冰晶塔, fast monsters, 2 waves ({f3})')
    ok(f5['helpers'] == ['wall', 'ice', 'mine'] and f5['armor'] and f5['waves'] == 3 and not f5['listen'], f's5: + 星爆雷, armour, 3 waves ({f5})')
    ok(f6['listen'] and not F(6, 2, True)['listen'], 's6: listen monsters for English only')
    ok(F(2, 4)['armor'] is False and F(3, 4)['armor'] and F(0, 4)['energy'], 'difficulty 4-5 unlocks everything one level earlier')
    ok(not F(9, 5, False, True)['energy'] and F(9, 5, False, True)['waves'] == 1, 'classic option switches the layer off')

    # energy + placing
    fresh(pg, 'english', 0, 3, 2); d = dbg(pg); ok(d['energy'] == 2 and d['tray'] is not None, f'start with 2 star energy and the tray shown ({d["energy"]})')
    spawn(pg, ''); pg.evaluate("()=>{G._cmd('solve');G._step(40)}"); ok(dbg(pg)['energy'] == 4, f'first-try kill gives +2 energy ({dbg(pg)["energy"]})')
    fresh(pg, 'english', 0, 3, 3); pg.evaluate("()=>G._cmd('energy',4)")
    for _ in range(6):
        e = spawn(pg, '')
        if not e['id'].startswith(('rv', 'fl')): break
        pg.evaluate("()=>{G._cmd('solve');G._step(40);G._cmd('energy',4)}")
    pg.evaluate("()=>{G._cmd('hint');G._cmd('solve');G._step(40)}")
    ok(dbg(pg)['energy'] == 5, f'assisted kill gives +1 ({dbg(pg)["energy"]})')
    pg.evaluate("()=>G._cmd('energy',4)"); e = spawn(pg, '')
    if e['id'].startswith(('rv', 'fl')): pg.evaluate("()=>{G._cmd('solve');G._step(40)}"); ok(dbg(pg)['energy'] == 4, 'review/filler monsters give no energy (no farming)')
    pg.evaluate("()=>G._cmd('energy',8)"); e = spawn(pg, ''); pg.evaluate("()=>{G._cmd('solve');G._step(40)}"); ok(dbg(pg)['energy'] == 9, 'energy is capped at 9')
    e = spawn(pg, ''); r = pg.evaluate("()=>G._cmd('place','wall')"); d = dbg(pg)
    ok(r and d['energy'] == 7 and any(h['k'] == 'wall' and h['lane'] == e['lane'] for h in d['helpers']), 'wall costs 2 and lands on the selected monster\'s lane')
    ok(not pg.evaluate("()=>G._cmd('place','wall')") and 'dup:wall' in dbg(pg)['events'], 'second wall on the same lane is refused')
    pg.evaluate("()=>G._cmd('energy',1)"); ok(not pg.evaluate("()=>G._cmd('place','ice')") and 'poor:ice' in dbg(pg)['events'] and dbg(pg)['energy'] == 1, 'not enough energy: refused, energy unchanged')
    ok(not pg.evaluate("()=>G._cmd('place','mine')"), 'locked helper (mine at s3) cannot be placed')

    # wall blocks then breaks
    fresh(pg, 'english', 0, 3, 2); e = spawn(pg, '', 2); pg.evaluate("(l)=>G._cmd('place',{k:'wall',lane:l})", e['lane'])
    for _ in range(80):
        pg.evaluate("()=>G._step(30)"); m = next(x for x in dbg(pg)['enemies'] if x['uid'] == e['uid'])
        if m['blocked']: break
    w = dbg(pg)['helpers'][0]; ok(m['blocked'] and m['xn'] > w['xn'] and m['state'] == 'walk', f'monster stops at the wall ({m["xn"]} vs wall {w["xn"]})')
    pg.evaluate("()=>G._step(120)"); x1 = next(x for x in dbg(pg)['enemies'] if x['uid'] == e['uid'])['xn']; hp = dbg(pg)['helpers'][0]['hp']
    ok(abs(x1 - m['xn']) < 0.005 and hp < 6, f'blocked monster does not advance while the wall loses hp ({hp})')
    pg.evaluate("()=>G._step(300)"); d = dbg(pg); ok(not d['helpers'] and 'break:wall:%d' % e['lane'] in d['events'], 'wall breaks after ~6 s of chewing')
    pg.evaluate("()=>G._step(30)"); ok(next(x for x in dbg(pg)['enemies'] if x['uid'] == e['uid'])['xn'] < x1, 'monster walks on after the wall breaks')

    # ice halves the lane speed
    fresh(pg, 'english', 0, 3, 2); pg.evaluate("()=>{G._cmd('peek',0);G._cmd('peek',1)}"); d = dbg(pg); a, c = d['enemies'][0], d['enemies'][1]
    pg.evaluate("(l)=>{G._cmd('energy',9);G._cmd('place',{k:'ice',lane:l})}", a['lane']); pg.evaluate("()=>G._step(120)")
    d = dbg(pg); a2 = next(x for x in d['enemies'] if x['uid'] == a['uid']); c2 = next(x for x in d['enemies'] if x['uid'] == c['uid'])
    ra = (a['xn'] - a2['xn']); rc = (c['xn'] - c2['xn'])
    ok(rc > 0 and 0.4 < (ra / rc) < 0.62, f'ice lane moves at about half speed ({ra:.3f} vs {rc:.3f})')
    pg.evaluate("()=>{for(let i=0;i<130;i++){G._step(10);const d=G._debug;const t=d.enemies.find(e=>e.state==='walk'&&e.xn<.3);if(t){G._cmd('select',t.uid);G._cmd('solve')}}}"); ok(not any(h['k'] == 'ice' for h in dbg(pg)['helpers']), 'ice tower melts after 20 s')

    # mine pushes back and stuns
    fresh(pg, 'english', 0, 5, 2); e = spawn(pg, '', 2); pg.evaluate("(l)=>{G._cmd('energy',9);G._cmd('place',{k:'mine',lane:l})}", e['lane'])
    for _ in range(120):
        pg.evaluate("()=>G._step(10)")
        if any(ev.startswith('boom:') for ev in dbg(pg)['events']): break
    m = next(x for x in dbg(pg)['enemies'] if x['uid'] == e['uid'])
    ok(m['xn'] > 0.68 and m['stun'] > 0 and m['state'] == 'walk' and not dbg(pg)['helpers'], f'mine: blast pushes the monster back and stuns it, never kills it ({m["xn"]}, stun {m["stun"]})')

    # rescue ship
    fresh(pg, 'english', 0, 3, 2); e = spawn(pg, ''); h0 = dbg(pg)['hearts']; pg.evaluate("()=>{G._cmd('timeout');G._step(2)}"); d = dbg(pg)
    ok(d['hearts'] == h0 and not d['guards'][e['lane']] and d['ui']['learn'], 'first monster to reach the base on a lane: rescue ship saves the heart, learning card still shows')
    dismiss_card(pg); pg.evaluate("()=>G._step(30)")
    lane = e['lane']
    for _ in range(12):
        e2 = spawn(pg, '')
        if e2['lane'] == lane: break
        pg.evaluate("(u)=>{G._cmd('select',u);G._cmd('solve');G._step(40)}", e2['uid'])
    if e2['lane'] == lane:
        pg.evaluate("(u)=>{G._cmd('select',u);G._cmd('timeout');G._step(2)}", e2['uid']); ok(dbg(pg)['hearts'] == h0 - 1, 'second time on the same lane costs a heart')
    else: ok(False, 'could not spawn a monster on the same lane again')

    # fast
    fresh(pg, 'english', 0, 3, 2); n = spawn(pg, '', 2); f = spawn(pg, 'fast', 2)
    ok(f['kind'] == 'fast' and 'newkind:fast' in dbg(pg)['events'], 'fast monster spawns with its first-time banner')
    pg.evaluate("()=>G._step(90)"); d = dbg(pg); n2 = next(x for x in d['enemies'] if x['uid'] == n['uid']); f2 = next(x for x in d['enemies'] if x['uid'] == f['uid'])
    ok((f['xn'] - f2['xn']) > 1.35 * (n['xn'] - n2['xn']), f'fast monster walks clearly faster ({f["xn"] - f2["xn"]:.3f} vs {n["xn"] - n2["xn"]:.3f})')

    # English armour: spell twice, second time from the sound only, counted once
    fresh(pg, 'english', 0, 5, 2); a = spawn(pg, 'armor'); pg.evaluate("(u)=>G._cmd('select',u)", a['uid'])
    ok(a['kind'] == 'armor' and a['armor'] == 1, 'armour monster spawns with a helmet')
    pg.evaluate("()=>G._cmd('solve')"); m = next(x for x in dbg(pg)['enemies'] if x['uid'] == a['uid']); q = pg.evaluate("()=>G._cmd('qview')")
    ok(m['state'] == 'walk' and m['armor'] == 0 and m['hear'] and m['typed'] == '' and m['pre'] == 0, 'first spelling breaks the helmet; the same word must be spelled again, no letter given')
    ok(not q['pic'] and '聽讀音' in q['txt'] and q['pulse'], f'second spelling hides picture and Chinese, speaker pulses ({q})')
    tries = pg.evaluate("(id)=>G._S.learn.stats[id].tries", a['id']); ok(tries == 0, 'helmet break is not counted as an answer')
    pg.evaluate("()=>{G._cmd('solve');G._step(40)}"); d = dbg(pg)
    ok(not any(x['uid'] == a['uid'] and x['state'] == 'walk' for x in d['enemies']) and pg.evaluate("(id)=>G._S.learn.stats[id].tries", a['id']) == 1, 'second spelling defeats it, recorded as one answer')

    # math armour = two questions
    fresh(pg, 'math', 1, 5, 2); a = spawn(pg, 'armor'); pg.evaluate("(u)=>G._cmd('select',u)", a['uid'])
    ok(a['kind'] == 'armor' and a['items'] == 2, 'math armour carries two questions')
    pg.evaluate("()=>G._cmd('solve')"); m = next(x for x in dbg(pg)['enemies'] if x['uid'] == a['uid'])
    ok(m['state'] == 'walk' and m['phase'] == 1, 'math armour: first answer breaks the helmet, a second question appears')
    pg.evaluate("()=>{G._cmd('solve');G._step(40)}"); ok(not any(x['uid'] == a['uid'] and x['state'] == 'walk' for x in dbg(pg)['enemies']), 'second answer defeats it')

    # listen
    fresh(pg, 'english', 0, 6, 2); L = spawn(pg, 'listen'); pg.evaluate("(u)=>G._cmd('select',u)", L['uid']); q = pg.evaluate("()=>G._cmd('qview')")
    ok(L['hear'] and not q['pic'] and q['txt'].strip() == '聽讀音，拼出來' and q['tag'].startswith('聽音'), f'listen monster: only sound, no picture / Chinese ({q})')
    m = next(x for x in dbg(pg)['enemies'] if x['uid'] == L['uid']); wrong = next(ch for ch in 'zqxjvkw' if ch != m['answer'][m['typed'].__len__()].lower())
    pg.evaluate("(k)=>G._cmd('key',k)", wrong); q = pg.evaluate("()=>G._cmd('qview')")
    ok(q['pic'] and '聽讀音' not in q['txt'] and len(q['txt']) > 0, f'first slip reveals the Chinese meaning ({q["txt"]})')
    ok(pg.evaluate("()=>G._cmd('kind','listen')") and pg.evaluate("()=>{G._cmd('spawn');return true}"), 'spawn ok')

    # waves
    fresh(pg, 'english', 0, 2, 2); res = pg.evaluate("()=>AP({})"); d = dbg(pg)
    ok(res == 'ended' and 'waveclear:1' in d['events'] and 'wave:1' in d['events'], f'2-wave level: wave 1 clears, break, final wave, level ends ({res})')
    i1 = d['events'].index('waveclear:1'); i2 = d['events'].index('wave:1'); ok(not any(ev.startswith('spawn:') for ev in d['events'][i1:i2]), 'no monster spawns during the break between waves')
    fresh(pg, 'english', 0, 5, 2); res = pg.evaluate("()=>AP({})"); d = dbg(pg)
    ok(res == 'ended' and 'waveclear:2' in d['events'] and 'wave:2' in d['events'], '3-wave level reaches the final wave')

    # whole levels still end and clear, all ten levels, both subjects
    for subj, w in (('english', 0), ('english', 3), ('math', 2)):
        bad = []
        for s in range(10):
            fresh(pg, subj, w, s, 3); cards = play(pg)
            r = pg.evaluate("()=>window.RESULT");
            if not (r and r['cleared']): bad.append((s, cards, dbg(pg)['state']))
        ok(not bad, f'{subj} world {w}: all 10 levels can be cleared with the new layer ({bad})')
    ok(not errs, f'no console errors ({errs[:3]})'); b.close()


def keyboard_tests(p):
    b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'english', 0, 5, 2, manual=True, seed=7, touch=False, size=(1440, 900)); pg.evaluate(AP)
    fresh(pg, 'english', 0, 5, 2); spawn(pg, ''); pg.evaluate("()=>G._cmd('energy',9)")
    pg.keyboard.press('1'); pg.keyboard.press('2'); pg.keyboard.press('3'); d = dbg(pg)
    ok(sorted(h['k'] for h in d['helpers']) == ['ice', 'mine', 'wall'] and d['energy'] == 1, f'keys 1/2/3 place the three helpers ({d["helpers"]})')
    fresh(pg, 'math', 1, 5, 2); spawn(pg, ''); pg.evaluate("()=>G._cmd('energy',9)")
    pg.keyboard.press('Shift+1'); ok([h['k'] for h in dbg(pg)['helpers']] == ['wall'], 'math: Shift+1 places a wall')
    pg.keyboard.press('2'); ok([h['k'] for h in dbg(pg)['helpers']] == ['wall'], 'math: a plain digit is an answer key, not a helper key')
    ok(not errs, f'no console errors ({errs[:3]})'); b.close()


def layout_tests(p):
    EVID.mkdir(parents=True, exist_ok=True)
    for (W, H, touch) in ((360, 640, True), (390, 844, True), (844, 390, True), (1024, 600, False), (1440, 900, False)):
        for subj in ('english', 'math'):
            b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', subj, 1 if subj == 'math' else 0, 6, 2, manual=True, seed=7, touch=touch, size=(W, H), reduced=False); pg.evaluate(AP)
            pg.wait_for_timeout(500); pg.evaluate("()=>{G._S.ui.closeAll();G._cmd('begin')}")
            pg.evaluate("()=>{G._cmd('energy',9);G._cmd('kind','armor');G._cmd('spawn');G._step(80);G._cmd('kind','" + ('listen' if subj == 'english' else 'fast') + "');G._cmd('spawn');G._step(80);G._cmd('spawn');G._step(60)}")
            pg.evaluate("()=>{const d=G._debug;const ls=[...new Set(d.enemies.map(e=>e.lane))];G._cmd('place',{k:'wall',lane:ls[0]});G._cmd('place',{k:'ice',lane:ls[1]!=null?ls[1]:0});G._cmd('place',{k:'mine',lane:ls[2]!=null?ls[2]:2});G._step(20)}")
            pg.evaluate("()=>{const d=G._debug;const t=d.enemies.find(e=>e.kind==='armor');if(t){G._cmd('select',t.uid)}G._step(4)}")
            pg.wait_for_timeout(400)
            m = pg.evaluate("""()=>{const r=s=>{const e=document.querySelector(s);return e?e.getBoundingClientRect().toJSON():null};const bs=[...document.querySelectorAll('.td-hp')].map(b=>b.getBoundingClientRect().toJSON());
              const pad=document.querySelector('.gx-pad');const pv=pad&&getComputedStyle(pad).display!=='none'&&pad.offsetHeight>0;return {tray:r('.td-tray'),q:r('.td-q'),pad:pv?r('.gx-pad'):null,hud:r('.td-hud'),bs,lay:G._debug.layout,lt:G._debug.layout}}""")
            t = m['tray']; tag = f'{subj} {W}x{H}'
            ok(t and t['left'] >= 0 and t['top'] >= m['q']['bottom'] - 1 and t['bottom'] <= H + .5, f'{tag}: tray inside the screen below the question bar ({t})')
            ok(not m['pad'] or t['bottom'] <= m['pad']['top'] + 1, f'{tag}: tray does not overlap the keypad')
            ok(m['bs'] and all(x['width'] >= 44 and x['height'] >= 44 for x in m['bs']) and all(x['bottom'] <= t['bottom'] + 1 for x in m['bs']), f'{tag}: helper buttons ≥44 px and inside the tray ({[(round(x["width"]), round(x["height"])) for x in m["bs"]]})')
            pg.screenshot(path=str(EVID / f'{subj}_{W}x{H}.png'))
            ok(not errs, f'{tag}: no console errors ({errs[:3]})'); b.close()


def main():
    with sync_playwright() as p:
        logic_tests(p); keyboard_tests(p); layout_tests(p)
    print(f't45: {N[0] - len(FAILS)}/{N[0]} passed'); [print('FAIL', f) for f in FAILS]
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    main()

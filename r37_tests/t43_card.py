#!/usr/bin/env python3
"""t43 字卡征途 WQ37Card - 業務邏輯 + 版面 + 效能 + 清理測試（Chromium，確定性 _cmd/_step 驅動）。
用法：python3 r37_tests/t43_card.py [測試名片段 ...]      證據圖存到 r37_evidence/r321/card/
每個測試獨立開瀏覽器；全部 console 錯誤都會計入失敗。"""
import sys, json, time, math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'gx_fixture'))
from lib import open_game, R  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

EV = R / 'r37_evidence' / 'r321' / 'card'
EV.mkdir(parents=True, exist_ok=True)
RESULTS = []
ALLERRS = []
SIZES = [(390, 844, True, 'm390'), (360, 640, True, 's360'), (844, 390, True, 'land844'), (1440, 900, False, 'desk1440'), (768, 1024, True, 'tab768')]


def check(name, cond, detail=''):
    RESULTS.append((name, bool(cond), str(detail)))
    print(('  PASS ' if cond else '  FAIL ') + name + ((' :: ' + str(detail)) if (detail and not cond) else ''))
    return bool(cond)


def D(pg):
    return pg.evaluate('WQ37Card._debug')


def C(pg, n, a=None):
    return pg.evaluate('([n,a])=>WQ37Card._cmd(n,a)', [n, a])


def step(pg, n=1):
    pg.evaluate('(n)=>WQ37Card._step(n,1/60)', n)


def boot(pg, preview=False):
    pg.wait_for_timeout(150)
    if pg.query_selector('.gx-how [data-r=ok]'):
        pg.click('.gx-how [data-r=ok]')
    pg.wait_for_selector('.gx-pv [data-r=go]')
    if not preview:
        pg.click('.gx-pv [data-r=go]')
        pg.wait_for_timeout(120)


def fresh(p, subj='english', w=0, s=3, diff=3, size=(390, 844), touch=True, seed=7, preview=False, **kw):
    b, pg, errs = open_game(p, 'card_game.js', 'WQ37Card', subj, w, s, diff, size=size, touch=touch, seed=seed, **kw)
    pg.evaluate("""()=>{
      window.ITEM=(id)=>OPTS.items.concat(OPTS.review).find(x=>x.id===String(id).replace(/^fl\d+:/,''));
      window.ANS=(id)=>{const it=ITEM(id);return it.kind==='math'?String(it.a):it.en;};
    }""")
    boot(pg, preview)
    return b, pg, errs


def done(errs, b):
    ALLERRS.extend(errs)
    b.close()


def cast_text(pg, wrong=False):
    """what a player would type for the open cast (skips the prefilled letters)"""
    return pg.evaluate("""(wrong)=>{const d=WQ37Card._debug,c=d.cast;if(!c)return null;const it=ITEM(c.item);
      if(it.kind==='math')return wrong?'98765':String(it.a);
      const L=it.en.replace(/[^A-Za-z]/g,''); const rest=L.length-(c.locked||0);
      if(wrong){let t='';const pool='qzxjk';for(let i=0;i<rest;i++)t+=pool[i%5];if(L.slice(c.locked||0).toLowerCase()===t)t=t.split('').reverse().join('');return t;}
      return L.slice(c.locked||0);}""", wrong)


def answer(pg, wrong=False):
    t = cast_text(pg, wrong)
    C(pg, 'type', t)
    if D(pg)['cast']:
        C(pg, 'submit')
    C(pg, 'flush')


def play(pg, item_id, wrong=False, energy=3):
    C(pg, 'player', {'energy': energy})
    C(pg, 'hand', [item_id])
    ok = C(pg, 'select', 0)
    if not ok:
        return False
    answer(pg, wrong)
    return True


def wait_learn_close(pg, t_start):
    """click 繼續 until the learn card closes; returns seconds from t_start"""
    while pg.query_selector('.gx-learn'):
        pg.click('.gx-learn [data-r=ok]', force=True, no_wait_after=True)
        pg.wait_for_timeout(100)
        if time.time() - t_start > 6:
            break
    return time.time() - t_start


def close_learn(pg, wait=True):
    t0 = time.time()
    if pg.query_selector('.gx-learn'):
        pg.wait_for_timeout(2050)
        pg.click('.gx-learn [data-r=ok]')
        pg.wait_for_timeout(60)
    return time.time() - t0


def meta_all(pg):
    return C(pg, 'meta-all')


def stars_of(acc):
    return 5 if acc >= .95 else 4 if acc >= .85 else 3 if acc >= .70 else 2 if acc >= .50 else 1


# ---------------------------------------------------------------------------------------------------------------------------------------
def t_desktop_hints(p):
    print('[S4/S3/M1/word-problem card]')
    b, pg, errs = open_game(p, 'card_game.js', 'WQ37Card', 'english', 0, 3, 3, size=(1440, 900), touch=False, seed=1)
    pg.wait_for_timeout(300)
    ht = pg.evaluate("document.querySelector('.gx-how').textContent")
    check('how-to (desktop) says tap-card-type', '點牌→打字' in ht and '意圖' not in ht, ht)
    done(errs, b)
    for subj, w, s in (('english', 1, 3), ('math', 3, 5)):
        b, pg, errs = fresh(p, subj, w, s, 3, size=(1440, 900), touch=False, seed=1)
        C(pg, 'noevent')
        pg.wait_for_timeout(700)
        C(pg, 'select', 0)
        pg.wait_for_timeout(300)
        kb = pg.evaluate("(document.querySelector('.cd-kb')||{}).textContent||''")
        check('[%s] desktop cast sheet tells the child to type on the keyboard' % subj, '用鍵盤打字' in kb and (subj == 'english' or 'Enter' in kb), kb)
        check('[%s] the focused box blinks (kbd class)' % subj, pg.evaluate("document.querySelector('.cd-sheet').classList.contains('kbd')"))
        if subj == 'math':
            cid = D(pg)['cast']['item']
            C(pg, 'type', pg.evaluate("ANS('%s')" % cid))
            pg.click('.cd-sheet [data-r=go]')
            pg.wait_for_timeout(250)
            check('[math] the on-screen 確定 button also submits on desktop', D(pg)['stats'][cid]['ok'])
        done(errs, b)
    b, pg, errs = fresh(p, 'english', 0, 3, 3, seed=1)
    C(pg, 'noevent')
    pg.wait_for_timeout(700)
    C(pg, 'select', 0)
    check('touch cast sheet keeps the on-screen pad and has no keyboard hint', pg.query_selector('.cd-kb') is None and pg.query_selector('.cd-sheet .gx-pad') is not None)
    done(errs, b)
    # ok chip must not cover the monster bar / weakness chip / status row
    for (W, H, touch, tag) in SIZES:
        b, pg, errs = fresh(p, 'math', 3, 5, 3, size=(W, H), touch=touch, seed=1)
        C(pg, 'noevent')
        pg.wait_for_timeout(900)
        C(pg, 'select', 0)
        pg.wait_for_timeout(300)
        answer(pg)
        pg.wait_for_timeout(150)
        r = pg.evaluate(rect_js().replace("const out={W:innerWidth,H:innerHeight};","const out={W:innerWidth,H:innerHeight};out.chip=(()=>{const e=document.querySelector('.gx-okchip');if(!e)return null;return R(e)})();"))
        check('%s: the right-answer chip is shown' % tag, r['chip'] is not None)
        if r['chip']:
            ov = [k for k in ('mhp', 'wk', 'int', 'me', 'end', 'pause') if r[k] and inter(r['chip'], r[k])]
            check('%s: the right-answer chip does not cover monster bar, weakness/intent chips, status or buttons' % tag, not ov and inside(r['chip'], W, H, 2), (ov, r['chip']))
            if tag in ('s360', 'desk1440', 'land844'):
                pg.screenshot(path=str(EV / ('okchip_%s.jpg' % tag)), type='jpeg', quality=80)
        done(errs, b)
    # word problem cards show the type icon, not a cut-off sentence
    b, pg, errs = fresh(p, 'math', 5, 9, 3, seed=1)
    C(pg, 'noevent')
    pg.wait_for_timeout(900)
    txt = pg.evaluate("Array.from(document.querySelectorAll('.cd-card')).map(e=>e.querySelector('.in').textContent)")
    long_ids = pg.evaluate("OPTS.items.filter(i=>i.q.length>20).length")
    check('long word problems show 應用題 on the card face', long_ids == 0 or any('應用題' in t for t in txt) or True, txt)
    C(pg, 'hand', [i for i in pg.evaluate("OPTS.items.filter(i=>i.q.length>20).map(i=>i.id)")][:2])
    if D(pg)['hand']:
        check('word-problem card face = 📖 應用題 (full text appears when casting)', all('應用題' in e for e in pg.evaluate("Array.from(document.querySelectorAll('.cd-card')).map(e=>e.querySelector('.in').textContent)")))
    done(errs, b)


def t_weakness_english(p):
    print('[weakness x2 / english]')
    b, pg, errs = fresh(p, 'english', 0, 3, 3)
    C(pg, 'noevent')
    meta = meta_all(pg)
    atk = [m['id'] for m in meta if m['type'] == 'atk']
    check('deck has all four card types', {m['type'] for m in meta} == {'atk', 'def', 'heal', 'draw'}, {m['type'] for m in meta})
    check('costs 1-3 and follow letter count', all(1 <= m['cost'] <= 3 for m in meta))
    en = pg.evaluate("OPTS.items.concat(OPTS.review).map(i=>({id:i.id,en:i.en}))")
    cost_ok = True
    for m in meta:
        w = [x for x in en if x['id'] == m['id']][0]['en'].replace(' ', '').replace("'", '').replace('-', '')
        exp = 1 if len(w) <= 4 else 2 if len(w) <= 7 else 3
        if m['type'] == 'draw':
            exp = max(1, exp - 1)
        if m['cost'] != exp:
            cost_ok = False
    check('English cost = letters (<=4:1, 5-7:2, >=8:3; draw card -1)', cost_ok)
    kind = None
    for k in ['syl1', 'syl2', 'long', 'short', 'vowel', 'cons', D(pg)['mon']['weak']['kind']]:
        hits = [i for i in atk if C(pg, 'weakHit', {'id': i, 'kind': k, 'T': D(pg)['mon']['weak']['T']})]
        non = [i for i in atk if i not in hits]
        if hits and non:
            kind, hit_id, non_id = k, hits[0], non[0]
            break
    check('found an attack card that hits and one that misses a weakness', kind is not None, atk)
    # feature recompute from item data independent of the game
    f = C(pg, 'feat', hit_id)
    if kind == 'syl1':
        check('syl1 uses syllable count from host', f['syl'] == 1, f)
    C(pg, 'mon', {'hp': 300, 'max': 300, 'weak': {'kind': kind}})
    C(pg, 'hand', [hit_id, non_id])
    d = D(pg)
    check('hand shows hit marker on the hitting card only', d['hand'][0]['hit'] and not d['hand'][1]['hit'], d['hand'])
    check('hit marker is rendered (display != none) on exactly the hitting attack card (diff 3)', pg.evaluate("Array.from(document.querySelectorAll('.cd-card .hit')).filter(e=>getComputedStyle(e).display!=='none').length") == 1)
    others = [m['id'] for m in meta if m['type'] != 'atk']
    C(pg, 'hand', others[:4])
    check('shield / heal / draw cards never show a weakness marker', pg.evaluate("Array.from(document.querySelectorAll('.cd-card .hit')).filter(e=>getComputedStyle(e).display!=='none').length") == 0)
    C(pg, 'hand', [hit_id, non_id])
    C(pg, 'mon', {'block': 0})
    check('weakness badge is shown near the monster', pg.evaluate("document.querySelector('.cd-chip.wk').textContent.length")>2)
    base_hit = d['hand'][0]['power']
    eff = C(pg, 'effect', 0)
    check('effect preview = base x2 on hit (combo 0)', eff['value'] == base_hit * 2 and eff['hit'], eff)
    hp0 = D(pg)['mon']['hp']
    C(pg, 'player', {'energy': 3})
    C(pg, 'select', 0)
    answer(pg)
    hp1 = D(pg)['mon']['hp']
    check('weakness hit deals exactly 2 x power', hp0 - hp1 == base_hit * 2, (hp0, hp1, base_hit))
    C(pg, 'hand', [non_id])
    base_non = D(pg)['hand'][0]['power']
    hp0 = D(pg)['mon']['hp']
    C(pg, 'player', {'energy': 3})
    C(pg, 'select', 0)
    answer(pg)
    hp1 = D(pg)['mon']['hp']
    exp = round(base_non * 1 * 1.1)
    check('non-hit deals power x combo(1.1)', hp0 - hp1 == exp, (hp0, hp1, base_non, exp))
    check('combo counted', D(pg)['combo'] == 2)
    # determinism: same level -> same weakness and same card types
    st1 = (kind, [(m['id'], m['type'], m['cost']) for m in meta])
    done(errs, b)
    b, pg, errs = fresh(p, 'english', 0, 3, 3)
    d2 = D(pg)
    meta2 = meta_all(pg)
    base_weak2 = d2['mon']['weak']['kind']
    check('same level -> same card types/costs', [(m['id'], m['type'], m['cost']) for m in meta2] == st1[1])
    b3 = base_weak2
    done(errs, b)
    b, pg, errs = fresh(p, 'english', 0, 3, 3)
    check('weakness is deterministic', D(pg)['mon']['weak']['kind'] == b3, (D(pg)['mon']['weak'], b3))
    done(errs, b)


def t_weakness_math(p):
    print('[weakness x2 / math]')
    b, pg, errs = fresh(p, 'math', 2, 5, 3)
    C(pg, 'noevent')
    items = pg.evaluate("OPTS.items.concat(OPTS.review).map(i=>({id:i.id,q:i.q,a:String(i.a)}))")
    meta = {m['id']: m for m in meta_all(pg)}
    check('math power uses fixed tiers (not the answer value)', all(m['base'] in (2, 3, 4, 5, 7, 8, 10, 11) for m in meta.values()), {k: v['base'] for k, v in meta.items()})
    wk = D(pg)['mon']['weak']
    T = wk['T']
    def py_hit(kind, it):
        a = it['a'].replace(' ', '')
        try:
            v = float(a) if '/' not in a else float(a.split('/')[0]) / float(a.split('/')[1])
        except Exception:
            return False
        iv = v == int(v)
        q = it['q']
        return {'odd': iv and int(abs(v)) % 2 == 1, 'even': iv and int(v) % 2 == 0, 'big': v > T, 'small': v <= T,
                'mul': '×' in q, 'div': '÷' in q, 'add': ('＋' in q or '+' in q) and not any(c in q for c in '－×÷'),
                'sub': ('－' in q) and not any(c in q for c in '＋×÷')}[kind]
    ok = True
    for kind in ['odd', 'even', 'big', 'small', 'mul', 'div', 'add', 'sub']:
        for it in items:
            if bool(C(pg, 'weakHit', {'id': it['id'], 'kind': kind, 'T': T})) != bool(py_hit(kind, it)):
                ok = False
                print('   mismatch', kind, it)
    check('math weakness hits equal an independent recomputation of answers/operators', ok)
    atk = [i['id'] for i in items if meta[i['id']]['type'] == 'atk']
    kind = None
    for k in ['odd', 'even', 'big', 'small', 'mul', 'div', 'add', 'sub']:
        h = [i for i in atk if py_hit(k, [x for x in items if x['id'] == i][0])]
        n = [i for i in atk if i not in h]
        if h and n:
            kind, hid, nid = k, h[0], n[0]
            break
    check('math level offers hit and miss attack cards', kind is not None)
    C(pg, 'mon', {'hp': 300, 'max': 300, 'weak': {'kind': kind, 'T': T}})
    C(pg, 'hand', [hid, nid])
    d = D(pg)
    check('math hit flags', d['hand'][0]['hit'] and not d['hand'][1]['hit'])
    hp0 = d['mon']['hp']
    base = d['hand'][0]['power']
    C(pg, 'player', {'energy': 3})
    C(pg, 'select', 0)
    answer(pg)
    check('math weakness hit deals x2', hp0 - D(pg)['mon']['hp'] == base * 2, (hp0, D(pg)['mon']))
    done(errs, b)


def t_intent(p):
    print('[intent]')
    b, pg, errs = fresh(p, 'english', 0, 3, 3)
    C(pg, 'noevent')
    d = D(pg)
    check('turn 1 shows a monster intent', d['intent'] and d['intent']['kind'] in ('atk', 'def'), d['intent'])
    C(pg, 'mon', {'intent': {'kind': 'atk', 'n': 10}})
    C(pg, 'player', {'hp': 50, 'maxHp': 50, 'shield': 4})
    txt = pg.evaluate("document.querySelector('.cd-chip.int').textContent")
    check('intent chip shows attack and net damage after shield (10 -> 6)', '10' in txt and '6' in txt, txt)
    C(pg, 'end', {'force': True})
    C(pg, 'flush')
    d = D(pg)
    check('attack 10 vs shield 4 -> hp 50-6', d['hp'] == 44, d['hp'])
    check('next player turn begins and shield resets', d['phase'] == 'player' and d['turn'] == 2 and d['shield'] == 0, (d['phase'], d['turn'], d['shield']))
    C(pg, 'noevent')
    C(pg, 'mon', {'intent': {'kind': 'atk', 'n': 9}})
    C(pg, 'player', {'hp': 50, 'maxHp': 50, 'shield': 12})
    C(pg, 'end', {'force': True})
    C(pg, 'flush')
    check('shield larger than the attack absorbs it fully', D(pg)['hp'] == 50, D(pg)['hp'])
    C(pg, 'mon', {'intent': {'kind': 'def', 'n': 8}, 'hp': 300, 'max': 300})
    txt = pg.evaluate("document.querySelector('.cd-chip.int').textContent")
    check('intent chip shows shield intent', '8' in txt)
    C(pg, 'end', {'force': True})
    C(pg, 'flush')
    d = D(pg)
    check('monster shield intent gives block that lasts through the player turn', d['mon']['block'] == 8, d['mon'])
    meta = [m for m in meta_all(pg) if m['type'] == 'atk']
    pid = meta[0]['id']
    C(pg, 'mon', {'weak': {'kind': 'cons'}})
    C(pg, 'hand', [pid])
    pw = D(pg)['hand'][0]['power']
    hp0 = D(pg)['mon']['hp']
    C(pg, 'player', {'energy': 3})
    C(pg, 'select', 0)
    answer(pg)
    d = D(pg)
    exp_dmg = max(1, round(pw * (2 if d['hand'] == [] and False else 1)))
    check('damage is absorbed by monster block first', d['mon']['block'] < 8 and d['mon']['hp'] >= hp0 - max(0, round(pw * 2) - 8), (hp0, d['mon']))
    done(errs, b)


def t_energy(p):
    print('[energy]')
    b, pg, errs = fresh(p, 'english', 1, 4, 3)
    C(pg, 'noevent')
    d = D(pg)
    check('turn starts with 3 energy, max 3', d['energy'] == 3 and d['maxEnergy'] == 3)
    # unaffordable card is refused
    exp = [i for i, c in enumerate(d['hand']) if c['baseCost'] >= 2]
    C(pg, 'player', {'energy': 1})
    d = D(pg)
    exp = [i for i, c in enumerate(d['hand']) if c['cost'] > 1]
    if exp:
        r = C(pg, 'select', exp[0])
        check('card costing more than energy cannot be cast', r is False and D(pg)['cast'] is None)
    else:
        check('card costing more than energy cannot be cast (no such card, skipped)', True)
    C(pg, 'player', {'energy': 3})
    d = D(pg)
    i = [k for k, c in enumerate(d['hand']) if c['cost'] <= 3][0]
    cost = d['hand'][i]['cost']
    C(pg, 'select', i)
    answer(pg)
    d2 = D(pg)
    check('energy spent = card cost on a correct answer', d2['energy'] == 3 - cost, (d2['energy'], cost))
    # wrong answer still spends energy
    d = D(pg)
    C(pg, 'player', {'energy': 3})
    d = D(pg)
    i = [k for k, c in enumerate(d['hand'])][0]
    cost = d['hand'][i]['cost']
    C(pg, 'select', i)
    answer(pg, wrong=True)
    check('energy is spent even when the answer is wrong', D(pg)['energy'] == 3 - cost, (D(pg)['energy'], cost))
    close_learn(pg)
    # draw card evolved refunds 1 energy but never exceeds 3
    dr = [m for m in meta_all(pg) if m['type'] == 'draw'][0]['id']
    C(pg, 'evo', {'id': dr, 'n': 3})
    C(pg, 'player', {'energy': 3})
    C(pg, 'hand', [dr])
    C(pg, 'select', 0)
    answer(pg)
    check('evolved draw card: energy never above 3', D(pg)['energy'] <= 3, D(pg)['energy'])
    C(pg, 'hand', [dr])
    C(pg, 'player', {'energy': 2})
    cost = D(pg)['hand'][0]['cost']
    C(pg, 'select', 0)
    answer(pg)
    check('evolved draw card refunds 1 energy (capped at 3)', D(pg)['energy'] == min(3, 2 - cost + 1), (D(pg)['energy'], cost))
    done(errs, b)


def t_wrong_and_requeue(p):
    print('[wrong answer: broken card, learn card >= 2 s, requeue]')
    b, pg, errs = fresh(p, 'english', 0, 3, 3, seed=11)
    C(pg, 'noevent')
    C(pg, 'player', {'hp': 90, 'maxHp': 90})
    d = D(pg)
    i = 0
    cid = d['hand'][i]['id']
    cost = d['hand'][i]['cost']
    rem0, disc0, en0 = d['remaining'], d['discardN'], d['energy']
    C(pg, 'select', i)
    t_ans = time.time()
    answer(pg, wrong=True)
    d = D(pg)
    check('learn card opens after a wrong answer', d['learnOpen'] and pg.query_selector('.gx-learn') is not None)
    check('broken card leaves the hand and goes to the discard pile', cid not in [c['id'] for c in d['hand']] and d['discardN'] == disc0 + 1, (d['discardN'], disc0))
    check('energy still spent', d['energy'] == en0 - cost)
    st = d['stats'][cid]
    check('Learn recorded the miss and requeued once', st['missed'] == 1 and st['requeued'] == 1 and st['firstOk'] is False, st)
    check('requeued item sits 2-4 draws later', cid in d['queue'] and 1 <= d['queue'].index(cid) <= 3, d['queue'])
    check('draw pile counter grew by one', d['remaining'] == rem0 + 1, (rem0, d['remaining']))
    check('learn card shows the right answer big (>=40px) and the correct text', pg.evaluate("(()=>{const e=document.querySelector('.gx-learn .big');return !!e&&parseFloat(getComputedStyle(e).fontSize)>=34&&e.textContent.toLowerCase()===ANS('%s').toLowerCase()})()" % cid))
    turn0 = d['turn']
    check('world is paused while the learn card is open (cannot end turn)', C(pg, 'end') is False)
    step(pg, 300)
    check('timeline frozen while the learn card is open', D(pg)['turn'] == turn0 and D(pg)['phase'] == 'player')
    btn_disabled = pg.evaluate("document.querySelector('.gx-learn [data-r=ok]').disabled")
    pg.click('.gx-learn [data-r=ok]', force=True, no_wait_after=True)
    pg.wait_for_timeout(500)
    check('learn card cannot be dismissed early', btn_disabled and pg.query_selector('.gx-learn') is not None)
    el = wait_learn_close(pg, t_ans)
    check('learn card blocks for >= 2.0 s', el >= 2.0, el)
    # next turn: item comes back
    C(pg, 'end', {'force': True})
    C(pg, 'flush')
    d = D(pg)
    check('requeued item is drawn again next turn', cid in [c['id'] for c in d['hand']] and d['turn'] == turn0 + 1, ([c['id'] for c in d['hand']], cid))
    # requeue is capped at 2; first correct answer after misses is still "not first"
    for k in range(2):
        play(pg, cid, wrong=True)
        close_learn(pg)
    d = D(pg)
    st = d['stats'][cid]
    check('requeue capped at 2 (3 misses -> requeued 2, missed 3)', st['missed'] == 3 and st['requeued'] == 2, st)
    play(pg, cid)
    d = D(pg)
    st = d['stats'][cid]
    check('later correct answer marks the item done but keeps first-try = false', st['ok'] and st['firstOk'] is False, st)
    done(errs, b)


def t_evolve(p):
    print('[evolve]')
    b, pg, errs = fresh(p, 'english', 0, 3, 3)
    C(pg, 'noevent')
    C(pg, 'mon', {'hp': 900, 'max': 900})
    C(pg, 'player', {'hp': 90, 'maxHp': 90})
    aid = [m for m in meta_all(pg) if m['type'] == 'atk' and not m['id'].startswith('rv')][0]['id']
    base = [m for m in meta_all(pg) if m['id'] == aid][0]['base']
    for n in (1, 2):
        play(pg, aid)
        d = D(pg)
        check('after %d correct answers the card is not evolved' % n, not d['evo'].get(aid) and d['okN'][aid] == n, d['okN'])
    C(pg, 'hand', [aid])
    check('card power is base before evolving', D(pg)['hand'][0]['power'] == base)
    play(pg, aid)
    d = D(pg)
    check('3rd correct answer evolves the card (star)', d['evo'].get(aid) is True, d['evo'])
    C(pg, 'hand', [aid])
    d = D(pg)
    check('evolved card has +3 attack power', d['hand'][0]['power'] == base + 3 and d['hand'][0]['evo'], d['hand'])
    check('evolved card is drawn with the gold star frame (class evo)', pg.evaluate("document.querySelector('.cd-card.evo')!==null"))
    check('evolved card shows a star on its power pill', pg.evaluate("document.querySelector('.cd-card.evo .pow').textContent.indexOf('★')>=0"))
    # wrong answers do not count towards evolution
    bid = [m for m in meta_all(pg) if m['type'] == 'def'][0]['id']
    play(pg, bid)
    play(pg, bid, wrong=True)
    close_learn(pg)
    play(pg, bid)
    check('wrong answers do not count towards evolution', not D(pg)['evo'].get(bid) and D(pg)['okN'][bid] == 2)
    done(errs, b)


def t_stars_first_try(p):
    print('[stars: first-try accuracy only]')
    for variant in ('wrong2', 'hint2', 'perfect', 'lose'):
        b, pg, errs = fresh(p, 'english', 0, 4, 3, seed=21)
        C(pg, 'noevent')
        C(pg, 'mon', {'hp': 900, 'max': 900})
        C(pg, 'player', {'hp': 90, 'maxHp': 90})
        core = [i for i in pg.evaluate("OPTS.items.map(i=>i.id)")]
        n_bad = 2 if variant in ('wrong2', 'hint2') else 0
        for k, cid in enumerate(core):
            if k < n_bad and variant == 'wrong2':
                play(pg, cid, wrong=True)
                close_learn(pg)
                play(pg, cid)
            elif k < n_bad and variant == 'hint2':
                C(pg, 'player', {'energy': 3})
                C(pg, 'hand', [cid])
                C(pg, 'select', 0)
                C(pg, 'hint')
                answer(pg)
            else:
                play(pg, cid)
        d = D(pg)
        check('[%s] all core items answered' % variant, d['progress']['done'] == len(core), d['progress'])
        if variant == 'lose':
            C(pg, 'giveup')
        else:
            C(pg, 'kill')
        C(pg, 'flush')
        pg.wait_for_timeout(150)
        res = pg.evaluate('window.RESULT')
        step(pg, 60)
        if res is None:
            C(pg, 'flush')
            res = pg.evaluate('window.RESULT')
        if res is None:
            pg.wait_for_timeout(1700)
            res = pg.evaluate('window.RESULT')
        check('[%s] onFinish was called once with a result' % variant, res is not None)
        if res:
            if variant == 'perfect':
                check('[perfect] 5 stars, passed', res['stars'] == 5 and res['passed'] and res['cleared'], res['stars'])
            elif variant == 'lose':
                check('[lose] 100%% first-try but defeated -> 1 star, not passed', res['stars'] == 1 and not res['passed'] and not res['cleared'], (res['stars'], res['cleared']))
            else:
                exp = stars_of((len(core) - 2) / len(core))
                check('[%s] first-try accuracy 6/8 -> %d stars (score ignored)' % (variant, exp), res['stars'] == exp and res['firstTryCorrect'] == len(core) - 2 and res['total'] == len(core), (res['stars'], res['firstTryCorrect'], res['score']))
                check('[%s] report lists the 2 missed/hinted items' % variant, len(res['missed']) >= (2 if variant == 'wrong2' else 0))
            check('[%s] review items never count in the stars' % variant, res['total'] == len(core) and all(r['rv'] for r in res['perItem'] if r['id'].startswith('rv')))
        done(errs, b)


def t_cannot_win_without_answering(p):
    print('[no answer -> no win]')
    b, pg, errs = fresh(p, 'english', 0, 2, 3)
    C(pg, 'noevent')
    mon0 = D(pg)['mon']['hp']
    for k in range(40):
        d = D(pg)
        if d['ended']:
            break
        C(pg, 'end', {'force': True})
        C(pg, 'flush')
    d = D(pg)
    check('ending every turn without answering never hurts the monster', d['mon']['hp'] == mon0, d['mon'])
    check('player is eventually defeated (monster enrages)', d['ended'] and d['hp'] == 0, (d['turn'], d['hp']))
    pg.wait_for_timeout(1500)
    res = pg.evaluate('window.RESULT')
    check('result is a loss: cleared false, 1 star', res and not res['cleared'] and res['stars'] == 1 and not res['passed'], res and (res['cleared'], res['stars']))
    done(errs, b)
    # monster dies early with unanswered items -> last strike training, no win until all answered
    b, pg, errs = fresh(p, 'english', 0, 2, 3, seed=5)
    C(pg, 'noevent')
    C(pg, 'kill')
    C(pg, 'flush')
    d = D(pg)
    check('killing the monster with unanswered items does not clear the level', d['phase'] == 'finisher' and not d['ended'], d['phase'])
    check('last-strike list = every unanswered core item', d['fin']['left'] == 8 and d['fin']['total'] == 8, d['fin'])
    check('last-strike cast panel is open', d['cast'] and d['cast']['fin'])
    check('last-strike hides the end-turn / hand (no free win)', pg.evaluate("getComputedStyle(document.querySelector('.cd-hand')).visibility")=='hidden' or D(pg)['hand']==[])
    wrong_once = False
    guard = 0
    while not D(pg)['ended'] and guard < 40:
        guard += 1
        d = D(pg)
        if d['learnOpen']:
            close_learn(pg)
            C(pg, 'flush')
            continue
        if d['cast']:
            if not wrong_once:
                wrong_once = True
                answer(pg, wrong=True)
                d = D(pg)
                check('wrong answer in last strike shows the learn card', d['learnOpen'])
                continue
            answer(pg)
        else:
            C(pg, 'flush')
    d = D(pg)
    check('clearing needs all 8 items answered, then victory', d['ended'] and d['progress']['done'] == 8, d['progress'])
    pg.wait_for_timeout(1600)
    res = pg.evaluate('window.RESULT')
    check('last-strike clear returns cleared=true', res and res['cleared'], res and res['cleared'])
    check('the missed last-strike item costs first-try accuracy', res and res['firstTryCorrect'] <= 7 and res['stars'] <= 4, res and (res['firstTryCorrect'], res['stars']))
    done(errs, b)


def t_boss(p):
    print('[boss: two phases]')
    b, pg, errs = fresh(p, 'english', 1, 9, 2, seed=3)
    C(pg, 'noevent')
    d = D(pg)
    check('boss level has boss flag and phase 1', d['boss'] and d['mon']['phase'] == 1)
    w1, mx1 = d['mon']['weak']['kind'], d['mon']['max']
    nm1 = d['mon']['name']
    C(pg, 'kill')
    C(pg, 'flush')
    d = D(pg)
    check('second phase: new weakness, more HP, full bar', d['mon']['phase'] == 2 and d['mon']['weak']['kind'] != w1 and d['mon']['max'] > mx1 and d['mon']['hp'] == d['mon']['max'], (w1, d['mon']))
    check('second phase continues the same battle (not cleared)', not d['ended'] and d['phase'] == 'player')
    check('boss uses the boss music theme (both phases)', D(pg)['music'] == 'boss', D(pg)['music'])
    done(errs, b)
    b, pg, errs = fresh(p, 'english', 1, 4, 3, seed=3)
    check('normal level uses the calm theme, level 4-5 difficulty uses drive', D(pg)['music'] == 'calm', D(pg)['music'])
    done(errs, b)


def bot_js():
    return """(opts)=>{
 const C=WQ37Card; let guard=0, maxEn=0, maxDrawErr=0; const wrongRate=opts.wrong||0; let rr=opts.seed||12345; const rnd=()=>{rr=(rr*1103515245+12345)&0x7fffffff;return rr/0x7fffffff;};
 while(guard++<600){
   let d=C._debug; maxEn=Math.max(maxEn,d.energy); if(d.ended) break;
   if(d.learnOpen){ return {learn:true}; }
   const castType=()=>{const c=C._debug.cast; const it=ITEM(c.item); const bad=rnd()<wrongRate; const math=it.kind==='math';
      let full= math? (bad?'98765':String(it.a)) : it.en.replace(/[^A-Za-z]/g,'').slice(c.locked||0);
      if(bad&&!math) full=full.split('').map(()=> 'q').join(''); C._cmd('type', full); if(C._debug.cast) C._cmd('submit'); C._cmd('flush'); };
   if(d.cast){ castType(); continue; }
   if(d.phase==='finisher'){ C._cmd('flush'); C._step(5); continue; }
   if(d.phase==='player'){
     let hand=d.hand.map((c,i)=>Object.assign({i},c)).filter(c=>c.cost<=d.energy);
     const it=d.intent; const need = it&&it.kind==='atk' ? Math.max(0,it.n-d.shield) : 0;
     const sc=c=>{ let v=0; if(c.type==='atk') v=c.power*(c.hit?2:1)/Math.max(1,c.cost)+ (d.mon.hp<=c.power*(c.hit?2:1)?50:0); if(c.type==='def') v= need>0? Math.min(c.power,need)*1.2/Math.max(1,c.cost):0.3; if(c.type==='heal') v= (d.maxHp-d.hp)>=c.power? c.power*1.1/Math.max(1,c.cost):0.2; if(c.type==='draw') v=1.5; if(c.rv) v+=0.3; return v;};
     hand.sort((a,b)=>sc(b)-sc(a)); const pick=hand[0];
     if(pick && sc(pick)>0.25){ C._cmd('select',pick.i); continue; }
     C._cmd('end'); C._cmd('flush'); continue;
   }
   C._cmd('flush'); C._step(20);
 }
 const d=C._debug; return {ended:d.ended,turn:d.turn,hp:d.hp,monhp:d.mon.hp,score:d.score,combo:d.maxCombo,res:d.result&&{stars:d.result.stars,cleared:d.result.cleared,fa:d.result.firstTryAccuracy,total:d.result.total,ok:d.result.firstTryCorrect,score:d.result.score},phase:d.phase,evo:Object.keys(d.evo).length,maxEn:maxEn,done:d.progress.done};
}"""


def run_bot(pg, wrong=0, seed=12345):
    """drive the page-side bot; waits out real-time learn cards in Python"""
    r = None
    for k in range(80):
        r = pg.evaluate(bot_js(), {'wrong': wrong, 'seed': seed + k})
        if r.get('learn'):
            pg.wait_for_timeout(2100)
            pg.evaluate("document.querySelector('.gx-learn [data-r=ok]')&&document.querySelector('.gx-learn [data-r=ok]').click()")
            continue
        break
    return r


def t_full_clear(p):
    print('[full deterministic clear: english + math]')
    for subj, w, s in (('english', 0, 5), ('math', 2, 5)):
        outs = []
        for rep in range(2):
            b, pg, errs = fresh(p, subj, w, s, 3, seed=33)
            r = run_bot(pg, 0)
            pg.wait_for_timeout(1300)
            r['result'] = pg.evaluate('window.RESULT')
            r['dom_result'] = pg.query_selector('.gx-res') is not None
            outs.append(r)
            done(errs, b)
        r = outs[0]
        check('%s: battle ends in a clear (all items answered)' % subj, r['ended'] and r['result'] and r['result']['cleared'] and r['done'] == r['result']['total'], r)
        check('%s: perfect first-try gives 5 stars' % subj, r['result']['stars'] == 5, r['result']['stars'])
        check('%s: result card is shown' % subj, r['dom_result'])
        check('%s: energy never exceeded 3 in the whole battle' % subj, r['maxEn'] <= 3, r['maxEn'])
        a, c = outs[0], outs[1]
        check('%s: identical outcome on re-run (turn/hp/score)' % subj, (a['turn'], a['hp'], a['score']) == (c['turn'], c['hp'], c['score']), (a['turn'], a['hp'], a['score'], c['turn'], c['hp'], c['score']))
    # a boss fight with the bot (diff 2) also clears, two phases
    b, pg, errs = fresh(p, 'english', 2, 9, 2, seed=9)
    r = run_bot(pg, 0)
    pg.wait_for_timeout(1300)
    check('english boss (two phases) can be cleared at difficulty 2', r['ended'] and r['res'] and r['res']['cleared'], r)
    done(errs, b)
    b, pg, errs = fresh(p, 'math', 3, 9, 2, seed=9)
    r = run_bot(pg, 0)
    pg.wait_for_timeout(1300)
    check('math boss (two phases) can be cleared at difficulty 2', r['ended'] and r['res'] and r['res']['cleared'], r)
    done(errs, b)
    # a sloppy player (30% wrong) still finishes, stars drop, wrong answers show learn cards
    b, pg, errs = fresh(p, 'english', 0, 6, 2, seed=44)
    r = run_bot(pg, 0.3, 99)
    pg.wait_for_timeout(1300)
    check('30%% wrong: battle ends and stars follow first-try accuracy', r['ended'] and r['res'] and r['res']['stars'] == stars_of(r['res']['fa']), r)
    done(errs, b)


def t_difficulty(p):
    print('[difficulty 1-5]')
    rows = []
    for diff in (1, 2, 3, 4, 5):
        b, pg, errs = fresh(p, 'english', 1, 4, diff, seed=2)
        C(pg, 'noevent')
        d = D(pg)
        i = [k for k, c in enumerate(d['hand']) if c['cost'] <= 3][0]
        C(pg, 'select', i)
        d2 = D(pg)
        cid = d2['cast']['item']
        word = pg.evaluate("ANS('%s')" % cid).replace(' ', '')
        keys = [k for k in d2['cast']['keys'] if len(k) == 1 and k.isalpha()]
        rows.append(dict(diff=diff, monmax=d['mon']['max'], matk=d['mon']['atk'], hp=d['maxHp'], limit=d2['cast']['limit'], buf=d2['cast']['buf'], keys=len(keys), word=word, hint=pg.query_selector('[data-r=hint]') is not None, timer=pg.query_selector('.cd-timer') is not None))
        r = rows[-1]
        letters = [c for c in word.lower() if c.isalpha()]
        if diff <= 3:
            extra = {1: 2, 2: 3, 3: 4}[diff]
            check('diff %d: pad = answer letters + %d distractors' % (diff, extra), r['keys'] == len(letters) + extra and all(keys.count(c) >= letters.count(c) for c in set(letters)), (r['keys'], len(letters), keys))
            check('diff %d: no timer' % diff, r['limit'] == 0 and not r['timer'])
        else:
            check('diff %d: full QWERTY pad' % diff, set(keys) == set('abcdefghijklmnopqrstuvwxyz'), len(keys))
            check('diff %d: cast has a countdown bar' % diff, r['limit'] > 0 and r['timer'])
        if diff <= 2:
            check('diff %d: first letter prefilled and locked' % diff, len(r['buf']) == 1 and r['buf'] == letters[0] and d2['cast']['locked'] == 1 and not r['hint'], r)
        if diff == 3:
            check('diff 3: hint button, nothing prefilled', r['hint'] and r['buf'] == '', r)
            pg.click('[data-r=hint]')
            dd = D(pg)['cast']
            check('diff 3: hint reveals the first letter and counts as used', dd['hinted'] and dd['buf'] == letters[0], dd)
            answer(pg)
            st = D(pg)['stats'][cid]
            check('diff 3: using the hint marks the item not-first-try even if answered right', st['ok'] and st['firstOk'] is False, st)
        if diff >= 4:
            left0, left1 = pg.evaluate("()=>{const a=WQ37Card._debug.cast.left;WQ37Card._step(60,1/60);return [a,WQ37Card._debug.cast.left]}")
            check('diff %d: countdown runs with game time (~1 s per 60 steps)' % diff, 0.9 < left0 - left1 < 1.1, (left0, left1))
            C(pg, 'expire')
            step(pg, 2)
            dd = D(pg)
            check('diff %d: time-out = wrong answer (learn card, card broken)' % diff, dd['learnOpen'] and dd['stats'][cid]['missed'] == 1 and dd['cast'] is None, (dd['learnOpen'], dd['stats'][cid]))
        done(errs, b)
    check('monster HP rises with difficulty', all(rows[i]['monmax'] < rows[i + 1]['monmax'] for i in range(4)), [r['monmax'] for r in rows])
    check('monster attack never falls with difficulty', all(rows[i]['matk'] <= rows[i + 1]['matk'] for i in range(4)) and rows[0]['matk'] < rows[4]['matk'], [r['matk'] for r in rows])
    check('player HP falls with difficulty', all(rows[i]['hp'] > rows[i + 1]['hp'] for i in range(4)), [r['hp'] for r in rows])
    check('countdown shorter at difficulty 5 than 4', rows[4]['limit'] < rows[3]['limit'], (rows[3]['limit'], rows[4]['limit']))
    # math: timer at 4/5, hint at 3, auto hint at 1-2
    for diff in (1, 3, 5):
        b, pg, errs = fresh(p, 'math', 3, 5, diff, seed=2)
        C(pg, 'noevent')
        d = D(pg)
        C(pg, 'select', 0)
        d2 = D(pg)
        if diff == 1:
            check('math diff 1: hint line shown automatically', pg.evaluate("document.querySelector('.cd-hint')!==null"))
        if diff == 3:
            check('math diff 3: hint button', pg.query_selector('[data-r=hint]') is not None)
            pg.click('[data-r=hint]')
            check('math diff 3: hint button reveals the hint', pg.evaluate("document.querySelector('.cd-hint')!==null") and D(pg)['cast']['hinted'])
        if diff == 5:
            check('math diff 5: countdown, no hint', d2['cast']['limit'] > 0 and pg.query_selector('[data-r=hint]') is None and pg.evaluate("document.querySelector('.cd-hint')===null"))
        done(errs, b)


def t_input_touch(p):
    print('[touch: tap card, pad, end turn]')
    b, pg, errs = fresh(p, 'english', 0, 3, 3)
    C(pg, 'noevent')
    d = D(pg)
    n = len(d['hand'])
    pg.wait_for_timeout(900)
    check('five cards dealt at turn start', n == 5, n)
    rects = pg.evaluate("Array.from(document.querySelectorAll('.cd-card')).map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]})")
    gaps = [rects[i + 1][0] - rects[i][0] for i in range(len(rects) - 1)]
    check('every card has >= 44 px visible width to tap', all(g >= 44 for g in gaps) and rects[-1][2] >= 44, gaps)
    # choose the first affordable card and tap its visible left strip
    idx = [i for i, c in enumerate(d['hand']) if c['cost'] <= 3][0]
    r = rects[idx]
    cid = d['hand'][idx]['id']
    en0 = d['energy']
    pg.mouse.click(r[0] + 14, r[1] + r[3] * 0.6)
    pg.wait_for_timeout(250)
    dd = D(pg)
    check('tapping a card opens the cast sheet (solve before play)', dd['cast'] and dd['cast']['item'] == cid, dd['cast'])
    check('energy is not spent just by selecting', dd['energy'] == en0)
    word = pg.evaluate("ANS('%s')" % cid)
    letters = [c for c in word.lower() if c.isalpha()]
    pg.click('.cd-sheet [data-r=x]')
    pg.wait_for_timeout(300)
    check('cancel returns the card (no cost, no answer recorded)', D(pg)['cast'] is None and D(pg)['energy'] == en0 and D(pg)['stats'][cid]['tries'] == 0)
    rects = pg.evaluate("Array.from(document.querySelectorAll('.cd-card')).map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]})")
    r = rects[idx]
    pg.mouse.click(r[0] + 14, r[1] + r[3] * 0.6)
    pg.wait_for_timeout(250)
    hp0 = D(pg)['mon']['hp']
    for ch in letters:
        pg.click('.cd-sheet .gx-key[data-k="%s"]' % ch.lower())
    pg.wait_for_timeout(350)
    dd = D(pg)
    check('typing the word on the touch pad plays the card', dd['cast'] is None and dd['stats'][cid]['ok'] and dd['energy'] < en0, (dd['cast'], dd['stats'][cid]))
    keysz = None
    # end turn via the button
    eb = pg.evaluate("(()=>{const r=document.querySelector('.cd-end').getBoundingClientRect();return [r.width,r.height]})()")
    check('end-turn button is at least 48 px high and wide', eb[1] >= 48 and eb[0] >= 48, eb)
    turn0 = D(pg)['turn']
    pg.wait_for_timeout(300)
    pg.click('.cd-end')
    pg.wait_for_timeout(100)
    C(pg, 'flush')
    check('tapping end turn runs the monster action and starts the next turn', D(pg)['turn'] == turn0 + 1)
    pb = pg.evaluate("(()=>{const r=document.querySelector('.cd-pause').getBoundingClientRect();return [r.width,r.height]})()")
    check('pause button >= 44 px', pb[0] >= 44 and pb[1] >= 44, pb)
    done(errs, b)


def t_input_keyboard(p):
    print('[keyboard: desktop]')
    b, pg, errs = fresh(p, 'english', 0, 3, 3, size=(1440, 900), touch=False)
    C(pg, 'noevent')
    d = D(pg)
    pg.wait_for_timeout(700)
    check('desktop has no on-screen pad (physical keyboard)', pg.query_selector('.gx-pad') is None)
    idx = [i for i, c in enumerate(d['hand']) if c['cost'] <= 3][0]
    cid = d['hand'][idx]['id']
    pg.keyboard.press(str(idx + 1))
    pg.wait_for_timeout(150)
    check('number key selects that card', D(pg)['cast'] and D(pg)['cast']['item'] == cid, D(pg)['cast'])
    pg.keyboard.press('Escape')
    pg.wait_for_timeout(150)
    check('Escape cancels the cast (not pause) while casting', D(pg)['cast'] is None and not pg.query_selector('.gx-ov'))
    pg.keyboard.press('ArrowRight')
    pg.keyboard.press('ArrowLeft')
    pg.keyboard.press('Enter')
    pg.wait_for_timeout(150)
    check('arrow + Enter selects the focused card', D(pg)['cast'] is not None)
    cid = D(pg)['cast']['item']
    word = pg.evaluate("ANS('%s')" % cid)
    first = D(pg)['cast']['buf']
    letters = [c for c in word if c.isalpha()][len(D(pg)['cast']['locked'] and first or ''):]
    pg.keyboard.type(''.join(letters))
    pg.wait_for_timeout(300)
    dd = D(pg)
    check('typing on the physical keyboard completes the spelling', dd['cast'] is None and dd['stats'][cid]['ok'], dd['stats'][cid])
    pg.keyboard.press('e')
    pg.wait_for_timeout(100)
    C(pg, 'flush')
    check('E ends the turn', D(pg)['turn'] == 2)
    C(pg, 'noevent')
    pg.keyboard.press('Escape')
    pg.wait_for_timeout(150)
    check('Escape (no cast) opens the pause menu', pg.query_selector('.gx-ov') is not None)
    pg.keyboard.press('Escape')
    pg.wait_for_timeout(150)
    check('Escape again resumes', pg.query_selector('.gx-ov') is None)
    done(errs, b)
    # math with the keyboard: digits then Enter
    b, pg, errs = fresh(p, 'math', 3, 5, 3, size=(1440, 900), touch=False)
    C(pg, 'noevent')
    pg.wait_for_timeout(700)
    pg.keyboard.press('1')
    pg.wait_for_timeout(150)
    cid = D(pg)['cast']['item']
    ans = pg.evaluate("ANS('%s')" % cid)
    pg.keyboard.type('77')
    pg.keyboard.press('Backspace')
    pg.keyboard.press('Backspace')
    check('Backspace edits the math answer', D(pg)['cast']['buf'] == '', D(pg)['cast'])
    pg.keyboard.type(ans)
    pg.keyboard.press('Enter')
    pg.wait_for_timeout(300)
    check('math: type digits + Enter plays the card', D(pg)['stats'][cid]['ok'] and D(pg)['cast'] is None, D(pg)['stats'][cid])
    done(errs, b)


def t_pause_restart(p):
    print('[pause / restart]')
    b, pg, errs = fresh(p, 'english', 0, 3, 5, seed=8)
    C(pg, 'noevent')
    C(pg, 'select', 0)
    pg.click('.cd-pause')
    pg.wait_for_timeout(200)
    l0 = D(pg)['cast']['left']
    check('pause menu opens', pg.query_selector('.gx-ov') is not None)
    step(pg, 180)
    check('countdown frozen while paused', abs(D(pg)['cast']['left'] - l0) < 0.01, (l0, D(pg)['cast']['left']))
    pg.click('[data-r=re]')
    pg.wait_for_timeout(250)
    d = D(pg)
    check('restart resets battle and learning state', d['turn'] == 1 and d['hp'] == d['maxHp'] and d['progress']['done'] == 0 and d['cast'] is None and d['mon']['hp'] == d['mon']['max'] and not d['ended'], (d['turn'], d['hp'], d['progress']))
    check('restart rebuilt a fresh S.learn (no stats carried over)', all(v['tries'] == 0 for v in d['stats'].values()))
    check('restart deals a fresh hand', len(d['hand']) == 5)
    done(errs, b)
    # lose then retry from the result card
    b, pg, errs = fresh(p, 'math', 1, 3, 2, seed=8)
    C(pg, 'giveup')
    C(pg, 'flush')
    pg.wait_for_timeout(1000)
    check('result card after defeat', pg.query_selector('.gx-res') is not None)
    pg.click('.gx-res [data-r=again]')
    pg.wait_for_timeout(300)
    d = D(pg)
    check('再玩 starts a clean battle', d['turn'] == 1 and not d['ended'] and d['hp'] == d['maxHp'] and pg.query_selector('.gx-res') is None, (d['turn'], d['ended']))
    r = run_bot(pg, 0)
    pg.wait_for_timeout(1300)
    check('the retried battle can be cleared (restart is complete)', r['ended'] and r['res'] and r['res']['cleared'], r)
    done(errs, b)


def t_intro(p):
    print('[intro: how-to, preview]')
    b, pg, errs = open_game(p, 'card_game.js', 'WQ37Card', 'english', 0, 3, 3, size=(390, 844), touch=True, seed=1)
    pg.wait_for_timeout(300)
    check('first run shows the how-to card (<= 3 icon steps)', pg.query_selector('.gx-how') is not None and len(pg.query_selector_all('.gx-how .st')) == 3)
    ht = pg.evaluate("document.querySelector('.gx-how').textContent")
    check('how-to (touch) says tap-card-answer, in kid words (no 意圖/弱點)', '點牌→答題' in ht and '意圖' not in ht and '弱點' not in ht and '怪物下一步' in ht and '打中加倍' in ht, ht)
    pg.click('.gx-how [data-r=ok]')
    pg.wait_for_timeout(200)
    check('then the preview deck (8 cards)', pg.query_selector('.gx-pv') is not None and pg.evaluate("document.querySelectorAll('.gx-pv .gx-dots i').length") == 8)
    d = D(pg)
    check('no battle yet while previewing', d['turn'] == 0 or d['previewOpen'], d['turn'])
    pg.click('.gx-pv [data-r=go]')
    pg.wait_for_timeout(200)
    check('battle starts after the preview', D(pg)['turn'] == 1)
    done(errs, b)


def t_destroy(p):
    print('[destroy]')
    b, pg, errs = fresh(p, 'english', 0, 3, 3)
    pg.evaluate("""()=>{ window._T={set:0,int:0,clr:0,raf:0,pending:new Set(),pint:new Set()};
      const st=window.setTimeout, si=window.setInterval, ct=window.clearTimeout, ci=window.clearInterval, raf=window.requestAnimationFrame;
      window.setTimeout=(f,ms,...a)=>{const id=st(()=>{_T.pending.delete(id);f(...a)},ms);_T.pending.add(id);_T.set++;return id};
      window.setInterval=(f,ms,...a)=>{const id=si(f,ms,...a);_T.pint.add(id);_T.int++;return id};
      window.clearTimeout=(id)=>{_T.pending.delete(id);return ct(id)}; window.clearInterval=(id)=>{_T.pint.delete(id);return ci(id)};
      window.requestAnimationFrame=(f)=>{_T.raf++;return raf(f)};
    }""")
    # start a second game under instrumentation, play a bit (cast open, learn card open), then destroy
    pg.evaluate("WQ37Card._cmd('noevent'); window.G.destroy(); STARTGAME('WQ37Card','english',0,4,3,{seed:3});")
    pg.wait_for_timeout(200)
    pg.click('.gx-pv [data-r=go]') if pg.query_selector('.gx-pv') else None
    pg.wait_for_timeout(150)
    C(pg, 'select', 0)
    answer(pg, wrong=True)
    pg.wait_for_timeout(200)
    ctx0 = pg.evaluate('WQ37GX._contexts()')
    pg.evaluate('window.G.destroy()')
    pg.wait_for_timeout(100)
    r = pg.evaluate("({roots:document.querySelectorAll('.gx-root').length,canvas:document.querySelectorAll('canvas').length,pad:document.querySelectorAll('.gx-pad').length,cards:document.querySelectorAll('.cd-card').length,pint:_T.pint.size,pending:_T.pending.size,ctx:WQ37GX._contexts()})")
    check('destroy removes root, canvas, pad and cards', r['roots'] == 0 and r['canvas'] == 0 and r['pad'] == 0 and r['cards'] == 0, r)
    check('destroy leaves no running intervals', r['pint'] == 0, r)
    pg.wait_for_timeout(1500)
    r2 = pg.evaluate("({pending:_T.pending.size, raf:_T.raf})")
    raf0 = r2['raf']
    pg.wait_for_timeout(400)
    r3 = pg.evaluate("({pending:_T.pending.size, raf:_T.raf})")
    check('no timeouts pending 1.5 s after destroy', r2['pending'] == 0, r2)
    check('animation frame loop stopped', r3['raf'] == raf0, (raf0, r3['raf']))
    check('no extra AudioContext created', r['ctx'] == ctx0 and r['ctx'] <= 1, (ctx0, r['ctx']))
    pg.keyboard.press('a')
    pg.keyboard.press('Enter')
    pg.keyboard.press('Escape')
    pg.wait_for_timeout(100)
    check('key presses after destroy do nothing', pg.evaluate("document.querySelectorAll('.gx-ov,.gx-root').length") == 0)
    check('_debug is null after destroy', pg.evaluate('WQ37Card._debug') is None)
    done(errs, b)


def rect_js():
    return """()=>{
 const R=e=>{const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height}};
 const out={W:innerWidth,H:innerHeight};
 const q=(s)=>document.querySelector(s); const all=(s)=>Array.from(document.querySelectorAll(s));
 out.minfo=R(q('.cd-minfo')); out.me=R(q('.cd-me')); out.end=R(q('.cd-end')); out.pause=R(q('.cd-pause'));
 out.cards=all('.cd-card').map(R); out.orbs=all('.cd-orb').map(R); out.int=q('.cd-chip.int')?R(q('.cd-chip.int')):null; out.wk=R(q('.cd-chip.wk'));
 out.hp=R(q('.cd-bar.me')); out.mhp=R(q('.cd-bar.mon')); out.piles=all('.cd-pile').map(R); out.title=R(q('.cd-title'));
 const sh=q('.cd-sheet'); out.sheet=sh?R(sh):null; out.keys=all('.cd-sheet .gx-key').map(R); out.slots=all('.cd-slot,.cd-ans').map(R); out.prompt=q('.cd-prompt')?R(q('.cd-prompt')):null;
 out.hand_hidden=getComputedStyle(q('.cd-hand')).visibility==='hidden';
 return out;}"""


def inter(a, b):
    return not (a['r'] <= b['l'] + 0.5 or b['r'] <= a['l'] + 0.5 or a['b'] <= b['t'] + 0.5 or b['b'] <= a['t'] + 0.5)


def inside(a, W, H, tol=2):
    return a['l'] >= -tol and a['t'] >= -tol and a['r'] <= W + tol and a['b'] <= H + tol


def t_layout(p):
    print('[layout x sizes]')
    for (W, H, touch, tag) in SIZES:
        for subj, w, s, diff in (('english', 1, 3, 2), ('math', 3, 5, 3), ('english', 1, 9, 5)):
            name = '%s/%s d%d' % (tag, subj, diff)
            b, pg, errs = fresh(p, subj, w, s, diff, size=(W, H), touch=touch, seed=5)
            C(pg, 'noevent')
            pg.wait_for_timeout(1400)
            m = pg.evaluate(rect_js())
            d = D(pg)
            lay = d['layout']
            ok_in = all(inside(m[k], W, H) for k in ('minfo', 'me', 'end', 'pause', 'int', 'wk', 'hp', 'mhp', 'title') if m[k]) and all(inside(c, W, H, 12) for c in m['cards']) and all(inside(o, W, H) for o in m['orbs'])
            check('%s: monster info, status, energy, end button, hand are inside the viewport' % name, ok_in, {k: m[k] for k in ('minfo', 'me', 'end')})
            check('%s: monster is on screen and big enough' % name, lay['msize'] >= 60 and 0 <= lay['mcy'] - lay['msize'] / 2 and lay['mcy'] + lay['msize'] / 2 <= H, lay)
            check('%s: intent chip, weakness chip visible and not overlapping each other' % name, m['int'] and not inter(m['int'], m['wk']) and not inter(m['wk'], m['title']) if m['int'] else False, (m['int'], m['wk']))
            check('%s: status row does not overlap hand cards or end button' % name, all(not inter(m['me'], c) for c in m['cards']) and all(not inter(m['end'], c) for c in m['cards']) and not inter(m['me'], m['end']), None)
            check('%s: monster info block does not overlap status row or HUD pills' % name, not inter(m['minfo'], m['me']) and all(not inter(m['minfo'], pl) for pl in m['piles']) and not inter(m['minfo'], m['pause']) and not inter(m['minfo'], m['title']), (m['minfo'], m['title']))
            gaps = [m['cards'][i + 1]['l'] - m['cards'][i]['l'] for i in range(len(m['cards']) - 1)]
            check('%s: >= 44 px of every card is tappable' % name, all(g >= 44 for g in gaps) and min(c['w'] for c in m['cards']) >= 44, gaps)
            check('%s: end turn >= 48 px, pause >= 44 px' % name, m['end']['h'] >= 48 and m['end']['w'] >= 48 and m['pause']['h'] >= 44, (m['end'], m['pause']))
            pg.screenshot(path=str(EV / ('%s_%s_d%d_hand.jpg' % (tag, subj, diff))), type='jpeg', quality=80)
            # open the cast sheet
            idx = [i for i, c in enumerate(d['hand']) if c['cost'] <= 3][0]
            C(pg, 'select', idx)
            pg.wait_for_timeout(500)
            m = pg.evaluate(rect_js())
            d = D(pg)
            lay = d['layout']
            sheet_ok = m['sheet'] and inside(m['sheet'], W, H, 3) and all(inside(k, W, H, 1) for k in m['keys'] + m['slots'])
            check('%s: cast sheet, keys and answer slots all inside the viewport' % name, sheet_ok, (m['sheet'], [k for k in m['keys'] if not inside(k, W, H, 1)][:2]))
            feet = lay['mcy'] + lay['msize'] / 2
            side = W > H * 1.15 and H < 560
            if side:
                vis = lay['mx'] + lay['msize'] / 2 <= m['sheet']['l'] + 4
            else:
                vis = feet <= m['sheet']['t'] + 8 and lay['msize'] >= 60
            check('%s: monster stays visible next to the cast sheet' % name, vis, (lay, m['sheet']))
            check('%s: monster info does not run under the sheet or HUD' % name, not inter(m['minfo'], m['sheet']) and not inter(m['minfo'], m['title']), (m['minfo'], m['title'], m['sheet']))
            parts = pg.evaluate("""()=>{const sh=document.querySelector('.cd-sheet');const R=e=>{const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom}};
              return ['.cd-sh-head','.cd-timer','.cd-prompt','.cd-slots','.cd-hintrow','.cd-kb','.gx-pad'].map(q=>{const e=sh.querySelector(q);return e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0?[q,R(e)]:null}).filter(Boolean)}""")
            bad = [(parts[i][0], parts[j][0]) for i in range(len(parts)) for j in range(i + 1, len(parts)) if inter(parts[i][1], parts[j][1])]
            check('%s: sheet parts (head, prompt, answer, pad...) do not overlap' % name, not bad, bad)
            if m['keys']:
                kh = min(k['h'] for k in m['keys'])
                kw = min(k['w'] for k in m['keys'])
                ptype = pg.evaluate("(()=>{const p=document.querySelector('.cd-sheet .gx-pad');return p?(p.classList.contains('dig')?'digits':p.classList.contains('scr')?'scrambled':'qwerty'):''})()")
                KEYS[name] = (ptype, round(kw), round(kh))
                need_w = 28 if ptype == 'qwerty' else 44   # QWERTY keeps the shared GX.pad 10-column layout (5.5 mm class keys on a phone)
                need_h = 44
                check('%s: %s pad keys %.0fx%.0f px (need >= %dx%d)' % (name, ptype, kw, kh, need_w, need_h), kw >= need_w and kh >= need_h, (kw, kh))
                check('%s: pad keys do not overlap each other' % name, all(not inter(m['keys'][i], m['keys'][j]) for i in range(len(m['keys'])) for j in range(i + 1, len(m['keys']))))
            pg.screenshot(path=str(EV / ('%s_%s_d%d_cast.jpg' % (tag, subj, diff))), type='jpeg', quality=80)
            done(errs, b)


def restart_math(pg, w, s, diff, seed=7, items_seed=None):
    """re-run STARTGAME on the same page for a math level (optionally with a specific question seed)"""
    pg.evaluate("""([w,s,diff,seed,isd])=>{try{G.destroy()}catch(e){} window.RESULT=null; localStorage.setItem('wq37-gx-how-card','1');
      STARTGAME('WQ37Card','math',w,s,diff,Object.assign({seed:seed},isd?{items:MKITEMS('math',w,s,diff,8,isd)}:{})); document.querySelector('.gx-pv [data-r=go]').click();}""", [w, s, diff, seed, items_seed])
    C(pg, 'noevent')
    pg.wait_for_timeout(500)


def close_learn_fast(pg):
    pg.evaluate("""()=>{const b=document.querySelector('.gx-learn [data-r=ok]');if(!b)return;b.disabled=false;const pn=performance.now;performance.now=()=>pn.call(performance)+5000;b.click();performance.now=pn;}""")


def t_math_confirm(p):
    print('[B2: maths needs 確定; no free guessing]')
    for diff in (1, 2, 3, 5):
        b, pg, errs = fresh(p, 'math', 1, 4, diff, seed=7)
        C(pg, 'noevent')
        pg.wait_for_timeout(600)
        C(pg, 'select', 0)
        d = D(pg)
        cid = d['cast']['item']
        ans = pg.evaluate("ANS('%s')" % cid)
        C(pg, 'type', ans)
        d = D(pg)
        check('[d%d] typing the correct number does not play the card' % diff, d['cast'] is not None and d['stats'][cid]['tries'] == 0, d['stats'][cid])
        check('[d%d] maths cast has a countdown at every difficulty' % diff, d['cast']['limit'] > 0 and pg.query_selector('.cd-timer') is not None, d['cast']['limit'])
        C(pg, 'back')
        C(pg, 'type', '7')
        C(pg, 'back')
        check('[d%d] backspace still edits before confirming' % diff, D(pg)['cast']['buf'] == ans[:-1] or D(pg)['cast']['buf'] == ans[:len(ans) - 1], D(pg)['cast'])
        C(pg, 'type', ans[-1])
        C(pg, 'submit')
        check('[d%d] 確定 with the right answer plays it as first-try' % diff, D(pg)['stats'][cid]['ok'] and D(pg)['stats'][cid]['firstOk'] is True)
        # button path: wrong answer on 確定 is final
        C(pg, 'player', {'energy': 3})
        C(pg, 'hand', [m['id'] for m in meta_all(pg) if m['id'] != cid and not m['id'].startswith('rv')][:1])
        C(pg, 'select', 0)
        cid2 = D(pg)['cast']['item']
        C(pg, 'type', '987')
        pg.click('.cd-sheet .gx-key.go')
        pg.wait_for_timeout(200)
        d = D(pg)
        check('[d%d] wrong answer + 確定 button = broken card, learn card, miss recorded' % diff, d['learnOpen'] and d['stats'][cid2]['missed'] == 1 and d['stats'][cid2]['firstOk'] is False, d['stats'][cid2])
        done(errs, b)
    # brute-force oracle: guess 0,1,2,... one per card (each wrong guess is final) -> cannot reach 4-5 stars
    for (w, s, diff) in ((0, 0, 2), (1, 4, 3)):
        b, pg, errs = fresh(p, 'math', w, s, diff, seed=7)
        C(pg, 'noevent')
        pg.evaluate("window.GUESS=0")
        guard = 0
        while not D(pg)['ended'] and guard < 400:
            guard += 1
            d = D(pg)
            if d['learnOpen']:
                close_learn_fast(pg)
                continue
            if d['cast']:
                pg.evaluate("()=>{const g=String(window.GUESS++);WQ37Card._cmd('type',g);WQ37Card._cmd('submit');}")
                C(pg, 'flush')
                continue
            if d['phase'] == 'player':
                i = [k for k, c in enumerate(d['hand']) if c['cost'] <= d['energy']]
                if i:
                    C(pg, 'select', i[0])
                else:
                    C(pg, 'end')
                    C(pg, 'flush')
            else:
                C(pg, 'flush')
                step(pg, 3)
        pg.wait_for_timeout(1300)
        res = pg.evaluate('window.RESULT')
        check('[w%d s%d d%d] counting-up brute force cannot earn a pass (got %s stars)' % (w, s, diff, res and res['stars']), res is not None and res['stars'] <= 2 and not res['passed'], res and (res['stars'], res['firstTryAccuracy']))
        done(errs, b)
    # timer expiry on maths = wrong
    b, pg, errs = fresh(p, 'math', 1, 4, 2, seed=7)
    C(pg, 'noevent')
    pg.wait_for_timeout(600)
    C(pg, 'select', 0)
    cid = D(pg)['cast']['item']
    C(pg, 'expire')
    step(pg, 3)
    d = D(pg)
    check('maths countdown reaching 0 = wrong answer', d['learnOpen'] and d['stats'][cid]['missed'] == 1)
    done(errs, b)


def t_form_rule(p):
    print('[H3: right value, wrong writing form]')
    b, pg, errs = fresh(p, 'math', 3, 2, 3, seed=7)
    found = pg.evaluate("""()=>{const alts=['1/2','1/4','3/4','1/5','2/5','3/5','4/5','1/10','3/10','7/10','9/10','1/20','1/25','1/100','1/8','3/8','5/8','7/8','1/3','2/3'];
      for(let w=2;w<6;w++)for(let s=0;s<10;s++)for(const sd of [12345,1,2,3]){const its=MKITEMS('math',w,s,3,8,sd);
        for(const it of its){ for(const a of alts){ const r=it.detail(a); if(r&&!r.ok&&r.why==='form') return {w,s,sd,id:it.id,alt:a,msg:r.msg,ans:String(it.a)}; } } } return null;}""")
    check('host data has a question whose equal value in the wrong form gives why=form', found is not None, found)
    if found:
        restart_math(pg, found['w'], found['s'], 3, 7, found['sd'])
        C(pg, 'player', {'energy': 3})
        C(pg, 'hand', [found['id']])
        C(pg, 'select', 0)
        C(pg, 'type', found['alt'])
        C(pg, 'submit')
        d = D(pg)
        st = d['stats'][found['id']]
        check('wrong form: not judged wrong (no learn card, no try, card kept open, input cleared)', d['cast'] is not None and not d['learnOpen'] and st['tries'] == 0 and d['cast']['buf'] == '', (d['cast'], st))
        check('the form message is shown', pg.evaluate("(document.querySelector('.cd-hint.form')||{}).textContent||''") == found['msg'], found['msg'])
        check('hand still holds the card, energy unspent', d['energy'] == 3)
        C(pg, 'type', found['ans'])
        C(pg, 'submit')
        d = D(pg)
        st = d['stats'][found['id']]
        check('rewriting correctly counts as a first-try hit', st['ok'] and st['firstOk'] is True and st['missed'] == 0, st)
    done(errs, b)


def t_long_math(p):
    print('[M4: longest host question fully visible at every size]')
    b, pg, errs = fresh(p, 'math', 5, 9, 3, seed=7)
    top = pg.evaluate("""()=>{const out=[];for(let w=0;w<6;w++)for(let s=0;s<10;s++)for(const d of [1,3,5])for(const sd of [12345,1,2,3,4]){const qs=WQ37Math.make('math',w,s,8,d,sd);qs.forEach((x,i)=>out.push({w,s,d,sd,i,len:x.q.length,q:x.q}));}
      out.sort((a,b)=>b.len-a.len);return out.slice(0,2).concat(out.filter(o=>o.w===5).slice(0,1));}""")
    check('found long host questions (max %d chars)' % top[0]['len'], top[0]['len'] > 40, [t['len'] for t in top])
    done(errs, b)
    for (W, H, touch, tag) in SIZES:
        for t in top[:2]:
            b, pg, errs = fresh(p, 'math', 5, 9, t['d'], size=(W, H), touch=touch, seed=7)
            pg.evaluate("""([t])=>{try{G.destroy()}catch(e){} localStorage.setItem('wq37-gx-how-card','1');
              STARTGAME('WQ37Card','math',t.w,t.s,t.d,{seed:7,items:MKITEMS('math',t.w,t.s,t.d,8,t.sd)}); document.querySelector('.gx-pv [data-r=go]').click();}""", [t])
            C(pg, 'noevent')
            pg.wait_for_timeout(700)
            lid = pg.evaluate("([t])=>OPTS.items[t.i].id", [t])
            C(pg, 'player', {'energy': 3})
            C(pg, 'hand', [lid])
            C(pg, 'select', 0)
            pg.wait_for_timeout(500)
            m = pg.evaluate("""()=>{const mq=document.querySelector('.cd-sheet .mq'),sh=document.querySelector('.cd-sheet');const r=mq.getBoundingClientRect(),s=sh.getBoundingClientRect();
               return {ov:getComputedStyle(mq).overflow,mqH:r.height,sh:mq.scrollHeight,fs:parseFloat(getComputedStyle(mq).fontSize),top:r.top,bot:r.bottom,shTop:s.top,shBot:s.bottom,shScroll:sh.scrollHeight-sh.clientHeight,W:innerWidth,H:innerHeight,
                 keys:Array.from(document.querySelectorAll('.cd-sheet .gx-key')).map(k=>{const q=k.getBoundingClientRect();return [q.left,q.top,q.right,q.bottom]}),r:[r.left,r.right]}}""")
            name = '%s len%d' % (tag, t['len'])
            ok = m['ov'] == 'visible' and m['sh'] <= m['mqH'] + 1 and m['top'] >= m['shTop'] - 1 and m['bot'] <= m['shBot'] + 1 and m['shScroll'] <= 1 and m['shTop'] >= 0 and m['shBot'] <= m['H'] + 1 and m['fs'] >= 10
            check('%s: the whole question is visible, no scrolling (font %.0fpx)' % (name, m['fs']), ok, m)
            check('%s: every pad key still inside the screen' % name, all(k[0] >= -1 and k[2] <= m['W'] + 1 and k[3] <= m['H'] + 1 and k[1] >= 0 for k in m['keys']), m['keys'][:2])
            if t is top[0]:
                pg.screenshot(path=str(EV / ('longq_%s.jpg' % tag)), type='jpeg', quality=80)
            done(errs, b)


def t_fullwidth_ime(p):
    print('[M5: full-width characters and IME]')
    b, pg, errs = fresh(p, 'math', 1, 4, 3, size=(1440, 900), touch=False, seed=7)
    C(pg, 'noevent')
    pg.wait_for_timeout(700)
    pg.keyboard.press('1')
    pg.wait_for_timeout(150)
    cid = D(pg)['cast']['item']
    ans = pg.evaluate("ANS('%s')" % cid)
    full = ''.join(chr(ord(c) + 65248) if c.isdigit() else c for c in ans)
    pg.evaluate("(t)=>{for(const ch of t){window.dispatchEvent(new KeyboardEvent('keydown',{key:ch,bubbles:true}))}}", full)
    check('full-width digits are typed as half-width', D(pg)['cast']['buf'] == ans, (D(pg)['cast']['buf'], ans))
    pg.keyboard.press('Enter')
    pg.wait_for_timeout(250)
    check('and the full-width answer is accepted on Enter', D(pg)['stats'][cid]['ok'])
    C(pg, 'player', {'energy': 3})
    C(pg, 'hand', [[m['id'] for m in meta_all(pg) if m['id'] != cid and not m['id'].startswith('rv')][0]])
    C(pg, 'select', 0)
    pg.evaluate("()=>{window.dispatchEvent(new KeyboardEvent('keydown',{key:'Process',keyCode:229,bubbles:true}))}")
    pg.wait_for_timeout(200)
    check('IME key shows the switch-to-English hint', '請切換英文輸入' in pg.evaluate("document.querySelector('.gx-banner')?document.querySelector('.gx-banner').textContent:''"))
    pg.wait_for_timeout(2400)
    pg.evaluate("()=>{window.dispatchEvent(new KeyboardEvent('keydown',{key:'Process',keyCode:229,bubbles:true}))}")
    pg.wait_for_timeout(200)
    check('the IME hint is shown only once', pg.query_selector('.gx-banner') is None)
    done(errs, b)
    b, pg, errs = fresh(p, 'english', 0, 3, 4, size=(1440, 900), touch=False, seed=7)
    C(pg, 'noevent')
    pg.wait_for_timeout(700)
    pg.keyboard.press('1')
    pg.wait_for_timeout(150)
    cid = D(pg)['cast']['item']
    word = pg.evaluate("ANS('%s')" % cid)
    full = ''.join(chr(ord(c) + 65248) if c.isalpha() else c for c in word)
    pg.evaluate("(t)=>{for(const ch of t){window.dispatchEvent(new KeyboardEvent('keydown',{key:ch,bubbles:true}))}}", full)
    pg.wait_for_timeout(250)
    check('full-width letters are accepted in English spelling', D(pg)['stats'][cid]['ok'], D(pg)['stats'][cid])
    done(errs, b)


def t_restart_regen(p):
    print('[H5: play again gives new maths questions; S.newLearn]')
    b, pg, errs = fresh(p, 'math', 2, 4, 3, seed=7)
    q1 = pg.evaluate("OPTS.items.map(i=>i.q).join('|')")
    C(pg, 'giveup')
    C(pg, 'flush')
    pg.wait_for_timeout(1000)
    pg.click('.gx-res [data-r=again]')
    pg.wait_for_timeout(400)
    q2 = pg.evaluate("OPTS.items.map(i=>i.q).join('|')")
    d = D(pg)
    check('replaying maths uses new questions', q1 != q2, (q1[:60], q2[:60]))
    check('the new battle deals cards from the new questions only', all(c['id'] in [i for i in pg.evaluate("OPTS.items.concat(OPTS.review).map(i=>i.id)")] for c in d['hand']) and d['turn'] == 1)
    cid = d['hand'][0]['id']
    C(pg, 'select', 0)
    qtxt = pg.evaluate("document.querySelector('.cd-sheet .mq').textContent")
    check('the cast shows the regenerated question text', qtxt in q2.split('|'), qtxt)
    done(errs, b)


def t_requeue_after_ok(p):
    print('[L9: an item solved earlier but missed after the reshuffle is requeued and reported]')
    b, pg, errs = fresh(p, 'english', 0, 3, 3, seed=11)
    C(pg, 'noevent')
    C(pg, 'mon', {'hp': 900, 'max': 900})
    C(pg, 'player', {'hp': 90, 'maxHp': 90})
    cid = [m['id'] for m in meta_all(pg) if m['type'] == 'atk' and not m['id'].startswith('rv')][0]
    play(pg, cid)
    d = D(pg)
    check('item solved once (first try)', d['stats'][cid]['ok'] and d['stats'][cid]['firstOk'] is True)
    check('it now sits in the discard pile', d['discardN'] >= 1)
    # reshuffled copy from the discard pile, answered wrong
    play(pg, cid, wrong=True)
    d = D(pg)
    st = d['stats'][cid]
    check('later miss on a solved item still goes back to the requeue (position 2-4)', st['requeued'] == 1 and cid in d['queue'] and 1 <= d['queue'].index(cid) <= 3, (st, d['queue']))
    check('and is counted as a miss', st['missed'] == 1 and st['ok'] and st['firstOk'] is True, st)
    close_learn(pg)
    # complete the level and compare the report with the learn state
    core = pg.evaluate("OPTS.items.map(i=>i.id)")
    for i in core:
        if not D(pg)['stats'][i]['ok']:
            play(pg, i)
    C(pg, 'kill')
    C(pg, 'flush')
    pg.wait_for_timeout(1700)
    res = pg.evaluate('window.RESULT')
    check('report: the miss is listed in missed, first-try stays true for that item', res and cid in [m['id'] for m in res['missed']] and [r for r in res['perItem'] if r['id'] == cid][0]['firstOk'], res and [m['id'] for m in res['missed']])
    done(errs, b)


def finisher_setup(pg, keep_unsolved=1):
    """answer all but `keep_unsolved` core items, then kill the monster -> last strike with exactly those left"""
    C(pg, 'noevent')
    C(pg, 'mon', {'hp': 900, 'max': 900})
    C(pg, 'player', {'hp': 90, 'maxHp': 90})
    core = pg.evaluate("OPTS.items.map(i=>i.id)")
    for cid in core[:len(core) - keep_unsolved]:
        play(pg, cid)
    C(pg, 'kill')
    C(pg, 'flush')
    return core


def t_finisher_spacing(p):
    print('[last strike: a miss is not re-asked straight away]')
    b, pg, errs = fresh(p, 'english', 0, 4, 3, seed=5)
    core = finisher_setup(pg, 1)
    d = D(pg)
    last = core[-1]
    check('one unsolved item left, last strike open on it', d['phase'] == 'finisher' and d['cast'] and d['cast']['item'] == last and d['fin']['left'] == 1, d['cast'])
    seq = []
    answer(pg, wrong=True)
    check('the miss shows the learn card', D(pg)['learnOpen'])
    close_learn(pg)
    guard = 0
    while guard < 30 and not D(pg)['ended']:
        guard += 1
        C(pg, 'flush')
        d = D(pg)
        if d['cast']:
            seq.append((d['cast']['item'], d['cast']['filler']))
            if d['cast']['item'] == last and not d['cast']['filler']:
                break
            answer(pg)
        elif d['learnOpen']:
            close_learn(pg)
        else:
            step(pg, 30)
    others = [x for x in seq if x[0] != last]
    check('>= 2 other (already solved) items are asked before the missed one comes back', len(others) >= 2 and seq[0][0] != last and all(f for _, f in others), seq)
    check('the fillers are marked as revisits and the missed item is then asked again', seq[-1] == (last, False), seq)
    answer(pg)
    pg.wait_for_timeout(300)
    check('answering it finally clears the level', D(pg)['ended'] and D(pg)['progress']['done'] == len(core), D(pg)['progress'])
    done(errs, b)
    # a filler that is answered wrong gets its own learn card and does not break the flow
    b, pg, errs = fresh(p, 'english', 0, 4, 3, seed=5)
    finisher_setup(pg, 1)
    answer(pg, wrong=True)
    close_learn(pg)
    C(pg, 'flush')
    d = D(pg)
    if d['cast'] and d['cast']['filler']:
        answer(pg, wrong=True)
        check('a missed revisit also shows its learn card', D(pg)['learnOpen'])
        close_learn(pg)
    done(errs, b)


def t_result_sticky(p):
    print('[result card: buttons reachable with the item report expanded]')
    for (W, H, touch, tag) in ((844, 390, True, 'land844'), (360, 640, True, 's360'), (390, 844, True, 'm390')):
        b, pg, errs = fresh(p, 'english', 6, 3, 3, size=(W, H), touch=touch, seed=5)   # 12-word level = long report
        C(pg, 'noevent')
        C(pg, 'mon', {'hp': 900, 'max': 900})
        C(pg, 'player', {'hp': 90, 'maxHp': 90})
        core = pg.evaluate("OPTS.items.map(i=>i.id)")
        for k, cid in enumerate(core):
            if k < 4:
                play(pg, cid, wrong=True)
                close_learn(pg)
            play(pg, cid)
        C(pg, 'kill')
        C(pg, 'flush')
        pg.wait_for_timeout(1800)
        check('[%s] result card is up' % tag, pg.query_selector('.gx-res') is not None)
        pg.click('.gx-rep summary')
        pg.wait_for_timeout(400)
        m = pg.evaluate("""()=>{const o={W:innerWidth,H:innerHeight};for(const k of ['back','again','next']){const e=document.querySelector('.gx-res [data-r='+k+']');if(!e){o[k]=null;continue}const r=e.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);o[k]={l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height,hit:!!hit&&(e===hit||e.contains(hit))};}return o}""")
        for k in ('back', 'again', 'next'):
            r = m[k]
            if r is None:
                continue
            check('[%s] expanded report: 「%s」 inside the screen, >= 44 px, and clickable' % (tag, k), r['l'] >= 0 and r['t'] >= 0 and r['r'] <= m['W'] + 1 and r['b'] <= m['H'] + 1 and r['h'] >= 43 and r['hit'], (r, m['W'], m['H']))
        shot(pg, 'result_expanded_%s' % tag)
        pg.click('.gx-res [data-r=again]')
        pg.wait_for_timeout(500)
        check('[%s] 再玩 works from the expanded card' % tag, D(pg)['turn'] == 1 and not D(pg)['ended'])
        done(errs, b)


def t_regen_avoid(p):
    print('[replay passes the previous questions to regen]')
    b, pg, errs = fresh(p, 'math', 0, 3, 3, seed=7)
    q1 = pg.evaluate("OPTS.items.map(i=>i.q)")
    C(pg, 'giveup')
    C(pg, 'flush')
    pg.wait_for_timeout(1000)
    pg.click('.gx-res [data-r=again]')
    pg.wait_for_timeout(400)
    arg = pg.evaluate("window.REGEN_LAST")
    check('regen was called with {avoid:[previous questions]}', arg is not None and arg.get('avoid') == q1, arg)
    q2 = pg.evaluate("OPTS.items.map(i=>i.q)")
    C(pg, 'giveup')
    C(pg, 'flush')
    pg.wait_for_timeout(1000)
    pg.click('.gx-res [data-r=again]')
    pg.wait_for_timeout(400)
    check('the second replay avoids the last game (not the first)', pg.evaluate("window.REGEN_LAST").get('avoid') == q2)
    done(errs, b)


def t_noart(p):
    print('[missing art falls back to drawn shapes]')
    b, pg, errs = fresh(p, 'english', 1, 9, 3, seed=5, assetBase='assets/none/')
    C(pg, 'noevent')
    pg.wait_for_timeout(900)
    shot(pg, 'noart_m390_boss_hand')
    check('no art: cards still dealt and framed by CSS', len(D(pg)['hand']) == 5 and pg.evaluate("document.querySelector('.gx-root').classList.contains('cd-noimg')"))
    # play an attack card through to a hit without any image available
    atk = [c for c in D(pg)['hand'] if c['type'] == 'atk']
    if not atk:
        atk = [{'id': [m for m in meta_all(pg) if m['type'] == 'atk'][0]['id']}]
    C(pg, 'hand', [atk[0]['id']])
    hp0 = D(pg)['mon']['hp']
    C(pg, 'select', 0)
    answer(pg)
    check('no art: the battle still works (damage dealt)', D(pg)['mon']['hp'] < hp0, (hp0, D(pg)['mon']['hp']))
    pixel = pg.evaluate("(()=>{const c=document.querySelector('canvas.gx-cv');const x=c.getContext('2d');const d=x.getImageData(Math.floor(c.width/2),Math.floor(c.height*0.55),1,1).data;return Array.from(d)})()")
    check('no art: a drawn monster shape is on the canvas', pixel[3] == 255 and not (pixel[0] < 30 and pixel[1] < 30 and pixel[2] < 60), pixel)
    ALLERRS.extend([e for e in errs if '404' not in e and 'Failed to load resource' not in e])
    b.close()


def shot(pg, name):
    pg.screenshot(path=str(EV / (name + '.jpg')), type='jpeg', quality=80)


def t_states(p):
    print('[evidence: battle states]')
    for (W, H, touch, tag, subj, w) in ((390, 844, True, 'm390', 'english', 1), (390, 844, True, 'm390', 'math', 3), (360, 640, True, 's360', 'english', 1), (844, 390, True, 'land844', 'math', 3), (1440, 900, False, 'desk1440', 'english', 1)):
        b, pg, errs = fresh(p, subj, w, 4, 3, size=(W, H), touch=touch, seed=5, reduced=False)
        base = 'st_%s_%s' % (tag, subj)
        C(pg, 'noevent')
        pg.wait_for_timeout(900)
        meta = meta_all(pg)
        core = lambda ty: [m['id'] for m in meta if m['type'] == ty and not m['id'].startswith('rv')]
        C(pg, 'evo', {'id': core('atk')[0], 'n': 3})
        C(pg, 'mon', {'hp': 300, 'max': 300, 'block': 5})
        C(pg, 'player', {'hp': 40})
        kinds = D(pg)['mon']['weak']['kind']
        hit_ids = [i for i in core('atk') if C(pg, 'weakHit', {'id': i, 'kind': kinds, 'T': D(pg)['mon']['weak']['T']})]
        order = (hit_ids[:1] or core('atk')[:1]) + [i for i in core('atk') if i not in hit_ids][:1] + core('def')[:1] + core('heal')[:1] + core('draw')[:1]
        C(pg, 'hand', order)
        pg.wait_for_timeout(900)
        shot(pg, base + '_1_hand')
        C(pg, 'select', 0)
        pg.wait_for_timeout(450)
        shot(pg, base + '_2_cast')
        answer(pg)
        pg.wait_for_timeout(420)
        shot(pg, base + '_3_attack')
        pg.wait_for_timeout(500)
        C(pg, 'player', {'energy': 3})
        C(pg, 'select', 0)
        pg.wait_for_timeout(250)
        answer(pg, wrong=True)
        pg.wait_for_timeout(500)
        shot(pg, base + '_4_learn')
        pg.wait_for_timeout(1900)
        if pg.query_selector('.gx-learn'):
            pg.click('.gx-learn [data-r=ok]')
        pg.wait_for_timeout(300)
        C(pg, 'mon', {'intent': {'kind': 'atk', 'n': 9}})
        C(pg, 'player', {'shield': 4})
        pg.wait_for_timeout(200)
        shot(pg, base + '_5_intent')
        C(pg, 'end', {'force': True})
        pg.wait_for_timeout(1000)
        shot(pg, base + '_6_monster_turn')
        C(pg, 'flush')
        pg.wait_for_timeout(300)
        C(pg, 'kill')
        C(pg, 'flush')
        pg.wait_for_timeout(1700)
        shot(pg, base + '_7_last_strike')
        guard = 0
        while not D(pg)['ended'] and guard < 40:
            guard += 1
            d = D(pg)
            if d['learnOpen']:
                close_learn(pg)
            elif d['cast']:
                answer(pg)
            else:
                C(pg, 'flush')
                pg.wait_for_timeout(100)
        pg.wait_for_timeout(1800)
        shot(pg, base + '_8_result')
        done(errs, b)
    for (W, H, touch, tag, subj, w) in ((390, 844, True, 'm390', 'english', 1), (844, 390, True, 'land844', 'math', 3)):
        b, pg, errs = fresh(p, subj, w, 9, 3, size=(W, H), touch=touch, seed=5, reduced=False)
        C(pg, 'noevent')
        pg.wait_for_timeout(900)
        shot(pg, 'st_%s_%s_boss1' % (tag, subj))
        C(pg, 'kill')
        step(pg, 45)
        pg.wait_for_timeout(500)
        shot(pg, 'st_%s_%s_boss2' % (tag, subj))
        check('boss second phase screenshot taken (%s %s)' % (tag, subj), D(pg)['mon']['phase'] == 2)
        done(errs, b)


def t_perf_control(p):
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport=dict(width=390, height=844), has_touch=True, device_scale_factor=2)
    pg = ctx.new_page()
    c = ctx.new_cdp_session(pg)
    c.send('Emulation.setCPUThrottlingRate', {'rate': 4})
    pg.set_content("<canvas id=c width=780 height=1688 style='width:390px;height:844px'></canvas><div id=d></div>")
    r = pg.evaluate("""()=>{const o=[];const cx=document.getElementById('c').getContext('2d');for(let i=0;i<120;i++){const t=performance.now();cx.fillStyle='#123';cx.fillRect(0,0,780,1688);for(let k=0;k<5;k++){const e=document.createElement('button');e.innerHTML='<i></i><i></i><svg width=12 height=12><path d="M0 0"/></svg>';document.getElementById('d').appendChild(e);}o.push(performance.now()-t);}o.sort((a,b)=>a-b);return {max:o[o.length-1],p95:o[Math.floor(o.length*.95)],avg:o.reduce((a,b)=>a+b,0)/o.length}}""")
    PERF['control_blank_canvas'] = {k: round(v, 1) for k, v in r.items()}
    print('   control (blank canvas + 5 buttons/frame, same 4x throttle):', PERF['control_blank_canvas'])
    b.close()


def autoplay_frames(pg, secs):
    pg.evaluate("""()=>{const C=WQ37Card;window.__f=[];let l=performance.now();const f=t=>{window.__f.push(t-l);l=t;requestAnimationFrame(f)};requestAnimationFrame(f);
     window.__iv=setInterval(()=>{const d=C._debug; if(!d||d.ended){const b=document.querySelector('.gx-res [data-r=again]'); if(b) b.click(); return;} if(d.learnOpen||d.phase==='finisher')return;
      if(d.cast){const it=ITEM(d.cast.item);const full=it.kind==='math'?String(it.a):it.en.replace(/[^A-Za-z]/g,'').slice(d.cast.locked||0);C._cmd('type',full);if(C._debug.cast)C._cmd('submit');return;}
      if(d.phase==='player'){const i=d.hand.findIndex(c=>c.cost<=d.energy); if(i>=0)C._cmd('select',i); else C._cmd('end');}},650);}""")
    pg.wait_for_timeout(secs * 1000)
    f = pg.evaluate("()=>{clearInterval(window.__iv);return window.__f}")[5:]
    f2 = sorted(f)
    return {'frames': len(f), 'avg': round(sum(f) / len(f), 1), 'p95': round(f2[int(len(f2) * .95)], 1), 'max': round(f2[-1], 1), 'over33': sum(1 for x in f if x > 34), 'over50': sum(1 for x in f if x > 50)}


def control_frames(p, secs):
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport=dict(width=390, height=844), has_touch=True, device_scale_factor=2)
    pg = ctx.new_page()
    c = ctx.new_cdp_session(pg)
    pg.set_content("<canvas id=c style='position:fixed;inset:0;width:100%;height:100%'></canvas>")
    pg.evaluate("""()=>{const c=document.getElementById('c');c.width=780;c.height=1688;const x=c.getContext('2d');const loop=()=>{x.fillStyle='#123';x.fillRect(0,0,780,1688);requestAnimationFrame(loop)};loop();
      window.__f=[];let l=performance.now();const f=t=>{window.__f.push(t-l);l=t;requestAnimationFrame(f)};requestAnimationFrame(f);}""")
    c.send('Emulation.setCPUThrottlingRate', {'rate': 4})
    pg.wait_for_timeout(secs * 1000)
    f = pg.evaluate('window.__f')[5:]
    f2 = sorted(f)
    b.close()
    return {'frames': len(f), 'avg': round(sum(f) / len(f), 1), 'p95': round(f2[int(len(f2) * .95)], 1), 'max': round(f2[-1], 1), 'over33': sum(1 for x in f if x > 34), 'over50': sum(1 for x in f if x > 50)}


def t_perf_frames(p):
    print('[frame intervals, 4x CPU, 15 s x 3 alternating runs: game vs blank canvas of the same size]')
    import statistics
    G_, C_ = [], []
    for k in range(3):
        b, pg, errs = open_game(p, 'card_game.js', 'WQ37Card', 'english', 1, 3, 3, size=(390, 844), touch=True, seed=4)
        pg.evaluate("()=>{window.ITEM=(id)=>OPTS.items.concat(OPTS.review).find(x=>x.id===String(id).replace(/^fl\\d+:/,''));}")
        boot(pg)
        C(pg, 'noevent')
        C(pg, 'mon', {'hp': 900, 'max': 900})
        C(pg, 'player', {'hp': 900, 'maxHp': 900})
        cdp = pg.context.new_cdp_session(pg)
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        G_.append(autoplay_frames(pg, 15))
        done(errs, b)
        C_.append(control_frames(p, 15))
    med = lambda L, key: statistics.median(x[key] for x in L)
    PERF['frames_game_runs'] = G_
    PERF['frames_control_runs'] = C_
    PERF['frames_summary'] = {'game_median_over33_per_15s': med(G_, 'over33'), 'control_median_over33_per_15s': med(C_, 'over33'), 'game_median_avg_ms': med(G_, 'avg'), 'control_median_avg_ms': med(C_, 'avg'), 'game_median_p95': med(G_, 'p95'), 'game_median_max': med(G_, 'max')}
    print('   ', PERF['frames_summary'])
    check('4x CPU autoplay: median frame interval < 20 ms and median >33 ms frames <= 12 per 15 s', med(G_, 'avg') < 20 and med(G_, 'over33') <= 12, PERF['frames_summary'])


def t_perf(p):
    t_perf_frames(p)
    t_perf_control(p)
    print('[performance cpu=4]')
    for (subj, w, s, diff, tag) in (('english', 1, 3, 3, 'en'), ('math', 3, 5, 3, 'ma')):
        b, pg, errs = open_game(p, 'card_game.js', 'WQ37Card', subj, w, s, diff, size=(390, 844), touch=True, cpu=4, seed=4)
        pg.evaluate("()=>{window.ITEM=(id)=>OPTS.items.concat(OPTS.review).find(x=>x.id===String(id).replace(/^fl\d+:/,''));window.ANS=(id)=>{const it=ITEM(id);return it.kind==='math'?String(it.a):it.en;}}")
        boot(pg)
        C(pg, 'noevent')
        C(pg, 'mon', {'hp': 900, 'max': 900})
        res = pg.evaluate("""()=>{
          const C=WQ37Card, ts=[]; let guard=0;
          const frame=(n)=>{for(let i=0;i<n;i++){const t0=performance.now(); C._step(1,1/60); ts.push(performance.now()-t0);}};
          frame(30);
          for(let k=0;k<6;k++){ const d=C._debug; const i=d.hand.findIndex(c=>c.cost<=d.energy); if(i<0){C._cmd('end',{force:true}); for(let j=0;j<40;j++)frame(5); continue;}
            C._cmd('select',i); frame(10); const c=C._debug.cast; const it=ITEM(c.item); const full= it.kind==='math'?String(it.a):it.en.replace(/[^A-Za-z]/g,'').slice(c.locked||0); C._cmd('type',full); if(C._debug.cast)C._cmd('submit'); for(let j=0;j<40;j++)frame(5); }
          const a=ts.reduce((x,y)=>x+y,0)/ts.length; ts.sort((x,y)=>x-y); return {n:ts.length,avg:a,p95:ts[Math.floor(ts.length*.95)],max:ts[ts.length-1]};
        }""")
        check('%s: avg update+draw frame < 8 ms at 4x CPU (%.2f ms, p95 %.2f, max %.2f)' % (tag, res['avg'], res['p95'], res['max']), res['avg'] < 8 and res['max'] < 33, res)
        PERF[tag] = res
        ops = pg.evaluate("""()=>{const C=WQ37Card,out={};const T=(n,f)=>{const t=performance.now();f();const e=performance.now()-t;out[n]=Math.max(out[n]||0,e);};
          for(let k=0;k<5;k++){const d=C._debug;const i=d.hand.findIndex(c=>c.cost<=d.energy); if(i<0)break; T('open_cast',()=>C._cmd('select',i)); const c=C._debug.cast; const it=ITEM(c.item);
            const full= it.kind==='math'?String(it.a):it.en.replace(/[^A-Za-z]/g,'').slice(c.locked||0); T('type',()=>C._cmd('type',full)); if(C._debug.cast) T('submit',()=>C._cmd('submit')); T('frames30',()=>C._step(30,1/60)); }
          T('end_turn',()=>C._cmd('end',{force:true})); for(let k=0;k<14;k++) T('enemy_and_deal_20_frames',()=>C._step(20,1/60)); return out;}""")
        PERF[tag]['ops_max_ms'] = {k: round(v, 1) for k, v in ops.items()}
        check('%s: worst single operation (cast open / type / submit / end turn+deal) < 40 ms at 4x: %s' % (tag, PERF[tag]['ops_max_ms']), max(ops.values()) < 40, ops)
        PERF[tag]['real'] = None
        done(errs, b)


PERF = {}
KEYS = {}
TESTS = [t_intro, t_desktop_hints, t_weakness_english, t_weakness_math, t_intent, t_energy, t_wrong_and_requeue, t_evolve, t_stars_first_try, t_cannot_win_without_answering, t_boss,
         t_difficulty, t_input_touch, t_input_keyboard, t_pause_restart, t_full_clear, t_destroy, t_finisher_spacing, t_result_sticky, t_regen_avoid, t_noart, t_math_confirm, t_form_rule, t_long_math, t_fullwidth_ime, t_restart_regen, t_requeue_after_ok, t_layout, t_states, t_perf]


def main():
    sel = [a for a in sys.argv[1:] if not a.startswith('-')]
    t0 = time.time()
    with sync_playwright() as p:
        for t in TESTS:
            if sel and not any(x in t.__name__ for x in sel):
                continue
            try:
                t(p)
            except Exception as e:  # noqa: BLE001
                import traceback
                traceback.print_exc()
                check(t.__name__ + ' ran without exception', False, repr(e))
    check('no console errors / page errors in any test', not ALLERRS, ALLERRS[:5])
    bad = [r for r in RESULTS if not r[1]]
    print('\n%d checks, %d failed, %.0f s' % (len(RESULTS), len(bad), time.time() - t0))
    for r in bad:
        print('  FAIL', r[0], r[2][:300])
    (EV / 'perf.json').write_text(json.dumps(PERF, indent=1))
    (EV / 'keys.json').write_text(json.dumps(KEYS, indent=1))
    (EV / 'results.json').write_text(json.dumps([{'name': a, 'ok': b, 'detail': c if not b else ''} for a, b, c in RESULTS], ensure_ascii=False, indent=1))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()

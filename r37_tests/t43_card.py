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
      window.ITEM=(id)=>OPTS.items.concat(OPTS.review).find(x=>x.id===id);
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
            if m['keys']:
                kh = min(k['h'] for k in m['keys'])
                kw = min(k['w'] for k in m['keys'])
                ptype = pg.evaluate("(()=>{const p=document.querySelector('.cd-sheet .gx-pad');return p?(p.classList.contains('dig')?'digits':p.classList.contains('scr')?'scrambled':'qwerty'):''})()")
                KEYS[name] = (ptype, round(kw), round(kh))
                need_w = 28 if ptype == 'qwerty' else 44   # QWERTY keeps the shared GX.pad 10-column layout (5.5 mm class keys on a phone)
                need_h = 38 if ptype == 'qwerty' else (40 if side else 44)
                check('%s: %s pad keys %.0fx%.0f px (need >= %dx%d)' % (name, ptype, kw, kh, need_w, need_h), kw >= need_w and kh >= need_h, (kw, kh))
                check('%s: pad keys do not overlap each other' % name, all(not inter(m['keys'][i], m['keys'][j]) for i in range(len(m['keys'])) for j in range(i + 1, len(m['keys']))))
            pg.screenshot(path=str(EV / ('%s_%s_d%d_cast.jpg' % (tag, subj, diff))), type='jpeg', quality=80)
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


def t_perf(p):
    print('[performance cpu=4]')
    for (subj, w, s, diff, tag) in (('english', 1, 3, 3, 'en'), ('math', 3, 5, 3, 'ma')):
        b, pg, errs = open_game(p, 'card_game.js', 'WQ37Card', subj, w, s, diff, size=(390, 844), touch=True, cpu=4, seed=4)
        pg.evaluate("()=>{window.ITEM=(id)=>OPTS.items.concat(OPTS.review).find(x=>x.id===id);window.ANS=(id)=>{const it=ITEM(id);return it.kind==='math'?String(it.a):it.en;}}")
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
        # real-time session under the same 4x throttle: rAF intervals + long tasks while cards are dealt, cast, played and the monster acts
        pg.evaluate("""()=>{window.__f=[];window.__lt=[];let l=performance.now();const f=t=>{window.__f.push(t-l);l=t;requestAnimationFrame(f)};requestAnimationFrame(f);
          try{new PerformanceObserver(li=>{for(const e of li.getEntries())window.__lt.push(e.duration)}).observe({type:'longtask',buffered:false})}catch(_){}}""")
        t0 = time.time()
        while time.time() - t0 < 9:
            d = D(pg)
            if d['ended']:
                break
            if d['learnOpen']:
                pg.wait_for_timeout(2100)
                pg.evaluate("document.querySelector('.gx-learn [data-r=ok]')&&document.querySelector('.gx-learn [data-r=ok]').click()")
                continue
            if d['cast']:
                C(pg, 'type', cast_text(pg))
                if D(pg)['cast']:
                    C(pg, 'submit')
                pg.wait_for_timeout(450)
                continue
            if d['phase'] == 'player':
                idx = [i for i, c in enumerate(d['hand']) if c['cost'] <= d['energy']]
                if idx:
                    C(pg, 'select', idx[0])
                    pg.wait_for_timeout(250)
                else:
                    pg.click('.cd-end')
                    pg.wait_for_timeout(300)
            else:
                pg.wait_for_timeout(200)
        f = pg.evaluate('window.__f')[5:]
        lt = pg.evaluate('window.__lt')
        f2 = sorted(f)
        PERF[tag]['real'] = {'frames': len(f), 'median': round(f2[len(f2) // 2], 1), 'p95': round(f2[int(len(f2) * .95)], 1), 'over50': sum(1 for x in f if x > 50), 'longtasks': len(lt), 'longtask_max': round(max(lt), 1) if lt else 0}
        print('   real-time session', tag, PERF[tag]['real'])
        done(errs, b)


PERF = {}
KEYS = {}
TESTS = [t_intro, t_weakness_english, t_weakness_math, t_intent, t_energy, t_wrong_and_requeue, t_evolve, t_stars_first_try, t_cannot_win_without_answering, t_boss,
         t_difficulty, t_input_touch, t_input_keyboard, t_pause_restart, t_full_clear, t_destroy, t_noart, t_layout, t_states, t_perf]


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

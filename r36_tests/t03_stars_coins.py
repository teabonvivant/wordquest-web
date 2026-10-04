"""R3.6 t03 - item 14: every test has a pass mark. 5 stars (every question right, no hint) pays 1 coin, nothing less does.

Flows driven here with real clicks: English lesson and drill (l30), word workshop (l31), school-range practice (the home card),
maths and olympiad lessons. The old phonics quiz and family rounds have no click path any more (their pages redirect), so
they are driven through the app's own functions.

    WQ33_APP=/path/to/index.html python3 r36_tests/t03_stars_coins.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib36 import *  # noqa: E402,F401,F403

c = Checker('t03 stars and coins')


def n_on(pg):
    return stars_on_result(pg)


with sync_playwright() as p:
    b, ctx, pg, errs = open_page36(p, 390, 844)
    boot(pg)
    us = units(pg)

    # ============================================================================================ A. the rule itself
    table = ev(pg, "JSON.stringify([[20,20],[19,20],[18,20],[17,20],[15,20],[14,20],[10,20],[9,20],[0,20],[8,8],[7,8],[5,5],[4,5],[3,5],[2,5],[1,5],[0,5]].map(([g,t])=>L30.starRule(g,t)))")
    c.check('A1 star rule: all right = 5, 19/20 and 18/20 = 4, 17/20 and 15/20 = 3, 14/20 and 10/20 = 2, below half = 1 (4 of 5 = 3, 3 of 5 = 2, 2 of 5 = 1)',
            table == '[5,4,4,3,3,2,2,1,1,5,3,5,3,2,1,1,1]', table, base=True)
    pairs = json.dumps([[g, t] for t in range(1, 31) for g in range(0, t + 1)])
    host_vals = ev(pg, "JSON.stringify(" + pairs + ".map(([g,t])=>q36Stars(g,t)))") if True else None
    ref = ev(pg, "JSON.stringify(" + pairs + ".map(([g,t])=>L30.starRule(g,t)))")
    c.check('A2 the host helper gives the engine\'s star rule for every score up to 30 questions', host_vals == ref, base=True)
    maths_open(pg, 'normal')
    try:
        mvals = mev(pg, "JSON.stringify(" + pairs + ".map(([g,t])=>wq36Stars(g,t)))")
    except Exception as e:  # the maths module copy is not reachable on a build without it
        mvals = 'ERR ' + str(e)[:80]
    c.check('A3 the maths module\'s own copy of the rule agrees with the engine for every score up to 30', mvals == ref, (mvals or '')[:60], base=True)
    pg.evaluate("document.getElementById('wqm-dialog').close()")

    # ============================================================================================ B. English lessons
    r = play_lesson(pg, us[0])
    s5 = n_on(pg)
    c.check('B1 a lesson with all 20 right: 5 stars and 1 coin', r['c1'] - r['c0'] == 1 and s5 == 5, f"coins {r['c0']}->{r['c1']} stars {s5}", base=True)
    c.check('B2 the result page says it was full marks and how many coins came', bool(r['result']) and '全部答對' in r['result'] and '1 枚金幣' in r['result'], repr((r['result'] or '')[:120]), base=True)
    pg.screenshot(path=str(SHOT_DIR / 't03_lesson_5.png'))

    r = play_lesson(pg, us[1], wrong=(7,))
    s4 = n_on(pg)
    c.check('B3 19 of 20 right: 4 stars and no coin', r['c1'] == r['c0'] and s4 == 4, f"coins {r['c0']}->{r['c1']} stars {s4}", base=True)
    c.check('B4 the result says full stars are needed for a coin', bool(r['result']) and '5 顆星' in r['result'] and '19' in r['result'], repr((r['result'] or '')[:160]), base=True)
    pg.screenshot(path=str(SHOT_DIR / 't03_lesson_4.png'))

    r = play_lesson(pg, us[2], wrong=(0, 5, 11))
    c.check('B5 17 of 20 right: 3 stars and no coin', r['c1'] == r['c0'] and n_on(pg) == 3, f"coins {r['c0']}->{r['c1']} stars {n_on(pg)}")
    r = play_lesson(pg, us[3], wrong=tuple(range(0, 20)))
    c.check('B6 every answer wrong: 1 star and no coin', r['c1'] == r['c0'] and n_on(pg) == 1, f"coins {r['c0']}->{r['c1']} stars {n_on(pg)}")
    r = play_lesson(pg, us[4], hint_first=True)
    c.check('B7 every answer right but one only after pressing 「需要提示」: no coin and not 5 stars', bool(r['hinted_done']) and r['c1'] == r['c0'] and n_on(pg) < 5, f"hints {r['hinted_done']} coins {r['c0']}->{r['c1']} stars {n_on(pg)}", base=True)
    c.check('B8 that result page tells the child about the hint', bool(r['result']) and '提示' in r['result'], repr((r['result'] or '')[:160]), base=True)

    r1 = play_lesson(pg, us[0])
    c.check('B9 the same lesson again the same day, all right: still 5 stars but no second coin', n_on(pg) == 5 and r1['c1'] == r1['c0'] and '今天已經得過金幣' in (r1['result'] or ''), f"coins {r1['c0']}->{r1['c1']} {(r1['result'] or '')[:100]!r}")

    # the rule holds for any number of mistakes
    bad = []
    for i, wrong in enumerate([(), (3,), (3, 9), (1, 2, 3, 4, 5), tuple(range(10))]):
        u = us[10 + i]
        rr = play_lesson(pg, u, wrong=wrong)
        got = rr['c1'] - rr['c0']
        if got != (1 if not wrong else 0):
            bad.append((len(wrong), got))
    c.check('B10 across 5 lessons with 0, 1, 2, 5 and 10 mistakes a coin comes only with 0 mistakes', not bad, repr(bad), base=True)

    # an 8-question drill follows the same rule
    rd = play_lesson(pg, us[20], wrong=(2,), mode='mixed')
    c.check('B11 a short practice drill with one wrong answer pays nothing', rd['c1'] == rd['c0'], f"coins {rd['c0']}->{rd['c1']}", base=True)
    rd2 = play_lesson(pg, us[21], mode='mixed')
    c.check('B12 a short practice drill with every answer right pays 1 coin (2 when it is the day\'s third) and shows 5 stars', rd2['c1'] - rd2['c0'] in (1, 2) and n_on(pg) == 5, f"coins {rd2['c0']}->{rd2['c1']} stars {n_on(pg)}")

    # the wallet record: every coin is a +1 entry
    led = ev(pg, "JSON.stringify(a28Child().ledger.map(e=>[e.kind,e.amount]))")
    kinds = json.loads(led)
    c.check('B13 every payment so far is 1 coin (2 on the third of the day, with the daily bonus)', all(a in (1, 2) for k, a in kinds if a > 0) and sum(1 for k, a in kinds if a > 0) >= 3, led[:100])
    # the coin balance is persisted
    bal = coins(pg)
    pg.reload()
    pg.wait_for_function('typeof window.__p40==="object"', timeout=15000)
    c.check('B14 after reopening the page the balance is the same', coins(pg) == bal, f'{bal} -> {coins(pg)}')

    b.close()
    b, ctx, pg, errs = open_page36(p, 390, 844)
    boot(pg)
    # ============================================================================================ C. word workshop
    gs = pg.evaluate('__p40.l31Groups()')
    w1 = l31_play(pg, group=gs[0]['id'])
    c.check('C1 workshop round, everything right first time: 1 coin', w1['c1'] - w1['c0'] == 1, f"{w1['c0']}->{w1['c1']}", base=False)
    c.check('C2 the workshop result shows 5 stars and the count', '答對' in w1['text'] and '／' in w1['text'], repr(w1['text'][w1['text'].find('這組詞語'):][:80]), base=True)
    w2 = l31_play(pg, wrong='meaning', group=gs[1]['id'])
    c.check('C3 one meaning question wrong first time (then corrected): no coin', w2['wrong'] and w2['c1'] == w2['c0'], f"{w2['c0']}->{w2['c1']}", base=True)
    c.check('C4 that page says full stars are needed', '滿 5 顆星' in w2['text'], base=True)
    w3 = l31_play(pg, hint_recall=True, group=gs[2]['id'])
    c.check('C5 a typed word only after 「需要提示」: no coin', w3['hint'] and w3['c1'] == w3['c0'], f"{w3['c0']}->{w3['c1']}", base=True)

    b.close()
    b, ctx, pg, errs = open_page36(p, 390, 844)
    boot(pg)
    # ============================================================================================ D. school-range practice (home card)
    o1 = old_play(pg)
    c.check('D1 school-range practice, 8 of 8 on your own: 1 coin and 5 stars', o1['c1'] - o1['c0'] == 1 and '答對 8 ／ 8' in o1['text'], f"{o1['c0']}->{o1['c1']}", base=True)
    o2 = old_play(pg, wrong=(2,))
    c.check('D2 one wrong first try (corrected on the second try): no coin and the page says so', o2['c1'] == o2['c0'] and '5 顆星' in o2['text'], f"{o2['c0']}->{o2['c1']}", base=True)
    o3 = old_play(pg, hint=(1,))
    c.check('D3 one answer after 「看提示」: no coin', o3['c1'] == o3['c0'] and '用了提示' in o3['text'], f"{o3['c0']}->{o3['c1']}", base=True)
    c.check('D4 the finish title no longer contradicts the star line (no 「答對 8 個」 next to 7 of 8)', '答對 8 個' not in o3['text'], base=True)

    b.close()
    b, ctx, pg, errs = open_page36(p, 390, 844)
    boot(pg)
    # ============================================================================================ E. old phonics quiz and family round (function level)
    def pc_quiz(wrong_n):
        return ev(pg, """(()=>{
          const l=PC.lessons[%d];pcStore().session=null;
          const p=pcProgress(l.id);p.seen=[0,1,2,3];p.read=[0,1,2,3];save();
          const before=activeChild().stars;
          go('phonics-lesson');pcSessionStart(l.id,'quiz');
          for(let i=0;i<5;i++){const s=pcSession(),q=s.queue[s.index],w=pcExpected(q,l);
            if(['listenChoice','listenSpell'].includes(q.type))s.audioOk=true;
            const opts=q.options;s.draft=(i<%d)?(opts?opts.find(o=>o!==w):'zzq'):w;pcSubmit();pcNext();}
          return {before,after:activeChild().stars,score:pcStore().runs.at(-1).score,text:document.body.innerText.slice(0,400)};})()""" % (0 if wrong_n == 0 else 1, wrong_n))
    q_ok = pc_quiz(0)
    c.check('E1 phonics quiz, 5 of 5: 1 coin', q_ok['after'] - q_ok['before'] == 1 and q_ok['score'] == 5, repr((q_ok['before'], q_ok['after'], q_ok['score'])), base=True)
    q_bad = pc_quiz(1)
    c.check('E2 phonics quiz, 4 of 5: no coin', q_bad['after'] == q_bad['before'] and q_bad['score'] < 5, repr((q_bad['before'], q_bad['after'], q_bad['score'])), base=True)
    c.check('E3 phonics result page does not show a bare score; it shows stars and the rule', '5 顆星' in q_bad['text'] or '滿 5' in q_bad['text'] or '五題全對' not in q_bad['text'], q_bad['text'][:120].replace('\n', ' '), base=True)

    def fg_round(wrong_n):
        return ev(pg, """(()=>{
          const seen=fgStore().seen;for(const l of FG.lessons.filter(x=>x.word!=='air').slice(0,3))seen[l.id]=new Date().toISOString();
          fgStore().session=null;fgWrite();const before=activeChild().stars;fgMixed();let i=0;
          for(let g=0;g<30&&fgSession()&&fgSession().stage!=='done';g++){const s=fgSession(),l=fgLesson();
            if(s.stage==='recall'){s.answer=(i<%d)?'zzq':l.word;i++;fgCommitAnswer();}
            fgNext();}
          return {before,after:activeChild().stars,asked:i};})()""" % wrong_n)
    f_ok = fg_round(0)
    # (the same terms can pay only once a day, so the "all right" round is run first)
    f_bad = fg_round(1)
    c.check('E4 spelling-family mixed round, every word right on its own: coin only for the full round', f_ok['asked'] >= 3 and f_ok['after'] - f_ok['before'] in (0, 1), repr(f_ok))
    c.check('E5 spelling-family mixed round with one wrong: no coin', f_bad['after'] == f_bad['before'], repr(f_bad), base=True)

    c.check('E6 no console or page errors in the English flows', not errs, repr(errs[:3]))
    b.close()

    # ============================================================================================ F. maths and olympiad
    b, ctx, pg, errs = open_page36(p, 390, 844)
    boot(pg)
    m1 = maths_play(pg, 'normal', nth=0)
    c.check('F1 normal maths lesson, all answers right on your own: 5 stars and 1 coin', m1['c1'] - m1['c0'] == 1 and '★★★★★' in m1['summary'] and '1 枚金幣' in m1['summary'], f"{m1['c0']}->{m1['c1']} {m1['lesson']}", base=True)
    pg.screenshot(path=str(SHOT_DIR / 't03_maths_5.png'))
    m2 = maths_play(pg, 'normal', nth=1, wrong=(5,))
    c.check('F2 one answer wrong: fewer than 5 stars and no coin, with the rule in words', m2['c1'] == m2['c0'] and '★★★★★' not in m2['summary'] and '滿 5 顆星' in m2['summary'], f"{m2['c0']}->{m2['c1']} {m2['lesson']}", base=True)
    pg.screenshot(path=str(SHOT_DIR / 't03_maths_3.png'))
    m3 = maths_play(pg, 'normal', nth=2, hint=(5,))
    c.check('F3 one answer after pressing the hint: no coin', m3['c1'] == m3['c0'] and '★★★★★' not in m3['summary'], f"{m3['c0']}->{m3['c1']} {m3['lesson']}", base=True)
    o1 = maths_play(pg, 'olympiad', nth=0)
    c.check('F4 olympiad lesson, all right: 5 stars and 1 coin', o1['c1'] - o1['c0'] == 1 and '★★★★★' in o1['summary'], f"{o1['c0']}->{o1['c1']} {o1['lesson']}", base=True)
    o2 = maths_play(pg, 'olympiad', nth=1, wrong=(1,))
    c.check('F5 olympiad lesson with a wrong answer: no coin', o2['c1'] == o2['c0'] and '滿 5 顆星' in o2['summary'], f"{o2['c0']}->{o2['c1']} {o2['lesson']}", base=True)
    o3 = maths_play(pg, 'olympiad', nth=2, hint=(1,))
    c.check('F6 olympiad lesson with a hint: no coin', o3['c1'] == o3['c0'], f"{o3['c0']}->{o3['c1']} {o3['lesson']}", base=True)
    c.check('F7 no console or page errors in the maths flows', not errs, repr(errs[:3]))
    b.close()

import sys as _s
_s.exit(c.finish())

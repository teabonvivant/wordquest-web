"""p40 / N9 - L30 spelling classroom and L31 word workshop have sound; 'complete' and 'coin' cues exist.

    WQ33_APP=<index.html> python3 r33_tests/p40_sfx.py

Real Chromium. AudioContext.createOscillator / frequency.setValueAtTime are observed (window.__au), so a cue is identified by
the exact frequency sequence it schedules. `[B]` checks fail on the frozen R3.2 base and must pass on the patched build.

Cue table (host playSfx):  tap 760 | pop 540,760 | match 600,900 | correct 660,880 | wrong 220,175 (triangle, soft)
                           finish 523,659,784 | complete 523,659,784,1047 | coin 988,1319 (sine)
"""
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from p40_lib import Checker, open_page, boot_account, st, osc, osc_mark, osc_since, sync_playwright  # noqa: E402

C = Checker('p40 sfx (N9)')
TAP, POP, MATCH = [760], [540, 760], [600, 900]
CORRECT, WRONG = [660, 880], [220, 175]
FINISH, COMPLETE, COIN = [523, 659, 784], [523, 659, 784, 1047], [988, 1319]


def f(rows):
    return [r['f'][0] for r in rows]


def types(rows):
    return [r['type'] for r in rows]


def act(pg, fn, wait=70):
    m = osc_mark(pg)
    fn()
    pg.wait_for_timeout(wait)
    return osc_since(pg, m)


def expect(name, rows, want, base=True, kind=None):
    ok = f(rows) == want and (kind is None or all(t == kind for t in types(rows)))
    C.check(name, ok, f'got {f(rows)} {types(rows)} want {want}', base=base)
    return ok


# ------------------------------------------------------------------------------------------------ L30 helpers
def l30_start(pg, mode, unit='U01'):
    pg.evaluate("__p40.l30Start(%r,%r)" % (unit, mode))
    pg.wait_for_function('location.hash==="#learning" && !!document.querySelector("[data-l30]")', timeout=8000)
    pg.wait_for_timeout(150)


def l30_choose(pg, correct=True):
    q = pg.evaluate('__p40.l30()')['q']
    idx = q['choices'].index(q['answer']) if correct else next(i for i, c in enumerate(q['choices']) if c != q['answer'])
    pg.locator(f'[data-l30="choose"][data-index="{idx}"]').click()


def l30_submit(pg):
    pg.locator('[data-l30="submit"]').click()


def l30_next(pg):
    pg.locator('[data-l30="next"]').click()


def l30_tile(pg, ch):
    idx = pg.evaluate("""(ch)=>{const b=[...document.querySelectorAll('[data-l30="tile"]')].find(b=>!b.disabled&&b.getAttribute('aria-label')==='加入 '+ch);
      return b?b.dataset.index:null;}""", ch)
    pg.locator(f'[data-l30="tile"][data-index="{idx}"]').click()


# ------------------------------------------------------------------------------------------------ L31 helpers
def l31_start(pg, group, mode='guided'):
    pg.evaluate("__p40.l31Start(%r,%r)" % (group, mode))
    pg.wait_for_function('location.hash==="#assembly-learn" && !!document.querySelector("[data-l31]")', timeout=8000)
    pg.wait_for_timeout(150)


def l31_assemble(pg, r):
    if r['kind'] == 'blend':
        for i, src in enumerate(r['sources']):
            pg.locator(f'[data-l31="cut"][data-index="{i}"][data-value="{src["take"]}"]').click()
    else:
        for i in range(len(r['parts'])):
            pg.locator(f'[data-l31="piece"][data-index="{i}"]').click()


def l31_do(pg, correct=True):
    """Answer the current L31 step (no next). Returns the oscillator rows produced by the submit click."""
    s = pg.evaluate('__p40.l31()')
    r = pg.evaluate('__p40.l31Recipe(%r)' % s['rec'])
    step = s['step']
    if step == 'assemble':
        l31_assemble(pg, r)
    elif step == 'meaning':
        sel = '[data-l31="choice"]'
        vals = pg.evaluate("[...document.querySelectorAll('[data-l31=\"choice\"]')].map(b=>b.dataset.value)")
        v = r['meaning'] if correct else next(x for x in vals if x != r['meaning'])
        pg.locator(sel).nth(vals.index(v)).click()
    elif step == 'recall':
        pg.fill('#l31-answer', r['form'] if correct else 'zzzz')
    m = osc_mark(pg)
    pg.locator('[data-l31="submit"]').click()
    pg.wait_for_timeout(70)
    return step, osc_since(pg, m)


def l31_correct_and_next(pg, wait=70):
    """If the feedback asks for a correction, type it; then press next. Returns rows from the two clicks."""
    m = osc_mark(pg)
    fb = pg.evaluate('__p40.l31()')['fb']
    if fb and not fb['corrected']:
        pg.fill('#l31-correction', fb['expected'])
        pg.locator('[data-l31="correct"]').click()
        pg.wait_for_timeout(70)
    mid = osc_since(pg, m)
    m2 = osc_mark(pg)
    pg.locator('[data-l31="next"]').click()
    pg.wait_for_timeout(wait)
    return mid, osc_since(pg, m2)


with sync_playwright() as p:
    b, ctx, pg, errs = open_page(p, audio=True)
    try:
        boot_account(pg, grade='3', coins=None)   # grade 3 = the R3.2 default child, so session sizes match with or without the registration-grade module
        C.check('fixture: page visible (document.hidden=false) and sfx enabled', pg.evaluate('!document.hidden && __p40.sfxOn()'))

        # ====================================================================== A. the cues themselves
        for name, want, kind, base in [('complete', COMPLETE, 'sine', True), ('coin', COIN, 'sine', True),
                                       ('correct', CORRECT, 'sine', False), ('wrong', WRONG, 'triangle', False),
                                       ('finish', FINISH, 'sine', False), ('tap', TAP, 'sine', False),
                                       ('pop', POP, 'sine', False), ('match', MATCH, 'sine', False)]:
            rows = act(pg, lambda n=name: pg.evaluate('__p40.play(%r)' % n))
            expect(f"playSfx('{name}') schedules {want} ({kind})", rows, want, base=base, kind=kind)
        pg.evaluate('__p40.sfx(false)')
        rows = act(pg, lambda: [pg.evaluate('__p40.play(%r)' % n) for n in ('complete', 'coin', 'correct')])
        C.check('sfx switched off: complete / coin / correct are silent', rows == [], f'{f(rows)}')
        pg.evaluate('__p40.sfx(true)')
        pg.evaluate('__p40.voice(true)')
        rows = act(pg, lambda: [pg.evaluate('__p40.play(%r)' % n) for n in ('complete', 'coin', 'correct')])
        C.check('English speech playing (voiceBusy): complete / coin / correct are silent', rows == [], f'{f(rows)}')
        pg.evaluate('__p40.voice(false)')

        # ====================================================================== B. L30 meaning mode: a full group
        l30_start(pg, 'meaning')
        s = pg.evaluate('__p40.l30()')
        C.check('L30: meaning session started (4 steps)', s and s['len'] == 4 and s['mode'] == 'meaning', s)
        stars0 = pg.evaluate('__p40.stars()')
        rows = act(pg, lambda: l30_choose(pg, True))
        expect('L30: picking a choice plays a tap', rows, TAP)
        rows = act(pg, lambda: l30_submit(pg))
        expect('L30: correct answer plays the rising 660 -> 880', rows, CORRECT, kind='sine')
        rows = act(pg, lambda: l30_next(pg))
        C.check('L30: next step alone is silent', f(rows) == [], f(rows))
        # wrong answer
        act(pg, lambda: l30_choose(pg, False))
        rows = act(pg, lambda: l30_submit(pg))
        expect('L30: wrong answer plays the soft falling 220 -> 175 (triangle)', rows, WRONG, kind='triangle')
        fb = pg.evaluate('__p40.l30()')['fb']
        C.check('L30: wrong answer is not punished (feedback kept gentle, no coin change)',
                fb and fb['correct'] is False and pg.evaluate('__p40.stars()') == stars0, fb)
        # sfx off + voiceBusy on the same screen
        act(pg, lambda: l30_next(pg))
        pg.evaluate('__p40.sfx(false)')
        rows = act(pg, lambda: (l30_choose(pg, True), l30_submit(pg)))
        C.check('L30: sfx off -> choose + correct submit are silent', rows == [], f(rows))
        act(pg, lambda: l30_next(pg))
        pg.evaluate('__p40.sfx(true)')
        pg.evaluate('__p40.voice(true)')
        rows = act(pg, lambda: (l30_choose(pg, True), l30_submit(pg)))
        C.check('L30: English speech playing (voiceBusy) -> choose + correct submit are silent', rows == [], f(rows))
        pg.evaluate('__p40.voice(false)')
        # last step -> complete + coin
        s = pg.evaluate('__p40.l30()')
        C.check('L30: last step answered (silent because speech was playing), feedback waiting', s and s['index'] == 3 and s['fb'] is not None, s)
        rows = act(pg, lambda: l30_next(pg), wait=1000)
        expect('L30: finishing the group plays the complete tune, then the coin 600 ms later (exactly once)', rows, COMPLETE + COIN)
        done = pg.evaluate('__p40.l30Done()')
        C.check('L30: group completed and +1 coin', done and done['status'] == 'completed' and done['award'] == 1 and
                pg.evaluate('__p40.stars()') == stars0 + 1, f'{done} stars {stars0}->{pg.evaluate("__p40.stars()")}')
        C.check('L30: no extra AudioContext was created (the shared sfx context is reused)',
                pg.evaluate('window.__au.ctx') == 1, pg.evaluate('window.__au.ctx'))
        pg.wait_for_timeout(700)
        C.check('L30: nothing else plays afterwards (no repeated coin)', f(act(pg, lambda: None, wait=100)) == [])

        # ====================================================================== C. L30 tiles: tap / match / pop
        l30_start(pg, 'tiles', unit='U02')
        q = pg.evaluate('__p40.l30()')['q']
        ans = q['answer']
        rows = act(pg, lambda: l30_tile(pg, ans[0]))
        expect('L30 tiles: first tile plays a tap', rows, TAP)
        for ch in ans[1:-1]:
            act(pg, lambda ch=ch: l30_tile(pg, ch))
        rows = act(pg, lambda: l30_tile(pg, ans[-1]))
        expect('L30 tiles: the last tile completes the word and plays a match', rows, MATCH)
        rows = act(pg, lambda: pg.locator('[data-l30="untile"]').click())
        expect('L30 tiles: removing a tile plays a pop', rows, POP)
        act(pg, lambda: l30_tile(pg, ans[-1]))
        rows = act(pg, lambda: l30_submit(pg))
        expect('L30 tiles: correct word plays correct', rows, CORRECT)
        pg.evaluate('__p40.sfx(false)')
        pg.locator('[data-l30="next"]').click()
        rows = act(pg, lambda: l30_tile(pg, pg.evaluate('__p40.l30()')["q"]["answer"][0]))
        C.check('L30 tiles: sfx off -> tile click is silent', rows == [], f(rows))
        # R3.2 quirk (not touched here): "結束這組" cannot save while a tile is placed (validation '字塊範圍'), so clear first.
        pg.locator('[data-l30="clear-tiles"]').click()
        pg.evaluate('__p40.sfx(true)')
        pg.locator('[data-l30="abandon"]').click()
        pg.wait_for_timeout(300)
        C.check('L30: abandoning a group leaves no open session', pg.evaluate('__p40.l30()') is None,
                f'{pg.evaluate("location.hash")} {pg.evaluate("__p40.l30()")}')

        # ====================================================================== D. L30 study (one word): complete, no coin
        stars1 = pg.evaluate('__p40.stars()')
        pg.evaluate("location.hash='#unit?id=U01'")
        pg.wait_for_selector('[data-l30="one"]', timeout=8000)
        pg.locator('[data-l30="one"]').first.click()
        pg.wait_for_function('location.hash==="#learning"', timeout=8000)
        pg.wait_for_selector('[data-l30="submit"]')
        rows = act(pg, lambda: pg.locator('[data-l30="submit"]').click(), wait=1000)
        expect('L30 study: "我已看過" finishing a one-word lesson plays the complete tune, and no coin (nothing was graded)',
               rows, COMPLETE)
        C.check('L30 study: wallet unchanged', pg.evaluate('__p40.stars()') == stars1, pg.evaluate('__p40.stars()'))

        # ====================================================================== E. L30 rolled-back save stays silent
        l30_start(pg, 'meaning', unit='U03')
        for i in range(3):
            act(pg, lambda: (l30_choose(pg, True), l30_submit(pg)))
            act(pg, lambda: l30_next(pg))
        act(pg, lambda: (l30_choose(pg, True), l30_submit(pg)))
        stars2 = pg.evaluate('__p40.stars()')
        pg.evaluate('__p40.failSave(true)')
        rows = act(pg, lambda: l30_next(pg), wait=1000)
        pg.evaluate('__p40.failSave(false)')
        C.check('L30: if the save fails and the group is rolled back, neither complete nor coin plays',
                f(rows) == [] and pg.evaluate('__p40.stars()') == stars2 and pg.evaluate('__p40.l30()') is not None,
                f'{f(rows)} stars {stars2}->{pg.evaluate("__p40.stars()")}')
        rows = act(pg, lambda: l30_next(pg), wait=1000)
        expect('L30: after the save works again the same click completes the group (complete + coin)', rows, COMPLETE + COIN)

        # ====================================================================== F. L31 workshop (chunk group, guided)
        l31_start(pg, 'air')
        s = pg.evaluate('__p40.l31()')
        C.check('L31: guided session started (8 steps, first is "notice")', s and s['len'] == 8 and s['step'] == 'notice', s)
        stars3 = pg.evaluate('__p40.stars()')
        rows = act(pg, lambda: pg.locator('[data-l31="submit"]').click())
        expect('L31 notice: "認識了，下一步" plays a tap', rows, TAP)
        pg.locator('[data-l31="next"]').click()
        s = pg.evaluate('__p40.l31()')
        r = pg.evaluate('__p40.l31Recipe(%r)' % s['rec'])
        C.check('L31: reached the assemble step', s['step'] == 'assemble', s)
        rows = act(pg, lambda: pg.locator('[data-l31="piece"][data-index="0"]').click())
        expect('L31 assemble: first block plays a tap', rows, TAP)
        rows = act(pg, lambda: pg.locator('[data-l31="undo"]').click())
        expect('L31 assemble: removing the block plays a pop', rows, POP)
        for i in range(len(r['parts']) - 1):
            act(pg, lambda i=i: pg.locator(f'[data-l31="piece"][data-index="{i}"]').click())
        rows = act(pg, lambda: pg.locator(f'[data-l31="piece"][data-index="{len(r["parts"]) - 1}"]').click())
        expect('L31 assemble: the last block completes the word and plays a match', rows, MATCH)
        rows = act(pg, lambda: pg.locator('[data-l31="submit"]').click())
        expect('L31 assemble: correct plays correct', rows, CORRECT)
        mid, rows = l31_correct_and_next(pg)
        C.check('L31: next step alone is silent', f(rows) == [] and f(mid) == [], f'{f(mid)} {f(rows)}')
        # meaning: pick a choice (tap), answer wrong -> soft wrong, correct it -> match
        s = pg.evaluate('__p40.l31()')
        C.check('L31: reached the meaning step', s['step'] == 'meaning', s)
        step, rows = l31_do(pg, correct=False)
        C.check('L31 meaning: wrong answer plays the soft falling 220 -> 175', f(rows)[-2:] == WRONG and 'triangle' in types(rows),
                f'{f(rows)} {types(rows)}', base=True)
        mid, rows = l31_correct_and_next(pg)
        C.check('L31: finishing the correction plays a match', f(mid) == MATCH, f(mid), base=True)
        s = pg.evaluate('__p40.l31()')
        C.check('L31: reached the recall step', s['step'] == 'recall', s)
        pg.evaluate('__p40.sfx(false)')
        step, rows = l31_do(pg, correct=True)
        C.check('L31: sfx off -> correct recall submit is silent', rows == [], f(rows))
        l31_correct_and_next(pg)
        pg.evaluate('__p40.sfx(true)')
        # second recipe: notice, assemble, meaning (speech busy), recall (correct)
        for expected_step in ['notice', 'assemble']:
            s = pg.evaluate('__p40.l31()')
            if s['step'] == 'notice':
                pg.locator('[data-l31="submit"]').click()
            else:
                l31_do(pg, True)
            l31_correct_and_next(pg)
        pg.evaluate('__p40.voice(true)')
        step, rows = l31_do(pg, correct=True)
        C.check('L31: English speech playing (voiceBusy) -> correct meaning answer is silent', rows == [], f(rows))
        pg.evaluate('__p40.voice(false)')
        l31_correct_and_next(pg)
        step, rows = l31_do(pg, correct=True)
        expect('L31 recall: typed correct answer plays correct', rows, CORRECT)
        mid, rows = l31_correct_and_next(pg, wait=1000)
        expect('L31: finishing the group plays the complete tune, then the coin 600 ms later (exactly once)', rows, COMPLETE + COIN)
        done = pg.evaluate('__p40.l31Done()')
        C.check('L31: group completed and the award reached the wallet (3rd task of the day = +2 with the daily bonus)',
                done and done['status'] == 'completed' and done['award'] >= 1 and pg.evaluate('__p40.stars()') == stars3 + done['award'],
                f'{done} stars {stars3}->{pg.evaluate("__p40.stars()")}')

        # ====================================================================== G. L31 blend: cut selection
        l31_start(pg, 'blend')
        pg.locator('[data-l31="submit"]').click()
        pg.locator('[data-l31="next"]').click()
        s = pg.evaluate('__p40.l31()')
        r = pg.evaluate('__p40.l31Recipe(%r)' % s['rec'])
        C.check('L31 blend: reached the cut/assemble step', s['step'] == 'assemble' and r['kind'] == 'blend', s)
        n = len(r['sources'])
        rows = act(pg, lambda: pg.locator(f'[data-l31="cut"][data-index="0"][data-value="{r["sources"][0]["take"]}"]').click())
        expect('L31 blend: choosing a cut plays a tap', rows, TAP)
        for i in range(1, n - 1):
            act(pg, lambda i=i: pg.locator(f'[data-l31="cut"][data-index="{i}"][data-value="{r["sources"][i]["take"]}"]').click())
        rows = act(pg, lambda: pg.locator(f'[data-l31="cut"][data-index="{n - 1}"][data-value="{r["sources"][n - 1]["take"]}"]').click())
        expect('L31 blend: the last cut completes the word and plays a match', rows, MATCH)
        pg.locator('[data-l31="abandon"]').click()
        pg.wait_for_timeout(300)

        # ====================================================================== H. coin from the maths bridge
        # A reward already committed to the maths sidecar is settled by the host `award` (the one text patch).
        req = pg.evaluate("""(()=>{const C=window.WQMathCore,p=WQMathHost.profile(),expected=p.account+':'+p.id;
          const state=C.blank();const e=C.enqueueReward(state,{key:'p40-math-'+Date.now(),startedAt:Date.now()-5000,completedAt:Date.now(),valid:true});
          localStorage.setItem('wqm-state-v1:'+expected,JSON.stringify(state));return {e,expected};})()""")
        stars4 = pg.evaluate('__p40.stars()')
        res = {}

        def do_award():
            res['award'] = pg.evaluate("(r)=>WQMathHost.award(r.e,r.expected)", req)
        rows = act(pg, do_award, wait=1000)
        expect('maths: a settled maths reward plays the coin cue once (600 ms later)', rows, COIN)
        C.check('maths: the reward reached the shared wallet (+1)', res.get('award') == 1 and pg.evaluate('__p40.stars()') == stars4 + 1,
                f'award={res.get("award")} stars {stars4}->{pg.evaluate("__p40.stars()")}')
        rows = act(pg, do_award, wait=1000)
        C.check('maths: settling the same reward again gives nothing and plays nothing', f(rows) == [] and res.get('award') == 0,
                f'{f(rows)} award={res.get("award")}')
        # a failed save must neither pay nor beep
        req2 = pg.evaluate("""(()=>{const C=window.WQMathCore,p=WQMathHost.profile(),expected=p.account+':'+p.id;
          const state=JSON.parse(localStorage.getItem('wqm-state-v1:'+expected));
          const e=C.enqueueReward(state,{key:'p40-math2-'+Date.now(),startedAt:Date.now()-5000,completedAt:Date.now(),valid:true});
          localStorage.setItem('wqm-state-v1:'+expected,JSON.stringify(state));return {e,expected};})()""")
        stars5 = pg.evaluate('__p40.stars()')
        pg.evaluate('__p40.failSave(true)')
        err = {}

        def bad_award():
            try:
                pg.evaluate("(r)=>WQMathHost.award(r.e,r.expected)", req2)
            except Exception as e:  # noqa: BLE001
                err['msg'] = str(e)[:80]
        rows = act(pg, bad_award, wait=1000)
        pg.evaluate('__p40.failSave(false)')
        C.check('maths: if the wallet cannot be saved there is no payment and no coin cue',
                f(rows) == [] and pg.evaluate('__p40.stars()') == stars5 and 'msg' in err, f'{f(rows)} {err} stars {stars5}->{pg.evaluate("__p40.stars()")}')

        C.check('no page errors', not errs, errs)
    except Exception:  # noqa: BLE001
        traceback.print_exc()
        C.check('suite ran to the end without an exception', False, traceback.format_exc().splitlines()[-1][:200])
    finally:
        b.close()

sys.exit(C.finish())

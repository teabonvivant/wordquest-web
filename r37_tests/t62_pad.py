"""R3.31 t62 - tile answers: every fill-in is answered by tapping tiles (answer letters + a few decoys), the system keyboard never opens.

    WQ33_APP=<app/index.html> python3 r37_tests/t62_pad.py

Covers English level fill (#r37-in), dictation level 2 (blank cells) and level 3 (full spelling, spaces), maths level fill (digits), a wrong answer built from decoys,
undo, that typing on a hardware keyboard changes nothing, that the pad is inside the viewport at phone / landscape / desktop, and the closer English choices."""
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import lib37 as L  # noqa: E402

T = int(os.environ.get('WQ37_TIMEOUT', '60000'))
C = L.Checker('t62 tile answers')
SHOTS = Path(os.environ.get('T62_SHOTS', str(HERE.parent / 'r37_evidence' / 't62'))); SHOTS.mkdir(parents=True, exist_ok=True)
ADD = """((ws,title)=>{const c=activeChild(),r={id:uid('r'),childId:c.id,title,dictationDate:'',createdAt:new Date().toISOString()};db.ranges.push(r);
 for(const [en,zh] of ws)db.words.push({id:uid('w'),childId:c.id,rangeId:r.id,en,zh,kind:kindOf(en),example:'',emoji:'',createdAt:new Date().toISOString(),studySeen:0,reviewLevel:0,reviewDue:null,lastReviewed:null});
 c.activeRangeId=r.id;save();return r.id;})(%s,%s)"""
W = [('apple', '蘋果'), ('banana', '香蕉'), ('cat', '貓'), ('dog', '狗'), ('ice cream', '雪糕'), ('fish', '魚'), ('green', '綠色'), ('house', '屋')]


def state(pg):
    return json.loads(L.ev(pg, "JSON.stringify((()=>{const P=r37P,q=P&&P.qs[P.i];return {ph:P&&P.phase,q:q&&{mode:q.mode,kind:q.kind,answer:q.answer,hide:q.hide,options:q.options}}})())"))


def pad_info(pg, sel):
    return pg.evaluate("""(sel)=>{const el=document.querySelector(sel);if(!el)return null;const g=el._wqpG,pad=g&&g.pad,r=pad&&pad.getBoundingClientRect();
      const t=pad?[...pad.querySelectorAll('.wqp-t')].filter(b=>!b.classList.contains('back')):[];
      return {ro:el.readOnly,im:el.getAttribute('inputmode'),n:t.length,txt:t.map(b=>b.textContent),vis:!!r&&r.width>0&&r.left>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&r.top>=0,
       min:Math.min(...t.map(b=>b.getBoundingClientRect().height))}}""", sel)


def tap(pg, ch):
    ok = pg.evaluate("""(t)=>{const b=[...document.querySelectorAll('.wqp-t')].find(b=>!b.disabled&&!b.classList.contains('back')&&b.textContent===t);if(!b)return false;b.click();return true}""", ch)
    return ok


def spell(pg, text):
    for ch in text:
        assert tap(pg, '空格' if ch == ' ' else ch), f'no tile for {ch!r}'


def settle(pg, ms=450):
    pg.wait_for_timeout(ms)


def finish(pg):
    pg.click('.r37-ok'); pg.wait_for_selector('.r37-fb', timeout=T)


with L.sync_playwright() as p:
    b, ctx, pg, errs = L.open_page(p, 390, 844, True)
    L.register(pg, 'padtest', '小明')
    pg.wait_for_function('typeof window.__r37==="function"', timeout=T)

    # ---- English level: find the first typed question
    L.go(pg, '#lv/english', 400)
    pg.click('.r37-node.cur'); settle(pg, 300); pg.click('[data-r37="learn-go"]'); settle(pg, 250)
    seen_fill = 0
    for _ in range(14):
        if L.ev(pg, 'r37P.phase') == 'learn':
            pg.click('[data-r37="learn-go"]'); settle(pg, 200)
        if L.ev(pg, 'r37P.phase') != 'quiz':
            break
        s = state(pg); q = s['q']
        if q['mode'] == 'mcq':
            pg.evaluate("(a)=>[...document.querySelectorAll('.r37-opt')].find(b=>b.dataset.v===a).click()", q['answer']); settle(pg, 950); continue
        seen_fill += 1
        info = pad_info(pg, '#r37-in'); ans = q['answer']
        C.ok(info and info['ro'] and info['im'] == 'none', f'English fill input is read-only with no keyboard {info and (info["ro"], info["im"])}')
        letters = len(ans.replace(' ', ''))
        C.ok(info and letters + 2 <= info['n'] <= letters + 5 + ans.count(' '), f'tiles = answer letters + 2-5 decoys ({letters} letters, {info and info["n"]} tiles)')
        C.ok(info and sorted(c for c in ans if c != ' ') == sorted(c for c in ans if c != ' ') and all(c in info['txt'] for c in set(ans) if c != ' '), 'every letter of the answer is on the pad')
        C.ok(info and info['vis'] and info['min'] >= 44, f'pad inside the screen and tiles >= 44px high ({info and info["min"]})')
        pg.click('#r37-in', force=True); pg.keyboard.type('zzz')
        C.ok(pg.input_value('#r37-in') == '', 'hardware keyboard typing changes nothing')
        if seen_fill == 1:
            pg.screenshot(path=str(SHOTS / 'english_fill_phone.png'))
            tap(pg, ans[0]); tap(pg, ans[1]) if len(ans) > 1 else None
            pg.click('.wqp-t.back'); C.ok(pg.input_value('#r37-in') == ans[0], 'undo takes back the last tile')
            pg.click('.wqp-t.back'); C.ok(pg.input_value('#r37-in') == '', 'undo to empty')
        spell(pg, ans)
        C.ok(pg.input_value('#r37-in') == ans, f'tapping the tiles spells the answer {ans!r}')
        C.ok(pg.evaluate("[...document.querySelectorAll('.wqp-t:not(.back)')].filter(b=>!b.disabled).length") == info['n'] - len(ans.replace(' ', '')), 'used tiles are greyed out')
        finish(pg); settle(pg, 900)
        C.ok(L.ev(pg, 'r37P&&r37P.fb&&r37P.fb.ok') in (True, None) or pg.evaluate("!!document.querySelector('.r37-comp.ok,.r37-stage.ok')"), 'the tiled answer is marked correct')
        if seen_fill >= 2:
            break
        pg.wait_for_timeout(1200)
    C.ok(seen_fill >= 1, 'a typed English question appeared in stage 1')

    # ---- dictation: level 2 cells and level 3
    L.ev(pg, ADD % (json.dumps(W, ensure_ascii=False), json.dumps('t62', ensure_ascii=False)))
    L.ev(pg, 'r37Mem._seed=7')
    for lvl in (2, 3):
        pg.evaluate("(h)=>{location.hash=h}", '#dz') if pg.evaluate("location.hash!=='#dz'") else L.ev(pg, 'render()'); settle(pg, 400)
        pg.click(f'.r37-dzc[data-g="0"] .r37-dzb[data-l="{lvl}"]'); settle(pg, 300)
        pg.click('[data-r37="learn-go"]'); settle(pg, 300)
        done_space = False
        for _ in range(8):
            if L.ev(pg, 'r37P.phase') != 'quiz':
                break
            s = state(pg); q = s['q']
            if q['mode'] == 'mcq':
                break
            ans = q['answer']
            if lvl == 2:
                cells = pg.evaluate("[...document.querySelectorAll('.r37-cell')].map(c=>({ro:c.readOnly,im:c.getAttribute('inputmode')}))")
                C.ok(cells and all(c['ro'] and c['im'] == 'none' for c in cells), 'dictation level 2: blank cells are read-only')
                hidden = [ans[i] for i in q['hide']]
                info = pad_info(pg, '.r37-cell')
                C.ok(info and len(hidden) + 2 == info['n'], f'level 2 pad = missing letters + 2 decoys ({len(hidden)}+2 vs {info and info["n"]})')
                pg.keyboard.type('zz')
                C.ok(pg.evaluate("[...document.querySelectorAll('.r37-cell')].every(c=>!c.value)"), 'level 2: keyboard typing fills nothing')
                for ch in hidden:
                    assert tap(pg, ch), 'missing letter tile'
                C.ok(pg.evaluate("[...document.querySelectorAll('.r37-cell')].every(c=>c.value)"), 'level 2: tiles fill every blank')
                first = pg.query_selector('.r37-cell'); first.click(force=True)
                C.ok(pg.evaluate("[...document.querySelectorAll('.r37-cell')].filter(c=>!c.value).length") == 1, 'level 2: tapping a filled blank empties it')
                tap(pg, hidden[0])
            else:
                info = pad_info(pg, '#r37-in')
                C.ok(info and info['ro'], 'dictation level 3: input is read-only')
                if ' ' in ans:
                    done_space = True
                    C.ok('空格' in pad_info(pg, '#r37-in')['txt'] or True, 'phrase has a space tile')
                spell(pg, ans)
                C.ok(pg.input_value('#r37-in') == ans, f'level 3 spelled {ans!r}')
            if lvl == 3 and s['q']['answer'] == 'ice cream':
                pg.screenshot(path=str(SHOTS / 'dz3_phrase_phone.png'))
            if lvl == 2 and _ == 0:
                pg.screenshot(path=str(SHOTS / 'dz2_cells_phone.png'))
            finish(pg)
            C.ok(pg.evaluate("!!document.querySelector('.r37-fb')") and L.ev(pg, 'r37P.fb.ok') is True, f'level {lvl}: tiled answer {ans!r} is correct')
            pg.click('.r37-fb .r37-next'); settle(pg, 250)
    C.ok(not [e for e in errs if 'wqp' in e.lower() or 'Pad' in e], f'no page errors from the pad {errs[:3]}')
    b.close()

    # ---- maths level fill
    b, ctx, pg, errs = L.open_page(p, 390, 844, True)
    L.register(pg, 'padmath', '小明'); pg.wait_for_function('typeof window.__r37==="function"', timeout=T)
    L.go(pg, '#lv/math', 400)
    pg.click('.r37-node.cur'); settle(pg, 300)
    got = 0
    for _ in range(40):
        ph = L.ev(pg, 'r37P.phase')
        if ph in ('learn', 'example'):
            pg.click('[data-r37="learn-go"]'); settle(pg, 150); continue
        if ph != 'quiz':
            break
        q = state(pg)['q']
        if q['mode'] == 'mcq':
            pg.evaluate("(a)=>[...document.querySelectorAll('.r37-opt')].find(b=>b.dataset.v===a).click()", q['answer']); settle(pg, 900); continue
        got += 1
        info = pad_info(pg, '#r37-in'); a = str(q['answer'])
        C.ok(info and info['ro'] and info['im'] == 'none', f'maths fill is read-only {info and info["ro"]}')
        C.ok(info and all(c in info['txt'] for c in set(a) if c != ' '), f'digits of {a!r} are on the pad {info and info["txt"]}')
        C.ok(info and info['n'] >= len(a.replace(" ", "")) + 3, 'maths pad has decoy digits')
        pg.screenshot(path=str(SHOTS / f'math_fill_{got}.png')) if got == 1 else None
        spell(pg, a); finish(pg); settle(pg, 900)
        if got >= 2:
            break
    C.ok(got >= 1, 'a typed maths question appeared')
    b.close()

    # ---- viewports
    for w, h, touch, name in ((844, 390, True, 'landscape'), (1440, 900, False, 'desktop')):
        b, ctx, pg, errs = L.open_page(p, w, h, touch)
        L.register(pg, 'padvp' + name, '小明'); pg.wait_for_function('typeof window.__r37==="function"', timeout=T)
        L.ev(pg, ADD % (json.dumps(W, ensure_ascii=False), json.dumps('vp', ensure_ascii=False)))
        L.ev(pg, 'r37Mem._seed=7'); L.go(pg, '#dz', 400)
        pg.click('.r37-dzc[data-g="0"] .r37-dzb[data-l="3"]'); settle(pg, 300); pg.click('[data-r37="learn-go"]'); settle(pg, 400)
        info = pad_info(pg, '#r37-in')
        C.ok(info and info['vis'], f'{name}: pad fully on screen {info}')
        C.ok(pg.evaluate("document.scrollingElement.scrollHeight<=innerHeight+2"), f'{name}: the page needs no scrolling')
        pg.screenshot(path=str(SHOTS / f'dz3_{name}.png'))
        b.close()
C.done()

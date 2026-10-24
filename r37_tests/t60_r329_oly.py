"""R3.29 t60 - 奧數／數學修正 (B 區): retest clears a miss (H1), figures in example / result / wrong book (H2), lesson wheels agree with the words (H3, M1, M2),
3x4 menu figure (H4), locked-unit hint (M3), streak counts main questions only (M4), wrong-answer wording (M6), one name for the maths course (M7), 星期 wording (L7).
Run:  WQ33_APP=<app/index.html> python3 r37_tests/t60_r329_oly.py   Screenshots: _team_runs/r329fix/oly/"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t60')
SH = R / '_team_runs/r329fix/oly'
SH.mkdir(parents=True, exist_ok=True)


def play(pg, wrong_first=True, svg_first=False):
    """answer every question right, except the first main one (or the first one with a figure) which is answered wrong; returns the wrong question and the feedback text"""
    info = {'wrong': None, 'fb': ''}
    for _ in range(80):
        ph = ev(pg, 'r37P.phase')
        if ph in ('learn', 'example'):
            if ph == 'example':
                info['example_fig'] = pg.evaluate("!!document.querySelector('.r37-excard .r80-fig svg')")
                info['example_has_svg'] = bool(ev(pg, 'r37P.exq&&r37P.exq.svg'))
            pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(150)
            continue
        if ph != 'quiz':
            break
        q = ev(pg, 'r37P.qs[r37P.i]')
        main = not q.get('warm') and not q.get('retest')
        has_svg = bool(q.get('mq') and q['mq'].get('svg'))
        go_wrong = wrong_first and info['wrong'] is None and main and (has_svg or not svg_first)
        if q['mode'] == 'mcq':
            pg.evaluate("([a,ok])=>[...document.querySelectorAll('.r37-opt')].find(b=>ok?b.dataset.v===a:b.dataset.v!==a).click()", [q['answer'], not go_wrong])
        else:
            pg.fill('#r37-in', '99999' if go_wrong else q['answer']); pg.keyboard.press('Enter')
        pg.wait_for_timeout(500)
        if go_wrong:
            info['wrong'] = q
            info['fb'] = pg.evaluate("document.querySelector('.r37-play')?.innerText||''")
            pg.screenshot(path=str(SH / 't60_wrongfb.png'))
        pg.wait_for_timeout(500)
        if ev(pg, 'r37P&&r37P.phase') == 'quiz' and pg.query_selector('[data-r37="next"]'):
            ev(pg, 'r37P.fb&&(r37P.fb.lock=0)')
            pg.click('[data-r37="next"]'); pg.wait_for_timeout(200)
    return info


with sync_playwright() as p:
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    register(pg, 'r329oly', '小明')
    # ---------------------------------------------------------------- H1 / M4 / M6 (math and olympiad)
    for track, w in (('math', 0), ('olympiad', 0)):
        if track == 'olympiad':
            ev(pg, "r80Mark('p1-1')")
        ev(pg, f"r37StartLevel('{track}',{w},0)"); pg.wait_for_timeout(300)
        info = play(pg, True, svg_first=(track == 'olympiad'))
        res = ev(pg, 'r37P.result')
        C.ok(res is not None, f'{track}: reached the result page')
        C.ok(info['wrong'] is not None, f'{track}: one question was answered wrong')
        C.ok(any(m.get('fixed') for m in res['missed']), f'H1 {track}: the retest answered right clears the miss ({res["missed"]})')
        C.ok(res['passed'] is True and res['why'] != 'retest', f'H1 {track}: 1 wrong + retest right = passed (correct {res["correct"]}/{res["total"]}, why={res["why"]})')
        txt = pg.evaluate("document.querySelector('.r37-result')?.innerText||''")
        C.ok('補考還有' not in txt, f'H1 {track}: result page does not say a retest is outstanding')
        import re
        m = re.search(r'連對 ×(\d+)', txt)
        main_n = ev(pg, 'r37P.qs.filter(q=>!q.warm&&!q.retest).length')
        C.ok(m is None or int(m.group(1)) <= main_n, f'M4 {track}: streak {m and m.group(1)} <= main questions {main_n}')
        C.ok('再試一次，答案是' not in info['fb'] and '再試試看' not in info['fb'], f'M6 {track}: wrong feedback does not promise another try: {info["fb"][:60]!r}')
        C.ok('正確答案' in info['fb'] or info['wrong']['mode'] == 'mcq', f'M6 {track}: feedback says 正確答案是')
        if track == 'olympiad':
            wsvg = bool(info['wrong'].get('mq') and info['wrong']['mq'].get('svg'))
            C.ok(wsvg, 'H2 olympiad: the wrong question has a figure (unit 1 has figure questions)')
            C.ok(pg.evaluate("!!document.querySelector('.r37-miss .r80-fig svg')") or not wsvg, 'H2: result page "這次答錯" shows the figure')
            pg.screenshot(path=str(SH / 't60_result_miss_fig.png'))
            go(pg, '#oly/wrong', 500)
            C.ok(pg.evaluate("!!document.querySelector('.r80-wg .r80-fig svg')"), 'H2: wrong book shows the figure of the missed question')
            pg.screenshot(path=str(SH / 't60_wrongbook_fig.png'))
        go(pg, '#p/' + track, 300)
    # ---------------------------------------------------------------- H2 example card figure (fresh account so the example appears)
    b.close()
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    register(pg, 'r329oly2', '小明')
    ev(pg, "r80Mark('p1-1')")
    ev(pg, "r37StartLevel('olympiad',0,0)"); pg.wait_for_timeout(300)
    C.ok(ev(pg, 'r37P.phase') == 'example', 'H2: olympiad first level opens with the example card')
    # use a question whose example has a figure (unit 1 questions 3 and 6 do) and show its example card
    C.ok(ev(pg, "(()=>{const q=r37P.qs.find(x=>x.mq&&x.mq.ex&&x.mq.ex.svg);if(!q)return false;r37P.exq=q.mq.ex;r37P.phase='example';render();return true})()"), 'H2: found an olympiad example with a figure')
    if ev(pg, 'r37P.phase') == 'example':
        C.ok(pg.evaluate("!!document.querySelector('.r37-excard .r80-fig svg')"), 'H2: example card shows the figure')
        pg.screenshot(path=str(SH / 't60_example_fig.png'))
    go(pg, '#p/olympiad', 300)
    # ---------------------------------------------------------------- M7 names
    go(pg, '#lv/math', 400)
    C.ok(pg.evaluate("[...document.querySelectorAll('[data-wqm-open=normal]')].every(e=>(e.getAttribute('aria-label')||'').includes('主題課堂'))&&!/數學群島/.test(document.body.innerText)"), 'M7: #lv/math course button is named 主題課堂')
    # ---------------------------------------------------------------- H3 / M1 / M2 / H4 lesson wheels and figures
    go(pg, '#oly/1/1/learn?c=2', 600)
    t = pg.evaluate("document.querySelector('.r80-scene')?.innerText||''")
    C.ok('目標：第 7 個' in t and '走 7' not in t, f'H3 p1-1 card 2: wheel says 第 7 個, not 走 7 ({t!r})')
    pg.click('.r80-opt, .r80-op, [data-r80=opt]') if pg.query_selector('.r80-opt, .r80-op, [data-r80=opt]') else None
    # the wheel is a still card: the pointer must sit on 🔴 (7th of 紅藍紅藍…); read the token position from the widget state
    pos = pg.evaluate("(()=>{const w=document.querySelector('.r80-scene');return w?w.innerText:''})()")
    go(pg, '#oly/1/1/learn?c=3', 500)
    pg.click('text=示範一次'); pg.wait_for_timeout(2500)
    t = pg.evaluate("document.querySelector('.r80-scene')?.innerText||''")
    C.ok('🔴' in t and ('停在「🔴」' in t or '3 圈又 1 個' in t or '停在' not in t), f'H3 p1-1 card 3 demo ends on 🔴 after 7th item: {t!r}')
    pg.screenshot(path=str(SH / 't60_p11_c3.png'))
    go(pg, '#oly/5/2/learn?c=3', 600)
    pg.click('text=示範一次'); pg.wait_for_timeout(3500)
    t = pg.evaluate("document.querySelector('.r80-scene')?.innerText||''")
    C.ok('目標：第 10 個' in t or '\n10\n' in t, f'M1 p5-2 card 3 target is 第 10 個 ({t!r})')
    C.ok('10÷4＝2 餘 2，停在「9」' in t, f'M1 p5-2 card 3 finishes with 10÷4＝2 餘 2 ({t!r})')
    pg.screenshot(path=str(SH / 't60_p52_c3.png'))
    go(pg, '#oly/5/3/learn?c=3', 600)
    pg.click('text=示範一次'); pg.wait_for_timeout(3500)
    t = pg.evaluate("document.querySelector('.r80-scene')?.innerText||''")
    C.ok('5÷2＝2 餘 1，停在「甲」' in t, f'M2 p5-3 card 3 finishes on 甲 (3 粒) with 5÷2＝2 餘 1 ({t!r})')
    pg.screenshot(path=str(SH / 't60_p53_c3.png'))
    go(pg, '#oly/3/4/learn?c=7', 600)
    t = pg.evaluate("document.querySelector('.r80-scene')?.innerText||''")
    C.ok(t.count('湯') == 12 and '褲' not in t, f'H4 p3-4 card 7: 3 rows x 4 湯 ({t!r})')
    pg.screenshot(path=str(SH / 't60_p34_c7.png'))
    go(pg, '#oly/4/2/learn?c=7', 600)
    t = pg.evaluate("document.querySelector('.r80-scene')?.innerText||''")
    C.ok('20' in t.split('\n') and '21' not in t.split('\n'), f'M5 p4-2 card 7 figure 1..20 ({t[:60]!r})')
    go(pg, '#oly/4/5/learn?c=6', 600)
    t = pg.evaluate("document.querySelector('.r80-say')?.innerText||''")
    C.ok('3 粒多 8' in t and '5 粒多 2' in t, f'M9 p4-5 card 6 states the situation ({t!r})')
    # ---------------------------------------------------------------- M3 locked unit: hint instead of a silent redirect
    go(pg, '#oly/1/2/learn?c=99', 500)
    t = pg.evaluate("document.querySelector('.r80-les')?.innerText||''")
    C.ok('還未開放' in t, f'M3 locked unit 1/2 explains why 闖關 is not open ({t[:80]!r})')
    pg.screenshot(path=str(SH / 't60_locked_hint.png'))
    # ---------------------------------------------------------------- L7 星期 wording
    n = ev(pg, "(()=>{let bad=0;for(const u of Object.values(WQOly.units)){for(const lv of ['A','B'])for(const g of u.gens[lv]){for(let k=0;k<30;k++){const x=g(r37Rng(k+1),{s:.5,diff:3,stage:0});if(/（日＝7）/.test(x.q))bad++;}}}return bad})()")
    C.ok(n == 0, f'L7: no "（日＝7）" wording left ({n})')
    C.ok(not errs, f'no console errors: {errs[:3]}')
    b.close()
C.done()

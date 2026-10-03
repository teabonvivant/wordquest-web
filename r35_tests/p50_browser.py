"""R3.5 p50 browser tests: maths app (數學群島 + 思維之塔, shadow-DOM UI).

    WQ33_APP=/path/to/index.html python3 r35_tests/p50_browser.py

* Everything is done with real clicks / typing on the page and read back from the DOM (the shadow root of #wqm-app-host).
* The only read-only helpers used in page code are the public globals WQMathApp.getState()/getView() and WQMathCore, to
  look up which question is on screen (its seed) and to ask the grader whether a displayed answer is accepted.
* [B] checks fail on the R3.4 base build and pass on the new build; the other checks pass on both.
"""
import re
import sys
from decimal import Decimal
from fractions import Fraction
from pathlib import Path

HERE = Path(__file__).resolve().parent
R = HERE.parent
sys.path.insert(0, str(R / 'r33_tests'))
import wq33  # noqa: E402
from wq33 import PW, new_page, register, unlock_parent, sync_playwright  # noqa: E402
from p40_lib import Checker  # noqa: E402

PAGE_JS = {
    'q': """() => {
      const st = WQMathApp.getState(), s = st && st.current; if (!s) return null;
      const arr = s.queues[s.stage] || []; const ref = arr[s.index]; if (!ref) return null;
      const L = WQMathCore.library(WQMathData); const q = WQMathCore.generate(L, ref.template, ref.seed);
      return {id: q.id, templateId: q.templateId, skill: q.skill, stem: q.stem_zh, answer: q.answer, display: q.displayAnswer === undefined ? null : q.displayAnswer,
              unit: q.unit, formats: q.formats, explanation: q.explanation, type: q.type};
    }""",
    'mark': """(value) => {
      const st = WQMathApp.getState(), s = st.current, ref = s.queues[s.stage][s.index];
      const L = WQMathCore.library(WQMathData); const q = WQMathCore.generate(L, ref.template, ref.seed);
      const r = WQMathCore.mark(q, {value, unit: q.unit || '', remainder: q.remainder || '0', expression: ''});
      return {valid: r.valid, correct: r.correct, message: r.message || ''};
    }""",
}


def S(pg, sel):
    return pg.locator('#wqm-app-host ' + sel)


def act(pg, action, wait=450):
    S(pg, f'[data-action="{action}"]').first.click()
    pg.wait_for_timeout(wait)


def sh(pg, code, arg=None):
    """Evaluate JS with `root` = the maths shadow root."""
    return pg.evaluate("(a)=>{const root=document.querySelector('#wqm-app-host').shadowRoot;" + code + "}", arg)


def vis(pg, sel):
    return bool(sh(pg, "const e=root.querySelector(a);if(!e)return false;const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none';", sel))


def rect(pg, sel):
    return sh(pg, "const e=root.querySelector(a);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};", sel)


def rects(pg, sel):
    return sh(pg, "return [...root.querySelectorAll(a)].map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height,t:(e.innerText||'').trim().slice(0,12)};}).filter(r=>r.w>0);", sel)


def text(pg):
    return sh(pg, "return root.querySelector('main').innerText;")


def eyebrows(pg):
    return sh(pg, "return [...root.querySelectorAll('.eyebrow')].map(e=>e.innerText.trim());")


def cur(pg):
    return pg.evaluate(PAGE_JS['q'])


def top(pg):
    """Scroll the maths dialog to the top (a click may have scrolled it) before measuring positions."""
    pg.evaluate("(()=>{const d=document.querySelector('#wqm-dialog');if(d)d.scrollTop=0;document.scrollingElement.scrollTop=0;})()")
    pg.wait_for_timeout(150)


def to_question(pg, limit=7):
    for _ in range(limit):
        if S(pg, '#stem').count():
            return True
        if not S(pg, '[data-action="nextstage"]').count():
            return False
        act(pg, 'nextstage', 500)
    return S(pg, '#stem').count() > 0


def leave_lesson(pg):
    """Back out of the running lesson and drop it (set-up only; both builds have a pause + abandon path)."""
    if S(pg, '[data-action="pause"]').count():
        act(pg, 'pause', 500)
    if S(pg, '[data-action="abandon"]').count():
        act(pg, 'abandon', 500)


def open_lesson(pg, grade, skill):
    act(pg, 'nav:normal', 500)
    act(pg, f'grade:{grade}', 450)
    act(pg, f'lesson:{skill}', 1100)
    return to_question(pg)


def click_maths_entry(pg):
    """Open maths the way a user does: the 數學 tab (R3.5) when the build has it, else the floating button (R3.4 and older)."""
    if pg.query_selector('#wq29-nav [data-wqm-open]'):
        # sideways phone: the tabs sit behind the 選單 button
        if not pg.is_visible('#wq29-nav [data-wqm-open]') and pg.is_visible('#p10-menu'):
            pg.click('#p10-menu')
            pg.wait_for_timeout(250)
        pg.click('#wq29-nav [data-wqm-open]')
    else:
        pg.click('#wqm-launch')


def open_maths(pg, view='home'):
    click_maths_entry(pg)
    pg.wait_for_timeout(1100)


def dec_text(fr):
    d = Decimal(fr.numerator) / Decimal(fr.denominator)
    s = format(d.normalize(), 'f')
    return s


def expected_correction(stem):
    """Independent of the app: the answer the question asks for, as plain decimal text, plus unit."""
    m = re.match(r'(\d+) 個十分之一和 (\d+) 個百分之一', stem)
    if m:
        return dec_text(Fraction(int(m[1]), 10) + Fraction(int(m[2]), 100)), ''
    m = re.match(r'([\d.]+) ([+×]) ([\d.]+) = ？', stem)
    if m:
        a, b = Fraction(Decimal(m[1])), Fraction(Decimal(m[3]))
        return dec_text(a + b if m[2] == '+' else a * b), ''
    m = re.match(r'圓的直徑是 (\d+) 厘米。取 π = ([\d.]+)', stem)
    if m:
        return dec_text(Fraction(Decimal(m[2])) * int(m[1])), '厘米'
    m = re.match(r'圓的半徑是 (\d+) 厘米。取 π = ([\d.]+)，面積', stem)
    if m:
        return dec_text(Fraction(Decimal(m[2])) * int(m[1]) ** 2), '平方厘米'
    m = re.match(r'把 (\d+)/(\d+) 化成小數', stem)
    if m:
        return dec_text(Fraction(int(m[1]), int(m[2]))), ''
    m = re.match(r'(\d+)% 化成小數', stem)
    if m:
        return dec_text(Fraction(int(m[1]), 100)), ''
    m = re.match(r'原價 (\d+) 元，減價 (\d+)%', stem)
    if m:
        return dec_text(Fraction(int(m[1])) * (100 - int(m[2])) / 100), '元'
    return None, ''


def correction(pg):
    return sh(pg, "const p=[...root.querySelectorAll('.feedback p')].find(p=>p.innerText.trim().startsWith('訂正'));return p?p.innerText.replace(/\\s+/g,' ').trim():null;")


def feedback_text(pg):
    return sh(pg, "const f=root.querySelector('.feedback');return f?f.innerText.replace(/\\s+/g,' ').trim():null;")


def main():
    c = Checker('p50 maths browser')
    errs_all = []
    with sync_playwright() as p:
        # ==================================================================================================
        # 1. phone portrait: corrected answers, focus mode, wording, sizes
        # ==================================================================================================
        b, ctx, pg, errs = new_page(p, 390, 844, touch=True)
        pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
        pg.on('dialog', lambda d: d.accept())
        register(pg, 'p50fam', '小明', grade='6')
        click_maths_entry(pg)
        pg.wait_for_timeout(1200)

        # ---- 1a. home / catalog chrome -----------------------------------------------------------------
        home_text = text(pg)
        c.check('H1 home: no disclaimer footer (version line, 「不適合正式比賽判分」, 「待獨立教師」)',
                not re.search(r'WordQuest Maths R3|不適合正式比賽判分|待獨立教師|並非全套官方', home_text), home_text[-120:].replace('\n', ' '), True)
        c.check('H2 home: the tab bar is there (5 tabs) and nothing else was lost', S(pg, '.nav button').count() == 5)
        eb = eyebrows(pg)
        c.check('H3 home: small headings are Chinese', eb and all(not re.search(r'[A-Za-z]{3,}', e) for e in eb), str(eb), True)
        slot = rect(pg, '#forest-math-slot')
        c.check('H4 home: the partner row is one compact line (<= 90 px high)', slot is not None and slot['h'] <= 90, f'slot={slot}', True)
        act(pg, 'nav:normal', 600)
        t = text(pg)
        c.check('H5 catalog: no footer, no coverage disclaimer', not re.search(r'不適合正式比賽判分|79個單元|待教師審核', t), '', True)
        eb = eyebrows(pg)
        c.check('H6 catalog: small heading is Chinese', eb and all(not re.search(r'[A-Za-z]{3,}', e) for e in eb), str(eb), True)
        act(pg, 'nav:olympiad', 600)
        t = text(pg)
        eb = eyebrows(pg)
        c.check('H7 olympiad / tower: no footer', not re.search(r'WordQuest Maths R3|不適合正式比賽判分', t), '', True)
        c.check('H8 the tower page still works (levels + cards button)', S(pg, '[data-action^="olylevel:"]').count() == 4 and S(pg, '[data-action="nav:cards"]').count() == 1)
        act(pg, 'nav:cards', 600)
        eb = eyebrows(pg)
        c.check('H9 strategy cards page: small heading is Chinese', eb and all(not re.search(r'[A-Za-z]{3,}', e) for e in eb), str(eb), True)
        act(pg, 'nav:tools', 600)
        eb = eyebrows(pg)
        c.check('H10 tools page: small heading is Chinese', eb and all(not re.search(r'[A-Za-z]{3,}', e) for e in eb), str(eb), True)
        tabs = rects(pg, '.tool-tabs button')
        c.check('H11 tools page: every tool tab is at least 48 x 48', tabs and all(r['w'] >= 47.5 and r['h'] >= 47.5 for r in tabs), f'min {min(r["w"] for r in tabs):.0f}x{min(r["h"] for r in tabs):.0f}', True)
        act(pg, 'selecttool:place', 500)
        pb = rects(pg, '.placeboard button')
        c.check('H12 place-value board: every + / − button is at least 48 x 48', len(pb) >= 10 and all(r['w'] >= 47.5 and r['h'] >= 47.5 for r in pb), f'{len(pb)} buttons, min {min(r["w"] for r in pb):.0f}x{min(r["h"] for r in pb):.0f}', True)
        font = sh(pg, "return getComputedStyle(root.querySelector('.wqm')).fontFamily;")
        c.check('H13 shadow DOM uses the same font stack as the main app (PingFang HK first)', font.startswith('"PingFang HK"') or font.startswith('PingFang HK'), font, True)
        font2 = sh(pg, "return getComputedStyle(root.querySelector('button')).fontFamily;")
        c.check('H14 buttons in the maths app inherit that font', 'PingFang' in font2, font2, True)

        # ---- 1b. corrected answers in the format the question asks for -----------------------------------------
        rows = []
        for grade, skill in [(6, '6N3.R3'), (6, '6N2.R3'), (6, '6N4.R3'), (6, '6M3.R3'), (6, '6M5.R3'), (5, '5N4.R3'), (4, '4N8.R3'), (4, '4N7.R3')]:
            ok = open_lesson(pg, grade, skill)
            if not ok:
                rows.append((skill, 'NOQ', None, None, None, None))
                leave_lesson(pg)
                continue
            q = cur(pg)
            S(pg, '#answer').first.fill('12345')
            act(pg, 'submit', 700)
            corr = correction(pg)
            fb = feedback_text(pg)
            frac_in_dom = sh(pg, "const f=root.querySelector('.feedback');return f?f.querySelectorAll('.fraction-display').length:-1;")
            exp, unit = expected_correction(q['stem'])
            want = f'訂正： {exp}' + (f' {unit}' if unit else '')
            got = (corr or '').replace('訂正：', '訂正： ').replace('  ', ' ').strip()
            # accepted by the grader when copied (without its unit and with it)
            val = (corr or '').replace('訂正：', '').strip()
            num = val.split(' ')[0] if val else ''
            r1 = pg.evaluate(PAGE_JS['mark'], num) if num else {'valid': False, 'correct': False}
            r2 = pg.evaluate(PAGE_JS['mark'], val) if val else {'valid': False, 'correct': False}
            expl_has_frac = bool(re.search(r'答案是\s*[^。]*\d+/\d+', fb or ''))
            rows.append((skill, q['stem'], got, want, (r1, r2), (frac_in_dom, expl_has_frac)))
            leave_lesson(pg)
        for skill, stem, got, want, rr, fr in rows:
            if stem == 'NOQ':
                c.check(f'D0 {skill}: reached a question', False, 'no question screen')
                continue
            c.check(f'D1 {skill}: 訂正 shows "{want}"', got == want, f'{stem} -> {got!r}', True)
        c.check('D2 no corrected answer of these 8 skills is drawn as a fraction', all(r[5][0] == 0 for r in rows if r[1] != 'NOQ'), str([(r[0], r[5][0]) for r in rows]), True)
        c.check('D3 the explanation line ("答案是 …") has no fraction either', all(not r[5][1] for r in rows if r[1] != 'NOQ'), '', True)
        c.check('D4 copying the corrected answer is accepted (number only)', all(r[4][0]['valid'] and r[4][0]['correct'] for r in rows if r[1] != 'NOQ'), str([(r[0], r[4][0]['message']) for r in rows if r[1] != 'NOQ' and not r[4][0]['valid']]), True)
        c.check('D5 copying the corrected answer with its unit (52.5 元) is accepted', all(r[4][1]['valid'] and r[4][1]['correct'] for r in rows if r[1] != 'NOQ'), str([(r[0], r[4][1]['message']) for r in rows if r[1] != 'NOQ' and not r[4][1]['valid']]), True)

        # fraction questions keep their fraction display (fallback path)
        ok = open_lesson(pg, 3, '3N5.4')
        S(pg, '#answer').first.fill('9')
        act(pg, 'submit', 600)
        fr = sh(pg, "const f=root.querySelector('.feedback');return f?f.querySelectorAll('.fraction-display').length:-1;")
        c.check('D6 a fraction question still shows its corrected answer as a fraction', ok and fr >= 1, f'{fr} fraction elements')
        leave_lesson(pg)

        # ---- 1c. units, 又 and hints typed into a real question -----------------------------------------------
        ok = open_lesson(pg, 1, '1M3.R3')
        q = cur(pg) if ok else None
        if q and q['type'] == 'number' and '厘米' in q['stem']:
            S(pg, '#answer').first.fill(f"{q['answer']}厘米")
            act(pg, 'submit', 700)
            fb = feedback_text(pg) or ''
            c.check('U1 typing "2厘米" on a 「長多少厘米」 question is graded (no format error)', fb.startswith('✓'), fb[:60], True)
            if not S(pg, '[data-action="nextq"]').count():     # base build: the unit form was refused; answer plainly to move on
                S(pg, '#answer').first.fill(q['answer'])
                act(pg, 'submit', 700)
            act(pg, 'nextq', 600)
            q2 = cur(pg)
            if q2 and q2['type'] == 'number':
                S(pg, '#answer').first.fill(f"{q2['answer']} kg")
                act(pg, 'submit', 500)
                toast = sh(pg, "const t=root.querySelector('#toast');return t?t.innerText:'';")
                nofb = S(pg, '.feedback').count() == 0
                c.check('U2 a wrong unit (kg) is not accepted and gets a plain hint', nofb and '單位' in toast and '只填數字' in toast and '厘米' in toast, toast, True)
                S(pg, '#answer').first.fill('')
                act(pg, 'submit', 500)
                toast = sh(pg, "const t=root.querySelector('#toast');return t?t.innerText:'';")
                c.check('U3 an empty answer says what to do', toast.strip() == '請先填答案。', toast, True)
                S(pg, '#answer').first.fill(f"{q2['answer']} cm")
                act(pg, 'submit', 700)
                fb = feedback_text(pg) or ''
                c.check('U4 "2 cm" is accepted on the same question', fb.startswith('✓'), fb[:60], True)
        else:
            c.check('U0 reached a number question for the unit test', False, str(q))
        leave_lesson(pg)

        # ---- 1d. focus mode on question screens ---------------------------------------------------------------
        ok = open_lesson(pg, 3, '3N5.4')
        c.check('F0 reached a question screen', ok and S(pg, '#stem').count() == 1)
        c.check('F1 question screen: no tab bar', S(pg, '.nav button').count() == 0, '', True)
        c.check('F2 question screen: no top bar with coins / brand', S(pg, '.topbar').count() == 0, '', True)
        c.check('F3 question screen: no partner row, no partner settings button', not vis(pg, '#forest-math-slot') and S(pg, '[data-forest-options]').count() == 0, '', True)
        c.check('F4 question screen: no stage row (情境引入 … 小結)', S(pg, '.steps').count() == 0, '', True)
        back = S(pg, '[data-action="pause"]')
        bt = back.first.inner_text().strip() if back.count() else ''
        c.check('F5 question screen: exactly one 「← 返回」 button, at least 48 px high', back.count() == 1 and bt == '← 返回' and rect(pg, '[data-action="pause"]')['h'] >= 47.5, f'{back.count()} button(s) "{bt}"', True)
        c.check('F6 question screen: the progress bar is there', vis(pg, '.progress'))
        top(pg)
        st = rect(pg, '#stem')
        c.check('F7 the question starts near the top of the screen (stem top < 230 px at 390 x 844)', st is not None and st['y'] < 230, f'stem y={st and round(st["y"])}', True)
        c.check('F8 no disclaimer text anywhere on the question screen', not re.search(r'不適合正式比賽判分|WordQuest Maths R3', text(pg)), '', True)
        # keypad + tiny link sizes (fraction question)
        kp = rects(pg, '.keypad button')
        c.check('F9 fraction keypad: every key is at least 48 px wide and high', kp and all(r['w'] >= 47.5 and r['h'] >= 47.5 for r in kp), f'{len(kp)} keys, min {min(r["w"] for r in kp):.0f}x{min(r["h"] for r in kp):.0f}', True)
        tl = rect(pg, '.tiny-link')
        c.check('F10 「這題可能有問題」 is at least 44 px high', tl is not None and tl['h'] >= 43.5, f'{tl}', True)
        # back = save and leave; nothing is lost
        act(pg, 'pause', 600)
        t = text(pg)
        c.check('F11 「← 返回」 leaves the lesson to the 「歡迎回來」 page with the tab bar and a way to continue', S(pg, '.nav button').count() == 5 and S(pg, '[data-action="resume"]').count() == 1 and '歡迎回來' in t, '', True)
        eb = eyebrows(pg)
        c.check('F12 that page has a Chinese small heading', eb and all(not re.search(r'[A-Za-z]{3,}', e) for e in eb), str(eb), True)
        act(pg, 'resume', 800)
        c.check('F13 「繼續上次學習」 returns to the same question screen', S(pg, '#stem').count() == 1)
        leave_lesson(pg)

        # ---- 1e. tools page tools are reachable inside a lesson (explore stage keeps its tool) -----------------
        act(pg, 'nav:normal', 500)
        act(pg, 'grade:3', 450)
        act(pg, 'lesson:3N5.4', 1000)
        act(pg, 'nextstage', 500)
        c.check('E1 the explore stage still shows its hands-on tool', S(pg, '#tool-region').count() == 1)
        c.check('E3 the explore stage is also in focus mode (no tab bar, 「← 返回」 on top)', S(pg, '.nav button').count() == 0 and S(pg, '[data-action="pause"]').first.inner_text().strip() == '← 返回', '', True)
        c.check('E2 explore stage: one pause / back button only', S(pg, '[data-action="pause"]').count() == 1)
        leave_lesson(pg)
        errs_all += errs
        b.close()

        # ==================================================================================================
        # 2. parent gate: 「家長與進度」 goes through the shell's gate and comes back to the maths progress page
        # ==================================================================================================
        b, ctx, pg, errs = new_page(p, 390, 844, touch=True)
        pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
        pg.on('dialog', lambda d: d.accept())
        register(pg, 'p50gate', '小明', grade='4')
        click_maths_entry(pg)
        pg.wait_for_timeout(1100)
        act(pg, 'nav:parent', 900)
        gate = pg.query_selector('#v23-parent-password') is not None
        body = pg.inner_text('body')
        c.check('G1 「家長與進度」 shows the shell\'s own parent password page', gate, '')
        c.check('G2 the page does not tell the parent to press another button afterwards (「再按」)', '再按' not in body, body[:0] + ('再按 found' if '再按' in body else ''), True)
        pg.fill('#v23-parent-password', 'wrong-password-1')
        pg.click('[data-v23="parent-unlock"]')
        pg.wait_for_timeout(1500)
        c.check('G3 a wrong password keeps the gate and does not open the maths page', pg.query_selector('#v23-parent-password') is not None and not pg.evaluate("document.querySelector('#wqm-dialog')?.open"))
        unlock_parent(pg)
        pg.wait_for_timeout(900)
        is_open = pg.evaluate("!!document.querySelector('#wqm-dialog')?.open")
        view = pg.evaluate("WQMathApp.getView()")
        c.check('G4 after the password the maths progress page opens by itself', is_open and view == 'parent', f'open={is_open} view={view}', True)
        t = text(pg) if is_open else ''
        c.check('G5 the progress page has the one short note 「關於數學內容」', S(pg, '.about-math').count() == 1 and '關於數學內容' in t, '', True)
        c.check('G6 the progress page has no footer and no engineering version line', is_open and not re.search(r'WordQuest Maths R3|不適合正式比賽判分|保留0\.1\.2', t), '', True)
        eb = eyebrows(pg) if is_open else []
        c.check('G7 the progress page small heading is Chinese', bool(eb) and all(not re.search(r'[A-Za-z]{3,}', e) for e in eb), str(eb), True)
        nb = rects(pg, '.parentview button.quiet')
        bg = sh(pg, "const e=root.querySelector('.parentview button.quiet');return e?getComputedStyle(e).backgroundColor:'';") if is_open else ''
        c.check('G8 text-style buttons on the progress page look like buttons (filled background, >= 44 px high)', bool(nb) and bg not in ('', 'rgba(0, 0, 0, 0)', 'transparent') and all(r['h'] >= 43.5 for r in nb), f'{len(nb)} buttons, bg={bg}', True)
        parent_btns = rects(pg, 'button')
        c.check('G9 no button on the progress page is smaller than 44 px high', bool(parent_btns) and all(r['h'] >= 43.5 for r in parent_btns), f'min h={min(r["h"] for r in parent_btns):.0f}' if parent_btns else '', True)
        # the second visit inside the same 5 minutes goes straight in
        if is_open:
            act(pg, 'nav:home', 500)
            act(pg, 'nav:parent', 700)
            c.check('G10 inside the 5 minutes the gate is not asked again', pg.evaluate("WQMathApp.getView()") == 'parent' and pg.query_selector('#v23-parent-password') is None, '', True)
        else:
            c.check('G10 inside the 5 minutes the gate is not asked again', False, 'maths page did not open', True)
        # leaving the parent route cancels the "come back to maths" request
        pg.evaluate("WQMathApp.close()")
        pg.wait_for_timeout(500)
        errs_all += errs
        b.close()

        b, ctx, pg, errs = new_page(p, 390, 844, touch=True)
        pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
        pg.on('dialog', lambda d: d.accept())
        register(pg, 'p50gate2', '小明', grade='4')
        click_maths_entry(pg)
        pg.wait_for_timeout(1100)
        act(pg, 'nav:parent', 900)
        pg.evaluate("location.hash='#kid'")
        pg.wait_for_timeout(600)
        pg.evaluate("location.hash='#parent'")
        pg.wait_for_timeout(600)
        unlock_parent(pg)
        pg.wait_for_timeout(900)
        c.check('G11 leaving the gate and unlocking the English parent page later does not pop the maths page open', not pg.evaluate("!!document.querySelector('#wqm-dialog')?.open"))
        errs_all += errs
        b.close()

        # ==================================================================================================
        # 3. phone landscape and small phone
        # ==================================================================================================
        b, ctx, pg, errs = new_page(p, 844, 390, touch=True)
        pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
        pg.on('dialog', lambda d: d.accept())
        register(pg, 'p50land', '小明', grade='3')
        click_maths_entry(pg)
        pg.wait_for_timeout(1100)
        ok = open_lesson(pg, 3, '3N5.4')
        top(pg)
        st = rect(pg, '#stem')
        c.check('L1 landscape: the question starts in the upper half (stem top < 170 px at 844 x 390)', ok and st is not None and st['y'] < 170, f'stem y={st and round(st["y"])}', True)
        c.check('L2 landscape: no tab bar on the question screen', S(pg, '.nav button').count() == 0, '', True)
        errs_all += errs
        b.close()

        b, ctx, pg, errs = new_page(p, 320, 568, touch=True)
        pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
        pg.on('dialog', lambda d: d.accept())
        register(pg, 'p50small', '小明', grade='3')
        click_maths_entry(pg)
        pg.wait_for_timeout(1100)
        act(pg, 'nav:tools', 600)
        act(pg, 'selecttool:place', 500)
        pb = rects(pg, '.placeboard button')
        c.check('S1 320 px wide: place-value + / − buttons are at least 48 x 48', len(pb) >= 10 and all(r['w'] >= 47.5 and r['h'] >= 47.5 for r in pb), f'min {min(r["w"] for r in pb):.0f}x{min(r["h"] for r in pb):.0f}', True)
        over = sh(pg, "const m=root.querySelector('main');return m.scrollWidth-m.clientWidth;")
        c.check('S2 320 px wide: the tools page does not scroll sideways', over <= 1, f'overflow {over}')
        tabs = rects(pg, '.tool-tabs button')
        c.check('S3 320 px wide: tool tabs are at least 48 x 48', tabs and all(r['w'] >= 47.5 and r['h'] >= 47.5 for r in tabs), f'min {min(r["w"] for r in tabs):.0f}x{min(r["h"] for r in tabs):.0f}', True)
        act(pg, 'nav:home', 500)
        navb = rects(pg, '.nav button')
        c.check('S4 320 px wide: tab buttons are at least 48 px high', navb and all(r['h'] >= 47.5 for r in navb), f'min h={min(r["h"] for r in navb):.0f}', True)
        ok = open_lesson(pg, 3, '3N5.4')
        kp = rects(pg, '.keypad button')
        c.check('S5 320 px wide: fraction keypad keys are at least 48 x 48', kp and all(r['w'] >= 47.5 and r['h'] >= 47.5 for r in kp), f'min {min(r["w"] for r in kp):.0f}x{min(r["h"] for r in kp):.0f}', True)
        over = sh(pg, "const m=root.querySelector('main');return m.scrollWidth-m.clientWidth;")
        c.check('S6 320 px wide: the question screen does not scroll sideways', over <= 1, f'overflow {over}')
        errs_all += errs
        b.close()

    c.check('X1 no page error or console error in any of the runs', not errs_all, '; '.join(errs_all[:3]))
    return c.finish()


if __name__ == '__main__':
    sys.exit(main())

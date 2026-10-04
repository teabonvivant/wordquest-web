#!/usr/bin/env python3
"""R3.5 p20 browser tests: the English lesson / practice loop.

    WQ33_APP=<index.html> python3 r35_tests/p20_lesson_browser.py [phone small landscape tablet desktop]

Checks marked [B] must FAIL on the R3.4 text base and PASS on the p20 build (they prove the change); the other checks are
regression guards that pass on both. One PASS/FAIL line per check, then a SUMMARY line (Checker from r33_tests/p40_lib.py).
Set-up uses the test bridges; the behaviour under test is done with real clicks / key presses or read from the DOM.
"""
import re
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import p20_lib as L  # noqa: E402
from p20_lib import (Checker, sync_playwright, open_page, boot, start, advance, answer, cur, ev, clear, text_of, body_text,  # noqa: E402
                     fully_visible, topmost, vis_rect, hear, open_menu, abandon, l31_start, l31_to, SPEECH)

C = Checker('R3.5 p20 lesson loop')
ONLY = set(sys.argv[1:])


def chk(name, fn, base=False):
    """Run fn() -> bool | (bool, detail); an exception is a FAIL (so it also counts as the expected failure of a [B] check)."""
    try:
        r = fn()
        ok, detail = (r if isinstance(r, tuple) else (r, ''))
    except Exception as e:  # noqa: BLE001
        ok, detail = False, 'EXC ' + type(e).__name__ + ': ' + str(e).strip().splitlines()[0][:140]
    C.check(name, ok, detail, base=base)


def section(fn):
    def run(*a, **k):
        try:
            fn(*a, **k)
        except Exception as e:  # noqa: BLE001
            tb = traceback.format_exc().strip().splitlines()[-1]
            C.check(fn.__name__ + ' [scenario error]', False, f'{type(e).__name__}: {str(e)[:120]} | {tb[:120]}')
    run.__name__ = fn.__name__
    return run


def new_session(p, w, h, touch=True, speech=False):
    b, ctx, pg, errs = open_page(p, w, h, touch=touch)
    if speech:
        pg.add_init_script(SPEECH)
    boot(pg)
    return b, pg, errs


def wrong_feedback(pg, mode='meaning'):
    start(pg, mode)
    if mode in ('listenChoice', 'listenSpell'):
        hear(pg)
    answer(pg, False)
    pg.click('[data-l30="submit"]')
    pg.wait_for_timeout(450)


def word_of(pg):
    return ev(pg, "(()=>{const s=l30Session();return LIB30.words.get(s.queue[s.index].target).form})()")


# ------------------------------------------------------------------------------------------------ S1-03
@section
def s103(pg):
    start(pg, 'meaning')
    pg.click('[data-l30="submit"]')
    pg.wait_for_timeout(350)
    hint = text_of(pg, '#l30-answer-hint') or ''
    chk('S1-03 no answer chosen: no warning bar', lambda: (pg.locator('.l30-alert').count() == 0, f'alerts={pg.locator(".l30-alert").count()}'), base=True)
    chk('S1-03 no answer chosen: inline hint says what to do and that wrong answers cost nothing',
        lambda: ('先選一個答案' in hint and '「提交答案」' in hint and '答錯不扣金幣' in hint, hint), base=True)
    chk('S1-03 no answer chosen: no 重試儲存 button or text',
        lambda: (pg.locator('[data-l30="retry-save"]').count() == 0 and '重試儲存' not in body_text(pg)), base=True)
    chk('S1-03 no answer chosen: no duplicate toast', lambda: (pg.locator('#toast').count() == 0, text_of(pg, '#toast')), base=True)
    chk('S1-03 no answer chosen: hint is fully on screen and the submit button is still reachable',
        lambda: (bool(fully_visible(pg, '#l30-answer-hint')) and bool(topmost(pg, '[data-l30="submit"]')), ''), base=True)
    chk('S1-03 no answer chosen: nothing was committed (same step, no feedback)', lambda: (cur(pg)['index'] == 0 and not cur(pg)['fb'], ''))
    # picking an option then submitting still works
    answer(pg, True)
    pg.click('[data-l30="submit"]')
    pg.wait_for_timeout(300)
    chk('S1-03 after choosing, submit gives feedback', lambda: bool(cur(pg)['fb']))

    for mode, expect in (('spell', '先輸入答案'), ('missing', '先填上缺少的字母'), ('tiles', '先按字塊排出答案')):
        start(pg, mode)
        pg.click('[data-l30="submit"]')
        pg.wait_for_timeout(300)
        t = text_of(pg, '#l30-answer-hint') or ''
        chk(f'S1-03 empty {mode}: inline hint "{expect}", no warning bar, nothing committed',
            lambda: (expect in t and pg.locator('.l30-alert').count() == 0 and not cur(pg)['fb'], t), base=True)
    start(pg, 'spell')
    pg.fill('#l30-answer', '   ')
    pg.click('[data-l30="submit"]')
    pg.wait_for_timeout(300)
    chk('S1-03 blanks only count as empty (hint, focus back in the box)',
        lambda: ('先輸入答案' in (text_of(pg, '#l30-answer-hint') or '') and pg.evaluate("document.activeElement&&document.activeElement.id==='l30-answer'")), base=True)
    pg.fill('#l30-answer', 'c')
    chk('S1-03 typing clears the hint', lambda: (text_of(pg, '#l30-answer-hint') or '') == '' if pg.query_selector('#l30-answer-hint') else False, base=True)

    # a real save failure is a different message
    start(pg, 'meaning')
    answer(pg, True)
    pg.evaluate('__p40.failSave(true)')
    pg.click('[data-l30="submit"]')
    pg.wait_for_timeout(500)
    al = text_of(pg, '.l30-alert') or ''
    chk('S1-03 save failure: warning explains what happened and what to do next',
        lambda: ('沒能儲存' in al and '不要關閉' in al and '「再試一次」' in al and '家長' in al and '備份' in al, al), base=True)
    chk('S1-03 save failure: retry button is called 再試一次 (not 重試儲存)',
        lambda: ((text_of(pg, '[data-l30="retry-save"]') or '').strip() == '再試一次', text_of(pg, '[data-l30="retry-save"]')), base=True)
    chk('S1-03 save failure: no second (toast) copy of the warning', lambda: (pg.locator('#toast').count() == 0, text_of(pg, '#toast')), base=True)
    chk('S1-03 save failure: warning stays in view under the header when the page is scrolled', lambda: sticky_alert(pg), base=True)
    chk('S1-03 save failure: the chosen answer is still selected and no feedback was recorded',
        lambda: (pg.locator('[data-l30="choose"][aria-pressed="true"]').count() == 1 and not cur(pg)['fb'], ''))
    pg.evaluate('__p40.failSave(false)')
    pg.evaluate('window.scrollTo(0,0)')
    pg.click('[data-l30="retry-save"]')
    pg.wait_for_timeout(500)
    chk('S1-03 retry after the problem is gone clears the warning', lambda: pg.locator('.l30-alert').count() == 0)
    chk('S1-03 retry success says 已儲存', lambda: ('已儲存' in (text_of(pg, '#toast') or ''), text_of(pg, '#toast')), base=True)


def sticky_alert(pg):
    pg.evaluate('window.scrollTo(0,document.body.scrollHeight)')
    pg.wait_for_timeout(200)
    r = pg.evaluate("""()=>{const a=document.querySelector('.l30-alert'),h=document.querySelector('.header');if(!a)return null;
      const ar=a.getBoundingClientRect(),hb=h?h.getBoundingClientRect().bottom:0;return {top:ar.top,bottom:ar.bottom,hb:hb,vh:innerHeight,y:scrollY}}""")
    pg.evaluate('window.scrollTo(0,0)')
    return (r is not None and r['top'] >= r['hb'] - 1 and r['bottom'] <= r['vh'] and r['y'] > 0), str(r)


# ------------------------------------------------------------------------------------------------ S1-04 / S2-20 / feedback
@section
def s104(pg):
    wrong_feedback(pg, 'meaning')
    word = word_of(pg)
    fb = text_of(pg, '.l30-feedback') or ''
    chk('S1-04 wrong answer: feedback card is fully visible without scrolling', lambda: (bool(fully_visible(pg, '.l30-feedback')), str(vis_rect(pg, '.l30-feedback'))), base=True)
    chk('S1-04 wrong answer: 下一題 button is reachable', lambda: bool(topmost(pg, '[data-l30="next"]')))
    chk('S1-04 feedback says 答案是 <word>。', lambda: (fb.strip().startswith(f'答案是 {word}。'), fb), base=True)
    chk('S1-04 feedback adds one short line made from the word', lambda: (f'一起看：{"－".join(word)}。' in fb, fb), base=True)
    chk('S1-04 feedback no longer repeats 一起訂正 / 正確答案：', lambda: ('一起訂正' not in fb and '正確答案：' not in fb, fb), base=True)
    marks = pg.evaluate("""()=>[...document.querySelectorAll('.l30-choice')].map(b=>{const s=getComputedStyle(b);return {t:b.innerText.replace(/\\s+/g,' ').trim(),bw:s.borderTopWidth,bs:s.borderTopStyle,pressed:b.getAttribute('aria-pressed')}})""")
    right = [m for m in marks if m['t'].startswith(word + ' ')]
    wrongs = [m for m in marks if m['pressed'] == 'true']
    chk('S1-04 right option: ✓ 答案 (words, not only colour)', lambda: (len(right) == 1 and '✓' in right[0]['t'] and '答案' in right[0]['t'], str(marks)), base=True)
    chk('S1-04 right option: thick solid border', lambda: (len(right) == 1 and right[0]['bw'] == '4px' and right[0]['bs'] == 'solid', str(right)), base=True)
    chk('S1-04 chosen wrong option: 再看看 with an orange dashed border',
        lambda: (len(wrongs) == 1 and '再看看' in wrongs[0]['t'] and wrongs[0]['bs'] == 'dashed', str(wrongs)), base=True)
    chk('S1-04 untouched options carry no mark', lambda: (sum(1 for m in marks if '答案' in m['t'] or '再看看' in m['t']) == 2, str(marks)), base=True)
    chk('S1-04 button is 下一題 mid-lesson', lambda: ((text_of(pg, '[data-l30="next"]') or '').strip() == '下一題', text_of(pg, '[data-l30="next"]')), base=True)
    # scroll is reset for the next question
    pg.evaluate('window.scrollTo(0,500)')
    pg.click('[data-l30="next"]')
    pg.wait_for_timeout(350)
    chk('S1-04 next question starts at the top of the page', lambda: (pg.evaluate('scrollY') <= 5, pg.evaluate('scrollY')), base=True)

    # last step keeps its finishing label
    start(pg, 'meaning')
    for _ in range(7):   # R3.6: a one-mode set has 8 questions (it had 4)
        answer(pg, True)
        pg.click('[data-l30="submit"]')
        pg.click('[data-l30="next"]')
    answer(pg, True)
    pg.click('[data-l30="submit"]')
    chk('last question: the button changes to 看成績 (R3.6 wording; it was 完成這一組)', lambda: ((text_of(pg, '[data-l30="next"]') or '').strip() == '看成績', text_of(pg, '[data-l30="next"]')))

    # every practice mode gives the same wrong-answer wording (and a correct answer is just 答對了！)
    for mode in ('meaning', 'focus', 'tiles', 'swap', 'missing', 'sort', 'listenChoice', 'spell', 'listenSpell', 'cloze', 'edit'):
        wrong_feedback(pg, mode)
        t = (text_of(pg, '.l30-feedback') or '').strip()
        w = word_of(pg)
        exp = ev(pg, "l30Session().feedback.expected")
        chk(f'S1-04 {mode}: wrong answer says 答案是 {exp}。 and no 正確答案/一起訂正',
            lambda: (t.startswith(f'答案是 {exp}。') and '正確答案' not in t and '一起訂正' not in t, t.replace('\n', ' / ')), base=True)
        chk(f'S1-04 {mode}: feedback card visible without scrolling', lambda: (bool(fully_visible(pg, '.l30-feedback')), str(vis_rect(pg, '.l30-feedback'))),
            base=mode not in ('spell', 'cloze'))   # short typed cards already fit on the base; the long ones were pushed below the fold
    wrong_feedback(pg, 'missing')
    t = text_of(pg, '.l30-feedback') or ''
    word = word_of(pg)
    chk('S1-04 missing-letter: shows the whole word', lambda: (f'整個字是 {word}' in t, t.replace('\n', ' / ')), base=True)

    for mode in ('meaning', 'spell', 'missing', 'tiles', 'cloze'):
        start(pg, mode)
        answer(pg, True)
        pg.click('[data-l30="submit"]')
        pg.wait_for_timeout(300)
        t = (text_of(pg, '.l30-feedback') or '').strip()
        chk(f'S2-20 {mode}: a right answer is just 答對了！', lambda: (t == '答對了！', t.replace('\n', ' / ')), base=True)

    # technical problem keeps its own card (regression guard)
    start(pg, 'listenSpell')
    pg.once('dialog', lambda d: d.accept())
    pg.click('[data-l30="technical"]')
    pg.wait_for_timeout(400)
    t = text_of(pg, '.l30-feedback') or ''
    chk('guard: 聲音有問題 still gives the not-scored card', lambda: ('先留待補聽' in t and ('不評分' in t or '未評分' in t), t.replace('\n', ' / ')))


@section
def speech(pg):
    pg.evaluate('__p40.sfx(true)')
    pg.evaluate('window.__speak.length=0')
    wrong_feedback(pg, 'meaning')
    word = word_of(pg)
    spoken = pg.evaluate('window.__speak.map(x=>x.t)')
    chk('S1-04 wrong answer is said aloud (sound on)', lambda: (word in spoken, str(spoken)), base=True)
    pg.evaluate('window.__speak.length=0')
    start(pg, 'meaning')
    answer(pg, True)
    pg.click('[data-l30="submit"]')
    pg.wait_for_timeout(300)
    chk('guard: a right answer is not read out', lambda: (pg.evaluate('window.__speak.length') == 0, str(pg.evaluate('window.__speak'))))
    pg.evaluate('__p40.sfx(false)')
    pg.evaluate('window.__speak.length=0')
    wrong_feedback(pg, 'meaning')
    chk('guard: with the sound switch off nothing is spoken', lambda: (pg.evaluate('window.__speak.length') == 0, str(pg.evaluate('window.__speak'))))
    pg.evaluate('__p40.sfx(true)')


# ------------------------------------------------------------------------------------------------ hint (S2-20)
@section
def hint(pg):
    start(pg, 'spell')
    pg.click('[data-l30="hint"]')
    pg.wait_for_timeout(300)
    w = word_of(pg)
    t = (text_of(pg, '.l30-note') or '').strip()
    chk('S2-20 hint wording: 提示：第一個字母是 x，一共 N 個字母。', lambda: (t == f'提示：第一個字母是 {w[0]}，一共 {len(w)} 個字母。', t), base=True)
    chk('S2-20 hint has no 字元 / 記作', lambda: ('字元' not in t and '記作' not in t, t), base=True)
    chk('guard: hint is recorded on the session', lambda: ev(pg, 'l30Session().hinted') is True)
    pg.fill('#l30-answer', w)
    pg.click('[data-l30="submit"]')
    pg.wait_for_timeout(300)
    fb = cur(pg)['fb']
    chk('guard: a hinted right answer counts as practice, not own spelling', lambda: (fb['correct'] is True and fb['independent'] is False, str(fb)))
    chk('S2-20 a hinted right answer is still just 答對了！', lambda: ((text_of(pg, '.l30-feedback') or '').strip() == '答對了！', text_of(pg, '.l30-feedback')), base=True)


# ------------------------------------------------------------------------------------------------ result page
@section
def result(pg):
    start(pg, 'lesson')
    right = 0
    for i in range(60):   # R3.6: a lesson is 8 study cards + 20 quiz questions
        info = cur(pg)
        if not info:
            break
        if info['mode'] == 'study':
            pg.click('[data-l30="submit"]')
        else:
            ok = i % 2 == 0
            answer(pg, ok)
            right += ok
            pg.click('[data-l30="submit"]')
            pg.click('[data-l30="next"]')
        pg.wait_for_timeout(120)
    pg.wait_for_timeout(400)
    t = body_text(pg)
    chk('S2-20 result: 20 題，答對 N 題 (R3.6: the quiz has 20 questions; it was 做了 8 題)', lambda: (re.search(r'20 題，答對 \d+ 題。', t) is not None, t[:400].replace('\n', ' / ')), base=True)
    chk('S2-20 result: no step arithmetic (R3.6: 這一組共 12 步… is gone)', lambda: ('這一組共' not in t and '步學新詞' not in t, ''), base=True)
    chk('S2-20 result: old 4／8 題答對 form is gone', lambda: (re.search(r'\d／\d+ 題答對', t) is None and '題答對。' not in t, ''), base=True)
    btns = pg.evaluate("[...document.querySelectorAll('#app a.l30-btn,#app button.l30-btn')].map(b=>({t:b.innerText.trim(),h:b.getAttribute('href')||b.dataset.l30||'',p:b.classList.contains('primary')}))")
    chk('S3-08 result buttons: 再做一次這一課 (primary), 選另一課, 去遊戲街機, 回首頁 (R3.6 names)', lambda: ([b['t'] for b in btns][:4] == ['再做一次這一課', '選另一課', '去遊戲街機', '回首頁'] and [b['p'] for b in btns][:4] == [True, False, False, False], str(btns)), base=True)
    chk('guard: the result buttons still lead to #classroom, #game and #kid', lambda: (sorted(b['h'] for b in btns[:4] if b['h'].startswith('#')) == ['#classroom', '#game', '#kid'], str(btns)))
    chk('guard: finished result never shows 0 coins for a done set', lambda: ('完成' in t and not re.search(r'(?<!\d)0 枚金幣', t), ''))
    for label, target in (('選另一課', '#classroom'), ('去遊戲街機', '#game'), ('回首頁', '#kid')):
        pg.evaluate("location.hash='#learning'")
        pg.wait_for_timeout(300)
        try:
            pg.click(f'#app a.l30-btn:text-is("{label}")', timeout=2500)
            pg.wait_for_timeout(350)
            h = pg.evaluate('location.hash')
        except Exception as e:  # noqa: BLE001
            h = 'EXC ' + str(e)[:60]
        chk(f'S3-08 {label} goes to {target}', lambda: (h == target, h), base=(label != '回首頁'))

    # practice of one mode only: no study steps, so no step explanation
    start(pg, 'meaning')
    coins_before = ev(pg, 'activeChild().stars')
    for _ in range(8):   # R3.6: a one-mode set has 8 questions (it had 4)
        answer(pg, False)
        pg.click('[data-l30="submit"]')
        pg.click('[data-l30="next"]')
        pg.wait_for_timeout(100)
    pg.wait_for_timeout(300)
    t2 = body_text(pg)
    chk('S2-20 one-mode set: 8 題，答對 0 題 and no step explanation (R3.6: 8 questions, was 做了 4 題)', lambda: ('8 題，答對 0 題' in t2 and '這一組共' not in t2, t2[:300].replace('\n', ' / ')), base=True)
    chk('guard: a wrong set never takes coins away (R3.6: checked on the balance; the reassurance sentence was removed from the result)', lambda: (ev(pg, 'activeChild().stars') == coins_before, f"{coins_before} -> {ev(pg, 'activeChild().stars')}"))

    # parent report: the "assisted answers are only practice" sentence lives in the parent view
    pg.evaluate("location.hash='#learning-report'")
    pg.wait_for_timeout(500)
    L.wq33.unlock_parent(pg)
    pg.evaluate("location.hash='#learning-report'")
    pg.wait_for_timeout(600)
    pt = pg.evaluate('document.body.textContent')   # the sentence sits in a collapsed <details>
    chk('S2-20 parent report carries the 只算練習 sentence', lambda: ('只算練習，不算「自己串對」' in pt, pt[:120].replace('\n', ' / ')), base=True)
    pg.evaluate("location.hash='#kid'")


# ------------------------------------------------------------------------------------------------ S2-14
@section
def s214(pg):
    clear(pg)
    pg.evaluate("location.hash='#learn'")
    pg.wait_for_timeout(700)
    t = body_text(pg)
    toast_t = text_of(pg, '#toast') or ''
    chk('S2-14 #learn with no practice goes home', lambda: (pg.evaluate('location.hash') == '#kid', pg.evaluate('location.hash')), base=True)
    chk('S2-14 plain notice 今天還沒開始，按「開始今天的小課」。', lambda: (toast_t.strip() == '今天還沒開始，按「開始今天的小課」。', toast_t), base=True)
    chk('S2-14 never shows 這一輪完成了 or 0 金幣 (R3.6: the chip reads 「60 金幣」, so the match is on a lone 0)', lambda: ('這一輪完成了' not in t and not re.search(r'(?<!\d)0 金幣', t), t[:120].replace('\n', ' / ')), base=True)
    chk('S2-14 the child home page is shown with its start button', lambda: (pg.locator('[data-l30="start"]').count() > 0, ''), base=True)
    # a running practice is not hidden by the guard
    start(pg, 'meaning')
    pg.evaluate("location.hash='#learn'")
    pg.wait_for_timeout(600)
    chk('S2-14 with a running practice #learn lands on that practice', lambda: (pg.evaluate('location.hash') == '#learning' and pg.locator('.l30-quiz').count() == 1, pg.evaluate('location.hash')), base=True)
    pg.evaluate("location.hash='#learning'")
    pg.wait_for_timeout(400)
    chk('guard: #learning still shows the running practice', lambda: (pg.locator('.l30-quiz').count() == 1, ''))
    clear(pg)


# ------------------------------------------------------------------------------------------------ S3-12/13/14/15, S2-07
@section
def nav_names(pg, errs):
    # --- S3-12 listen button and Enter hint
    start(pg, 'lesson')
    chk('S3-12 study step: audio button has 🔊 and says 聽讀音', lambda: ((text_of(pg, '[data-l30="audio"]') or '').strip() == '🔊 聽讀音', text_of(pg, '[data-l30="audio"]')), base=True)
    chk('S3-12 study step: no Enter hint (there is no input)', lambda: ('Enter' not in (text_of(pg, '.l30-quiz > .l30-row') or '') and 'Enter 不會' not in (text_of(pg, '.l30-quiz') or ''), text_of(pg, '.l30-quiz > .l30-row')), base=True)
    start(pg, 'meaning')   # R3.6: the 20 quiz questions come in a mixed order, so open a one-mode set instead of walking to the first meaning step
    chk('S3-12 choice step: no 選字途中 Enter hint under the buttons', lambda: ('Enter 不會在選字途中提交' not in (text_of(pg, '.l30-quiz') or ''), ''), base=True)
    chk('guard: choice step no longer carries the keyboard sentence (R3.6 item 7; the keys still work, see the keyboard guards)', lambda: ('可以按鍵盤 1–4' not in (text_of(pg, '.l30-quiz') or ''), ''))
    start(pg, 'spell')   # R3.6: the 20 quiz questions come in a mixed order, so open a one-mode set instead of walking to the first spell step
    chk('guard: typing step no longer carries the Enter / draft sentence (R3.6 item 7; Enter still submits, see the keyboard guards)', lambda: (not any(x in (text_of(pg, '.l30-quiz') or '') for x in ('Enter 不會在選字途中提交', '按 Enter 不會提交')), text_of(pg, '.l30-quiz')))
    start(pg, 'listenSpell')
    chk('S3-12 listening step: audio button has 🔊', lambda: ((text_of(pg, '[data-l30="audio"]') or '').startswith('🔊'), text_of(pg, '[data-l30="audio"]')), base=True)

    # --- S3-15 one name for the help entrances
    start(pg, 'lesson')
    names = pg.evaluate("[...document.querySelectorAll('.l30-quiz button,.l30-quiz a')].map(b=>b.innerText.trim())")
    chk('S3-15 help button is 怎樣玩？', lambda: ('怎樣玩？' in names, str(names)))
    chk('S3-15 read-aloud help button is 🔊 怎樣玩？', lambda: ('🔊 怎樣玩？' in names, str(names)), base=True)
    chk('S3-15 no 聽老師說明 / 怎樣操作？ on the lesson page', lambda: ('聽老師說明' not in ' '.join(names) and '怎樣操作？' not in ' '.join(names), str(names)), base=True)

    # --- S3-13 tab order and S3-14 give-up in the top-right menu
    start(pg, 'spell')   # R3.6: the 20 quiz questions come in a mixed order, so open a one-mode set instead of walking to the first spell step
    lab = pg.evaluate("(document.querySelector('[data-l30=\"hint\"]')||{getAttribute(){return ''}}).getAttribute('aria-label')||''")
    chk('S3-15 hint button name is plain (no 本題會記作有提示)', lambda: (lab != '' and '記作有提示' not in lab, lab), base=True)
    order = pg.evaluate("""()=>{const q=document.querySelector('.l30-quiz');const pos=(s)=>{const e=q.querySelector(s);return e?[...q.querySelectorAll('*')].indexOf(e):-1};
      return {back:pos('.l30-back'),card:pos('.l30-qcard'),input:pos('#l30-answer'),submit:pos('[data-l30="submit"]'),hint:pos('[data-l30="hint"]'),abandon:pos('[data-l30="abandon"]'),more:pos('.p20-more summary')}}""")
    chk('S3-13 DOM order: back, question, input, primary button, secondary, give-up last',
        lambda: (0 <= order['back'] < order['card'] < order['input'] < order['submit'] < order['hint'] < order['abandon'], str(order)))
    chk('S3-13 the ⋯ menu button comes after the main actions in the tab order', lambda: (order['more'] > order['submit'] and order['more'] > order['hint'] >= 0, str(order)), base=True)
    chk('S3-14 give-up button is hidden until ⋯ is opened', lambda: (pg.evaluate("(()=>{const e=document.querySelector('[data-l30=\"abandon\"]');return !!e&&!e.checkVisibility()})()"), ''), base=True)
    chk('S3-14 give-up button is not in the thumb row with the main button',
        lambda: (pg.evaluate("!document.querySelector('.l30-quizactions [data-l30=\"abandon\"]')&&(()=>{const a=document.querySelector('[data-l30=\"abandon\"]');return !!a&&!!a.closest('.p20-more')})()"), ''), base=True)
    r = pg.evaluate("""()=>{const s=document.querySelector('.p20-more summary');if(!s)return null;const b=s.getBoundingClientRect(),q=document.querySelector('.l30-quiz').getBoundingClientRect();return {top:b.top-q.top,right:q.right-b.right,w:b.width,h:b.height,label:s.getAttribute('aria-label')}}""")
    chk('S3-14 ⋯ sits at the top right and is at least 44px', lambda: (r is not None and r['top'] < 40 and r['right'] < 12 and r['w'] >= 44 and r['h'] >= 44, str(r)), base=True)
    chk('S3-14 ⋯ has an accessible name', lambda: (bool(r and r['label']), str(r)), base=True)
    open_menu(pg)
    ab = pg.evaluate("""()=>{const a=document.querySelector('[data-l30="abandon"]');if(!a)return null;const s=getComputedStyle(a),r=a.getBoundingClientRect();return {t:a.innerText.trim(),color:s.color,vis:a.checkVisibility(),top:r.top,left:r.left,right:r.right,vw:innerWidth}}""")
    chk('S2-07 give-up is called 放棄這組', lambda: (ab and ab['t'] == '放棄這組', str(ab)), base=True)
    chk('S3-14 give-up is red when the menu is open', lambda: (ab and ab['vis'] and ab['color'] == 'rgb(163, 40, 26)', str(ab)), base=True)
    chk('S3-14 opened menu stays inside the screen', lambda: (ab and ab['left'] >= 0 and ab['right'] <= ab['vw'], str(ab)))
    pg.keyboard.press('Escape')
    pg.wait_for_timeout(120)
    chk('S3-14 Escape closes the menu', lambda: (pg.evaluate("!document.querySelector('.p20-more[open]')") and pg.query_selector('.p20-more summary') is not None, ''), base=True)
    open_menu(pg)
    pg.mouse.click(60, 600)
    pg.wait_for_timeout(120)
    chk('S3-14 tapping elsewhere closes the menu', lambda: (pg.evaluate("!document.querySelector('.p20-more[open]')") and pg.query_selector('.p20-more summary') is not None, ''), base=True)

    # --- give-up behaviour is kept: confirm, cancel keeps the practice, accept ends it and goes home
    msgs = []
    abandon(pg, accept=False, messages=msgs)
    chk('guard: cancelling the confirm keeps the practice running', lambda: (ev(pg, '!!l30Session()') is True and pg.locator('.l30-quiz').count() == 1, ''))
    chk('S2-07 confirm text: 放棄這一組嗎？… (one set = 一組)', lambda: (bool(msgs) and msgs[0] == '放棄這一組嗎？不會得到完成獎勵。已答的紀錄會保留，下次可以另選一組。', str(msgs)), base=True)
    abandon(pg, accept=True)
    chk('guard: accepting the confirm ends the practice and goes home', lambda: (ev(pg, '!l30Session()') is True and pg.evaluate('location.hash') == '#kid', pg.evaluate('location.hash')))
    chk('guard: the abandoned set is recorded as abandoned (no award)', lambda: (pg.evaluate('__p40.l30Done()')['status'] == 'abandoned', str(pg.evaluate('__p40.l30Done()'))))
    start(pg, 'meaning')
    chk('S2-07 top-left link says 暫停 and goes home', lambda: ('暫停' in (text_of(pg, '.l30-back') or '') and pg.evaluate("document.querySelector('.l30-back').getAttribute('href')") == '#kid', text_of(pg, '.l30-back')))
    chk('no console errors during the phone run', lambda: (errs == [], str(errs[:3])))


# ------------------------------------------------------------------------------------------------ keyboard guards
@section
def keyboard(pg):
    start(pg, 'meaning')
    pg.keyboard.press('1')
    pg.wait_for_timeout(150)
    chk('guard: number key 1 selects the first option', lambda: pg.evaluate("document.querySelector('[data-l30=\"choose\"][data-index=\"0\"]').getAttribute('aria-pressed')==='true'"))
    pg.keyboard.press('Enter')
    pg.wait_for_timeout(300)
    chk('guard: Enter submits the chosen option', lambda: bool(cur(pg)['fb']))
    start(pg, 'spell')
    pg.fill('#l30-answer', 'zz')
    pg.keyboard.press('Enter')
    pg.wait_for_timeout(300)
    chk('guard: Enter submits a typed answer', lambda: bool(cur(pg)['fb']))
    start(pg, 'meaning')
    pg.keyboard.press('Enter')
    pg.wait_for_timeout(300)
    chk('S1-03 Enter with nothing chosen shows the same hint, no warning bar',
        lambda: ('先選一個答案' in (text_of(pg, '#l30-answer-hint') or '') and pg.locator('.l30-alert').count() == 0, ''), base=True)


# ------------------------------------------------------------------------------------------------ word workshop (l31)
@section
def workshop(pg, errs):
    l31_start(pg)
    names = pg.evaluate("[...document.querySelectorAll('.l31-lesson button')].map(b=>b.innerText.trim())")
    chk('S3-15 workshop help button is 怎樣玩？ (not 怎樣操作？)', lambda: ('怎樣玩？' in names and '怎樣操作？' not in names, str(names)), base=True)
    chk('S3-15 workshop read-aloud buttons carry 🔊', lambda: (any(n.startswith('🔊') for n in names), str(names)), base=True)
    chk('S3-14 workshop give-up is inside the ⋯ menu, not in the button row',
        lambda: (pg.evaluate("!document.querySelector('.l31-actions [data-l31=\"abandon\"]')&&!!document.querySelector('.p20-more [data-l31=\"abandon\"]')"), ''), base=True)
    l31_to(pg, 'meaning')
    pg.click('[data-l31="submit"]')
    pg.wait_for_timeout(300)
    chk('S1-03 workshop: empty answer gives the inline hint, no warning bar',
        lambda: ('先選一個答案' in (text_of(pg, '#l31-answer-hint') or '') and pg.locator('.l30-alert').count() == 0, text_of(pg, '#l31-answer-hint')), base=True)
    l31_to(pg, 'recall')
    pg.click('[data-l31="submit"]')
    pg.wait_for_timeout(300)
    chk('S1-03 workshop: empty typed answer gives the inline hint',
        lambda: ('先輸入答案' in (text_of(pg, '#l31-answer-hint') or '') and pg.locator('.l30-alert').count() == 0, text_of(pg, '#l31-answer-hint')), base=True)
    pg.fill('#l31-answer', 'x')
    chk('S1-03 workshop: typing clears the hint', lambda: (pg.query_selector('#l31-answer-hint') is not None and (text_of(pg, '#l31-answer-hint') or '') == '', ''), base=True)
    pg.evaluate('__p40.failSave(true)')
    pg.click('[data-l31="submit"]')
    pg.wait_for_timeout(500)
    al = text_of(pg, '.l30-alert') or ''
    chk('S1-03 workshop: save failure says what to do (再試一次, 家長 → 備份)', lambda: ('「再試一次」' in al and '家長' in al and '備份' in al, al), base=True)
    pg.evaluate('__p40.failSave(false)')
    pg.click('[data-l31="save"]')
    pg.wait_for_timeout(400)
    chk('S1-03 workshop: 再試一次 clears the warning (on the base the retry did nothing after a failed submit)', lambda: (pg.locator('.l30-alert').count() == 0, text_of(pg, '.l30-alert')), base=True)
    msgs = []
    pg.once('dialog', lambda d: (msgs.append(d.message), d.accept()))
    open_menu(pg)
    pg.click('[data-l31="abandon"]')
    pg.wait_for_timeout(500)
    chk('S2-07 workshop confirm uses the same 放棄這一組嗎？ text', lambda: (bool(msgs) and msgs[0].startswith('放棄這一組嗎？'), str(msgs)), base=True)
    chk('guard: workshop give-up ends the set (home, no running session)', lambda: (ev(pg, '!l31Session()') is True, pg.evaluate('location.hash')))
    # result page buttons of the workshop
    l31_start(pg)
    for _ in range(8):
        info = l31_to(pg, 'recall')
        if not info or not pg.evaluate('!!document.getElementById("l31-answer")'):
            break
        rec = pg.evaluate(f'__p40.l31Recipe("{info["rec"]}")')
        pg.fill('#l31-answer', rec['form'])
        pg.click('[data-l31="submit"]')
        pg.wait_for_timeout(250)
        nxt = pg.query_selector('[data-l31="next"]')
        if nxt:
            nxt.click()
            pg.wait_for_timeout(250)
    pg.wait_for_timeout(400)
    labels = pg.evaluate("[...document.querySelectorAll('#app a.l30-btn,#app button.l30-btn')].map(b=>b.innerText.trim())")
    chk('S3-08 workshop result buttons: 再練一組 / 去遊戲街機 / 回首頁', lambda: (all(x in labels for x in ('再練一組', '去遊戲街機', '回首頁')), str(labels)), base=True)
    chk('no console errors during the workshop run', lambda: (errs == [], str(errs[:3])))


# ------------------------------------------------------------------------------------------------ layout per viewport
# Where the R3.4 base was measured to fail (the lesson pages behave differently per viewport); everything else is a guard.
ALL = {'small', 'landscape', 'tablet', 'desktop'}
BASE_FAILS = {'S2-02 study': {'landscape', 'tablet', 'desktop'}, 'S2-02 choice': {'landscape', 'desktop'}, 'S2-02 typed': {'landscape'},
              'S1-04 card': {'small', 'tablet'}, 'S1-03 hint': ALL, 'S1-03 bar': ALL, 'S1-03 toast': {'small'}, 'S3-14 menu': {'small', 'desktop'}}


@section
def layout(p, w, h, touch, tag):
    bf = lambda k: tag in BASE_FAILS[k]  # noqa: E731
    b, pg, errs = new_session(p, w, h, touch=touch)
    try:
        # S2-02: the main button is on screen on arrival (study, choice, typed)
        start(pg, 'lesson')
        chk(f'S2-02 {tag} {w}x{h}: study step main button fully on screen', lambda: (bool(fully_visible(pg, '[data-l30="submit"]')), str(vis_rect(pg, '[data-l30="submit"]'))), base=bf('S2-02 study'))
        start(pg, 'meaning')   # R3.6: the 20 quiz questions come in a mixed order, so open a one-mode set instead of walking to the first meaning step
        pg.evaluate('window.scrollTo(0,0)')
        chk(f'S2-02 {tag} {w}x{h}: choice step main button fully on screen', lambda: (bool(fully_visible(pg, '[data-l30="submit"]')), str(vis_rect(pg, '[data-l30="submit"]'))), base=bf('S2-02 choice'))
        start(pg, 'spell')   # R3.6: the 20 quiz questions come in a mixed order, so open a one-mode set instead of walking to the first spell step
        pg.evaluate('window.scrollTo(0,0)')
        chk(f'S2-02 {tag} {w}x{h}: typed step main button fully on screen', lambda: (bool(fully_visible(pg, '[data-l30="submit"]')), str(vis_rect(pg, '[data-l30="submit"]'))), base=bf('S2-02 typed'))
        # S1-04 feedback visible, next reachable
        wrong_feedback(pg, 'meaning')
        chk(f'S1-04 {tag} {w}x{h}: wrong-answer card fully visible, no scrolling', lambda: (bool(fully_visible(pg, '.l30-feedback')), str(vis_rect(pg, '.l30-feedback'))), base=bf('S1-04 card'))
        chk(f'S1-04 {tag} {w}x{h}: 下一題 reachable', lambda: bool(topmost(pg, '[data-l30="next"]')))
        # S1-03 empty submit: hint visible, no toast over the button
        start(pg, 'meaning')
        pg.click('[data-l30="submit"]')
        pg.wait_for_timeout(350)
        chk(f'S1-03 {tag} {w}x{h}: empty submit hint fully visible', lambda: (bool(fully_visible(pg, '#l30-answer-hint')), str(vis_rect(pg, '#l30-answer-hint'))), base=bf('S1-03 hint'))
        chk(f'S1-03 {tag} {w}x{h}: no toast / bar over the main button after an empty submit',
            lambda: (not overlap(pg, '#toast', '[data-l30="submit"]') and pg.locator('.l30-alert').count() == 0, ''), base=bf('S1-03 bar'))
        # toasts never sit over the main button inside a lesson
        ev(pg, "toast('測試訊息，很長的一句提示用來檢查位置。')")
        pg.wait_for_timeout(200)
        chk(f'S1-03 {tag} {w}x{h}: a toast does not cover the main button', lambda: (not overlap(pg, '#toast', '[data-l30="submit"]'), str(vis_rect(pg, '#toast'))), base=bf('S1-03 toast'))
        # menu and topline
        r = pg.evaluate("""()=>{const q=document.querySelector('.l30-quiz');const els=[...q.querySelectorAll('.l30-topline > *')].concat([...q.querySelectorAll('.p20-more summary')]);
          const rs=els.map(e=>e.getBoundingClientRect()).filter(x=>x.width>0);let bad=0;
          for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++){const a=rs[i],c=rs[j];if(a.left<c.right-1&&c.left<a.right-1&&a.top<c.bottom-1&&c.top<a.bottom-1)bad++}
          return {bad:bad,n:rs.length,over:document.documentElement.scrollWidth>innerWidth}}""")
        chk(f'guard {tag} {w}x{h}: top row controls do not overlap and the page has no sideways scroll', lambda: (r['bad'] == 0 and not r['over'], str(r)))
        open_menu(pg)
        mr = pg.evaluate("""()=>{const a=document.querySelector('[data-l30="abandon"]');if(!a||!a.checkVisibility())return null;const r=a.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom,vw:innerWidth,vh:innerHeight}}""")
        chk(f'S3-14 {tag} {w}x{h}: open menu fits on screen', lambda: (mr is not None and mr['l'] >= 0 and mr['r'] <= mr['vw'] and mr['b'] <= mr['vh'], str(mr)), base=bf('S3-14 menu'))
        pg.keyboard.press('Escape')
        chk(f'no console errors {tag}', lambda: (errs == [], str(errs[:3])))
    finally:
        b.close()


def overlap(pg, a, b):
    return pg.evaluate("""([a,b])=>{const x=document.querySelector(a),y=document.querySelector(b);if(!x||!y)return false;
      const p=x.getBoundingClientRect(),q=y.getBoundingClientRect();return p.left<q.right&&q.left<p.right&&p.top<q.bottom&&q.top<p.bottom}""", [a, b])


# ------------------------------------------------------------------------------------------------ main
def main():
    with sync_playwright() as p:
        if not ONLY or 'phone' in ONLY:
            b, pg, errs = new_session(p, 390, 844, touch=True, speech=True)
            try:
                for fn in (s103, s104, speech, hint, result, s214, keyboard):
                    fn(pg)
                nav_names(pg, errs)
                workshop(pg, errs)
            finally:
                b.close()
        for w, h, touch, tag, key in ((320, 568, True, 'small', 'small'), (844, 390, True, 'landscape', 'landscape'),
                                      (768, 1024, False, 'tablet', 'tablet'), (1280, 800, False, 'desktop', 'desktop')):
            if not ONLY or key in ONLY:
                layout(p, w, h, touch, tag)
    sys.exit(C.finish())


if __name__ == '__main__':
    main()

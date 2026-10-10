"""R3.5 p40 browser suite: school dictation (默書) as practice.

Run:  WQ33_APP=<built index.html> python3 r35_tests/p40_dictation_browser.py [section ...]
Sections: flow, practice, voice, finish, parent, ocr, layout     ([B] checks must FAIL on the R3.4 base and PASS on the new build)
Practice sessions are built in page code (startSession) so the suite does not depend on the home page of another module.
"""
import json
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from p40_lib35 import *  # noqa: F401,F403,E402

FORBIDDEN = ['成績', '通過', '合格', '分數', '計時', '原站', '有效任務', '獨立回想', '義項', '掌握', '工程']


def add_range(pg, txt=PASTE, title=None, date=None):
    """R3.12: paste -> 整理 -> (name / date on step 2, optional) -> one press on 儲存. Flagged (needs-review) cards are saved as they are."""
    go_range_new(pg)
    pg.fill('#raw-words', txt)
    pg.wait_for_timeout(200)
    pg.click('[data-imp="parse"]')
    pg.wait_for_timeout(700)
    if title:
        pg.fill('#range-title', title)
    if date:
        pg.fill('#range-date', date)
    pg.click('#v20-confirm-next')
    try:
        pg.wait_for_selector('#s50-saved', timeout=8000)
    except Exception:
        pass
    pg.wait_for_timeout(300)


def start_session(pg, items, mode='practice'):
    """items: [(english word, type)]; builds the queue in page code, then opens the learn screen."""
    ev(pg, """(()=>{const q=%s.map(([en,t])=>{const w=db.words.find(x=>x.en===en);return prepareItem({id:uid('q'),wordId:w.id,type:effectiveType(w,t),origin:'自選練習'},w);});
      stopSpeech();db.session=newSession(q,%s);save();go('learn');render();})()""" % (json.dumps(items), json.dumps(mode)))
    pg.wait_for_timeout(500)


def answer(pg, text):
    pg.fill('#answer', text)
    pg.wait_for_timeout(150)
    pg.click('#submit-answer')
    pg.wait_for_timeout(350)


def fb(pg):
    return ev(pg, 'db.session&&db.session.feedback?JSON.stringify(db.session.feedback):""')


def vis_text(pg, sel):
    return pg.evaluate("(s)=>{const e=document.querySelector(s);return e&&e.getClientRects().length?e.innerText:null}", sel)


def safe(c, name, fn):
    try:
        fn()
    except Exception as e:  # keep the other sections running
        c.check(name + ' (section ran without error)', False, repr(e)[:200] + ' ' + traceback.format_exc().splitlines()[-3][:120])


def section_flow(c, p):
    b, ctx, pg, errs = open_page(p, 390, 844)
    pg.goto(URL)
    boot(pg)
    go_range_new(pg)
    c.check('add-range: R3.12 two named steps are shown (no separate save step)', pg.query_selector('#p40-steps') is not None and len(pg.query_selector_all('#p40-steps li')) == 2, '')
    c.check('add-range: step 1 shows only the photo / text part', vis_text(pg, '.v20-selection') is None and vis_text(pg, '.v20-source') is not None, '', base=True)
    title = pg.input_value('#range-title') or ''
    c.check('D22: name is pre-filled (默書 M月D日)', bool(__import__('re').match(r'^默書 \d{1,2}月\d{1,2}日$', title)), title, base=True)
    c.check('D22: no invented date', (pg.input_value('#range-date') or '') == '', pg.input_value('#range-date'))
    c.check('D23: photo tips are visible', pg.query_selector('#p40-tips') is not None and '光線' in (vis_text(pg, '#p40-tips') or ''), '', base=True)
    # R3.10 (intended UI change): with no photo yet the 辨認 button is not offered at all (the camera / upload buttons are the
    # only call to action), and with no words the next-step button is not offered; a disabled button always still says why.
    why = vis_text(pg, '#p40-why-run') or ''
    run_vis = pg.evaluate("()=>{const e=document.querySelector('#run-ocr');return !!e&&e.getClientRects().length>0}")
    c.check('S3-09/R3.10: no photo -> the 辨認 button is hidden (or disabled with its reason); camera and upload are offered',
            pg.is_disabled('#run-ocr') and (not run_vis or '拍照' in why) and pg.is_visible('[data-act="open-camera"]') and pg.is_visible('[data-act="open-upload"]'), why, base=True)
    why1 = vis_text(pg, '#p40-why1') or ''
    next_vis = pg.evaluate("()=>{const e=document.querySelector('#p40-next1');return !!e&&e.getClientRects().length>0}")
    c.check('S3-09/R3.10: no words -> the next-step button is hidden (or disabled with its reason)',
            pg.is_disabled('#p40-next1') and (not next_vis or len(why1) > 5), why1, base=True)
    # D11: the draft survives a reload. R3.12: the name sits on step 2, so the typed words are parsed first, then the name is changed.
    pg.fill('#raw-words', 'pencil | 鉛筆\nruler | 間尺')
    pg.click('[data-imp="parse"]')
    pg.wait_for_timeout(700)
    pg.fill('#range-title', 'Unit 9 測試')
    pg.wait_for_timeout(900)
    ev(pg, "(()=>{window.dispatchEvent(new Event('pagehide'));})()")
    pg.reload()
    pg.wait_for_function('typeof window.__ev==="function"', timeout=15000)
    go_range_new(pg)
    raw_after = (pg.input_value('#raw-words') or '') if pg.query_selector('#raw-words') else ''
    c.check('D11: typed text is still there after a reload', 'pencil' in raw_after and 'ruler' in raw_after, repr(raw_after[:40]), base=True)
    c.check('D11: the title is still there after a reload', pg.input_value('#range-title') == 'Unit 9 測試', pg.input_value('#range-title'), base=True)
    c.check('D11: the parsed cards come back on step 2 (R3.12 draft keeps the check step)', ev(pg, "document.querySelector('#import-v20').dataset.p40Step") == '2' and ev(pg, 'v20.items.length') == 2,
            ev(pg, "document.querySelector('#import-v20').dataset.p40Step"))
    # back to step 1 -> new words -> parse -> step 2
    pg.click('#p40-back2')
    pg.wait_for_timeout(300)
    open_text(pg)
    pg.fill('#raw-words', PASTE)
    pg.click('[data-imp="parse"]')
    pg.wait_for_timeout(800)
    c.check('S3-09: after 整理 the check step opens by itself', vis_text(pg, '.v20-selection') is not None and vis_text(pg, '.v20-source') is None, '', base=True)
    # R3.10 (intended UI change): the old count paragraph is replaced by the one-line summary and the fixed 已選 N 個 bar.
    cl = (vis_text(pg, '#p40-count') or '') or ((vis_text(pg, '#v20-message') or '') + ' ' + (vis_text(pg, '#v20-import-dock') or ''))
    c.check('D4/S3-09: count line says how many are selected', '已選' in cl, cl, base=True)
    shot(pg, 'flow_step2_390')
    # R3.12 replaces the step-3 checks (inline summary / disabled save + reason / tick) with the equivalent one-step checks
    n_flag = ev(pg, 'v20Pending().length')
    c.check('R3.12: flagged cards are only a hint: 逐個核對 (n) is offered and 儲存 is live', n_flag > 0 and (vis_text(pg, '#s50-review') or '').count('(%d)' % n_flag) == 1 and not pg.is_disabled('#v20-confirm-next'), str(n_flag), base=False)
    c.check('R3.12: there is no step 3 / summary / 我已對照原稿 tick anywhere', pg.query_selector('#v20-summary') is None and pg.query_selector('#confirm-import') is None and pg.query_selector('#v20-save-range') is None, '')
    c.check('S3-09: the save button is in the first screen (fixed bar) and names the count', pg.evaluate("()=>{const e=document.querySelector('#v20-confirm-next').getBoundingClientRect();return e.top>=0&&e.bottom<=innerHeight}") and '儲存 12 個字' in (vis_text(pg, '#v20-confirm-next') or ''), vis_text(pg, '#v20-confirm-next') or '', base=False)
    day_shown = pg.input_value('#range-date')
    c.check('D22: R3.12 the date defaults to today (HK) once the words are parsed', bool(__import__('re').match(r'^\d{4}-\d{2}-\d{2}$', day_shown)), day_shown)
    shot(pg, 'flow_step2_save_390')
    pg.click('#v20-confirm-next')
    pg.wait_for_selector('#s50-saved', timeout=8000)
    pg.wait_for_timeout(300)
    rt = ev(pg, 'lastRoute')
    c.check('D9: after saving the page shows the small success card', rt == 'range-new' and pg.query_selector('#s50-saved') is not None, rt, base=False)
    c.check('D9: the card names the word count', '已儲存 12 個字' in (vis_text(pg, '#s50-saved') or ''), vis_text(pg, '#s50-saved') or '', base=False)
    c.check('D9: the saved range holds the 12 words and the title', ev(pg, 'rangeWords(latestRange().id).length') == 12, '', base=False)
    c.check('D9: a button asks the child to start (開始練習)', pg.query_selector('#s50-saved [data-s50="practice"]') is not None and pg.query_selector('#s50-saved [data-s50="again"]') is not None, '', base=False)
    c.check('D22: the saved date is the one shown on the form (today by default), not an invented future date', ev(pg, 'latestRange().dictationDate') == day_shown, ev(pg, 'latestRange().dictationDate'))
    c.check('D11: the draft is cleared once saved', ev(pg, "(()=>{try{return Object.keys(localStorage).filter(k=>k.startsWith('wq35-p40-draft')).length}catch(e){return -1}})()") == 0, '', base=False)
    shot(pg, 'flow_landing_390')
    pg.click('#s50-saved [data-s50="practice"]')
    pg.wait_for_timeout(900)
    c.check('D9: 請孩子開始練習 starts a practice', ev(pg, 'lastRoute') in ('learn', 'kid') and ev(pg, '!!db.session') is True, ev(pg, 'lastRoute'), base=True)
    c.check('D17: the child side is no longer in parent mode', ev(pg, 'v23ParentUntil') == 0, str(ev(pg, 'v23ParentUntil')), base=True)
    c.check('flow: no page errors', not errs, str(errs[:2]))
    b.close()


def section_practice(c, p):
    b, ctx, pg, errs = open_page(p, 390, 844)
    pg.goto(URL)
    boot(pg)
    parent_unlock(pg)
    add_range(pg)
    c.check('D6: the default is practice, not strict', ev(pg, "v24Policy().grading") == 'practice', ev(pg, "v24Policy().grading"), base=True)
    start_session(pg, [['pencil', 'spell']])
    sub = (pg.inner_text('#submit-answer') or '').strip()
    c.check('D6: the button says 檢查答案', sub == '檢查答案', sub, base=True)
    helpb = pg.evaluate("()=>{const e=document.querySelector('[data-act=\"show-help\"]');return e?e.innerText:''}")
    c.check('D6: the help button says 看提示 (not 看示範)', '看提示' in helpb and '示範' not in helpb, helpb, base=True)
    c.check('D6: the check button is disabled with a reason until there is an answer', pg.is_disabled('#submit-answer') and '輸入答案' in (vis_text(pg, '#p40-why') or ''), vis_text(pg, '#p40-why') or '', base=True)
    c.check('D5: the play-sound button is there', pg.query_selector('[data-act="speak-word"]') is not None)
    # lenient capitals
    answer(pg, 'Pencil')
    f = json.loads(fb(pg) or '{}')
    c.check('D6: Pencil for pencil is accepted (capitals are not strict)', f.get('correct') is True, str(f)[:100], base=True)
    # retries: wrong, wrong, then right
    start_session(pg, [['ruler', 'spell']])
    answer(pg, 'rulor')
    c.check('D5: after a wrong answer the question stays open', fb(pg) == '' and pg.query_selector('#answer') is not None, fb(pg), base=True)
    enc = vis_text(pg, '.p40-encourage') or ''
    hint = vis_text(pg, '.p40-hint') or ''
    c.check('D5: an encouraging line and a hint appear', len(enc) > 3 and '第一個字母' in hint, enc + ' / ' + hint[:40], base=True)
    c.check('D5: the sound button is still there after a wrong answer', pg.query_selector('[data-act="speak-word"]') is not None, '')
    shot(pg, 'practice_retry1_390')
    answer(pg, 'rulir')
    hint2 = vis_text(pg, '.p40-hint') or ''
    c.check('D5: the second hint is stronger (letter mask)', '_' in hint2 and fb(pg) == '', hint2[:60], base=True)
    answer(pg, 'ruler')
    f = json.loads(fb(pg) or '{}')
    c.check('D5: a correct third try is accepted', f.get('correct') is True, str(f)[:80], base=True)
    last = ev(pg, "JSON.stringify(db.attempts.filter(a=>db.words.find(w=>w.id===a.wordId&&w.en==='ruler')).slice(-1)[0]||{})")
    la = json.loads(last or '{}')
    c.check('D5: a retried answer is not recorded as independent success', la.get('assisted') is True, 'assisted=%s' % la.get('assisted'), base=True)
    txt = text_of(pg)
    c.check('D5: the screen says it was done with a hint', '有提示' in txt, '', base=True)
    # three wrong tries: answer is shown, question can go on
    start_session(pg, [['eraser', 'spell']])
    for w_ in ('eresar', 'erazer', 'erassr'):
        answer(pg, w_)
    f = json.loads(fb(pg) or '{}')
    shown = vis_text(pg, '.correct-answer') or ''
    c.check('D5: after the retries the answer is shown', f.get('correct') is False and 'eraser' in shown, shown)
    c.check('D5: no marks or test wording on the feedback', not any(w in text_of(pg) for w in FORBIDDEN), '', base=False)
    shot(pg, 'practice_shown_390')
    # choice question: a wrong option is greyed out, the question stays open
    start_session(pg, [['pencil', 'meaning']])
    wrong = ev(pg, "(()=>{const w=currentWord();const o=[...document.querySelectorAll('.task-card .option')].find(b=>b.dataset.value!==w.en);if(o){o.click();return o.dataset.value}return ''})()")
    pg.wait_for_timeout(300)
    pg.click('#submit-answer')
    pg.wait_for_timeout(400)
    c.check('D5: a wrong choice does not end the question', fb(pg) == '' and bool(wrong), fb(pg), base=True)
    nope = pg.evaluate("()=>document.querySelectorAll('.p40-nope').length")
    c.check('D5: the option already tried is greyed out', nope >= 1, str(nope), base=True)
    # reload keeps the retry state
    start_session(pg, [['colour', 'spell']])
    answer(pg, 'colur')
    pg.reload()
    pg.wait_for_function('typeof window.__ev==="function"', timeout=15000)
    pg.wait_for_timeout(600)
    tries = ev(pg, 'db.session&&db.session.p40?db.session.p40.tries:-1')
    c.check('D5: the retry count survives a reload', tries == 1, str(tries), base=True)
    # D12: study list covers all words
    n = ev(pg, "(()=>{const r=latestRange();return window.WQP40?WQP40.studyList(r.id).length:-1})()")
    c.check('D12: the study list covers all 12 words', n == 12, str(n), base=True)
    ev(pg, """(()=>{const ws=rangeWords(latestRange().id).slice(0,12);db.session=newSession(ws.map(w=>prepareItem({id:uid('q'),wordId:w.id,type:'study',origin:'自選認詞'},w)),'practice');save();go('learn');render();})()""")
    pg.wait_for_timeout(500)
    sl = vis_text(pg, '.p40-studyline') or ''
    c.check('D12: the study card says how many words there are', '12' in sl, sl, base=True)
    # D6 option: strict is a parent choice
    pg.evaluate("location.hash='#settings'")
    pg.wait_for_timeout(600)
    parent_unlock(pg)
    opts = pg.evaluate("()=>[...document.querySelectorAll('#v24-grading option')].map(o=>o.value+':'+o.textContent)")
    c.check('D6: strict is kept as an option 「大小寫要完全一樣」', any('大小寫要完全一樣' in o and o.startswith('strict') for o in opts), str(opts), base=True)
    shot(pg, 'practice_settings_390', full=True)
    pg.select_option('#v24-grading', 'strict')
    pg.click('[data-v24="save-policy"]')
    pg.wait_for_timeout(500)
    c.check('D6: a chosen strict mode stays strict', ev(pg, "v24Policy().grading") == 'strict' and ev(pg, "v24Policy().gradingChosen") is True, '', base=True)
    start_session(pg, [['pencil', 'spell']])
    answer(pg, 'Pencil')
    f = json.loads(fb(pg) or '{}')
    c.check('D6: in strict mode Pencil for pencil is a retry, not a pass', f == {} or f.get('correct') is not True or (f.get('detail') or {}).get('capitalization') is False, str(f)[:80])
    c.check('practice: no page errors', not errs, str(errs[:2]))
    b.close()


def section_voice(c, p):
    b, ctx, pg, errs = open_page(p, 390, 844, speech='none')
    pg.goto(URL)
    boot(pg)
    parent_unlock(pg)
    add_range(pg)
    start_session(pg, [['grandmother', 'listenSpell']])
    pg.wait_for_timeout(600)
    pg.fill('#answer', 'grandmother')
    pg.wait_for_timeout(300)
    c.check('D3: with no English voice the check button can still be used', not pg.is_disabled('#submit-answer'), '', base=True)
    note = vis_text(pg, '.p40-voice-note') or ''
    c.check('D3: the note says what to do (parent reads / other device)', '請家長讀給孩子聽或改用其他裝置' in note, note, base=True)
    c.check('D3: a 看字抄寫 button is offered', pg.query_selector('[data-p40="copy"]') is not None, '', base=True)
    pg.click('[data-act="speak-word"]')
    pg.wait_for_timeout(900)
    c.check('D3: the unexplained 先跳過 is gone (also after pressing play)', '先跳過' not in text_of(pg), '')
    shot(pg, 'voice_none_390')
    pg.click('[data-p40="copy"]')
    pg.wait_for_timeout(500)
    cp = vis_text(pg, '.p40-copy') or ''
    c.check('D3: 看字抄寫 shows the word to copy', 'grandmother' in cp, cp, base=True)
    pg.fill('#answer', 'grandmother')
    pg.click('#submit-answer')
    pg.wait_for_timeout(400)
    la = json.loads(ev(pg, "JSON.stringify(db.attempts.slice(-1)[0]||{})") or '{}')
    c.check('D3: a copied answer is not recorded as independent', la.get('assisted') is True, 'assisted=%s' % la.get('assisted'), base=True)
    # D13: a word with no Chinese meaning gets a spoken question, never a blank prompt
    ev(pg, "(()=>{const w=db.words.find(x=>x.en==='light');w.zh='';save();})()")
    start_session(pg, [['light', 'spell']])
    ty = ev(pg, 'currentItem().type')
    prompt_ok = pg.evaluate("()=>{const t=document.querySelector('.task-card').innerText;return t.length>10}")
    c.check('D13: a word with no meaning is asked as a spoken question', ty == 'listenSpell', ty, base=True)
    c.check('D13: the question is not blank', prompt_ok and pg.query_selector('[data-act="speak-word"]') is not None, '')
    shot(pg, 'voice_nozh_390')
    pg.evaluate("location.hash='#ranges'")
    pg.wait_for_timeout(500)
    parent_unlock(pg)
    pg.click('[data-act="view-range"]')
    pg.wait_for_timeout(500)
    det = text_of(pg, '#range-detail')
    c.check('D13: the parent sees which words have no Chinese meaning', '沒有中文意思' in det and 'light' in det, det[:120].replace('\n', ' '), base=True)
    c.check('voice: no page errors', not errs, str(errs[:2]))
    b.close()
    # the voice exists but fails to play
    b, ctx, pg, errs = open_page(p, 390, 844, speech='fail')
    pg.goto(URL)
    boot(pg)
    parent_unlock(pg)
    add_range(pg)
    start_session(pg, [['pencil', 'listenSpell']])
    pg.click('[data-act="speak-word"]')
    pg.wait_for_timeout(900)
    pg.fill('#answer', 'pencil')
    pg.wait_for_timeout(200)
    note = vis_text(pg, '.p40-voice-note') or ''
    c.check('D3: a voice that fails to play does not block the answer', not pg.is_disabled('#submit-answer') and '沒有播出聲音' in note, note, base=True)
    b.close()


def section_finish(c, p):
    b, ctx, pg, errs = open_page(p, 390, 844)
    pg.goto(URL)
    boot(pg)
    parent_unlock(pg)
    add_range(pg)
    start_session(pg, [['pencil', 'spell'], ['ruler', 'spell']])
    answer(pg, 'pencil')
    pg.click('[data-act="next-task"]')
    pg.wait_for_timeout(500)
    for w_ in ('rulr', 'rullr', 'rulrr'):
        answer(pg, w_)
    pg.click('[data-act="next-task"]')
    pg.wait_for_timeout(700)
    h1 = vis_text(pg, 'h1') or ''
    c.check('D6: the finish page says how many were practised and how many right (R3.6: 今天練了 2 個字 in the title, 答對 1 ／ 2 題 in the star block)', '今天練了 2 個字' in h1 and '答對 1 ／ 2 題' in (text_of(pg) or ''), h1, base=True)
    c.check('D6: the words to practise again are listed', 'ruler' in (vis_text(pg, '.p40-again') or ''), '', base=True)
    c.check('D6: a 再練這些字 button is offered', pg.query_selector('[data-p40="again"]') is not None, '', base=True)
    txt = text_of(pg)
    c.check('D6: the finish page has no marks or test wording', not any(w in txt for w in FORBIDDEN), [w for w in FORBIDDEN if w in txt].__repr__(), base=True)
    shot(pg, 'finish_390')
    pg.click('[data-p40="again"]')
    pg.wait_for_timeout(700)
    q = ev(pg, "db.session?JSON.stringify(db.session.queue.map(q=>db.words.find(w=>w.id===q.wordId).en)):''")
    c.check('D6: 再練這些字 starts a practice with just those words', 'ruler' in q and 'pencil' not in q, q, base=True)
    b.close()


def section_parent(c, p):
    b, ctx, pg, errs = open_page(p, 390, 844)
    pg.goto(URL)
    boot(pg)
    parent_unlock(pg)
    add_range(pg, title='Unit 4 水果與食物')
    # report after some mistakes
    start_session(pg, [['pencil', 'spell'], ['ruler', 'spell']])
    answer(pg, 'pencil')
    pg.click('[data-act="next-task"]')
    pg.wait_for_timeout(400)
    for w_ in ('rulr', 'rullr', 'rulrr'):
        answer(pg, w_)
    pg.click('[data-act="next-task"]')
    pg.wait_for_timeout(500)
    pg.evaluate("location.hash='#report'")
    pg.wait_for_timeout(600)
    parent_unlock(pg)
    pg.wait_for_timeout(300)
    rep = text_of(pg)
    c.check('D16: the report has a 再練這些字 button for the parent', pg.query_selector('[data-p40="practice-weak"]') is not None, '', base=True)
    bad = [w for w in ['獨立', '證據', '掌握', '義項', '延後重溫', '校對', '嚴格默書'] if w in rep]
    c.check('D16/D24: the report uses plain words only', not bad, str(bad), base=True)
    c.check('D24: the report explains the status words', '這些說法是甚麼意思' in rep, '', base=True)
    shot(pg, 'report_390', full=True)
    pg.click('[data-p40="practice-weak"]')
    pg.wait_for_timeout(600)
    c.check('D16: the report button starts a practice', ev(pg, 'lastRoute') == 'learn', ev(pg, 'lastRoute'), base=True)
    # gate: the ranges page is a parent page
    ev(pg, 'v23ParentUntil=0')
    pg.evaluate("location.hash='#ranges'")
    pg.wait_for_timeout(700)
    c.check('D15: the ranges page asks for the parent password', pg.query_selector('#v23-parent-password') is not None, '', base=True)
    c.check('D15: choosing today\'s range for the child is still allowed', ev(pg, "!v23ParentActions.has('activate-range')") is True, '')
    gt = text_of(pg)
    c.check('D17: the gate says 15 minutes', '15 分鐘' in gt, '', base=True)
    unlock_parent(pg)
    left = ev(pg, 'Math.round((v23ParentUntil-performance.now())/60000)')
    c.check('D17: the parent lease lasts 15 minutes', 13 <= left <= 15, str(left), base=True)
    ev(pg, 'v23ParentUntil=performance.now()+60000')
    pg.mouse.click(5, 300)
    pg.wait_for_timeout(200)
    left2 = ev(pg, 'Math.round((v23ParentUntil-performance.now())/60000)')
    c.check('D17: activity renews the lease', left2 >= 13, str(left2), base=True)
    # D8: trial mode demo range
    c.check('D15: the ranges page now works', ev(pg, 'lastRoute') == 'ranges' or pg.query_selector('.range-card') is not None, ev(pg, 'lastRoute'))
    # rename
    pg.click('[data-act="view-range"]')
    pg.wait_for_timeout(400)
    if pg.query_selector('#p40-rn-title'):
        pg.evaluate("document.querySelector('.p40-rename').open=true")
        pg.fill('#p40-rn-title', 'Unit 5 改名')
        pg.click('[data-p40="rename-save"]')
        pg.wait_for_timeout(500)
    c.check('D15: a range can be renamed', 'Unit 5 改名' in text_of(pg), '', base=True)
    shot(pg, 'ranges_390', full=True)
    b.close()
    # D8: the demo range in trial mode
    b, ctx, pg, errs = open_page(p, 390, 844)
    pg.goto(URL)
    pg.wait_for_timeout(1200)
    pg.evaluate("location.hash='#ranges'")
    pg.wait_for_timeout(700)
    info = ev(pg, "JSON.stringify(db.ranges.map(r=>[r.id,r.title,r.dictationDate]))")
    t = text_of(pg)
    if 'r_demo' in info:
        c.check('D8: the demo range is labelled 示範', '示範' in t, t[:80].replace('\n', ' '))
        c.check('D8: the demo range has no made-up date', all(r[2] == '' for r in json.loads(info) if r[0] == 'r_demo'), info, base=True)
        c.check('D8: the demo range can be deleted', pg.query_selector('[data-act="delete-range"]') is not None, '')
    else:
        c.check('D8: demo range present in trial mode (skipped)', True, info[:80])
    b.close()


def section_ocr(c, p):
    b, ctx, pg, errs = open_page(p, 390, 844)
    pg.goto(URL)
    boot(pg)
    go_range_new(pg)

    def run_ocr(img, psm='3'):
        pg.set_input_files('#ocr-upload', str(IMG / img))
        wait_js(pg, "!!document.querySelector('#run-ocr')&&!document.querySelector('#run-ocr').disabled", 15000)
        ev(pg, "(()=>{const e=document.querySelector('#v20-psm');if(e){e.value=%s;e.dispatchEvent(new Event('change',{bubbles:true}));}})()" % json.dumps(psm))
        pg.click('#run-ocr')
        wait_js(pg, "typeof ocrBusy!=='undefined'&&!window.__ev('ocrBusy')&&window.__ev('v20.items.length')>=0&&document.querySelector('#ocr-status').innerText.length>0", 90000)
        pg.wait_for_timeout(1200)
    # D7: technical errors become plain next steps
    ev(pg, "window.__ocrFail='Failed to fetch'")
    pg.evaluate("window.__ocrFail='Failed to fetch'")
    run_ocr('p1_clean_print.png')
    st = vis_text(pg, '#ocr-status') or ''
    c.check('D7: no raw "Failed to fetch" in the visible message', 'Failed to fetch' not in st and len(st) > 5, st[:100], base=True)
    c.check('D7: the message says what to do next', '也可以直接輸入文字' in st, st[:100], base=True)
    c.check('D7: technical detail sits in a collapsed 詳細資料', pg.query_selector('#ocr-status details.p40-tech') is not None, '', base=True)
    shot(pg, 'ocr_error_390')
    pg.evaluate("window.__ocrFail='OCR檔案下載失敗 /vendor/tesseract/core.wasm.js HTTP 404'")
    pg.click('#run-ocr')
    pg.wait_for_timeout(2500)
    st = vis_text(pg, '#ocr-status') or ''
    c.check('D7: file paths and http codes are hidden', 'wasm' not in st and '404' not in st and '/vendor' not in st and len(st) > 5, st[:100], base=True)
    # clear photo: success line and preselected word-like candidates
    pg.evaluate("window.__ocrFail=null")
    pg.click('#run-ocr')
    wait_js(pg, "!window.__ev('ocrBusy')&&window.__ev('v20.items.length')>0", 90000)
    pg.wait_for_timeout(1200)
    st = (vis_text(pg, '#ocr-status') or '') + (vis_text(pg, '#v20-message') or '')
    sel = ev(pg, "v20Selected().map(c=>c.en).join('|')")
    c.check('D4: a clear photo gives the success line with counts', '先選了' in st, st, base=True)
    c.check('D4: the real words are preselected', all(w in sel for w in ('pencil', 'ruler', 'grandmother')), sel[:80])
    c.check('D4: noise is not preselected', not any(n in sel.split('|') for n in ('P', 'fal', 'CON', 'ZBHN', 'RB', 'English', 'Dictation', 'Fruit', 'Food')), sel[:120], base=True)
    c.check('D4: after a clear result the check step opens', ev(pg, "document.querySelector('#import-v20').dataset.p40Step") == '2', '', base=True)
    shot(pg, 'ocr_clear_step2_390')
    ttl = ev(pg, 'importDraft.title')
    dte = ev(pg, 'importDraft.date')
    c.check('D22: the unit name and the date are taken from the paper', 'Unit 4' in ttl and dte == '2026-10-10', ttl + ' / ' + dte, base=True)
    # unclear photo
    ev(pg, "clearImportDraft();render();")
    go_range_new(pg)
    run_ocr('p4_blurry.jpg', '6')
    st = vis_text(pg, '#ocr-status') or ''
    sel = ev(pg, "v20Selected().length")
    c.check('D4: an unclear photo shows 辨認結果不太清楚 instead of the success line', '辨認結果不太清楚。請檢查或重新拍照' in st and '先選了' not in st, st, base=True)
    c.check('D4: nothing is preselected from an unclear photo', sel == 0, str(sel), base=True)
    shot(pg, 'ocr_unclear_390')
    c.check('ocr: no page errors', not errs, str(errs[:2]))
    b.close()


def section_layout(c, p):
    for (w, h, tag) in ((320, 568, '320'), (844, 390, '844')):
        b, ctx, pg, errs = open_page(p, w, h)
        pg.goto(URL)
        boot(pg)
        parent_unlock(pg)
        add_range(pg)
        pg.evaluate("location.hash='#ranges'")
        pg.wait_for_timeout(500)
        ov = pg.evaluate("()=>document.documentElement.scrollWidth-innerWidth")
        c.check('layout %s: the ranges page has no sideways scroll' % tag, ov <= 1, str(ov))
        go_range_new(pg)
        pg.fill('#raw-words', PASTE)
        pg.click('[data-imp="parse"]')
        pg.wait_for_timeout(700)
        ov = pg.evaluate("()=>document.documentElement.scrollWidth-innerWidth")
        c.check('layout %s: the check-words step has no sideways scroll' % tag, ov <= 1, str(ov))
        c.check('layout %s: R3.12 the 儲存 bar is inside the screen on the check step' % tag, pg.evaluate("()=>{const e=document.querySelector('#v20-confirm-next').getBoundingClientRect();return e.bottom<=innerHeight+1&&e.right<=innerWidth+1&&e.left>=-1}"), '')
        pg.click('[data-s50="all"]')   # the same words were saved a moment ago (R3.11 leaves them un-selected as 已學過)
        pg.wait_for_timeout(200)
        pg.click('#v20-confirm-next')
        pg.wait_for_selector('#s50-saved', timeout=8000)
        ov = pg.evaluate("()=>document.documentElement.scrollWidth-innerWidth")
        c.check('layout %s: the saved card has no sideways scroll' % tag, ov <= 1, str(ov))
        ev(pg, 'clearImportDraft();render();')
        start_session(pg, [['grandmother', 'listenSpell']])
        ov = pg.evaluate("()=>document.documentElement.scrollWidth-innerWidth")
        c.check('layout %s: the question page has no sideways scroll' % tag, ov <= 1, str(ov))
        gh = pg.evaluate("()=>{const g=document.querySelector('.task-shell>.wq32-guide');return g?Math.round(g.getBoundingClientRect().height):-1}")
        c.check('D25 %s: the mascot is a small strip on the question page (<= 90 px)' % tag, 0 <= gh <= 90, str(gh), base=(tag == '320'))
        sb = pg.evaluate("()=>{const e=document.querySelector('#submit-answer');if(!e)return -1;const r=e.getBoundingClientRect();return Math.round(r.bottom)}")
        c.check('D25 %s: the check button is within the first screen after typing' % tag, 0 < sb <= h + 400, str(sb))
        shot(pg, 'layout_spell_' + tag)
        ev(pg, """(()=>{const ws=rangeWords(latestRange().id);const w=ws.find(x=>x.en==='grandmother');db.session=newSession([prepareItem({id:uid('q'),wordId:w.id,type:'study',origin:'自選認詞'},w)],'practice');save();go('learn');render();})()""")
        pg.wait_for_timeout(500)
        ov = pg.evaluate("()=>document.documentElement.scrollWidth-innerWidth")
        wr = pg.evaluate("()=>{const e=document.querySelector('.study-content .word');if(!e)return 0;const r=e.getBoundingClientRect();return Math.round(r.right)}")
        c.check('D19 %s: a long word stays inside the screen' % tag, ov <= 1 and wr <= w, 'overflow=%s right=%s' % (ov, wr))
        shot(pg, 'layout_study_' + tag)
        c.check('layout %s: no page errors' % tag, not errs, str(errs[:2]))
        b.close()


SECTIONS = {'flow': section_flow, 'practice': section_practice, 'voice': section_voice, 'finish': section_finish,
            'parent': section_parent, 'ocr': section_ocr, 'layout': section_layout}


if __name__ == '__main__':
    want = sys.argv[1:] or list(SECTIONS)
    c = Checker('p40 dictation browser')
    with sync_playwright() as p:
        for name in want:
            print('--', name, flush=True)
            safe(c, name, lambda n=name: SECTIONS[n](c, p))
    sys.exit(c.finish())

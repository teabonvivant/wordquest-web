"""R3.6 t02 - items 3, 5, 6, 8, 9, 13: fixed 8 words, no 「自己選玩法」, 家長教學小貼士, no "unfinished" questions,
study -> 考考你 (20 mixed questions) in one go, and the tick + date on a finished lesson.

    WQ33_APP=/path/to/index.html python3 r36_tests/t02_lesson_quiz.py
"""
import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib36 import *  # noqa: E402,F401,F403

c = Checker('t02 lesson / 考考你 / tick')
html = APP.read_text()

OLD_CONFIRMS = ['你還有一輪未做完', '要改做補練錯題嗎', '切換默書範圍會結束未完成的一輪', '開始另一個字？目前這個字的作答紀錄會保留', '要改做另一項嗎？做好的紀錄會保留']
STALE = ['未完成', '還沒做完', '未做完', '上一次', '上次', '接着']


def badge(pg, uid):
    return pg.evaluate("""(u)=>{const a=document.querySelector('a.l30-unit-card[href="#unit?id='+u+'"]');const d=a&&a.querySelector('.q36-done');
      return d?{text:d.innerText.replace(/\\s+/g,' ').trim(),on:d.querySelectorAll('.q36-star.on').length,tick:!!d.querySelector('.q36-tick')}:null}""", uid)


def session_row(pg, uid):
    return ev(pg, "(()=>{const r=[...l30Read().sessions].reverse().find(s=>s.unit==='" + uid + "');return r?{status:r.status,mode:r.mode,n:r.queue.length}:null})()")


def today_label(pg):
    return pg.evaluate("(()=>{const t=new Date();return (t.getMonth()+1)+'月'+t.getDate()+'日'})()")


with sync_playwright() as p:
    b, ctx, pg, errs = open_page36(p, 390, 844)
    boot(pg)
    us = units(pg)

    # ===================================================================================== A. what the child sees before starting
    route_to(pg, '#unit?id=' + us[0], 900)
    ui = pg.evaluate("""(()=>{const a=document.querySelector('#app');return {sel:a.querySelectorAll('select').length,inp:a.querySelectorAll('input').length,
       text:a.innerText,sum:[...a.querySelectorAll('details>summary')].map(s=>s.textContent.trim()),
       start:[...a.querySelectorAll('[data-l30="start"]')].map(b=>b.textContent.trim())}})()""")
    c.check('A1 the unit page has no number choice (no select or input)', ui['sel'] == 0 and ui['inp'] == 0, f"select={ui['sel']} input={ui['inp']}", base=True)
    c.check('A2 no 「自己選玩法」 / 「選玩法」 on the unit page', '選玩法' not in ui['text'] and '自己選' not in ui['text'], base=True)
    c.check('A3 the parent section is called 家長教學小貼士', '家長教學小貼士' in ui['sum'], repr(ui['sum']), base=True)
    c.check('A4 the old title 「給家長：這課怎樣教？」 is gone from the page and from the program',
            '這課怎樣教' not in ui['text'] and '這課怎樣教' not in html and '家長教法' not in html, base=True)
    c.check('A5 one start button 開始這一課, and the page says 8 words then 20 questions', ui['start'] == ['開始這一課'] and '先學 8 個詞' in ui['text'] and '20 題' in ui['text'], repr(ui['start']), base=True)
    pg.screenshot(path=str(SHOT_DIR / 't02_unit.png'))

    all_text = {}
    for h in ['#classroom', '#practice', '#kid', '#game']:
        route_to(pg, h, 700)
        all_text[h] = text(pg)
    ev(pg, "go('phonics');render()")
    pg.wait_for_timeout(500)
    all_text['phonics'] = text(pg)
    ev(pg, "go('spelling-family');render()")
    pg.wait_for_timeout(500)
    all_text['family'] = text(pg)
    ev(pg, "go('assembly');render()") if False else None
    bad = {k: '選玩法' for k, v in all_text.items() if '選玩法' in v}
    c.check('A6 no 「選玩法」 on the classroom, practice, home, arcade, phonics or family pages', not bad, repr(bad), base=False)
    c.check('A7 the phonics teacher button says 家長教學小貼士', '家長教學小貼士' in html and '家長教法' not in html, base=True)
    ev(pg, "(()=>{go('phonics');render();})()")
    pg.wait_for_timeout(400)
    ev(pg, "pcSessionStart(PC.lessons[0].id,'learn')")
    pg.wait_for_timeout(700)
    pc_btn = pg.evaluate("[...document.querySelectorAll('#app [data-pc=\"note\"]')].map(b=>b.textContent.trim())")
    c.check('A8 on a phonics lesson the parent button reads 家長教學小貼士', pc_btn == ['家長教學小貼士'], repr(pc_btn), base=True)
    ev(pg, "(()=>{pcStore().session=null;save();go('kid');render();})()")

    # ===================================================================================== B. eight words, then twenty mixed questions
    counts = ev(pg, "JSON.stringify([...LIB30.units.values()].map(u=>u.words.length))")
    import json
    cn = Counter(json.loads(counts))
    bad_len = []
    adj_bad = []
    modes_seen = Counter()
    for uid in us:
        pg.evaluate(f'__p40.l30Start("{uid}","lesson")')
        q = ev(pg, "(()=>{const s=l30Session();return {m:s.queue.map(x=>x.mode),t:s.queue.map(x=>x.target)}})()")
        study = [t for m, t in zip(q['m'], q['t']) if m == 'study']
        graded = [(m, t) for m, t in zip(q['m'], q['t']) if m != 'study']
        if len(q['m']) != 28 or len(study) != 8 or len(set(study)) != 8 or len(graded) != 20 or q['m'][:8] != ['study'] * 8:
            bad_len.append((uid, len(study), len(graded)))
        for m, _ in graded:
            modes_seen[m] += 1
        if any(graded[i][1] == graded[i - 1][1] for i in range(1, len(graded))):
            adj_bad.append(uid)
    c.check(f'B1 every one of the {len(us)} units starts a lesson of 8 different words to study and 20 questions (units hold {dict(cn)} words)', not bad_len, repr(bad_len[:4]), base=True)
    c.check(f'B1b in none of the {len(us)} lessons is the same word asked twice in a row', not adj_bad, repr(adj_bad[:6]))
    clear(pg)

    info = start(pg, 'lesson', us[0])
    q = ev(pg, "(()=>{const s=l30Session();return {m:s.queue.map(x=>x.mode),t:s.queue.map(x=>x.target)}})()")
    gm, gt = q['m'][8:], q['t'][8:]
    study_words = set(q['t'][:8])
    c.check('B2 R3.7: the 20 questions use only multiple-choice and fill-in question types, at least 4 of them', set(gm) <= {'meaning', 'listenChoice', 'spell', 'listenSpell', 'cloze'} and len(set(gm)) >= 4, repr(Counter(gm)), base=True)
    c.check('B3 the 20 questions cover all 8 study words, none more than 4 times', set(gt) == study_words and max(Counter(gt).values()) <= 4 and min(Counter(gt).values()) >= 2, repr(Counter(gt).most_common()), base=True)
    c.check('B4 the same word is never asked twice in a row', all(gt[i] != gt[i - 1] for i in range(1, len(gt))))
    c.check('B5 no single question type takes more than 5 of the 20', max(Counter(gm).values()) <= 5, repr(Counter(gm)))
    c.check('B6 every question type is one the app knows (no study card inside the quiz)', all(m != 'study' for m in gm) and set(gm) <= set(ev(pg, "Object.keys(L30.MODES)")), repr(set(gm)))

    # walk the study cards with real clicks
    last_btn = None
    for i in range(8):
        cur_ = cur(pg)
        tag = pg.evaluate("document.querySelector('.l30-tag,.q36-tag,[data-l30-stage]')?.textContent||''")
        if i == 7:
            last_btn = pg.evaluate("document.querySelector('[data-l30=\"submit\"]')?.textContent.trim()")
            pg.screenshot(path=str(SHOT_DIR / 't02_study_last.png'))
        pg.click('[data-l30="submit"]')
        pg.wait_for_timeout(150)
    info = cur(pg)
    c.check('B7 the last study card says 開始考考你', last_btn == '開始考考你', repr(last_btn), base=True)
    c.check('B8 after the 8th card the child is in question 1 of 20, no extra button or choice in between', info and info['index'] == 8 and info['mode'] != 'study', repr(info and (info['index'], info['mode'])), base=True)
    stage = pg.evaluate("document.body.innerText")
    c.check('B9 the screen says 考考你 1／20 with the full-stars rule', '考考你 1／20' in stage and '5 顆星' in stage, base=True)
    pg.screenshot(path=str(SHOT_DIR / 't02_quiz_first.png'))
    # reload half way: the same lesson and the same questions come back
    answered = 0
    for _ in range(3):
        i2 = cur(pg)
        if i2['mode'] in ('listenChoice', 'listenSpell'):
            hear(pg)
        answer(pg, True)
        pg.click('[data-l30="submit"]')
        pg.wait_for_timeout(120)
        pg.click('[data-l30="next"]')
        pg.wait_for_timeout(120)
        answered += 1
    before = ev(pg, "(()=>{const s=l30Session();return JSON.stringify({i:s.index,id:s.id,q:s.queue.map(x=>x.mode+x.target)})})()")
    pg.reload()
    pg.wait_for_function('typeof window.__p40==="object"', timeout=15000)
    pg.wait_for_timeout(600)
    after = ev(pg, "(()=>{const s=l30Session();return s?JSON.stringify({i:s.index,id:s.id,q:s.queue.map(x=>x.mode+x.target)}):null})()")
    c.check('B10 reload half way keeps the same lesson, the same 28 steps and the place reached', before == after, (before or '')[:60])
    ev(pg, "(()=>{l30Commit(()=>{L30.abandon(l30Session(),Date.now());},{redraw:false});go('kid');render();})()")

    # ===================================================================================== C. nothing asks about the old round
    c.check('C1 none of the five old 「未完成」 questions is left in the program', not [x for x in OLD_CONFIRMS if x in html], repr([x for x in OLD_CONFIRMS if x in html]), base=True)
    pg.dialogs.clear()
    # English lesson: start A, answer a little, start B from the classroom
    start(pg, 'lesson', us[0])
    walk(pg, 10)
    first_id = cur(pg)['id']
    route_to(pg, '#classroom', 800)
    pg.click(f'a.l30-unit-card[href="#unit?id={us[1]}"]')
    pg.wait_for_timeout(600)
    t_unit = text(pg)
    c.check('C2 opening another lesson while one is half done shows no question and no 未完成 notice', not pg.dialogs and not [w for w in STALE if w in t_unit], repr(pg.dialogs) + repr([w for w in STALE if w in t_unit]), base=True)
    pg.click('[data-l30="start"]')
    pg.wait_for_timeout(700)
    new = cur(pg)
    old_row = session_row(pg, us[0])
    c.check('C3 pressing 開始這一課 goes straight into the new lesson at card 1 (no dialog)', bool(new) and new['unit'] == us[1] and new['index'] == 0 and new['id'] != first_id and not pg.dialogs, repr(pg.dialogs), base=True)
    c.check('C4 the half-done lesson is kept as an abandoned record, not deleted', bool(old_row) and old_row['status'] == 'abandoned', repr(old_row))
    t_study = text(pg)
    c.check('C5 the new lesson screen says nothing about the earlier round', not [w for w in STALE if w in t_study], repr([w for w in STALE if w in t_study]), base=True)
    # a practice type from the 練習 page while another round is open
    route_to(pg, '#practice', 800)
    pg.click('[data-l30="entry"][data-mode="mcq"]')
    pg.wait_for_timeout(700)
    d = cur(pg)
    c.check('C6 choosing a practice type on the 練習 page starts it at once even with a round open', bool(d) and d['mode'] in ('meaning', 'listenChoice', 'study') and d['index'] == 0 and not pg.dialogs, repr(pg.dialogs) + repr(d and d['mode']), base=True)
    # old school-range flow
    ev(pg, "(()=>{go('kid');render();})()")
    ev(pg, "startDaily()")
    pg.wait_for_timeout(500)
    has_old = ev(pg, "!!db.session")
    ev(pg, "startPractice('spell')")
    pg.wait_for_timeout(500)
    ev(pg, "practiceWeak&&0")
    c.check('C7 starting a school-range practice over an old round asks nothing', has_old and not pg.dialogs and ev(pg, "db.session&&db.session.mode")=='practice', repr(pg.dialogs) + repr(ev(pg, "db.session&&db.session.mode")), base=True)
    # (the old phonics and spelling-family pages now redirect into the classroom / workshop, so no click path to them is left; their confirm questions are covered by C1)
    ev(pg, "(()=>{fgStore().session=null;fgWrite();go('kid');render();})()")
    clear(pg)

    # ===================================================================================== D. tick, date, stars on finished lessons
    route_to(pg, '#classroom', 900)
    n_before = pg.evaluate("document.querySelectorAll('a.l30-unit-card .q36-done').length")
    c.check('D1 before any lesson is finished no unit card has a tick', n_before == 0, str(n_before))
    # abandoned halfway: no tick
    start(pg, 'lesson', us[2])
    walk(pg, 12)
    clear(pg)
    route_to(pg, '#classroom', 800)
    c.check('D2 a lesson left half way gets no tick', badge(pg, us[2]) is None)
    # a drill is not a lesson
    r = play_lesson(pg, us[3], mode='mixed')
    route_to(pg, '#classroom', 800)
    c.check('D3 a finished practice drill (8 questions) gets no tick', badge(pg, us[3]) is None, repr(badge(pg, us[3])))
    # full lesson, all right
    r = play_lesson(pg, us[4])
    pg.screenshot(path=str(SHOT_DIR / 't02_result5.png'))
    route_to(pg, '#classroom', 900)
    bd = badge(pg, us[4])
    today = today_label(pg)
    c.check('D4 the finished lesson card shows ✓, 已學完 and today\'s date', bool(bd) and bd['tick'] and '已學完' in bd['text'] and today in bd['text'], repr(bd) + ' want ' + today, base=True)
    c.check('D5 a perfect lesson shows five filled stars on the card', bool(bd) and bd['on'] == 5, repr(bd), base=True)
    pg.screenshot(path=str(SHOT_DIR / 't02_classroom_done.png'))
    # wrong answers: still ticked (the 20 questions were finished), fewer stars
    r2 = play_lesson(pg, us[5], wrong=(1, 2, 3))
    route_to(pg, '#classroom', 900)
    bd2 = badge(pg, us[5])
    c.check('D6 a lesson finished with mistakes is ticked too, with fewer stars', bool(bd2) and bd2['tick'] and 1 <= bd2['on'] <= 4, repr(bd2), base=True)
    # only one card per unit
    c.check('D7 exactly two cards have a tick so far (the two finished lessons)', pg.evaluate("document.querySelectorAll('a.l30-unit-card .q36-done').length") == 2)
    # unit page
    route_to(pg, '#unit?id=' + us[4], 900)
    up = pg.evaluate("({done:!!document.querySelector('#app .q36-done'),btn:document.querySelector('[data-l30=\"start\"]')?.textContent.trim()})")
    c.check('D8 the unit page of a finished lesson shows the tick and offers 再學一次', up['done'] and up['btn'] == '再學一次', repr(up), base=True)
    pg.screenshot(path=str(SHOT_DIR / 't02_unit_done.png'))
    # persistence
    pg.reload()
    pg.wait_for_function('typeof window.__p40==="object"', timeout=15000)
    route_to(pg, '#classroom', 1000)
    bd3 = badge(pg, us[4])
    c.check('D9 after closing and reopening the page the tick and date are still there', bool(bd3) and bd3['tick'] and today in bd3['text'], repr(bd3), base=True)
    ok = ev(pg, "(()=>{try{L30.validateState(JSON.parse(JSON.stringify(db.learningV30)),db.children,window.WQ30Library);return true}catch(e){return e.message}})()")
    c.check('D10 the saved learning data still passes the engine validator', ok is True, repr(ok))
    # the same unit again: the earlier tick stays while the new round runs
    start(pg, 'lesson', us[4])
    route_to(pg, '#classroom', 800)
    c.check('D11 starting the same lesson again does not remove the tick', badge(pg, us[4]) is not None, base=True)
    clear(pg)
    c.check('D12 no console or page errors', not errs, repr(errs[:3]))
    b.close()

import sys as _s
_s.exit(c.finish())

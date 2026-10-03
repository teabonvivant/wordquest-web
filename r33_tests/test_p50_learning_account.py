#!/usr/bin/env python3
"""R3.3 p50 acceptance tests: N7 (registration grade / parent grade edit), N6 (abandon with tiles),
N8 (no public Admin/1234, local-only sandbox), N13a (demo scope water + guest copy).

    WQ33_APP=<index.html> python3 r33_tests/test_p50_learning_account.py [n7 n6 n8 n13a]

One line per check, starting with PASS or FAIL (the release runner counts these), then a SUMMARY line.
Exit code 1 when any check failed.  Run it against the frozen R3.2 file to see the baseline failures:
    WQ33_APP=originals/R3_2/app/index.html python3 r33_tests/test_p50_learning_account.py
Expected values (pace, dictionary...) are read from the page itself, never hard coded.
"""
import json
import os
import re
import socket
import subprocess
import sys
import time
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wq33 import APP, CHROMIUM, PW, R, URL, hit, new_page, register, sync_playwright, unlock_parent  # noqa: E402

BASE_APP = R / 'originals/R3_2/app/index.html'
PASS = FAIL = 0


def check(name, ok, detail=''):
    """Print one PASS/FAIL line."""
    global PASS, FAIL
    ok = bool(ok)
    PASS += ok
    FAIL += (not ok)
    print(('PASS ' if ok else 'FAIL ') + name + ((' | ' + str(detail)) if detail else ''), flush=True)


def section(fn):
    """Run one section; an exception is reported as a FAIL line instead of aborting the run."""
    try:
        fn()
    except Exception as e:  # noqa: BLE001
        global FAIL
        FAIL += 1
        tb = traceback.format_exc().strip().splitlines()[-1]
        print(f'FAIL {fn.__name__} raised {type(e).__name__}: {str(e)[:160]} | {tb[:160]}', flush=True)


# ----------------------------------------------------------------------------- shared helpers
SPEECH_COUNTER = """window.__gv=0;try{const o=speechSynthesis.getVoices.bind(speechSynthesis);
Object.defineProperty(speechSynthesis,'getVoices',{value:function(){window.__gv++;return o();},configurable:true});}catch(e){}"""


def go(pg, route, wait=600):
    pg.evaluate(f"location.hash='#{route}'")
    pg.wait_for_timeout(wait)


def accept_dialogs(pg):
    pg.on('dialog', lambda d: d.accept())


def user_db(pg):
    return pg.evaluate("""()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('wordquest-v10-user-')&&!k.includes('-v24-protection'));
      return k?JSON.parse(localStorage.getItem(k)):null}""")


def grades(pg):
    d = user_db(pg)
    return [c['grade'] for c in d['children']] if d else None


def pace(pg, g):
    return pg.evaluate(f"WQ30Core.pace({g})")


def hero_count(pg):
    """The 'N words' number shown on the child home."""
    go(pg, 'kid')
    m = re.search(r'先學\s*(\d+)\s*個(?:詞語|單字)', pg.inner_text('.l30-hero'))
    return int(m.group(1)) if m else None


def lesson_steps(pg):
    """Start today's lesson from the child home; return its queue length (and abandon it)."""
    go(pg, 'kid')
    pg.locator('[data-l30="start"][data-mode="lesson"]').first.click()
    pg.wait_for_timeout(900)
    n = pg.evaluate("(()=>{const s=WQ30.snapshot().state.sessions.filter(x=>x.status==='active');return s.length?s[0].queue.length:-1})()")
    pg.evaluate("(()=>{const m=document.querySelector('.p20-more');if(m)m.open=true;})()")  # R3.5: give-up now lives in the top-right menu
    pg.locator('[data-l30="abandon"]').first.click()
    pg.wait_for_timeout(800)
    return n


def click_maths_entry(pg):
    """Open maths the way a user does: the 數學 tab (R3.5) when the build has it, else the floating button (R3.4 and older)."""
    if pg.query_selector('#wq29-nav [data-wqm-open]'):
        pg.click('#wq29-nav [data-wqm-open]')
    else:
        pg.click('#wqm-launch')


def open_math(pg):
    click_maths_entry(pg)
    pg.wait_for_timeout(1000)
    return pg.evaluate("document.querySelector('#wqm-app-host')?.shadowRoot?.querySelector('.name')?.textContent||''")


def math_daily(pg):
    pg.evaluate("document.querySelector('#wqm-app-host').shadowRoot.querySelector('[data-action=\"daily:normal\"]').click()")
    pg.wait_for_timeout(1500)


def math_close(pg):
    # R3.5 (p50): a question screen shows only 「← 返回」 and the progress line, so the shell's close button exists on the
    # maths pages but not inside a running practice; fall back to the same close() the product itself exposes.
    pg.evaluate("""(()=>{const b=document.querySelector('#wqm-app-host').shadowRoot.querySelector('[data-action="close"]');if(b)b.click();else window.WQMathApp.close();})()""")
    pg.wait_for_timeout(400)


def reg(pg, g, name='fam', child='小明'):
    register(pg, name, child, grade=str(g))


def logout(pg):
    pg.evaluate("document.querySelector('[data-act=\"auth-toggle\"]')?.click()")
    pg.wait_for_timeout(800)


def center_hit(pg, sel):
    pg.evaluate("(s)=>document.querySelector(s)?.scrollIntoView({block:'center'})", sel)
    pg.wait_for_timeout(250)
    return hit(pg, sel)


# ============================================================================================= N7
def n7():
    with sync_playwright() as p:
        # ---- A. the registration form ------------------------------------------------------------
        b, ctx, pg, errs = new_page(p, 390, 844, touch=True)
        pg.goto(URL)
        pg.wait_for_timeout(800)
        go(pg, 'login', 500)
        sel = pg.query_selector('#register-grade')
        check('N7 registration form has #register-grade', sel is not None)
        opts = pg.evaluate("[...document.querySelectorAll('#register-grade option')].map(o=>[o.value,o.textContent.trim()])") if sel else []
        check('N7 grade options are 請選擇年級 + 小一..小六 (values 1..6)',
              opts == [['', '請選擇年級']] + [[str(i), '小' + '一二三四五六'[i - 1]] for i in range(1, 7)], opts)
        check('N7 there is no grade value 0 (K3 uses 小一)', sel is not None and all(v != '0' for v, _ in opts))
        hint = pg.inner_text('#register-grade-hint') if pg.query_selector('#register-grade-hint') else ''
        check('N7 hint says 幼稚園高班 -> 小一, word count follows grade, editable later', '幼稚園高班' in hint and '小一' in hint and '每課詞數' in hint and '家長區' in hint, hint)
        check('N7 label is linked to the select', pg.evaluate("!!document.querySelector('label[for=\"register-grade\"]')?.textContent.includes('年級')"))
        check('N7 select is a 44px+ tall touch target', sel is not None and pg.evaluate("document.querySelector('#register-grade').getBoundingClientRect().height") >= 44)
        pg.fill('#register-name', 'gradefam')
        pg.fill('#register-child', '小明')
        pg.fill('#register-pin', PW)
        pg.click('[data-act="register-submit"]')
        pg.wait_for_timeout(900)
        accounts = pg.evaluate("localStorage.getItem('wordquest-v10-accounts')")
        check('N7 submit without a grade is blocked (stays on login, no account created)',
              pg.evaluate('location.hash') == '#login' and not json.loads(accounts or '[]'), (pg.evaluate('location.hash'), accounts))
        err_vis = pg.query_selector('#register-grade-error') is not None and pg.is_visible('#register-grade-error')
        check('N7 missing grade shows a visible alert + aria-invalid', err_vis and pg.evaluate("document.querySelector('#register-grade').getAttribute('aria-invalid')") == 'true')
        check('N7 missing grade toast and focus on the select',
              '請先選擇' in (pg.evaluate("document.querySelector('#toast')?.textContent||''")) and pg.evaluate("document.activeElement?.id") == 'register-grade')
        if sel:
            pg.select_option('#register-grade', '1')
            pg.wait_for_timeout(200)
        check('N7 choosing a grade clears the alert', sel is not None and not pg.is_visible('#register-grade-error') and pg.evaluate("document.querySelector('#register-grade').getAttribute('aria-invalid')") is None)
        check('N7 select is hit-testable on a 390px phone', center_hit(pg, '#register-grade') is True)
        b.close()

        # ---- B. first child gets the chosen grade; pace follows; parent edit -----------------------
        b, ctx, pg, errs = new_page(p, 390, 844, touch=True)
        pg.add_init_script(SPEECH_COUNTER)
        accept_dialogs(pg)
        reg(pg, 1)
        check('N7 registered with 小一 -> child.grade is 1', grades(pg) == [1], grades(pg))
        p1, p3, p6 = pace(pg, 1), pace(pg, 3), pace(pg, 6)
        check('N7 L30 pace differs between 小一 / 小三 / 小六 (values read from the page)', len({p1, p3, p6}) == 3, (p1, p3, p6))
        check('N7 child home offers pace(1) words after registering 小一', hero_count(pg) == p1, (hero_count(pg), p1))
        check('N7 first lesson has 3 x pace(1) steps', lesson_steps(pg) == 3 * p1, (p1,))
        ed1 = pg.evaluate("WQEducation.pace(1,{dailyMax:12,dailyNew:5},true).dailyNew")
        ed6 = pg.evaluate("WQEducation.pace(6,{dailyMax:12,dailyNew:5},true).dailyNew")
        check('N7 maths profile grade follows the child (header shows 小1)', open_math(pg).endswith('小1'))
        math_close(pg)
        # parent area
        go(pg, 'children')
        gate_shown = pg.query_selector('#v23-parent-password') is not None
        check('N7 children page is behind the parent gate and shows no grade button yet', gate_shown and pg.query_selector('[data-act="show-grade-edit"]') is None)
        unlock_parent(pg)
        btns = pg.query_selector_all('[data-act="show-grade-edit"]')
        check('N7 parent area: one 修改年級 button per child', len(btns) == 1, len(btns))
        check('N7 修改年級 button is hit-testable and 44px+ high on a phone',
              len(btns) == 1 and center_hit(pg, '[data-act="show-grade-edit"]') is True and pg.evaluate("document.querySelector('[data-act=\"show-grade-edit\"]').getBoundingClientRect().height") >= 44)
        if btns:
            pg.click('[data-act="show-grade-edit"]')
            pg.wait_for_timeout(400)
        editor = pg.query_selector('#wq33-grade-select')
        check('N7 editor opens with the current grade selected and the word-count hint',
              editor is not None and pg.input_value('#wq33-grade-select') == '1' and '每課詞數會按年級調整' in pg.inner_text('#wq33-grade-editor'))
        check('N7 editor select/save/cancel are hit-testable on a phone',
              editor is not None and all(center_hit(pg, s_) is True for s_ in ('#wq33-grade-select', '[data-act="save-child-grade"]', '[data-act="cancel-grade-edit"]')))
        check('N7 save button is 44px+ high', editor is not None and pg.evaluate("document.querySelector('[data-act=\"save-child-grade\"]').getBoundingClientRect().height") >= 44)
        if editor:
            pg.select_option('#wq33-grade-select', '6')
            pg.click('[data-act="save-child-grade"]')
            pg.wait_for_timeout(700)
        check('N7 saving writes child.grade = 6', grades(pg) == [6], grades(pg))
        check('N7 saving confirms with the word-count hint toast', '每課詞數會按年級調整' in pg.evaluate("document.querySelector('#toast')?.textContent||''"))
        check('N7 child card shows 小6 afterwards', '小6' in pg.inner_text('.child-card'))
        check('N7 child home offers pace(6) words after the change', hero_count(pg) == p6, (hero_count(pg), p6))
        check('N7 next lesson has 3 x pace(6) steps', lesson_steps(pg) == 3 * p6, (p6,))
        check('N7 maths profile grade follows the edit without reloading (header shows 小6)', open_math(pg).endswith('小6'))
        before = pg.evaluate('window.__gv')
        math_daily(pg)
        check('N7 maths reading flag follows the grade: 小六 no longer auto-reads', pg.evaluate('window.__gv') == before, (before, pg.evaluate('window.__gv')))
        math_close(pg)
        go(pg, 'settings')
        unlock_parent(pg)
        m = re.search(r'小(\d)：今日最多 (\d+) 題、新字最多 (\d+) 個', pg.inner_text('#app'))
        check('N7 legacy pacing panel (WQEducation.pace) reflects 小六', bool(m) and m.group(1) == '6' and int(m.group(3)) == ed6, (m.groups() if m else None, ed1, ed6))
        pg.reload()
        pg.wait_for_timeout(1500)
        check('N7 grade survives a reload', grades(pg) == [6] and hero_count(pg) == p6)
        check('N7 page errors during the flow', not errs, errs[:2])
        b.close()

        # ---- C. maths auto-read matrix: 小一/小二 on, 小三..小六 off -------------------------------
        for g in range(1, 7):
            b, ctx, pg, errs = new_page(p, 390, 844, touch=True)
            pg.add_init_script(SPEECH_COUNTER)
            accept_dialogs(pg)
            reg(pg, g, name=f'mx{g}fam')
            head = open_math(pg)
            math_daily(pg)
            reads = pg.evaluate('window.__gv')
            check(f'N7 registered 小{g}: maths header 小{g} and auto-read {"on" if g <= 2 else "off"}',
                  head.endswith(f'小{g}') and (reads > 0) == (g <= 2) and grades(pg) == [g], (head, reads, grades(pg)))
            b.close()

        # ---- D. two children, cancel, gate and write-lease protection -----------------------------
        b, ctx, pg, errs = new_page(p, 390, 844, touch=True)
        accept_dialogs(pg)
        reg(pg, 3)
        go(pg, 'children')
        unlock_parent(pg)
        pg.click('[data-act="show-add-child"]')
        pg.wait_for_timeout(300)
        pg.fill('#new-child-name', '妹妹')
        pg.select_option('#new-child-grade', '5')
        pg.click('[data-act="add-child"]')
        pg.wait_for_timeout(900)
        go(pg, 'children')
        unlock_parent(pg)
        two = pg.query_selector_all('[data-act="show-grade-edit"]')
        check('N7 two children -> two 修改年級 buttons', len(two) == 2 and grades(pg) == [3, 5], (len(two), grades(pg)))
        if len(two) == 2:
            two[0].click()
            pg.wait_for_timeout(400)
            ed_child = pg.get_attribute('#wq33-grade-editor', 'data-child') if pg.query_selector('#wq33-grade-editor') else None
            first_id = user_db(pg)['children'][0]['id']
            check('N7 editor belongs to the clicked child only', ed_child == first_id and len(pg.query_selector_all('#wq33-grade-editor')) == 1, ed_child)
            pg.select_option('#wq33-grade-select', '6')
            pg.click('[data-act="cancel-grade-edit"]')
            pg.wait_for_timeout(400)
            check('N7 cancel closes the editor and changes nothing', pg.query_selector('#wq33-grade-editor') is None and grades(pg) == [3, 5], grades(pg))
            pg.query_selector_all('[data-act="show-grade-edit"]')[1].click()
            pg.wait_for_timeout(400)
            pg.select_option('#wq33-grade-select', '2')
            pg.click('[data-act="save-child-grade"]')
            pg.wait_for_timeout(700)
            check('N7 editing the second child leaves the first untouched', grades(pg) == [3, 2], grades(pg))
            check('N7 active child (the second) now follows pace(2)', hero_count(pg) == pace(pg, 2), (hero_count(pg), pace(pg, 2)))
            # a half-open editor is closed when the parent switches child
            go(pg, 'children')
            unlock_parent(pg)
            pg.query_selector_all('[data-act="show-grade-edit"]')[1].click()
            pg.wait_for_timeout(300)
            opened = pg.query_selector('#wq33-grade-editor') is not None
            pg.locator('[data-act="set-child"]').first.click()
            pg.wait_for_timeout(600)
            unlock_parent(pg)
            go(pg, 'children')
            unlock_parent(pg)
            check('N7 switching child closes a half-open grade editor (nothing saved)', opened and pg.query_selector('#wq33-grade-editor') is None and grades(pg) == [3, 2], (opened, grades(pg)))
        # a save click without the parent gate must not change anything (gate expiry / forged button)
        pg.reload()
        pg.wait_for_timeout(1500)
        cid = user_db(pg)['children'][0]['id']
        pg.evaluate("""(cid)=>{const s=document.createElement('select');s.id='wq33-grade-select';s.innerHTML='<option value="6" selected>6</option>';document.body.append(s);
          const b=document.createElement('button');b.id='forged';b.dataset.act='save-child-grade';b.dataset.id=cid;b.textContent='x';document.body.append(b);}""", cid)
        g_before = grades(pg)
        pg.evaluate("document.querySelector('#forged').click()")
        pg.wait_for_timeout(600)
        check('N7 save-child-grade without the parent gate changes nothing', grades(pg) == g_before, (g_before, grades(pg)))
        check('N7 save-child-grade without the parent gate shows the parent gate', pg.query_selector('#v23-parent-password') is not None)
        # second tab of the same account has no write lease: the action is refused
        pg2 = ctx.new_page()
        pg2.goto(URL)
        pg2.wait_for_timeout(800)
        go(pg2, 'login', 400)
        pg2.fill('#login-name', 'fam')
        pg2.fill('#login-pin', PW)
        pg2.click('[data-act="login-submit"]')
        pg2.wait_for_timeout(2500)
        go(pg2, 'children', 700)
        unlock_parent(pg2)
        pg2.wait_for_timeout(500)
        has_btn = pg2.query_selector('[data-act="show-grade-edit"]') is not None
        if has_btn:
            pg2.click('[data-act="show-grade-edit"]')
            pg2.wait_for_timeout(500)
        toast = pg2.evaluate("document.querySelector('#toast')?.textContent||''")
        check('N7 a tab without the write lease cannot open the grade editor', pg2.query_selector('#wq33-grade-editor') is None and ('另一分頁' in toast or '編輯權' in toast or '另一個分頁' in toast), toast)
        cid2 = user_db(pg2)['children'][0]['id']
        pg2.evaluate("""(cid)=>{const s=document.createElement('select');s.id='wq33-grade-select';s.innerHTML='<option value="6" selected>6</option>';document.body.append(s);
          const b=document.createElement('button');b.id='forged';b.dataset.act='save-child-grade';b.dataset.id=cid;b.textContent='x';document.body.append(b);document.querySelector('#forged').click();}""", cid2)
        pg2.wait_for_timeout(600)
        check('N7 a forged save in a read-only tab does not change the grade', grades(pg2) == g_before, (g_before, grades(pg2)))
        b.close()

        # ---- E. existing accounts are not touched --------------------------------------------------
        b, ctx, pg, errs = new_page(p, 390, 844, touch=True)
        accept_dialogs(pg)
        base_url = BASE_APP.as_uri()
        pg.goto(base_url)
        pg.wait_for_timeout(900)
        go(pg, 'login', 500)
        pg.fill('#register-name', 'oldfam')
        pg.fill('#register-child', '舊生')
        pg.fill('#register-pin', PW)
        pg.click('[data-act="register-submit"]')
        pg.wait_for_timeout(2500)
        go(pg, 'children')
        unlock_parent(pg)
        pg.click('[data-act="show-add-child"]')
        pg.wait_for_timeout(300)
        pg.fill('#new-child-name', '舊妹')
        pg.select_option('#new-child-grade', '5')
        pg.click('[data-act="add-child"]')
        pg.wait_for_timeout(900)
        before_grades = grades(pg)
        pg.goto(URL)
        pg.wait_for_timeout(1500)
        check('N7 existing account (created by R3.2) keeps its children and grades', before_grades == [3, 5] and grades(pg) == [3, 5], (before_grades, grades(pg)))
        check('N7 existing account stays logged in on the new build', pg.evaluate("WQ30.snapshot().owner").startswith('u_'))
        logout(pg)
        go(pg, 'login', 500)
        pg.fill('#login-name', 'oldfam')
        pg.fill('#login-pin', PW)
        pg.click('[data-act="login-submit"]')
        pg.wait_for_timeout(2500)
        check('N7 existing account logs in without picking a grade', pg.evaluate('location.hash') == '#kid' and grades(pg) == [3, 5], (pg.evaluate('location.hash'), grades(pg)))
        b.close()

        # ---- F. guests stay on demoDb grade 3 ----------------------------------------------------
        b, ctx, pg, errs = new_page(p, 390, 844, touch=True)
        pg.add_init_script(SPEECH_COUNTER)
        pg.goto(URL)
        pg.wait_for_timeout(1000)
        check('N7 guest home uses grade 3 pace', hero_count(pg) == pace(pg, 3), (hero_count(pg), pace(pg, 3)))
        check('N7 guest maths profile is 小3', open_math(pg).endswith('小3'))
        math_close(pg)
        accept_dialogs(pg)
        reg(pg, 1)
        logout(pg)
        go(pg, 'kid')
        check('N7 after registering 小一 and logging out, guest is still grade 3', hero_count(pg) == pace(pg, 3), (hero_count(pg), pace(pg, 3)))
        b.close()


# ============================================================================================= N6
CORE_JS = """()=>{
 const L=WQ30Core,lib=WQ30Library,out={};
 const unit=[...lib.units.values()].find(u=>L.allowed(lib,u.id).includes('tiles')).id;
 const base=(mode,sid)=>L.plan(lib,{uid:unit,mode,count:2,childId:'c1',now:1000,sessionId:sid||'s1'});
 const wrap=(c,s)=>{c.sessions=[s];return {version:1,children:{c1:c}};};
 const ok=(fn)=>{try{fn();return 'ok';}catch(e){return String(e.message);}};
 const validate=(c,s)=>ok(()=>L.validateState(wrap(c,s),[{id:'c1'}],lib));
 out.hasAbandon=typeof L.abandon==='function';
 // 1. tiles selected, no answer yet
 {const c=L.child(),s=base('tiles');s.tiles=[0];out.tilesBefore=validate(c,JSON.parse(JSON.stringify(s)));
  if(out.hasAbandon){L.abandon(s,2000);out.tilesAfter=validate(c,s);out.tilesCleared=s.tiles.length===0&&s.status==='abandoned'&&s.index===s.queue.length&&s.finishedAt===2000&&s.award===0&&s.awarded===true&&s.feedback===null;}}
 // 2. tiles question answered, feedback visible
 {const c=L.child(),s=base('tiles');s.tiles=[0,1];L.record(c,s,lib,'xx',{now:1500});out.fbBefore=validate(c,JSON.parse(JSON.stringify(s)));
  if(out.hasAbandon){L.abandon(s,2000);out.fbAfter=validate(c,s);out.fbKeepsAttempt=c.attempts.length===1;}}
 // 3. spell session with a draft, and clocks that run backwards
 {const c=L.child(),s=base('spell');s.draft='abc';if(out.hasAbandon){L.abandon(s,2000);out.spellAfter=validate(c,s);}}
 {const c=L.child(),s=base('lesson');if(out.hasAbandon){L.abandon(s,500);out.skewFinished=s.finishedAt;out.skewAfter=validate(c,s);}}
 // 4. abandon refuses sessions that are not running
 if(out.hasAbandon){const s=base('spell');L.abandon(s,2000);out.twice=ok(()=>L.abandon(s,3000));
  const d=base('spell');d.status='completed';d.finishedAt=1500;out.completed=ok(()=>L.abandon(d,3000));
  out.garbage=ok(()=>L.abandon(null,3000));}
 // 5. validateState stays strict
 {const c=L.child(),s=base('tiles');s.tiles=[0];s.index=s.queue.length;s.finishedAt=2000;s.status='abandoned';out.strictLeftoverTiles=validate(c,s);}
 {const c=L.child(),s=base('tiles');s.tiles=[99];out.strictOutOfRange=validate(c,s);}
 {const c=L.child(),s=base('tiles');s.tiles=[0,0];out.strictDuplicate=validate(c,s);}
 {const c=L.child(),s=base('spell');s.tiles=[0];out.strictWrongMode=validate(c,s);}
 {const c=L.child(),s=base('spell');s.status='abandoned';out.strictNoFinish=validate(c,s);}
 {const c=L.child(),s=base('spell');s.status='bogus';s.finishedAt=3000;out.strictStatus=validate(c,s);}
 {const c=L.child(),s=base('spell');s.status='abandoned';s.finishedAt=500;s.index=s.queue.length;out.strictTime=validate(c,s);}
 {const c=L.child(),s=base('spell');s.status='abandoned';s.finishedAt=2000;s.index=0;out.strictIndex=validate(c,s);}
 {const c=L.child(),s=base('spell');s.queue[0].answer='hacked';out.strictAnswer=validate(c,s);}
 return out;}"""


def abandon_state(pg):
    return pg.evaluate("""()=>{const s=WQ30.snapshot();const ss=s.state.sessions;return {n:ss.length,status:ss.length?ss[ss.length-1].status:null,
      attempts:s.state.attempts.length,dirty:s.dirty,error:s.error,hash:location.hash}}""")


def start_mode(pg, unit, mode):
    route = f'unit?id={unit}' + ('' if mode == 'lesson' else f'&mode={mode}')
    go(pg, route, 600)
    pg.locator(f'[data-l30="start"][data-mode="{mode}"]').first.click()
    pg.wait_for_timeout(700)


def drive(pg, state):
    """Bring the running question into 'partial' (something chosen/typed) or 'feedback' state."""
    q = pg.evaluate("(()=>{const s=WQ30.snapshot().state.sessions.filter(x=>x.status==='active')[0];return s?s.queue[s.index]:null})()")
    if not q:
        return None
    mode = q['mode']
    if mode == 'tiles':
        loc = pg.locator('[data-l30="tile"]:not([disabled])')
        for _ in range(1 if state == 'partial' else 12):
            if not loc.count():
                break
            loc.first.click()  # the list re-renders after every click, so always take the first enabled tile
            pg.wait_for_timeout(200)
    elif q.get('choices'):
        pg.locator('[data-l30="choose"][data-index="0"]').click()
        pg.wait_for_timeout(250)
    elif mode != 'study':
        pg.fill('#l30-answer', 'zz')
        pg.wait_for_timeout(300)
        # Blur first: tapping a button straight out of a focused text field re-renders the page between
        # pointerdown and click on the R3.2 build (the N1 layout bug, p10), which would hide what is tested here.
        pg.evaluate("document.activeElement&&document.activeElement.blur&&document.activeElement.blur()")
        pg.wait_for_timeout(500)
    if state == 'feedback':
        if mode in ('listenSpell', 'listenChoice'):
            pg.locator('[data-l30="technical"]').click()
        else:
            pg.locator('[data-l30="submit"]').click()
        pg.wait_for_timeout(700)
    return mode


def force_close(pg):
    """After a failed abandon (baseline) get the session out of the way so the next case starts clean."""
    for _ in range(3):
        if abandon_state(pg)['status'] != 'active':
            return
        for sel in ('[data-l30="next"]', '[data-l30="clear-tiles"]'):
            loc = pg.locator(sel)
            if loc.count() and loc.first.is_enabled():
                loc.first.click()
                pg.wait_for_timeout(500)
        pg.evaluate("(()=>{const m=document.querySelector('.p20-more');if(m)m.open=true;})()")  # R3.5: give-up now lives in the top-right menu
        pg.locator('[data-l30="abandon"]').first.click()
        pg.wait_for_timeout(700)


def n6():
    with sync_playwright() as p:
        b, ctx, pg, errs = new_page(p, 390, 844, touch=True)
        accept_dialogs(pg)
        reg(pg, 3)
        unit = pg.evaluate("[...WQ30Library.units.values()].find(u=>WQ30Core.allowed(WQ30Library,u.id).includes('tiles')).id")
        # ---- A. the reported flow: tiles selected, press 結束這組，不領獎 --------------------------
        start_mode(pg, unit, 'tiles')
        pg.locator('[data-l30="tile"]').first.click()
        pg.wait_for_timeout(500)
        before = pg.evaluate("WQ30.snapshot().state.sessions.filter(x=>x.status==='active')[0].tiles.length")
        pg.evaluate("(()=>{const m=document.querySelector('.p20-more');if(m)m.open=true;})()")  # R3.5: give-up now lives in the top-right menu
        pg.locator('[data-l30="abandon"]').first.click()
        pg.wait_for_timeout(1000)
        st = abandon_state(pg)
        check('N6 tiles selected -> 結束這組 succeeds (session abandoned)', before == 1 and st['status'] == 'abandoned', st)
        check('N6 no unsaved state left (l30Dirty cleared, no error)', st['dirty'] is False and st['error'] == '', st)
        check('N6 returns to the child home', st['hash'] == '#kid', st)
        go(pg, 'kid')
        go(pg, 'learning')  # leave and come back so the page is rendered afresh from the current state
        txt = pg.inner_text('#app')
        check('N6 no 尚未保存 / 字塊範圍 text remains', '尚未保存' not in txt and '字塊範圍' not in txt)
        force_close(pg)
        # ---- B. answer given (feedback visible, tiles still selected) ------------------------------
        start_mode(pg, unit, 'tiles')
        drive(pg, 'feedback')
        tiles_kept = pg.evaluate("WQ30.snapshot().state.sessions.filter(x=>x.status==='active')[0]?.tiles.length")
        fb_visible = pg.query_selector('.l30-feedback') is not None
        pg.evaluate("(()=>{const m=document.querySelector('.p20-more');if(m)m.open=true;})()")  # R3.5: give-up now lives in the top-right menu
        pg.locator('[data-l30="abandon"]').first.click()
        pg.wait_for_timeout(1000)
        st = abandon_state(pg)
        check('N6 answered tiles question (feedback shown) -> 結束這組 succeeds', fb_visible and st['status'] == 'abandoned' and st['dirty'] is False and st['error'] == '', (tiles_kept, st))
        check('N6 the answered question stays recorded after abandoning', st['attempts'] >= 1, st)
        force_close(pg)
        # ---- C. the app is usable afterwards -----------------------------------------------------
        start_mode(pg, unit, 'tiles')
        pg.locator('[data-l30="tile"]').first.click()
        pg.wait_for_timeout(500)
        s2 = pg.evaluate("(()=>{const s=WQ30.snapshot().state.sessions.filter(x=>x.status==='active')[0];return s?{tiles:s.tiles.length}:null})()")
        check('N6 a new tiles group can be started and used after abandoning', s2 is not None and s2['tiles'] == 1 and not abandon_state(pg)['dirty'], s2)
        pg.evaluate("(()=>{const m=document.querySelector('.p20-more');if(m)m.open=true;})()")  # R3.5: give-up now lives in the top-right menu
        pg.locator('[data-l30="abandon"]').first.click()
        pg.wait_for_timeout(800)
        force_close(pg)
        # ---- D. every play mode x (partial, feedback) ----------------------------------------------
        modes = pg.evaluate("Object.keys(WQ30Core.MODES)") + ['lesson']
        for mode in modes:
            u = pg.evaluate(f"([...WQ30Library.units.values()].find(u=>'{mode}'==='lesson'||WQ30Core.allowed(WQ30Library,u.id).includes('{mode}'))||{{}}).id")
            for state in ('partial', 'feedback'):
                if mode == 'study' and state == 'feedback':
                    # a study step advances by itself and never shows feedback: finish the whole step instead
                    pass
                if not u:
                    check(f'N6 mode {mode} / {state}: no unit offers this mode', False)
                    continue
                start_mode(pg, u, mode)
                m = drive(pg, state)
                pg.evaluate("(()=>{const m=document.querySelector('.p20-more');if(m)m.open=true;})()")  # R3.5: give-up now lives in the top-right menu
                pg.locator('[data-l30="abandon"]').first.click()
                pg.wait_for_timeout(900)
                st = abandon_state(pg)
                ok = st['status'] == 'abandoned' and st['dirty'] is False and st['error'] == ''
                check(f'N6 abandon mode={mode} state={state} (first question {m})', ok, st if not ok else '')
                if not ok:
                    force_close(pg)
        check('N6 page errors during the flows', not errs, errs[:2])
        # ---- E. core contract ---------------------------------------------------------------------
        r = pg.evaluate(CORE_JS)
        check('N6 core exports WQ30Core.abandon', r.get('hasAbandon') is True, r)
        check('N6 core: abandon() with tiles selected yields a state validateState accepts', r.get('tilesAfter') == 'ok' and r.get('tilesCleared') is True, r.get('tilesAfter'))
        check('N6 core: the pre-fix state (tiles left on an abandoned session) is still rejected', '字塊超出範圍' in str(r.get('strictLeftoverTiles')), r.get('strictLeftoverTiles'))
        check('N6 core: abandon() after an answered tiles question validates and keeps the attempt', r.get('fbAfter') == 'ok' and r.get('fbKeepsAttempt') is True, r.get('fbAfter'))
        check('N6 core: abandon() on a spell session with a draft validates', r.get('spellAfter') == 'ok', r.get('spellAfter'))
        check('N6 core: a clock before startedAt never produces time-going-backwards', r.get('skewAfter') == 'ok' and r.get('skewFinished') == 1000, (r.get('skewFinished'), r.get('skewAfter')))
        check('N6 core: abandon() refuses an already finished / completed / invalid session',
              all(r.get(k) not in (None, 'ok') for k in ('twice', 'completed', 'garbage')), (r.get('twice'), r.get('completed'), r.get('garbage')))
        for key, label, needle in (('strictOutOfRange', 'tile index outside the word', '字塊超出範圍'), ('strictDuplicate', 'duplicate tile', '字塊重複了'),
                                   ('strictWrongMode', 'tiles on a non-tiles question', '字塊超出範圍'), ('strictNoFinish', 'abandoned without finishedAt', '完成狀態前後不一致'),
                                   ('strictStatus', 'unknown status', '練習狀態有誤'), ('strictTime', 'finishedAt before startedAt', '時間紀錄不對'),
                                   ('strictIndex', 'finished session at the wrong index', '完成位置不對'), ('strictAnswer', 'tampered question answer', '題目答案被改動過')):
            check(f'N6 validateState still rejects: {label}', needle in str(r.get(key)), r.get(key))
        b.close()


# ============================================================================================= N8
LEAK = re.compile(r'Admin|1234|admin-test|測試區|管理員測試', re.I)
PUBLIC_ROUTES = ['login', 'kid', 'admin', 'learning-help', 'learning', 'game', 'practice', 'parent', 'settings', 'classroom', 'library', 'credits', 'offline']
# Visible markup only: scripts/styles removed and inline data: URIs (base64 pictures) dropped, since those can contain "1234" by chance.
PAGE_TEXT_JS = """()=>{const c=document.body.cloneNode(true);c.querySelectorAll('script,style,template').forEach(e=>e.remove());return c.innerHTML.replace(/data:[^"'\\s)]*/g,'');}"""


def scan_routes(pg, label):
    leaks = {}
    for route in PUBLIC_ROUTES:
        go(pg, route, 450)
        unlock_parent(pg)
        html = pg.evaluate(PAGE_TEXT_JS)
        found = sorted(set(m.group(0).lower() for m in LEAK.finditer(html)))
        if found:
            leaks[route] = found
    check(f'N8 {label}: no Admin / 1234 / admin-test / 測試區 text or link on {len(PUBLIC_ROUTES)} routes', not leaks, leaks)


def sandbox_state(pg):
    return pg.evaluate("""()=>({test:WQ29.testMode,allowed:WQ29.localTestAllowed,info:typeof window.__WQ_ADMIN_INFO__!=='undefined',
      banner:!!document.querySelector('#wq29-test-banner'),host:location.hostname,proto:location.protocol})""")


class Server:
    """A throw-away static server on loopback; only the process started here is ever stopped."""

    def __init__(self, bind, directory):
        self.ok = False
        self.proc = None
        try:
            s = socket.socket(socket.AF_INET6 if ':' in bind else socket.AF_INET)
            s.bind((bind, 0))
            self.port = s.getsockname()[1]
            s.close()
        except OSError:  # e.g. no IPv6 in this sandbox
            return
        self.proc = subprocess.Popen([sys.executable, '-m', 'http.server', str(self.port), '--bind', bind, '--directory', str(directory)],
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        probe = socket.AF_INET6 if ':' in bind else socket.AF_INET
        for _ in range(60):
            try:
                t = socket.socket(probe)
                t.settimeout(0.3)
                t.connect((bind, self.port))
                t.close()
                self.ok = True
                break
            except OSError:
                time.sleep(0.1)

    def stop(self):
        if not self.proc:
            return
        self.proc.terminate()
        try:
            self.proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.proc.kill()


def serve_fake_host(ctx, scheme_host):
    body = APP.read_bytes()

    def handler(route):
        url = route.request.url
        if url.split('?')[0].split('#')[0].endswith('/app/index.html'):
            route.fulfill(status=200, body=body, content_type='text/html; charset=utf-8')
        else:
            route.fulfill(status=404, body='')
    ctx.route(re.compile(r'^https?://'), handler)


def n8():
    with sync_playwright() as p:
        # ---- A. what a public visitor sees ---------------------------------------------------------
        b, ctx, pg, errs = new_page(p, 390, 844, touch=True)
        pg.goto(URL)
        pg.wait_for_timeout(1000)
        scan_routes(pg, 'guest')
        go(pg, 'login', 500)
        check('N8 login page has no sandbox link element', pg.query_selector('a[data-wq29-mode]') is None and pg.query_selector('#l30-test-entry') is None and pg.query_selector('.wq29-credentials') is None)
        # typing Admin / 1234 gives a neutral message only
        pg.fill('#login-name', 'Admin')
        pg.fill('#login-pin', '1234')
        pg.click('[data-act="login-submit"]')
        pg.wait_for_timeout(800)
        dlg = pg.evaluate("document.querySelector('#l30-dialog')?.innerHTML||''")
        toast = pg.evaluate("document.querySelector('#toast')?.textContent||''")
        check('N8 logging in as Admin gives a neutral reply (no credentials, no sandbox link)',
              not LEAK.search(dlg + toast) and 'data-wq29-mode' not in dlg and pg.evaluate('location.hash') != '#admin', (dlg[:120], toast))
        check('N8 public page on file:// without the parameter has no sandbox state', not sandbox_state(pg)['test'] and not sandbox_state(pg)['info'] and not sandbox_state(pg)['banner'], sandbox_state(pg))
        b.close()
        b, ctx, pg, errs = new_page(p, 390, 844, touch=True)
        accept_dialogs(pg)
        reg(pg, 3)
        scan_routes(pg, 'signed-in family')
        b.close()
        b, ctx, pg, errs = new_page(p, 1280, 800)
        pg.goto(URL)
        pg.wait_for_timeout(1000)
        scan_routes(pg, 'guest on a 1280px desktop')
        b.close()

        # ---- B. sandbox still works locally ----------------------------------------------------------
        b, ctx, pg, errs = new_page(p, 390, 844)
        pg.goto(URL + '?mode=admin-test')
        pg.wait_for_timeout(1200)
        s = sandbox_state(pg)
        check('N8 file:// + ?mode=admin-test still enters the sandbox', s['test'] is True and s['allowed'] is True and s['info'] is True and s['banner'] is True, s)
        go(pg, 'login', 500)
        pg.fill('#login-name', 'Admin')
        pg.fill('#login-pin', '1234')
        pg.click('[data-act="login-submit"]')
        pg.wait_for_timeout(2500)
        check('N8 sandbox Admin login works on file://', pg.evaluate("WQ29.adminActive()") is True)
        b.close()

        for bind, host in (('127.0.0.1', '127.0.0.1'), ('127.0.0.1', 'localhost'), ('::1', '[::1]')):
            srv = Server(bind, APP.parent)
            try:
                if not srv.ok:
                    print(f'SKIP N8 {host}: cannot bind {bind} here', flush=True)
                    continue
                b, ctx, pg, errs = new_page(p, 390, 844)
                base = f'http://{host}:{srv.port}/{APP.name}'
                pg.goto(base + '?mode=admin-test')
                pg.wait_for_timeout(1500)
                s = sandbox_state(pg)
                check(f'N8 http://{host} + ?mode=admin-test enters the sandbox', s['test'] is True and s['info'] is True and s['banner'] is True and s['host'] in (host, host.strip('[]')), s)
                if host == '127.0.0.1':
                    go(pg, 'login', 500)
                    pg.fill('#login-name', 'Admin')
                    pg.fill('#login-pin', '1234')
                    pg.click('[data-act="login-submit"]')
                    pg.wait_for_timeout(2500)
                    check('N8 sandbox Admin login works on http://127.0.0.1', pg.evaluate("WQ29.adminActive()") is True)
                pg.goto(base)
                pg.wait_for_timeout(1000)
                s = sandbox_state(pg)
                check(f'N8 http://{host} without the parameter is a normal page', not s['test'] and not s['info'] and not s['banner'], s)
                b.close()
            finally:
                srv.stop()

        # loopback names through request interception (also covers [::1] where the sandbox has no IPv6, and https://localhost)
        for origin in ('http://[::1]:8081', 'https://localhost', 'http://localhost:3000', 'http://127.0.0.1:8080'):
            b, ctx, pg, errs = new_page(p, 390, 844)
            serve_fake_host(ctx, origin)
            pg.goto(origin + '/app/index.html?mode=admin-test#login')
            pg.wait_for_timeout(1500)
            s = sandbox_state(pg)
            check(f'N8 {origin} + ?mode=admin-test enters the sandbox (loopback allowed)', s['test'] is True and s['info'] is True and s['banner'] is True, s)
            b.close()

        # ---- C. public host names never enter the sandbox ------------------------------------------
        fake_hosts = ['http://wordquest.example', 'https://wordquest.example', 'http://127.0.0.1.wordquest.example', 'http://localhost.wordquest.example',
                      'http://sub.localhost.example', 'http://192.168.1.20:8080', 'http://10.0.0.5', 'https://www.example.org']
        for origin in fake_hosts:
            b, ctx, pg, errs = new_page(p, 390, 844)
            serve_fake_host(ctx, origin)
            pg.goto(origin + '/app/index.html?mode=admin-test#login')
            pg.wait_for_timeout(1500)
            s = sandbox_state(pg)
            html = pg.evaluate(PAGE_TEXT_JS)
            host_ok = s['host'] == origin.split('//')[1].split(':')[0].split('/')[0]
            check(f'N8 {origin} + ?mode=admin-test is NOT the sandbox (no banner, no info, localTestAllowed false)',
                  host_ok and s['test'] is False and s['allowed'] is False and s['info'] is False and s['banner'] is False, s)
            go(pg, 'kid', 700)
            check(f'N8 {origin} shows the normal guest home', pg.query_selector('.l30-hero') is not None and not LEAK.search(pg.evaluate(PAGE_TEXT_JS)),
                  LEAK.findall(pg.evaluate(PAGE_TEXT_JS)))
            b.close()


# ============================================================================================= N13a
def n13a():
    with sync_playwright() as p:
        b, ctx, pg, errs = new_page(p, 390, 844, touch=True)
        accept_dialogs(pg)
        pg.goto(URL)
        pg.wait_for_timeout(1000)
        # ---- guest copy ----------------------------------------------------------------------------
        home = pg.inner_text('#app')
        check('N13a guest home no longer says 可以先參觀', '可以先參觀' not in home and '練習需要先登入' in home, repr(home[:60]))
        check('N13a guest home explains practising needs a login', pg.query_selector('#wq33-guest-note') is not None and '登入' in pg.inner_text('#wq33-guest-note'))
        go(pg, 'login', 500)
        check('N13a login page no longer says guests can do questions', '訪客都可以做問題' not in pg.inner_text('#app') and '先登入' in pg.inner_text('.auth-note'))
        go(pg, 'settings', 600)
        check('N13a settings page for guests says practising needs a login', '訪客可以做題' not in pg.inner_text('#app') and '練習要先登入' in pg.inner_text('#app'))
        go(pg, 'practice', 500)  # R3.5: the practice cards live on the practice page, not on the child home
        pg.locator('.l30-card[data-l30="entry"]').first.click()
        pg.wait_for_timeout(700)
        check('N13a copy matches behaviour: a practice card sends guests to the login page', pg.evaluate('location.hash') == '#login', pg.evaluate('location.hash'))
        # ---- guest demo scope ------------------------------------------------------------------------
        go(pg, 'offline', 700)
        t = pg.inner_text('#app')
        i = t.find('water')
        near = t[i:i + 40] if i >= 0 else ''
        check('N13a guest demo range shows water with 水 (not 未填中文意思)', i >= 0 and '水' in near and '未填中文意思' not in near, repr(near))
        # ---- a new account --------------------------------------------------------------------------
        reg(pg, 3)
        d = user_db(pg)
        words = d['words']
        empties = [w['en'] for w in words if not w.get('zh') or not w.get('example')]
        check('N13a new account: every demo word has a Chinese meaning and an example', len(words) == 12 and not empties, empties)
        water = next((w for w in words if w['en'] == 'water'), {})
        check('N13a water = 水 with an example sentence containing water', '水' in water.get('zh', '') and 'water' in water.get('example', '').lower(), water.get('zh'))
        check('N13a the logged-in home carries no guest note', pg.query_selector('#wq33-guest-note') is None)
        go(pg, 'offline', 700)
        unlock_parent(pg)
        t = pg.inner_text('#app')
        i = t.find('water')
        near = t[i:i + 40] if i >= 0 else ''
        check('N13a offline materials list shows water with 水', i >= 0 and '水' in near and '未填中文意思' not in near, repr(near))
        go(pg, 'report', 700)
        unlock_parent(pg)
        t = pg.inner_text('#app')
        check('N13a report page lists water with its meaning (no bare 未確認)', re.search(r'water\s+水', t) is not None, re.findall(r'water[^\n]*\n[^\n]*', t)[:1])
        logout(pg)
        go(pg, 'offline', 700)
        t = pg.inner_text('#app')
        i = t.find('water')
        near = t[i:i + 40] if i >= 0 else ''
        check('N13a after logout the guest demo range still has 水 for water', i >= 0 and '水' in near, repr(near))
        b.close()


# ----------------------------------------------------------------------------------------------- main
if __name__ == '__main__':
    want = [a.lower() for a in sys.argv[1:]] or ['n7', 'n6', 'n8', 'n13a']
    print(f'# p50 tests against {APP}', flush=True)
    t0 = time.time()
    for name, fn in (('n7', n7), ('n6', n6), ('n8', n8), ('n13a', n13a)):
        if name in want:
            print(f'# --- {name.upper()} ---', flush=True)
            section(fn)
    print(f'SUMMARY: {PASS} passed, {FAIL} failed, {PASS + FAIL} checks in {time.time() - t0:.0f}s', flush=True)
    sys.exit(1 if FAIL else 0)

"""R3.31 t63 - English star feedback wording, retest rules and the one extra try on a typed answer.

Batch 1  E3 hinted-right wording, E8 hint button, E9 first-letter hint, E4/E7 no 字塊 / 串 in visible text
Batch 2  新1 typed question is re-tested as a typed question, 新2 a wrong re-test costs no heart, E5 four ending messages, E6 re-test result marks
Batch 3  E1 first wrong typed answer gets a second try, 新3 case reminder then right = full mark, E10 spelling classroom (see t63b / the end of this file)

    WQ33_APP=<app/index.html> python3 r37_tests/t63_r331_feedback.py
"""
import json
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import lib37 as L  # noqa: E402
from lib37 import ev, sync_playwright, open_page  # noqa: E402
from lib37 import wq33  # noqa: E402

C = L.Checker('t63 r331 feedback')
SHOTS = Path(os.environ.get('T63_SHOTS', str(HERE.parent / '_team_runs' / 'r331' / 'shots')))
SHOTS.mkdir(parents=True, exist_ok=True)

CUR = """(()=>{const P=r37P;if(!P)return null;const q=P.qs[P.i];
 return {ph:P.phase,i:P.i,n:P.qs.length,fb:P.fb?{ok:P.fb.ok,part:!!P.fb.part,hint:!!P.fb.hint,lock:P.fb.lock||0}:null,hearts:P.hearts,correct:P.correct,
  nudge:P.nudge?{why:P.nudge.why,msg:P.nudge.msg}:null,
  q:q&&{mode:q.mode,kind:q.kind,answer:q.answer,options:q.options,word:q.word,warm:!!q.warm,retest:!!q.retest,hint:q.hint,nudged:q.nudged||'',tried:q.tried||0}}})()"""
ADD = """((ws,title)=>{const c=activeChild(),r={id:uid('r'),childId:c.id,title,dictationDate:'',createdAt:new Date().toISOString()};db.ranges.push(r);
 for(const [en,zh] of ws)db.words.push({id:uid('w'),childId:c.id,rangeId:r.id,en,zh,kind:kindOf(en),example:'',emoji:'',createdAt:new Date().toISOString(),studySeen:0,reviewLevel:0,reviewDue:null,lastSeen:null});
 c.activeRangeId=r.id;save();return r.id;})(%s,%s)"""
INJECT = """((en,zh,kind)=>{const P=r37P,D=R37_DIFF[P.diff-1];const q=r37EnBuild({en,zh,pos:'',sc:en.length,img:'',ex:'',fi:[],fl:''},kind,{D,rng:r37Rng(1),near:r37EnPool(),unit:[],ck:0});
 delete q.ck;P.qs[P.i]=q;P.phase='quiz';P.fb=null;P.nudge=null;P.hintShown=false;render();return {forms:q.forms,accept:q.accept}})(%s,%s,%s)"""


def cur(pg):
    return ev(pg, CUR)


def inject(pg, en, zh, kind='fill'):
    return ev(pg, INJECT % (json.dumps(en), json.dumps(zh, ensure_ascii=False), json.dumps(kind)))


def reset(pg):
    ev(pg, "(()=>{const k=r37Key();delete r37Mem[k];try{localStorage.removeItem(k)}catch(_){};r37P=null;db.attempts.length=0;r37Mem._seed=5;r37Mem._w=null})()")


def start(pg, track='english', w=0, s=0, seed=5):
    ev(pg, f"r37Mem._seed={seed}")
    ev(pg, f"r37StartLevel('{track}',{w},{s})")
    pg.wait_for_timeout(350)
    return cur(pg)


def go_quiz(pg):
    s = cur(pg)
    while s and s['ph'] in ('learn', 'example'):
        pg.click('[data-r37="learn-go"]')
        pg.wait_for_timeout(200)
        s = cur(pg)
    return s


def type_in(pg, text):
    pg.evaluate("(v)=>{document.querySelector('#r37-in').value=v}", text)
    pg.click('.r37-ok')
    pg.wait_for_timeout(250)


def advance(pg):
    s = cur(pg)
    if s and s['fb']:
        ev(pg, "(()=>{if(r37P.fb)r37P.fb.lock=0;})()")
        pg.evaluate("()=>{const b=document.querySelector('.r37-next');if(b){b.disabled=false;b.click();}}")
        pg.wait_for_timeout(200)


def text_of(pg, sel):
    return pg.evaluate("(s)=>document.querySelector(s)?.textContent||''", sel)


def wrong_final(pg):
    """answer the current question wrongly until a verdict is on screen (a typed question may give one more try first)"""
    for _ in range(3):
        s = cur(pg)
        if s['fb']:
            return
        q = s['q']
        if q['mode'] == 'mcq':
            opt = next(o for o in q['options'] if o != q['answer'])
            pg.evaluate("(v)=>[...document.querySelectorAll('.r37-opt')].find(b=>b.dataset.v===v).click()", opt)
            pg.wait_for_timeout(250)
        else:
            type_in(pg, 'zzzq')


def right(pg):
    s = cur(pg)
    q = s['q']
    if q['mode'] == 'mcq':
        pg.evaluate("(v)=>[...document.querySelectorAll('.r37-opt')].find(b=>b.dataset.v===v).click()", q['answer'])
        pg.wait_for_timeout(250)
    else:
        type_in(pg, q['answer'])


def play_to_retest(pg, hint=False):
    """first question wrong, then right answers until the re-test of it is on screen"""
    go_quiz(pg)
    wrong_final(pg)
    advance(pg)
    for _ in range(14):
        s = cur(pg)
        if s['ph'] == 'result' or (s['q'] and s['q']['retest']):
            break
        if s['ph'] in ('learn', 'example'):
            pg.click('[data-r37="learn-go"]')
            pg.wait_for_timeout(200)
            continue
        right(pg)
        advance(pg)
    return cur(pg)


def finish_right(pg):
    for _ in range(20):
        s = cur(pg)
        if not s or s['ph'] == 'result':
            break
        if s['ph'] in ('learn', 'example'):
            pg.click('[data-r37="learn-go"]')
            pg.wait_for_timeout(200)
            continue
        right(pg)
        advance(pg)


# ---------------------------------------------------------------- static text: E4 / E7 (built page)
html = Path(wq33.APP).read_text(encoding='utf8')
C.ok('字塊' not in html, 'E4 no 字塊 left in the built page')
bad = sorted({html[max(0, m.start() - 10):m.end() + 10].replace('\n', ' ') for m in re.finditer(r'串(?=[字對錯法寫出])|自己串|再串', html)})
C.ok(not bad, f'E7 no 串字／串對／串錯／自己串 left {bad[:4]}')
C.ok('剛看過後答對' not in html and '看了提示才答對' in html, 'E7 status name is 看了提示才答對')
C.ok('隔一天再自己拼對一次，這個字就學會了！' in html and '看了提示才答對，下次試試不看提示。' in html, 'E7 help sentences')
C.ok('收起字母組合，自己拼字' in html or '自己拼字' in html, 'E4/E7 workshop button texts')

with sync_playwright() as p:
    b, ctx, pg, errs = open_page(p, 375, 667, True)
    L.register(pg, 't63user', '小明')
    pg.wait_for_function('typeof window.__r37==="function"', timeout=30000)
    ev(pg, 'r37Mem._seed=5')

    # ================================================================ E3 / E8 / E9 hint wording
    reset(pg)
    start(pg)
    go_quiz(pg)
    ev(pg, ADD % (json.dumps([['cat', '貓'], ['Monday', '星期一']], ensure_ascii=False), '"t63"'))
    inject(pg, 'cat', '貓')
    hb = pg.evaluate("(()=>{const b=document.querySelector('[data-r37=\"hint\"]');return b?{t:b.textContent.trim(),a:b.getAttribute('aria-label')}:null})()")
    C.ok(hb and hb['t'].endswith('看提示') and hb['a'] == '看提示', f'E8 hint button says 看提示 (text and aria-label) {hb}')
    pg.click('[data-r37="hint"]')
    pg.wait_for_timeout(200)
    C.ok(text_of(pg, '.r37-hint') == '提示：第一個字母是 c，一共 3 個字母。', f'E9 cat -> {text_of(pg, ".r37-hint")}')
    type_in(pg, 'cat')
    s = cur(pg)
    t = text_of(pg, '.r37-fb')
    C.ok(s['fb'] and s['fb']['ok'] and s['fb']['hint'] and '答對了！這次有提示幫忙，稍後再試試自己答。' in t and '半分' not in t, f'E3 hinted right feedback: {t}')
    C.ok(s['correct'] == 0.5, f'E3 scoring unchanged (half): {s["correct"]}')
    advance(pg)
    inject(pg, 'Monday', '星期一')
    pg.click('[data-r37="hint"]')
    pg.wait_for_timeout(150)
    C.ok(text_of(pg, '.r37-hint') == '提示：第一個字母是 M，一共 6 個字母。', f'E9 Monday keeps the capital: {text_of(pg, ".r37-hint")}')
    inject(pg, 'cat', '貓', 'zh2en')
    C.ok(cur(pg)['q']['hint'] == '提示：第一個字母是 c，一共 3 個字母。', f'E9 choice question uses the same sentence {cur(pg)["q"]["hint"]}')

    # ================================================================ 新1 typed question is re-tested as a typed question
    reset(pg)
    start(pg)
    go_quiz(pg)
    kinds = {}
    for k in ('fill', 'fill-listen', 'zh2en', 'en2zh', 'listen'):
        inject(pg, 'cat', '貓', k if k in ('fill', 'fill-listen') else k)
        JS = "(()=>{const P=r37P;P.log=P.log||[];P.log.push({});const q=P.qs[P.i];const r=r37Retest(P,q);return JSON.stringify(r?{k:r.kind,m:r.mode}:null)})()"
        kinds[k] = sorted({json.loads(ev(pg, JS))['k'] for _ in range(6)})
    C.ok(kinds['fill'] == ['fill-listen'], f'新1 fill -> fill-listen {kinds["fill"]}')
    C.ok(kinds['fill-listen'] == ['fill'], f'新1 fill-listen -> fill {kinds["fill-listen"]}')
    C.ok(set(kinds['zh2en']) <= {'fill', 'fill-listen'} and set(kinds['en2zh']) <= {'fill', 'fill-listen'}, f'新1 choice question still re-tested as typed {kinds["zh2en"]} {kinds["en2zh"]}')

    # ================================================================ 新2 wrong re-test: no heart, no shield
    reset(pg)
    start(pg)
    go_quiz(pg)
    inject(pg, 'cat', '貓')
    ev(pg, "(()=>{const q=r37P.qs[r37P.i];q.retest=true;q.origKey=r37QKey(q);r37P.shield=true;render();})()")
    h0 = cur(pg)['hearts']
    type_in(pg, 'zzzq')
    s = cur(pg)
    shield = ev(pg, 'r37P.shield')
    C.ok(s['fb'] and not s['fb']['ok'] and s['hearts'] == h0 and shield is True, f'新2 wrong re-test: hearts {h0} -> {s["hearts"]}, shield kept {shield}')
    ev(pg, "(()=>{r37P.fb=null;const q=r37P.qs[r37P.i];q.retest=false;q.tried=9;q.nudged='x';render();})()")
    type_in(pg, 'zzzq')
    s = cur(pg)
    C.ok(s['fb'] and not s['fb']['ok'] and s['hearts'] == h0 - 1 or ev(pg, 'r37P.shield') is False, 'control: a wrong first-time answer still costs the shield or a heart')

    # ================================================================ E5 four ending messages
    reset(pg)
    start(pg)
    go_quiz(pg)

    def nudge_for(ans, zh, typed):
        inject(pg, ans, zh)
        type_in(pg, typed)
        s = cur(pg)
        return (s['nudge'] or {}).get('msg', ''), s

    m, s = nudge_for('cat', '貓', 'cats')
    C.ok(m == '字母差一點點。看看字尾，是不是多了 s？', f'E5 cats for cat: {m}')
    C.ok(s['fb'] is None, 'E5 the reminder gives no verdict yet')
    m, s = nudge_for('cats', '貓（複數）', 'cat')
    C.ok(m == '字母差一點點。看看字尾，是不是少了 s？', f'E5 cat for cats: {m}')
    m, s = nudge_for('played', '玩（過去式）', 'play')
    C.ok(m == '字母差一點點。看看字尾，是不是要加 ed？', f'E5 play for played: {m}')
    m, s = nudge_for('tooth', '牙齒（單顆）', 'teeth')
    C.ok(m == '字母差一點點。看看字尾，再試一次。', f'E5 teeth for tooth: {m}')
    m, s = nudge_for('box', '盒', 'boxes')
    C.ok(m == '字母差一點點。看看字尾，是不是多了 s？', f'E5 boxes for box (es): {m}')
    pg.screenshot(path=str(SHOTS / 'nudge_phone.png'))

    # ================================================================ E6 result page marks
    def retest_run(use_hint):
        reset(pg)
        start(pg, seed=9)
        s = play_to_retest(pg)
        ok0 = bool(s['q'] and s['q']['retest'])
        if ok0:
            if use_hint:
                pg.click('[data-r37="hint"]')
                pg.wait_for_timeout(150)
            right(pg)
            advance(pg)
        finish_right(pg)
        pg.wait_for_timeout(300)
        return ok0, text_of(pg, '.r37-miss'), pg.evaluate("document.querySelectorAll('.r37-miss .r37-mk').length")

    ok0, tx, n = retest_run(False)
    C.ok(ok0, 'E6 the wrong word came back as a re-test')
    C.ok('補考答對了' in tx and '這次答錯 1 題，補考後答對 1 題' in tx, f'E6 re-test right: {tx[:80]}')
    pg.screenshot(path=str(SHOTS / 'result_fixed_phone.png'))
    ok0, tx, n = retest_run(True)
    C.ok(ok0 and '補考答對了' not in tx and n == 0 and '這次答錯 1 題' in tx and '補考後答對' not in tx, f'E6 hinted re-test right: no tick, no text, heading N only: {tx[:80]}')

    # ================================================================ E1 first wrong typed answer: one more try
    SPY = "(()=>{globalThis.__sp=[];r37Speak=(t)=>{__sp.push(t)};})()"
    ev(pg, SPY)
    for kind in ('fill', 'fill-listen'):
        reset(pg)
        start(pg)
        go_quiz(pg)
        ev(pg, ADD % (json.dumps([['cat', '貓']], ensure_ascii=False), '"t63b"'))
        inject(pg, 'cat', '貓', kind)
        ev(pg, SPY)
        h0, n0, w0 = cur(pg)['hearts'], ev(pg, 'db.attempts.length'), ev(pg, 'r37Get().wrong.length')
        nq0 = ev(pg, 'r37P.qs.length')
        type_in(pg, 'dog')
        s = cur(pg)
        body = pg.evaluate("document.querySelector('.r37-play').innerText")
        C.ok(s['fb'] is None and s['nudge'] and s['nudge']['msg'] == '再試一次。第一個字母是 c。', f'E1 {kind}: first wrong -> {s["nudge"]}')
        C.ok(s['hearts'] == h0 and ev(pg, 'db.attempts.length') == n0 and ev(pg, 'r37Get().wrong.length') == w0 and ev(pg, 'r37P.qs.length') == nq0,
             f'E1 {kind}: no heart, no attempt, no wrong-word entry, no re-test queued')
        C.ok(not re.search(r'\bcat\b', body, re.I) and '正確答案' not in body, f'E1 {kind}: the answer is not on screen')
        if kind == 'fill-listen':
            C.ok(ev(pg, 'globalThis.__sp.length') >= 1 and ev(pg, 'globalThis.__sp.at(-1)') == 'cat', 'E1 listening: the word is read out again')
        else:
            C.ok(ev(pg, 'globalThis.__sp.length') == 0, f'E1 Chinese prompt: the word is NOT read out (would give the answer away) {ev(pg, "globalThis.__sp")}')
        C.ok(pg.evaluate("document.querySelector('#r37-in').value===''"), 'E1 the box is cleared')
        pg.screenshot(path=str(SHOTS / f'e1_first_wrong_{kind}_phone.png'))
        type_in(pg, 'dog')
        s = cur(pg)
        t2 = text_of(pg, '.r37-fb')
        C.ok(s['fb'] and not s['fb']['ok'] and '正確答案是 cat' in t2 and s['hearts'] == h0 - 1, f'E1 {kind}: second wrong -> verdict, one heart: {t2[:40]} hearts {s["hearts"]}')
        C.ok(ev(pg, 'r37P.qs.length') == nq0 + 1 and ev(pg, 'r37Get().wrong.length') == w0 + 1, 'E1 second wrong: re-test queued and word noted')
        if kind == 'fill':
            pg.screenshot(path=str(SHOTS / 'e1_second_wrong_phone.png'))
    # second try right
    reset(pg)
    start(pg)
    go_quiz(pg)
    ev(pg, ADD % (json.dumps([['cat', '貓']], ensure_ascii=False), '"t63c"'))
    inject(pg, 'cat', '貓')
    h0, nq0 = cur(pg)['hearts'], ev(pg, 'r37P.qs.length')
    type_in(pg, 'dog')
    type_in(pg, 'cat')
    s = cur(pg)
    play = pg.evaluate("document.querySelector('.r37-play').innerText")
    a = json.loads(ev(pg, "JSON.stringify(db.attempts.at(-1))"))
    C.ok(s['fb'] and s['fb']['ok'] and '答對了！第二次就拼對了。' in play and '提示' not in play, f'E1 second right: wording, no 提示 on screen: {play[:60]!r}')
    C.ok(s['correct'] == 0.5 and s['hearts'] == h0 and ev(pg, 'r37P.qs.length') == nq0, f'E1 second right: half mark {s["correct"]}, no heart, no re-test')
    C.ok(a['correct'] is True and a['assisted'] is True and ev(pg, 'db.attempts.length') == 1, f'E1 second right: one attempt, recorded as assisted {a["assisted"]}')
    pg.screenshot(path=str(SHOTS / 'e1_second_right_phone.png'))
    # a question that already had the spelling reminder gets no extra try
    reset(pg)
    start(pg)
    go_quiz(pg)
    inject(pg, 'cat', '貓')
    type_in(pg, 'cats')
    type_in(pg, 'dog')
    s = cur(pg)
    C.ok(s['fb'] and not s['fb']['ok'] and s['q']['nudged'] == 'inflect', 'E1 after the reminder a wrong answer is the verdict at once')
    # the extreme difficulty uses it as well
    reset(pg)
    start(pg)
    go_quiz(pg)
    inject(pg, 'cat', '貓')
    ev(pg, 'r37P.diff=5')
    type_in(pg, 'dog')
    C.ok(cur(pg)['fb'] is None and cur(pg)['nudge']['why'] == 'again', 'E1 difficulty 5 (極速) gets the extra try too')

    # ================================================================ 新3 case reminder, then right = full mark
    reset(pg)
    start(pg)
    go_quiz(pg)
    ev(pg, ADD % (json.dumps([['Monday', '星期一']], ensure_ascii=False), '"t63d"'))
    inject(pg, 'Monday', '星期一')
    type_in(pg, 'monday')
    s = cur(pg)
    C.ok(s['fb'] is None and s['nudge'] and s['nudge']['why'] == 'case', f'新3 reminder first: {s["nudge"]}')
    type_in(pg, 'Monday')
    s = cur(pg)
    a = json.loads(ev(pg, "JSON.stringify(db.attempts.at(-1))"))
    C.ok(s['fb'] and s['fb']['ok'] and not s['fb']['part'] and s['correct'] == 1, f'新3 full mark after the reminder ({s["correct"]})')
    C.ok(a['correct'] is True and a['assisted'] is True, f'新3 still recorded as assisted {a["assisted"]}')

    # ================================================================ E10 spelling classroom (l30)
    reset(pg)
    ev(pg, "l30Start('U03','spell')")
    pg.wait_for_timeout(600)
    ok_page = pg.query_selector('#l30-answer') is not None
    C.ok(ok_page, 'E10 a typed spelling question is on screen')
    if ok_page:
        for _ in range(12):  # skip non-typed steps if the plan starts with one
            if pg.query_selector('#l30-answer'):
                break
            pg.click('[data-l30="submit"]')
            pg.wait_for_timeout(300)
        ev(pg, "(()=>{globalThis.__spk=[];const o=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=(u)=>{__spk.push(u.text);};})()")
        word = ev(pg, "LIB30.words.get(l30Session().queue[l30Session().index].target).form")
        first = word[0]
        mode = ev(pg, "l30Session().queue[l30Session().index].mode")
        n0 = ev(pg, 'l30State().sessions.at(-1)?l30Read().attempts.length:0')
        pg.evaluate("(v)=>{const i=document.querySelector('#l30-answer');i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}))}", 'zzqq')
        if mode == 'listenSpell':
            ev(pg, "(()=>{const s=l30Session();s.audioHeard=true;})()")
        pg.click('[data-l30="submit"]')
        pg.wait_for_timeout(500)
        note = text_of(pg, '.l30-note')
        C.ok(pg.query_selector('.l30-feedback') is None and pg.evaluate("!document.querySelector('#l30-answer').disabled"), 'E10 first wrong: no verdict, box still open')
        C.ok(note == f'再試一次。第一個字母是 {first}。', f'E10 first wrong message: {note!r}')
        C.ok(pg.evaluate("document.querySelector('#l30-answer').value===''") and ev(pg, 'l30Read().attempts.length') == n0, 'E10 box cleared, nothing recorded yet')
        if mode == 'listenSpell':
            C.ok(ev(pg, 'globalThis.__spk.length') >= 1 and ev(pg, 'globalThis.__spk[0]') == word, 'E10 listenSpell: the word is read again')
        else:
            C.ok(ev(pg, 'globalThis.__spk.length') == 0, 'E10 spell: the word is NOT read (would give the answer away)')
        pg.screenshot(path=str(SHOTS / 'e10_first_wrong_phone.png'))
        pg.evaluate("(v)=>{const i=document.querySelector('#l30-answer');i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}))}", 'zzqq')
        pg.click('[data-l30="submit"]')
        pg.wait_for_timeout(500)
        fbt = text_of(pg, '.l30-feedback')
        C.ok(f'正確答案是 {word}' in fbt and pg.evaluate("document.querySelector('#l30-answer').disabled"), f'E10 second wrong: {fbt[:40]!r}, box locked')
        pg.screenshot(path=str(SHOTS / 'e10_second_wrong_phone.png'))
        # second try right is recorded as assisted
        ev(pg, "l30Start('U03','spell')")
        pg.wait_for_timeout(600)
        for _ in range(12):
            if pg.query_selector('#l30-answer'):
                break
            pg.click('[data-l30="submit"]')
            pg.wait_for_timeout(300)
        word = ev(pg, "LIB30.words.get(l30Session().queue[l30Session().index].target).form")
        mode = ev(pg, "l30Session().queue[l30Session().index].mode")
        if mode == 'listenSpell':
            ev(pg, "(()=>{const s=l30Session();s.audioHeard=true;})()")
        for v in ('zzqq', word):
            pg.evaluate("(v)=>{const i=document.querySelector('#l30-answer');i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}))}", v)
            pg.click('[data-l30="submit"]')
            pg.wait_for_timeout(500)
        a = json.loads(ev(pg, "JSON.stringify(l30Read().attempts.at(-1))"))
        C.ok(a['correct'] is True and a['assisted'] is True and a['independent'] is False, f'E10 second try right: correct but assisted, not independent {a["assisted"]} {a["independent"]}')

    C.ok(not [e for e in errs if 'favicon' not in e], f'no page errors {errs[:2]}')
    b.close()

C.done()

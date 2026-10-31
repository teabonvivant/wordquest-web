"""R3.18 t24 - learning loop: wrong answers are kept (attempts / miss list), result page lists them, redo only the missed,
in-level retest in another form, pass = every word's last answer right, warm-up of old wrong words, maths form hint,
example card, 看課堂 deep link, synonyms / apostrophe / capital-letter feedback, difficulty per subject.

    WQ33_APP=<app/index.html> python3 r37_tests/t24_learning_loop.py        (T24_SHOTS=<dir> for the screenshots)
"""
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import lib37 as L  # noqa: E402
from lib37 import ev, go, sync_playwright, open_page, URL  # noqa: E402

C = L.Checker('t24 learning loop')
SHOTS = Path(os.environ.get('T24_SHOTS', str(HERE.parent / 'r37_evidence' / 't24')))
SHOTS.mkdir(parents=True, exist_ok=True)

CUR = """(()=>{const P=r37P;if(!P)return null;const q=P.qs[P.i];
 return {ph:P.phase,i:P.i,n:P.qs.length,fb:P.fb?{ok:P.fb.ok,part:!!P.fb.part,syn:P.fb.syn||'',lock:P.fb.lock||0}:null,hearts:P.hearts,redo:!!P.redo,nWarm:P.nWarm||0,
  q:q&&{mode:q.mode,kind:q.kind,answer:q.answer,options:q.options,word:q.word,warm:!!q.warm,retest:!!q.retest,skill:q.mq&&q.mq.skill,form:q.mq&&q.mq.form,prompt:q.prompt,accept:q.accept}}})()"""
ADD = """((ws,title)=>{const c=activeChild(),r={id:uid('r'),childId:c.id,title,dictationDate:'',createdAt:new Date().toISOString()};db.ranges.push(r);
 for(const [en,zh] of ws)db.words.push({id:uid('w'),childId:c.id,rangeId:r.id,en,zh,kind:kindOf(en),example:'',emoji:'',createdAt:new Date().toISOString(),studySeen:0,reviewLevel:0,reviewDue:null,lastSeen:null});
 c.activeRangeId=r.id;save();return r.id;})(%s,%s)"""


def cur(pg):
    return ev(pg, CUR)


def reset(pg):
    ev(pg, "(()=>{const k=r37Key();delete r37Mem[k];try{localStorage.removeItem(k)}catch(_){};r37P=null;db.attempts.length=0;r37Mem._seed=5;r37Mem._w=null})()")


def start(pg, track, w, s, seed=5):
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


def answer(pg, right=True, value=None):
    s = cur(pg)
    q = s['q']
    if q['mode'] == 'mcq':
        opt = q['answer'] if right else next(o for o in q['options'] if o != q['answer'])
        pg.evaluate("(v)=>[...document.querySelectorAll('.r37-opt')].find(b=>b.dataset.v===v).click()", opt)
    else:
        # R3.31: #r37-in is a read-only tile-pad field - set its value directly and press 確定 (pg.fill refuses a read-only input)
        pg.evaluate("(v)=>{document.querySelector('#r37-in').value=v}", value if value is not None else (q['answer'] if right else 'zzzq'))
        pg.click('.r37-ok')
    pg.wait_for_timeout(250)


def advance(pg):
    """Leave the feedback bar (the wrong-answer lock is lifted the quick way; the real 1.5 s lock is tested separately)."""
    s = cur(pg)
    if s and s['fb']:
        ev(pg, "(()=>{if(r37P.fb)r37P.fb.lock=0;})()")
        pg.evaluate("()=>{const b=document.querySelector('.r37-next');if(b){b.disabled=false;b.click();}}")
        pg.wait_for_timeout(200)


def play_out(pg, wrong_idx=(), wrong_retest=False, max_steps=40):
    """Answer every remaining question right, except first-pass question positions in wrong_idx (counted by non-retest, non-warm order)."""
    k = 0
    for _ in range(max_steps):
        s = cur(pg)
        if not s or s['ph'] == 'result':
            return s
        if s['ph'] in ('learn', 'example'):
            pg.click('[data-r37="learn-go"]')
            pg.wait_for_timeout(200)
            continue
        q = s['q']
        if q['warm']:
            answer(pg, True)
        elif q['retest']:
            answer(pg, not wrong_retest)
        else:
            answer(pg, k not in wrong_idx)
            k += 1
        advance(pg)
    return cur(pg)


def result(pg):
    return ev(pg, "JSON.stringify({r:r37P.result,miss:document.querySelectorAll('.r37-miss li').length,redo:!!document.querySelector('[data-r37=\"redo-miss\"]'),"
                  "lesson:[...document.querySelectorAll('.r37-lesson')].map(b=>b.dataset.code),fixed:document.querySelectorAll('.r37-miss .r37-mk').length})")


with sync_playwright() as p:
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    L.register(pg, 't24user', '小明')
    pg.wait_for_function('typeof window.__r37==="function"', timeout=30000)
    ev(pg, 'r37Mem._seed=5')

    # ---------------------------------------------------------------- English: wrong answer is kept, retest, result card, redo
    reset(pg)
    s = start(pg, 'english', 0, 0)
    C.ok(s['ph'] == 'learn' and s['nWarm'] == 0, 'a fresh child has no warm-up; the learn page opens first')
    s = go_quiz(pg)
    first = s['q']
    ev(pg, ADD % (json.dumps([[first['word'], '測試']], ensure_ascii=False), '"闖關測試"'))
    n0 = ev(pg, 'db.attempts.length')
    answer(pg, False)
    s = cur(pg)
    C.ok(ev(pg, 'db.attempts.length') == n0 + 1, 'a wrong level answer adds one attempt to db.attempts')
    a = json.loads(ev(pg, "JSON.stringify(db.attempts.at(-1))"))
    C.ok(a['correct'] is False and a['origin'] == '闖關' and a['expected'] == first['answer'], f'attempt is recorded as 闖關, wrong, expected={first["answer"]}')
    C.ok(s['fb'] and not s['fb']['ok'], 'wrong answer shows feedback')
    nxt_disabled = pg.evaluate("document.querySelector('.r37-next')?.disabled===true")
    C.ok(nxt_disabled, 'wrong-answer ▶ is locked for 1.5 s so the correct answer stays on screen')
    txt = pg.evaluate("document.querySelector('.r37-fb')?.textContent||''")
    C.ok(first['answer'] in txt and ('你選了' in txt or '你寫' in txt), f'feedback shows the answer and what was picked/typed: {txt[:60]}')
    pg.screenshot(path=str(SHOTS / 'en_wrong_feedback_phone.png'))
    pg.wait_for_timeout(1700)
    C.ok(pg.evaluate("document.querySelector('.r37-next')?.disabled===false"), '▶ unlocks after 1.5 s')
    ev(pg, "r37Next()")
    pg.wait_for_timeout(200)
    st = json.loads(ev(pg, "JSON.stringify({n:r37P.qs.length,i:r37P.i,rt:r37P.qs.map((q,i)=>q.retest?i:-1).filter(i=>i>=0),w:r37P.qs.filter(q=>q.retest).map(q=>q.word),k:r37P.qs.filter(q=>q.retest).map(q=>q.mode)})"))
    C.ok(st['rt'] == [4] and st['w'] == [first['word']], f'the missed word returns as a retest 3 questions later (index {st["rt"]})')
    C.ok(st['k'] and st['k'][0] != first['mode'], f'retest uses another question type ({first["mode"]} -> {st["k"]})')
    w_list = ev(pg, "r37Get().wrong.map(x=>x.en)")
    C.ok(first['word'] in w_list, 'the word is stored in the wrong-word list for the next warm-up')

    # run A: retest wrong too -> not passed although the first-pass rate is high enough
    s = play_out(pg, wrong_retest=True)
    r = json.loads(result(pg))
    C.ok(s['ph'] == 'result', 'level reaches the result page')
    C.ok(r['r']['passed'] is False and r['r']['why'] == 'retest', f'pass needs every word right last: 7/8 first pass but retest wrong -> not passed ({r["r"]["why"]})')
    C.ok(r['miss'] == 1 and r['redo'] and r['fixed'] == 0, 'result page: 這次答錯 card with the missed word and 只重做錯的')
    pg.screenshot(path=str(SHOTS / 'en_result_missed_phone.png'))
    C.ok(L.fits(pg, '.r37-miss,.r37-redo,.r37-sec'), 'missed card and buttons fit the 390x844 screen')
    C.ok(not ev(pg, "!!r37Get().lv['english:0:0'].passed"), 'a failed level is not marked passed')
    # redo only the missed
    pg.click('[data-r37="redo-miss"]')
    pg.wait_for_timeout(400)
    s = cur(pg)
    ws = ev(pg, "r37P.qs.map(q=>q.word)")
    C.ok(s['redo'] and ws == [first['word']], f'只重做錯的 asks only the missed word {ws}')
    s = go_quiz(pg)
    answer(pg, True)
    advance(pg)
    pg.wait_for_timeout(300)
    r = json.loads(result(pg))
    C.ok(r['r']['passed'] is True and r['r']['total'] == 1, 'redo of the missed word passes')
    C.ok(ev(pg, "!r37Get().lv['english:0:0'].passed"), 'a redo never writes level progress')

    # warm-up: the old wrong word comes back first, once a day per world
    ev(pg, "r37P=null")
    s = start(pg, 'english', 0, 1)
    C.ok(s['nWarm'] >= 1 and s['ph'] == 'quiz' and s['q']['warm'], f'warm-up of {s["nWarm"]} old wrong word(s) before the next level of the same world')
    C.ok(first['word'] in ev(pg, "r37P.qs.filter(q=>q.warm).map(q=>q.word)"), 'the warm-up contains the word missed before')
    C.ok('熱身' in ev(pg, "r37P.warmTitle") and pg.evaluate("!!document.querySelector('.r37-ptitle')"), 'warm-up is titled 熱身')
    answer(pg, True)
    C.ok(first['word'] not in ev(pg, "r37Get().wrong.map(x=>x.en)"), 'a warm-up answer right clears the word from the wrong list')
    advance(pg)
    s = cur(pg)
    C.ok(s['ph'] == 'learn', 'after the warm-up the normal learn page follows')
    ev(pg, "r37P=null")
    s = start(pg, 'english', 0, 2)
    C.ok(s['nWarm'] == 0, 'no second warm-up in the same world on the same day')
    ev(pg, "r37Get().wrong.push({en:'dog',zh:'狗',w:3,s:0,at:1,n:1});r37P=null")
    s = start(pg, 'english', 1, 0)
    C.ok(s['nWarm'] == 0, 'wrong words of another world do not appear in this world')

    # run B: retest right -> passed, with ✓ in the card; stars follow the first-pass rate
    reset(pg)
    start(pg, 'english', 0, 0, seed=9)
    go_quiz(pg)
    answer(pg, False)
    ev(pg, "r37P.fb.lock=0")
    s = play_out(pg)
    r = json.loads(result(pg))
    C.ok(r['r']['passed'] is True and r['fixed'] == 1 and r['miss'] == 1, 'retest right -> level passed, card marks the word ✓')
    C.ok(r['r']['stars'] <= 3 and r['r']['correct'] == 7 and r['r']['total'] == 8, f'stars/score use the first-pass rate: {r["r"]["correct"]}/{r["r"]["total"]} -> {r["r"]["stars"]}★')

    # ---------------------------------------------------------------- judging: apostrophe, capitals, spaces, synonyms
    J = lambda q, v: json.loads(ev(pg, f"JSON.stringify(r37Judge({json.dumps(q)},{json.dumps(v, ensure_ascii=False)}))"))
    qa = {'mode': 'fill', 'answer': "don't", 'accept': ["don't"], 'cs': False}
    C.ok(J(qa, 'don’t')['ok'] and J(qa, 'don‘t')['ok'], 'curly apostrophes ’ ‘ are accepted for don\'t')
    qc = {'mode': 'fill', 'answer': 'Friday', 'accept': ['Friday'], 'cs': True}
    j = J(qc, 'friday')
    C.ok(not j['ok'] and j['why'] == 'case' and '大小寫' in j['msg'], f'U59: right letters, wrong capital -> 字對了，留意大小寫 ({j})')
    C.ok(J(qc, 'Friday')['ok'], 'Friday with the capital is right')
    qs_ = {'mode': 'fill', 'answer': 'ice cream', 'accept': ['ice cream'], 'cs': False}
    j = J(qs_, 'icecream')
    C.ok(not j['ok'] and j['why'] == 'space' and '空格' in j['msg'], 'missing space -> 字對了，注意空格／連字號')
    C.ok(J({'mode': 'fill', 'answer': 'Hong Kong', 'cs': True, 'accept': ['Hong Kong']}, 'hong kong')['why'] == 'case', 'Hong Kong in lower case -> capital hint')
    syn = json.loads(ev(pg, "JSON.stringify(r37Syns('high','高的'))"))
    C.ok('tall' in syn, f'high / tall share 高的 ({syn})')
    qh = json.loads(ev(pg, "(()=>{const wd=r37Lookup(3,6,'high')||r37EnPool().find(x=>x.en==='high')||{en:'high',zh:'高的'};return JSON.stringify(r37EnBuild(wd,'fill',{D:R37_DIFF[2],rng:r37Rng(1),near:r37EnPool(),unit:[],ck:0}))})()"))
    C.ok(qh['answer'] == 'high' and 'tall' in qh['accept'] and J(qh, 'tall')['ok'] and J(qh, 'tall')['syn'] == 'tall', 'fill question for high accepts the synonym tall and flags it')
    # in the UI: synonym answer is right and says so; capital typo gets a nudge, no heart lost, half credit on the retry
    reset(pg)
    start(pg, 'english', 0, 0)
    go_quiz(pg)
    ev(pg, f"(()=>{{r37P.qs[0]={json.dumps(qh)};r37P.qs[0].ck=0;r37P.i=0;r37P.fb=null;render();}})()")
    pg.wait_for_timeout(300)
    answer(pg, value='tall')
    s = cur(pg)
    txt = pg.evaluate("document.querySelector('.r37-fb')?.textContent||''")
    C.ok(s['fb']['ok'] and s['fb']['syn'] == 'tall' and '也對' in txt and 'high' in txt, f'synonym answer is right with a note: {txt[:70]}')
    qcap = {'mode': 'fill', 'kind': 'fill', 'prompt': '星期五', 'answer': 'Friday', 'accept': ['Friday'], 'cs': True, 'word': 'Friday', 'zhOf': '星期五', 'audio': 'Friday', 'explain': '星期五 = Friday', 'len': 6, 'ck': 0}
    ev(pg, f"(()=>{{clearTimeout(r37Timer);r37P.qs[0]={json.dumps(qcap)};r37P.i=0;r37P.fb=null;r37P.phase='quiz';render();}})()")
    pg.wait_for_timeout(300)
    h0 = cur(pg)['hearts']
    answer(pg, value='friday')
    s = cur(pg)
    C.ok(s['fb'] is None and pg.evaluate("!!document.querySelector('.r37-nudge')") and '大小寫' in pg.evaluate("document.querySelector('.r37-nudge').textContent"), 'capital typo shows the nudge, no feedback bar yet')
    C.ok(s['hearts'] == h0, 'the nudge costs no heart')
    answer(pg, value='Friday')
    s = cur(pg)
    C.ok(s['fb']['ok'] and not s['fb']['part'], 'R3.31: the corrected answer after the case reminder is a full mark (still recorded as assisted)')
    ev(pg, "clearTimeout(r37Timer)")

    # ---------------------------------------------------------------- maths: form hint, example card, lesson link
    ev(pg, "r37P=null")
    reset(pg)
    found = json.loads(ev(pg, """JSON.stringify((()=>{for(let w=0;w<6;w++)for(let s=0;s<10;s++)for(let seed=1;seed<40;seed++){const qs=WQ37Math.make('math',w,s,8,3,seed);
        const i=qs.findIndex(q=>q.mode==='fill'&&q.form==='dec'&&/\\d+\\/\\d+/.test(q.q));if(i>=0)return {w,s,seed,i,q:qs[i].q,a:qs[i].answer};}return null;})())"""))
    C.ok(found is not None, f'a 「化成小數」 fill question exists {found}')
    ev(pg, "r37Get().seen.math={}")
    # mark every skill seen so the example card does not get in the way here
    ev(pg, "(()=>{const o=r37Get();o.seen.math=o.seen.math||{};for(const sk of Object.keys(WQ37Math.lessons))o.seen.math[sk]=1;o.seen.math['frac-dec']=1;})()")
    start(pg, 'math', found['w'], found['s'], seed=found['seed'])
    s = go_quiz(pg)
    # the question list may be shuffled by the engine; jump straight to the 「化成小數」 question
    ev(pg, f"(()=>{{const k=r37P.qs.findIndex(q=>q.mq&&q.mq.form==='dec'&&q.mode==='fill');r37P.i=k;r37P.fb=null;render();}})()")
    pg.wait_for_timeout(300)
    s = cur(pg)
    import re
    m = re.search(r'(\d+)/(\d+)', s['q']['prompt'])
    h0 = s['hearts']
    answer(pg, value=f"{m.group(1)}/{m.group(2)}")
    s = cur(pg)
    nud = pg.evaluate("document.querySelector('.r37-nudge')?.textContent||''")
    C.ok(s['fb'] is None and '數值對了' in nud, f'3/4 for a 化成小數 question: 數值對了 hint ({nud})')
    C.ok(s['hearts'] == h0, 'the form hint costs no heart')
    pg.screenshot(path=str(SHOTS / 'math_form_hint_phone.png'))
    answer(pg, True)
    s = cur(pg)
    C.ok(s['fb'] and s['fb']['ok'], 'after the hint the child can answer again and gets it right')
    ev(pg, "clearTimeout(r37Timer);r37P=null")

    # example card: once per skill, skippable
    reset(pg)
    s = start(pg, 'math', 0, 0)
    C.ok(s['ph'] == 'example', 'first level of a fresh child opens with a worked-example card')
    ex = pg.evaluate("document.querySelector('.r37-excard')?.textContent||''")
    C.ok('答案' in ex and len(ex) > 20, f'example card shows a question, the answer and the method: {ex[:50]}')
    C.ok(L.fits(pg, '.r37-excard,.r37-go,.r37-sec2'), 'example card fits the phone screen')
    pg.screenshot(path=str(SHOTS / 'example_card_phone.png'))
    pg.click('.r37-sec2')
    pg.wait_for_timeout(250)
    s = cur(pg)
    C.ok(s['ph'] == 'quiz', '略過 goes straight to the questions')
    sk = s['q']['skill']
    C.ok(ev(pg, f"!!r37Get().seen.math['{sk}']"), 'the skill is remembered as seen')
    ev(pg, "r37P=null")
    s = start(pg, 'math', 0, 0)
    C.ok(s['ph'] == 'quiz', 'the same skill does not show its example card again')

    # lesson link: fail a times-table level (world 3 stage 1 is all 九九 -> 2N3)
    reset(pg)
    ev(pg, "(()=>{const o=r37Get();o.seen.math=o.seen.math||{};for(const sk of Object.keys(WQ37Math.lessons))o.seen.math[sk]=1;})()")
    start(pg, 'math', 2, 0)
    for _ in range(40):
        s = cur(pg)
        if s['ph'] == 'result':
            break
        if s['ph'] != 'quiz':
            pg.click('[data-r37="learn-go"]')
            continue
        answer(pg, False, value='99999' if s['q']['mode'] == 'fill' else None)
        advance(pg)
    r = json.loads(result(pg))
    C.ok(r['r']['passed'] is False and r['miss'] >= 1, 'a failed maths level lists the missed questions')
    C.ok(r['lesson'] == ['2N3'], f'看課堂 offered for the times-table chapter {r["lesson"]}')
    C.ok(r['redo'], 'maths result also has 只重做錯的')
    pg.screenshot(path=str(SHOTS / 'math_result_missed_phone.png'))
    pg.click('.r37-lesson')
    pg.wait_for_timeout(900)
    ch = json.loads(ev(pg, "JSON.stringify({v:WQCourseApp.getView(),u:(WQCourseApp.getState().courseM1||{}).learning&&WQCourseApp.getState().courseM1.learning.unit})"))
    C.ok(ch['v'] == 'learn' and ch['u'] == '2N3', f'看課堂 opens chapter 2N3 {ch}')
    ev(pg, "WQCourseApp.close()")
    # miss list for maths is kept (FIFO 60)
    C.ok(0 < ev(pg, "r37Get().miss.length") <= 60, 'maths misses go to r37Get().miss')

    # ---------------------------------------------------------------- difficulty per subject
    ev(pg, "r37P=null;(()=>{const o=r37Get();o.diffs={english:2,math:5,olympiad:1};})()")
    d = json.loads(ev(pg, "JSON.stringify({e:r37DiffN('english'),m:r37DiffN('math'),o:r37DiffN('olympiad'),legacy:r37Get().diff,saved:Object.keys(r37Get()).includes('diff')})"))
    C.ok(d == {'e': 2, 'm': 5, 'o': 1, 'legacy': 2, 'saved': False}, f'difficulty is stored per subject {d}')
    ev(pg, "r37Save();delete r37Mem[r37Key()]")
    C.ok(ev(pg, "JSON.stringify(r37Get().diffs)") == '{"english":2,"math":5,"olympiad":1}', 'per-subject difficulty survives a reload')
    # old single value migrates to all three subjects
    ev(pg, "(()=>{const k=r37Key();localStorage.setItem(k,JSON.stringify({diff:4,lv:{}}));delete r37Mem[k];})()")
    C.ok(ev(pg, "JSON.stringify(r37Get().diffs)") == '{"english":4,"math":4,"olympiad":4}', 'an old single difficulty migrates to every subject')
    n_m = ev(pg, "(()=>{r37Get().diffs.math=1;return r37MathQuestions('math',0,2,r37DiffN('math'),3).length})()")
    n_e = ev(pg, "r37EnQuestions(0,0,r37DiffN('english'),3).length")
    C.ok(n_m == 6 and n_e == 10, f'maths level 1 has 6 questions, English level 4 has 10 ({n_m}, {n_e})')
    # the parent page shows one explanation per subject
    ev(pg, "r37Mem._dsub='math'")
    go(pg, '#p/parent', 500)
    if pg.query_selector('#v23-parent-password'):
        pg.fill('#v23-parent-password', L.wq33.PW if hasattr(L.wq33, 'PW') else '1234')
        pg.click('[data-v23="parent-unlock"]')
        pg.wait_for_timeout(1500)
    pg.click('.r37-ptab[data-k="diff"]'); pg.wait_for_timeout(300)
    txt = pg.evaluate("document.querySelector('.r37-dl')?.textContent||''")
    C.ok('數字大小' in txt, 'parent page explains maths difficulty as number size / steps')
    pg.click('.r37-dsub[data-k="english"]')
    pg.wait_for_timeout(250)
    txt = pg.evaluate("document.querySelector('.r37-dl')?.textContent||''")
    C.ok('選項' in txt and '補考' in txt, 'English tab explains options / hints / retest')
    pg.click('.r37-dsub[data-k="olympiad"]')
    pg.wait_for_timeout(200)
    pg.click('.r37-df[data-n="5"]')
    pg.wait_for_timeout(250)
    d = json.loads(ev(pg, "JSON.stringify(r37Get().diffs)"))
    C.ok(d['olympiad'] == 5 and d['english'] == 4 and d['math'] == 1, f'changing one subject leaves the others alone {d}')

    # ---------------------------------------------------------------- distractors come from the same unit (audit/contrast.py method)
    cm = json.loads(ev(pg, """JSON.stringify((()=>{const res={};for(const diff of [1,3,5]){let tot=0,fam=0;
      for(let w=0;w<6;w++)for(let s=0;s<10;s++){const stage=new Set(r37EnStage(w,s).map(x=>x.en));
       for(let seed=1;seed<=3;seed++)for(const q of r37EnQuestions(w,s,diff,seed)){if(q.mode!=='mcq'||q.kind==='en2zh')continue;
        for(const o of q.options.filter(o=>o!==q.answer)){tot++;if(stage.has(o))fam++;}}}
      res[diff]=+(100*fam/Math.max(1,tot)).toFixed(1);}return res})())"""))
    C.ok(all(v >= 60 for v in cm.values()), f'same-unit distractor share >= 60% at levels 1/3/5: {cm}')
    # the question text of a unit never shows a duplicate option
    dup = ev(pg, "(()=>{for(let w=0;w<8;w++)for(let s=0;s<10;s++)for(const q of r37EnQuestions(w,s,3,2))if(q.mode==='mcq'&&(new Set(q.options).size!==q.options.length||!q.options.includes(q.answer)))return w+':'+s;return ''})()")
    C.ok(dup == '', f'no duplicated or missing options {dup}')

    C.ok(not [e for e in errs if 'favicon' not in e], f'no page errors {errs[:2]}')
    b.close()

C.done()

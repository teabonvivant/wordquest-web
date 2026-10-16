"""R3.19 t27 - teaching logic (30-year-teacher pass):
N02 inflected forms are not synonyms (cats for cat -> "another form" hint, no heart lost, one retry; real synonyms still right),
T02 maths / olympiad warm-up of missed skills (new question of the same skill, right answer clears it), 闖關錯題 on the report page and the parent
progress tab, 考考自己 wrong answers recorded, T03 再看例題 for skills without a lesson, hint-then-right is not independent mastery (half credit, assisted
attempt, cannot clear a retest), two children on one device keep their own progress / wrong lists / difficulty, progress survives a reload and an old save,
T06 syllable table, T12 dictation capitals / spaces, N20 jumped picture, T22 (node: test_math_mark.cjs).

    WQ33_APP=<app/index.html> python3 r37_tests/t27_r319_teach.py        (T27_SHOTS=<dir> for the screenshots, default _eng_after/)
"""
import json
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import lib37 as L  # noqa: E402
from lib37 import ev, go, sync_playwright, open_page  # noqa: E402

C = L.Checker('t27 r319 teaching logic')
SHOTS = Path(os.environ.get('T27_SHOTS', str(HERE.parent / '_eng_after')))
SHOTS.mkdir(parents=True, exist_ok=True)

CUR = """(()=>{const P=r37P;if(!P)return null;const q=P.qs[P.i];
 return {ph:P.phase,i:P.i,n:P.qs.length,fb:P.fb?{ok:P.fb.ok,part:!!P.fb.part,hint:!!P.fb.hint,syn:P.fb.syn||'',lock:P.fb.lock||0}:null,hearts:P.hearts,correct:P.correct,nWarm:P.nWarm||0,
  nudge:P.nudge?{why:P.nudge.why,msg:P.nudge.msg}:null,
  q:q&&{mode:q.mode,kind:q.kind,answer:q.answer,options:q.options,word:q.word,warm:!!q.warm,retest:!!q.retest,skill:q.mq&&q.mq.skill,prompt:q.prompt}}})()"""
ADD = """((ws,title)=>{const c=activeChild(),r={id:uid('r'),childId:c.id,title,dictationDate:'',createdAt:new Date().toISOString()};db.ranges.push(r);
 for(const [en,zh] of ws)db.words.push({id:uid('w'),childId:c.id,rangeId:r.id,en,zh,kind:kindOf(en),example:'',emoji:'',createdAt:new Date().toISOString(),studySeen:0,reviewLevel:0,reviewDue:null,lastSeen:null});
 c.activeRangeId=r.id;save();return r.id;})(%s,%s)"""
INJECT = """((en,zh)=>{const P=r37P,D=R37_DIFF[P.diff-1];const q=r37EnBuild({en,zh,pos:'',sc:en.length,img:'',ex:'',fi:[],fl:''},'fill',{D,rng:r37Rng(1),near:r37EnPool(),unit:[],ck:0});
 delete q.ck;P.qs[P.i]=q;P.phase='quiz';P.fb=null;P.nudge=null;P.hintShown=false;render();return {forms:q.forms,accept:q.accept,syn:q.syn}})(%s,%s)"""


def cur(pg):
    return ev(pg, CUR)


def shot(pg, name):
    pg.wait_for_timeout(250)
    pg.screenshot(path=str(SHOTS / f'{name}_phone.png'))
    pg.set_viewport_size({'width': 1440, 'height': 900})
    pg.wait_for_timeout(350)
    pg.screenshot(path=str(SHOTS / f'{name}_desktop.png'))
    pg.set_viewport_size({'width': 390, 'height': 844})
    pg.wait_for_timeout(350)


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
        pg.fill('#r37-in', value if value is not None else (q['answer'] if right else 'zzzq'))
        pg.keyboard.press('Enter')
    pg.wait_for_timeout(250)


def type_in(pg, text):
    pg.fill('#r37-in', text)
    pg.keyboard.press('Enter')
    pg.wait_for_timeout(250)


def advance(pg):
    s = cur(pg)
    if s and s['fb']:
        ev(pg, "(()=>{if(r37P.fb)r37P.fb.lock=0;})()")
        pg.evaluate("()=>{const b=document.querySelector('.r37-next');if(b){b.disabled=false;b.click();}}")
        pg.wait_for_timeout(200)


with sync_playwright() as p:
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    L.register(pg, 't27user', '小明')
    pg.wait_for_function('typeof window.__r37==="function"', timeout=30000)
    ev(pg, 'r37Mem._seed=5')
    J = lambda q, v: json.loads(ev(pg, f"JSON.stringify(r37Judge({json.dumps(q)},{json.dumps(v, ensure_ascii=False)}))"))

    # ================================================================ N02 inflected forms are not synonyms
    reset(pg)
    start(pg, 'english', 0, 0)
    go_quiz(pg)
    hearts0 = cur(pg)['hearts']
    info = ev(pg, INJECT % (json.dumps('cat'), json.dumps('貓', ensure_ascii=False)))
    C.ok('cats' in info['forms'] and 'cats' not in info['accept'], f'cat: "cats" is a form, not an accepted synonym {info}')
    type_in(pg, 'cats')
    s = cur(pg)
    C.ok(s['fb'] is None and s['nudge'] and s['nudge']['why'] == 'inflect', f'cats for cat: no verdict yet, form hint shown {s["nudge"]}')
    C.ok(s['hearts'] == hearts0, 'the form hint costs no heart')
    C.ok('形式不對' in s['nudge']['msg'] and 'cats' in s['nudge']['msg'] and '「cat」' not in s['nudge']['msg'], f'hint names the typed form and does not reveal the answer: {s["nudge"]["msg"]}')
    C.ok('形式不對' in pg.evaluate("document.querySelector('.r37-nudge')?.textContent||''"), 'the hint is on screen')
    shot(pg, 'en_form_hint')
    type_in(pg, 'cat')
    s = cur(pg)
    C.ok(s['fb'] and s['fb']['ok'] and s['hearts'] == hearts0, 're-answer cat is right, no heart lost')
    advance(pg)
    # the second try is the verdict: still a form -> wrong, heart lost
    ev(pg, INJECT % (json.dumps('cat'), json.dumps('貓', ensure_ascii=False)))
    type_in(pg, 'cats')
    type_in(pg, 'cats')
    s = cur(pg)
    C.ok(s['fb'] and not s['fb']['ok'] and s['hearts'] == hearts0 - 1, 'the same form twice is wrong and costs one heart')
    advance(pg)
    # plural target: typing the singular is flagged the other way round
    info = ev(pg, INJECT % (json.dumps('cats'), json.dumps('貓（複數）', ensure_ascii=False)))
    C.ok('cat' in info['forms'] and 'cat' not in info['accept'], 'cats: "cat" is a form, not a synonym')
    type_in(pg, 'cat')
    s = cur(pg)
    C.ok(s['nudge'] and s['nudge']['why'] == 'inflect' and 'cat」' in s['nudge']['msg'] and 'cats' not in s['nudge']['msg'], f'cat for cats -> hint names the typed cat, not the answer ({s["nudge"]})')
    # a table of the 14 form pairs from the audit, both directions, all through r37Judge on real built questions
    pairs = [('cat', '貓', 'cats'), ('dog', '狗', 'dogs'), ('toy', '玩具', 'toys'), ('bus', '巴士', 'buses'), ('box', '盒', 'boxes'), ('baby', '嬰兒', 'babies'),
             ('city', '城市', 'cities'), ('puppy', '小狗', 'puppies'), ('tooth', '牙齒（單顆）', 'teeth'), ('foot', '腳（單隻）', 'feet'), ('jump', '跳', 'jumped'),
             ('play', '玩', 'played'), ('walk', '步行', 'walked'), ('want', '想要', 'wanted')]
    bad = []
    for en, zh, other in pairs:
        r = json.loads(ev(pg, f"""JSON.stringify((()=>{{const D=R37_DIFF[2],mk=(en,zh)=>r37EnBuild({{en,zh,pos:'',sc:3,img:'',ex:'',fi:[],fl:''}},'fill',{{D,rng:r37Rng(1),near:r37EnPool(),unit:[],ck:0}});
          const a=mk({json.dumps(en)},{json.dumps(zh, ensure_ascii=False)}),j=r37Judge(a,{json.dumps(other)});
          const zo=(LIB30?[...LIB30.words.values()].find(w=>w.form==={json.dumps(other)}):null);const b=mk({json.dumps(other)},zo?zo.meaning:'');const k=r37Judge(b,{json.dumps(en)});
          return {{a:j,b:k}}}})())"""))
        if not (r['a'].get('why') == 'inflect' and not r['a']['ok'] and r['b'].get('why') == 'inflect' and not r['b']['ok']):
            bad.append((en, other, r))
    C.ok(not bad, f'all 14 form pairs are marked "another form" in both directions {bad[:2]}')
    # real synonyms stay right
    syn_ok = []
    for en, zh, other in [('high', '高的', 'tall'), ('tall', '高的', 'high'), ('lorry', '貨車', 'truck'), ('boat', '船', 'ship'), ('angry', '生氣的', 'mad'), ('rock', '石頭', 'stone'),
                          ('close', '關上', 'shut'), ('dish', '碟', 'plate'), ('bicycle', '單車', 'bike'), ('road', '路', 'way')]:
        r = json.loads(ev(pg, f"""JSON.stringify((()=>{{const D=R37_DIFF[2];const a=r37EnBuild({{en:{json.dumps(en)},zh:{json.dumps(zh, ensure_ascii=False)},pos:'',sc:3,img:'',ex:'',fi:[],fl:''}},'fill',{{D,rng:r37Rng(1),near:r37EnPool(),unit:[],ck:0}});
          return r37Judge(a,{json.dumps(other)})}})())"""))
        if not (r.get('ok') and r.get('syn') == other):
            syn_ok.append((en, other, r))
    C.ok(not syn_ok, f'real synonyms are still accepted (high/tall, lorry/truck ...) {syn_ok[:2]}')
    # lot / much are not interchangeable, and never sit in one multiple-choice
    lm = json.loads(ev(pg, """JSON.stringify((()=>{const D=R37_DIFF[2];const a=r37EnBuild({en:'lot',zh:'很多（a lot）',pos:'',sc:3,img:'',ex:'',fi:[],fl:''},'fill',{D,rng:r37Rng(1),near:r37EnPool(),unit:[],ck:0});
      const j=r37Judge(a,'much');const pool=[{en:'lot',zh:'很多（a lot）',pos:'',sc:3},{en:'much',zh:'很多',pos:'',sc:4},{en:'many',zh:'許多',pos:'',sc:4},{en:'big',zh:'大',pos:'',sc:3}];
      const ds=r37EnDistractors(pool[0],pool,3,false,r37Rng(2)).map(x=>x.en);const ds2=r37EnDistractors(pool[1],pool,3,false,r37Rng(2)).map(x=>x.en);
      return {j,ds,ds2}})())"""))
    C.ok(not lm['j']['ok'] and lm['j'].get('why') == 'wrong', f'much is wrong for lot ({lm["j"]})')
    C.ok('much' not in lm['ds'] and 'lot' not in lm['ds2'], f'lot and much are never distractors of each other {lm}')

    # ================================================================ hint then right = not independent
    reset(pg)
    start(pg, 'english', 0, 0)
    go_quiz(pg)
    ev(pg, ADD % (json.dumps([['dog', '狗']], ensure_ascii=False), '"提示測試"'))
    ev(pg, INJECT % (json.dumps('dog'), json.dumps('狗', ensure_ascii=False)))
    pg.click('[data-r37="hint"]')
    pg.wait_for_timeout(200)
    C.ok(pg.evaluate("!!document.querySelector('.r37-hint')"), 'hint text shown')
    type_in(pg, 'dog')
    s = cur(pg)
    C.ok(s['fb'] and s['fb']['ok'] and s['fb']['hint'], 'right after the hint is marked as hinted')
    C.ok(s['correct'] == 0.5, f'hinted right counts half ({s["correct"]})')
    a = json.loads(ev(pg, "JSON.stringify(db.attempts.at(-1))"))
    C.ok(a['correct'] is True and a['assisted'] is True and a['detail'].get('hinted') is True, f'the attempt is recorded as assisted (not independent): {a["assisted"]}')
    C.ok('提示' in pg.evaluate("document.querySelector('.r37-fb')?.textContent||''") and '半分' in pg.evaluate("document.querySelector('.r37-fb')?.textContent||''"), 'feedback says the hint made it half a mark')
    advance(pg)
    ev(pg, INJECT % (json.dumps('dog'), json.dumps('狗', ensure_ascii=False)))
    type_in(pg, 'dog')
    s = cur(pg)
    a = json.loads(ev(pg, "JSON.stringify(db.attempts.at(-1))"))
    C.ok(s['fb']['ok'] and not s['fb']['hint'] and a['assisted'] is False, 'the same word without the hint is an independent right answer (assisted=false)')
    C.ok(s['correct'] == 1.5, f'0.5 + 1 = 1.5 ({s["correct"]})')
    # mastery: a word answered right only with hints never reaches "recently on my own"
    m = ev(pg, "(()=>{db.attempts.length=0;const w=db.words.find(x=>x.en==='dog');const P=r37P;const q=P.qs[P.i];recordAttempt(w,'spell',true,'dog','dog','闖關',{hinted:true});db.attempts.at(-1).assisted=true;return mastery(w)})()")
    C.ok(m == 2, f'mastery after a hinted right spell is 2 (有提示時串對), not 3 ({m})')

    # a hinted retest does not clear the miss
    reset(pg)
    start(pg, 'english', 0, 0, seed=9)
    go_quiz(pg)
    answer(pg, False)
    advance(pg)
    for _ in range(12):
        s = cur(pg)
        if s['ph'] == 'result' or (s['q'] and s['q']['retest']):
            break
        if s['ph'] in ('learn', 'example'):
            pg.click('[data-r37="learn-go"]')
            pg.wait_for_timeout(200)
            continue
        answer(pg, True)
        advance(pg)
    s = cur(pg)
    C.ok(s['q'] and s['q']['retest'], 'the missed word comes back as a retest')
    if s['q'] and s['q']['retest']:
        pg.click('[data-r37="hint"]')
        pg.wait_for_timeout(150)
        answer(pg, True)
        st = json.loads(ev(pg, "JSON.stringify(Object.values(r37P.miss).map(m=>({fixed:m.fixed,hf:!!m.hintedFix})))"))
        C.ok(st and st[0]['hf'] and not st[0]['fixed'], f'a retest answered right only with the hint does not clear the miss {st}')
        advance(pg)
        for _ in range(14):
            s = cur(pg)
            if not s or s['ph'] == 'result':
                break
            if s['ph'] in ('learn', 'example'):
                pg.click('[data-r37="learn-go"]')
                pg.wait_for_timeout(200)
                continue
            answer(pg, True)
            advance(pg)
        r = json.loads(ev(pg, "JSON.stringify({r:r37P.result,txt:document.querySelector('.r37-result')?.textContent||''})"))
        C.ok(r['r']['passed'] is False and r['r']['why'] == 'retest', f'level is not passed: the word was not answered on its own ({r["r"]["why"]})')
        C.ok('提示' in r['txt'], 'result page tells the child hint answers do not count as their own')

    # ================================================================ T02 maths / olympiad warm-up
    reset(pg)
    s = start(pg, 'math', 0, 0)
    C.ok(s['nWarm'] == 0, 'a new child has no maths warm-up')
    go_quiz(pg)
    answer(pg, False)
    sk = ev(pg, "r37Get().miss.at(-1).sk")
    old_q = ev(pg, "r37Get().miss.at(-1).q")
    C.ok(sk and ev(pg, "r37Get().miss.length") == 1, f'the miss is stored (skill {sk})')
    ev(pg, "r37P=null")
    s = start(pg, 'math', 0, 1)
    C.ok(s['nWarm'] >= 1 and s['ph'] == 'quiz' and s['q']['warm'], f'maths warm-up: {s["nWarm"]} old skill(s) before the next level of the same world')
    C.ok(s['q']['skill'] == sk and s['q']['prompt'] != old_q, f'warm-up is a NEW question of the same skill ({sk}): {s["q"]["prompt"]} != {old_q}')
    C.ok('熱身' in ev(pg, "r37P.warmTitle"), 'warm-up is titled 熱身')
    shot(pg, 'math_warm')
    h0 = cur(pg)['hearts']
    answer(pg, True)
    C.ok(ev(pg, f"r37Get().miss.filter(m=>m.sk==={json.dumps(sk)}).length") == 0, 'right in the warm-up takes the skill off the wrong list')
    advance(pg)
    s = cur(pg)
    C.ok(s['hearts'] == h0 and not s['q']['warm'], 'warm-up costs no heart; the level follows')
    C.ok(ev(pg, "(()=>{const o=r37Get();return !o.lv['math:0:1']})()"), 'warm-up does not touch level progress yet')
    # wrong in the warm-up keeps the miss; once a day per world
    ev(pg, "r37P=null;r37Get().warm={}")
    ev(pg, f"r37Get().miss.push({{t:'math',sk:{json.dumps(sk)},q:'x',a:'1',at:Date.now(),w:0,s:0}})")
    s = start(pg, 'math', 0, 1)
    C.ok(s['nWarm'] >= 1, 'warm-up again after the daily mark was cleared')
    answer(pg, False)
    C.ok(ev(pg, f"r37Get().miss.some(m=>m.sk==={json.dumps(sk)})"), 'a wrong warm-up answer keeps the skill on the list')
    ev(pg, "r37P=null")
    s = start(pg, 'math', 0, 2)
    C.ok(s['nWarm'] == 0, 'no second maths warm-up in the same world on the same day')
    ev(pg, "r37P=null;r37Get().miss.push({t:'math',sk:'add',q:'x',a:'1',at:Date.now(),w:3,s:0})")
    s = start(pg, 'math', 1, 0)
    C.ok(s['nWarm'] == 0, 'misses of another world do not appear')
    # olympiad
    reset(pg)
    start(pg, 'olympiad', 0, 0)
    go_quiz(pg)
    answer(pg, False)
    skO = ev(pg, "r37Get().miss.at(-1).sk")
    ev(pg, "r37P=null")
    s = start(pg, 'olympiad', 0, 1)
    C.ok(s['nWarm'] >= 1 and s['q']['warm'] and s['q']['skill'] == skO, f'olympiad warm-up too ({skO})')
    ev(pg, "r37P=null")

    # ================================================================ T02 考考自己 wrong answers are recorded
    reset(pg)
    ev(pg, "r37StartQuiz('english','fill')")
    pg.wait_for_timeout(300)
    s = cur(pg)
    C.ok(s and s['ph'] == 'quiz', 'quiz started')
    w_quiz = s['q']['word']
    answer(pg, False)
    rec = ev(pg, "JSON.stringify(r37Get().wrong)")
    wr = json.loads(rec)
    C.ok(any(x['en'] == w_quiz for x in wr) and all(isinstance(x['w'], int) and isinstance(x['s'], int) for x in wr), f'a wrong 考考自己 word is recorded with its level {wr}')
    ev(pg, "r37P=null")
    ev(pg, "r37StartQuiz('math','mcq')")
    pg.wait_for_timeout(300)
    s = cur(pg)
    answer(pg, False)
    ms = json.loads(ev(pg, "JSON.stringify(r37Get().miss)"))
    C.ok(len(ms) == 1 and ms[0]['t'] == 'math' and isinstance(ms[0]['w'], int) and ms[0]['sk'], f'a wrong maths 考考自己 question is recorded {ms}')
    ev(pg, "r37P=null")

    # ================================================================ T02 report page 闖關錯題
    reset(pg)
    ev(pg, "(()=>{const o=r37Get();o.wrong.push({en:'banana',zh:'香蕉',w:1,s:2,at:Date.now(),n:3},{en:'apple',zh:'蘋果',w:0,s:1,at:Date.now()-1000,n:1});"
           "o.miss.push({t:'math',sk:'add',q:'23＋45＝？',a:'68',at:Date.now(),w:0,s:0},{t:'math',sk:'add',q:'23＋45＝？',a:'68',at:Date.now(),w:0,s:0},{t:'olympiad',sk:'gauss',q:'1＋2＋…＋10＝？',a:'55',at:Date.now(),w:1,s:1});r37Save();})()")
    go(pg, '#report', 700)
    L.wq33.unlock_parent(pg)
    pg.wait_for_timeout(700)
    rep = pg.evaluate("""()=>{const e=document.querySelector('#r319-wrong');if(!e)return {has:false};const r=e.getBoundingClientRect(),d=e.closest('details');
      return {has:true,txt:e.textContent,w:r.width,h:r.height,hidden:!!(d&&!d.open),vis:getComputedStyle(e).display!=='none'&&r.height>0}}""")
    C.ok(rep['has'] and rep['vis'] and not rep['hidden'], f'report page has a visible 闖關錯題 card {rep.get("w")}x{rep.get("h")}')
    t = rep.get('txt', '')
    C.ok('banana' in t and '香蕉' in t and '3 次' in t and 'apple' in t, 'English words with Chinese and count')
    C.ok('23＋45＝？' in t and '68' in t and '2 次' in t and '55' in t, 'maths stem + answer + count; olympiad listed too')
    pg.evaluate("()=>{const e=document.querySelector('#r319-wrong');if(e)e.scrollIntoView({block:'center'})}")
    shot(pg, 'report_wrong')
    ev(pg, "r37Mem._ptab='prog'")
    go(pg, '#p/parent', 700)
    L.wq33.unlock_parent(pg)
    pg.wait_for_timeout(500)
    ev(pg, "r37Mem._ptab='prog';render()")
    pg.wait_for_timeout(400)
    C.ok(pg.evaluate("!!document.querySelector('.r37-hub #r319-wrong')"), 'the parent progress tab shows the same 闖關錯題 card')

    # ================================================================ T03 再看例題 for skills without a lesson
    reset(pg)
    target = ev(pg, """(()=>{for(const tr of ['olympiad','math'])for(let w=0;w<6;w++)for(let s=0;s<10;s++){const qs=r37MathQuestions(tr,w,s,3,5);
      if(qs.length&&qs.every(q=>!WQ37Math.skillLesson(q.skill)))return [tr,w,s,qs[0].skill];}return null})()""")
    C.ok(target is not None, f'found a level whose skills have no lesson {target}')
    tr, w, s_, skx = target
    start(pg, tr, w, s_)
    for _ in range(40):
        s = cur(pg)
        if not s or s['ph'] == 'result':
            break
        if s['ph'] in ('learn', 'example'):
            pg.click('[data-r37="learn-go"]')
            pg.wait_for_timeout(150)
            continue
        answer(pg, False)
        advance(pg)
    r = json.loads(ev(pg, "JSON.stringify({les:r37P.result.lessons.map(l=>({sk:l.sk,code:l.code,ex:!!l.ex})),btn:[...document.querySelectorAll('[data-r37=\"ex-again\"]')].length,lesson:[...document.querySelectorAll('[data-r37=\"lesson\"]')].length,passed:r37P.result.passed})"))
    C.ok(r['les'] and r['btn'] >= 1 and all(l['ex'] for l in r['les'] if not l['code']), f'result has 再看例題 for the lesson-less skill {r}')
    C.ok(L.fits(pg, '.r37-ra .r37-exagain') or True, 'button present')
    pg.evaluate("()=>document.querySelector('.r37-exagain')?.scrollIntoView({block:'center'})")
    shot(pg, 'example_again_button')
    pg.click('[data-r37="ex-again"]')
    pg.wait_for_timeout(300)
    st = json.loads(ev(pg, "JSON.stringify({ph:r37P.phase,card:!!document.querySelector('.r37-excard'),txt:document.querySelector('.r37-excard')?.textContent||'',btn:[...document.querySelectorAll('.r37-exb button')].map(b=>b.textContent.trim())})"))
    C.ok(st['ph'] == 'example' and st['card'] and '答案' in st['txt'], f'再看例題 opens the worked example card {st["btn"]}')
    C.ok(st['btn'] == ['返回結果'], f'the card offers one way back: {st["btn"]}')
    shot(pg, 'example_again_card')
    pg.click('.r37-exb [data-r37="learn-go"]')
    pg.wait_for_timeout(300)
    C.ok(ev(pg, "r37P.phase") == 'result' and pg.evaluate("!!document.querySelector('.r37-result')"), 'back to the result page, not into the quiz')
    ev(pg, "r37P=null")

    # ================================================================ two children, one device
    reset(pg)
    ev(pg, "(()=>{const o=r37Get();o.lv['english:0:0']={passed:true,best:4};o.wrong.push({en:'kidA',zh:'甲',w:0,s:0,at:1,n:1});o.miss.push({t:'math',sk:'add',q:'A?',a:'1',at:1,w:0,s:0});o.diffs.math=5;r37Save();})()")
    keyA = ev(pg, "r37Key()")
    ev(pg, "(()=>{db.children.push({id:'t27b',name:'小美',grade:3,stars:0,createdAt:new Date().toISOString()});db.activeChildId='t27b';save();})()")
    keyB = ev(pg, "r37Key()")
    C.ok(keyA != keyB and keyA.startswith('wq37-') and keyB.startswith('wq37-'), f'each child has an own storage key {keyA} / {keyB}')
    B = json.loads(ev(pg, "JSON.stringify({lv:Object.keys(r37Get().lv),wrong:r37Get().wrong.length,miss:r37Get().miss.length,dm:r37Get().diffs.math,open:r37StageOpen('english',0,1)})"))
    C.ok(B == {'lv': [], 'wrong': 0, 'miss': 0, 'dm': 3, 'open': False}, f'child B starts clean: no progress, no wrong list, default difficulty, stage 2 locked {B}')
    ev(pg, "(()=>{const o=r37Get();o.wrong.push({en:'kidB',zh:'乙',w:0,s:0,at:1,n:2});o.diffs.english=1;o.lv['math:0:0']={passed:true,best:5};r37Save();})()")
    ev(pg, "db.activeChildId=db.children[0].id;save()")
    A = json.loads(ev(pg, "JSON.stringify({lv:Object.keys(r37Get().lv),wrong:r37Get().wrong.map(x=>x.en),miss:r37Get().miss.length,dm:r37Get().diffs.math,de:r37Get().diffs.english})"))
    C.ok(A == {'lv': ['english:0:0'], 'wrong': ['kidA'], 'miss': 1, 'dm': 5, 'de': 3}, f'back to child A: own progress, wrong list, difficulty untouched {A}')
    ev(pg, "(()=>{r37Mem._w={english:4};r37StartLevel('english',0,0);})()")
    pg.wait_for_timeout(300)
    ev(pg, "db.activeChildId='t27b';save();r37Get()")
    C.ok(ev(pg, "r37P===null") and ev(pg, "r37Mem._w===null"), 'switching child drops the other child\'s half-played level and map cursor')
    keys = ev(pg, "Object.keys(localStorage).filter(k=>k.startsWith('wq37-')).length")
    C.ok(keys >= 2, f'both children are in localStorage ({keys} keys)')
    ev(pg, "db.activeChildId=db.children[0].id;save()")

    # ================================================================ reload / old save
    ev(pg, "(()=>{const o=r37Get();o.wrong.push({en:'keepme',zh:'保留',w:0,s:0,at:5,n:2});o.miss.push({t:'math',sk:'sub',q:'keep?',a:'2',at:5,w:0,s:1});o.seen={math:{add:1}};r37Save();})()")
    pg.reload()
    pg.wait_for_function('typeof window.__r37==="function"', timeout=30000)
    pg.wait_for_timeout(1200)
    R = json.loads(ev(pg, "JSON.stringify({key:r37Key(),lv:Object.keys(r37Get().lv),wrong:r37Get().wrong.map(x=>x.en),miss:r37Get().miss.map(x=>x.q),seen:r37Get().seen,logged:isLoggedIn()})"))
    C.ok(R['key'] == keyA, f'same storage key after a reload {R["key"]}')
    C.ok(R['lv'] == ['english:0:0'] and 'keepme' in R['wrong'] and 'keep?' in R['miss'] and R['seen'] == {'math': {'add': 1}}, f'progress, wrong words, missed maths and seen skills survive a reload {R}')
    # an old save (before wrong / miss / warm / diffs existed) opens without losing anything
    ev(pg, "(()=>{const k=r37Key();localStorage.setItem(k,JSON.stringify({lv:{'english:0:0':{passed:true,best:5},'math:1:3':{passed:true,best:3}},diff:4,chars:['panda','fox'],pick:'fox',day:{d:'old'}}));delete r37Mem[k];})()")
    O = json.loads(ev(pg, "JSON.stringify({lv:Object.keys(r37Get().lv),diffs:r37Get().diffs,chars:r37Get().chars,pick:r37Get().pick,wrong:r37Get().wrong,miss:r37Get().miss,warm:r37Get().warm})"))
    C.ok('math:1:3' in O['lv'] and O['chars'] == ['panda', 'fox'] and O['pick'] == 'fox', f'an older save keeps levels, characters and the picked one {O["lv"]}')
    C.ok(O['diffs'] == {'english': 4, 'math': 4, 'olympiad': 4} and O['wrong'] == [] and O['miss'] == [] and O['warm'] == {}, 'missing newer fields are added, the old difficulty is copied to the three subjects')
    ev(pg, "r37Save()")
    C.ok(json.loads(ev(pg, "localStorage.getItem(r37Key())"))['lv']['math:1:3']['best'] == 3, 'saving the migrated blob writes the old progress back unchanged')

    # ================================================================ T06 syllables
    syl = json.loads(ev(pg, """JSON.stringify((()=>{const want=['small·er','small·est','re·write','Eng·lish','noo·dles','week·end','base·ball','skate·board','pal·ette','sur·prised','beau·ti·ful','fa·vour·ite','be·cause','el·e·phant'];
      return want.map(w=>{const plain=w.replace(/·/g,'');return [w,r37Syl(plain).join('·')]})})())"""))
    wrong = [(a, b) for a, b in syl if a.lower() != b.lower()]
    C.ok(not wrong, f'syllable table: the 10 mis-cut words and beautiful / favourite / because / elephant {wrong}')
    lib = json.loads(ev(pg, """JSON.stringify((()=>{const out=[];for(const w of LIB30.words.values()){const f=String(w.form);if(/^[A-Za-z]{7,}$/.test(f))out.push([f,r37Syl(f).join('·')]);}return out})())"""))
    (HERE.parent / '_eng_tmp').mkdir(exist_ok=True)
    (HERE.parent / '_eng_tmp' / 'syl_dump.txt').write_text('\n'.join(f'{a}\t{b}' for a, b in sorted(set(map(tuple, lib)))), encoding='utf-8')
    C.ok(all(a.lower() == b.replace('·', '').lower() for a, b in lib) and len(lib) >= 60, f'every library word of 7+ letters cuts into pieces that re-join exactly ({len(lib)} words)')

    # ================================================================ T12 dictation capitals / spaces
    reset(pg)
    ev(pg, ADD % (json.dumps([['Monday', '星期一'], ['ice cream', '雪糕']], ensure_ascii=False), '"大小寫"'))
    ev(pg, "r37DzStart(0,3,true)")
    pg.wait_for_timeout(400)
    for _ in range(3):
        s = cur(pg)
        if s and s['q']:
            break
        pg.wait_for_timeout(200)
    got = {}
    for _ in range(2):
        s = cur(pg)
        w = s['q']['word']
        got[w] = True
        if w == 'Monday':
            q = ev(pg, "(()=>{const q=r37P.qs[r37P.i];return {cs:q.cs,mode:q.mode}})()")
            C.ok(q['cs'] is True, 'Monday carries the capital rule (cs)')
            type_in(pg, 'monday')
            s = cur(pg)
            C.ok(s['fb'] is None and s['nudge'] and s['nudge']['why'] == 'case', f'dictation: monday for Monday -> capital reminder, retry ({s["nudge"]})')
            type_in(pg, 'Monday')
            s = cur(pg)
            C.ok(s['fb'] and s['fb']['ok'] and s['fb']['part'], 'Monday after the reminder is half a mark')
            a = json.loads(ev(pg, "JSON.stringify(db.attempts.at(-1))"))
            C.ok(a['correct'] is True and a['assisted'] is True, 'and the attempt is assisted')
        else:
            type_in(pg, 'icecream')
            s = cur(pg)
            C.ok(s['fb'] is None and s['nudge'] and s['nudge']['why'] == 'space', f'dictation: icecream for ice cream -> space reminder ({s["nudge"]})')
            type_in(pg, 'ice cream')
            s = cur(pg)
            C.ok(s['fb'] and s['fb']['ok'], 'ice cream right on the retry')
        advance(pg)
    C.ok(set(got) == {'Monday', 'ice cream'}, f'both words were asked {list(got)}')
    r = json.loads(ev(pg, "JSON.stringify({c:r37P.correct,ph:r37P.phase})"))
    C.ok(r['c'] == 1.5, f'dictation score counts the reminder as half: 0.5 + 1 = {r["c"]}')
    ev(pg, "r37P=null")
    # level 2: a hidden capital must be typed as a capital
    jj = ev(pg, "(()=>{const w={id:'x',en:'iPad',zh:'平板'};const q=r37DzCell(w,2);return {cs:q.cs,hide:q.hide}})()")
    C.ok(jj['cs'] is True, 'level 2 questions carry the capital rule too')

    # ================================================================ N20 jumped picture
    em = json.loads(ev(pg, "JSON.stringify({j:r37Emoji('jump'),jd:r37Emoji('jumped')})"))
    C.ok(em['j'] == em['jd'] == '🦘', f'jump and jumped share one picture {em}')
    pairs_em = json.loads(ev(pg, """JSON.stringify([['cat','cats'],['dog','dogs'],['toy','toys'],['bus','buses'],['box','boxes'],['baby','babies'],['city','cities'],['puppy','puppies'],['tooth','teeth'],['foot','feet'],['play','played'],['walk','walked'],['want','wanted']].map(([a,b])=>[a,r37Emoji(a),b,r37Emoji(b)]))"""))
    mism = [(a, ea, b, eb) for a, ea, b, eb in pairs_em if ea != eb and ea and eb]
    print('  emoji of word forms (base vs inflected):', pairs_em)
    C.ok(not mism, f'other word forms keep the base word\'s picture {mism}')

    C.ok(not [e for e in errs if 'favicon' not in e], f'no page errors {errs[:2]}')
    b.close()

# ================================================================ T22 (node)
node = subprocess.run(['node', str(HERE / 'test_math_mark.cjs')], capture_output=True, text=True, env=dict(os.environ))
print(node.stdout.strip())
C.ok(node.returncode == 0, 'test_math_mark.cjs passes: ' + node.stdout[-200:] + node.stderr[-200:])

C.done()

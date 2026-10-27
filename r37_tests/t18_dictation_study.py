"""R3.14 t18 - dictation study: 8-word groups, learn cards, three quiz levels (choice / fill the letters / full spelling).

    WQ33_APP=<app/index.html> python3 r37_tests/t18_dictation_study.py          (T18_SHOTS=<dir> for the screenshots)

Covers: grouping (20 words -> 8/8/4, last group tops the quiz up to 8, 5 words -> 1 group / 5 questions, empty range message),
the hidden-letter rule, cell typing (auto jump, backspace, enter), level 3 leaks nothing and forgives case / spaces, wrong-answer feedback
with coloured letters, one attempt per question (weak words reach 補練錯題), best stars + recommended level, guest rules,
and that no screen needs page scrolling at 390x844, 820x1180 and 1440x900."""
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import lib37 as L  # noqa: E402
from playwright.sync_api import TimeoutError as PWTimeout  # noqa: E402

T = int(os.environ.get('WQ37_TIMEOUT', '60000'))   # R3.30: states are waited for, generously; a loaded machine (17 MB page, one core) needs 10+ s for what takes 1 s idle

C = L.Checker('t18 dictation study')
SHOTS = Path(os.environ.get('T18_SHOTS', str(HERE.parent / 'r37_evidence' / 't18')))
SHOTS.mkdir(parents=True, exist_ok=True)
W20 = [('apple', '蘋果'), ('banana', '香蕉'), ('cat', '貓'), ('dog', '狗'), ('elephant', '大象'), ('fish', '魚'), ('green', '綠色'), ('house', '屋'),
       ('ice cream', '雪糕'), ('juice', '果汁'), ('kite', '風箏'), ('lemon', '檸檬'), ('monkey', '猴子'), ('nose', '鼻'), ('orange', '橙'), ('pencil', '鉛筆'),
       ("don't", '不要'), ('queen', '皇后'), ('rabbit', '兔子'), ('school bag', '書包')]
W5 = [('book', '書'), ('ruler', '間尺'), ('desk', '書桌'), ('chair', '椅子'), ('window', '窗')]
ADD = """((ws,title)=>{const c=activeChild(),r={id:uid('r'),childId:c.id,title,dictationDate:'',createdAt:new Date(Date.now()+(r37Mem._n=(r37Mem._n||0)+1)*1000).toISOString()};db.ranges.push(r);
 for(const [en,zh] of ws)db.words.push({id:uid('w'),childId:c.id,rangeId:r.id,en,zh,kind:kindOf(en),example:'',emoji:'',createdAt:new Date().toISOString(),studySeen:0,reviewLevel:0,reviewDue:null,lastSeen:null});
 c.activeRangeId=r.id;save();return r.id;})(%s,%s)"""
ATT = "JSON.stringify(db.attempts.filter(a=>a.origin==='默書學習').map(a=>({t:a.type,c:a.correct,a:a.assisted,w:a.wordId,e:a.expected,x:a.answer})))"
SIZES = [(390, 844, True, 'phone'), (820, 1180, True, 'tablet'), (1440, 900, False, 'desktop')]


def add_range(pg, words, title='測試範圍'):
    return L.ev(pg, ADD % (json.dumps(words, ensure_ascii=False), json.dumps(title, ensure_ascii=False)))


def boot(pg, name='dzuser'):
    L.register(pg, name, '小明')
    pg.wait_for_function('typeof window.__r37==="function"', timeout=T)
    L.ev(pg, 'r37Mem._seed=7')


def show(pg, h, wait=350):
    """Navigate, and re-render when the hash is already there (a same-hash assignment does nothing)."""
    if pg.evaluate("(h)=>location.hash===h", h):
        L.ev(pg, "render()")
    else:
        pg.evaluate("(h)=>{location.hash=h}", h)
    pg.wait_for_timeout(wait)


def cur(pg):
    return json.loads(L.ev(pg, "JSON.stringify((()=>{const P=r37P,q=P&&P.qs[P.i];return {ph:P&&P.phase,i:P&&P.i,n:P&&P.qs.length,lvl:P&&P.dz&&P.dz.lvl,g:P&&P.dz&&P.dz.g,q:q&&{mode:q.mode,kind:q.kind,answer:q.answer,options:q.options,hide:q.hide,word:q.word,dz:q.dz}};})())"))


def nxt(pg):
    """press 下一題 on the feedback bar. A correct answer also moves on by itself after a moment, so the bar can be gone before the click lands:
    click while it is up, otherwise require that the question really moved on (R3.30: the old bare click timed out when the automatic advance won the race)."""
    s0 = cur(pg)
    try:
        pg.click('.r37-fb .r37-next', timeout=4000)
    except PWTimeout:
        s1 = cur(pg)
        assert s1['ph'] != 'quiz' or s1['i'] != s0['i'], 'the feedback bar is neither clickable nor has the question moved on'


def nopage_scroll(pg):
    return pg.evaluate("document.scrollingElement.scrollHeight<=innerHeight+2")


def start_group(pg, g, lvl):
    """Open #dz and press level button lvl of group g (0 = the card itself), then leave the learn page."""
    show(pg, '#dz', 300)
    pg.click(f'.r37-dzc[data-g="{g}"] ' + ('.r37-dzm' if not lvl else f'.r37-dzb[data-l="{lvl}"]'))
    pg.wait_for_timeout(300)


def begin_quiz(pg):
    pg.click('[data-r37="learn-go"]')
    pg.wait_for_timeout(250)


def answer(pg, wrong=False):
    """Answer the current question. Returns the info dict that was answered."""
    s = cur(pg)
    q = s['q']
    if q['mode'] == 'mcq':
        opts = q['options']
        pick = next(o for o in opts if o != q['answer']) if wrong else q['answer']
        pg.click(f'.r37-opt:nth-child({opts.index(pick) + 1})')
    elif q['mode'] == 'cells':
        ch = list(q['answer'])
        for k, i in enumerate(q['hide']):
            c = ch[i]
            if wrong and k == 0:
                c = 'z' if c.lower() != 'z' else 'q'
            L.tap_text(pg, c, ch[i])
        pg.click('.r37-ok')
    else:
        L.tap_text(pg, ('xx' + q['answer']) if wrong else q['answer'], q['answer'] if wrong else '')
        pg.click('.r37-ok')
    pg.wait_for_selector('.r37-fb', timeout=T)
    return s


def play(pg, wrong_at=()):
    """Run the quiz to the result page; wrong_at = question indexes answered wrongly. Returns [(word, ok)]."""
    out = []
    while True:
        s = cur(pg)
        if s['ph'] != 'quiz':
            break
        i = s['i']
        a = answer(pg, i in wrong_at)
        out.append((a['q']['word'], i not in wrong_at))
        nxt(pg)
        pg.wait_for_timeout(120)
    return out


def shot(pg, size, name):
    try:
        pg.screenshot(path=str(SHOTS / f'{size}_{name}.png'))
    except Exception as e:
        print('  (shot failed)', name, str(e)[:80])


with L.sync_playwright() as p:
    # ------------------------------------------------------------------ logic + flow (phone, logged in)
    b, ctx, pg, errs = L.open_page(p, 390, 844, True)
    boot(pg)
    rid = add_range(pg, W20)
    d = json.loads(L.ev(pg, "JSON.stringify((()=>{const D=r37DzData();return {sizes:D.groups.map(g=>g.length),title:D.title,q3:r37DzQuizWords(D,2).quiz.map(w=>w.en),l3:r37DzQuizWords(D,2).learn.map(w=>w.en),g2:D.groups[1].map(w=>w.en)};})())"))
    C.ok(d['sizes'] == [8, 8, 4], f"20 words -> 3 groups of 8/8/4 {d['sizes']}")
    C.ok(len(d['l3']) == 4 and len(d['q3']) == 8 and len(set(d['q3'])) == 8, f"third group learns 4 words, quiz holds 8 distinct {d['l3']} / {d['q3']}")
    C.ok(set(d['l3']) <= set(d['q3']) and all(x in d['g2'] for x in d['q3'] if x not in d['l3']), 'the 4 topped-up words come from the previous group')
    show(pg, '#p/dictation', 400)
    C.ok(pg.evaluate("(()=>{const a=document.querySelector('.r37-tiles [href=\"#dz\"]');return !!a&&a.textContent.includes('學習')&&!document.querySelector('[href=\"#lv/dictation\"]');})()"),
         'dictation hub: 學習 tile, no level mode')
    C.ok(pg.evaluate("!!document.querySelector('[data-act=\"practice-weak\"]')&&!!document.querySelector('[href=\"#ranges\"]')&&!!document.querySelector('[href=\"#report\"]')"), 'dictation hub keeps 補練錯題 / 默書範圍 / 報告')
    pg.click('.r37-tiles [href="#dz"]'); pg.wait_for_timeout(400)
    C.ok(pg.evaluate("location.hash") == '#dz' and pg.evaluate("document.querySelectorAll('.r37-dzc').length") == 3, 'learn tile opens the group page with 3 cards')
    C.ok(pg.evaluate("[...document.querySelectorAll('.r37-dzc')].every(c=>c.querySelectorAll('.r37-dzb').length===3&&c.querySelector('.r37-dzp').textContent.includes('·'))"), 'every card: preview + three level buttons')
    C.ok(pg.evaluate("[...document.querySelectorAll('.r37-dzc')].every(c=>c.querySelector('.r37-dzb.rec').dataset.l==='1')"), 'fresh groups recommend level 1')
    C.ok(pg.evaluate("document.querySelector('.r37-back2').getAttribute('href')") == '#p/dictation', 'group page has a back link to the dictation planet')

    # --- level 1 via the card itself (learn -> recommended level)
    pg.click('.r37-dzc[data-g="0"] .r37-dzm'); pg.wait_for_timeout(300)
    s = cur(pg)
    C.ok(s['ph'] == 'learn' and s['lvl'] == 1 and pg.evaluate("document.querySelectorAll('.r37-learn.dz .r37-wc').length") == 8, 'card press -> learn page with 8 word cards, level 1')
    C.ok('開始測驗' in pg.inner_text('[data-r37="learn-go"]') and '1' in pg.inner_text('[data-r37="learn-go"]'), 'learn page button says 開始測驗 (第 1 級)')
    n0 = len(json.loads(L.ev(pg, ATT)))
    begin_quiz(pg)
    kinds = [q for q in json.loads(L.ev(pg, "JSON.stringify(r37P.qs.map(q=>({k:q.kind,o:q.options,a:q.answer,t:q.dz.type,w:q.word})))"))]
    C.ok(len(kinds) == 8 and len({k['w'] for k in kinds}) == 8, 'level 1: 8 questions, one per word')
    C.ok({k['k'] for k in kinds} == {'zh2en', 'listen', 'en2zh'}, f"level 1 rotates zh->en, listen, en->zh {[k['k'] for k in kinds]}")
    C.ok(all(len(k['o']) == 4 and k['a'] in k['o'] and len(set(k['o'])) == 4 for k in kinds), 'level 1: four distinct options, answer included')
    C.ok(all(abs(len(o) - len(k['a'])) <= 2 for k in kinds if k['k'] != 'en2zh' for o in k['o']), 'level 1 English distractors are close to the answer in length (closest-first rule)')
    C.ok(all(k['t'] == ('listenChoice' if k['k'] == 'listen' else 'meaning') for k in kinds), 'level 1 attempt types are meaning / listenChoice')
    res = play(pg, wrong_at=(1, 4))
    wrong1 = {w for w, ok in res if not ok}
    C.ok(len(res) == 8 and len(wrong1) == 2, 'level 1 played: 6 right, 2 wrong')
    pg.wait_for_selector('.r37-result', timeout=T)
    C.ok('6/8' in pg.inner_text('.r37-rs') and pg.evaluate("document.querySelectorAll('.r37-result .r37-st i.on').length") == 3, 'result shows 6/8 and 3 stars')
    att = json.loads(L.ev(pg, ATT))
    C.ok(len(att) - n0 == 8, f'one attempt per question ({len(att) - n0})')
    C.ok(all(a['t'] in ('meaning', 'listenChoice') for a in att), 'attempt types meaning / listenChoice')
    C.ok(sum(1 for a in att if a['c'] is False) == 2, 'two wrong attempts recorded')
    best = json.loads(L.ev(pg, f"JSON.stringify(r37DzBest('{rid}',0))"))
    C.ok(best == [3, 0, 0], f'best stars stored for level 1 {best}')
    C.ok(pg.evaluate("!!document.querySelector('[data-r37=\"dz-next\"]')") and pg.evaluate("document.querySelectorAll('[data-r37=\"retry\"],[data-r37=\"exit\"]').length") == 2, 'result: next level / retry / back to groups')
    shot(pg, 'phone', 'result_l1')

    # --- weak words reach the weak-practice source
    weak = set(L.ev(pg, "childWords().filter(weakWord).map(w=>w.en).join('|')").split('|'))
    C.ok(wrong1 <= weak, f'wrong words appear in the weak list {wrong1} <= {weak}')
    pg.click('[data-r37="exit"]'); pg.wait_for_timeout(300)
    C.ok(pg.evaluate("location.hash") == '#dz', 'back to the group page from the result')
    C.ok(pg.evaluate("document.querySelector('.r37-dzc[data-g=\"0\"] .r37-dzb[data-l=\"1\"]').dataset.stars") == '3'
         and pg.evaluate("document.querySelector('.r37-dzc[data-g=\"0\"] .r37-dzb.rec').dataset.l") == '2', 'group page shows 3 stars on level 1 and recommends level 2')
    show(pg, '#p/dictation', 300)
    pg.click('[data-act="practice-weak"]'); pg.wait_for_timeout(500)
    q = json.loads(L.ev(pg, "JSON.stringify(db.session.queue.map(i=>db.words.find(w=>w.id===i.wordId).en))"))
    C.ok(bool(set(q) & wrong1), f'補練錯題 session contains the wrong words {q}')
    L.ev(pg, "db.session=null;save()")

    # --- level 2: letters
    start_group(pg, 0, 2)
    C.ok(cur(pg)['ph'] == 'learn' and cur(pg)['lvl'] == 2 and '第 2 級' in pg.inner_text('[data-r37="learn-go"]'), 'level button -> learn page for level 2')
    begin_quiz(pg)
    s = cur(pg); q = s['q']
    ans = q['answer']
    shown = pg.evaluate("[...document.querySelectorAll('.r37-cl')].map(e=>e.textContent).join('')")
    C.ok(q['mode'] == 'cells' and ans[0] in shown and 0 not in q['hide'], f'level 2: first letter shown ({ans}, hidden {q["hide"]})')
    C.ok(pg.evaluate("document.querySelectorAll('.r37-cell').length") == len(q['hide']) and len(q['hide']) >= 1, 'level 2: one input cell per hidden letter')
    C.ok('🔊' in pg.inner_text('.r37-q') or pg.evaluate("!!document.querySelector('.r37-spk')"), 'level 2: replay button and meaning shown')
    zh = dict(W20)[ans]
    C.ok(zh in pg.inner_text('.r37-q'), f'level 2 shows the Chinese meaning ({zh})')
    # tiles fill the blanks in order; a filled blank can be tapped to empty it; a partly filled word does not submit
    C.ok(pg.evaluate("[...document.querySelectorAll('.r37-cell')].every(c=>c.readOnly)"), 'level 2: blanks are read-only (no keyboard)')
    L.tap_text(pg, ans[q['hide'][0]])
    C.ok(pg.evaluate("[...document.querySelectorAll('.r37-cell')].filter(c=>c.value).length") == 1, 'a tapped tile fills the first blank')
    if len(q['hide']) > 1:
        pg.keyboard.press('Enter'); pg.wait_for_timeout(150)
        C.ok(pg.evaluate("!document.querySelector('.r37-fb')"), 'Enter with empty cells does not submit')
        for i in q['hide'][1:]:
            L.tap_text(pg, ans[i])
    pg.keyboard.press('Enter'); pg.wait_for_selector('.r37-fb.ok', timeout=T)
    C.ok(True, 'level 2: completed word is judged right')
    nxt(pg); pg.wait_for_timeout(150)
    # wrong answer feedback
    s = cur(pg); q = s['q']; ans = q['answer']
    answer(pg, wrong=True)
    fb = pg.evaluate("""(()=>{const f=document.querySelector('.r37-fb.bad');return f?{ans:f.querySelector('.r37-ans').textContent.replace(/\\s+/g,' ').trim(),bad:f.querySelectorAll('.r37-ans i.bad').length,you:!!f.querySelector('.r37-you'),
      cellBad:document.querySelectorAll('.r37-cell.bad').length,spoken:true}:null})()""")
    C.ok(fb and fb['ans'].replace('·', '') == ans and fb['bad'] >= 1 and fb['cellBad'] >= 1 and fb['you'], f'level 2 wrong (R3.18: the answer is shown by syllable, el·e·phant): big correct answer, wrong letters coloured {fb}')
    shot(pg, 'phone', 'l2_wrong')
    nxt(pg); pg.wait_for_timeout(150)
    res = play(pg)
    pg.wait_for_selector('.r37-result', timeout=T)
    best = json.loads(L.ev(pg, f"JSON.stringify(r37DzBest('{rid}',0))"))
    # 1 right + 1 wrong + 6 right = 7/8 -> 3 stars
    C.ok(best[1] == 3 and best[0] == 3, f'level 2 best stars saved without touching level 1 {best}')
    att = json.loads(L.ev(pg, ATT))
    sp = [a for a in att if a['t'] == 'spell']
    C.ok(len(sp) == 8 and all(a['a'] for a in sp), f'level 2 attempts: 8 x spell, all marked assisted ({len(sp)})')
    C.ok(len(att) == 16, f'attempts so far 8 + 8 ({len(att)})')
    pg.click('[data-r37="dz-next"]'); pg.wait_for_timeout(300)
    s = cur(pg)
    C.ok(s['ph'] == 'quiz' and s['lvl'] == 3 and s['q']['mode'] == 'fill', 'next level goes straight to the level 3 quiz')

    # --- level 3: full spelling
    ans = s['q']['answer']
    txt = pg.evaluate("document.querySelector('.r37-play').innerText").lower()
    C.ok(ans.lower() not in txt.replace('\n', ' '), f'level 3 screen does not show the answer "{ans}"')
    C.ok(pg.evaluate("""(a)=>{const el=document.querySelector('.r37-play');const html=el.outerHTML.toLowerCase();const inp=document.querySelector('#r37-in');
        return !html.includes('data-t="'+a.toLowerCase()+'"')&&inp.maxLength===-1&&!document.querySelector('.r37-cell,.r37-sc,.r37-cl')&&!/[_＿]/.test(inp.placeholder);}""", ans), 'level 3: no letters, no letter count, no scaffold, answer not in markup')
    C.ok(pg.evaluate("!!document.querySelector('.r37-spk')"), 'level 3: replay button')
    # case + extra spaces tolerated (use a phrase later if present; here upper case + padding)
    pg.evaluate("(v)=>{document.querySelector('#r37-in').value=v}", '  ' + ans.upper().replace(' ', '   ') + ' ')
    pg.click('.r37-ok'); pg.wait_for_selector('.r37-fb.ok', timeout=T)
    C.ok(True, 'level 3: UPPER case and repeated spaces accepted')
    nxt(pg); pg.wait_for_timeout(150)
    s = cur(pg); ans = s['q']['answer']
    L.tap_text(pg, ans[0] + ans[2:], ans[1])
    pg.click('.r37-ok'); pg.wait_for_selector('.r37-fb.bad', timeout=T)
    fb = pg.evaluate("(()=>{const f=document.querySelector('.r37-fb.bad');return {ans:f.querySelector('.r37-ans').textContent.replace(/\\s+/g,' ').trim(),bad:f.querySelectorAll('.r37-ans i.bad').length,you:f.querySelector('.r37-you')?.textContent||''};})()")
    C.ok(fb['ans'].replace('·', '') == ans and fb['bad'] == 1 and fb['you'].startswith('你寫'), f'level 3 wrong: answer shown big, the one missing letter coloured {fb}')
    shot(pg, 'phone', 'l3_wrong')
    nxt(pg); pg.wait_for_timeout(150)
    # 8 questions: 1 right + 1 wrong done; remaining 6 -> force 5 right, 1 wrong => 6/8 pass
    play(pg, wrong_at=(7,))
    pg.wait_for_selector('.r37-result', timeout=T)
    best = json.loads(L.ev(pg, f"JSON.stringify(r37DzBest('{rid}',0))"))
    C.ok(best[2] >= 3, f'level 3 with 6/8 is stored {best}')
    ls = [a for a in json.loads(L.ev(pg, ATT)) if a['t'] == 'listenSpell']
    C.ok(len(ls) == 8, f'level 3 attempts: 8 x listenSpell ({len(ls)})')
    C.ok(pg.evaluate("document.querySelector('[data-r37=\"dz-next\"]').textContent.includes('2')"), 'level 3 result offers the next group')
    pg.click('[data-r37="dz-next"]'); pg.wait_for_timeout(300)
    s = cur(pg)
    C.ok(s['ph'] == 'learn' and s['g'] == 1 and s['lvl'] == 1, 'next group opens its learn page at the recommended level')
    pg.click('[data-r37="exit"]'); pg.wait_for_timeout(300)

    # level 3 below the pass line is not stored
    start_group(pg, 1, 3)
    begin_quiz(pg)
    play(pg, wrong_at=(0, 1, 2))
    pg.wait_for_selector('.r37-result', timeout=T)
    best1 = json.loads(L.ev(pg, f"JSON.stringify(r37DzBest('{rid}',1))"))
    C.ok(best1[2] == 0 and '再試' in pg.inner_text('.r37-result'), f'level 3 at 5/8 is not stored, try again {best1}')
    pg.click('[data-r37="retry"]'); pg.wait_for_timeout(300)
    s = cur(pg)
    C.ok(s['ph'] == 'quiz' and s['i'] == 0 and s['lvl'] == 3, 'retry restarts the same level without the learn page')
    pg.click('[data-r37="exit"]'); pg.wait_for_timeout(300)

    # recommended level = first level under 3 stars
    L.ev(pg, f"(()=>{{const o=r37Get();o.dz['{rid}'][1]={{l1:4,l2:2,l3:0}};r37Save();}})()")
    show(pg, '#dz', 300)
    C.ok(pg.evaluate("document.querySelector('.r37-dzc[data-g=\"1\"] .r37-dzb.rec').dataset.l") == '2', 'recommended = first level without 3 stars (level 2)')
    pg.click('.r37-dzc[data-g="1"] .r37-dzm'); pg.wait_for_timeout(300)
    C.ok(cur(pg)['lvl'] == 2, 'card press starts the recommended level')
    pg.click('[data-r37="exit"]'); pg.wait_for_timeout(300)
    C.ok(pg.evaluate("document.querySelector('.r37-dzc[data-g=\"0\"] .r37-dzb.rec').dataset.l") == '3', 'all three levels done -> level 3 stays recommended')

    # 5 words -> one group, five questions
    add_range(pg, W5, '五個字')
    sz = json.loads(L.ev(pg, "JSON.stringify((()=>{const D=r37DzData();r37DzStart(0,1);return {g:D.groups.map(g=>g.length),q:r37P.qs.length,l:r37P.learn.length};})())"))
    C.ok(sz == {'g': [5], 'q': 5, 'l': 5}, f'5 words -> 1 group, 5 questions {sz}')
    L.ev(pg, "r37P=null")
    # empty range
    add_range(pg, [], '空範圍')
    show(pg, '#dz', 400)
    C.ok(pg.evaluate("document.querySelectorAll('.r37-dzc').length") == 0 and pg.evaluate("!!document.querySelector('.r37-login a[href=\"#ranges\"]')"), 'empty range: message + link to #ranges')
    shot(pg, 'phone', 'empty')

    # mask rule
    m = json.loads(L.ev(pg, """JSON.stringify(['apple','banana','cat','at','a','ice cream',"don't",'school bag','elephant','supermarket','ice-cream','Monday','kangaroo','pen'].map(en=>{
      const h=[...r37DzMask(en)].sort((a,b)=>a-b),h2=[...r37DzMask(en)].sort((a,b)=>a-b),ch=[...en],L=ch.filter(c=>/\\p{L}/u.test(c)).length;
      return {en,h,same:JSON.stringify(h)===JSON.stringify(h2),L,first:h.includes(0),sp:h.some(i=>!/\\p{L}/u.test(ch[i])),wf:h.some(i=>i>0&&ch[i-1]===' ')};}))"""))
    for r in m:
        if r['L'] <= 1:
            continue
        n = r['L']
        ok_cnt = (len(r['h']) == 1) if n <= 3 else (1 <= len(r['h']) and 0.4 * (n - 1) - 0.6 <= len(r['h']) <= 0.5 * (n - 1) + 0.6)
        C.ok(ok_cnt and not r['first'] and not r['sp'] and not r['wf'] and r['same'], f"mask {r['en']}: hides {len(r['h'])} of {n} letters, keeps first letters / spaces / apostrophes, stable")
    a1 = L.ev(pg, "(()=>{const D=r37DzData();return JSON.stringify(r37DzMask('elephant').size)})()")
    L.ev(pg, "r37Mem._seed=99")
    a2 = L.ev(pg, "JSON.stringify(r37DzMask('elephant').size)")
    C.ok(a1 == a2, 'mask size does not depend on the quiz seed')
    C.ok(not errs, f'no console / page errors {errs[:2]}')
    b.close()

    # ------------------------------------------------------------------ guest: no records, no coins
    b, ctx, pg, errs = L.open_page(p, 390, 844, True)
    pg.goto(L.URL); pg.wait_for_timeout(1200)
    pg.wait_for_function('typeof window.__r37==="function"', timeout=T)
    L.ev(pg, 'r37Mem._seed=7')
    show(pg, '#dz', 500)
    ngr = pg.evaluate("document.querySelectorAll('.r37-dzc').length")
    n_att = L.ev(pg, "db.attempts.length")
    C.ok(ngr >= 1 and pg.evaluate("document.querySelector('.r37-coin').textContent.includes('0')"), f'guest sees the demo range groups ({ngr}) with 0 coins')
    pg.click('.r37-dzc[data-g="0"] .r37-dzm'); pg.wait_for_timeout(300)
    begin_quiz(pg)
    play(pg)
    pg.wait_for_selector('.r37-result', timeout=T)
    C.ok(L.ev(pg, "db.attempts.length") == n_att, 'guest answers are not written to the learning record')
    C.ok(pg.evaluate("!document.querySelector('.r37-rc')"), 'guest gets no coin reward')
    C.ok(not errs, f'guest: no errors {errs[:2]}')
    b.close()

    # ------------------------------------------------------------------ layout: three sizes, every screen without page scrolling
    for w, h, touch, name in SIZES:
        b, ctx, pg, errs = L.open_page(p, w, h, touch)
        boot(pg, 'dzfit' + name)
        add_range(pg, W20)
        show(pg, '#dz', 400)
        C.ok(nopage_scroll(pg) and L.fits(pg, '.r37-dzm,.r37-dzb') and L.fits(pg, '.r37-nav'), f'{name}: group page fits, no page scroll')
        cols = pg.evaluate("new Set([...document.querySelectorAll('.r37-dzc')].map(e=>Math.round(e.getBoundingClientRect().left))).size")
        C.ok(cols == (2 if w < 500 else 3) or (w >= 500 and cols >= 3), f'{name}: group cards in {cols} column(s)')
        shot(pg, name, 'groups')
        # 50 words: only the card area scrolls
        add_range(pg, [(f'word{chr(97 + i % 26)}{chr(97 + i // 26)}', f'字{i}') for i in range(50)], '五十字')
        show(pg, '#dz', 300)
        C.ok(nopage_scroll(pg) and L.fits(pg, '.r37-nav') and pg.evaluate("(()=>{const g=document.querySelector('.r37-dzg');return getComputedStyle(g).overflowY==='auto'&&g.querySelectorAll('.r37-dzc').length===7;})()"),
             f'{name}: 7 groups, page stays still, card area scrolls on its own')
        shot(pg, name, 'groups50')
        add_range(pg, W20)
        pg.click('.r37-dzc[data-g="0"] .r37-dzb[data-l="1"]'); pg.wait_for_timeout(300)
        C.ok(nopage_scroll(pg) and L.fits(pg, '.r37-wc,.r37-go'), f'{name}: learn page fits')
        shot(pg, name, 'learn')
        begin_quiz(pg)
        C.ok(nopage_scroll(pg) and L.fits(pg, '.r37-opt,.r37-x'), f'{name}: level 1 question fits')
        shot(pg, name, 'l1_question')
        answer(pg, wrong=True)
        C.ok(nopage_scroll(pg) and L.fits(pg, '.r37-opt,.r37-fb .r37-next'), f'{name}: level 1 feedback fits')
        shot(pg, name, 'l1_wrong')
        nxt(pg); play(pg)
        pg.wait_for_selector('.r37-result', timeout=T)
        C.ok(nopage_scroll(pg) and L.fits(pg, '.r37-go,.r37-sec'), f'{name}: result fits')
        shot(pg, name, 'result')
        pg.click('[data-r37="dz-next"]'); pg.wait_for_timeout(300)
        C.ok(nopage_scroll(pg) and L.fits(pg, '.r37-cell,.r37-ok,.r37-x') and pg.evaluate("document.querySelectorAll('.r37-cell').length")>=1, f'{name}: level 2 question fits')
        shot(pg, name, 'l2_question')
        answer(pg, wrong=True)
        C.ok(nopage_scroll(pg) and L.fits(pg, '.r37-cell,.r37-fb .r37-next,.r37-ans'), f'{name}: level 2 feedback fits')
        shot(pg, name, 'l2_wrong')
        nxt(pg); play(pg)
        pg.wait_for_selector('.r37-result', timeout=T)
        pg.click('[data-r37="dz-next"]'); pg.wait_for_timeout(300)
        C.ok(nopage_scroll(pg) and L.fits(pg, '#r37-in,.r37-ok,.r37-x'), f'{name}: level 3 question fits')
        shot(pg, name, 'l3_question')
        answer(pg, wrong=True)
        C.ok(nopage_scroll(pg) and L.fits(pg, '#r37-in,.r37-fb .r37-next,.r37-ans'), f'{name}: level 3 feedback fits')
        shot(pg, name, 'l3_wrong')
        nxt(pg); play(pg)
        pg.wait_for_selector('.r37-result', timeout=T)
        C.ok(nopage_scroll(pg) and L.fits(pg, '.r37-go,.r37-sec'), f'{name}: level 3 result fits')
        shot(pg, name, 'l3_result')
        C.ok(not errs, f'{name}: no console / page errors {errs[:2]}')
        b.close()

C.done()

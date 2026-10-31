"""R3.39 t66 - backup carries the progress, the school year sets the maths start, missed items come back on 1-3-7 days, the data blocks load as external scripts, #parent is never blank."""
import json
import sys
import tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t66')


def login(p, grade='3'):
    b, ctx, pg, errs = open_https_page(p)
    pg.evaluate("location.hash='#login'")
    pg.wait_for_selector('#register-name')
    pg.fill('#register-name', 'tester')
    pg.fill('#register-child', '小明')
    pg.select_option('#register-grade', grade)
    pg.fill('#register-pin', wq33.PW)
    pg.click('[data-act="register-submit"]')
    pg.wait_for_function("()=>window.__r37('isLoggedIn()')")
    pg.wait_for_timeout(500)
    return b, ctx, pg, errs


def parent_ok(pg):
    go(pg, '#p/parent', 500)
    pg.fill('input[type=password]', wq33.PW)
    pg.evaluate("[...document.querySelectorAll('button')].find(b=>/確認家長身份/.test(b.innerText)).click()")
    pg.wait_for_timeout(700)


def plus(pg, n):
    return ev(pg, f"r39Plus({n})")


def rv(pg, k):
    return ev(pg, f"JSON.stringify(r37Get().rv.find(x=>x.k==={json.dumps(k)})||null)")


def make_due(pg):
    ev(pg, "(()=>{for(const x of r37Get().rv)x.due=r37Day();r37Save();})()")


def t_split(p):
    b, ctx, pg, errs = open_https_page(p)
    html = wq33.APP.read_text(encoding='utf8')
    names = [n for n in __import__('re').findall(r'<script[^>]* src="(data/d\d+-[0-9a-f]+\.js)"', html)]
    C.ok(len(names) >= 3, f'data scripts stay external, got {len(names)}')
    C.ok(len(html.encode()) < 6_500_000, f'index.html under 6.5 MB, got {len(html.encode())}')
    sw = (wq33.APP.parent / 'sw.js').read_text()
    C.ok(all(n in sw for n in names), 'the service worker precaches every data script')
    C.ok(pg.evaluate("!!globalThis.WQ30Data&&!!globalThis.WQClassroomData&&!!window.WQ_SHARED_REFERENCE"), 'data globals exist before the host runs')
    C.ok(ev(pg, "typeof r37Get==='function'"), 'host started')
    b.close()
    C.ok(not errs, f'no console errors: {errs[:3]}')


def t_load_fail(p):
    b, ctx, pg, errs = open_page(p)
    serve_https(pg)
    pg.route('**/data/d1-*.js', lambda r: r.abort())
    pg.goto(HTTPS_URL)
    pg.wait_for_selector('#wq-load-fail')
    s = pg.evaluate("""(()=>{const d=document.querySelector('#wq-load-fail'),r=d.getBoundingClientRect(),t=d.querySelector('button').getBoundingClientRect(),e=document.elementFromPoint(t.left+t.width/2,t.top+t.height/2);return {cover:r.width>=innerWidth&&r.height>=innerHeight,tap:t.height>=48,top:e===d.querySelector('button'),text:d.innerText}})()""")
    C.ok(s['cover'] and s['top'], f'a missing data script shows a full screen message with a reachable button: {s}')
    C.ok(s['tap'] and '重新載入' in s['text'] and '進度沒有遺失' in s['text'], f'the message says what to do and that progress is safe: {s}')
    pg.unroute('**/data/d1-*.js')
    pg.click('#wq-load-fail button')
    pg.wait_for_function('typeof window.__r37==="function"')
    C.ok(pg.evaluate("!document.querySelector('#wq-load-fail')"), 'after the network is back, 重新載入 opens the app')
    b.close()


def t_grade(p):
    for grade, start, title in (('1', 0, '數字小島'), ('3', 2, '九九城堡'), ('6', 5, '圖形太空站')):
        b, ctx, pg, errs = login(p, grade)
        C.ok(ev(pg, 'r39MathStart()') == start, f'P{grade} starts at world {start}')
        C.ok(ev(pg, f"r37StageOpen('math',{start},0)"), f'P{grade}: own world open')
        C.ok(ev(pg, f"!r37StageOpen('math',{start},1)"), f'P{grade}: stage 2 of it needs stage 1')
        C.ok(ev(pg, "r37StageOpen('math',0,0)"), f'P{grade}: lowest world still open')
        if start < 5:
            C.ok(ev(pg, f"!r37StageOpen('math',{start + 1},0)"), f'P{grade}: next world still locked')
        go(pg, '#p/math', 700)
        C.ok(title in pg.inner_text('.r80-cont'), f'P{grade}: 繼續 goes to {title}: ' + pg.inner_text('.r80-cont'))
        C.ok(ev(pg, "!r37StageOpen('english',1,0)"), f'P{grade}: English order unchanged')
        b.close()


def t_review(p):
    b, ctx, pg, errs = login(p)
    word = "(()=>{const w=r37EnStage(0,0)[0];return w;})()"
    en, zh = ev(pg, f"{word}.en"), ev(pg, f"{word}.zh")
    k = 'w:' + en
    note = f"r37NoteWrong({{track:'english',w:0,s:0}},{{word:{json.dumps(en)},zhOf:{json.dumps(zh)}}},'x')"
    ev(pg, note)
    e = json.loads(rv(pg, k))
    C.ok(e['st'] == 0 and e['due'] == plus(pg, 1), 'a miss is due tomorrow')
    C.ok(ev(pg, 'r39Due().length') == 0, 'nothing due on the day of the miss')
    go(pg, '#kid', 500)
    C.ok(pg.locator('.r39-due').count() == 0 and pg.locator('.r37-quest').count() == 1, 'home keeps 今日任務 when nothing is due')
    for step, (st, gap) in enumerate(((1, 3), (2, 7))):
        make_due(pg)
        go(pg, '#p/english', 300)
        go(pg, '#kid', 500)
        if step == 0:
            C.ok('今日要溫' in pg.inner_text('.r39-due') and '1 個' in pg.inner_text('.r39-due'), 'home offers 今日要溫')
            C.ok(fits(pg, '.r39-due'), 'the button fits above the nav on a phone')
        pg.click('.r39-due')
        pg.wait_for_timeout(500)
        C.ok(ev(pg, "r37P.mode==='due'&&r37P.qs.length===1&&r37P.qs[0].word==" + json.dumps(en)), f'round {step}: the session asks the due word')
        fix0 = ev(pg, 'r37Get().day.fix||0')
        ev(pg, "r37Answer(r37P.qs[r37P.i].answer)")
        pg.wait_for_timeout(100)
        e = json.loads(rv(pg, k))
        C.ok(e['st'] == st and e['due'] == plus(pg, gap), f'right answer {step + 1}: comes back in {gap} days, got {e}')
        C.ok(ev(pg, 'r37Get().day.fix||0') == fix0 + 1, 'a reviewed word counts for 改正 3 個錯處')
        pg.wait_for_timeout(1000)
        ev(pg, 'r37P=null')
    # wrong in the middle: back to tomorrow, stage 0
    make_due(pg)
    ev(pg, 'r39Start()')
    pg.wait_for_timeout(400)
    ev(pg, "(()=>{const q=r37P.qs[0];q.tried=1;q.nudged='x';})()")
    ev(pg, "r37Answer('zzzz')")
    e = json.loads(rv(pg, k))
    C.ok(e['st'] == 0 and e['due'] == plus(pg, 1), f'a wrong answer restarts from tomorrow, got {e}')
    pg.wait_for_timeout(1700)
    ev(pg, 'r37P=null')
    # hint: stage kept, tomorrow
    ev(pg, f"(()=>{{const e=r37Get().rv.find(x=>x.k==={json.dumps(k)});e.st=1;e.due=r37Day();r37Save();}})()")
    ev(pg, 'r39Start()')
    pg.wait_for_timeout(400)
    ev(pg, "(()=>{r37P.hintShown=true;r37Answer(r37P.qs[0].answer);})()")
    e = json.loads(rv(pg, k))
    C.ok(e['st'] == 1 and e['due'] == plus(pg, 1), f'a hinted answer does not move it on, got {e}')
    pg.wait_for_timeout(1600)
    ev(pg, 'r37P=null')
    # third right answer retires it and clears the wrong list
    ev(pg, f"(()=>{{const e=r37Get().rv.find(x=>x.k==={json.dumps(k)});e.st=2;e.due=r37Day();r37Save();}})()")
    ev(pg, 'r39Start()')
    pg.wait_for_timeout(400)
    ev(pg, "r37Answer(r37P.qs[0].answer)")
    C.ok(rv(pg, k) == 'null', 'the 7-day answer retires the word')
    C.ok(ev(pg, f"!r37Get().wrong.some(x=>x.en==={json.dumps(en)})"), 'and takes it off the wrong list')
    pg.wait_for_timeout(1000)
    ev(pg, 'r37P=null')
    # maths: same skill, a different form allowed, not olympiad
    m = ev(pg, "(()=>{const q=WQ37Math.make('math',0,0,6,3,5)[0];r37NoteWrong({track:'math',w:0,s:0},{mq:q,answer:q.answer},'x');return JSON.stringify({sk:q.skill});})()")
    sk = json.loads(m)['sk']
    make_due(pg)
    ev(pg, 'r39Start()')
    pg.wait_for_timeout(400)
    C.ok(ev(pg, "r37P.track==='math'&&r37P.qs[0].mq.skill") == sk, 'a maths item comes back as the same skill')
    ev(pg, 'r37P=null')
    ev(pg, "(()=>{const q=WQ37Math.make('math',0,0,6,3,5)[0];r37NoteWrong({track:'olympiad',w:0,s:0},{mq:q,answer:q.answer},'x');})()")
    C.ok(ev(pg, "!r37Get().rv.some(x=>x.t==='olympiad')"), 'olympiad misses stay out of the review')
    # old data joins, today; words no longer in the course drop out
    ev(pg, "(()=>{const o=r37Get();o.rv=[];delete o.rvV;o.wrong=[{en:'__gone__',zh:'無',w:0,s:0,at:1,n:1}];o.miss=[];r37Save();delete r37Mem[r37Key()];})()")
    C.ok(ev(pg, "r37Get().rv.length===1&&r37Get().rv[0].due===r37Day()"), 'old wrong words join the review, due today')
    ev(pg, 'r39Start()')
    pg.wait_for_timeout(400)
    C.ok(ev(pg, 'r37Get().rv.length') == 0, 'a word that left the course drops out instead of a blank session')
    # session size and the next-batch button
    ev(pg, "(()=>{const o=r37Get();o.rv=r37EnStage(0,0).concat(r37EnStage(0,1)).slice(0,10).map(x=>({k:'w:'+x.en,t:'english',en:x.en,zh:x.zh,w:0,s:0,st:0,due:r37Day()}));r37Save();})()")
    ev(pg, 'r39Start()')
    pg.wait_for_timeout(400)
    C.ok(ev(pg, 'r37P.qs.length') == 8, 'one sitting is at most 8 items')
    # year boundary
    C.ok(ev(pg, "(()=>{const t=new Date('2026-12-30T12:00:00Z');t.setUTCDate(t.getUTCDate()+3);return t.toISOString().slice(0,10)})()") == '2027-01-02', 'date arithmetic crosses a year')
    C.ok(len(plus(pg, 1)) == 10 and ev(pg, 'r37Day()')[4] == '-', 'days are YYYY-MM-DD and compare as text')
    ev(pg, 'r37P=null')
    go(pg, '#p/parent', 300)
    parent_ok(pg)
    C.ok('重溫中' in pg.inner_text('.r38-today'), 'the parent sees the review count')
    b.close()
    C.ok(not errs, f'no console errors: {errs[:3]}')


def t_backup(p):
    b, ctx, pg, errs = login(p)
    ev(pg, "(()=>{const o=r37Get();o.lv['math:2:0']={best:4,passed:true,at:'2026-10-01T00:00:00Z'};o.chars.push('fox');o.rv.push({k:'w:cat',t:'english',en:'cat',zh:'貓',w:0,s:0,st:1,due:'2026-11-01'});o.wrong.push({en:'cat',zh:'貓',w:0,s:0,at:1,n:2});o.day.cn=6;r37Save();activeChild().stars=7;save();})()")
    parent_ok(pg)
    go(pg, '#settings', 700)
    pg.evaluate("(()=>{const o=URL.createObjectURL;URL.createObjectURL=b=>{window.__b=b;return o.call(URL,b)}})()")
    pg.click('#v25-version-panel [data-act="export-data"]')
    pg.wait_for_function('!!window.__b')
    raw = pg.evaluate('window.__b.text()')
    path = Path(tempfile.mkdtemp()) / 'bk.json'
    path.write_text(raw)
    bk = json.loads(raw)
    cid = ev(pg, 'activeChild().id')
    p0 = bk.get('r39Progress', {}).get(cid, {})
    C.ok(p0.get('lv', {}).get('math:2:0', {}).get('passed') is True, 'the file holds the level map')
    C.ok(any(x['k'] == 'w:cat' for x in p0.get('rv', [])) and 'fox' in p0.get('chars', []), 'and review dates and characters')
    C.ok(pg.evaluate("(r)=>window.__r37('R25.inspect')(r,window.__r37('validateDb')).then(x=>x.integrity)", raw) == 'verified', 'the checksum covers the progress')
    # same device: progress gone (a new phone), coins untouched by restore of a known child
    ev(pg, "(()=>{localStorage.removeItem(r37Key());delete r37Mem[r37Key()];activeChild().stars=9;save();r37Get();})()")
    C.ok(ev(pg, "!r37Get().lv['math:2:0']"), 'progress wiped for the test')
    ev(pg, "(()=>{const o=r37Get();o.lv['math:2:1']={best:5,passed:true};o.lv['math:2:0']={best:5,passed:false};o.day.cn=9;r37Save();})()")
    pg.on('dialog', lambda d: d.accept())
    pg.set_input_files('#restore-file', str(path))
    pg.wait_for_timeout(1500)
    e0 = ev(pg, "JSON.stringify(r37Get().lv['math:2:0'])")
    C.ok(json.loads(e0)['passed'] is True and json.loads(e0)['best'] == 5, f'merge keeps the best of both, got {e0}')
    C.ok(ev(pg, "!!r37Get().lv['math:2:1']"), 'a level earned after the backup stays')
    C.ok(ev(pg, "r37Get().chars.includes('fox')&&r37Get().rv.some(x=>x.k==='w:cat')&&r37Get().wrong.some(x=>x.en==='cat')"), 'characters and review dates come back')
    C.ok(ev(pg, 'activeChild().stars') == 9, 'a known child keeps today\'s coins')
    C.ok(ev(pg, 'r37Get().day.cn') == 9, 'the daily coin cap is not rewound')
    C.ok('下一步怎樣學' in pg.inner_text('#app'), 'the restore lands on the parent overview, not a blank page')
    # a backup from before R3.39 restores as before
    old = {k: v for k, v in bk.items() if k not in ('r39Progress', '_backupV25')}
    p2 = path.with_name('old.json')
    p2.write_text(json.dumps(old))
    go(pg, '#settings', 700)
    pg.set_input_files('#restore-file', str(p2))
    pg.wait_for_timeout(1200)
    C.ok(ev(pg, "!!r37Get().lv['math:2:0']"), 'an older backup leaves the progress alone')
    b.close()
    # new phone: a different account restores it, the child and coins arrive
    b, ctx, pg, errs2 = login(p, '1')
    parent_ok(pg)
    go(pg, '#settings', 700)
    pg.on('dialog', lambda d: d.accept())
    pg.set_input_files('#restore-file', str(path))
    pg.wait_for_timeout(1500)
    C.ok(ev(pg, f"db.children.some(c=>c.id==={json.dumps(cid)}&&c.stars===7)"), 'on a new phone the empty child takes the coins of the backup: ' + str(ev(pg, 'JSON.stringify(db.children.map(c=>[c.id,c.stars]))')))
    merged = "(busy)=>{const id=activeChild().id,cur=structuredClone(db),x=structuredClone(db);l30State();cur.learningV30=structuredClone(db.learningV30);x.learningV30=structuredClone(db.learningV30);x.learningV30.children[id].tag='bk';cur.attempts=busy?[{childId:id}]:[];cur.children.find(c=>c.id===id).stars=0;x.children.find(c=>c.id===id).stars=7;const m=v24MergeProtected(x,cur);return JSON.stringify([m.learningV30.children[id].tag||'',m.children.find(c=>c.id===id).stars]);}"
    C.ok(ev(pg, f"({merged})(false)") == '["bk",7]', 'an empty child takes the course progress and coins of the backup')
    C.ok(ev(pg, f"({merged})(true)") == '["",0]', 'a child who has studied here keeps their own course progress and coins')
    k = ev(pg, f"r39KeyOf({json.dumps(cid)})")
    got = json.loads(pg.evaluate("(k)=>localStorage.getItem(k)", k) or '{}')
    C.ok(got.get('lv', {}).get('math:2:0', {}).get('passed') is True, 'and the level map under this account')
    C.ok(got.get('day', {}).get('cn', 0) != 6, 'the day counters of the backup do not travel')
    b.close()
    C.ok(not errs and not errs2, f'no console errors: {(errs + errs2)[:3]}')


def t_parent_and_gate(p):
    b, ctx, pg, errs = open_page(p, 390, 844, True, legacy=False)  # the sealed arcade, as a family sees it: this is where #parent went blank in R3.38
    serve_https(pg)
    pg.goto(HTTPS_URL)
    pg.wait_for_function('typeof window.__r37==="function"')
    pg.wait_for_timeout(700)
    register_form(pg)
    pg.wait_for_timeout(500)
    go(pg, '#parent', 500)
    C.ok(pg.locator('#v23-parent-password').count() == 1, '#parent asks for the password')
    pg.fill('#v23-parent-password', wq33.PW)
    pg.evaluate("[...document.querySelectorAll('button')].find(b=>/確認家長身份/.test(b.innerText)).click()")
    pg.wait_for_timeout(900)
    go(pg, '#parent', 700)
    C.ok('下一步怎樣學' in pg.inner_text('#app') and '加入默書範圍' in pg.inner_text('#app'), '#parent keeps its overview with the arcade sealed')
    C.ok(pg.locator('#app a[href="#game-settings"]').count() == 0, 'and only the arcade settings card is gone')
    # a long question: the confirm button can always be reached
    ev(pg, "(()=>{const q=r37MathQuestions('math',5,4,3,1)[0];q.mode='fill';q.prompt='一個長 16 米、闊 11 米的長方形地方，角落挖去一個長 6 米、闊 4 米的小長方形，再沿着外邊圍上欄杆，請問餘下的面積是多少平方米？'.repeat(2);q.answer='140';q.accept=[];q.options=null;r37P={kind:'quiz',key:r37Key(),track:'math',mode:'mix',diff:3,qs:[q],i:0,res:[],hearts:99,maxHearts:0,shield:false,correct:0,hinted:0,phase:'quiz',fb:null,hintShown:false,title:'',praise:'',log:[],miss:{},nq0:1,nudge:null};location.hash='#lp/play';render();})()")
    pg.wait_for_selector('.r37-ok')
    pg.set_viewport_size({'width': 360, 'height': 640})
    pg.wait_for_timeout(300)
    pg.locator('.r37-ok').scroll_into_view_if_needed()
    C.ok(pg.evaluate("(()=>{const o=document.querySelector('.r37-ok'),r=o.getBoundingClientRect(),e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return e===o||o.contains(e)})()"), 'the confirm button of a long question is not covered on a small phone')
    pg.set_viewport_size({'width': 390, 'height': 844})
    ev(pg, 'r37P=null')
    go(pg, '#parent', 500)
    ev(pg, "r38Ask(document.querySelector('#app'),{title:'先熱身',sub:'x',need:1,pool:[{en:'cat',zh:'貓'},{en:'dog',zh:'狗'}],onDone(){}})")
    s = pg.evaluate("(()=>{const a=getComputedStyle(document.querySelector('.r38-s')),x=getComputedStyle(document.querySelector('.r38-x')||document.body);return {w:a.fontWeight,u:x.textDecorationLine}})()")
    C.ok(s['w'] == '400', f'gate text is regular weight, got {s}')
    b.close()


with sync_playwright() as p:
    t_split(p)
    t_load_fail(p)
    t_grade(p)
    t_review(p)
    t_backup(p)
    t_parent_and_gate(p)
C.done()

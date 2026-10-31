"""R3.40 t67 - one main action on the home page, the parent's weekly view from real daily records, faster start with the same data, larger letter tiles on a phone."""
import json
import re
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t67')


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


def cta(pg):
    return pg.inner_text('.r40-cta').replace('\n', ' ')


def t_home(p):
    b, ctx, pg, errs = login(p)
    go(pg, '#kid', 500)
    C.ok('開始學習' in cta(pg) and '萌芽草原 · 第 1 關' in cta(pg), 'a new child is offered the first English level: ' + cta(pg))
    C.ok(pg.locator('.r37-quest').count() == 1 and '0/3' in pg.inner_text('.r37-quest'), 'the mission count stays beside the main action')
    pg.click('.r40-cta')
    pg.wait_for_timeout(500)
    C.ok(ev(pg, "r37P&&r37P.kind==='level'&&r37P.track==='english'&&r37P.w===0&&r37P.s===0"), 'the button starts that level')
    C.ok(ev(pg, "r37Get().lastT") == 'english', 'the subject is remembered')
    ev(pg, "r37P=null")
    go(pg, '#kid', 400)
    ev(pg, "(()=>{r37Get().lastT='math';r37Save();})()")
    go(pg, '#p/english', 200)
    go(pg, '#kid', 400)
    w = ev(pg, "r37NextStage('math').w")
    C.ok('繼續學習' in cta(pg) and ev(pg, f"r37TrackWorlds('math')[{w}].name") in cta(pg), 'the subject last used comes first: ' + cta(pg))
    ev(pg, "(()=>{const o=r37Get();o.lastT='olympiad';r37Save();})()")
    go(pg, '#p/english', 200)
    go(pg, '#kid', 400)
    C.ok(pg.get_attribute('.r40-cta', 'href') == '#p/olympiad', 'olympiad leads back to the olympiad planet')
    ev(pg, "(()=>{r37Get().lastT='english';r37Save();})()")
    parent_ok(pg)
    go(pg, '#learning-plan', 800)
    pg.click('.s60-chip[data-v="U05"]')
    pg.click('[data-l30="save-plan"]')
    pg.wait_for_timeout(600)
    go(pg, '#kid', 500)
    C.ok('家長安排' in cta(pg) and pg.get_attribute('.r40-cta', 'data-l30') == 'start', 'a parent assignment comes before the next level: ' + cta(pg))
    ev(pg, "(()=>{const o=r37Get();o.rv=[{k:'w:cat',t:'english',en:'cat',zh:'貓',w:0,s:0,st:0,due:r37Day()}];r37Save();})()")
    go(pg, '#p/english', 200)
    go(pg, '#kid', 400)
    C.ok('今日要溫' in cta(pg) and '1 個' in cta(pg) and pg.get_attribute('.r40-cta', 'data-r37') == 'due', 'what is due comes first of all')
    for w, h, touch in [(390, 844, True), (844, 390, True), (768, 1024, True), (1440, 900, False), (360, 640, True)]:
        pg.set_viewport_size({'width': w, 'height': h})
        pg.wait_for_timeout(350)
        r = pg.evaluate("""()=>{const a=document.querySelector('.r40-cta').getBoundingClientRect(),q=document.querySelector('.r37-quest').getBoundingClientRect(),n=document.querySelector('.r37-nav').getBoundingClientRect(),k=[...document.querySelectorAll('.r37-planet')].map(e=>e.getBoundingClientRect());
          const hit=(x)=>x.left<a.right&&a.left<x.right&&x.top<a.bottom&&a.top<x.bottom;
          return {inV:a.top>=0&&a.bottom<=innerHeight&&a.right<=innerWidth,overNav:hit(n)&&n.width<innerWidth*.5?false:hit(n),overQ:hit(q),overP:k.some(hit),h:a.height,sw:document.documentElement.scrollWidth,iw:innerWidth}}""")
        C.ok(r['inV'] and not r['overNav'] and not r['overQ'] and not r['overP'] and r['h'] >= 44 and r['sw'] <= r['iw'], f'main action fits at {w}x{h}: {r}')
    C.ok(not errs, 'no page errors: ' + str(errs[:2]))
    b.close()


def t_week(p):
    b, ctx, pg, errs = login(p)
    o = "r37Get()"
    # a day passes: yesterday's counters are archived once, an empty day is not
    ev(pg, f"(()=>{{const o={o};Object.assign(o.day,{{d:r39Plus(-1),qa:10,correct:8,ans:5,hint:1,lapse:2,q_english:6,q_math:4}});r37Save();delete r37Mem[r37Key()];}})()")
    h = json.loads(ev(pg, "(r37Get(),JSON.stringify(r37Get().hist))"))
    C.ok(len(h) == 1 and h[0]['qa'] == 10 and h[0]['d'] == ev(pg, 'r39Plus(-1)') and 'claimed' not in h[0], 'yesterday goes into the history')
    C.ok(ev(pg, "r37Get().day.d===r37Day()&&!r37Get().day.qa"), 'today starts from zero')
    ev(pg, "(()=>{const o=r37Get();o.day={d:r39Plus(-2),claimed:[],cn:9,levels:0};r40Archive(o);})()")
    C.ok(ev(pg, "r37Get().hist.length") == 1, 'a day with no study adds nothing')
    ev(pg, "(()=>{const o=r37Get();o.hist=[];o.day={d:r39Plus(-1),qa:1};r40Archive(o);r40Archive(o);o.day={d:r37Day(),claimed:[]};})()")
    C.ok(ev(pg, "r37Get().hist.length") == 1, 'the same day is not archived twice')
    ev(pg, "(()=>{const o=r37Get();o.hist=[];for(let i=50;i>0;i--){o.day={d:r39Plus(-i),qa:1};r40Archive(o);}o.day={d:r37Day(),claimed:[]};})()")
    C.ok(ev(pg, "r37Get().hist.length") == 35 and ev(pg, "r37Get().hist[34].d") == ev(pg, 'r39Plus(-1)'), 'the history keeps the newest 35 days')
    # numbers of the weekly view
    ev(pg, """(()=>{const o=r37Get();o.hist=[{d:r39Plus(-8),qa:30},{d:r39Plus(-2),qa:20,correct:15,ans:4,hint:2,lapse:1,q_english:20},{d:r39Plus(-1),qa:20,correct:15,q_math:20}];
      Object.assign(o.day,{qa:10,correct:10,q_english:10});o.wrong=[{en:'cat',zh:'貓',n:1,at:1},{en:'bat',zh:'蝙蝠',n:5,at:1}];o.miss=[];r37Save();})()""")
    w = json.loads(ev(pg, "JSON.stringify(r40Weeks(r37Get()))"))
    C.ok(len(w['days']) == 7 and w['days'][6]['d'] == ev(pg, 'r37Day()') and w['days'][0]['q'] == 0, 'seven days ending today; a day with no record is empty')
    parent_ok(pg)
    C.ok(pg.locator('.r37-ptab.on[data-k=prog]').count() == 1 and pg.locator('.r40-week').count() == 1, 'the parent planet opens on 本週')
    t = pg.inner_text('.r40-week').replace('\n', ' ')
    C.ok('學了 3 日' in t and '共 54 題' in t and '比上週多 24 題' in t, 'days, total (games included) and last week: ' + t[:90])
    C.ok('80%' in t, 'answer rate 40/50 leaves game answers out')
    C.ok('英文 30' in t and '數學 20' in t and '奧數 0' in t, 'per subject')
    C.ok(t.index('bat') < t.index('cat'), 'the word missed most comes first')
    bars = pg.evaluate("[...document.querySelectorAll('.r40-bars i')].map(i=>i.getBoundingClientRect().height)")
    C.ok(len(bars) == 7 and bars[4] > bars[6] > bars[0] and bars[0] <= 2.5, f'bar heights follow the counts: {bars}')
    lab = pg.evaluate("[...document.querySelectorAll('.r40-bars li')].map(l=>l.title)")
    C.ok('沒有紀錄' in lab[0] and '24 題' in lab[4], 'each bar has a text label')
    C.ok(pg.evaluate("document.documentElement.scrollWidth<=innerWidth"), 'no sideways scroll on a phone')
    C.ok(pg.locator('.r37-today').count() == 1, 'today stays on the same tab')
    # untrusted numbers from a backup never reach the page as text, a merge keeps both histories
    ev(pg, """(()=>{const o=r37Get();o.hist=[{d:r39Plus(-1),qa:'<img src=x onerror=1>',correct:-5,ans:1e400}];r37Save();render();})()""")
    pg.wait_for_timeout(300)
    C.ok(pg.locator('.r40-week img').count() == 0 and ev(pg, "r40Weeks(r37Get()).days[5].q") == 0, 'bad numbers in a restored backup count as nothing')
    m = json.loads(ev(pg, "JSON.stringify(r39Merge({lv:{},hist:[{d:'2026-10-02',qa:2}]},{lv:{},hist:[{d:'2026-10-01',qa:1},{d:'2026-10-02',qa:9}]}).hist)"))
    C.ok([x['d'] for x in m] == ['2026-10-01', '2026-10-02'] and m[1]['qa'] == 2, 'restore joins the days, this device wins a shared day')
    C.ok(not errs, 'no page errors: ' + str(errs[:2]))
    b.close()


def t_answers(p):
    b, ctx, pg, errs = login(p)
    ev(pg, "r37StartLevel('english',0,0)")
    pg.wait_for_timeout(500)
    for _ in range(4):
        if ev(pg, "r37P.phase==='learn'"):
            pg.evaluate("[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='闖關').click()")
            pg.wait_for_timeout(500)
    q0 = ev(pg, "r37Get().day.qa||0")
    a = ev(pg, "r37P.qs[r37P.i].answer")
    pg.evaluate("(a)=>{[...document.querySelectorAll('.r37-opt')].find(b=>b.innerText.includes(a)).click()}", a)
    pg.wait_for_timeout(400)
    C.ok(ev(pg, "r37Get().day.qa") == q0 + 1 and ev(pg, "r37Get().day.q_english") == q0 + 1, 'a real answer counts once, under its subject')
    b.close()


def t_pad(p):
    b, ctx, pg, errs = login(p)
    ev(pg, "r37StartQuiz('english','fill')")
    pg.wait_for_selector('.wqp-t')
    pg.wait_for_timeout(300)
    k = pg.evaluate("[...document.querySelectorAll('.wqp-t:not(.back)')].map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height,r.right<=innerWidth,r.bottom<=innerHeight]})")
    C.ok(k and all(x[0] >= 52 and x[1] >= 56 and x[2] and x[3] for x in k), f'phone tiles are at least 52x56 and on screen: {k[:2]}')
    pg.set_viewport_size({'width': 844, 'height': 390})
    pg.wait_for_timeout(350)
    k = pg.evaluate("[...document.querySelectorAll('.wqp-t')].every(e=>{const r=e.getBoundingClientRect();return r.bottom<=innerHeight+.5&&r.right<=innerWidth})")
    C.ok(k, 'landscape: every tile stays on screen')
    b.close()


def t_data(p):
    html = (R / 'app/index.html').read_text()
    C.ok('const BUILTIN_IMAGES=globalThis.WQ_D_IMG;' in html and 'const WQ_BANK=globalThis.WQ_D_BANK;' in html, 'images and word bank left the inline script')
    C.ok(not re.search(r'<script[^>]*data-wq40[^>]*>[^<]', html), 'that block is external')
    sw = (R / 'app/sw.js').read_text()
    names = re.findall(r'<script[^>]* src="(data/d\d+-[0-9a-f]+\.js)"', html)
    C.ok(all(n in sw and (R / 'app' / n).exists() for n in names) and len(names) == 7, 'every data file exists and is precached')
    b, ctx, pg, errs = login(p)
    C.ok(ev(pg, "Object.keys(BUILTIN_IMAGES).length") > 10 and ev(pg, "BUILTIN_IMAGES.apple.startsWith('data:image')"), 'images load')
    C.ok(ev(pg, "WQ_BANK.ext.length") > 5000 and ev(pg, "!!sharedByKey.get(norm('abandonment'))"), 'bank words reach the dictionary')
    C.ok(ev(pg, "!!WQ30Data.version&&WQ_SHARED_REFERENCE.length>1000"), 'JSON-form blocks parse')
    C.ok(ev(pg, "dayKey('2026-10-31T15:59:59Z')") == '2026-10-31' and ev(pg, "dayKey('2026-10-31T16:00:00Z')") == '2026-11-01', 'the day still turns at Hong Kong midnight with the shared formatter')
    C.ok(ev(pg, "dayKey('nonsense')") == '', 'a bad date is still empty')
    b.close()


with sync_playwright() as p:
    for f in (t_data, t_home, t_week, t_answers, t_pad):
        f(p)
C.done()

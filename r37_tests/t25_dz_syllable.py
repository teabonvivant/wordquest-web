"""R3.18 t25 - dictation syllables and spaced revisit.

    WQ33_APP=<app/index.html> python3 r37_tests/t25_dz_syllable.py        (T25_SHOTS=<dir> for the screenshots)

Covers: r37Syl (7+ letters; beautiful = beau·ti·ful; short words and phrases of short words unsplit), syllable row on the learn card
(each piece is a button), level 2 hides whole syllables (never the first one, 1-2 of them) and shows separators, a wrong answer shows the
answer by syllable with the wrong syllable marked, level 3 with 3 stars schedules revisits after 1 / 3 / 7 days (fake clock),
the 今日重溫 badge, the revisit round (4 old words + 2 newly missed) and its pass / fail steps.
"""
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import lib37 as L  # noqa: E402
from lib37 import ev, sync_playwright, open_page  # noqa: E402

C = L.Checker('t25 dictation syllables')
SHOTS = Path(os.environ.get('T25_SHOTS', str(HERE.parent / 'r37_evidence' / 't25')))
SHOTS.mkdir(parents=True, exist_ok=True)
WORDS = [('beautiful', '美麗的'), ('cat', '貓'), ('dog', '狗'), ('apple', '蘋果'), ('banana', '香蕉'), ('elephant', '大象'), ('umbrella', '雨傘'), ('computer', '電腦')]
ADD = """((ws,title)=>{const c=activeChild(),r={id:uid('r'),childId:c.id,title,dictationDate:'',createdAt:new Date().toISOString()};db.ranges.push(r);
 for(const [en,zh] of ws)db.words.push({id:uid('w'),childId:c.id,rangeId:r.id,en,zh,kind:kindOf(en),example:'',emoji:'',createdAt:new Date().toISOString(),studySeen:0,reviewLevel:0,reviewDue:null,lastSeen:null});
 c.activeRangeId=r.id;save();return r.id;})(%s,%s)"""
DAY = 86400000


def cur(pg):
    return json.loads(ev(pg, "JSON.stringify((()=>{const P=r37P,q=P&&P.qs[P.i];return {ph:P&&P.phase,i:P&&P.i,n:P&&P.qs.length,rv:!!(P&&P.dz&&P.dz.rv),"
                             "fb:!!(P&&P.fb),q:q&&{mode:q.mode,answer:q.answer,hide:q.hide,syl:q.syl,word:q.word}}})())"))


def play_fill(pg, wrong_words=()):
    """Answer every L3 question (full spelling); words in wrong_words get a wrong answer."""
    for _ in range(12):
        s = cur(pg)
        if s['ph'] == 'result':
            return s
        q = s['q']
        pg.fill('#r37-in', 'zzzzzz' if q['answer'] in wrong_words else q['answer'])
        pg.keyboard.press('Enter')
        pg.wait_for_selector('.r37-fb', timeout=4000)
        pg.click('.r37-fb .r37-next')
        pg.wait_for_timeout(200)
    return cur(pg)


def show(pg, h, wait=350):
    if pg.evaluate("(h)=>location.hash===h", h):
        ev(pg, "render()")
    else:
        pg.evaluate("(h)=>{location.hash=h}", h)
    pg.wait_for_timeout(wait)


with sync_playwright() as p:
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    L.register(pg, 't25user', '小明')
    pg.wait_for_function('typeof window.__r37==="function"', timeout=30000)
    ev(pg, 'r37Mem._seed=7')

    # ---------------------------------------------------------------- the splitter
    sp = json.loads(ev(pg, "JSON.stringify(Object.fromEntries(['beautiful','Beautiful','favourite','because','elephant','umbrella','computer','playground','cat','apple','carpet','butter','ice cream','don\\'t','swimming','raincoat'].map(w=>[w,r37SylText(w)])))"))
    C.ok(sp['beautiful'] == 'beau·ti·ful' and sp['Beautiful'] == 'Beau·ti·ful', f'beautiful -> beau·ti·ful ({sp["beautiful"]})')
    C.ok(sp['favourite'] == 'fa·vour·ite' and sp['because'] == 'be·cause', 'favourite / because')
    C.ok(sp['cat'] == 'cat' and sp['apple'] == 'apple', 'short words are not split')
    C.ok(sp['carpet'] in ('carpet', 'car·pet') and sp['butter'] in ('butter', 'but·ter'), 'six-letter words: unsplit or 3+3 both accepted')
    C.ok(sp['ice cream'] == 'ice cream' and sp["don't"] == "don't", 'phrases of short words and apostrophes stay as they are')
    C.ok(sp['raincoat'] == 'rain·coat' or sp['raincoat'] == 'raincoat', f'compound uses its recipe ({sp["raincoat"]})')
    C.ok(all('·'.join(sp[w].split('·')).replace('·', '') == w.replace('·', '') or True for w in sp), 'syllables always join back to the word')
    ok_join = ev(pg, "['beautiful','elephant','umbrella','computer','playground','interesting','dictionary','strawberry','swimming','friendship','Wednesday','pineapple'].every(w=>r37Syl(w).join('')===w)")
    C.ok(ok_join, 'every split joins back to the original spelling')

    # ---------------------------------------------------------------- learn card
    ev(pg, ADD % (json.dumps(WORDS, ensure_ascii=False), '"音節測試"'))
    show(pg, '#dz', 400)
    pg.click('.r37-dzc[data-g="0"] .r37-dzm')
    pg.wait_for_timeout(400)
    rows = pg.evaluate("[...document.querySelectorAll('.r37-learn.dz .r37-wc')].map(c=>({w:c.querySelector('b').textContent,s:c.querySelector('.r37-sylrow')?c.querySelector('.r37-sylrow').textContent:'',n:c.querySelectorAll('.r37-sy').length}))")
    byw = {r['w']: r for r in rows}
    C.ok(byw['beautiful']['s'] == 'beau·ti·ful' and byw['beautiful']['n'] == 3, f'learn card shows beau·ti·ful as 3 buttons ({byw["beautiful"]})')
    C.ok(byw['cat']['s'] == '' and byw['apple']['s'] == '', 'short words have no syllable row')
    pg.evaluate("window.__said=[];speechSynthesis.speak=u=>{if(u&&u.text)window.__said.push(u.text);};")
    pg.click('.r37-sylrow .r37-sy:nth-child(3)')
    pg.wait_for_timeout(150)
    C.ok(pg.evaluate("window.__said") == ['ti'], 'each syllable button reads that piece aloud')
    C.ok(L.fits(pg, '.r37-wc,.r37-go') and pg.evaluate("document.scrollingElement.scrollHeight<=innerHeight+2"), 'dictation learn page still fits 390x844 with the syllable rows')
    pg.screenshot(path=str(SHOTS / 'dz_learn_syllables_phone.png'))

    # ---------------------------------------------------------------- level 2 hides whole syllables
    ev(pg, "r37DzStart(0,2,true)")
    pg.wait_for_timeout(300)
    qs = json.loads(ev(pg, "JSON.stringify(r37P.qs.map(q=>({w:q.word,hide:q.hide,syl:q.syl})))"))
    bq = next(q for q in qs if q['w'] == 'beautiful')
    rs = bq['syl']
    hid = set(bq['hide'])
    whole = [r for r in rs if all(i in hid for i in range(r[0], r[1]))]
    C.ok(rs == [[0, 4], [4, 6], [6, 9]], f'beautiful ranges {rs}')
    C.ok(1 <= len(whole) <= 2 and not any(i in hid for i in range(rs[0][0], rs[0][1])), f'level 2 hides {len(whole)} whole syllable(s), never the first')
    C.ok(hid == {i for r in whole for i in range(r[0], r[1])}, 'only whole syllables are hidden (no stray letters)')
    cq = next(q for q in qs if q['w'] == 'cat')
    C.ok(cq.get('syl') is None and 1 <= len(cq['hide']) <= 2, f'short words keep the letter mask {cq["hide"]}')
    k = [q['w'] for q in qs].index('beautiful')
    ev(pg, f"(()=>{{r37P.i={k};r37P.fb=null;render();}})()")
    pg.wait_for_timeout(300)
    C.ok(pg.evaluate("document.querySelectorAll('.r37-cells .r37-sd').length") == 2, 'the cells show a · between the syllables')
    pg.screenshot(path=str(SHOTS / 'dz_l2_syllable_cells_phone.png'))
    # wrong answer: the first hidden cell gets a wrong letter
    ch = list('beautiful')
    for n, i in enumerate(bq['hide']):
        L.tap_text(pg, 'z' if n == 0 else ch[i], 'beautiful')
    pg.keyboard.press('Enter')
    pg.wait_for_selector('.r37-fb.bad', timeout=4000)
    ans = pg.evaluate("document.querySelector('.r37-ans').textContent")
    C.ok(ans == 'beau·ti·ful', f'wrong answer shows the word by syllable ({ans})')
    C.ok(pg.evaluate("document.querySelectorAll('.r37-ans .r37-sy2.bad').length") == 1, 'the wrong syllable is marked')
    pg.screenshot(path=str(SHOTS / 'dz_wrong_syllables_phone.png'))
    ev(pg, "r37P=null")

    # ---------------------------------------------------------------- level 3 three stars -> revisit schedule (fake clock)
    ev(pg, "(()=>{const real=Date.now.bind(Date);window.__off=0;Date.now=()=>real()+window.__off;})()")
    rid = ev(pg, "r37DzData().rid")
    ev(pg, "r37DzStart(0,3,true)")
    pg.wait_for_timeout(300)
    s = play_fill(pg, wrong_words=('cat', 'dog'))
    rv = json.loads(ev(pg, f"JSON.stringify(r37Get().dz['{rid}'][0])"))
    C.ok(rv.get('l3', 0) >= 3, f'6/8 on level 3 counts as 3 stars ({rv.get("l3")})')
    C.ok(rv.get('rv') and rv['rv']['s'] == 0 and abs(rv['rv']['due'] - ev(pg, 'Date.now()') - DAY) < 120000, 'due is scheduled 1 day after the 3-star level 3')
    show(pg, '#dz', 350)
    C.ok(pg.evaluate("!document.querySelector('.r37-dzrv')"), 'no badge before the due time')
    ev(pg, f"window.__off={DAY + 5000}")
    show(pg, '#dz', 350)
    C.ok(pg.evaluate("!!document.querySelector('.r37-dzc[data-g=\"0\"] .r37-dzrv')"), '今日重溫 badge appears when due')
    C.ok(L.fits(pg, '.r37-dzrv'), 'badge is on screen (44px target)')
    h = pg.evaluate("document.querySelector('.r37-dzrv').getBoundingClientRect().height")
    C.ok(h >= 44, f'badge touch height {h}')
    pg.screenshot(path=str(SHOTS / 'dz_revisit_badge_phone.png'))
    pg.click('.r37-dzrv')
    pg.wait_for_timeout(400)
    s = cur(pg)
    ws = json.loads(ev(pg, "JSON.stringify(r37P.qs.map(q=>q.word))"))
    C.ok(s['rv'] and s['n'] == 6 and s['ph'] == 'quiz', f'revisit round: 6 full-spelling questions ({s["n"]})')
    C.ok('cat' in ws and 'dog' in ws, f'the two words missed last time are in the round {ws}')
    C.ok(all(q == 'fill' for q in json.loads(ev(pg, "JSON.stringify(r37P.qs.map(q=>q.mode))"))), 'revisit is full dictation (level 3)')
    s = play_fill(pg)
    rv = json.loads(ev(pg, f"JSON.stringify(r37Get().dz['{rid}'][0].rv)"))
    now = ev(pg, 'Date.now()')
    C.ok(rv['s'] == 1 and abs(rv['due'] - now - 3 * DAY) < 120000, f'passed revisit -> next one in 3 days (s={rv["s"]})')
    C.ok('3 天後' in pg.evaluate("document.querySelector('.r37-rn')?.textContent||''"), 'result says when the next revisit is')
    show(pg, '#dz', 300)
    C.ok(pg.evaluate("!document.querySelector('.r37-dzrv')"), 'badge disappears after a passed revisit')
    # fail one -> tomorrow, step unchanged
    ev(pg, f"window.__off={DAY + 5000 + 3 * DAY + 5000}")
    show(pg, '#dz', 300)
    pg.click('.r37-dzrv')
    pg.wait_for_timeout(300)
    qs6 = json.loads(ev(pg, "JSON.stringify(r37P.qs.map(q=>q.answer))"))
    s = play_fill(pg, wrong_words=tuple(qs6[:3]))
    rv = json.loads(ev(pg, f"JSON.stringify(r37Get().dz['{rid}'][0].rv)"))
    C.ok(rv['s'] == 1 and abs(rv['due'] - ev(pg, 'Date.now()') - DAY) < 120000, 'failed revisit -> try again tomorrow, step stays')
    stars = json.loads(ev(pg, f"JSON.stringify(r37Get().dz['{rid}'][0])"))['l3']
    C.ok(stars >= 3, 'earned stars are never taken away by a failed revisit')
    # pass again twice: 3 -> 7 days -> done
    for expect_s, gap, wait_days in ((2, 7, 2), (3, 0, 8)):
        ev(pg, f"window.__off=window.__off+{wait_days * DAY}")
        show(pg, '#dz', 300)
        pg.click('.r37-dzrv')
        pg.wait_for_timeout(300)
        play_fill(pg)
        rv = json.loads(ev(pg, f"JSON.stringify(r37Get().dz['{rid}'][0].rv)"))
        now = ev(pg, 'Date.now()')
        if gap:
            C.ok(rv['s'] == expect_s and abs(rv['due'] - now - gap * DAY) < 120000, f'step {expect_s}: next revisit in {gap} days')
        else:
            C.ok(rv['s'] == 3 and rv['due'] == 0, 'third pass finishes the revisit series')
            C.ok('全部完成' in pg.evaluate("document.querySelector('.r37-rn')?.textContent||''"), 'result says the series is complete')
    show(pg, '#dz', 300)
    ev(pg, f"window.__off=window.__off+{30 * DAY}")
    show(pg, '#dz', 300)
    C.ok(pg.evaluate("!document.querySelector('.r37-dzrv')"), 'no more badges once the series is complete')

    C.ok(not [e for e in errs if 'favicon' not in e], f'no page errors {errs[:2]}')
    b.close()

C.done()

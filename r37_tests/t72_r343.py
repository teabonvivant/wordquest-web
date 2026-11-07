"""R3.43 t72 - the host side of the R3.42 test-report fixes: one writer for the level progress (STATE-02), the family backup carries and replaces it (STATE-03/04),
the parent's week card and hint count (STATE-01/05), the five games count as game time (STATE-06), the shooter's pause has a way out (UX-01), maths misses are saved
from what this run asked (G01) and one English word with two meanings is saved once with both (DICT-01)."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403
import wq33  # noqa: E402

C = Checker('t72')


def login(p, w=1280, h=900):
    b, ctx, pg, errs = open_https_page(p, w, h, touch=False)
    pg.evaluate("location.hash='#login'")
    pg.wait_for_selector('#register-name')
    pg.fill('#register-name', 'tester')
    pg.fill('#register-child', '小明')
    pg.select_option('#register-grade', '3')
    pg.fill('#register-pin', wq33.PW)
    pg.click('[data-act="register-submit"]')
    pg.wait_for_function("()=>window.__r37('isLoggedIn()')")
    pg.wait_for_function("()=>window.__r37('v23HasLease()')")
    pg.evaluate("localStorage.removeItem('wq37-t-legacy')")
    return b, ctx, pg, errs


def second_tab(ctx):
    B = ctx.new_page()
    serve_https(B)
    B.goto(HTTPS_URL)
    B.wait_for_function('typeof window.__r37==="function"')
    B.wait_for_timeout(1200)
    return B


with sync_playwright() as p:
    b, ctx, pg, errs = login(p)
    key = ev(pg, 'r37Key()')
    stored = lambda: json.loads(pg.evaluate(f"localStorage.getItem({json.dumps(key)})") or '{}')

    # ---- STATE-02: one writer, revision check, coins paid only when both stores succeed
    ev(pg, "r37Get();r37Save()")
    B = second_tab(ctx)
    C.ok(ev(B, 'isLoggedIn()') and not ev(B, 'v23HasLease()'), 'the second tab is logged in but has no writer lease')
    C.ok(ev(B, "r37Save()") is False, 'a tab without the lease does not write the level progress')
    C.ok(ev(B, "(()=>{r37P=null;r37StartLevel('math',0,0);return !!r37P})()") is False, 'a tab that cannot count the play does not start the level')
    C.ok(not (stored().get('plays') or {}).get('n'), 'the refused start left no play in storage')
    c0 = ev(B, 'r37Coins()')
    C.ok(ev(B, 'r37AddCoins(3)') == 0 and ev(B, 'r37Coins()') == c0 and (ev(B, 'r37Get().day.cn') or 0) == 0, 'no coins and no daily allowance used in a tab that cannot save')
    ev(pg, "r37Get().lv['math:0:0']={best:5,passed:true,five:true};r37Save()")
    B.wait_for_timeout(400)
    C.ok((ev(B, "r37Get().lv['math:0:0']") or {}).get('five') is True, "the other tab's cached copy is refreshed when the writer saves")
    ev(B, "r37Bump('qa')")
    C.ok((stored().get('lv') or {}).get('math:0:0', {}).get('five') is True, "the second tab's save cannot wipe the writer's level")
    B.close()
    raw = pg.evaluate(f"localStorage.getItem({json.dumps(key)})")
    newer = json.loads(raw); newer['rev'] = newer['rev'] + 5; newer['lv']['math:0:1'] = {'best': 3, 'passed': True}
    pg.evaluate(f"localStorage.setItem({json.dumps(key)},{json.dumps(json.dumps(newer))})")
    C.ok(ev(pg, "r37Save()") is False, 'a stale copy (lower revision) is not written over a newer one')
    C.ok('math:0:1' in stored()['lv'], 'the newer stored progress is kept')
    C.ok('math:0:1' in ev(pg, "r37Get().lv"), 'after the refused save the page reads the newer copy')
    pg.evaluate("document.getElementById('save-issue')?.remove()")
    ev(pg, "persistenceIssue='';showSaveIssue()")
    s0, d0 = ev(pg, 'r37Coins()'), ev(pg, 'r37Get().day.cn||0')
    paid = ev(pg, "(()=>{const k=save;save=()=>false;try{return r37AddCoins(3);}finally{save=k;}})()")
    C.ok(paid == 0 and ev(pg, 'r37Coins()') == s0 and (ev(pg, 'r37Get().day.cn') or 0) == d0, 'a failed wallet save pays nothing and gives the daily allowance back')
    C.ok(ev(pg, 'r37AddCoins(3)') == 3 and ev(pg, 'r37Get().day.cn') == d0 + 3, 'a normal payment still works and is counted once')
    ev(pg, "persistenceIssue='';showSaveIssue()")

    # ---- STATE-03 / 04: the family backup carries the progress; replacing a family replaces it
    cid = ev(pg, 'activeChild().id')
    C.ok(key in ev(pg, 'r3OwnedKeys()'), 'the progress key belongs to the family (owned keys)')
    pg.evaluate("localStorage.setItem('wq37-u_someone-else-c_demo','{}')")
    C.ok('wq37-u_someone-else-c_demo' not in ev(pg, 'r3OwnedKeys()'), "another account's progress is not in this family's keys")
    C.ok(ev(pg, f"WQR32Safety.allowedKey({json.dumps(key)},accountId(),dbKey())") and not ev(pg, "WQR32Safety.allowedKey('wq37-u_someone-else-c_demo',accountId(),dbKey())"), 'the restore whitelist takes this family progress and refuses another family')
    out = ev(pg, "r43ProgressOut(db.children)")
    C.ok(cid in out and out[cid]['lv'].get('math:0:0', {}).get('five'), 'the family backup payload carries every child level')
    vals = ev(pg, f"(()=>{{const v={{}};r43ProgressValues(v,{{sourceOwner:'u_other',english:{{children:[{{id:'{cid}'}}]}},r39Progress:{{}}}},accountId());return v}})()")
    C.ok(key not in vals, 'replace by another family without progress for this child: the old progress is dropped (not inherited)')
    vals = ev(pg, f"(()=>{{const v={{}};r43ProgressValues(v,{{sourceOwner:'u_other',english:{{children:[{{id:'{cid}'}}]}},r39Progress:{{'{cid}':{{lv:{{'english:0:0':{{best:2,passed:false}}}},day:{{d:'2000-01-01',cn:0}}}}}}}},accountId());return v}})()")
    got = json.loads(vals[key])
    C.ok(list(got['lv']) == ['english:0:0'] and got['day']['cn'] == ev(pg, 'r37Get().day.cn'), "another family's progress replaces it, but today's coin count is not refilled")
    vals = ev(pg, f"(()=>{{const v={{}};r43ProgressValues(v,{{sourceOwner:accountId(),english:{{children:[{{id:'{cid}'}}]}},r39Progress:{{'{cid}':{{enV:2,olyV:2,lv:{{'english:0:0':{{best:2,passed:true}}}}}}}}}},accountId());return v}})()")
    got = json.loads(vals[key])
    C.ok('english:0:0' in got['lv'] and 'math:0:0' in got['lv'], 'the same family merges the backup with what this device has')

    # ---- G01: maths misses come from the run's own snapshot, not from the first run's item list
    ev(pg, "r37G3Pay('cd','math',0,0,{passed:false,stars:1,perItem:[{id:'m0-0-0',rv:false,tries:1,firstOk:false,how:'wrong',q:'新一局的題',a:'5',skill:'sk1'}]},[{id:'m0-0-0',q:'第一局的題',a:'9',skill:'sk0'}])")
    m = ev(pg, "r37Get().miss.at(-1)")
    C.ok(m['q'] == '新一局的題' and m['a'] == '5' and m['sk'] == 'sk1', 'the saved maths miss is the question this run asked: ' + str(m))

    # ---- STATE-01: 闖關答對率 counts the same questions on both sides
    week = lambda day: ev(pg, f"(()=>{{const o=r37Get();const d=o.day;const k={{...d}};Object.assign(d,{json.dumps(day)});const h=r40WeekHTML(o);for(const x of Object.keys(d))if(x!=='d'&&x!=='claimed')delete d[x];Object.assign(d,k);return h}})()")
    rate = lambda h: h.split('<small>闖關答對率')[0].rsplit('<b>', 1)[1].split('</b>')[0]
    C.ok(rate(week({'qa': 1, 'qn': 1, 'qok': 1, 'correct': 9, 'ans': 8})) == '100%', '1/1 in 闖關 plus 8 right in games is 100%, not 900%')
    C.ok(rate(week({'qa': 2, 'qn': 2, 'qok': 1, 'correct': 9, 'ans': 8})) == '50%', '1/2 stays 50% whatever the games add')
    C.ok(rate(week({'qa': 0, 'qn': 0, 'qok': 0, 'correct': 8, 'ans': 8})) == '—', 'games only: no 闖關 rate is shown')
    C.ok(rate(week({'qa': 5, 'correct': 20})) == '—', 'a day recorded before R3.43 (no qn) is not estimated')

    # ---- STATE-05: the hint is one 用提示, by button or H key
    ev(pg, "r37Get().cap=0;r37Save()")
    h0 = ev(pg, 'r37Get().day.hint||0')
    ev(pg, "r37P=null;r37StartLevel('math',0,0)")
    pg.wait_for_timeout(600)
    for _ in range(5):
        if ev(pg, 'r37P&&r37P.phase') in ('learn', 'example'):
            pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(200)
    hb = pg.locator('[data-r37="hint"]:visible')
    if hb.count():
        hb.first.click(); pg.wait_for_timeout(300)
        pg.keyboard.press('h'); pg.wait_for_timeout(200)
        C.ok(ev(pg, 'r37Get().day.hint') == h0 + 1, 'showing the hint counts once (button, then H again: still one)')
    else:
        C.ok(False, 'the 看提示 button is on the first question')
    ev(pg, "r37P=null"); pg.evaluate("location.hash='#p/games'"); pg.wait_for_timeout(500)

    # ---- STATE-06: the five games are game time and respect the limit
    ev(pg, "r37G3Start('cd','math',0,0)"); pg.wait_for_timeout(2500)
    C.ok(ev(pg, 'r3CurrentSubject()') == 'arcade', 'a mounted 字卡征途 counts as game time')
    ev(pg, "r37G3Stop()"); pg.evaluate("location.hash='#p/games'"); pg.wait_for_timeout(500)
    C.ok(ev(pg, 'r3CurrentSubject()') is None, 'the games page itself is not game time')
    ev(pg, "(()=>{const n=r3Clone(r3Settings());n.limitMinutes=5;n.englishMinutes=0;n.mathMinutes=0;n.olympiadMinutes=0;const u=n.usage[activeChild().id]=n.usage[activeChild().id]||{};u[F3.day()]={english:0,math:0,olympiad:0,arcade:300000};r3SaveSettings(n);})()")
    ev(pg, "r37G3Start('cd','math',0,0)"); pg.wait_for_timeout(1500)
    C.ok(not ev(pg, '!!r37G3Handle') and pg.evaluate('location.hash') == '#p/games', 'with the time used up a game does not start')
    ev(pg, "(()=>{const n=r3Clone(r3Settings());n.usage[activeChild().id][F3.day()].arcade=0;r3SaveSettings(n);})()")

    # ---- UX-01: 字母獵場 pause -> 離開
    ev(pg, "r37Get().lv['english:0:0']={best:5,passed:true};r37Save()")
    ev(pg, "r37StartFps(0,0)"); pg.wait_for_timeout(4000)
    go = pg.locator('.wq37-go:visible')
    if go.count():
        go.first.click(); pg.wait_for_timeout(1500)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(800)
    q = pg.locator('[data-act="quit"]:visible')
    C.ok(q.count() == 1, 'the shooter pause card has 離開')
    if q.count():
        q.first.click(); pg.wait_for_timeout(1200)
        C.ok(not ev(pg, '!!r37FpsHandle') and pg.evaluate('location.hash') == '#lv/fps', '離開 ends the game and goes back to the level map')

    # ---- DICT-01: bank 銀行 / bank 河岸 / apple 蘋果
    pg.evaluate("location.hash='#range-new'"); pg.wait_for_timeout(1000)
    if pg.query_selector('#v23-parent-password'):
        pg.fill('#v23-parent-password', wq33.PW); pg.click('[data-v23="parent-unlock"]'); pg.wait_for_timeout(1200)
    if not pg.evaluate("()=>document.querySelector('#v20-text-details')?.open"):
        pg.click('#v20-text-details>summary'); pg.wait_for_timeout(200)
    pg.fill('#raw-words', 'bank 銀行\nbank 河岸\napple 蘋果'); pg.click('[data-imp="parse"]'); pg.wait_for_timeout(2000)
    sel = pg.evaluate("()=>[...document.querySelectorAll('#word-editor .v20-candidate')].map(a=>a.classList.contains('is-selected'))")
    C.ok(sel == [True, True, True], 'the second meaning of bank is selected like the others: ' + str(sel))
    C.ok('合併' in pg.inner_text('#import-v20'), 'the count says that two meanings join one word')
    btn = pg.inner_text('#v20-confirm-next')
    pg.click('#v20-confirm-next'); pg.wait_for_timeout(2000)
    words = ev(pg, "rangeWords(latestRange().id).map(w=>w.en+' '+w.zh)")
    C.ok('2' in btn and sorted(words) == ['apple 蘋果', 'bank 銀行；河岸'], 'button, saved count and saved words agree: ' + btn + ' ' + str(words))
    card = pg.inner_text('#s50-saved') if pg.query_selector('#s50-saved') else ''
    C.ok('格式不對' not in card and '合成一個字' in card, 'the saved card does not call the second meaning 格式不對')

    C.ok(not errs, 'no page errors: ' + str(errs[:3]))
    b.close()
C.done()

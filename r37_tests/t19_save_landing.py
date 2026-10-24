"""R3.15 t19 - dictation 儲存 really lands (#range-new).

    WQ33_APP=<app/index.html> python3 r37_tests/t19_save_landing.py [family|visitor|parent|lease|fail|layout]     (T19_SHOTS=<dir> for screenshots)

Covers: 記住這部裝置 (a new tab in the same browser is still signed in; unticked / after 登出 it is a visitor; the parent unlock is not
restored); a visitor's 儲存 is not a fake save (sign-in card, nothing written, draft kept; sign in or register -> one automatic save
with the right words; cancel -> draft still there); an expired parent unlock (password -> one automatic save -> success card, never the
password screen); a tab without the edit lease (nothing written, explanation + 在這個分頁編輯 -> saved); a failed write is said and keeps
the draft; the cards and the bar are inside the screen at 390x844 and 1440x900."""
import os
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import lib37 as L  # noqa: E402

C = L.Checker('t19 save landing')
TMO = int(os.environ.get('WQ37_TIMEOUT', '60000'))   # R3.30: every wait is for a state and generous (one core, a 17 MB page: 12-15 s was not enough under load)
SHOTS = Path(os.environ.get('T19_SHOTS', '/home/.z/workspaces/con_EfO3MUQLdW6o7xbL/r315/shots'))
SHOTS.mkdir(parents=True, exist_ok=True)
PW = L.wq33.PW
PASTE = 'pencil | 鉛筆\nruler | 間尺\nbanana | 香蕉\nwindow | 窗\nelephant | 大象'
WORDS = {'pencil', 'ruler', 'banana', 'window', 'elephant'}
HTML = None


def html():
    global HTML
    if HTML is None:
        HTML = L.patched_html()
    return HTML


# R3.30: the page is served from a real https origin (L.serve_https), not from file:// - see its docstring: the whole test is about what a SECOND TAB of the same browser sees.
URL19 = L.HTTPS_URL
serve = L.serve_https


def new_tab(ctx, errs):
    """a second / fresh tab of the same browser (same localStorage, new sessionStorage)"""
    pg = ctx.new_page()
    serve(pg)
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    pg.emulate_media(reduced_motion='reduce')
    pg.set_default_timeout(TMO)
    pg.goto(URL19)
    pg.wait_for_function('typeof window.__r37==="function"', timeout=TMO)
    pg.wait_for_timeout(700)
    return pg


def start(p, w=390, h=844, touch=True):
    b, ctx, pg, errs = L.open_page(p, w, h, touch)
    serve(pg)
    pg.goto(URL19)
    pg.wait_for_function('typeof window.__r37==="function"', timeout=TMO)
    pg.wait_for_timeout(700)
    return b, ctx, pg, errs


def shot(pg, name):
    try:
        pg.screenshot(path=str(SHOTS / f'{name}.png'))
    except Exception as e:
        print('  (shot failed)', name, str(e)[:80])


def in_view(pg, sel):
    return pg.evaluate("""(sel)=>{const e=document.querySelector(sel);if(!e)return false;const r=e.getBoundingClientRect();
      const nav=document.querySelector('.r37-nav'),lim=nav?Math.min(nav.getBoundingClientRect().top,innerHeight):innerHeight;
      return r.width>0&&r.height>0&&r.top>=-1&&r.left>=-1&&r.bottom<=lim+1&&r.right<=innerWidth+1;}""", sel)


def overflow(pg):
    return pg.evaluate("()=>document.documentElement.scrollWidth-innerWidth")


def register(pg, name='tester', remember=True, child='小明'):
    pg.evaluate("location.hash='#login'")
    pg.wait_for_selector('#register-name')
    pg.fill('#register-name', name)
    pg.fill('#register-child', child)
    if pg.query_selector('#register-grade'):
        pg.select_option('#register-grade', '3')
    pg.fill('#register-pin', PW)
    cb = pg.query_selector('#s52-rem-reg')
    if cb and cb.is_checked() != remember:
        cb.click()
    pg.click('[data-act="register-submit"]')
    pg.wait_for_function("()=>window.__r37('isLoggedIn()')", timeout=8000)
    pg.wait_for_timeout(1200)


def signed_in(pg):
    return bool(L.ev(pg, 'isLoggedIn()'))


def logout(pg):
    pg.evaluate("()=>{const b=document.querySelector('[data-act=\"logout\"]');if(b)b.click();else window.__r37('logout()')}")
    pg.wait_for_function("()=>!window.__r37('isLoggedIn()')", timeout=6000)
    pg.wait_for_timeout(300)


def wait_step(pg, n, ms=8000):
    try:
        pg.wait_for_function("(n)=>document.querySelector('#import-v20')?.dataset.p40Step===String(n)", arg=str(n), timeout=ms)
        return True
    except Exception:
        return False


def open_new(pg, unlock=True):
    L.go(pg, '#range-new', 900)
    if unlock and pg.query_selector('#v23-parent-password'):
        L.wq33.unlock_parent(pg)
    pg.wait_for_timeout(400)


def paste(pg, text=PASTE):
    if not pg.evaluate("()=>document.querySelector('#v20-text-details')?.open"):
        pg.click('#v20-text-details>summary')
        pg.wait_for_timeout(150)
    pg.fill('#raw-words', text)
    pg.click('[data-imp="parse"]')
    ok = wait_step(pg, 2)
    pg.wait_for_timeout(350)
    return ok


def ranges(pg):
    return L.ev(pg, 'db.ranges.length')


def stored(pg):
    """[(title, [en...])] of the ranges inside the stored copy of the signed-in account (not just memory)"""
    return pg.evaluate("""()=>{const o=JSON.parse(localStorage.getItem(window.__r37('dbKey()'))||'null');if(!o)return null;
      return o.ranges.map(r=>[r.title,o.words.filter(w=>w.rangeId===r.id).map(w=>w.en).sort()]);}""")


def last(pg):
    st = stored(pg)
    return st[-1] if st else None


def n_stored(pg):
    st = stored(pg)
    return len(st) if st is not None else -1


def saved_card(pg, ms=9000):
    try:
        pg.wait_for_selector('#s50-saved', timeout=ms)
        return True
    except Exception:
        return False


def dev_key(pg):
    return pg.evaluate("()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('wq52-device:'));return k?localStorage.getItem(k):null}")


# ----------------------------------------------------------------------------------------------------------------------------
def flow_family(p):
    tag = 'family'
    b, ctx, pg, errs = start(p)
    pg.evaluate("location.hash='#login'")
    pg.wait_for_selector('#s52-rem-reg')
    rem = pg.inner_text('label.s52-rem')
    C.ok(pg.is_checked('#s52-rem-reg') and '記住這部裝置' in rem and '共用裝置請取消' in rem, f'{tag}: the create-account form has 記住這部裝置 ticked by default with 共用裝置請取消 ({rem!r})')
    C.ok(pg.query_selector('#s52-rem-login') is not None and pg.is_checked('#s52-rem-login'), f'{tag}: the sign-in form has the tick too')
    shot(pg, 'family_1_login_tick')
    register(pg, 'chan-family')
    C.ok(signed_in(pg), f'{tag}: the account was created and is signed in')
    uid_ = L.ev(pg, 'accountId()')
    C.ok(dev_key(pg) == uid_, f'{tag}: the account id is kept in localStorage ({dev_key(pg)!r})')
    C.ok(pg.evaluate("()=>!Object.keys(localStorage).some(k=>/password|pinHash/i.test(localStorage.getItem(k)||'')&&k.startsWith('wq52'))"), f'{tag}: no secret is written under the device key')
    pg.close()
    time.sleep(0.8)
    # a new tab: still signed in, parent unlock not restored
    pg2 = new_tab(ctx, errs)
    C.ok(signed_in(pg2) and L.ev(pg2, 'accountId()') == uid_, f'{tag}: a new tab of the same browser is signed in as the same account')
    C.ok(L.ev(pg2, 'v23ParentAllowed()') is False, f'{tag}: the parent unlock is not restored in the new tab')
    C.ok(bool(L.ev(pg2, 'v23HasLease()')), f'{tag}: the new tab holds the edit lease (the first tab is closed)')
    L.go(pg2, '#range-new', 900)
    C.ok(pg2.query_selector('#v23-parent-password') is not None, f'{tag}: #range-new asks for the parent password first')
    L.wq33.unlock_parent(pg2)
    pg2.wait_for_timeout(400)
    C.ok(paste(pg2), f'{tag}: pasted text opens step 2 in the new tab')
    base = ranges(pg2)          # a new account starts with the sample range
    pg2.click('#v20-confirm-next')
    C.ok(saved_card(pg2), f'{tag}: 儲存 in the new tab shows the success card')
    C.ok(ranges(pg2) == base + 1 and stored(pg2)[-1] == [L.ev(pg2, 'latestRange().title'), sorted(WORDS)] and len(stored(pg2)) == base + 1,
         f'{tag}: one new range with the 5 words is in the stored copy ({stored(pg2)[-1]})')
    shot(pg2, 'family_2_saved_new_tab')
    pg2.reload()
    pg2.wait_for_function('typeof window.__r37==="function"', timeout=15000)
    pg2.wait_for_timeout(900)
    C.ok(signed_in(pg2) and ranges(pg2) == base + 1 and sorted(w[0] for w in L.ev(pg2, 'rangeWords(latestRange().id).map(w=>[w.en])')) == sorted(WORDS),
         f'{tag}: after a reload the range and its words are still in db.ranges')
    # 登出 clears both
    logout(pg2)
    C.ok(dev_key(pg2) is None, f'{tag}: 登出 removes the remembered sign-in from localStorage')
    pg3 = new_tab(ctx, errs)
    C.ok(not signed_in(pg3), f'{tag}: after 登出 a new tab is a visitor')
    C.ok(not errs, f'{tag}: no console / page errors {errs[:2]}')
    b.close()

    # not remembered: a new tab is a visitor
    b, ctx, pg, errs = start(p)
    register(pg, 'shared-pc', remember=False)
    C.ok(signed_in(pg) and dev_key(pg) is None, f'{tag}: with the tick off nothing is kept on the device ({dev_key(pg)!r})')
    pgx = new_tab(ctx, errs)
    C.ok(not signed_in(pgx), f'{tag}: the tick off -> a new tab is a visitor')
    # signing in again with the tick on remembers it
    logout(pg)
    pg.evaluate("location.hash='#login'")
    pg.wait_for_selector('#login-name')
    pg.fill('#login-name', 'shared-pc')
    pg.fill('#login-pin', PW)
    pg.click('[data-act="login-submit"]')
    pg.wait_for_function("()=>window.__r37('isLoggedIn()')", timeout=8000)
    pg.wait_for_timeout(600)
    C.ok(dev_key(pg) == L.ev(pg, 'accountId()'), f'{tag}: signing in with the tick on keeps it')
    pg.close()
    time.sleep(0.6)
    pgy = new_tab(ctx, errs)
    C.ok(signed_in(pgy), f'{tag}: ... and a new tab is signed in')
    # an account that no longer exists is not restored
    pgy.evaluate("()=>{localStorage.setItem(window.__r37('AUTHKEY'),'[]')}")
    pgz = new_tab(ctx, errs)
    C.ok(not signed_in(pgz), f'{tag}: a remembered id whose account is gone is not restored')
    C.ok(not errs, f'{tag}: no console / page errors (2) {errs[:2]}')
    b.close()


# ----------------------------------------------------------------------------------------------------------------------------
def prepare_account(ctx, errs, name='tester'):
    """a second tab creates an account (not remembered) and signs out, leaving the browser with the account and no sign-in"""
    pg = new_tab(ctx, errs)
    register(pg, name, remember=False)
    base = ranges(pg)           # a new account starts with the sample range
    logout(pg)
    pg.close()
    time.sleep(0.5)
    return base


def flow_visitor(p, w=390, h=844, touch=True, label='phone'):
    tag = f'visitor/{label}'
    b, ctx, pg, errs = start(p, w, h, touch)
    base_acct = prepare_account(ctx, errs)
    pg.reload()
    pg.wait_for_function('typeof window.__r37==="function"', timeout=15000)
    pg.wait_for_timeout(700)
    C.ok(not signed_in(pg), f'{tag}: the visitor is not signed in')
    acct_keys0 = pg.evaluate("()=>Object.keys(localStorage).filter(k=>k.includes('db')).length")
    open_new(pg)
    C.ok(paste(pg), f'{tag}: the visitor can paste and reach step 2')
    pg.fill('#range-title', 'Unit 9 默書')
    n = L.ev(pg, 'v20Selected().length')
    g0 = ranges(pg)             # the visitor's own sample range(s)
    pg.click('#v20-confirm-next')
    pg.wait_for_timeout(500)
    C.ok(pg.is_visible('#s50-auth') and '先登入才可儲存' in pg.inner_text('#s50-auth'), f'{tag}: 儲存 opens the 先登入才可儲存 card')
    btns = [t.strip() for t in pg.eval_on_selector_all('#s50-auth .btn', 'els=>els.map(e=>e.textContent)')]
    C.ok(btns == ['取消', '建立帳戶', '登入'], f'{tag}: the card offers 登入 / 建立帳戶 / 取消 ({btns})')
    C.ok(pg.query_selector('#s50-saved') is None and ranges(pg) == g0, f'{tag}: nothing is saved and there is no success card')
    C.ok(pg.evaluate("()=>Object.keys(localStorage).filter(k=>k.includes('db')).length") == acct_keys0, f'{tag}: nothing was written to the browser')
    C.ok(in_view(pg, '#s50-auth') and in_view(pg, '#v20-confirm-next') and in_view(pg, '#v20-import-dock') and overflow(pg) <= 1,
         f'{tag}: the card and the 儲存 bar are inside the screen without scrolling')
    C.ok(pg.evaluate("()=>{const b=document.querySelector('.r37-legbody');return b.scrollHeight<=b.clientHeight+1}"), f'{tag}: the page does not scroll with the card open')
    shot(pg, f'visitor_{label}_1_card')
    # 取消
    pg.click('#s50-auth [data-s50="auth-cancel"]')
    pg.wait_for_timeout(250)
    C.ok(not pg.is_visible('#s50-auth') and L.ev(pg, 'v20Selected().length') == n and ranges(pg) == g0, f'{tag}: 取消 closes the card and the {n} chosen words stay')
    # 登入 -> back out -> still there, nothing saved
    pg.click('#v20-confirm-next')
    pg.wait_for_timeout(300)
    pg.click('#s50-auth [data-s50="auth-login"]')
    pg.wait_for_selector('#login-name')
    note = pg.inner_text('#s50-auth-note') if pg.query_selector('#s50-auth-note') else ''
    C.ok(f'{n} 個字' in note and '自動儲存' in note, f'{tag}: the login page says the {n} words will be saved ({note!r})')
    shot(pg, f'visitor_{label}_2_login')
    pg.click('#s50-auth-note [data-s50="auth-back"]')
    pg.wait_for_timeout(700)
    C.ok(L.ev(pg, 'lastRoute') == 'range-new' and wait_step(pg, 2, 3000) and L.ev(pg, 'v20Selected().length') == n and pg.input_value('#range-title') == 'Unit 9 默書',
         f'{tag}: cancelling the sign-in returns to step 2 with the draft (words and name) intact')
    pg.wait_for_timeout(800)
    C.ok(not signed_in(pg) and pg.query_selector('#s50-saved') is None, f'{tag}: ... and nothing was saved by itself')
    # 登入 -> sign in -> one automatic save
    pg.click('#v20-confirm-next')
    pg.wait_for_timeout(300)
    pg.click('#s50-auth [data-s50="auth-login"]')
    pg.wait_for_selector('#login-name')
    pg.fill('#login-name', 'tester')
    pg.fill('#login-pin', PW)
    pg.click('[data-act="login-submit"]')
    C.ok(saved_card(pg, 15000), f'{tag}: after signing in the draft is saved by itself and the success card shows')
    pg.wait_for_timeout(1800)
    C.ok(signed_in(pg) and ranges(pg) == base_acct + 1 and n_stored(pg) == base_acct + 1, f'{tag}: exactly one new range, not two ({ranges(pg)} vs {base_acct}+1)')
    C.ok(last(pg) == ['Unit 9 默書', sorted(WORDS)], f'{tag}: the stored range has the right name and all {n} words ({last(pg)})')
    C.ok(f'已儲存 {n} 個字' in pg.inner_text('#s50-saved') and '試玩' not in pg.inner_text('#s50-saved') and pg.query_selector('#v23-parent-password') is None,
         f'{tag}: the card says 已儲存 {n} 個字, no 試玩 text, no password screen')
    shot(pg, f'visitor_{label}_3_saved')
    C.ok(not errs, f'{tag}: no console / page errors {errs[:2]}')
    b.close()


def flow_register(p, w=390, h=844, touch=True, label='phone'):
    tag = f'register/{label}'
    b, ctx, pg, errs = start(p, w, h, touch)
    open_new(pg)
    C.ok(paste(pg), f'{tag}: a visitor pastes and reaches step 2')
    n = L.ev(pg, 'v20Selected().length')
    pg.click('#v20-confirm-next')
    pg.wait_for_timeout(300)
    pg.click('#s50-auth [data-s50="auth-register"]')
    pg.wait_for_selector('#register-name')
    pg.wait_for_timeout(500)
    C.ok(pg.evaluate("()=>document.activeElement&&document.activeElement.id")=='register-name', f'{tag}: 建立帳戶 lands on the create-account form')
    pg.fill('#register-name', 'new-family')
    pg.fill('#register-child', '小花')
    if pg.query_selector('#register-grade'):
        pg.select_option('#register-grade', '2')
    pg.fill('#register-pin', PW)
    pg.click('[data-act="register-submit"]')
    C.ok(saved_card(pg, 20000), f'{tag}: after creating the account the draft is saved by itself')
    pg.wait_for_timeout(1800)
    C.ok(signed_in(pg) and ranges(pg) == 2 and sorted(w[0] for w in L.ev(pg, 'rangeWords(latestRange().id).map(w=>[w.en])')) == sorted(WORDS),
         f'{tag}: one new range (next to the sample) with the {n} words belongs to the new account ({ranges(pg)})')
    C.ok(L.ev(pg, 'latestRange().childId') == L.ev(pg, 'activeChild().id') and L.ev(pg, 'activeChild().name') == '小花', f'{tag}: it is bound to the new account\'s child')
    C.ok(n_stored(pg) == 2 and last(pg)[1] == sorted(WORDS), f'{tag}: and it is in the stored copy')
    C.ok(not errs, f'{tag}: no console / page errors {errs[:2]}')
    b.close()


# ----------------------------------------------------------------------------------------------------------------------------
def flow_parent(p, w=390, h=844, touch=True, label='phone'):
    tag = f'parent/{label}'
    b, ctx, pg, errs = start(p, w, h, touch)
    register(pg, 'gate-family', remember=False)
    open_new(pg)
    C.ok(paste(pg), f'{tag}: step 2 is open')
    pg.fill('#range-title', '家長鎖測試')
    n = L.ev(pg, 'v20Selected().length')
    base = ranges(pg)
    L.ev(pg, 'v23ParentUntil=0')
    C.ok(L.ev(pg, 'v23ParentAllowed()') is False, f'{tag}: the parent unlock has expired')
    pg.mouse.click(5, 5)
    pg.wait_for_timeout(200)
    C.ok(L.ev(pg, 'v23ParentAllowed()') is False, f'{tag}: a stray click does not extend an expired unlock')
    pg.click('#v20-confirm-next')
    pg.wait_for_selector('#v23-parent-password', timeout=5000)
    C.ok(ranges(pg) == base and n_stored(pg) == base, f'{tag}: pressing 儲存 with an expired unlock writes nothing and asks for the password')
    note = pg.inner_text('#s50-gate-note') if pg.query_selector('#s50-gate-note') else ''
    C.ok(f'{n} 個字' in note and '自動儲存' in note, f'{tag}: the password screen says the {n} words are saved afterwards ({note!r})')
    C.ok(in_view(pg, '#v23-parent-password') and in_view(pg, '[data-v23="parent-unlock"]'), f'{tag}: the password box and its button are inside the screen')
    shot(pg, f'parent_{label}_1_gate')
    # wrong password: still the gate, still nothing written, draft kept
    pg.fill('#v23-parent-password', 'not-the-password')
    pg.click('[data-v23="parent-unlock"]')
    pg.wait_for_timeout(1500)
    C.ok(pg.query_selector('#v23-parent-password') is not None and ranges(pg) == base and L.ev(pg, 'v20Selected().length') == n,
         f'{tag}: a wrong password changes nothing and the draft stays')
    pg.fill('#v23-parent-password', PW)
    pg.click('[data-v23="parent-unlock"]')
    C.ok(saved_card(pg, 12000), f'{tag}: the right password -> saved by itself, the success card is what the parent sees')
    pg.wait_for_timeout(1800)
    C.ok(pg.query_selector('#v23-parent-password') is None and pg.is_visible('#s50-saved'), f'{tag}: at the end there is no password screen')
    C.ok(ranges(pg) == base + 1 and n_stored(pg) == base + 1 and last(pg) == ['家長鎖測試', sorted(WORDS)], f'{tag}: exactly one new range, with the name that was typed and {n} words ({last(pg)})')
    shot(pg, f'parent_{label}_2_saved')
    C.ok(not errs, f'{tag}: no console / page errors {errs[:2]}')
    b.close()


# ----------------------------------------------------------------------------------------------------------------------------
def flow_lease(p, w=390, h=844, touch=True, label='phone'):
    tag = f'lease/{label}'
    b, ctx, pg, errs = start(p, w, h, touch)
    register(pg, 'lease-family', remember=True)
    open_new(pg)
    C.ok(paste(pg), f'{tag}: step 2 is open')
    n = L.ev(pg, 'v20Selected().length')
    base = ranges(pg)
    # (a) the lease is lost in this tab
    L.ev(pg, 'v23Release()')
    C.ok(L.ev(pg, 'v23HasLease()') is False, f'{tag}: this tab has no edit lease')
    pg.click('#v20-confirm-next')
    pg.wait_for_timeout(500)
    t = pg.inner_text('#s50-lease') if pg.is_visible('#s50-lease') else ''
    C.ok('不能儲存' in t and '另一個分頁' in t and '在這個分頁編輯' in t, f'{tag}: the bar explains it and offers 在這個分頁編輯 ({t.replace(chr(10), " ")!r})')
    C.ok(ranges(pg) == base and n_stored(pg) == base and pg.query_selector('#s50-saved') is None, f'{tag}: nothing is written, no success card')
    C.ok(in_view(pg, '#s50-lease') and in_view(pg, '#v20-confirm-next') and in_view(pg, '#s50-lease [data-v23="acquire"]'), f'{tag}: the explanation, its button and 儲存 are inside the screen')
    shot(pg, f'lease_{label}_1_explain')
    pg.click('#s50-lease [data-v23="acquire"]')
    C.ok(saved_card(pg, 10000), f'{tag}: 在這個分頁編輯 -> the save is made and the success card shows')
    pg.wait_for_timeout(1500)
    C.ok(ranges(pg) == base + 1 and n_stored(pg) == base + 1 and last(pg) == [L.ev(pg, 'latestRange().title'), sorted(WORDS)], f'{tag}: one new range with the {n} words in the stored copy ({last(pg)})')
    shot(pg, f'lease_{label}_2_saved')
    # (b) a real second tab holds the lock
    pgB = new_tab(ctx, errs)
    C.ok(signed_in(pgB) and L.ev(pgB, 'v23HasLease()') is False, f'{tag}: a second tab is signed in (remembered) but cannot write while the first holds the lease')
    open_new(pgB)
    C.ok(paste(pgB, 'cat | 貓\ndog | 狗\nfish | 魚'), f'{tag}: the second tab reaches step 2')
    pgB.click('#v20-confirm-next')
    pgB.wait_for_timeout(600)
    C.ok(pgB.is_visible('#s50-lease') and pgB.query_selector('#s50-saved') is None and n_stored(pgB) == base + 1,
         f'{tag}: the second tab says it cannot save and the stored copy has only the first tab\'s range')
    pgB.click('#s50-lease [data-v23="acquire"]')
    pgB.wait_for_timeout(800)
    C.ok(pgB.query_selector('#s50-saved') is None and pgB.is_visible('#s50-lease') and L.ev(pgB, 'v20Selected().length') == 3 and n_stored(pgB) == base + 1,
         f'{tag}: while the first tab still holds it, pressing the button does not pretend and the draft stays')
    pg.close()
    time.sleep(1.0)
    pgB.click('#s50-lease [data-v23="acquire"]')
    C.ok(saved_card(pgB, 10000), f'{tag}: once the first tab is closed the same button saves')
    pgB.wait_for_timeout(1200)
    C.ok(n_stored(pgB) == base + 2 and last(pgB)[1] == ['cat', 'dog', 'fish'], f'{tag}: the stored copy has both new ranges ({n_stored(pgB)}, {last(pgB)})')
    C.ok(not errs, f'{tag}: no console / page errors {errs[:2]}')
    b.close()


def flow_fail(p):
    tag = 'fail'
    b, ctx, pg, errs = start(p)
    register(pg, 'fail-family', remember=False)
    open_new(pg)
    C.ok(paste(pg), f'{tag}: step 2 is open')
    n = L.ev(pg, 'v20Selected().length')
    base = ranges(pg)
    pg.evaluate("""()=>{const k=window.__r37('dbKey()');const o=Storage.prototype.setItem;window.__setItem=o;
      Storage.prototype.setItem=function(a,b){if(a===k)throw new Error('quota');return o.apply(this,arguments);};}""")
    pg.click('#v20-confirm-next')
    pg.wait_for_timeout(700)
    err = pg.inner_text('#s50-err') if pg.is_visible('#s50-err') else ''
    C.ok('儲存失敗' in err and '草稿還在' in err, f'{tag}: a write that fails is said in the bar ({err!r})')
    C.ok(pg.query_selector('#s50-saved') is None and ranges(pg) == base and L.ev(pg, 'v20Selected().length') == n, f'{tag}: no success card, memory unchanged, the {n} words are still chosen')
    shot(pg, 'fail_1_error')
    pg.evaluate("()=>{Storage.prototype.setItem=window.__setItem}")
    pg.click('#v20-confirm-next')
    C.ok(saved_card(pg) and ranges(pg) == base + 1 and n_stored(pg) == base + 1 and last(pg) == [L.ev(pg, 'latestRange().title'), sorted(WORDS)], f'{tag}: pressing it again once storage works saves exactly once')
    C.ok(not [e for e in errs if 'quota' not in e], f'{tag}: no unexpected console / page errors {errs[:2]}')
    b.close()


def flow_layout(p, w, h, touch, label):
    tag = f'layout/{label}'
    b, ctx, pg, errs = start(p, w, h, touch)
    prepare_account(ctx, errs)
    pg.reload()
    pg.wait_for_function('typeof window.__r37==="function"', timeout=15000)
    pg.wait_for_timeout(600)
    open_new(pg)
    C.ok(paste(pg), f'{tag}: visitor step 2')
    pg.click('#v20-confirm-next')
    pg.wait_for_timeout(400)
    C.ok(pg.is_visible('#s50-auth') and in_view(pg, '#s50-auth') and all(in_view(pg, f'#s50-auth [data-s50="{a}"]') for a in ('auth-login', 'auth-register', 'auth-cancel')),
         f'{tag}: the sign-in card and its three buttons are fully inside the screen')
    C.ok(in_view(pg, '#v20-confirm-next') and in_view(pg, '#v20-import-dock') and overflow(pg) <= 1, f'{tag}: the 儲存 bar is inside the screen, no sideways scroll')
    C.ok(pg.evaluate("()=>{const b=document.querySelector('.r37-legbody');return b.scrollHeight<=b.clientHeight+1}"), f'{tag}: the page itself does not scroll')
    ok_cards = pg.evaluate("()=>{const e=document.querySelector('#word-editor');return e.clientHeight>=60}")
    C.ok(ok_cards, f'{tag}: the word cards still have room above the bar')
    shot(pg, f'layout_{label}_card')
    # login page: the tick and the note
    pg.click('#s50-auth [data-s50="auth-login"]')
    pg.wait_for_selector('#s52-rem-login')
    C.ok(pg.is_visible('#s50-auth-note') and pg.is_visible('#s52-rem-login') and overflow(pg) <= 1, f'{tag}: the login page shows the note and the 記住這部裝置 tick, no sideways scroll')
    shot(pg, f'layout_{label}_login')
    # lease card
    pg.fill('#login-name', 'tester')
    pg.fill('#login-pin', PW)
    pg.click('[data-act="login-submit"]')
    C.ok(saved_card(pg, 15000), f'{tag}: signed in and saved')
    pg.click('[data-s50="again"]')
    pg.wait_for_timeout(500)
    C.ok(paste(pg, 'cat | 貓\ndog | 狗'), f'{tag}: a second paste')
    L.ev(pg, 'v23Release()')
    pg.click('#v20-confirm-next')
    pg.wait_for_timeout(400)
    C.ok(pg.is_visible('#s50-lease') and in_view(pg, '#s50-lease') and in_view(pg, '#s50-lease [data-v23="acquire"]') and in_view(pg, '#v20-confirm-next') and overflow(pg) <= 1,
         f'{tag}: the edit-lease card, its button and 儲存 are inside the screen')
    C.ok(pg.evaluate("()=>{const b=document.querySelector('.r37-legbody');return b.scrollHeight<=b.clientHeight+1}"), f'{tag}: the page itself does not scroll with the lease card')
    shot(pg, f'layout_{label}_lease')
    C.ok(not errs, f'{tag}: no console / page errors {errs[:2]}')
    b.close()


def main():
    want = set(sys.argv[1:])
    run = lambda k: not want or k in want  # noqa: E731
    with L.sync_playwright() as p:
        if run('family'):
            print('-- family: remember this device', flush=True)
            flow_family(p)
        if run('visitor'):
            print('-- visitor: sign in', flush=True)
            flow_visitor(p)
            flow_register(p)
            flow_visitor(p, 1440, 900, False, 'desktop')
        if run('parent'):
            print('-- expired parent unlock', flush=True)
            flow_parent(p)
            flow_parent(p, 1440, 900, False, 'desktop')
        if run('lease'):
            print('-- edit lease', flush=True)
            flow_lease(p)
        if run('fail'):
            print('-- failed write', flush=True)
            flow_fail(p)
        if run('layout'):
            print('-- layout', flush=True)
            flow_layout(p, 390, 844, True, 'phone')
            flow_layout(p, 1440, 900, False, 'desktop')
    C.done()


if __name__ == '__main__':
    main()

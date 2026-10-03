"""R3.5 p10 browser suite: first-run screens (child home, dictation entry card, login / create account), header and
navigation chrome, engineering text removal, offline strip.

    WQ33_APP=<built index.html> python3 r35_tests/p10_firstrun_browser.py

`[B]` checks must FAIL on the R3.4 base text (`build_r35.py --base-only`) and PASS on the new build; the other checks are
regression guards that pass on both. Run it against both builds and report both numbers.
"""
import json
import re
import sys
from pathlib import Path

R = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(R / 'r33_tests'))
from p40_lib import Checker  # noqa: E402
from wq33 import APP, URL, PW, new_page, register, unlock_parent, sync_playwright  # noqa: E402

c = Checker('R3.5 p10 first-run screens and chrome')
ERRS = []
DLG = {'accept': True, 'msgs': []}  # confirm() handling shared by every page (accept by default)
INJ = [0]

VISIBLE_JS = """(el)=>{if(!el||!el.getClientRects().length)return false;const d=el.closest('details');if(d&&!d.open&&!el.closest('summary'))return false;
  const cs=getComputedStyle(el);return cs.visibility!=='hidden'&&cs.display!=='none';}"""

# element rect helper: viewport-relative box of the first element matching `sel` (None when missing / not rendered)
RECT_JS = """(sel)=>{const e=document.querySelector(sel);if(!e||!e.getClientRects().length)return null;const r=e.getBoundingClientRect();
  return {t:r.top,b:r.bottom,l:r.left,r:r.right,w:r.width,h:r.height};}"""


def rect(pg, sel):
    return pg.evaluate(RECT_JS, sel)


def nav_top(pg):
    return pg.evaluate("(()=>{const n=document.querySelector('#wq29-nav');if(!n)return 99999;const cs=getComputedStyle(n);"
                       "if(cs.display==='none'||cs.position!=='fixed')return 99999;return n.getBoundingClientRect().top})()")


def hook(pg):
    pg.on('console', lambda m: ERRS.append('CONSOLE ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.on('dialog', lambda d: (DLG['msgs'].append(d.message), d.accept() if DLG['accept'] else d.dismiss()))


def goto(pg, route, wait=700):
    pg.evaluate(f"location.hash='#{route}'")
    pg.wait_for_timeout(wait)


def page_text(pg):
    return pg.evaluate("document.body.innerText")


def user_key(pg):
    return pg.evaluate("Object.keys(localStorage).find(k=>k.startsWith('wordquest-v10-user-')&&!k.includes('-v24-protection'))")


def inject_range(pg, title, words, date):
    """Add a school range to the stored account. The app writes its in-memory copy back when the page unloads, so the new
    data is applied by an init script that runs at the start of the next load, after that write."""
    k = user_key(pg)
    d = json.loads(pg.evaluate("(k)=>localStorage.getItem(k)", k))
    ch = d['children'][0]
    now = '2099-01-01T00:00:00.000Z'
    rid = 'r_school1'
    d['ranges'].append({'id': rid, 'childId': ch['id'], 'title': title, 'dictationDate': date, 'createdAt': now})
    for en, zh in words:
        d['words'].append({'id': 'w_s_' + en, 'childId': ch['id'], 'rangeId': rid, 'en': en, 'zh': zh, 'kind': 'word', 'example': '',
                           'emoji': '', 'createdAt': now, 'studySeen': 0, 'reviewLevel': 0, 'reviewDue': None, 'lastSeen': None})
    ch['activeRangeId'] = rid
    INJ[0] += 1
    flag = f'__p10i{INJ[0]}'
    pg.context.add_init_script(script=f"try{{if(!sessionStorage.getItem('{flag}')){{sessionStorage.setItem('{flag}','1');"
                                      f"localStorage.setItem({json.dumps(k)},{json.dumps(json.dumps(d))});}}}}catch(e){{}}")
    pg.reload()
    pg.wait_for_timeout(1500)


def new_acct(p, w=390, h=844, touch=True, name='p10tester', child='小明', grade='3'):
    b, ctx, pg, _ = new_page(p, w, h, touch=touch)
    hook(pg)
    pg.on('pageerror', lambda e: ERRS.append('PAGEERR ' + str(e)))
    register(pg, name=name, child=child, grade=grade)
    pg.wait_for_timeout(500)
    return b, ctx, pg


def main():
    html = APP.read_text()
    with sync_playwright() as p:
        # =========================================================================================== A. child home 390x844
        try:
            b, ctx, pg = new_acct(p)
            goto(pg, 'kid', 900)
            h = pg.evaluate("innerHeight")
            w = pg.evaluate("innerWidth")
            nt = min(nav_top(pg), h)
            main_btn = rect(pg, '[data-l30="start"][data-mode="lesson"]')
            c.check('A1 the one big button 「開始今天的小課」 is full width and on the first screen (390x844)',
                    bool(main_btn) and main_btn['w'] >= w * 0.8 and main_btn['t'] >= 0 and main_btn['b'] <= nt,
                    json.dumps(main_btn) + f' nav={nt}', base=True)
            vis_today = pg.evaluate("""(()=>{const f=eval('('+arguments[0]+')');return [...document.querySelectorAll('#app a, #app button')].filter(e=>f(e)&&/今天/.test(e.textContent)).map(e=>e.textContent.trim())})()""".replace('arguments[0]', json.dumps(VISIBLE_JS)))
            c.check('A2 only one 「今天」 entry is visible on the home (no duplicate daily cards)', len(vis_today) == 1, repr(vis_today), base=True)
            tiles = pg.evaluate("""(()=>[...document.querySelectorAll('#app .p10-tile')].map(e=>{const r=e.getBoundingClientRect();return {t:e.textContent.trim(),top:r.top,bottom:r.bottom,h:r.height}}))()""")
            c.check('A3 three big tiles 英文 / 數學 / 遊戲 are on the first screen', [t['t'] for t in tiles] == ['🔤英文', '🔢數學', '🎮遊戲'] or [re.sub(r'[^一-鿿]', '', t['t']) for t in tiles] == ['英文', '數學', '遊戲'] and all(t['bottom'] <= nt and t['h'] >= 80 for t in tiles), repr(tiles), base=True)
            c.check('A4 the first screen has the greeting with the child name and grade tag 小3',
                    pg.evaluate("(()=>{const h=document.querySelector('#app h1');return !!h&&h.textContent.includes('小明')})()") and '小3' in (pg.evaluate("document.querySelector('#app .p10-chips')?.textContent||''")), base=True)
            more = pg.evaluate("(()=>{const d=document.querySelector('#p10-more');return d?{tag:d.tagName,open:d.open,sum:d.querySelector('summary')?.textContent.trim()}:null})()")
            c.check('A5 「更多玩法」 is a closed <details>', bool(more) and more['tag'] == 'DETAILS' and more['open'] is False and more['sum'] == '更多玩法', repr(more), base=True)
            folded = pg.evaluate("""(()=>{const d=document.querySelector('#p10-more');if(!d)return null;const ids=['r3-daily','wq32-home-cast','l31-home-entry','wq-subjects'];
              return {ids:ids.map(i=>!!d.querySelector('#'+i)),cards:d.querySelectorAll('.l30-card[data-l30="entry"]').length,cls:!!d.querySelector('.l30-classroom')}})()""")
            c.check('A6 跨科任務 / 夥伴 / 詞語組合工房 / 數學學習 / 8 種練習 / 拼字教室 all sit inside 「更多玩法」',
                    bool(folded) and all(folded['ids']) and folded['cards'] == 8 and folded['cls'], repr(folded), base=True)
            pg.click('#p10-more > summary') if pg.query_selector('#p10-more > summary') else None
            pg.wait_for_timeout(300)
            words = pg.evaluate("[...document.querySelectorAll('#app .l30-card[data-l30=\"entry\"] .l30-go>span:first-child')].map(e=>e.textContent)")
            c.check('A7 all 8 practice cards say 「開始」', len(words) == 8 and all(x == '開始' for x in words), repr(words), base=True)
            goto(pg, 'practice')
            goto(pg, 'kid')
            c.check('A8 the open / closed state of 「更多玩法」 survives a re-render (leave and come back)',
                    pg.evaluate("document.querySelector('#p10-more')?.open===true"), base=True)
            pg.evaluate("document.querySelector('#p10-more').open=false")
            # tiles lead somewhere
            pg.click('#app .p10-tile.en') if pg.query_selector('#app .p10-tile.en') else None
            pg.wait_for_timeout(500)
            c.check('A9 tile 英文 opens the practice page', pg.evaluate('location.hash') == '#practice', pg.evaluate('location.hash'), base=True)
            goto(pg, 'kid')
            pg.click('#app .p10-tile.math') if pg.query_selector('#app .p10-tile.math') else None
            pg.wait_for_timeout(1200)
            c.check('A10 tile 數學 opens the maths dialog', pg.evaluate("document.querySelector('#wqm-dialog')?.open===true"), base=True)
            pg.evaluate("document.querySelector('#wqm-dialog')?.close()")
            goto(pg, 'kid')
            pg.click('#app .p10-tile.game') if pg.query_selector('#app .p10-tile.game') else None
            pg.wait_for_timeout(500)
            c.check('A11 tile 遊戲 opens the arcade lobby', pg.evaluate('location.hash') == '#game', pg.evaluate('location.hash'), base=True)
            goto(pg, 'kid')
            pg.locator('[data-l30="start"][data-mode="lesson"]').first.click()
            pg.wait_for_timeout(900)
            c.check('A12 the big button still starts the lesson (guard)', pg.evaluate('location.hash') == '#learning', pg.evaluate('location.hash'))
            # an address the app does not know (a stale bookmark, a typo) falls back to the home page; it must be the new home
            goto(pg, 'home', 900)
            c.check('A14 an unknown address (#home) lands on the new home, not the old oversized portrait block',
                    pg.evaluate("!!document.querySelector('#p10-first')&&!document.querySelector('.l30-hero:not(.p10-hero)')") and pg.evaluate('location.hash') == '#kid',
                    pg.evaluate('location.hash'), base=True)
            # overflow guard on several routes
            for rt in ('kid', 'practice', 'login', 'classroom', 'assembly'):
                goto(pg, rt, 500)
                ow = pg.evaluate("document.documentElement.scrollWidth-innerWidth")
                c.check(f'A13 no sideways scroll on #{rt} (390x844)', ow <= 1, str(ow))
        except Exception as e:  # keep going so that every other check still runs (also on the R3.4 base)
            c.check('section 1 ran to the end', False, repr(e).splitlines()[0][:200], base=True)
        finally:
            try:
                b.close()
            except Exception:
                pass

        # =========================================================================================== A'. sideways phone / tiny phone / tablet
        for (vw, vh, tag) in [(844, 390, 'landscape'), (320, 568, 'small phone'), (768, 1024, 'tablet')]:
            try:
                b, ctx, pg = new_acct(p, vw, vh, touch=vw < 700, name='p10size')
                goto(pg, 'kid', 800)
                nt = min(nav_top(pg), vh)
                mb = rect(pg, '[data-l30="start"][data-mode="lesson"]')
                ts = pg.evaluate("[...document.querySelectorAll('#app .p10-tile')].map(e=>{const r=e.getBoundingClientRect();return {b:r.bottom,t:r.top,h:r.height,w:r.width}})")
                c.check(f'A14 {tag} {vw}x{vh}: the big button and all three tiles are on the first screen',
                        bool(mb) and mb['b'] <= nt and len(ts) == 3 and all(t['b'] <= nt and t['t'] >= 0 for t in ts), f'btn={mb} tiles={ts} nav={nt}', base=True)
                c.check(f'A15 {tag} {vw}x{vh}: no sideways scroll on the home', pg.evaluate("document.documentElement.scrollWidth-innerWidth") <= 1)
                hh = rect(pg, '.header')
                if vh < 500:
                    c.check(f'A16 {tag}: sticky header is one row of at most 52px', bool(hh) and hh['h'] <= 52, json.dumps(hh), base=True)
            except Exception as e:  # keep going so that every other check still runs (also on the R3.4 base)
                c.check('section 2 ran to the end', False, repr(e).splitlines()[0][:200], base=True)
            finally:
                try:
                    b.close()
                except Exception:
                    pass

        # =========================================================================================== B. dictation entry card
        try:
            b, ctx, pg = new_acct(p, name='p10dict')
            goto(pg, 'kid', 900)
            card = pg.evaluate("""(()=>{const e=document.querySelector('.p10-dict');return e?{txt:e.innerText,btn:e.querySelector('button')?.textContent.trim(),top:e.getBoundingClientRect().top}:null})()""")
            c.check('B1 the demo range is the only one: card 「今次默書練習」 labelled 「示範」, 12 個單字, no invented date',
                    bool(card) and '今次默書練習' in card['txt'] and '示範' in card['txt'] and '12 個單字' in card['txt'] and '默書日' not in card['txt'] and card['btn'] == '開始練習', repr(card), base=True)
            c.check('B2 the card sits under the main button, above the tiles',
                    bool(card) and rect(pg, '[data-l30="start"][data-mode="lesson"]')['b'] <= card['top'] <= rect(pg, '#app .p10-tile')['t'], base=True)
            inject_range(pg, '第三單元默書', [('apple', '蘋果'), ('banana', '香蕉'), ('cat', '貓'), ('dog', '狗'), ('egg', '雞蛋')], '2099-10-08')
            goto(pg, 'kid', 900)
            card = pg.evaluate("""(()=>{const e=document.querySelector('.p10-dict');return e?{txt:e.innerText,btn:e.querySelector('button')?.textContent.trim()}:null})()""")
            c.check('B3 a school range: card shows its name, 5 個單字 and the school date', bool(card) and '第三單元默書' in card['txt'] and '5 個單字' in card['txt'] and '默書日：10月8日' in card['txt'], repr(card), base=True)
            c.check('B4 the demo range is hidden from the card once a school range exists', bool(card) and '示範' not in card['txt'] and 'Unit 3' not in card['txt'], repr(card), base=True)
            pg.click('.p10-dict button') if pg.query_selector('.p10-dict button') else None
            pg.wait_for_timeout(1200)
            sess = pg.evaluate("""(()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('wordquest-v10-user-')&&!k.includes('-v24-protection'));const d=JSON.parse(localStorage.getItem(k));
              const s=d.session;return s?{n:s.queue.length,ids:s.queue.map(q=>q.wordId),mode:s.mode}:null})()""")
            c.check('B5 「開始練習」 starts a practice set made of the school range words', pg.evaluate('location.hash') == '#learn' and bool(sess) and sess['n'] >= 1 and all(i.startswith('w_s_') for i in sess['ids']), repr(sess) + ' ' + pg.evaluate('location.hash'), base=True)
            goto(pg, 'kid', 900)
            card = pg.evaluate("document.querySelector('.p10-dict button')?.textContent.trim()")
            c.check('B6 with an unfinished set the card button says 「繼續練習」', card == '繼續練習', repr(card), base=True)
        except Exception as e:  # keep going so that every other check still runs (also on the R3.4 base)
            c.check('section 3 ran to the end', False, repr(e).splitlines()[0][:200], base=True)
        finally:
            try:
                b.close()
            except Exception:
                pass
        # guest: no dictation card
        try:
            b, ctx, pg, _ = new_page(p, 390, 844, touch=True)
            hook(pg)
            pg.goto(URL)
            pg.wait_for_timeout(1500)
            c.check('B7 a visitor sees no dictation card (guard)', pg.query_selector('.p10-dict') is None)
            # =========================================================================================== C. visitor home, login, create account
            nt = min(nav_top(pg), 844)
            gb = rect(pg, '.l30-hero .l30-btn.primary')
            c.check('C1 visitor home: one full-width button on the first screen', bool(gb) and gb['w'] >= 300 and gb['b'] <= nt, json.dumps(gb), base=True)
            c.check('C2 visitor home: note under the button mentions 登入 (guard)', '登入' in (pg.evaluate("document.querySelector('#wq33-guest-note')?.textContent||''")))
            c.check('C3 visitor home: header shows 試玩中', pg.evaluate("document.querySelector('#header-child')?.textContent")=='試玩中', pg.evaluate("document.querySelector('#header-child')?.textContent"), base=True)
            goto(pg, 'login', 900)
            nt = min(nav_top(pg), 844)
            cards = pg.evaluate("""(()=>[...document.querySelectorAll('#app button, #app a')].filter(e=>/第一次使用：建立帳戶|已有帳戶：登入/.test(e.textContent)).map(e=>{const r=e.getBoundingClientRect();return {t:e.textContent.trim().slice(0,12),top:r.top,bottom:r.bottom,h:r.height}}))()""")
            c.check('C4 login page first screen: two big cards 「第一次使用：建立帳戶」 and 「已有帳戶：登入」', len(cards) == 2 and all(x['bottom'] <= nt and x['h'] >= 70 for x in cards), repr(cards), base=True)
            forms = rect(pg, '.auth-grid')
            portal = rect(pg, '.wq29-portal')
            c.check('C5 the arcade promo comes below the forms', bool(forms) and bool(portal) and portal['t'] >= forms['b'] - 1, f'forms={forms} portal={portal}', base=True)
            c.check('C6 the register password field says 「至少 8 個字」', pg.evaluate("document.querySelector('#register-pin')?.placeholder") == '至少 8 個字', base=True)
            ok = pg.evaluate("""(()=>{const i=document.querySelector('#register-pin'),b=document.querySelector('[data-target="register-pin"]');if(!i||!b)return null;
              const t0=i.type;b.click();const t1=i.type;const l1=b.textContent;b.click();return [t0,t1,l1,i.type]})()""")
            c.check('C7 「顯示密碼」 toggle shows and hides the password', ok == ['password', 'text', '隱藏密碼', 'password'], repr(ok), base=True)
            heads = pg.evaluate("[...document.querySelectorAll('#app h2')].map(e=>e.textContent.trim())")
            labs = pg.evaluate("[...document.querySelectorAll('#app label')].map(e=>e.textContent.trim())")
            c.check('C8 form titles are 「登入」 and 「建立新帳戶」', '登入' in heads and '建立新帳戶' in heads, repr(heads), base=True)
            c.check('C9 the password label is 「家長密碼」 (no 「舊 PIN」 in the sign-up form)', labs.count('家長密碼') == 2 and not any('舊 PIN' in x for x in labs), repr(labs), base=True)
            nolabel = pg.evaluate("['login-name','login-pin','register-name','register-child','register-pin'].filter(i=>{const e=document.getElementById(i);return !e||!e.labels||e.labels.length===0})")
            c.check('C10 the five sign-in / sign-up inputs are linked to their label (for=)', nolabel == [], repr(nolabel), base=True)
            req = pg.evaluate("['login-name','login-pin','register-name','register-pin','register-grade'].filter(i=>{const e=document.getElementById(i);return !e||(!e.required&&e.getAttribute('aria-required')!=='true')})")
            c.check('C11 required inputs carry aria-required', req == [], repr(req), base=True)
            txt = page_text(pg)
            c.check('C12 no Admin / 1234 hint on the normal sign-in screen (guard)', not re.search(r'Admin|1234', txt))
            # inline errors
            pg.fill('#login-name', 'nobody')
            pg.fill('#login-pin', 'wrongpassword1')
            pg.click('[data-act="login-submit"]')
            pg.wait_for_timeout(4200)          # longer than the 2.8 s toast
            err = pg.evaluate("""(()=>{const e=document.querySelector('.p10-err');if(!e)return null;const f=document.getElementById('login-pin').getBoundingClientRect(),r=e.getBoundingClientRect();
              return {t:e.textContent,vis:r.height>0,below:r.top>=f.bottom-1,toast:!!document.querySelector('#toast')&&getComputedStyle(document.querySelector('#toast')).opacity}})()""")
            c.check('C13 a wrong sign-in shows an inline message under the password field that stays after the toast is gone',
                    bool(err) and err['vis'] and err['below'] and ('不正確' in err['t'] or '不對' in err['t']), repr(err), base=True)
            pg.fill('#login-pin', 'x')
            pg.wait_for_timeout(200)
            c.check('C14 the inline message clears when the field is edited', bool(err) and pg.query_selector('.p10-err') is None, base=True)
            pg.fill('#register-name', 'newfamily')
            pg.select_option('#register-grade', '2')
            pg.fill('#register-pin', 'short')
            pg.click('[data-act="register-submit"]')
            pg.wait_for_timeout(3600)
            err = pg.evaluate("""(()=>{const e=document.querySelector('#p10-err-register-pin');return e?{t:e.textContent,bad:document.getElementById('register-pin').getAttribute('aria-invalid')}:null})()""")
            c.check('C15 a too-short password shows 「密碼要 8 個字或以上…」 inline and keeps it', bool(err) and '8 個字' in err['t'] and err['bad'] == 'true', repr(err), base=True)
            pg.fill('#register-name', '')
            pg.click('[data-act="register-submit"]')
            pg.wait_for_timeout(300)
            c.check('C16 an empty account name is flagged under that field', pg.query_selector('#p10-err-register-name') is not None, base=True)
            # sign-up still works and the account can log in with the new form
            pg.fill('#register-name', 'newfamily')
            pg.fill('#register-child', '小欣')
            pg.fill('#register-pin', 'apple-tree-2026')
            pg.click('[data-act="register-submit"]')
            pg.wait_for_timeout(2500)
            c.check('C17 sign-up succeeds and lands on the child home (guard)', pg.evaluate('location.hash') == '#kid' and pg.evaluate("document.querySelector('#header-child')?.textContent") == '小欣')
            c.check('C18 logged-in header: no 登出 button for the child', pg.evaluate("(()=>{const b=document.querySelector('.head-actions .auth-head');return !b||getComputedStyle(b).display==='none'})()"), base=True)
            # log out through the settings (parent area) with a plain confirm
            goto(pg, 'settings', 900)
            unlock_parent(pg, 'apple-tree-2026')
            pg.wait_for_timeout(600)
            stx = page_text(pg)
            c.check('C19 settings: 「關於這個程式」 carries the version and the honest line, once', stx.count('關於這個程式') == 1 and '內容尚未經老師逐題審核' in stx, base=True)
            c.check('C20 settings: no V28 / Web Locks / UTF-8 / 編輯權 engineering wording', not re.search(r'V28|Web Locks|UTF-8|編輯權', stx), re.findall(r'V28|Web Locks|UTF-8|編輯權', stx), base=True)
            c.check('C21 settings: button says 「匯出學習備份」', '匯出學習備份' in stx and '匯出 V28 備份' not in stx, base=True)
            msgs = []
            DLG['accept'] = False
            DLG['msgs'].clear()
            lo = pg.query_selector('[data-p10="logout"]')
            if lo:
                lo.click()
                pg.wait_for_timeout(500)
            msgs = list(DLG['msgs'])
            DLG['accept'] = True
            c.check('C22 settings has a 「登出」 button that asks first and stays logged in on 取消', bool(lo) and bool(msgs) and '要登出嗎' in msgs[0] and pg.evaluate("document.querySelector('#header-child')?.textContent")=='小欣', repr(msgs), base=True)
            lo = pg.query_selector('[data-p10="logout"]')
            if lo:
                lo.click()
                pg.wait_for_timeout(1200)
            c.check('C23 confirming the log-out returns to the visitor home', pg.evaluate("document.querySelector('#header-child')?.textContent")=='試玩中' and pg.evaluate('location.hash') == '#kid', pg.evaluate("document.querySelector('#header-child')?.textContent"), base=True)
            goto(pg, 'login', 800)
            pg.fill('#login-name', 'newfamily')
            pg.fill('#login-pin', 'apple-tree-2026')
            pg.click('[data-act="login-submit"]')
            pg.wait_for_timeout(2200)
            c.check('C24 logging in again with the new form works (guard)', pg.evaluate('location.hash') == '#kid' and pg.evaluate("document.querySelector('#header-child')?.textContent")=='小欣')
        except Exception as e:  # keep going so that every other check still runs (also on the R3.4 base)
            c.check('section 4 ran to the end', False, repr(e).splitlines()[0][:200], base=True)
        finally:
            try:
                b.close()
            except Exception:
                pass

        # =========================================================================================== D. chrome
        try:
            b, ctx, pg = new_acct(p, name='p10chrome')
            for rt in ('kid', 'practice', 'classroom', 'assembly', 'children'):
                goto(pg, rt, 800)
                if rt == 'children':
                    unlock_parent(pg)
                t = page_text(pg)
                bad = re.findall(r'R3\.\d|V2\d|V3\d|森林學園|教材尚待|工程校對|原站結算', t)
                c.check(f'D1 #{rt}: no version number or engineering / status wording', not bad, repr(bad), base=True)
            goto(pg, 'kid')
            hdr = pg.evaluate("""(()=>{const out={};const l=document.querySelector('.header .logo').getBoundingClientRect();out.logo=[l.width,l.height];
              out.btns=[...document.querySelectorAll('.head-actions .btn,.head-actions .child-pill')].filter(e=>e.getClientRects().length).map(e=>[e.textContent.trim(),Math.round(e.getBoundingClientRect().height)]);
              out.pill=document.querySelector('.child-pill').tagName;return out})()""")
            c.check('D2 brand 「W」 is at least 44x44', hdr['logo'][0] >= 44 and hdr['logo'][1] >= 44, repr(hdr['logo']), base=True)
            c.check('D3 every header button is at least 44px high (guard)', all(h >= 44 for _, h in hdr['btns']), repr(hdr['btns']))
            c.check('D4 the name capsule is display-only (not a button) and does nothing when pressed',
                    hdr['pill'] != 'BUTTON' and (pg.click('.child-pill') or True) and pg.evaluate('location.hash') == '#kid', hdr['pill'], base=True)
            labs = pg.evaluate("[...document.querySelectorAll('.head-actions .btn')].filter(e=>e.getClientRects().length).map(e=>e.textContent.trim())")
            c.check('D5 header shows sound state in words and no 登出', any('聲音：開' in x for x in labs) and not any('登出' in x for x in labs), repr(labs), base=True)
            pg.click('#header-sfx')
            pg.wait_for_timeout(300)
            c.check('D6 pressing the sound button flips the words to 「聲音：關」', pg.evaluate("document.querySelector('#header-sfx .label').textContent") == '聲音：關', base=True)
            pg.click('#header-sfx')
            navl = pg.evaluate("[...document.querySelectorAll('#wq29-nav a')].map(e=>e.textContent.trim())")
            c.check('D7 navigation reads 首頁 練習 數學 遊戲 家長', navl == ['首頁', '練習', '數學', '遊戲', '家長'], repr(navl), base=True)
            for rt in ('kid', 'practice', 'classroom', 'assembly'):
                goto(pg, rt, 600)
                c.check(f'D8 #{rt}: the floating 「＋ 數學／奧數」 button is gone', not pg.evaluate("(()=>{const e=document.querySelector('#wqm-launch');return !!e&&getComputedStyle(e).display!=='none'})()"), base=True)
            pg.click('#wq29-nav a[data-wqm-open]') if pg.query_selector('#wq29-nav a[data-wqm-open]') else None
            pg.wait_for_timeout(1200)
            c.check('D9 navigation item 數學 opens the maths dialog', pg.evaluate("document.querySelector('#wqm-dialog')?.open===true"), base=True)
            pg.evaluate("document.querySelector('#wqm-dialog')?.close()")
            # bottom room: nothing hidden behind the fixed navigation
            goto(pg, 'practice', 800)
            pg.evaluate("window.scrollTo(0,document.documentElement.scrollHeight)")
            pg.wait_for_timeout(300)
            last = pg.evaluate("""(()=>{const f=document.querySelector('.footer');const g=document.createRange();g.selectNodeContents(f);return g.getBoundingClientRect().bottom})()""")
            c.check('D10 the page end clears the fixed navigation (390x844): the last footer line sits above it', last <= nav_top(pg) + 1, f'footer text bottom={last} nav top={nav_top(pg)}', base=True)
            # workshop hero portrait does not cover the title (S2-13), promo only on the home (S2-21)
            goto(pg, 'assembly', 900)
            ov = pg.evaluate("""(()=>{const f=document.querySelector('.l31-hero .wq32-hero-figure');if(!f)return null;const b=f.getBoundingClientRect();let worst=0;
              for(const sel of ['.l31-hero h1','.l31-hero .l31-eyebrow']){const e=document.querySelector(sel);if(!e)continue;const g=document.createRange();g.selectNodeContents(e);
                for(const a of g.getClientRects()){const x=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left)),y=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));worst=Math.max(worst,x*y);}}
              return {overlap:worst,fig:[b.width,b.height]}})()""")
            c.check('D11 workshop page at 390px: the teacher portrait does not cover the title', bool(ov) and ov['overlap'] < 1 and ov['fig'][0] <= 100, repr(ov), base=True)
            goto(pg, 'practice', 800)
            promo = pg.query_selector('#l31-home-entry') is not None
            h1 = rect(pg, '#app h1')
            c.check('D12 practice page: no workshop promo card, own title near the top', not promo and bool(h1) and h1['t'] < 260, f'promo={promo} h1={h1}', base=True)
            goto(pg, 'classroom', 800)
            c.check('D13 spelling classroom: no workshop promo card above its own title', pg.query_selector('#l31-home-entry') is None, base=True)
            goto(pg, 'kid', 800)
            c.check('D14 the home still has the workshop entry (inside 更多玩法) (guard)', pg.query_selector('#p10-more #l31-home-entry') is not None or pg.query_selector('#l31-home-entry') is not None)
            # labels in the parent area (S2-15)
            goto(pg, 'children', 800)
            unlock_parent(pg)
            goto(pg, 'children', 600)
            pg.click('[data-act="show-add-child"]')
            pg.wait_for_timeout(500)
            nolab = pg.evaluate("['new-child-name','new-child-grade'].filter(i=>{const e=document.getElementById(i);return !e||e.labels.length===0})")
            c.check('D15 add-child form: name and grade inputs have a label link', nolab == [], repr(nolab), base=True)
            goto(pg, 'settings', 900)
            unlock_parent(pg)
            nolab = pg.evaluate("['daily-new','daily-max','game-minutes'].filter(i=>{const e=document.getElementById(i);return !e||e.labels.length===0})")
            c.check('D16 settings learning rules: the three selects have a label link', nolab == [], repr(nolab), base=True)
            # clear data -> plain message, add-child form
            if pg.query_selector('[data-act="reset-all"]'):
                pg.click('[data-act="reset-all"]')
            pg.wait_for_timeout(2200)
            toast = pg.evaluate("document.querySelector('#toast')?.textContent||''")
            c.check('D17 after clearing the data: 「資料已清除。請建立新孩子。」 and the add-child form opens',
                    '資料已清除。請建立新孩子。' in toast and pg.evaluate('location.hash') == '#children' and pg.query_selector('#new-child-name') is not None,
                    f'{toast} {pg.evaluate("location.hash")}', base=True)
        except Exception as e:  # keep going so that every other check still runs (also on the R3.4 base)
            c.check('section 5 ran to the end', False, repr(e).splitlines()[0][:200], base=True)
        finally:
            try:
                b.close()
            except Exception:
                pass

        # offline strip
        try:
            b, ctx, pg = new_acct(p, name='p10off')
            goto(pg, 'kid', 600)
            c.check('D18 online: no offline strip', not pg.evaluate("(()=>{const e=document.getElementById('p10-offline');return !!e&&e.getClientRects().length>0})()"))
            ctx.set_offline(True)
            pg.wait_for_timeout(500)
            off = pg.evaluate("(()=>{const e=document.getElementById('p10-offline');return e&&e.getClientRects().length?e.textContent:''})()")
            c.check('D19 offline: strip 「目前沒有網絡，仍可練習」 appears at once', off == '目前沒有網絡，仍可練習', repr(off), base=True)
            ctx.set_offline(False)
            pg.wait_for_timeout(500)
            c.check('D20 back online: the strip goes away', not pg.evaluate("(()=>{const e=document.getElementById('p10-offline');return !!e&&e.getClientRects().length>0})()"))
        except Exception as e:  # keep going so that every other check still runs (also on the R3.4 base)
            c.check('section 6 ran to the end', False, repr(e).splitlines()[0][:200], base=True)
        finally:
            try:
                b.close()
            except Exception:
                pass

        # short viewport menu (844x390)
        try:
            b, ctx, pg = new_acct(p, 844, 390, touch=False, name='p10short')
            goto(pg, 'kid', 800)
            hh = rect(pg, '.header')
            nv0 = pg.evaluate("(()=>{const n=document.querySelector('#wq29-nav');return !!n&&n.getClientRects().length>0})()")
            c.check('D21 sideways phone: header is one row (<= 52px) and the navigation is hidden', hh['h'] <= 52 and not nv0, f'{hh} nav={nv0}', base=True)
            mb = rect(pg, '#p10-menu')
            c.check('D22 a 「選單」 button of at least 44px sits in the header', bool(mb) and mb['h'] >= 44 and mb['w'] >= 44, json.dumps(mb), base=True)
            if pg.query_selector('#p10-menu'):
                pg.click('#p10-menu')
                pg.wait_for_timeout(300)
            items = pg.evaluate("[...document.querySelectorAll('#wq29-nav a')].filter(e=>e.getClientRects().length).map(e=>({t:e.textContent.trim(),h:e.getBoundingClientRect().height}))")
            c.check('D23 the menu lists the five places, each at least 44px high', [i['t'] for i in items] == ['首頁', '練習', '數學', '遊戲', '家長'] and all(i['h'] >= 44 for i in items), repr(items), base=True)
            pg.click('#wq29-nav a[href="#practice"]')
            pg.wait_for_timeout(700)
            nv1 = pg.evaluate("(()=>{const n=document.querySelector('#wq29-nav');return !!n&&n.getClientRects().length>0})()")
            c.check('D24 choosing a place goes there and closes the menu', pg.evaluate('location.hash') == '#practice' and not nv1, f'{pg.evaluate("location.hash")} nav={nv1}', base=True)
        except Exception as e:  # keep going so that every other check still runs (also on the R3.4 base)
            c.check('section 7 ran to the end', False, repr(e).splitlines()[0][:200], base=True)
        finally:
            try:
                b.close()
            except Exception:
                pass

        # visitor at the parent door
        try:
            b, ctx, pg, _ = new_page(p, 390, 844, touch=True)
            hook(pg)
            pg.goto(URL)
            pg.wait_for_timeout(1200)
            pg.click('.head-actions a[href="#parent"]')
            pg.wait_for_timeout(900)
            t = page_text(pg)
            c.check('D25 a visitor pressing 「家長」 is told to create an account first', '請先建立帳戶' in t and pg.query_selector('#p10-gate a[href="#login"]') is not None, base=True)
            c.check('D26 the visitor does not see the parent tools', '加入範圍' not in t and '安排下一次學習' not in t, base=True)
        except Exception as e:  # keep going so that every other check still runs (also on the R3.4 base)
            c.check('section 8 ran to the end', False, repr(e).splitlines()[0][:200], base=True)
        finally:
            try:
                b.close()
            except Exception:
                pass

        # sandbox login keeps working (guard)
        try:
            b, ctx, pg, _ = new_page(p, 390, 844, touch=True)
            hook(pg)
            pg.goto(URL + '?mode=admin-test#login')
            pg.wait_for_timeout(1500)
            c.check('D27 ?mode=admin-test still shows the sandbox sign-in with its own fields (guard)', pg.query_selector('#login-pin') is not None and pg.query_selector('#p10-login') is None)
        except Exception as e:  # keep going so that every other check still runs (also on the R3.4 base)
            c.check('section 9 ran to the end', False, repr(e).splitlines()[0][:200], base=True)
        finally:
            try:
                b.close()
            except Exception:
                pass

    # static text checks on the built file
    for needle in ('由原站結算', '工程校對', '匯出 V28 備份', '程式及文字校對'):
        c.check(f'E1 built page no longer contains 「{needle}」', needle not in html, base=True)
    c.check('E2 no console error / page error during the whole run', not ERRS, repr(ERRS[:3]))
    return c.finish()


if __name__ == '__main__':
    sys.exit(main())

"""R3.42 t70 - each 闖關 level can be started only twice a day (parent can change it)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403
import wq33  # noqa: E402

C = Checker('t70')


def login(p):
    b, ctx, pg, errs = open_https_page(p)
    pg.evaluate("location.hash='#login'")
    pg.wait_for_selector('#register-name')
    pg.fill('#register-name', 'tester')
    pg.fill('#register-child', '小明')
    pg.select_option('#register-grade', '3')
    pg.fill('#register-pin', wq33.PW)
    pg.click('[data-act="register-submit"]')
    pg.wait_for_function("()=>window.__r37('isLoggedIn()')")
    pg.wait_for_timeout(500)
    pg.evaluate("localStorage.removeItem('wq37-t-legacy')")
    ev(pg, "r37Mem._seed=1")
    return b, ctx, pg, errs


def start(pg, t, w, s, opts='undefined'):
    ev(pg, "r37P=null")
    ev(pg, f"r37StartLevel('{t}',{w},{s},{opts})")
    return bool(ev(pg, "!!r37P&&r37P.kind==='level'"))


with sync_playwright() as p:
    b, ctx, pg, errs = login(p)
    C.ok(ev(pg, 'r38Cap()') == 2, 'default is 2 plays per level')
    C.ok(start(pg, 'math', 2, 0), 'play 1 of math 2-0 starts')
    C.ok(start(pg, 'math', 2, 0), 'play 2 of math 2-0 starts (quit and reload count as plays)')
    C.ok(not start(pg, 'math', 2, 0), 'play 3 of the same level is refused')
    C.ok('已玩了 2 次' in pg.inner_text('body'), 'the child is told why and what to do')
    C.ok(ev(pg, "r38Plays().n[r37LvKey('math',2,0)]") == 2, 'a refused start does not raise the count')
    C.ok(start(pg, 'math', 2, 1), 'a different level still starts')
    C.ok(start(pg, 'english', 0, 0), 'the same stage of another track counts separately')
    C.ok(ev(pg, "r38TryStart('math',2,0,{redo:[1]})") is True, 'the wrong-answer redo is never blocked')
    C.ok(ev(pg, "r38Plays().n[r37LvKey('math',2,0)]") == 2, 'the wrong-answer redo does not count')

    ev(pg, "r37Mem._seed=1;r37P=null")
    pg.reload()
    pg.wait_for_function('typeof window.__r37==="function"')
    pg.wait_for_timeout(600)
    pg.evaluate("localStorage.removeItem('wq37-t-legacy')")
    C.ok(not start(pg, 'math', 2, 0), 'a reload does not give the plays back')

    ev(pg, "(()=>{r38Plays().d='2000-01-01';})()")
    C.ok(ev(pg, "r38Left('math',2,0)") == 2, 'the next day gives both plays back')
    C.ok(start(pg, 'math', 2, 0), 'level starts again the next day')

    ev(pg, "(()=>{r37Get().cap=0;r37Save();})()")
    C.ok(all(start(pg, 'math', 3, 0) for _ in range(5)), 'cap off: unlimited plays')
    ev(pg, "(()=>{r37Get().cap=3;r37Save();})()")
    r = [start(pg, 'math', 3, 1) for _ in range(4)]
    C.ok(r == [True, True, True, False], f'cap 3: three plays then refused {r}')

    # parent control
    ev(pg, "r37P=null;(()=>{r37Get().cap=undefined;})()")
    go(pg, '#p/parent', 500)
    pg.fill('input[type=password]', wq33.PW)
    pg.evaluate("[...document.querySelectorAll('button')].find(b=>/確認家長身份/.test(b.innerText)).click()")
    pg.wait_for_timeout(700)
    ev(pg, "r37Mem._ptab='diff'")
    ev(pg, "render()")
    pg.wait_for_timeout(300)
    C.ok(pg.locator('[data-r37="cap"]').count() == 4, 'parent difficulty tab shows 4 cap buttons')
    C.ok(pg.locator('[data-r37="cap"][aria-pressed="true"]').get_attribute('data-n') == '2', 'default 2 is highlighted')
    pg.locator('[data-r37="cap"][data-n="3"]').click()
    pg.wait_for_timeout(300)
    C.ok(ev(pg, 'r38Cap()') == 3, 'tapping 3 sets the cap to 3')
    pg.locator('[data-r37="cap"][data-n="0"]').click()
    pg.wait_for_timeout(300)
    C.ok(ev(pg, 'r38Cap()') == 0, 'tapping 不限 turns the cap off')
    pg.screenshot(path='/tmp/t70_parent.png')
    b.close()
    C.ok(not errs, f'no console errors: {errs[:3]}')

C.done()

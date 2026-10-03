"""R3.3 p20 / N11: the 5-minute parent confirmation expired while a dialog is open.

Run:  WQ33_APP=<index.html> python3 r33_tests/p20_gate_dialog_browser.py   (default app/index.html)
Baseline R3.2 draws the gate into #app, i.e. BEHIND the modal dialog, so "確認加入" looks dead. Expected now: a clear
message and a password box inside the dialog; after verification the dialog and its draft are still there and the user
presses the button again (no automatic replay, so nothing is written twice).
Phone (390 px, touch) and desktop runs. Expiry is forced through the product's own state variable (v23ParentUntil)
and once through real elapsed time.
"""
import json
import p20_util as U
from p20_util import require, soft, sync_playwright

U.build_copy()
R = U.Reporter('p20 dialog parent gate (N11)')
ERRS = []
PW = U.PW


def reach_summary(pg, title, words):
    """Real UI: range-new -> paste text -> organise -> 核對及加入 dialog with the confirmation ticked."""
    pg.evaluate("location.hash='#range-new'")
    pg.wait_for_timeout(300)
    # R3.5: a draft left over from an earlier segment reopens on step 2 or 3; go back to step 1 like a user would
    pg.evaluate("""[...document.querySelectorAll('[data-p40="step"][data-step="1"]')].find(x=>x.getBoundingClientRect().height>0)?.click()""")
    pg.wait_for_selector('#range-title', timeout=8000)
    pg.fill('#range-title', title)
    pg.fill('#raw-words', '\n'.join('%s | 字' % w for w in words))
    pg.click('[data-imp="parse"]')
    pg.wait_for_timeout(400)
    pg.evaluate("document.querySelector('#v20-confirm-next').click()")  # DOM click: the phone launcher overlap is a p10 layout topic
    pg.wait_for_function("(()=>{const s=document.querySelector('#v20-summary');return !!s&&!s.hidden&&getComputedStyle(s).display!=='none'&&s.getBoundingClientRect().height>0;})()", timeout=8000)  # R3.5: the summary is the inline third step, not a pop-up
    pg.check('#confirm-import')


def dialog_open(pg):
    return pg.evaluate("(()=>{const s=document.querySelector('#v20-summary');return !!s&&!s.hidden&&getComputedStyle(s).display!=='none'&&s.getBoundingClientRect().height>0;})()")  # R3.5: 'dialog' = the inline summary step is showing


def gate_in_app(pg):
    return pg.evaluate("!!document.querySelector('#app #v23-parent-password')")


def gate_in_page(pg):
    """R3.5: the page-level gate (#v23-parent-password) is on screen."""
    return pg.evaluate("(()=>{const e=document.querySelector('#v23-parent-password');return !!e&&e.getBoundingClientRect().height>0;})()")


def titles(pg):
    return pg.evaluate("__T.db().ranges.map(r=>r.title)")


def calm(pg):
    """Known-good starting point between segments (also used when the baseline build derails a segment)."""
    pg.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.querySelectorAll('#wq20-gate').forEach(x=>x.remove())")
    pg.evaluate("location.hash='#kid'")
    pg.wait_for_timeout(200)
    pg.evaluate('__T.parentFor(60000)')


def run(p, w, h, touch, label):
    b, ctx, pg, errs = U.boot(p, w=w, h=h, touch=touch)
    ERRS.extend(errs)
    st = {'accept': True}
    pg.on('dialog', lambda d: d.accept() if st['accept'] else d.dismiss())
    U.unlock(pg)
    c = lambda n: '%s %s' % (label, n)  # noqa: E731

    def seg(name, fn):
        """A segment that derails (e.g. the baseline has no in-dialog gate) is reported and the next one starts clean."""
        try:
            fn()
        except Exception as e:  # noqa: BLE001
            R.check(c('segment "%s" ran to the end' % name), lambda: require(False, ' '.join(str(e).split())[:160]))
        try:
            calm(pg)
        except Exception:  # noqa: BLE001
            pass

    def import_dialog():
        # R3.5: the import summary is an inline step of the page (not a pop-up), so an expired confirmation shows the
        # page-level parent gate. What must still hold: the draft survives, nothing is written without a fresh press.
        reach_summary(pg, 'Unit A', ['apple', 'banana'])
        R.check(c('1 summary step reached through the real import flow'), lambda: require(dialog_open(pg)))
        pg.evaluate('__T.expireParent()')
        pg.click('#v20-save-range')
        pg.wait_for_timeout(500)
        R.check(c('2 expired: the draft is kept and nothing is saved'), lambda: require(pg.evaluate("__T.importDraft().title") == 'Unit A' and 'Unit A' not in titles(pg)))
        R.check(c('3 expired: an explicit parent-check page with a password box is shown'), lambda: require(
            pg.evaluate("document.querySelector('#app h1')?.innerText||''") == '家長確認' and gate_in_page(pg)))
        R.check(c('4 expired: the password box is reachable (top-most element)'), lambda: require(U.wq33.hit(pg, '#v23-parent-password') is True))
        R.check(c('5 expired: no pop-up is open behind the gate'), lambda: require(not pg.evaluate("!!document.querySelector('dialog[open]')")))
        soft(lambda: pg.fill('#v23-parent-password', 'wrong-password-1', timeout=2000))
        soft(lambda: pg.click('[data-v23="parent-unlock"]', timeout=2000))
        pg.wait_for_timeout(1500)
        R.check(c('7 wrong password: error shown, still locked'), lambda: require('密碼不正確' in pg.evaluate("document.querySelector('#v23-parent-error')?.textContent||''") and not pg.evaluate('__T.parentAllowed()')))
        soft(lambda: pg.fill('#v23-parent-password', PW, timeout=2000))
        soft(lambda: pg.click('[data-v23="parent-unlock"]', timeout=2000))
        soft(lambda: pg.wait_for_function('__T.parentAllowed()', timeout=3000))
        pg.wait_for_timeout(500)
        R.check(c('8 correct password: back on the summary step, no automatic save'), lambda: require(dialog_open(pg) and 'Unit A' not in titles(pg)))
        R.check(c('9 draft survives: title and both words are intact (the tick must be given again)'), lambda: require(
            pg.evaluate("__T.importDraft().title") == 'Unit A' and pg.evaluate("document.querySelectorAll('#v20-summary .v20-summary-list li').length") == 2))
        R.check(c('10 nothing was written by the verification itself (no automatic replay)'), lambda: require('Unit A' not in titles(pg)))
        soft(lambda: pg.check('#confirm-import', timeout=3000))
        pg.evaluate('__T.parentFor(60000)')
        soft(lambda: pg.click('#v20-save-range', timeout=3000))
        pg.wait_for_timeout(800)
        R.check(c('11 pressing the save button again saves the range and leaves the step'), lambda: require('Unit A' in titles(pg) and not dialog_open(pg)))
        R.check(c('12 the saved range has both words'), lambda: require(len([x for x in pg.evaluate('__T.db().words') if x['en'] in ('apple', 'banana') and x['rangeId'] in [r['id'] for r in pg.evaluate('__T.db().ranges') if r['title'] == 'Unit A']]) == 2))

    def second_import():
        # Enter submits the password, and a second expiry in the same flow works again
        reach_summary(pg, 'Unit B', ['cherry', 'grape'])
        pg.evaluate('__T.expireParent()')
        pg.click('#v20-save-range')
        soft(lambda: pg.wait_for_selector('#v23-parent-password', timeout=3000))
        soft(lambda: pg.fill('#v23-parent-password', PW, timeout=2000))
        soft(lambda: pg.press('#v23-parent-password', 'Enter', timeout=2000))
        soft(lambda: pg.wait_for_function('__T.parentAllowed()', timeout=3000))
        pg.wait_for_timeout(500)
        R.check(c('13 Enter in the password box verifies'), lambda: require(dialog_open(pg) and pg.evaluate('__T.parentAllowed()')))
        soft(lambda: pg.check('#confirm-import', timeout=3000))
        pg.evaluate('__T.expireParent()')
        pg.click('#v20-save-range')
        pg.wait_for_timeout(400)
        R.check(c('14 a second expiry shows the password box again (single box)'), lambda: require(pg.evaluate("document.querySelectorAll('#v23-parent-password').length") == 1 and gate_in_page(pg)))
        R.check(c('15 buttons that need no parent check still work while expired (back to the child home)'),
                lambda: (pg.click('#app a[href="#kid"]'), pg.wait_for_timeout(300), require(pg.evaluate('location.hash') == '#kid'))[2])
        R.check(c('16 draft is still there after leaving the gate'), lambda: require(pg.evaluate("__T.importDraft().title") == 'Unit B' and 'Unit B' not in titles(pg)))

    def real_expiry():
        reach_summary(pg, 'Unit C', ['lemon', 'mango'])
        pg.evaluate('__T.parentFor(1200)')
        pg.wait_for_timeout(1700)  # real elapsed time instead of the forced reset
        R.check(c('17 real expiry (1.2 s) behaves the same'), lambda: (pg.click('#v20-save-range'), pg.wait_for_timeout(400), require(gate_in_page(pg)))[2])
        soft(lambda: pg.fill('#v23-parent-password', PW, timeout=2000))
        soft(lambda: pg.click('[data-v23="parent-unlock"]', timeout=2000))
        pg.wait_for_timeout(500)
        soft(lambda: pg.check('#confirm-import', timeout=3000))
        pg.evaluate('__T.parentFor(60000)')
        soft(lambda: pg.click('#v20-save-range', timeout=3000))
        pg.wait_for_timeout(800)
        R.check(c('18 after verification the save goes through and nothing is left over'), lambda: require('Unit C' in titles(pg) and not gate_in_page(pg) and not pg.evaluate("!!document.querySelector('#wq20-gate')")))

    def not_expired():
        reach_summary(pg, 'Unit D', ['melon', 'peach'])
        pg.click('#v20-save-range')
        pg.wait_for_timeout(800)
        R.check(c('19 not expired: saves directly, no gate anywhere'), lambda: require('Unit D' in titles(pg) and not gate_in_app(pg) and not pg.evaluate("!!document.querySelector('#wq20-gate')")))

    got = {}

    def family_dialog():
        pg.evaluate('__T.render()')
        pg.evaluate("location.hash='#settings'")
        pg.wait_for_timeout(400)
        pg.click('#r3-family-entry [data-r3="family"]')
        pg.wait_for_selector('#r3-dialog[open]', timeout=8000)
        pg.evaluate('__T.expireParent()')
        pg.click('#r3-dialog [data-r3="export-family"]')
        pg.wait_for_timeout(500)
        R.check(c('20 family dialog: expired -> message and password box inside that dialog'), lambda: require(
            pg.evaluate("document.querySelector('#r3-dialog #wq20-gate')?.innerText||''").count('家長確認已過期，請重新輸入密碼') == 1 and U.wq33.hit(pg, '#r3-dialog #wq20-gate-password') is True and not gate_in_app(pg)))
        soft(lambda: pg.fill('#wq20-gate-password', PW, timeout=2000))
        soft(lambda: pg.press('#wq20-gate-password', 'Enter', timeout=2000))
        soft(lambda: pg.wait_for_function('__T.parentAllowed()', timeout=3000))
        pg.wait_for_timeout(300)

        def export_again():
            with pg.expect_download(timeout=4000) as dl:
                pg.click('#r3-dialog [data-r3="export-family"]', timeout=3000)
            got['file'] = dl.value.path()
        soft(export_again)
        R.check(c('21 family dialog: after verification the same button now exports a backup'), lambda: require(json.loads(open(got['file'], encoding='utf-8').read())['format'] == 'wordquest-family'))
        R.check(c('22 family dialog: still open with its content'), lambda: require(pg.evaluate("!!document.querySelector('#r3-dialog')?.open")))
        # throttling / lock-out is shared with the normal gate (v23AuthFailures / v23AuthBlockedUntil)
        pg.evaluate('__T.expireParent()')
        pg.click('#r3-dialog [data-r3="export-family"]')
        soft(lambda: pg.wait_for_selector('#wq20-gate-password', timeout=3000))
        for i in range(5):
            soft(lambda: pg.fill('#wq20-gate-password', 'bad-%d' % i, timeout=1500))
            soft(lambda: pg.click('#wq20-gate [data-wq20="gate-unlock"]', timeout=1500))
            pg.wait_for_timeout(1300)
        soft(lambda: pg.fill('#wq20-gate-password', PW, timeout=1500))
        soft(lambda: pg.click('#wq20-gate [data-wq20="gate-unlock"]', timeout=1500))
        pg.wait_for_timeout(600)
        R.check(c('23 five wrong passwords lock the box for a while, even a correct one is refused'), lambda: require('試了太多次' in pg.evaluate("document.querySelector('#wq20-gate-error')?.textContent||''") and not pg.evaluate('__T.parentAllowed()')))

    seg('import dialog', import_dialog)
    seg('second import', second_import)
    seg('real expiry', real_expiry)
    seg('not expired', not_expired)
    seg('family dialog', family_dialog)
    b.close()


with sync_playwright() as p:
    run(p, 390, 844, True, 'phone')
    run(p, 1280, 800, False, 'desktop')

R.done(ERRS)

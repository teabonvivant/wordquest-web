"""R3.3 p20 / WQ32-01: leftover recovery marker with a missing or damaged journal.

Run:  WQ33_APP=<index.html> python3 r33_tests/p20_rescue_browser.py   (default app/index.html)
Real Chromium, real parent gate / validators / IndexedDB. Only fault injection: one-shot wrappers around
r3ReplaceMedia / r3Journal (see p20_util.py). Baseline R3.2 is expected to FAIL the rescue checks and PASS the
"ordinary writes stay blocked" and "no marker" regression checks.
"""
import json
from pathlib import Path
import p20_util as U
from p20_util import require, sync_playwright

U.build_copy()
R = U.Reporter('p20 rescue (WQ32-01)')
ERRS = []
KV_SAME = "(a)=>JSON.stringify(a)===JSON.stringify(__T.kv())"


def new(p, **kw):
    b, ctx, pg, errs = U.boot(p, **kw)
    ERRS.extend(errs)
    pg.dialog_log = []
    state = {'accept': True}
    pg.dstate = state

    def on_dialog(d):
        pg.dialog_log.append(d.message)
        d.accept() if state['accept'] else d.dismiss()
    pg.on('dialog', on_dialog)
    U.unlock(pg)
    return b, pg


def export_bytes(pg):
    with pg.expect_download() as d:
        pg.evaluate("__T.exportPack().then(()=>0)")
    return Path(d.value.path()).read_bytes()


def seed_backup(pg):
    """Child 'A原版' + one word + image/note media, export a valid backup, then change the live data to 'B現場'."""
    pg.evaluate("__T.rename('A原版')")
    wid = pg.evaluate("__T.addWord('apple').id")
    pg.evaluate("async id=>{await __T.putMedia([{key:'image:'+id+':apple',kind:'image',blob:__T.png(),source:'t'},{key:'note:'+id+':apple',kind:'note',textOnly:true}]);return 1;}", wid)
    data = export_bytes(pg)
    pg.evaluate("__T.clearMedia()")  # live media differs from the backup: a restore has to bring it back
    pg.evaluate("__T.rename('B現場')")
    return wid, data, json.loads(data)['payload']


def name(pg):
    return pg.evaluate("__T.db().children[0].name")


def open_panel(pg):
    pg.evaluate("location.hash='#settings'")
    pg.wait_for_timeout(200)
    pg.evaluate("__T.render()")
    pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('#r3-dialog')?.close()")
    soft(lambda: pg.click('#r3-family-entry [data-r3="family"]', timeout=3000))
    pg.wait_for_timeout(700)


def panel_text(pg):
    return pg.evaluate("document.querySelector('#r3-dialog')?.innerText||''")


def soft(fn):
    """Run a UI step that may legitimately not exist on the baseline; never abort the whole suite."""
    try:
        fn()
        return True
    except Exception:  # noqa: BLE001
        return False


def reset_msg(pg):
    """resetAll reports failures with a toast (it never throws): return that toast text."""
    pg.evaluate("document.querySelector('#toast')?.remove()")
    pg.evaluate('__T.reset()')
    return pg.evaluate("document.querySelector('#toast')?.textContent||''")


def wait_rescue(pg):
    return soft(lambda: pg.wait_for_selector('#wq20-rescue-text strong', timeout=3000))


def ui_restore(pg, data):
    soft(lambda: pg.set_input_files('#r3-family-file', {'name': 'family.json', 'mimeType': 'application/json', 'buffer': data}, timeout=3000))
    soft(lambda: pg.wait_for_selector('#r3-restore-consent', timeout=3000))


with sync_playwright() as p:
    # ---------------------------------------------------------------- A. journal missing, full UI path
    b, pg = new(p)
    wid, data, payload = seed_backup(pg)
    R.check('A0 normal state is writable before the marker', lambda: require(pg.evaluate('__T.canWrite()')))
    pg.evaluate("__T.setMarker('prepared')")
    before = pg.evaluate('__T.kv()')
    R.check('A1 journal really is missing (reproduction)', lambda: require(pg.evaluate('__T.journalGet()') is None))
    R.check('A2 ordinary writes stay blocked (canWrite false)', lambda: require(pg.evaluate('__T.canWrite()') is False))
    R.check('A3 ordinary save() stays blocked', lambda: require(pg.evaluate('__T.save()') is False))
    R.check('A4 ordinary save() did not touch stored data', lambda: require(pg.evaluate(KV_SAME, before)))
    open_panel(pg)
    R.check('A5 family panel opens although the marker exists', lambda: require(pg.evaluate("!!document.querySelector('#r3-dialog')?.open")))
    R.check('A6 no parent gate is drawn (parent already verified)', lambda: require(pg.evaluate("!!document.querySelector('#r3-dialog')?.open&&!document.querySelector('#v23-parent-password')")))
    wait_rescue(pg)
    R.check('A7 panel explains the situation (journal missing)', lambda: require('救援說明' in panel_text(pg) and '找不到復原日誌' in panel_text(pg), panel_text(pg)[:200]))
    R.check('A8 panel gives the restore-from-backup guidance', lambda: require('還原家庭備份' in panel_text(pg) and '匯出家庭完整備份' in panel_text(pg)))
    R.check('A9 plan / voice / legacy-maths buttons are disabled during rescue',
            lambda: require(pg.evaluate('''(()=>{const l=[...document.querySelectorAll('#r3-dialog button[data-r3="save-plan"],#r3-dialog button[data-r3="save-voice"],#r3-dialog button[data-r3="legacy-math"]')];return l.length===3&&l.every(b=>b.disabled);})()''')))
    soft(lambda: pg.click('#r3-dialog [data-r3="recover"]', timeout=3000))
    pg.wait_for_timeout(500)
    R.check('A10 "恢復中斷交易" still reports the missing journal and changes nothing',
            lambda: require('遺失' in (pg.evaluate("document.querySelector('#r3-status')?.textContent||''")) and pg.evaluate('__T.marker()') == 'prepared' and pg.evaluate(KV_SAME, before)))
    ui_restore(pg, data)
    R.check('A11 restore preview shows the backup child and the rescue note',
            lambda: require('A原版' in panel_text(pg) and '上次家庭交易未完成' in panel_text(pg), panel_text(pg)[:300]))
    soft(lambda: pg.check('#r3-restore-consent', timeout=3000))
    soft(lambda: pg.click('[data-r3="confirm-restore"]', timeout=3000))
    soft(lambda: pg.wait_for_function('__T.marker()===null', timeout=6000))
    pg.wait_for_timeout(500)
    R.check('A12 valid backup restores: data is the backup (A原版)', lambda: require(name(pg) == 'A原版', name(pg)))
    R.check('A13 marker cleared and no journal left', lambda: require(pg.evaluate('__T.marker()') is None and pg.evaluate('__T.journalGet()') is None))
    R.check('A14 media of the backup is back', lambda: require(sorted(m['key'] for m in pg.evaluate('__T.media()')) == sorted(['image:%s:apple' % wid, 'note:%s:apple' % wid]), str(pg.evaluate('__T.media()'))))
    R.check('A15 writes work again after the restore', lambda: require(pg.evaluate('__T.canWrite()') and pg.evaluate('__T.save()') is True and not pg.evaluate('__T.loadBlocked()')))
    R.check('A16 restore dialog closed after success', lambda: require(name(pg) == 'A原版' and pg.evaluate("!document.querySelector('#r3-dialog')?.open")))
    b.close()

    # ---------------------------------------------------------------- B. journal invalid
    b, pg = new(p)
    wid, data, payload = seed_backup(pg)
    pg.evaluate("__T.setMarker('prepared')")
    pg.evaluate("__T.journalPut({owner:__T.owner(),before:'garbage',at:1,label:'x'})")
    R.check('B1 a journal row exists but is damaged (reproduction)', lambda: require(pg.evaluate('__T.journalGet()')['before'] == 'garbage'))
    R.check('B2 ordinary writes stay blocked', lambda: require(pg.evaluate('__T.canWrite()') is False))
    open_panel(pg)
    wait_rescue(pg)
    R.check('B3 panel opens and says the journal is damaged', lambda: require('復原日誌已損壞' in panel_text(pg), panel_text(pg)[:200]))
    R.check('B4 valid backup restores through the damaged journal', lambda: require(pg.evaluate('(p)=>__T.restore(p)', payload) == ''))
    R.check('B5 data is the backup, marker and damaged journal gone', lambda: require(name(pg) == 'A原版' and pg.evaluate('__T.marker()') is None and pg.evaluate('__T.journalGet()') is None))
    R.check('B6 writes work again', lambda: require(pg.evaluate('__T.canWrite()') and pg.evaluate('__T.save()') is True))
    b.close()

    # ---------------------------------------------------------------- C. restore failures keep marker and data
    b, pg = new(p)
    wid, data, payload = seed_backup(pg)
    pg.evaluate("__T.setMarker('prepared')")
    kv0 = pg.evaluate('__T.kv()')
    pg.evaluate('__T.failReplaceMedia(1)')
    msg = pg.evaluate('(p)=>__T.restore(p)', payload)
    R.check('C1 restore fails when the media write fails', lambda: require('Injected' in msg, msg))
    R.check('C2 failed restore: marker still prepared, stored data identical', lambda: require(pg.evaluate('__T.marker()') == 'prepared' and pg.evaluate(KV_SAME, kv0)))
    R.check('C3 failed restore: no leftover journal (there was none) and still blocked', lambda: require(pg.evaluate('__T.journalGet()') is None and pg.evaluate('__T.canWrite()') is False))
    R.check('C4 live data is unchanged in memory', lambda: require(name(pg) == 'B現場'))
    R.check('C5 retrying after the failure succeeds', lambda: require(pg.evaluate('(p)=>__T.restore(p)', payload) == '' and name(pg) == 'A原版' and pg.evaluate('__T.marker()') is None))
    b.close()

    b, pg = new(p)
    wid, data, payload = seed_backup(pg)
    pg.evaluate("__T.setMarker('prepared')")
    kv0 = pg.evaluate('__T.kv()')
    pg.evaluate('__T.failReplaceMedia(2)')
    msg = pg.evaluate('(p)=>__T.restore(p)', payload)
    R.check('C6 restore AND rollback fail: error says the journal was kept', lambda: require('復原日誌已保留' in msg, msg))
    R.check('C7 double failure: marker kept, loadBlocked set', lambda: require(pg.evaluate('__T.marker()') == 'prepared' and pg.evaluate('__T.loadBlocked()') is True))
    R.check('C8 double failure: a valid "rescue-before" journal holds the live data',
            lambda: require((pg.evaluate('__T.journalGet()') or {}).get('label') == 'rescue-before' and pg.evaluate('(j)=>j.before[__T.key()]===__T.kv()[__T.key()]', pg.evaluate('__T.journalGet()'))))
    R.check('C9 double failure: stored data identical to before', lambda: require(pg.evaluate(KV_SAME, kv0)))
    rec = pg.evaluate('__T.recover()')
    R.check('C10 the kept journal is usable by "恢復中斷交易"', lambda: require(rec['done'] is True and pg.evaluate('__T.marker()') is None and name(pg) == 'B現場', str(rec)))
    b.close()

    b, pg = new(p)
    wid, data, payload = seed_backup(pg)
    pg.evaluate("__T.setMarker('prepared')")
    pg.evaluate("__T.journalPut({owner:__T.owner(),before:'garbage',at:1,label:'x'})")
    pg.evaluate('__T.failReplaceMedia(1)')
    msg = pg.evaluate('(p)=>__T.restore(p)', payload)
    R.check('C11 failed rescue with a damaged journal puts the original journal row back',
            lambda: require('Injected' in msg and (pg.evaluate('__T.journalGet()') or {}).get('before') == 'garbage' and pg.evaluate('__T.marker()') == 'prepared', msg))
    b.close()

    b, pg = new(p)
    wid, data, payload = seed_backup(pg)
    pg.evaluate("__T.setMarker('prepared')")
    kv0 = pg.evaluate('__T.kv()')
    pg.evaluate("__T.failJournal('put',1)")
    msg = pg.evaluate('(p)=>__T.restore(p)', payload)
    R.check('C12 snapshot journal cannot be written: nothing is changed', lambda: require('Injected' in msg and pg.evaluate(KV_SAME, kv0) and pg.evaluate('__T.marker()') == 'prepared', msg))
    b.close()

    b, pg = new(p)
    wid, data, payload = seed_backup(pg)
    pg.evaluate("__T.setMarker('prepared')")
    pg.evaluate("__T.failJournal('delete',1)")
    msg = pg.evaluate('(p)=>__T.restore(p)', payload)
    R.check('C13 journal cleanup failure after replacement leaves marker "committed" and blocks', lambda: require(pg.evaluate('__T.marker()') == 'committed' and pg.evaluate('__T.loadBlocked()') is True, msg))
    rec = pg.evaluate('__T.recover()')
    R.check('C14 recovery finishes the committed rescue: backup data kept, marker gone', lambda: require(rec['done'] is True and name(pg) == 'A原版' and pg.evaluate('__T.marker()') is None and pg.evaluate('__T.journalGet()') is None, str(rec)))
    b.close()

    # ---------------------------------------------------------------- D. usable journal: no rescue, point to recovery
    b, pg = new(p)
    wid, data, payload = seed_backup(pg)
    pg.evaluate("(r)=>__T.journalPut(r)", pg.evaluate('__T.validJournalRow("interrupted")'))
    pg.evaluate("__T.setMarker('prepared')")
    kv0 = pg.evaluate('__T.kv()')
    msg = pg.evaluate('(p)=>__T.restore(p)', payload)
    R.check('D1 valid journal: restore is refused and points to "恢復中斷交易"', lambda: require('恢復中斷交易' in msg, msg))
    R.check('D2 valid journal: nothing changed, journal kept', lambda: require(pg.evaluate(KV_SAME, kv0) and pg.evaluate('__T.marker()') == 'prepared' and pg.evaluate('__T.journalGet()') is not None))
    msg = reset_msg(pg)
    R.check('D3 valid journal: clear-account is refused too', lambda: require('恢復中斷交易' in msg and pg.evaluate(KV_SAME, kv0), msg))
    open_panel(pg)
    wait_rescue(pg)
    R.check('D4 panel says to recover first and disables "還原家庭備份"', lambda: require('請先恢復' in panel_text(pg) and pg.evaluate("document.querySelector('[data-r3=\"choose-family\"]').disabled")))
    rec = pg.evaluate('__T.recover()')
    R.check('D5 "恢復中斷交易" restores the pre-transaction state and clears the marker', lambda: require(rec['done'] is True and pg.evaluate('__T.marker()') is None and name(pg) == 'B現場', str(rec)))
    b.close()

    for marker in ['committed', 'rolled-back']:
        b, pg = new(p)
        wid, data, payload = seed_backup(pg)
        pg.evaluate("(m)=>__T.setMarker(m)", marker)
        msg = pg.evaluate('(p)=>__T.restore(p)', payload)
        R.check('D6 marker %s without journal: restore refused, recovery is the way' % marker, lambda: require('恢復中斷交易' in msg and name(pg) == 'B現場', msg))
        rec = pg.evaluate('__T.recover()')
        R.check('D7 marker %s: "恢復中斷交易" clears it without a journal' % marker, lambda: require(rec['done'] is True and pg.evaluate('__T.marker()') is None, str(rec)))
        b.close()

    # ---------------------------------------------------------------- E. journal store unreadable
    b, pg = new(p)
    wid, data, payload = seed_backup(pg)
    pg.evaluate("__T.setMarker('prepared')")
    kv0 = pg.evaluate('__T.kv()')
    pg.evaluate("__T.failJournalAlways('get')")
    msg = pg.evaluate('(p)=>__T.restore(p)', payload)
    R.check('E1 unreadable journal store: restore refused, nothing changed', lambda: require('未能讀取復原日誌庫' in msg and pg.evaluate(KV_SAME, kv0) and pg.evaluate('__T.marker()') == 'prepared', msg))
    msg = reset_msg(pg)
    R.check('E2 unreadable journal store: clear-account refused as well', lambda: require('未能讀取復原日誌庫' in msg and pg.evaluate(KV_SAME, kv0), msg))
    b.close()

    # ---------------------------------------------------------------- F. clear account during a rescue
    b, pg = new(p)
    wid, data, payload = seed_backup(pg)
    pg.evaluate("__T.setMarker('prepared')")
    kv0 = pg.evaluate('__T.kv()')
    pg.dstate['accept'] = False
    pg.dialog_log.clear()
    pg.evaluate('__T.reset()')
    R.check('F1 clear-account asks first, with the stronger rescue warning',
            lambda: require(len(pg.dialog_log) == 1 and '家庭備份' in pg.dialog_log[0] and '取消' in pg.dialog_log[0], str(pg.dialog_log)))
    R.check('F2 cancelling changes nothing', lambda: require(pg.evaluate(KV_SAME, kv0) and pg.evaluate('__T.marker()') == 'prepared'))
    pg.dstate['accept'] = True
    R.check('F3 confirmed clear-account succeeds during a rescue (success toast, no error)', lambda: require('已清除' in reset_msg(pg)))
    R.check('F4 data cleared, marker removed, journal gone', lambda: require(name(pg) == '小朋友' and pg.evaluate('__T.marker()') is None and pg.evaluate('__T.journalGet()') is None, name(pg)))
    R.check('F5 custom media cleared and writes work again', lambda: require(pg.evaluate('__T.media()') == [] and pg.evaluate('__T.canWrite()') and pg.evaluate('__T.save()') is True))
    b.close()

    b, pg = new(p)
    seed_backup(pg)
    pg.evaluate("__T.setMarker('prepared')")
    open_panel(pg)
    soft(lambda: pg.wait_for_selector('[data-wq20="reset"]', timeout=3000))
    pg.dialog_log.clear()
    soft(lambda: pg.click('[data-wq20="reset"]', timeout=3000))
    soft(lambda: pg.wait_for_function('__T.marker()===null', timeout=8000))
    R.check('F6 the panel offers "清除目前帳戶資料" as the last resort and it works', lambda: require(name(pg) == '小朋友' and len(pg.dialog_log) == 1, str(pg.dialog_log)))
    b.close()

    # ---------------------------------------------------------------- G. marker appears mid-run: honest message
    b, pg = new(p)
    R.check('G0 running normally: lease held, writable', lambda: require(pg.evaluate('__T.hasLease()') and pg.evaluate('__T.canWrite()')))
    pg.evaluate("__T.setMarker('prepared')")
    cap = pg.evaluate('__T.capErr()')
    R.check('G1 capability error no longer blames "another tab"', lambda: require('另一分頁' not in cap and '上次家庭交易未完成' in cap, cap))
    pg.evaluate('__T.requireParent(true)')
    toast = pg.evaluate("document.querySelector('#toast')?.textContent||''")
    R.check('G2 tool-bar toast says the last family transaction is unfinished', lambda: require('另一分頁' not in toast and '上次家庭交易未完成' in toast, toast))
    b.close()

    # ---------------------------------------------------------------- H. unknown marker value
    b, pg = new(p)
    wid, data, payload = seed_backup(pg)
    pg.evaluate("__T.setMarker('weird')")
    open_panel(pg)
    wait_rescue(pg)
    R.check('H1 unknown marker: panel opens and says the marker content is unknown', lambda: require('內容不明' in panel_text(pg), panel_text(pg)[:200]))
    R.check('H2 unknown marker: valid backup restores and clears it', lambda: require(pg.evaluate('(p)=>__T.restore(p)', payload) == '' and pg.evaluate('__T.marker()') is None and name(pg) == 'A原版'))
    b.close()

    # ---------------------------------------------------------------- I. export during a rescue
    b, pg = new(p)
    wid, data, payload = seed_backup(pg)
    pg.evaluate("__T.setMarker('prepared')")
    exp = pg.evaluate('__T.exportTry()')
    R.check('I1 rescue export is allowed and contains the live children', lambda: require(exp.get('ok') and exp['children'] == 1, str(exp)))
    open_panel(pg)
    soft(lambda: pg.click('[data-r3="export-family"]', timeout=3000))
    pg.wait_for_timeout(800)
    R.check('I2 panel export warns that the backup may be incomplete', lambda: require('可能不完整' in pg.evaluate("document.querySelector('#r3-status')?.textContent||''")))
    main = pg.evaluate('__T.key()')
    pg.evaluate("(k)=>localStorage.removeItem(k)", main)
    exp = pg.evaluate('__T.exportTry()')
    R.check('I3 rescue export refuses when the stored main data is missing', lambda: require(not exp['ok'] and '家庭主資料' in exp['msg'], str(exp)))
    pg.evaluate("(k)=>localStorage.setItem(k,'{broken')", main)
    exp = pg.evaluate('__T.exportTry()')
    R.check('I4 rescue export refuses damaged stored main data', lambda: require(not exp['ok'] and '家庭主資料' in exp['msg'], str(exp)))
    b.close()

    # ---------------------------------------------------------------- J. health dialog + K. startup text / banner
    b, pg = new(p)
    seed_backup(pg)
    pg.evaluate("__T.setMarker('prepared')")
    res = pg.evaluate('__T.health()')
    R.check('J1 device-health dialog opens while a marker exists', lambda: require(res == '' and '裝置與保存檢查' in panel_text(pg), res))
    pg.evaluate("document.querySelector('#r3-dialog')?.close()")
    pg.reload()
    pg.wait_for_timeout(2500)
    R.check('K1 startup message points to family management', lambda: require('家庭管理' in pg.evaluate('__T.issue()'), pg.evaluate('__T.issue()')))
    R.check('K2 recovery banner has a family-management / restore button', lambda: require(pg.evaluate("!!document.querySelector('#r3-recovery-banner [data-r3=\"family\"]')")))
    R.check('K3 after reload ordinary writes are still blocked', lambda: require(pg.evaluate('__T.canWrite()') is False and pg.evaluate('__T.loadBlocked()') is True))
    U.unlock(pg)
    pg.evaluate("__T.render()")
    pg.wait_for_timeout(300)
    soft(lambda: pg.click('#r3-recovery-banner [data-r3="family"]', timeout=3000))
    pg.wait_for_timeout(700)
    R.check('K4 banner button opens the family panel after parent verification', lambda: require(pg.evaluate("!!document.querySelector('#r3-dialog')?.open") and '救援說明' in panel_text(pg)))
    b.close()

    # ---------------------------------------------------------------- L. regression: no marker
    b, pg = new(p)
    wid, data, payload = seed_backup(pg)
    R.check('L1 no marker: restore works as before', lambda: require(pg.evaluate('(p)=>__T.restore(p)', payload) == '' and name(pg) == 'A原版' and pg.evaluate('__T.marker()') is None))
    pg.evaluate("__T.rename('B現場')")
    kv0 = pg.evaluate('__T.kv()')
    pg.evaluate('__T.failReplaceMedia(1)')
    msg = pg.evaluate('(p)=>__T.restore(p)', payload)
    R.check('L2 no marker: failed restore rolls back through the journal (marker and journal gone, data unchanged)',
            lambda: require('Injected' in msg and pg.evaluate('__T.marker()') is None and pg.evaluate('__T.journalGet()') is None and name(pg) == 'B現場', msg))
    R.check('L3 no marker: still writable after the rollback', lambda: require(pg.evaluate('__T.canWrite()') and pg.evaluate('__T.save()') is True))
    pg.dialog_log.clear()
    R.check('L4 no marker: clear-account uses the original confirmation and works', lambda: require(pg.evaluate('__T.reset()') == '' and len(pg.dialog_log) == 1 and '請先匯出家庭完整備份' in pg.dialog_log[0] and '最後手段' not in pg.dialog_log[0] and name(pg) == '小朋友', str(pg.dialog_log)))
    b.close()

    # ---------------------------------------------------------------- M. rescue still needs parent gate, lease, idle
    b, pg = new(p)
    wid, data, payload = seed_backup(pg)
    pg.evaluate("__T.setMarker('prepared')")
    kv0 = pg.evaluate('__T.kv()')
    pg.evaluate('__T.expireParent()')
    msg = pg.evaluate('(p)=>__T.restore(p)', payload)
    R.check('M1 expired parent verification: rescue restore refused', lambda: require('家長驗證' in msg and pg.evaluate(KV_SAME, kv0) and pg.evaluate('__T.marker()') == 'prepared', msg))
    pg.evaluate('__T.parentFor(60000)')
    pg.evaluate('__T.releaseLease()')
    msg = pg.evaluate('(p)=>__T.restore(p)', payload)
    R.check('M2 no write lease: rescue restore refused', lambda: require('編輯權' in msg and pg.evaluate(KV_SAME, kv0), msg))
    b.close()

    b, pg = new(p)
    wid, data, payload = seed_backup(pg)
    pg.evaluate("__T.setMarker('prepared')")
    kv0 = pg.evaluate('__T.kv()')
    pg.evaluate('__T.setBusy(true)')
    msg = pg.evaluate('(p)=>__T.restore(p)', payload)
    pg.evaluate('__T.setBusy(false)')
    R.check('M3 data transaction busy: rescue restore refused', lambda: require('資料處理尚未完成' in msg and pg.evaluate(KV_SAME, kv0), msg))
    R.check('M4 rescue never relaxed ordinary writes during any of the above', lambda: require(pg.evaluate('__T.canWrite()') is False and pg.evaluate('__T.save()') is False))
    b.close()

    # ---------------------------------------------------------------- N. damaged family settings must not hide the restore
    b, pg = new(p)
    wid, data, payload = seed_backup(pg)
    pg.evaluate("__T.setMarker('prepared')")
    pg.evaluate("(()=>{localStorage.setItem('wq-r3-family:'+__T.owner(),'{bad json');__T.reloadSettings();return 1;})()")
    open_panel(pg)
    R.check('N1 damaged family settings: the panel still opens (minimal rescue panel)', lambda: require(pg.evaluate("!!document.querySelector('#r3-dialog')?.open") and '還原家庭備份' in panel_text(pg), panel_text(pg)[:120]))
    R.check('N2 damaged family settings: a valid backup still restores', lambda: require(pg.evaluate('(p)=>__T.restore(p)', payload) == '' and name(pg) == 'A原版' and pg.evaluate('__T.marker()') is None))
    R.check('N3 after that the family settings are valid again and writes work', lambda: require(pg.evaluate('__T.canWrite()') and 'bad json' not in (pg.evaluate("localStorage.getItem('wq-r3-family:'+__T.owner())") or '')))
    b.close()

R.done(ERRS)

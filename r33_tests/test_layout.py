"""R3.3 p10 layout regression: N1, N2, N3, N4, N10, N12 (+ optional 'safe' = iOS home-indicator inset).

    WQ33_APP=<index.html> python3 r33_tests/test_layout.py            # everything
    WQ33_APP=<index.html> python3 r33_tests/test_layout.py n1 n12     # only some groups

Every check prints a line starting with PASS or FAIL; the last line is "<N> PASS / <M> FAIL"; exit 1 on any FAIL.
Pointer actions use real mouse / touchscreen events at element-centre co-ordinates (never locator.click()).
The baseline (originals/R3_2) is expected to FAIL most of these checks, the p10 build to pass all of them.
"""
import sys
import time

from layout_common import *  # noqa: F401,F403

FOCUS_ROUTES = ['learning', 'assembly-learn', 'learn', 'gameplay', 'arcade-play', 'playground',
                'range-new', 'family-lesson', 'phonics-lesson']
TABS = [('首頁', '#kid'), ('練習', '#practice'), ('街機', '#game'), ('家長', '#parent')]


def math_open(pg):
    return bool(pg.evaluate("!!document.querySelector('#wqm-dialog')&&document.querySelector('#wqm-dialog').open"))


def run_group(name, fn, p):
    t0 = time.time()
    print(f'# --- {name} ---', flush=True)
    try:
        fn(p)
    except Exception as e:  # a crashing group is a FAIL, never a silent skip
        fail_exc(name, e)
    print(f'# {name} done in {time.time() - t0:.0f}s', flush=True)


# =====================================================================================================
# N3: the floating maths launcher must never cover the nav or the page's main actions
# =====================================================================================================
N3_SIZES = [(320, 568), (360, 640), (390, 844), (412, 915), (520, 800), (768, 1024), (1280, 800)]


def n3(p):
    for w, h in N3_SIZES:
        tag = f'{w}x{h}'
        b, ctx, pg, errs = start(p, w, h, touch=(w <= 768))
        try:
            for hash_ in ['#kid', '#practice', '#game', '#parent']:
                goto(pg, hash_, 450)
                fab, navs = rect(pg, '#wqm-launch'), nav_rects(pg)
                # R3.5 (p10): the floating maths button is gone on purpose; maths is the 數學 nav tab, so nothing floats over the 5 tabs.
                check(f'N3 {tag} {hash_} no floating button; the nav has 5 tabs including 數學', fab is None and len(navs) == 5,
                      f'fab={fmt(fab)} tabs={[n["label"] for n in navs]}')
                bad = []
                for n in navs:
                    ok, why = hit_centre(pg, f'#wq29-nav a[href="{n["href"]}"]')
                    if not ok:
                        bad.append(f'{n["label"]}: {why}')
                check(f'N3 {tag} {hash_} every nav tab centre hits its own tab', not bad, '; '.join(bad))
            if w <= 520:
                # real taps on the two tabs that used to be covered (街機 / 家長)
                for label, route in [('街機', '#game'), ('家長', '#parent')]:
                    for how in ('mouse', 'touch'):
                        goto(pg, '#kid', 400)
                        tap_sel(pg, f'#wq29-nav a[href="{route}"]', how)
                        pg.wait_for_timeout(600)
                        check(f'N3 {tag} {how} tap on nav tab {label} goes to {route} (maths dialog stays closed)',
                              hashnow(pg) == route and not math_open(pg), f'hash={hashnow(pg)} mathOpen={math_open(pg)}')
                        if math_open(pg):
                            pg.evaluate("WQMathApp.close()")
                            pg.wait_for_timeout(400)
            # R3.5 (p10): maths opens from the 數學 nav tab (it replaced the floating launcher)
            goto(pg, '#kid', 400)
            ok, why = hit_centre(pg, '#wq29-nav .p10-nav-math')
            check(f'N3 {tag} 數學 nav tab centre hits itself', ok, why)
            tap_sel(pg, '#wq29-nav .p10-nav-math', 'touch' if w <= 768 else 'mouse')
            pg.wait_for_timeout(500)
            check(f'N3 {tag} tapping the 數學 nav tab opens the maths dialog', math_open(pg))
            if math_open(pg):
                pg.evaluate("WQMathApp.close()")
                pg.wait_for_timeout(500)
            if w == 390:
                check(f'N3 {tag} no page errors', not errs, errs[:2])
        except Exception as e:
            fail_exc(f'N3 {tag}', e)
        finally:
            b.close()


# =====================================================================================================
# N1: focusing a text field must not move the submit button (first tap on 提交答案 must send)
# =====================================================================================================
N1_SIZES = [(320, 568), (360, 640), (390, 844), (412, 915), (600, 900), (1280, 800)]


def _next_typed(pg, label):
    """Set-up only: move on to the next typed question of the same flow."""
    if label == 'L30':
        pg.evaluate("document.querySelector('[data-l30=next]')?.click()")
        pg.wait_for_timeout(300)
    elif label == 'L31':
        s = l31_state(pg)
        if s['correction']:
            pg.fill('#l31-correction', s['expected'] or '')
            pg.evaluate("document.querySelector('[data-l31=correct]').click()")
            pg.wait_for_timeout(200)
        pg.evaluate("document.querySelector('[data-l31=next]')?.click()")
        pg.wait_for_timeout(300)
        l31_to_recall(pg, restart=False)
    else:
        pg.evaluate("document.querySelector('[data-act=next-task]')?.click()")
        pg.wait_for_timeout(300)


def _n1_probe(pg, label, input_sel, submit_sel, done_js, touch):
    """Probe two consecutive typed questions: submit by mouse, then by touch (mouse twice on a desktop context).
    Returns (outs, note): note is None, or why the second typed question could not be reached."""
    outs, note = [], None
    for k, how in enumerate(('mouse', 'touch') if touch else ('mouse', 'mouse')):
        if k == 1:
            _next_typed(pg, label)
            if not pg.query_selector(input_sel + ':not([disabled])'):
                note = 'second typed question not reachable'
                break
        r = typed_submit_probe(pg, input_sel, submit_sel, how_focus=('touch' if touch else 'mouse'), how_submit=how)
        pg.wait_for_timeout(600)
        outs.append((how, r, bool(pg.evaluate(done_js))))
    return outs, note


def n1(p):
    for w, h in N1_SIZES:
        touch = w <= 768
        b, ctx, pg, errs = start(p, w, h, touch=touch)
        try:
            for label, setup, inp, sub, done in [
                ('L30 自己串字', lambda pg: l30_to_study(pg) and l30_to_spell(pg), '#l30-answer', '[data-l30=submit]',
                 "!!document.querySelector('.l30-feedback')"),
                ('L31 收起提示，自己串', lambda pg: l31_to_recall(pg), '#l31-answer', '[data-l31=submit]',
                 "!!document.querySelector('.l31-feedback')"),
                ('legacy #learn 自己串字', lambda pg: legacy_start(pg, 'spell'), '#answer', '#submit-answer',
                 "!!document.querySelector('[data-act=next-task], .p40-encourage')"),
            ]:
                tag = f'{w}x{h} {label}'
                try:
                    ok = setup(pg)
                    check(f'N1 {tag} typed question reachable', ok)
                    if not ok:
                        continue
                    kind = label.split()[0]
                    ok_c, why_c = hit_centre(pg, inp)
                    if not ok_c:  # pre-existing in R3.2, not a p10 target: report, do not count
                        print(f'INFO N1 {tag}: answer box centre is not the topmost element at the initial scroll position ({why_c})', flush=True)
                    outs, note = _n1_probe(pg, kind, inp, sub, done, touch)
                    how0, r0, sent0 = outs[0]
                    stable = same_rect(r0['idle'], r0['focused']) and same_rect(r0['idle'], r0['blurred']) \
                        and same_rect(r0['idle'], r0['refocused'])
                    check(f'N1 {tag} tapping the answer box focuses it and the typed text arrives', r0['focus_ok'] and r0['typed_ok'],
                          f"focus_ok={r0['focus_ok']} typed_ok={r0['typed_ok']}")
                    check(f'N1 {tag} submit button does not move on focus / blur', stable,
                          f"idle={fmt(r0['idle'])} focused={fmt(r0['focused'])} blurred={fmt(r0['blurred'])}")
                    for how, r, sent in outs:
                        check(f'N1 {tag} FIRST {how} tap on submit sends the answer', sent,
                              f"tapped at {None if not r['centre'] else [round(v) for v in r['centre']]} topmost={r['topmost']}")
                    if note:
                        check(f'N1 {tag} second typed question reachable', False, note)
                except Exception as e:
                    fail_exc(f'N1 {tag}', e)
            check(f'N1 {w}x{h} no page errors', not errs, errs[:2])
        except Exception as e:
            fail_exc(f'N1 {w}x{h}', e)
        finally:
            b.close()


# =====================================================================================================
# N2: legacy #learn (school dictation range) on small phones - action buttons fully tappable
# =====================================================================================================
N2_SIZES = [(320, 568), (360, 640), (375, 667), (390, 844), (414, 896)]


def _progress_sig(pg):
    return pg.evaluate("(document.querySelector('.task-shell')||document.querySelector('#app')).innerText.slice(0,400)")


def n2(p):
    for w, h in N2_SIZES:
        tag = f'{w}x{h}'
        b, ctx, pg, errs = start(p, w, h, touch=True)
        try:
            ok = legacy_start(pg, 'study')
            check(f'N2 {tag} legacy study view opens', ok, hashnow(pg))
            if ok:
                hits, total, blk = grid_hits(pg, '[data-act=study-done]')
                check(f'N2 {tag} 開始試試 → fully tappable (grid)', hits == total and total > 0, f'{hits}/{total} blocked by {blk}')
                ta, nav, fab = rect(pg, '.task-actions'), rect(pg, '#wq29-nav'), rect(pg, '#wqm-launch')
                check(f'N2 {tag} study action bar clear of nav and floating button',
                      not overlap(ta, nav) and not overlap(ta, fab), f'actions={fmt(ta)} nav={fmt(nav)} fab={fmt(fab)}')
                before = _progress_sig(pg)
                tap_sel(pg, '[data-act=study-done]', 'touch')
                pg.wait_for_timeout(500)
                check(f'N2 {tag} touch tap on 開始試試 → advances and stays in the lesson',
                      hashnow(pg) == '#learn' and _progress_sig(pg) != before, f'hash={hashnow(pg)}')
                if hashnow(pg) != '#learn':
                    legacy_start(pg, 'study')
                # a click on the LEFT part of the button used to land on the nav 首頁 link and leave the lesson
                r = rect(pg, '[data-act=study-done]')
                if r:
                    before = _progress_sig(pg)
                    tap(pg, r['l'] + 12, r['t'] + r['h'] / 2, 'mouse')
                    pg.wait_for_timeout(500)
                    check(f'N2 {tag} mouse click on the left part of 開始試試 does not leave the lesson',
                          hashnow(pg) == '#learn' and _progress_sig(pg) != before, f'hash={hashnow(pg)}')
                if hashnow(pg) != '#learn':
                    legacy_start(pg, 'study')
                # finish the study round (set-up only) so a typed round can start
                for _ in range(12):
                    if not pg.query_selector('[data-act=study-done]'):
                        break
                    pg.evaluate("document.querySelector('[data-act=study-done]')?.click()")
                    pg.wait_for_timeout(150)
            ok = legacy_start(pg, 'spell')
            check(f'N2 {tag} legacy typed question opens', ok, hashnow(pg))
            if ok:
                for sel, nm in [('#submit-answer', '交答案'), ('[data-act=show-help]', '看示範'), ('#answer', '答案輸入框')]:
                    hits, total, blk = grid_hits(pg, sel)
                    check(f'N2 {tag} {nm} fully tappable (grid)', hits == total and total > 0, f'{hits}/{total} blocked by {blk}')
                ta, nav, fab = rect(pg, '.task-actions'), rect(pg, '#wq29-nav'), rect(pg, '#wqm-launch')
                check(f'N2 {tag} typed action bar clear of nav and floating button',
                      not overlap(ta, nav) and not overlap(ta, fab), f'actions={fmt(ta)} nav={fmt(nav)} fab={fmt(fab)}')
                r = typed_submit_probe(pg, '#answer', '#submit-answer', how_focus='touch', how_submit='touch')
                pg.wait_for_timeout(600)
                check(f'N2 {tag} tapping the answer box focuses it and the typed text arrives', r['focus_ok'] and r['typed_ok'],
                      f"focus_ok={r['focus_ok']} typed_ok={r['typed_ok']}")
                # R3.5 (p40): the typed 'abc' is wrong, practice allows a retry, so the tap shows as the encouragement line
                check(f'N2 {tag} first touch tap on 交答案 sends the answer',
                      bool(pg.query_selector('[data-act=next-task], .p40-encourage')), f"topmost={r['topmost']} hash={hashnow(pg)}")
                if w == 390:
                    ab = pg.evaluate("document.querySelector('[data-act=pause-session]')?.getAttribute('aria-label')||''")
                    check(f'N2 {tag} the 休息 exit is labelled for assistive tech (nav is hidden on phones in a lesson)',
                          ('休息' in ab or '暫停' in ab), f'aria-label={ab!r}')
                    ok2, why = hit_centre(pg, '[data-act=pause-session]')
                    check(f'N2 {tag} 休息 exit centre is tappable', ok2, why)
                    tap_sel(pg, '[data-act=pause-session]', 'touch')
                    pg.wait_for_timeout(700)
                    check(f'N2 {tag} tapping 休息 leaves the lesson for #kid', hashnow(pg) == '#kid', f'hash={hashnow(pg)}')
            check(f'N2 {tag} no page errors', not errs, errs[:2])
        except Exception as e:
            fail_exc(f'N2 {tag}', e)
        finally:
            b.close()


# =====================================================================================================
# N4: import page dock ("核對及加入") above the nav and floating button
# =====================================================================================================
N4_SIZES = [(320, 568), (360, 640), (390, 844), (412, 915), (768, 1024), (1280, 800)]


def n4(p):
    for w, h in N4_SIZES:
        tag = f'{w}x{h}'
        touch = w <= 768
        b, ctx, pg, errs = start(p, w, h, touch=touch)
        try:
            ok = import_page(pg)
            check(f'N4 {tag} import page armed (text pasted, words selected, dock enabled)', ok,
                  pg.evaluate("document.querySelector('#v20-selected-count')?.textContent"))
            if not ok:
                continue
            hits, total, blk = grid_hits(pg, '#v20-confirm-next', 8, 4, scroll=False)
            check(f'N4 {tag} 核對及加入 grid tappable ({hits}/{total})', hits == total and total > 0, f'blocked by {blk}')
            dock, nav, fab = rect(pg, '#v20-import-dock'), rect(pg, '#wq29-nav'), rect(pg, '#wqm-launch')
            nav_fixed = pg.evaluate("getComputedStyle(document.querySelector('#wq29-nav')).position") == 'fixed'
            if nav_fixed:
                check(f'N4 {tag} dock sits above the fixed bottom nav', dock['b'] <= nav['t'] + 1, f'dock={fmt(dock)} nav={fmt(nav)}')
            check(f'N4 {tag} dock clear of the floating button', not overlap(dock, fab), f'dock={fmt(dock)} fab={fmt(fab)}')
            how_list = ('touch', 'mouse') if touch else ('mouse', 'mouse')
            for how in how_list:
                tap_sel(pg, '#v20-confirm-next', how)
                pg.wait_for_timeout(700)
                # R3.5 (p40): the summary is the inline third step of the add-range flow, not a pop-up dialog
                opened = bool(pg.evaluate("(()=>{const s=document.querySelector('#v20-summary');return !!s&&!s.hidden&&getComputedStyle(s).display!=='none'&&s.getBoundingClientRect().height>0;})()"))
                check(f'N4 {tag} {how} tap on 核對及加入 opens the summary step', opened)
                if opened:
                    pg.evaluate("document.querySelector('[data-p40=step][data-step=\"2\"]')?.click()")
                    pg.wait_for_timeout(400)
            check(f'N4 {tag} no page errors', not errs, errs[:2])
        except Exception as e:
            fail_exc(f'N4 {tag}', e)
        finally:
            b.close()


# =====================================================================================================
# N10: maths tower level buttons contrast
# =====================================================================================================
_TOWER_JS = """()=>{
  const sh=document.querySelector('#wqm-app-host').shadowRoot;
  function bgOf(el){const layers=[];for(let e=el;e;e=(e.parentNode instanceof ShadowRoot)?e.parentNode.host:e.parentElement){
      const m=(getComputedStyle(e).backgroundColor.match(/[\\d.]+/g)||[0,0,0,0]).map(Number);const a=m.length>3?m[3]:1;
      if(a>0)layers.push([m[0],m[1],m[2],a]);if(a>=1)break;}
    let base=[255,255,255];for(const l of layers.reverse())base=base.map((v,i)=>l[i]*l[3]+v*(1-l[3]));
    return 'rgb('+base.map(Math.round).join(',')+')';}
  return [...sh.querySelectorAll('.tower button')].map(b=>({text:b.textContent.trim(),selected:b.classList.contains('selected'),
    fg:getComputedStyle(b).color,bg:bgOf(b)}));}"""


def n10(p):
    b, ctx, pg, errs = start(p, 390, 844, touch=True)
    try:
        pg.evaluate("WQMathApp.open('olympiad')")
        wait_for(pg, "WQMathApp.getView()==='olympiad'", 4000)
        pg.wait_for_timeout(300)
        rows = pg.evaluate(_TOWER_JS)
        check('N10 tower shows the four level buttons', [r['text'] for r in rows] == ['啟蒙', '基礎', '進階', '競賽練習'],
              [r['text'] for r in rows])
        for r in rows:
            ratio = contrast(r['fg'], r['bg'])
            check(f"N10 tower button {r['text']}{' (selected)' if r['selected'] else ''} contrast >= 4.5:1", ratio >= 4.5,
                  f"{ratio:.2f}:1 fg={r['fg']} bg={r['bg']}")
        # hover state of a non-selected level (desktop pointer)
        loc = pg.locator('#wqm-app-host .tower button', has_text='進階')
        bb = loc.bounding_box()
        pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
        pg.wait_for_timeout(250)
        hov = [r for r in pg.evaluate(_TOWER_JS) if r['text'] == '進階'][0]
        ratio = contrast(hov['fg'], hov['bg'])
        check('N10 tower button 進階 (hover) contrast >= 4.5:1', ratio >= 4.5, f"{ratio:.2f}:1 fg={hov['fg']} bg={hov['bg']}")
        # choosing another level moves the selected style and keeps contrast
        tap(pg, bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2, 'touch')
        pg.wait_for_timeout(400)
        rows = pg.evaluate(_TOWER_JS)
        sel = [r for r in rows if r['selected']]
        check('N10 selecting 進階 marks exactly that button selected, contrast >= 4.5:1',
              len(sel) == 1 and sel[0]['text'] == '進階' and contrast(sel[0]['fg'], sel[0]['bg']) >= 4.5,
              [(r['text'], r['selected'], round(contrast(r['fg'], r['bg']), 2)) for r in rows])
        check('N10 no page errors', not errs, errs[:2])
    except Exception as e:
        fail_exc('N10', e)
    finally:
        b.close()


# =====================================================================================================
# N12: maths dialog <-> browser history
# =====================================================================================================
def nav_index(pg):
    return pg.evaluate("(typeof navigation!=='undefined'&&navigation.currentEntry)?navigation.currentEntry.index:null")


def back(pg, wait=700):
    pg.evaluate("history.back()")
    pg.wait_for_timeout(wait)


def prepare(pg):
    """Leave a known history: ... #kid, #practice (current), maths closed and settled."""
    pg.evaluate("window.WQMathApp&&WQMathApp.close()")
    pg.wait_for_timeout(900)
    goto(pg, '#kid', 350)
    goto(pg, '#practice', 450)


def open_by_tap(pg):
    tap_sel(pg, '#wq29-nav .p10-nav-math', 'touch')
    wait_for(pg, "!!document.querySelector('#wqm-dialog')&&document.querySelector('#wqm-dialog').open", 3000)
    pg.wait_for_timeout(200)
    return math_open(pg)


def n12(p):
    b, ctx, pg, errs = start(p, 390, 844, touch=True)
    try:
        ver = pg.evaluate("[typeof WQMathHost,WQMathHost&&WQMathHost.apiVersion,!!WQMathHost&&Object.isFrozen(WQMathHost)]")
        check('N12 WQMathHost.apiVersion === 1 and the host object is frozen', ver == ['object', 1, True], ver)

        # --- Back closes the dialog; the page behind keeps its hash; no dead history entry --------------------------
        prepare(pg)
        i0 = nav_index(pg)
        check('N12 back-case: maths opens from the floating button', open_by_tap(pg))
        back(pg, 800)
        check('N12 Back closes the dialog', not math_open(pg), f'open={math_open(pg)}')
        check('N12 Back leaves the hash behind the dialog unchanged', hashnow(pg) == '#practice', f'hash={hashnow(pg)}')
        check('N12 history position is back where it was before opening', i0 is None or nav_index(pg) == i0, f'{i0} -> {nav_index(pg)}')
        back(pg, 700)
        check('N12 the SECOND Back goes to the previous page (no dead history entry)', hashnow(pg) == '#kid' and not math_open(pg),
              f'hash={hashnow(pg)} open={math_open(pg)}')

        # --- the dialog can be reopened after a Back-close and still behaves ------------------------------------------
        prepare(pg)
        open_by_tap(pg)
        back(pg, 700)
        check('N12 reopen: maths opens again after a Back close', open_by_tap(pg))
        back(pg, 800)
        check('N12 reopen: Back closes it again, hash unchanged', not math_open(pg) and hashnow(pg) == '#practice',
              f'open={math_open(pg)} hash={hashnow(pg)}')

        # --- Esc ----------------------------------------------------------------------------------------------------
        prepare(pg)
        i0 = nav_index(pg)
        open_by_tap(pg)
        pg.keyboard.press('Escape')
        pg.wait_for_timeout(1100)
        check('N12 Esc closes the dialog', not math_open(pg))
        check('N12 Esc: hash unchanged and no extra history position', hashnow(pg) == '#practice' and (i0 is None or nav_index(pg) == i0),
              f'hash={hashnow(pg)} index {i0} -> {nav_index(pg)}')
        back(pg, 700)
        check('N12 Esc: ONE Back then reaches the previous page', hashnow(pg) == '#kid', f'hash={hashnow(pg)}')

        # --- close button inside the dialog (real tap on its centre) ------------------------------------------------------
        prepare(pg)
        i0 = nav_index(pg)
        open_by_tap(pg)
        bb = pg.locator('#wqm-app-host [data-action="close"]').first.bounding_box()
        tap(pg, bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2, 'touch')
        pg.wait_for_timeout(1100)
        check('N12 close button closes the dialog', not math_open(pg))
        check('N12 close button: hash unchanged and no extra history position', hashnow(pg) == '#practice' and (i0 is None or nav_index(pg) == i0),
              f'hash={hashnow(pg)} index {i0} -> {nav_index(pg)}')
        back(pg, 700)
        check('N12 close button: ONE Back then reaches the previous page', hashnow(pg) == '#kid', f'hash={hashnow(pg)}')

        # --- repeated open / Esc cycles do not pile up history -----------------------------------------------------------
        prepare(pg)
        for _ in range(3):
            open_by_tap(pg)
            pg.keyboard.press('Escape')
            pg.wait_for_timeout(900)
        back(pg, 700)
        check('N12 three open/Esc cycles then ONE Back reaches the previous page', hashnow(pg) == '#kid' and not math_open(pg),
              f'hash={hashnow(pg)} open={math_open(pg)}')

        # --- maths "家長" navigation (parent gate hand-over) ---------------------------------------------------------------
        prepare(pg)
        open_by_tap(pg)
        pbb = pg.locator('#wqm-app-host [data-action="nav:parent"]').first.bounding_box()
        tap(pg, pbb['x'] + pbb['width'] / 2, pbb['y'] + pbb['height'] / 2, 'touch')
        pg.wait_for_timeout(1300)
        check('N12 maths 家長 nav closes the dialog and lands on #parent with the password gate',
              (not math_open(pg)) and hashnow(pg) == '#parent' and bool(pg.query_selector('#v23-parent-password')),
              f'open={math_open(pg)} hash={hashnow(pg)} gate={bool(pg.query_selector("#v23-parent-password"))}')
        back(pg, 800)
        check('N12 Back from the parent gate returns to the page before maths was opened', hashnow(pg) == '#practice' and not math_open(pg),
              f'hash={hashnow(pg)} open={math_open(pg)}')

        # --- close() then open() in the same tick keeps one open dialog and one history entry ---------------------------------
        prepare(pg)
        open_by_tap(pg)
        pg.evaluate("()=>{WQMathApp.close();WQMathApp.open('home');}")
        pg.wait_for_timeout(1100)
        check('N12 same-tick close()+open(): dialog is open afterwards', math_open(pg))
        back(pg, 800)
        check('N12 same-tick close()+open(): Back closes it, hash unchanged', (not math_open(pg)) and hashnow(pg) == '#practice',
              f'open={math_open(pg)} hash={hashnow(pg)}')

        # --- close() followed by an immediate navigation must win (not be undone by a history rollback) --------------------
        variants = [
            ('(a) same tick', lambda: pg.evaluate("()=>{WQMathApp.close();location.hash='#game';}")),
            ('(b) setTimeout 0', lambda: pg.evaluate("()=>{WQMathApp.close();setTimeout(()=>{location.hash='#game';},0);}")),
            ('(c) two evaluate calls', lambda: (pg.evaluate("WQMathApp.close()"), pg.evaluate("location.hash='#game'"))),
        ]
        for nm, act in variants:
            prepare(pg)
            open_by_tap(pg)
            act()
            pg.wait_for_timeout(900)
            check(f'N12 close() then navigation {nm}: hash is #game after 900ms and the dialog is closed',
                  hashnow(pg) == '#game' and not math_open(pg), f'hash={hashnow(pg)} open={math_open(pg)}')
            pg.wait_for_timeout(500)
            check(f'N12 close() then navigation {nm}: still on #game 1.4s later (no late history rollback)',
                  hashnow(pg) == '#game', f'hash={hashnow(pg)}')
        # --- forced race: a navigation issued right AFTER the deferred history.back() was issued (in flight) must survive ----------
        for nm, js in [('immediately after history.back() returns',
                        "()=>{const hb=history.back.bind(history);let done=false;"
                        "history.back=function(){hb();if(!done){done=true;location.hash='#game';}history.back=hb;};"
                        "setTimeout(()=>{if(!done){done=true;location.hash='#game';}history.back=hb;},500);WQMathApp.close();}"),
                       ('2ms after history.back() returns',
                        "()=>{const hb=history.back.bind(history);let done=false;"
                        "history.back=function(){hb();if(!done){done=true;setTimeout(()=>{location.hash='#game';},2);}history.back=hb;};"
                        "setTimeout(()=>{if(!done){done=true;location.hash='#game';}history.back=hb;},500);WQMathApp.close();}")]:
            prepare(pg)
            open_by_tap(pg)
            pg.evaluate(js)
            pg.wait_for_timeout(1800)
            check(f'N12 forced race, navigation {nm}: ends on #game', hashnow(pg) == '#game' and not math_open(pg),
                  f'hash={hashnow(pg)} open={math_open(pg)}')
        check('N12 no page errors', not errs, errs[:3])
    except Exception as e:
        fail_exc('N12', e)
    finally:
        b.close()


# =====================================================================================================
# safe: iOS home-indicator inset (CDP safe-area override) - the fixed bars must use the real inset
# =====================================================================================================
def safe(p):
    b, ctx, pg, errs = start(p, 390, 844, touch=True)
    try:
        cdp = ctx.new_cdp_session(pg)
        try:
            cdp.send('Emulation.setSafeAreaInsetsOverride', {'insets': {'top': 0, 'bottom': 34, 'left': 0, 'right': 0}})
        except Exception as e:
            print(f'INFO safe-area override unavailable ({str(e)[:80]}); group skipped', flush=True)
            return
        pg.wait_for_timeout(400)
        goto(pg, '#kid', 500)
        env = pg.evaluate("""()=>{const d=document.createElement('div');d.style.cssText='position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px)';
          document.body.append(d);const h=d.getBoundingClientRect().height;d.remove();return h;}""")
        check('safe: the emulated bottom inset is 34px', abs(env - 34) < 1, f'env={env}')
        navs = nav_rects(pg)
        fab = rect(pg, '#wqm-launch')
        check('safe: floating button clear of every nav tab with a 34px inset', not [n['label'] for n in navs if overlap(fab, n)],
              f'fab={fmt(fab)} nav={[fmt(n) for n in navs][:1]}')
        bad = []
        for n in navs:
            ok, why = hit_centre(pg, '#wq29-nav a[href="' + n['href'] + '"]')
            if not ok:
                bad.append(n['label'] + ': ' + why)
        check('safe: nav tab centres hit their own tab with a 34px inset', not bad, '; '.join(bad))
        nav_box = rect(pg, '#wq29-nav')
        check('safe: nav bottom edge reaches the viewport bottom', nav_box and abs(nav_box['b'] - 844) < 1.5, fmt(nav_box))
        # L30 sticky action bar stays above the nav
        if l30_to_study(pg):
            qa, nv = rect(pg, '.l30-quizactions'), rect(pg, '#wq29-nav')
            check('safe: L30 action bar clear of the nav with a 34px inset', not overlap(qa, nv), f'actions={fmt(qa)} nav={fmt(nv)}')
            hits, total, blk = grid_hits(pg, '[data-l30=submit]')
            check(f'safe: L30 主按鈕 grid tappable with a 34px inset ({hits}/{total})', hits == total, blk)
        # import dock above the nav
        if import_page(pg):
            dock, nv = rect(pg, '#v20-import-dock'), rect(pg, '#wq29-nav')
            check('safe: import dock above the nav with a 34px inset', dock['b'] <= nv['t'] + 1, f'dock={fmt(dock)} nav={fmt(nv)}')
            hits, total, blk = grid_hits(pg, '#v20-confirm-next', 8, 4, scroll=False)
            check(f'safe: 核對及加入 grid tappable with a 34px inset ({hits}/{total})', hits == total, blk)
        check('safe: no page errors', not errs, errs[:2])
    except Exception as e:
        fail_exc('safe', e)
    finally:
        b.close()


GROUPS = {'n1': n1, 'n2': n2, 'n3': n3, 'n4': n4, 'n10': n10, 'n12': n12, 'safe': safe}

if __name__ == '__main__':
    want = [a.lower() for a in sys.argv[1:]] or list(GROUPS)
    unknown = [w for w in want if w not in GROUPS]
    if unknown:
        print('unknown group(s): %s; choose from %s' % (unknown, list(GROUPS)))
        sys.exit(2)
    print(f'# app under test: {APP}', flush=True)
    with sync_playwright() as p:
        for g in want:
            run_group(g, GROUPS[g], p)
    finish()

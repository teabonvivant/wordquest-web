"""Generic "can a finger actually press it" regression for phone layouts (R3.3 p10, N1-N4).

    WQ33_APP=<index.html> python3 r33_tests/hit_test.py

Widths (touch / is_mobile emulation): 320x568, 360x640, 390x844, 412x915. For each width, one fresh account:
  (a) every bottom-nav tab centre on #kid / #practice / #game / #parent is topmost at its own centre
      (elementFromPoint), so a tap there reaches that tab;
  (b) the floating maths launcher #wqm-launch (when visible) overlaps no nav tab and no main action button of the
      same screen (kid: 開始今天的小課, practice: first practice card, game: first 看玩法);
  (c) the main button of each flow is fully tappable (8x4 grid of elementFromPoint samples all hit it) and a REAL
      first tap at its centre (mouse once, touchscreen once; page.mouse / page.touchscreen, never locator.click())
      does what the button says:
        L30 學習 我已看過，下一步 | L30 串字 type + 提交答案 | legacy #learn 開始試試 + 交答案 |
        import page 核對及加入 | arcade lobby first 看玩法.
Output: one "PASS ..." / "FAIL ..." line per item, "INFO ..." lines for known/inherent overlaps (not counted),
final "<N> PASS / <M> FAIL", exit 1 on any FAIL. A scenario that throws counts as FAIL.
"""
import sys
import time

from layout_common import *  # noqa: F401,F403

SIZES = [(320, 568), (360, 640), (390, 844), (412, 915)]
SCREENS = [('#kid', '[data-l30=start]', '開始今天的小課'), ('#practice', '[data-l30=entry]', '第一張練習卡'),
           ('#game', '[data-a28=intro]', '第一個看玩法'), ('#parent', None, None)]


def grid_check(pg, tag, label, sel, scroll=True):
    hits, total, blk = grid_hits(pg, sel, 8, 4, scroll=scroll)
    return check(f'hit {tag} {label} grid {hits}/{total}', total > 0 and hits == total, f'blocked by {blk}' if hits != total else '')


def fab_clear(pg, tag, label, sels):
    fab = rect(pg, '#wqm-launch')
    bad = [s for s in sels if overlap(fab, rect(pg, s))]
    return check(f'hit {tag} floating button clear of {label}', not bad, f'fab={fmt(fab)} overlaps={bad}' if bad else '')


def info_overlaps(pg, tag, screen):
    """Inherent limitation of any floating button: it may sit over scrollable content. Reported, not counted."""
    items = pg.evaluate("""()=>{const f=document.querySelector('#wqm-launch');if(!f)return [];const fr=f.getBoundingClientRect();
      if(getComputedStyle(f).display==='none'||!fr.width)return [];
      return [...document.querySelectorAll('#app a[href],#app button,#app summary,#app select,#app input')].filter(e=>{const r=e.getBoundingClientRect();
        return r.width&&r.height&&r.top<innerHeight&&r.bottom>0&&Math.min(r.right,fr.right)-Math.max(r.left,fr.left)>0&&Math.min(r.bottom,fr.bottom)-Math.max(r.top,fr.top)>0;})
        .map(e=>(e.textContent||e.getAttribute('aria-label')||e.tagName).trim().slice(0,12));}""")
    if items:
        print(f'INFO hit {tag} {screen}: floating button sits over scrollable content at scroll 0: {items[:5]}', flush=True)


# ---------------------------------------------------------------- (a) + (b): screens with the nav
def screens(pg, tag):
    for hash_, prim_sel, prim_name in SCREENS:
        goto(pg, hash_, 500)
        pg.evaluate("window.scrollTo(0,0)")
        pg.wait_for_timeout(100)
        navs = nav_rects(pg)
        check(f'hit {tag} {hash_} bottom nav has 4 tabs', len(navs) == 4, [n['label'] for n in navs])
        for n in navs:
            ok, why = hit_centre(pg, f'#wq29-nav a[href="{n["href"]}"]')
            check(f'hit {tag} {hash_} nav tab {n["label"]} centre hits itself', ok, why)
        fab = rect(pg, '#wqm-launch')
        over = [n['label'] for n in navs if overlap(fab, n)]
        check(f'hit {tag} {hash_} floating button clear of every nav tab', not over, f'fab={fmt(fab)} overlaps={over}' if over else '')
        if prim_sel:
            check(f'hit {tag} {hash_} floating button clear of {prim_name}', not overlap(fab, rect(pg, prim_sel)),
                  f'fab={fmt(fab)} button={fmt(rect(pg, prim_sel))}')
        info_overlaps(pg, tag, hash_)


# ---------------------------------------------------------------- (c) flows
def flow_l30_study(pg, tag):
    ok = l30_to_study(pg)
    check(f'hit {tag} L30 study step opens', ok, hashnow(pg))
    if not ok:
        return
    sub = '[data-l30=submit]'
    grid_check(pg, tag, 'L30 study 我已看過，下一步', sub)
    fab_clear(pg, tag, 'L30 study 我已看過，下一步', [sub])
    for how in ('mouse', 'touch'):
        # a study step has no feedback stage: an accepted tap moves the progress tag on ("第 n／m 步")
        before = pg.evaluate("document.querySelector('.l30-tag')?.textContent||''")
        tap_sel(pg, sub, how)
        pg.wait_for_timeout(600)
        after = pg.evaluate("document.querySelector('.l30-tag')?.textContent||''")
        check(f'hit {tag} L30 study first {how} tap on 我已看過，下一步 is accepted', after != before and after != '',
              f'{before!r} -> {after!r} hash={hashnow(pg)}')
        if not pg.query_selector(sub):
            break


def flow_l30_spell(pg, tag):
    ok = l30_to_spell(pg)
    check(f'hit {tag} L30 串字 typed question reachable', ok)
    if not ok:
        return
    sub, inp = '[data-l30=submit]', '#l30-answer'
    ensure_visible(pg, inp, 'center')
    grid_check(pg, tag, 'L30 串字 提交答案 (idle)', sub, scroll=False)
    for k, how in enumerate(('mouse', 'touch')):
        r = typed_submit_probe(pg, inp, sub, how_focus='touch', how_submit=how,
                               before_tap=lambda k=k: (grid_check(pg, tag, f'L30 串字 提交答案 (typing, #{k + 1})', sub, scroll=False),
                                                       fab_clear(pg, tag, 'L30 串字 提交答案', [sub, inp])))
        pg.wait_for_timeout(600)
        check(f'hit {tag} L30 串字 tap focuses the answer box and typed text arrives (#{k + 1})', r['focus_ok'] and r['typed_ok'],
              f"focus_ok={r['focus_ok']} typed_ok={r['typed_ok']}")
        check(f'hit {tag} L30 串字 FIRST {how} tap on 提交答案 sends', bool(pg.query_selector('.l30-feedback')),
              f"topmost at tap={r['topmost']} idle={fmt(r['idle'])} focused={fmt(r['refocused'])}")
        if k == 0:
            pg.evaluate("document.querySelector('[data-l30=next]')?.click()")
            pg.wait_for_timeout(350)
            if not pg.query_selector(inp + ':not([disabled])'):
                break


def flow_legacy(pg, tag):
    ok = legacy_start(pg, 'study')
    check(f'hit {tag} legacy #learn study step opens', ok, hashnow(pg))
    if ok:
        sel = '[data-act=study-done]'
        grid_check(pg, tag, 'legacy 開始試試 →', sel)
        fab_clear(pg, tag, 'legacy 開始試試 →', [sel])
        for how in ('mouse', 'touch'):
            before = pg.evaluate("(document.querySelector('.task-shell')||document.querySelector('#app')).innerText.slice(0,400)")
            tap_sel(pg, sel, how)
            pg.wait_for_timeout(500)
            after = pg.evaluate("(document.querySelector('.task-shell')||document.querySelector('#app')).innerText.slice(0,400)")
            check(f'hit {tag} legacy first {how} tap on 開始試試 → advances inside #learn', hashnow(pg) == '#learn' and after != before,
                  f'hash={hashnow(pg)}')
            if hashnow(pg) != '#learn':
                legacy_start(pg, 'study')
        for _ in range(12):  # finish the study round (set-up only)
            if not pg.query_selector(sel):
                break
            pg.evaluate("document.querySelector('[data-act=study-done]')?.click()")
            pg.wait_for_timeout(150)
    ok = legacy_start(pg, 'spell')
    check(f'hit {tag} legacy #learn typed step opens', ok, hashnow(pg))
    if not ok:
        return
    sub, inp, help_ = '#submit-answer', '#answer', '[data-act=show-help]'
    grid_check(pg, tag, 'legacy 交答案', sub)
    grid_check(pg, tag, 'legacy 看示範', help_)
    fab_clear(pg, tag, 'legacy 交答案 / 看示範', [sub, help_])
    for k, how in enumerate(('mouse', 'touch')):
        r = typed_submit_probe(pg, inp, sub, how_focus='touch', how_submit=how)
        pg.wait_for_timeout(600)
        check(f'hit {tag} legacy tap focuses the answer box and typed text arrives (#{k + 1})', r['focus_ok'] and r['typed_ok'],
              f"focus_ok={r['focus_ok']} typed_ok={r['typed_ok']}")
        check(f'hit {tag} legacy FIRST {how} tap on 交答案 sends', bool(pg.query_selector('[data-act=next-task]')),
              f"topmost at tap={r['topmost']} hash={hashnow(pg)}")
        if k == 0:
            pg.evaluate("document.querySelector('[data-act=next-task]')?.click()")
            pg.wait_for_timeout(350)
            if not pg.query_selector(inp):
                break


def flow_import(pg, tag):
    ok = import_page(pg)
    check(f'hit {tag} import page armed (dock enabled)', ok)
    if not ok:
        return
    sel = '#v20-confirm-next'
    grid_check(pg, tag, 'import 核對及加入', sel, scroll=False)
    fab_clear(pg, tag, 'import dock', ['#v20-import-dock', sel])
    for how in ('mouse', 'touch'):
        tap_sel(pg, sel, how)
        pg.wait_for_timeout(700)
        opened = bool(pg.evaluate("!!document.querySelector('dialog[open]')"))
        check(f'hit {tag} import {how} tap on 核對及加入 opens the summary', opened)
        if opened:
            pg.evaluate("document.querySelector('[data-imp=close-dialog]')?.click()")
            pg.wait_for_timeout(400)


def flow_arcade(pg, tag):
    goto(pg, '#game', 800)
    sel = '[data-a28=intro]'
    grid_check(pg, tag, 'arcade lobby first 看玩法', sel)
    fab_clear(pg, tag, 'arcade lobby first 看玩法', [sel])
    for how in ('mouse', 'touch'):
        ensure_visible(pg, sel)
        tap_sel(pg, sel, how)
        pg.wait_for_timeout(700)
        opened = bool(pg.evaluate("!!document.querySelector('#pg-dialog[open], dialog.a28-dialog[open]')"))
        check(f'hit {tag} arcade {how} tap on first 看玩法 opens the preview', opened)
        if opened:
            pg.evaluate("document.querySelector('#pg-dialog [data-a28=close], #pg-dialog button')?.click()")
            pg.wait_for_timeout(400)


FLOWS = [('screens', screens), ('L30 study', flow_l30_study), ('L30 spell', flow_l30_spell), ('legacy #learn', flow_legacy),
         ('import', flow_import), ('arcade', flow_arcade)]


def main():
    print(f'# app under test: {APP}', flush=True)
    t0 = time.time()
    with sync_playwright() as p:
        for w, h in SIZES:
            tag = f'{w}x{h}'
            b, ctx, pg, errs = start(p, w, h, touch=True)
            try:
                for name, fn in FLOWS:
                    try:
                        fn(pg, tag)
                    except Exception as e:  # never silently skip a scenario
                        fail_exc(f'hit {tag} {name}', e)
                check(f'hit {tag} no page errors', not errs, errs[:2])
            finally:
                b.close()
    print(f'# done in {time.time() - t0:.0f}s', flush=True)
    finish()


if __name__ == '__main__':
    main()

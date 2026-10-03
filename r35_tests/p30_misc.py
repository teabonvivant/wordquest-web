"""p30 arcade extras: copy-pass safety, motion switch, dock captions, landscape progress line, band caption, help dialog,
result-card wording (copy report section 6, S2-06, S3-10).

    WQ33_APP=<build> python3 r35_tests/p30_misc.py
The copy-anchor check builds two scratch copies with tools/build_r35.py (the R3.4 text, and R3.4 + p30 only) and compares how
often each CSV original occurs in them. WQ35_BASE_APP / WQ35_P30_APP point at ready-made builds and skip that step.
"""
import csv
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from p30_lib import (APP, Checker, IDS, KEYBOARD_WORDS, SHOTS, TAG, URL, boot_account, measure, open_page, st,
                     start_game, sync_playwright)
import wq33  # noqa: E402  (p30_lib puts r33_tests / r34_tests on sys.path)
import wq34_lib  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / 'r35_src' / 'copy' / 'rewrite_audit.csv'
SCRATCH = Path(tempfile.gettempdir()) / 'wq35_p30_anchor'


def scratch_build(args, name, env_name):
    """A ready-made build from the environment, otherwise build one (kept in the temp dir, rebuilt when the sources are newer)."""
    if os.environ.get(env_name) and Path(os.environ[env_name]).exists():
        return Path(os.environ[env_name])
    out = SCRATCH / name
    app = out / 'app' / 'index.html'
    newest = max(f.stat().st_mtime for d in ('r35_src', 'tools') for f in (ROOT / d).rglob('*') if f.is_file())
    if not app.exists() or app.stat().st_mtime < newest:
        subprocess.run([sys.executable, str(ROOT / 'tools' / 'build_r35.py'), *args, '--out', str(out)], cwd=ROOT, check=True, capture_output=True)
    return app


def open_page_rewritten(p, w, h, touch, old, new):
    """Same page, but the FIRST occurrence of the text `old` is replaced (a stand-in for a copy pass that reaches the sound panel's own
    sentence but not the second copy of it that R3.4 fx.js uses as a code anchor)."""
    b, ctx, pg, errs = wq33.new_page(p, w, h, touch=touch)
    html = wq34_lib.patched_html().replace(old, new, 1)
    pg.route(URL, lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html))
    pg.on('dialog', lambda d: d.accept())
    pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    return b, ctx, pg, errs


def delimited(text, o):
    """Occurrences of `o` standing alone between quote / backtick / tag delimiters (how the copy pass anchors short strings)."""
    n, i = 0, text.find(o)
    while i != -1:
        pre = text[i - 1] if i else ''
        post = text[i + len(o)] if i + len(o) < len(text) else ''
        if pre in '\'"`>' and post in '\'"`<':
            n += 1
        i = text.find(o, i + 1)
    return n


def copy_anchor_check(C):
    try:
        base_app = scratch_build(['--base-only'], 'r34', 'WQ35_BASE_APP')
        p30_app = scratch_build(['--only', 'p30'], 'p30only', 'WQ35_P30_APP')
    except Exception as e:  # a failed build is a failed check, not a skipped one
        C.check('copy CSV anchors: scratch builds available', False, str(e)[:300])
        return
    strip = lambda t: re.sub(r'<title>.*?</title>', '', t, count=1)  # the title belongs to the core, not to p30
    new = strip(p30_app.read_text(encoding='utf-8'))
    base = strip(base_app.read_text(encoding='utf-8'))
    rows = list(csv.DictReader(open(CSV, encoding='utf-8-sig')))
    diff = []
    for r in rows:
        o = r['original']
        if not o:
            continue
        # a short string that the CSV anchors by delimiter is compared by delimiter, every other string by plain count
        f = delimited if r['anchor_exact_count'] != r['anchor_delimited_count'] else (lambda t, s: t.count(s))
        a, b = f(new, o), f(base, o)
        if a != b:
            diff.append((r['id'], o[:24], b, a))
    C.check(f'copy pass: every one of the {len(rows)} CSV originals occurs exactly as often in R3.4 + p30 as in the R3.4 base (p30 adds none)', not diff, diff[:5])


def main():
    C = Checker('p30 arcade extras')
    copy_anchor_check(C)
    with sync_playwright() as p:
        # ============================================================ A. motion switch (S: copy report 6)
        b, ctx, pg, errs = open_page(p, 390, 844, touch=True)
        pg.goto(URL)
        pg.wait_for_timeout(1000)
        boot_account(pg, coins=60)
        start_game(pg, 'ruins-courier', play=False)
        pg.wait_for_timeout(800)
        has = pg.evaluate("!!document.getElementById('wq34-fx-toggle')")
        C.check('動感效果 switch is present in the sound panel', has, has)
        if has:
            before = pg.evaluate('window.WQFX.on()')
            pg.evaluate("document.getElementById('wq34-fx-toggle').click()")
            after = pg.evaluate('window.WQFX.on()')
            C.check('動感效果 switch works (click flips WQFX.on)', before != after, (before, after))
            pg.evaluate("document.getElementById('wq34-fx-toggle').click()")
        b.close()
        b, ctx, pg, errs = open_page_rewritten(p, 390, 844, True, '所有街機沿用', '全部街機都沿用')
        pg.goto(URL)
        pg.wait_for_timeout(1000)
        boot_account(pg, coins=60)
        start_game(pg, 'ruins-courier', play=False)
        pg.wait_for_timeout(800)
        has = pg.evaluate("!!document.getElementById('wq34-fx-toggle')")
        C.check('動感效果 switch survives a rewrite of the old panel sentence (copy-pass simulation)', has, has, base=True)
        if has:
            before = pg.evaluate('window.WQFX.on()')
            pg.evaluate("document.getElementById('wq34-fx-toggle').click()")
            C.check('動感效果 switch still works after that rewrite', pg.evaluate('window.WQFX.on()') != before, '', base=True)
        else:
            C.check('動感效果 switch still works after that rewrite', False, 'missing', base=True)
        b.close()

        # ============================================================ B. phone, portrait: play view text, help dialog, band caption, result words
        b, ctx, pg, errs = open_page(p, 390, 844, touch=True)
        natives = []
        pg.on('dialog', lambda d: natives.append(d.message))
        pg.goto(URL)
        pg.wait_for_timeout(1000)
        boot_account(pg, coins=60)
        gm = pg.evaluate('window.WQ35A&&window.WQ35A.GM')
        start_game(pg, 'ruins-courier', play=False)
        pg.wait_for_timeout(800)
        eb = pg.inner_text('.a28-playhead .a28-eyebrow')
        C.check('play view eyebrow reads 遊戲街機・已投 1 枚金幣 (one line, no English tag)', eb == '遊戲街機・已投 1 枚金幣', eb, base=True)
        pg.locator('[data-a28="help"]').click()
        pg.wait_for_timeout(600)
        d = pg.evaluate("(()=>{const e=document.querySelector('dialog.p30-help[open]');return e?e.innerText:null})()")
        C.check('S2-06 操作說明 opens an in-page dialog with the touch sentence (no browser alert)',
                bool(d) and bool(gm) and gm['ruins-courier']['t'] in d and not KEYBOARD_WORDS.search(d) and not natives, (d, natives), base=True)
        if d:
            pg.screenshot(path=str(SHOTS / f'help_dialog_390_{TAG}.png'))
            pg.locator('[data-p30="help-close"]').click()
            pg.wait_for_timeout(300)
            C.check('the help dialog closes and the game stays paused on its card', pg.evaluate("!document.querySelector('dialog.p30-help')") and st(pg)['overlay'], st(pg), base=True)
        # forest band: caption and win card
        pg.evaluate('__p40.reset(60)')
        start_game(pg, 'forest-band', play=True)
        pg.wait_for_timeout(1000)
        cap = pg.evaluate("(()=>{const c=document.querySelector('.p30-beat-cap');if(!c)return null;const n=c.nextElementSibling;return {t:c.innerText,next:n?n.dataset.a28tool:'',fs:parseFloat(getComputedStyle(c).fontSize)}})()")
        C.check('S3-10 the numbers 1 to 16 are labelled 第幾拍', bool(cap) and '第幾拍' in cap['t'] and cap['next'] == 'step0' and cap['fs'] >= 16, cap, base=True)
        pg.locator('[data-a28tool="track1"]').click()
        pg.wait_for_timeout(500)
        cap2 = pg.evaluate("(()=>{const c=document.querySelector('.p30-beat-cap');const n=c&&c.nextElementSibling;return !!c&&!!n&&n.dataset.a28tool==='step0'})()")
        C.check('S3-10 the label stays after the tools are redrawn', cap2, cap2, base=True)
        pg.evaluate("document.querySelector('#pg-tools').scrollIntoView({block:'center'})")
        pg.screenshot(path=str(SHOTS / f'band_caption_390_{TAG}.png'))
        pg.locator('[data-a28="finish-art"]').scroll_into_view_if_needed()
        pg.locator('[data-a28="finish-art"]').click()
        pg.wait_for_function('document.querySelector("#pg-overlay:not([hidden]) .wq34-result")', timeout=10000)
        pg.wait_for_timeout(1500)
        lab = pg.evaluate("(()=>{const s=document.querySelector('.wq34-stars');return s?s.getAttribute('aria-label'):null})()")
        C.check('result stars are read as N 顆星 (not 粒星)', bool(lab) and lab.endswith('顆星') and '粒' not in lab, lab, base=True)
        pg.screenshot(path=str(SHOTS / f'result_stars_390_{TAG}.png'))
        # no coins left after paying the last one
        pg.evaluate('__p40.reset(1)')
        start_game(pg, 'ruins-courier', play=True)
        pg.wait_for_timeout(500)
        pg.evaluate("__p40.end('x')")
        pg.wait_for_function('document.querySelector("#pg-overlay:not([hidden]) .wq34-result")', timeout=10000)
        pg.wait_for_timeout(1200)
        res = pg.evaluate("""(()=>{const c=document.querySelector('#pg-overlay .a28-overlaycard');const e=c.querySelector('.wq34-earn');
          const earn=[...c.querySelectorAll('button,a')].find(x=>x.innerText.trim()==='去賺金幣：做一個小練習');
          return {earn:e?e.innerText:null,btn:!!earn,txt:c.innerText}})()""")
        C.check('result card with no coin left: says so in plain words and offers 去賺金幣：做一個小練習',
                res['btn'] and res['earn'] and '個金幣' not in res['txt'] and '枚' in res['txt'], res['earn'], base=True)
        pg.screenshot(path=str(SHOTS / f'result_nocoin_390_{TAG}.png'))
        C.check('no console errors (phone play view)', not errs, errs[:3])
        b.close()

        # ============================================================ C. desktop help dialog text (keyboard)
        b, ctx, pg, errs = open_page(p, 1280, 800, touch=False)
        pg.goto(URL)
        pg.wait_for_timeout(1000)
        boot_account(pg, coins=60)
        gm = pg.evaluate('window.WQ35A&&window.WQ35A.GM')
        start_game(pg, 'forest-dash', play=False)
        pg.wait_for_timeout(600)
        card = pg.inner_text('#pg-overlay .wq34-how') if pg.query_selector('#pg-overlay .wq34-how') else ''
        C.check('S2-06 desktop ready card shows the keyboard sentence only', bool(gm) and card == gm['forest-dash']['k'], card, base=True)
        pg.locator('[data-a28="help"]').click()
        pg.wait_for_timeout(500)
        d = pg.evaluate("(()=>{const e=document.querySelector('dialog.p30-help[open] .p30-how');return e?e.innerText:null})()")
        C.check('S2-06 desktop help dialog shows the keyboard sentence', bool(gm) and d == gm['forest-dash']['k'], d, base=True)
        C.check('no console errors (desktop play view)', not errs, errs[:3])
        b.close()

        # ============================================================ D. landscape phone: dock captions, progress line (all 26 games)
        b, ctx, pg, errs = open_page(p, 844, 390, touch=True)
        pg.goto(URL)
        pg.wait_for_timeout(1000)
        boot_account(pg, coins=60)
        clip_bad, small_bad, cap_info = [], [], None
        for gid in IDS:
            pg.evaluate('__p40.reset(60)')
            pg.wait_for_selector('[data-cabinet]', timeout=10000)
            start_game(pg, gid, play=True)
            pg.wait_for_timeout(1500)
            info = pg.evaluate("""()=>{const e=document.querySelector('#a28-live-stat');if(!e)return null;const r=e.getBoundingClientRect(),cs=getComputedStyle(e);
              const cap=k=>{const b=document.querySelector('.a28-game-footer [data-a28="'+k+'"]');return b?{c:getComputedStyle(b,'::after').content,al:b.getAttribute('aria-label')||'',t:b.innerText.replace(/\\s+/g,'')}:null};
              return {t:e.innerText,sw:e.scrollWidth,cw:e.clientWidth,sh:e.scrollHeight,ch:e.clientHeight,fs:parseFloat(cs.fontSize),l:r.left,r:r.right,top:r.top,b:r.bottom,vw:innerWidth,vh:innerHeight,
               leave:cap('leave'),full:cap('r2-full'),immersive:!!document.querySelector('.a28-play.r2-immersive')}}""")
            if not info:
                clip_bad.append((gid, 'no live stat'))
                continue
            if info['sw'] > info['cw'] + 1 or info['sh'] > info['ch'] + 1 or info['r'] > info['vw'] + 0.5 or info['b'] > info['vh'] + 0.5 or info['l'] < -0.5:
                clip_bad.append((gid, info['t'], info['sw'], info['cw'], info['sh'], info['ch']))
            if info['fs'] < 13.9:
                small_bad.append((gid, info['fs']))
            if gid == 'ruins-courier':
                cap_info = info
                pg.screenshot(path=str(SHOTS / f'landscape_dock_844_{TAG}.png'))
        C.check('copy 6: landscape progress line is shown in full in all 26 games (not clipped, e.g. 124/15…)', not clip_bad, clip_bad[:3], base=True)
        C.check('landscape progress line is >= 14px (26/26)', not small_bad, small_bad[:3], base=True)
        ok = bool(cap_info) and cap_info['immersive'] and cap_info['leave']['c'] == '"返回"' and cap_info['full']['c'] == '"縮小"'
        C.check('copy 6: dock captions read 返回 and 縮小 (離開 / 還原 are gone)', ok, cap_info and (cap_info['leave'], cap_info['full']), base=True)
        ok = bool(cap_info) and '返回' in cap_info['leave']['al'] and '放大' in cap_info['full']['al']
        C.check('the full words stay in aria-label (保存並返回 / 放大／還原)', ok, cap_info and (cap_info['leave']['al'], cap_info['full']['al']))
        C.check('no console errors (landscape, 26 games)', not errs, errs[:3])
        b.close()
    return C.finish()


if __name__ == '__main__':
    sys.exit(main())

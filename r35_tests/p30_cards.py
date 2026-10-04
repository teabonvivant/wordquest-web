"""p30 ready card and result card on phones, 26 games (S1-06, S2-03, S2-06, copy report section 6: buttons and notes).

    WQ33_APP=<build> python3 r35_tests/p30_cards.py                 # all viewports (long: about 4 min per viewport)
    WQ33_APP=<build> python3 r35_tests/p30_cards.py 320x568 844x390 # chosen viewports only

For each game and each viewport (320x568, 360x640 and 390x844 portrait, 844x390 landscape) the suite opens the READY card,
then plays one tick and ends the run to get the RESULT card, and measures both. Screenshots go to
/home/claude/audit_r35/r35/p30/cards/<TAG>/ (jpeg); contact sheets are built at the end when PIL is available.
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from p30_lib import (Checker, IDS, KEYBOARD_WORDS, SHOTS, TAG, URL, boot_account, measure, minmax, open_page, st,
                     start_game, sync_playwright)

VIEWPORTS = {'320x568': (320, 568), '390x844': (390, 844), '844x390': (844, 390), '360x640': (360, 640)}
OUT = SHOTS / 'cards' / TAG
OUT.mkdir(parents=True, exist_ok=True)

CARD_JS = r"""
() => {
  const vw = innerWidth, vh = innerHeight;
  const ov = document.querySelector('#pg-overlay'), card = ov && ov.querySelector('.a28-overlaycard');
  if (!card || ov.hidden) return null;
  const r = card.getBoundingClientRect();
  const btns = [...card.querySelectorAll('button, a.btn')].map(b => { const q = b.getBoundingClientRect();
    return {t: b.innerText.replace(/\s+/g, ' ').trim(), act: b.dataset.a28 || '', top: q.top, bottom: q.bottom, left: q.left, right: q.right, w: q.width, h: q.height, dis: !!b.disabled}; });
  const how = card.querySelector('.wq34-how');
  let lines = null;
  if (how) { const lh = parseFloat(getComputedStyle(how).lineHeight) || 24; lines = Math.round(how.getBoundingClientRect().height / lh); }
  const note = card.querySelector(':scope > small');
  const tc = document.querySelector('.a28-touch-controls');
  const nr = note ? note.getBoundingClientRect() : null;
  return {vw, vh, l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width,
    cardSH: card.scrollHeight, cardCH: card.clientHeight, ovSH: ov.scrollHeight, ovCH: ov.clientHeight, cardSW: card.scrollWidth, cardCW: card.clientWidth,
    btns, lines, howText: how ? how.innerText.trim() : null, h2: (card.querySelector('h2') || {}).innerText || '',
    note: note ? note.innerText.trim() : null, noteTop: nr ? nr.top : null, noteBottom: nr ? nr.bottom : null,
    touchShown: !!tc && getComputedStyle(tc).display !== 'none', text: card.innerText,
    star: (() => { const s = card.querySelector('.wq34-stars span.on'); return s ? getComputedStyle(s).color : null; })()};
}
"""


def card_checks(info, rows, mode, state, vp, portrait):
    """Return a list of failure strings for one card measurement."""
    bad = []
    if not info:
        return ['no card']
    if info['l'] < -0.5 or info['r'] > info['vw'] + 0.5:
        bad.append(f"horizontal clip l={info['l']:.0f} r={info['r']:.0f} vw={info['vw']}")
    if info['cardSH'] > info['cardCH'] + 1 or info['ovSH'] > info['ovCH'] + 1 or info['cardSW'] > info['cardCW'] + 1:
        bad.append(f"inner clip card {info['cardSH']}/{info['cardCH']} ov {info['ovSH']}/{info['ovCH']}")
    for b in info['btns']:
        if b['top'] < -0.5 or b['bottom'] > info['vh'] + 0.5:
            bad.append(f"button '{b['t']}' outside the screen top={b['top']:.0f} bottom={b['bottom']:.0f} vh={info['vh']}")
        if b['h'] < 47.5:
            bad.append(f"button '{b['t']}' height {b['h']:.0f}")
        if portrait and b['w'] < 0.8 * info['w']:
            bad.append(f"button '{b['t']}' width {b['w']:.0f} of {info['w']:.0f}")
        if not portrait and b['w'] < 120:
            bad.append(f"button '{b['t']}' width {b['w']:.0f}")
    if info['noteTop'] is not None and (info['noteTop'] < -0.5 or info['noteBottom'] > info['vh'] + 0.5):
        bad.append('note outside the screen')
    if info['t'] < -0.5 or info['b'] > info['vh'] + 0.5:
        bad.append(f"card top/bottom {info['t']:.0f}/{info['b']:.0f} vs {info['vh']}")
    if rows:
        fs = min(r['fs'] for r in rows)
        if fs < 15.99:
            bad.append(f'text {fs}px: ' + str([r['text'] for r in rows if r['fs'] < 15.99][:2]))
        ct = min(r['ratio'] for r in rows)
        if ct < 4.5:
            bad.append(f'contrast {ct}: ' + str([(r['text'], r['ratio']) for r in rows if r['ratio'] < 4.5][:2]))
    if info.get('star'):
        import re as _re
        m = _re.findall(r'[\d.]+', info['star'])
        r, g, bl = (float(x) for x in m[:3])
        lin = lambda v: ((v / 255) / 12.92) if v / 255 <= 0.03928 else (((v / 255) + 0.055) / 1.055) ** 2.4
        lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl)
        bg = 0.2126 * lin(255) + 0.7152 * lin(249) + 0.0722 * lin(236)
        if (bg + 0.05) / (lum + 0.05) < 3:
            bad.append('earned star contrast below 3:1')
    if info['touchShown'] and portrait:
        bad.append('touch keys still shown under the card')
    if KEYBOARD_WORDS.search(info['howText'] or ''):
        bad.append('keyboard words in the how line: ' + (info['howText'] or ''))
    if state == 'ready':
        if info['lines'] is None or info['lines'] > 2:
            bad.append(f"how line is {info['lines']} lines")
        acts = {b['act']: b['t'] for b in info['btns']}
        if acts.get('play') != '開始' or acts.get('leave') != '返回':
            bad.append(f'button words {acts}')
        if not re.match(r'已投 [1-4] 枚金幣', info['note'] or '') or '/5' not in (info['note'] or ''):
            bad.append(f"note {info['note']!r}")
        if info['h2'] != '準備好了？':
            bad.append(f"title {info['h2']!r}")
    else:
        acts = {b['act']: b['t'] for b in info['btns']}
        if acts.get('leave') != '返回':
            bad.append(f'leave button word {acts}')
        if '/5' not in (info['note'] or ''):
            bad.append(f"note {info['note']!r}")
    return bad


def run_viewport(p, C, key, games):
    w, h = VIEWPORTS[key]
    portrait = h > w
    b, ctx, pg, errs = open_page(p, w, h, touch=True)
    pg.goto(URL)
    pg.wait_for_timeout(1000)
    boot_account(pg, coins=60)
    ready_bad, result_bad, shot_n = [], [], 0
    for gid in games:
        try:
            pg.evaluate('__p40.reset(60)')
            pg.wait_for_selector('[data-cabinet]', timeout=10000)
            start_game(pg, gid, play=False)
            pg.wait_for_timeout(1100)
            info = pg.evaluate(CARD_JS)
            rows = measure(pg, ['#pg-overlay .a28-overlaycard *'])
            pg.screenshot(path=str(OUT / f'ready_{gid}_{key}.jpg'), type='jpeg', quality=72)
            shot_n += 1
            bad = card_checks(info, rows, 'ready', 'ready', key, portrait)
            if bad:
                ready_bad.append((gid, bad[:3]))
            pg.locator('[data-a28="play"]').click()
            pg.wait_for_function('__p40.state().playing', timeout=10000)
            pg.wait_for_timeout(500)
            pg.evaluate("__p40.end('p30 card test')")
            pg.wait_for_function('document.querySelector("#pg-overlay:not([hidden]) .a28-overlaycard")', timeout=10000)
            pg.wait_for_timeout(1300)
            info = pg.evaluate(CARD_JS)
            rows = measure(pg, ['#pg-overlay .a28-overlaycard *'])
            pg.screenshot(path=str(OUT / f'result_{gid}_{key}.jpg'), type='jpeg', quality=72)
            shot_n += 1
            bad = card_checks(info, rows, 'result', 'result', key, portrait)
            if bad:
                result_bad.append((gid, bad[:3]))
        except Exception as e:  # keep going so one broken game does not hide the others
            ready_bad.append((gid, ['exception ' + str(e)[:160]]))
    n = len(games)
    print(f'  {key}: {shot_n} screenshots in {OUT}')
    C.check(f'S1-06 {key}: READY card readable and never clipped, {n}/{n} games (>=16px, >=48px full-width buttons, <=2 line how, 開始 / 返回, 已投 N 枚金幣 on top)',
            not ready_bad, ready_bad[:3], base=True)
    C.check(f'S1-06 {key}: RESULT card readable and never clipped, {n}/{n} games', not result_bad, result_bad[:3], base=True)
    C.check(f'{key}: no console errors', not errs, errs[:3])
    # paused card (one game)
    try:
        pg.evaluate('__p40.reset(60)')
        start_game(pg, 'forest-dash', play=True)
        pg.wait_for_timeout(600)
        pg.locator('[data-a28="pause"]').click()
        pg.wait_for_function('document.querySelector("#pg-overlay:not([hidden]) .a28-overlaycard")', timeout=8000)
        pg.wait_for_timeout(900)
        info = pg.evaluate(CARD_JS)
        acts = {x['act']: x['t'] for x in info['btns']}
        bad = card_checks(info, measure(pg, ['#pg-overlay .a28-overlaycard *']), 'paused', 'paused', key, portrait)
        C.check(f'{key}: PAUSED card has 繼續 / 返回 and fits', acts.get('play') == '繼續' and acts.get('leave') == '返回' and not bad, (acts, bad[:2]), base=True)
    except Exception as e:
        C.check(f'{key}: PAUSED card has 繼續 / 返回 and fits', False, str(e)[:160], base=True)
    b.close()


def sheets():
    try:
        from PIL import Image
    except Exception:
        return
    for key in VIEWPORTS:
        for state in ('ready', 'result'):
            files = [OUT / f'{state}_{gid}_{key}.jpg' for gid in IDS if (OUT / f'{state}_{gid}_{key}.jpg').exists()]
            if len(files) < 6:
                continue
            ims = [Image.open(f) for f in files]
            tw = 213 if key != '844x390' else 422
            th = int(ims[0].height * tw / ims[0].width)
            cols = 7 if key != '844x390' else 4
            rows = (len(ims) + cols - 1) // cols
            sheet = Image.new('RGB', (cols * tw, rows * th), 'white')
            for i, im in enumerate(ims):
                sheet.paste(im.resize((tw, th)), ((i % cols) * tw, (i // cols) * th))
            sheet.save(OUT / f'sheet_{state}_{key}.jpg', quality=80)


def main():
    keys = [a for a in sys.argv[1:] if a in VIEWPORTS] or ['320x568', '390x844', '844x390', '360x640']
    C = Checker('p30 ready / result card, 26 games')
    with sync_playwright() as p:
        for key in keys:
            run_viewport(p, C, key, IDS)
    sheets()
    return C.finish()


if __name__ == '__main__':
    sys.exit(main())

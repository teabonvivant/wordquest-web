"""R3.20 D7 - before / after screenshots of the 26 arcade games.

    WQ33_APP=<index.html> python3 r37_tests/r320_capture.py <before|after> [out_root] [ids] [sizes] [states]
Per game x 4 sizes (360x640, 390x844, 844x390, 1440x900): `start` (the ready card after buying), `play` (~3 s of natural play) and `result`
(pgGame.end(), 1 s later), JPEG q82, each with a same-named .json holding the arc_probe.js measurements (r37_tests/arc_probe.js - the same ruler t28 uses).
768x1024 for five games (recorded, not judged). after/BUILD.txt records the SHA256 of the build photographed.
`python3 r37_tests/r320_capture.py compare [out_root]` builds compare/<id>.jpg: three rows (390x844 play, 1440x900 play, 390x844 result), before | after."""
import sys, os, time, json, hashlib
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from arc_lib import *  # noqa: E402,F401,F403

PROBE = Path(__file__).resolve().parent / 'arc_probe.js'
SIZES = [(360, 640, 'small'), (390, 844, 'phone'), (844, 390, 'land'), (1440, 900, 'desk')]
TABLET = [(768, 1024, 'tablet')]
TABLET_IDS = ['sky-rescue', 'bounce-basket', 'honey-delivery', 'number-garden', 'star-rhythm']


def shot(pg, path):
    pg.screenshot(path=str(path), type='jpeg', quality=70)


def probe_json(pg, path, state):
    try:
        pg.evaluate('window.scrollTo(0,0)')
        Path(str(path).replace('.jpg', '.json')).write_text(json.dumps(pg.evaluate("(s)=>window.__arcProbe({state:s})", state), ensure_ascii=False))
    except Exception as e:
        print('  probe fail', path, repr(e)[:100])


def capture(version, root, ids, sizes=None, states=('start', 'play', 'learn', 'result')):
    out = root / version
    out.mkdir(parents=True, exist_ok=True)
    f = Path(os.environ.get('WQ33_APP') or (R / 'app' / 'index.html'))
    (out / 'BUILD.txt').write_text(f'{version} build: {f}\nsha256 {hashlib.sha256(f.read_bytes()).hexdigest()}\n')
    with sync_playwright() as p:
        for (w, h, label) in SIZES + TABLET:
            if sizes and label not in sizes:
                continue
            games = ids if label != 'tablet' else [i for i in ids if i in TABLET_IDS]
            if not games:
                continue
            touch = w < 900 or h < 500
            b, ctx, pg, errs = new_session(p, w, h, touch, learn=True)
            keepalive(pg)
            for gid in games:
                try:
                    if 'start' in states:
                        start_game(pg, gid, play=False)
                        pg.add_script_tag(path=str(PROBE))
                        pg.wait_for_timeout(900)
                        path = out / f'{gid}__{label}__start.jpg'
                        shot(pg, path); probe_json(pg, path, 'start')
                    if 'play' in states or 'result' in states or 'learn' in states:
                        start_game(pg, gid, play=True)
                        pg.add_script_tag(path=str(PROBE))
                        pg.wait_for_timeout(2600)
                        ensure_play(pg)
                    if 'play' in states:
                        path = out / f'{gid}__{label}__play.jpg'
                        shot(pg, path); probe_json(pg, path, 'play')
                    if 'learn' in states and version == 'after':   # R3.20 r2: the learning question state (the before build has no core)
                        try:
                            pg.evaluate("(c)=>window.__r37(c)", "WQArcPlus._force('learn')")
                            pg.wait_for_timeout(700)
                            path = out / f'{gid}__{label}__learn.jpg'
                            shot(pg, path); probe_json(pg, path, 'learn')
                        except Exception as e:
                            print('  learn fail', gid, label, repr(e)[:100])
                    if 'result' in states:
                        # a combo first, so the result card shows a real "連擊 ×N" (after build only; the before build has no core)
                        try:
                            pg.evaluate("(c)=>window.__r37(c)", "(()=>{if(typeof WQArcPlus!=='undefined'){WQArcPlus._force('god',false);WQArcPlus._force('combo',4);}return 1})()")
                        except Exception:
                            pass
                        pg.evaluate("(c)=>window.__r37(c)", "pgGame.end('測試結束','測試')")
                        try:
                            pg.wait_for_selector('#pg-overlay .a28-overlaycard', timeout=15000)
                        except Exception:
                            pass
                        pg.wait_for_timeout(1000)
                        path = out / f'{gid}__{label}__result.jpg'
                        shot(pg, path); probe_json(pg, path, 'result')
                except Exception as e:
                    print('  capture fail', version, gid, label, repr(e)[:120])
            b.close()
            print('done', version, label, len(games), flush=True)


def compare(root):
    from PIL import Image, ImageDraw
    out = root / 'compare'
    out.mkdir(parents=True, exist_ok=True)
    for gid in ALL_IDS:
        rows = []
        for label, st in (('phone', 'play'), ('desk', 'play'), ('phone', 'result')):
            try:
                a = Image.open(root / 'before' / f'{gid}__{label}__{st}.jpg').convert('RGB')
                b = Image.open(root / 'after' / f'{gid}__{label}__{st}.jpg').convert('RGB')
            except Exception:
                continue
            hh = 700
            a = a.resize((int(a.width * hh / a.height), hh)); b = b.resize((int(b.width * hh / b.height), hh))
            row = Image.new('RGB', (a.width + b.width + 30, hh + 34), (11, 16, 48))
            row.paste(a, (0, 34)); row.paste(b, (a.width + 30, 34))
            d = ImageDraw.Draw(row); d.text((8, 8), f'{gid} {label} {st} BEFORE', fill=(255, 255, 255)); d.text((a.width + 38, 8), f'{gid} {label} {st} AFTER', fill=(255, 201, 74))
            rows.append(row)
        if not rows:
            continue
        W = max(r.width for r in rows); H = sum(r.height for r in rows)
        sheet = Image.new('RGB', (W, H), (11, 16, 48)); y = 0
        for r in rows:
            sheet.paste(r, (0, y)); y += r.height
        sheet.save(out / f'{gid}.jpg', quality=70)
    print('compare sheets', len(list(out.glob('*.jpg'))))


if __name__ == '__main__':
    mode = sys.argv[1]
    root = Path(sys.argv[2]) if len(sys.argv) > 2 else R / 'r37_evidence' / 'r320'
    if mode == 'compare':
        compare(root)
    else:
        ids = sys.argv[3].split(',') if len(sys.argv) > 3 and sys.argv[3] != 'all' else ALL_IDS
        sizes = sys.argv[4].split(',') if len(sys.argv) > 4 else None
        states = tuple(sys.argv[5].split(',')) if len(sys.argv) > 5 else ('start', 'play', 'learn', 'result')
        capture(mode, root, ids, sizes, states)

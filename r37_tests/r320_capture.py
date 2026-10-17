"""R3.20 D7 - before / after screenshots of the 26 arcade games.

    WQ33_APP=<index.html> python3 r37_tests/r320_capture.py <before|after> [out_root] [ids]
Per game x 4 sizes (360x640, 390x844, 844x390, 1440x900): the start screen (the ready card after buying) and the play screen (after ~3 s of
play; a learning crystal is forced on for the "after" build so the dock is shown with a question), as JPEG q82. 768x1024 for five games.
Then `python3 r37_tests/r320_capture.py compare [out_root]` builds compare/<id>.jpg (before | after, 390x844 play above 1440x900 play)."""
import sys, os, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from arc_lib import *  # noqa: E402,F401,F403

SIZES = [(360, 640, 'small'), (390, 844, 'phone'), (844, 390, 'land'), (1440, 900, 'desk')]
TABLET = [(768, 1024, 'tablet')]
TABLET_IDS = ['sky-rescue', 'bounce-basket', 'honey-delivery', 'number-garden', 'star-rhythm']


def shot(pg, path):
    pg.screenshot(path=str(path), type='jpeg', quality=82)


def capture(version, root, ids):
    out = root / version
    out.mkdir(parents=True, exist_ok=True)
    after = version == 'after'
    with sync_playwright() as p:
        for (w, h, label) in SIZES + TABLET:
            games = ids if label != 'tablet' else [i for i in ids if i in TABLET_IDS]
            if not games:
                continue
            touch = w < 900 or h < 500
            b, ctx, pg, errs = new_session(p, w, h, touch, learn=True)
            keepalive(pg)
            for gid in games:
                try:
                    start_game(pg, gid, play=False)
                    pg.wait_for_timeout(900)
                    shot(pg, out / f'{gid}__{label}__start.jpg')
                    start_game(pg, gid, play=True)
                    pg.wait_for_timeout(2600)
                    if after:
                        try:
                            pg.evaluate("(c)=>window.__r37(c)", "WQArcPlus._force('learn')")
                            pg.wait_for_timeout(500)
                        except Exception:
                            pass
                    ensure_play(pg)
                    shot(pg, out / f'{gid}__{label}__play.jpg')
                except Exception as e:
                    print('  capture fail', version, gid, label, repr(e)[:120])
            b.close()
            print('done', version, label, len(games))


def compare(root):
    from PIL import Image, ImageDraw
    out = root / 'compare'
    out.mkdir(parents=True, exist_ok=True)
    for gid in ALL_IDS:
        rows = []
        for label in ('phone', 'desk'):
            try:
                a = Image.open(root / 'before' / f'{gid}__{label}__play.jpg').convert('RGB')
                b = Image.open(root / 'after' / f'{gid}__{label}__play.jpg').convert('RGB')
            except Exception:
                continue
            hh = 700
            a = a.resize((int(a.width * hh / a.height), hh)); b = b.resize((int(b.width * hh / b.height), hh))
            row = Image.new('RGB', (a.width + b.width + 30, hh + 34), (11, 16, 48))
            row.paste(a, (0, 34)); row.paste(b, (a.width + 30, 34))
            d = ImageDraw.Draw(row); d.text((8, 8), f'{gid} {label} BEFORE', fill=(255, 255, 255)); d.text((a.width + 38, 8), f'{gid} {label} AFTER', fill=(255, 201, 74))
            rows.append(row)
        if not rows:
            continue
        W = max(r.width for r in rows); H = sum(r.height for r in rows)
        sheet = Image.new('RGB', (W, H), (11, 16, 48)); y = 0
        for r in rows:
            sheet.paste(r, (0, y)); y += r.height
        sheet.save(out / f'{gid}.jpg', quality=82)
    print('compare sheets', len(list(out.glob('*.jpg'))))


if __name__ == '__main__':
    mode = sys.argv[1]
    root = Path(sys.argv[2]) if len(sys.argv) > 2 else R / 'r37_evidence' / 'r320'
    if mode == 'compare':
        compare(root)
    else:
        ids = sys.argv[3].split(',') if len(sys.argv) > 3 else ALL_IDS
        capture(mode, root, ids)
